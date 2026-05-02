import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { createActivitySchema, updateActivitySchema, paginationSchema } from '../utils/validation';
import { generateId, calculatePagination } from '../utils/helpers';
export const activitiesRoutes = new Hono();
activitiesRoutes.get('/', async (c) => {
    const user = c.get('user');
    const query = c.req.query();
    const pagination = paginationSchema.parse({
        page: parseInt(query.page || '1'),
        per_page: parseInt(query.per_page || '20'),
        sort: query.sort || 'created_at',
        order: query.order || 'desc',
        type: query.type,
        status: query.status,
    });
    let whereClause = 'WHERE 1=1';
    const bindings = [];
    if (user?.role !== 'admin') {
        whereClause += ' AND owner_id = ?';
        bindings.push(user?.id);
    }
    if (pagination.type) {
        whereClause += ' AND type = ?';
        bindings.push(pagination.type);
    }
    if (pagination.status) {
        whereClause += ' AND status = ?';
        bindings.push(pagination.status);
    }
    const db = c.env.DB;
    const countBindings = [...bindings];
    const countResult = await db.prepare(`SELECT COUNT(*) as total FROM activities ${whereClause}`).bind(...countBindings).first();
    const offset = (pagination.page - 1) * pagination.per_page;
    const queryBindings = [...bindings, pagination.per_page, offset];
    const result = await db.prepare(`SELECT a.*, c.first_name, c.last_name, d.name as deal_name FROM activities a LEFT JOIN contacts c ON a.contact_id = c.id LEFT JOIN deals d ON a.deal_id = d.id ${whereClause} ORDER BY ${pagination.sort} ${pagination.order} LIMIT ? OFFSET ?`).bind(...queryBindings).all();
    const results = result.results || [];
    const paginationInfo = calculatePagination(pagination.page, pagination.per_page, countResult?.total || 0);
    return c.json({
        data: results || [],
        pagination: {
            page: paginationInfo.page,
            per_page: paginationInfo.perPage,
            total: paginationInfo.total,
            total_pages: paginationInfo.totalPages,
            has_more: paginationInfo.hasMore,
        },
    });
});
activitiesRoutes.get('/:id', async (c) => {
    const { id } = c.req.param();
    const db = c.env.DB;
    const stmt = db.prepare(`SELECT a.*, c.first_name, c.last_name, d.name as deal_name FROM activities a LEFT JOIN contacts c ON a.contact_id = c.id LEFT JOIN deals d ON a.deal_id = d.id WHERE a.id = ?`).bind(id);
    const activity = await stmt.first();
    if (!activity) {
        throw new HTTPException(404, { message: 'Activity not found' });
    }
    return c.json({ data: activity });
});
activitiesRoutes.post('/', async (c) => {
    const user = c.get('user');
    const body = await c.req.json();
    const validated = createActivitySchema.parse(body);
    const id = generateId();
    const db = c.env.DB;
    await db.prepare(`INSERT INTO activities (id, contact_id, deal_id, type, subject, description, status, due_date, direction, owner_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(id, validated.contact_id || null, validated.deal_id || null, validated.type, validated.subject || null, validated.description || null, validated.status || 'pending', validated.due_date || null, validated.direction || 'internal', user?.id).run();
    await db.prepare(`INSERT INTO audit_logs (user_id, action, table_name, record_id) VALUES (?, ?, ?, ?)`).bind(user?.id, 'create', 'activities', id).run();
    const activity = await db.prepare(`SELECT a.*, c.first_name, c.last_name, d.name as deal_name FROM activities a LEFT JOIN contacts c ON a.contact_id = c.id LEFT JOIN deals d ON a.deal_id = d.id WHERE a.id = ?`).bind(id).first();
    return c.json({ message: 'Activity created successfully', data: activity }, 201);
});
activitiesRoutes.put('/:id', async (c) => {
    const user = c.get('user');
    const { id } = c.req.param();
    const body = await c.req.json();
    const validated = updateActivitySchema.parse(body);
    const db = c.env.DB;
    const existing = await db.prepare('SELECT * FROM activities WHERE id = ?').bind(id).first();
    if (!existing) {
        throw new HTTPException(404, { message: 'Activity not found' });
    }
    const updates = [];
    const bindValues = [];
    for (const [key, value] of Object.entries(validated)) {
        if (value !== undefined) {
            updates.push(`${key} = ?`);
            bindValues.push(value);
        }
    }
    if (updates.length === 0) {
        throw new HTTPException(400, { message: 'No fields to update' });
    }
    if (validated.status === 'completed' && !existing.completed_at) {
        updates.push('completed_at = CURRENT_TIMESTAMP');
    }
    updates.push('updated_at = CURRENT_TIMESTAMP');
    bindValues.push(id);
    await db.prepare(`UPDATE activities SET ${updates.join(', ')} WHERE id = ?`).bind(...bindValues).run();
    await db.prepare(`INSERT INTO audit_logs (user_id, action, table_name, record_id) VALUES (?, ?, ?, ?)`).bind(user?.id, 'update', 'activities', id).run();
    const activity = await db.prepare('SELECT * FROM activities WHERE id = ?').bind(id).first();
    return c.json({ message: 'Activity updated successfully', data: activity });
});
activitiesRoutes.delete('/:id', async (c) => {
    const user = c.get('user');
    const { id } = c.req.param();
    const db = c.env.DB;
    const existing = await db.prepare('SELECT * FROM activities WHERE id = ?').bind(id).first();
    if (!existing) {
        throw new HTTPException(404, { message: 'Activity not found' });
    }
    await db.prepare('DELETE FROM activities WHERE id = ?').bind(id).run();
    await db.prepare(`INSERT INTO audit_logs (user_id, action, table_name, record_id) VALUES (?, ?, ?, ?)`).bind(user?.id, 'delete', 'activities', id).run();
    return c.json({ message: 'Activity deleted successfully' });
});
activitiesRoutes.get('/contact/:contactId', async (c) => {
    const { contactId } = c.req.param();
    const db = c.env.DB;
    const activities = db.prepare('SELECT * FROM activities WHERE contact_id = ? ORDER BY created_at DESC').bind(contactId).all();
    return c.json({ data: activities || [] });
});
activitiesRoutes.get('/deal/:dealId', async (c) => {
    const { dealId } = c.req.param();
    const db = c.env.DB;
    const activities = db.prepare('SELECT * FROM activities WHERE deal_id = ? ORDER BY created_at DESC').bind(dealId).all();
    return c.json({ data: activities || [] });
});
