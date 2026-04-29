import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { createTaskSchema, updateTaskSchema, paginationSchema } from '../utils/validation';
import { generateId, calculatePagination } from '../utils/helpers';
import type { AppEnv } from '../types';

export const tasksRoutes = new Hono<AppEnv>();

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
  const bindings: any[] = [];

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

  const db = (c as any).env.DB as any;
  let stmt: any = db.prepare(`SELECT COUNT(*) as total FROM tasks ${whereClause}`);
  for (const b of bindings) {
    stmt = stmt.bind(b);
  }
  const countResult = await stmt.first();
  const total = countResult?.total || 0;

  const offset = (pagination.page - 1) * pagination.per_page;
  stmt = db.prepare(`SELECT * FROM tasks ${whereClause} ORDER BY ${pagination.sort} ${pagination.order} LIMIT ? OFFSET ?`) as any;
  for (const b of bindings) {
    stmt = stmt.bind(b);
  }
  stmt = stmt.bind(pagination.per_page);
  stmt = stmt.bind(offset);
  const results: any = await stmt.all();

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
  const db = (c as any).env.DB as any;
  let stmt: any = db.prepare('SELECT * FROM tasks WHERE id = ?');
  stmt = stmt.bind(id);
  const task = await stmt.first();
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
  const db = (c as any).env.DB as any;
  let stmt: any = db.prepare(`
    INSERT INTO tasks (id, title, description, status, priority, due_date, related_type, related_id, owner_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt = stmt.bind(id);
  stmt = stmt.bind(validated.title);
  stmt = stmt.bind(validated.description || null);
  stmt = stmt.bind(validated.status || 'pending');
  stmt = stmt.bind(validated.priority || 'medium');
  stmt = stmt.bind(validated.due_date || null);
  stmt = stmt.bind(validated.related_type || null);
  stmt = stmt.bind(validated.related_id || null);
  stmt = stmt.bind(user?.id);
  await stmt.run();

  stmt = db.prepare(`INSERT INTO audit_logs (user_id, action, table_name, record_id) VALUES (?, ?, ?, ?)`) as any;
  stmt = stmt.bind(user?.id);
  stmt = stmt.bind('create');
  stmt = stmt.bind('tasks');
  stmt = stmt.bind(id);
  await stmt.run();

  stmt = db.prepare('SELECT * FROM tasks WHERE id = ?') as any;
  stmt = stmt.bind(id);
  const task = await stmt.first();

  return c.json(
    {
      message: 'Task created successfully',
      data: task,
    },
    201
  );
});

// Update task
tasksRoutes.put('/:id', async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();
  const body = await c.req.json();
  const validated = updateTaskSchema.parse(body);

  const db = (c as any).env.DB as any;
  let existingStmt: any = db.prepare('SELECT * FROM tasks WHERE id = ?');
  existingStmt = existingStmt.bind(id);
  const existing = await existingStmt.first();
  if (!existing) {
    throw new HTTPException(404, { message: 'Task not found' });
  }

  const updates: string[] = [];
  const bindings: any[] = [];

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

  let stmt: any = db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`);
  for (const b of bindings) {
    stmt = stmt.bind(b);
  }
  await stmt.run();

  stmt = db.prepare('SELECT * FROM tasks WHERE id = ?') as any;
  stmt = stmt.bind(id);
  const task = await stmt.first();

  return c.json({
    message: 'Task updated successfully',
    data: task,
  });
});

// Delete task
tasksRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();
  const db = (c as any).env.DB as any;

  let existingStmt: any = db.prepare('SELECT * FROM tasks WHERE id = ?');
  existingStmt = existingStmt.bind(id);
  const existing = await existingStmt.first();
  if (!existing) {
    throw new HTTPException(404, { message: 'Task not found' });
  }

  let deleteStmt: any = db.prepare('DELETE FROM tasks WHERE id = ?');
  deleteStmt = deleteStmt.bind(id);
  await deleteStmt.run();

  let auditStmt: any = db.prepare(`INSERT INTO audit_logs (user_id, action, table_name, record_id) VALUES (?, ?, ?, ?)`);
  auditStmt = auditStmt.bind(user?.id);
  auditStmt = auditStmt.bind('delete');
  auditStmt = auditStmt.bind('tasks');
  auditStmt = auditStmt.bind(id);
  await auditStmt.run();

  return c.json({ message: 'Task deleted successfully' });
});

// Get tasks by status
tasksRoutes.get('/status/:status', async (c) => {
  const { status } = c.req.param();
  const user = c.get('user');

  let whereClause = 'WHERE status = ?';
  const bindings: any[] = [status];

  if (user?.role !== 'admin') {
    whereClause += ' AND owner_id = ?';
    bindings.push(user?.id);
  }

  const db = (c as any).env.DB as any;
  let stmt: any = db.prepare(`SELECT * FROM tasks ${whereClause} ORDER BY due_date ASC`);
  for (const b of bindings) {
    stmt = stmt.bind(b);
  }
  const tasks: any = await stmt.all();

  return c.json({
    data: tasks || [],
  });
});

// Get overdue tasks
tasksRoutes.get('/overdue/list', async (c) => {
  const user = c.get('user');

  let whereClause = "WHERE status != 'completed' AND due_date < CURRENT_TIMESTAMP";
  const bindings: any[] = [];

  if (user?.role !== 'admin') {
    whereClause += ' AND owner_id = ?';
    bindings.push(user?.id);
  }

  const db = (c as any).env.DB as any;
  let stmt: any = db.prepare(`SELECT * FROM tasks ${whereClause} ORDER BY due_date ASC`);
  for (const b of bindings) {
    stmt = stmt.bind(b);
  }
  const tasks: any = await stmt.all();

  return c.json({
    data: tasks || [],
  });
});
