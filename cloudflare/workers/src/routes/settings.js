import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { generateId } from '../utils/helpers';
export const settingsRoutes = new Hono();
// List all settings
settingsRoutes.get('/', async (c) => {
    const result = await c.env.DB.prepare('SELECT * FROM settings ORDER BY category, key')
        .all();
    const settings = result.results || [];
    // Group settings by category
    const grouped = {};
    for (const setting of settings || []) {
        const category = setting.category || 'general';
        if (!grouped[category]) {
            grouped[category] = {};
        }
        grouped[category][setting.key] = setting.value;
    }
    return c.json({
        data: grouped,
    });
});
// Get settings by category
settingsRoutes.get('/:category', async (c) => {
    const { category } = c.req.param();
    const result = await c.env.DB.prepare('SELECT * FROM settings WHERE category = ? ORDER BY key')
        .bind(category)
        .all();
    const settings = result.results || [];
    const grouped = {};
    for (const setting of settings || []) {
        grouped[setting.key] = setting.value;
    }
    return c.json({
        data: grouped,
    });
});
// Update setting
settingsRoutes.put('/:category/:key', async (c) => {
    const user = c.get('user');
    const { category, key } = c.req.param();
    const body = await c.req.json();
    const { value } = body;
    if (value === undefined) {
        throw new HTTPException(400, { message: 'Value is required' });
    }
    // Check if setting exists
    const existing = await c.env.DB.prepare('SELECT * FROM settings WHERE key = ? AND category = ?')
        .bind(key, category)
        .first();
    if (existing) {
        await c.env.DB.prepare('UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ? AND category = ?')
            .bind(value, key, category)
            .run();
    }
    else {
        await c.env.DB.prepare('INSERT INTO settings (id, key, value, category) VALUES (?, ?, ?, ?)')
            .bind(generateId(), key, value, category)
            .run();
    }
    const setting = await c.env.DB.prepare('SELECT * FROM settings WHERE key = ? AND category = ?')
        .bind(key, category)
        .first();
    return c.json({
        message: 'Setting updated successfully',
        data: setting,
    });
});
// Get integration settings
settingsRoutes.get('/integrations/:name', async (c) => {
    const { name } = c.req.param();
    const integration = await c.env.DB.prepare('SELECT * FROM integrations WHERE name = ?')
        .bind(name)
        .first();
    if (!integration) {
        throw new HTTPException(404, { message: 'Integration not found' });
    }
    // Don't return sensitive config data
    const safeIntegration = {
        id: integration.id,
        name: integration.name,
        type: integration.type,
        is_active: integration.is_active,
        last_sync: integration.last_sync,
        created_at: integration.created_at,
        updated_at: integration.updated_at,
    };
    return c.json({
        data: safeIntegration,
    });
});
// Update integration settings
settingsRoutes.put('/integrations/:name', async (c) => {
    const user = c.get('user');
    const { name } = c.req.param();
    const body = await c.req.json();
    const { config, is_active } = body;
    const existing = await c.env.DB.prepare('SELECT * FROM integrations WHERE name = ?')
        .bind(name)
        .first();
    if (existing) {
        await c.env.DB.prepare('UPDATE integrations SET config = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE name = ?')
            .bind(JSON.stringify(config), is_active ? 1 : 0, name)
            .run();
    }
    else {
        await c.env.DB.prepare('INSERT INTO integrations (id, name, type, config, is_active) VALUES (?, ?, ?, ?, ?)')
            .bind(generateId(), name, body.type || 'custom', JSON.stringify(config), is_active ? 1 : 0)
            .run();
    }
    const integration = await c.env.DB.prepare('SELECT * FROM integrations WHERE name = ?')
        .bind(name)
        .first();
    return c.json({
        message: 'Integration updated successfully',
        data: integration,
    });
});
// List all integrations
settingsRoutes.get('/integrations/list', async (c) => {
    const result = await c.env.DB.prepare('SELECT id, name, type, is_active, last_sync, created_at, updated_at FROM integrations ORDER BY name').all();
    const integrations = result.results || [];
    return c.json({
        data: integrations || [],
    });
});
