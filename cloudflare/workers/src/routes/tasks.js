import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { createTaskSchema, updateTaskSchema, paginationSchema } from '../utils/validation';
import { generateId, calculatePagination } from '../utils/helpers';
export const tasksRoutes = new Hono();
// List tasks
tasksRoutes.get('/', async (c) => {
    const user = c.get('user');
    const query = c.req.query();
    const pagination = paginationSchema.parse({
        page: parseInt(query.page || '1'),
        per_page: parseInt(query.per_page || '20'),
        sort: query.sort || 'due_date',
        order: query.order || 'asc',
        status: query.status,
        priority: query.priority,
    });
    let whereClause = 'WHERE 1=1';
    const bindings = [];
    if (user?.role !== 'admin') {
        whereClause += ' AND owner_id = ?';
        bindings.push(user?.id);
    }
    if (pagination.status) {
        whereClause += ' AND status = ?';
        bindings.push(pagination.status);
    }
    if (pagination.priority) {
        whereClause += ' AND priority = ?';
        bindings.push(pagination.priority);
    }
    const db = c.env.DB;
    const countBindings = [...bindings];
    const countResult = await db.prepare(`SELECT COUNT(*) as total FROM tasks ${whereClause}`).bind(...countBindings).first();
    const total = countResult?.total || 0;
    const offset = (pagination.page - 1) * pagination.per_page;
    const queryBindings = [...bindings, pagination.per_page, offset];
    const result = await db.prepare(`SELECT * FROM tasks ${whereClause} ORDER BY ${pagination.sort} ${pagination.order} LIMIT ? OFFSET ?`).bind(...queryBindings).all();
    const results = result.results || [];
    const paginationInfo = calculatePagination(pagination.page, pagination.per_page, total);
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
// Get single task
tasksRoutes.get('/:id', async (c) => {
    const { id } = c.req.param();
    const db = c.env.DB;
    const task = await db.prepare('SELECT * FROM tasks WHERE id = ?').bind(id).first();
    if (!task) {
        throw new HTTPException(404, { message: 'Task not found' });
    }
    return c.json({ data: task });
});
// Create task
tasksRoutes.post('/', async (c) => {
    const user = c.get('user');
    const body = await c.req.json();
    const validated = createTaskSchema.parse(body);
    const id = generateId();
    const db = c.env.DB;
    await db.prepare(`
    INSERT INTO tasks (id, title, description, status, priority, due_date, related_type, related_id, owner_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, validated.title, validated.description || null, validated.status || 'pending', validated.priority || 'medium', validated.due_date || null, validated.related_type || null, validated.related_id || null, user?.id).run();
    await db.prepare(`INSERT INTO audit_logs (user_id, action, table_name, record_id) VALUES (?, ?, ?, ?)`).bind(user?.id, 'create', 'tasks', id).run();
    const task = await db.prepare('SELECT * FROM tasks WHERE id = ?').bind(id).first();
    return c.json({
        message: 'Task created successfully',
        data: task,
    }, 201);
});
// Update task
tasksRoutes.put('/:id', async (c) => {
    const user = c.get('user');
    const { id } = c.req.param();
    const body = await c.req.json();
    const validated = updateTaskSchema.parse(body);
    const db = c.env.DB;
    const existing = await db.prepare('SELECT * FROM tasks WHERE id = ?').bind(id).first();
    if (!existing) {
        throw new HTTPException(404, { message: 'Task not found' });
    }
    const updates = [];
    const bindings = [];
    for (const [key, value] of Object.entries(validated)) {
        if (value !== undefined) {
            updates.push(`${key} = ?`);
            bindings.push(value);
        }
    }
    if (updates.length === 0) {
        throw new HTTPException(400, { message: 'No fields to update' });
    }
    if (validated.status === 'completed' && !existing.completed_at) {
        updates.push('completed_at = CURRENT_TIMESTAMP');
    }
    updates.push('updated_at = CURRENT_TIMESTAMP');
    bindings.push(id);
    await db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`).bind(...bindings).run();
    const task = await db.prepare('SELECT * FROM tasks WHERE id = ?').bind(id).first();
    return c.json({
        message: 'Task updated successfully',
        data: task,
    });
});
// Delete task
tasksRoutes.delete('/:id', async (c) => {
    const user = c.get('user');
    const { id } = c.req.param();
    const db = c.env.DB;
    const existing = await db.prepare('SELECT * FROM tasks WHERE id = ?').bind(id).first();
    if (!existing) {
        throw new HTTPException(404, { message: 'Task not found' });
    }
    await db.prepare('DELETE FROM tasks WHERE id = ?').bind(id).run();
    await db.prepare(`INSERT INTO audit_logs (user_id, action, table_name, record_id) VALUES (?, ?, ?, ?)`).bind(user?.id, 'delete', 'tasks', id).run();
    return c.json({ message: 'Task deleted successfully' });
});
// Get tasks by status
tasksRoutes.get('/status/:status', async (c) => {
    const { status } = c.req.param();
    const user = c.get('user');
    let whereClause = 'WHERE status = ?';
    const bindings = [status];
    if (user?.role !== 'admin') {
        whereClause += ' AND owner_id = ?';
        bindings.push(user?.id);
    }
    const db = c.env.DB;
    const tasks = await db.prepare(`SELECT * FROM tasks ${whereClause} ORDER BY due_date ASC`).bind(...bindings).all();
    return c.json({
        data: tasks || [],
    });
});
// Get overdue tasks
tasksRoutes.get('/overdue/list', async (c) => {
    const user = c.get('user');
    let whereClause = "WHERE status != 'completed' AND due_date < CURRENT_TIMESTAMP";
    const bindings = [];
    if (user?.role !== 'admin') {
        whereClause += ' AND owner_id = ?';
        bindings.push(user?.id);
    }
    const db = c.env.DB;
    const tasks = await db.prepare(`SELECT * FROM tasks ${whereClause} ORDER BY due_date ASC`).bind(...bindings).all();
    return c.json({
        data: tasks || [],
    });
});
