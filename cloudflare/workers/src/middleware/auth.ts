import { Context, Next } from 'hono';
import { jwtVerify } from 'jose';
import { HTTPException } from 'hono/http-exception';

export const authMiddleware = async (c: Context, next: Next) => {
  try {
    const authHeader = c.req.header('Authorization');
    const apiKeyHeader = c.req.header('X-API-Key');

    // Try API Key authentication first
    if (apiKeyHeader) {
      const apiKey = await validateApiKey(c, apiKeyHeader);
      if (apiKey) {
        (c as any).set('user', { id: 'api', username: 'api-key', email: undefined, role: 'admin' });
        await next();
        return;
      }
    }

    // Try JWT authentication
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new HTTPException(401, { message: 'Authorization header required' });
    }

    const token = authHeader.split(' ')[1];
    const jwtSecret = (c as any).env.JWT_SECRET;
    if (!jwtSecret) {
      throw new HTTPException(500, { message: 'JWT_SECRET not configured' });
    }
    const secretKey = new TextEncoder().encode(jwtSecret);

    try {
      const { payload } = await jwtVerify(token, secretKey);
      
      (c as any).set('user', {
        id: payload.sub as string,
        username: payload.username as string,
        email: payload.email as string,
        role: payload.role as string,
      });

      await next();
    } catch (error) {
      throw new HTTPException(401, { message: 'Invalid or expired token' });
    }
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(401, { message: 'Authentication failed' });
  }
};

async function validateApiKey(c: Context, apiKey: string): Promise<boolean> {
  const db = (c as any).env.DB;
  if (!db) {
    console.error('Database binding not available');
    return false;
  }
  try {
    // Hash the API key for comparison
    const encoder = new TextEncoder();
    const apiKeyData = encoder.encode(apiKey);
    const hashBuffer = await crypto.subtle.digest('SHA-256', apiKeyData);
    const keyHash = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    let stmt = db.prepare('SELECT id, is_active FROM api_keys WHERE key_hash = ? AND is_active = 1');
    stmt = stmt.bind(keyHash);
    const result = await stmt.first();

    if (result) {
      // Update last_used timestamp
      let updateStmt = db.prepare('UPDATE api_keys SET last_used = CURRENT_TIMESTAMP WHERE key_hash = ?');
      updateStmt = updateStmt.bind(keyHash);
      await updateStmt.run();
    }

    return !!result;
  } catch (error) {
    console.error('API Key validation error:', error);
    return false;
  }
}

// Optional auth middleware (doesn't require auth but uses it if present)
export const optionalAuthMiddleware = async (c: Context, next: Next) => {
  const authHeader = c.req.header('Authorization');

  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const jwtSecret = (c as any).env.JWT_SECRET;
      if (!jwtSecret) {
        console.warn('JWT_SECRET not configured - skipping authentication');
        await next();
        return;
      }
      const secretKey = new TextEncoder().encode(jwtSecret);
      const { payload } = await jwtVerify(token, secretKey);

      (c as any).set('user', {
        id: payload.sub as string,
        username: payload.username as string,
        email: payload.email as string,
        role: payload.role as string,
      });
    } catch (error: any) {
      // Ignore authentication errors for optional auth
      console.warn('Optional auth error:', error?.message || error);
    }
  }

  await next();
};
