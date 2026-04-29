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
    const jwtSecret = new TextEncoder().encode((c as any).env.JWT_SECRET);

    try {
      const { payload } = await jwtVerify(token, jwtSecret);
      
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
  try {
    // Hash the API key for comparison
    const encoder = new TextEncoder();
    const apiKeyData = encoder.encode(apiKey);
    const hashBuffer = await crypto.subtle.digest('SHA-256', apiKeyData);
    const keyHash = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const result = await (c as any).env.DB.prepare(
      'SELECT id, is_active FROM api_keys WHERE key_hash = ? AND is_active = 1'
    )
      .bind(keyHash)
      .first();

    if (result) {
      // Update last_used timestamp
      await (c as any).env.DB.prepare(
        'UPDATE api_keys SET last_used = CURRENT_TIMESTAMP WHERE key_hash = ?'
      )
        .bind(keyHash)
        .run();

      return true;
    }

    return false;
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
      const jwtSecret = new TextEncoder().encode((c as any).env.JWT_SECRET);
      const { payload } = await jwtVerify(token, jwtSecret);
      
      (c as any).set('user', {
        id: payload.sub as string,
        username: payload.username as string,
        email: payload.email as string,
        role: payload.role as string,
      });
    } catch (error) {
      // Ignore authentication errors for optional auth
    }
  }

  await next();
};
