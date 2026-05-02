import { getTableForRoute, checkTableExists } from '../utils/helpers';
// ============================================
// Schema Sentinel Middleware
// ============================================
// Intercepts all /api/v1/ requests and checks if the primary table exists.
// If the table is missing, returns a 200 OK with a skeleton response and
// X-System-Status: migration_required header to prevent UI crashes.
export const SCHEMA_SENTINEL_HEADER = 'X-System-Status';
export const MIGRATION_REQUIRED = 'migration_required';
export const MIGRATION_READY = 'migration_ready';
// Skeleton response for missing tables
export const MIGRATION_PENDING_RESPONSE = {
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
export async function schemaSentinelMiddleware(c, next) {
    const path = c.req.path;
    console.log(`[SCHEMA-SENTINEL] Checking path: ${path}`);
    // Only check /api/v1/ routes
    if (!path.startsWith('/api/v1')) {
        await next();
        return;
    }
    const db = c.env.DB;
    if (!db) {
        console.log('[SCHEMA-SENTINEL] No DB binding, skipping');
        await next();
        return;
    }
    // Get the table name for this route
    const tableName = getTableForRoute(path);
    console.log(`[SCHEMA-SENTINEL] Table for ${path}: ${tableName}`);
    if (!tableName) {
        // No table mapping for this route, continue
        console.log('[SCHEMA-SENTINEL] No table mapping, continuing');
        await next();
        return;
    }
    // Check if table exists
    const tableStatus = await checkTableExists(db, tableName);
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
export async function schemaSentinelForTable(tableName) {
    return async (c, next) => {
        const db = c.env.DB;
        if (!db) {
            await next();
            return;
        }
        const tableStatus = await checkTableExists(db, tableName);
        if (tableStatus === 'migration_pending') {
            c.headers.set(SCHEMA_SENTINEL_HEADER, MIGRATION_REQUIRED);
            return c.json(MIGRATION_PENDING_RESPONSE, 200);
        }
        c.headers.set(SCHEMA_SENTINEL_HEADER, MIGRATION_READY);
        await next();
    };
}
