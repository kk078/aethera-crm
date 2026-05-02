import { getTableForRoute, ROUTE_TABLE_MAP } from '../utils/helpers';

// Check if table exists - simplified version that never throws
async function simpleCheckTableExists(db: any, tableName: string): Promise<'ok' | 'migration_pending'> {
  try {
    const stmt = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?");
    const result = await stmt.bind(tableName).all();
    if (result.results && result.results.length > 0) {
      return 'ok';
    }
    return 'migration_pending';
  } catch (error: any) {
    return 'migration_pending';
  }
}

// ============================================
// Schema Sentinel Middleware
// ============================================
// Intercepts all /api/v1/ requests and checks if the primary table exists.
// If the table is missing, returns a 200 OK with a skeleton response and
// X-System-Status: migration_required header to prevent UI crashes.

import { StandardizedResponse } from '../utils/helpers';

export const SCHEMA_SENTINEL_HEADER = 'X-System-Status';
export const MIGRATION_REQUIRED = 'migration_required';
export const MIGRATION_READY = 'migration_ready';

// Standardized skeleton response for missing tables
export const MIGRATION_PENDING_RESPONSE: StandardizedResponse = {
  data: null,
  error: 'Database migration required',
  meta: {
    schema_version: '1.0.0',
    table_status: 'missing',
  },
};

/**
 * Schema Sentinel Middleware - checks table existence before route execution
 */
export async function schemaSentinelMiddleware(c: any, next: () => Promise<any>) {
  const path = c.req.path;

  // Only check /api/v1/ routes
  if (!path.startsWith('/api/v1')) {
    await next();
    return;
  }

  const db = c.env.DB;
  if (!db) {
    await next();
    return;
  }

  // Get the table name for this route
  const tableName = getTableForRoute(path);

  if (!tableName) {
    // No table mapping for this route, continue
    await next();
    return;
  }

  // Check if table exists - wrap in try/catch to prevent unhandled errors
  let tableStatus: 'ok' | 'migration_pending' = 'ok'; // Default to ok
  try {
    tableStatus = await simpleCheckTableExists(db, tableName);
  } catch (error: any) {
    // If table check fails, assume table is missing and continue
    tableStatus = 'migration_pending';
  }

  if (tableStatus === 'migration_pending') {
    // Add header to indicate migration is required
    c.headers.set(SCHEMA_SENTINEL_HEADER, MIGRATION_REQUIRED);

    // Return skeleton response instead of 500
    return c.json(MIGRATION_PENDING_RESPONSE, 200);
  }

  // Table exists, continue with request
  c.headers.set(SCHEMA_SENTINEL_HEADER, MIGRATION_READY);
  await next();
}

/**
 * Schema Sentinel for specific routes
 * Use when you want to check a specific table rather than the default mapping
 */
export async function schemaSentinelForTable(tableName: string) {
  return async (c: any, next: () => Promise<any>) => {
    const db = c.env.DB;
    if (!db) {
      await next();
      return;
    }

    const tableStatus = await simpleCheckTableExists(db, tableName);

    if (tableStatus === 'migration_pending') {
      c.headers.set(SCHEMA_SENTINEL_HEADER, MIGRATION_REQUIRED);
      return c.json(MIGRATION_PENDING_RESPONSE, 200);
    }

    c.headers.set(SCHEMA_SENTINEL_HEADER, MIGRATION_READY);
    await next();
  };
}
