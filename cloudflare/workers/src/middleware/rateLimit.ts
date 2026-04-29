import { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { AppEnv } from '../types';

// Shared helper to get current timestamp
function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

export const rateLimitMiddleware = async (c: Context<AppEnv>, next: Next) => {
  try {
    const clientId = getClientIdentifier(c);
    const limit = parseInt(c.env.API_RATE_LIMIT_REQUESTS || '1000');
    const windowMs = parseInt(c.env.API_RATE_LIMIT_WINDOW_MS || '3600000');

    // Check rate limit using D1
    const rateLimitData = await getRateLimitData(c, clientId, windowMs);

    if (rateLimitData.count >= limit) {
      const retryAfter = Math.ceil(rateLimitData.retryAfter / 1000);

      c.header('X-RateLimit-Limit', limit.toString());
      c.header('X-RateLimit-Remaining', '0');
      c.header('X-RateLimit-Reset', rateLimitData.resetAt.toString());
      c.header('Retry-After', retryAfter.toString());

      throw new HTTPException(429, {
        message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`
      });
    }

    // Increment counter
    await incrementRateLimit(c, clientId, windowMs);

    // Set rate limit headers
    c.header('X-RateLimit-Limit', limit.toString());
    c.header('X-RateLimit-Remaining', (limit - rateLimitData.count - 1).toString());
    c.header('X-RateLimit-Reset', rateLimitData.resetAt.toString());

    await next();
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }
    // Don't block requests if rate limiting fails
    console.error('Rate limit middleware error:', error);
    await next();
  }
};

function getClientIdentifier(c: Context<AppEnv>): string {
  // Try to get client identifier from various sources
  const apiKey = c.req.header('X-API-Key');
  if (apiKey) {
    return `api:${apiKey}`;
  }

  const user = c.get('user');
  if (user?.id) {
    return `user:${user.id}`;
  }

  // Fall back to IP address
  const cfConnectingIp = c.req.header('CF-Connecting-IP');
  const xForwardedFor = c.req.header('X-Forwarded-For');
  const ip = cfConnectingIp || xForwardedFor?.split(',')[0] || 'unknown';

  return `ip:${ip}`;
}

async function getRateLimitData(
  c: Context<AppEnv>,
  clientId: string,
  windowMs: number
): Promise<{ count: number; resetAt: number; retryAfter: number }> {
  const now = Date.now();
  const windowStart = now - windowMs;
  const windowStartIso = new Date(windowStart).toISOString();

  try {
    const result: any = await ((c as any).env as any).DB.prepare(
      `SELECT COUNT(*) as count FROM rate_limits
       WHERE client_id = ? AND created_at > ?`
    )
      .bind(clientId, windowStartIso)
      .first();

    const count = result?.count || 0;
    const resetAt = now + windowMs;
    const retryAfter = windowMs;

    return { count, resetAt, retryAfter };
  } catch (error) {
    // If table doesn't exist yet, return empty
    return { count: 0, resetAt: now + windowMs, retryAfter: windowMs };
  }
}

async function incrementRateLimit(
  c: Context<AppEnv>,
  clientId: string,
  windowMs: number
): Promise<void> {
  try {
    await ((c as any).env as any).DB.prepare(
      `INSERT INTO rate_limits (client_id, created_at)
       VALUES (?, CURRENT_TIMESTAMP)`
    )
      .bind(clientId)
      .run();

    // Clean up old records (async, don't wait)
    c.executionCtx.waitUntil(
      ((c as any).env as any).DB.prepare(
        `DELETE FROM rate_limits WHERE created_at < datetime('now', '-${Math.ceil(windowMs / 1000)} seconds')`
      )
        .run()
    );
  } catch (error) {
    // Table might not exist yet, create it
    console.error('Rate limit increment error:', error);
  }
}
