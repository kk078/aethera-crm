import { Hono } from 'hono';
import { getDatabaseTableList } from '../utils/helpers';
export const debugRoutes = new Hono();
// Diagnostic route - hidden endpoint for database status
// GET /api/v1/debug/db-status
debugRoutes.get('/db-status', async (c) => {
    try {
        const db = c.env.DB;
        const tables = await getDatabaseTableList(db);
        return c.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            database: {
                tables: tables,
                tableCount: tables.length,
            },
        });
    }
    catch (error) {
        console.error('[DEBUG] Error getting database status:', error);
        return c.json({
            status: 'error',
            timestamp: new Date().toISOString(),
            error: error.message || 'Failed to get database status',
            database: {
                tables: [],
                tableCount: 0,
            },
        });
    }
});
// Diagnostic route - check environment bindings
// GET /api/v1/debug/env-status
debugRoutes.get('/env-status', (c) => {
    try {
        const env = c.env;
        const bindings = Object.keys(env);
        return c.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            environment: {
                bindings: bindings,
                hasDB: !!env.DB,
                hasR2: !!env.STORAGE,
                hasAI: !!env.AI,
                hasQueue: !!env.QUEUE,
            },
        });
    }
    catch (error) {
        console.error('[DEBUG] Error getting env status:', error);
        return c.json({
            status: 'error',
            timestamp: new Date().toISOString(),
            error: error.message || 'Failed to get environment status',
        });
    }
});
// Diagnostic route - test database connectivity
// GET /api/v1/debug/db-test
debugRoutes.get('/db-test', async (c) => {
    try {
        const db = c.env.DB;
        // Test 1: Check if DB binding exists
        if (!db) {
            return c.json({
                status: 'error',
                timestamp: new Date().toISOString(),
                error: 'DB binding not found in environment',
                bindings: Object.keys(c.env),
            });
        }
        // Test 2: Try a simple query
        const tableCheck = await db.prepare("SELECT name FROM sqlite_master WHERE type='table' LIMIT 1").all();
        const tables = tableCheck.results?.map((r) => r.name) || [];
        // Test 3: Get schema info
        const schemaCheck = await db.prepare('SELECT COUNT(*) as count FROM users').all();
        const hasUsersTable = schemaCheck.results?.[0]?.count !== undefined;
        return c.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            database: {
                bound: true,
                accessible: true,
                tables,
                tableCount: tables.length,
                hasUsersTable,
            },
        });
    }
    catch (error) {
        console.error('[DEBUG] Error in db-test:', error);
        return c.json({
            status: 'error',
            timestamp: new Date().toISOString(),
            error: error.message || 'Database test failed',
            bindings: Object.keys(c.env),
        });
    }
});
// Diagnostic route - list available routes for debugging
// GET /api/v1/debug/routes
debugRoutes.get('/routes', (c) => {
    return c.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        availableRoutes: [
            '/api/v1/debug/db-status',
            '/api/v1/debug/env-status',
            '/api/v1/debug/db-test',
            '/api/v1/debug/routes',
        ],
    });
});
