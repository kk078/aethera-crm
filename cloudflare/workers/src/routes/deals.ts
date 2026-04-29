import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { createDealSchema, updateDealSchema, paginationSchema } from '../utils/validation';
import { generateId, calculatePagination, formatCurrency } from '../utils/helpers';
import type { AppEnv } from '../types';

export const dealsRoutes = new Hono<AppEnv>();

dealsRoutes.get('/', async (c) => {
  const user = c.get('user');
  const query = c.req.query();
  const pagination = paginationSchema.parse({
    page: parseInt(query.page || '1'),
    per_page: parseInt(query.per_page || '20'),
    sort: query.sort || 'created_at',
    order: query.order || 'desc',
    search: query.search,
    stage: query.stage,
  });
  let whereClause = 'WHERE 1=1';
  const bindings: any[] = [];
  if (user?.role !== 'admin') {
    whereClause += ' AND owner_id = ?';
    bindings.push(user?.id);
  }
  if (pagination.stage) {
    whereClause += ' AND stage = ?';
    bindings.push(pagination.stage);
  }
  if (pagination.search) {
    whereClause += ' AND name LIKE ?';
    bindings.push('%' + pagination.search + '%');
  }
  const db = (c as any).env.DB as any;
  let stmt: any = db.prepare(`SELECT COUNT(*) as total FROM deals ${whereClause}`);
  for (const b of bindings) {
    stmt = stmt.bind(b);
  }
  const countResult = await stmt.first();
  const offset = (pagination.page - 1) * pagination.per_page;
  stmt = db.prepare(`SELECT d.*, c.first_name, c.last_name, o.name as organization_name FROM deals d LEFT JOIN contacts c ON d.contact_id = c.id LEFT JOIN organizations o ON d.organization_id = o.id ${whereClause} ORDER BY ${pagination.sort} ${pagination.order} LIMIT ? OFFSET ?`) as any;
  for (const b of bindings) {
    stmt = stmt.bind(b);
  }
  stmt = stmt.bind(pagination.per_page);
  stmt = stmt.bind(offset);
  const results: any = await stmt.all();
  const paginationInfo = calculatePagination(pagination.page, pagination.per_page, countResult?.total || 0);
  const formattedDeals = (results || []).map((deal: any) => ({
    ...deal,
    amount: deal.amount ? formatCurrency(deal.amount, deal.currency || 'USD') : null,
  }));
  return c.json({
    data: formattedDeals,
    pagination: {
      page: paginationInfo.page,
      per_page: paginationInfo.perPage,
      total: paginationInfo.total,
      total_pages: paginationInfo.totalPages,
      has_more: paginationInfo.hasMore,
    },
  });
});

dealsRoutes.get('/pipeline/overview', async (c) => {
  const user = c.get('user');
  let whereClause = 'WHERE 1=1';
  const bindings: any[] = [];
  if (user?.role !== 'admin') {
    whereClause += ' AND owner_id = ?';
    bindings.push(user?.id);
  }
  const db = (c as any).env.DB as any;
  let stmt: any = db.prepare(`SELECT stage, COUNT(*) as count, SUM(amount) as total_amount, AVG(probability) as avg_probability FROM deals ${whereClause} GROUP BY stage ORDER BY stage`);
  for (const b of bindings) {
    stmt = stmt.bind(b);
  }
  const pipeline: any = await stmt.all();
  return c.json({ data: pipeline || [] });
});

dealsRoutes.get('/:id', async (c) => {
  const { id } = c.req.param();
  const db = (c as any).env.DB as any;
  let stmt: any = db.prepare(`SELECT d.*, c.first_name, c.last_name, c.email as contact_email, o.name as organization_name, o.type as organization_type FROM deals d LEFT JOIN contacts c ON d.contact_id = c.id LEFT JOIN organizations o ON d.organization_id = o.id WHERE d.id = ?`);
  stmt = stmt.bind(id);
  const deal = await stmt.first();
  if (!deal) {
    throw new HTTPException(404, { message: 'Deal not found' });
  }
  return c.json({ data: deal });
});

dealsRoutes.post('/', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const validated = createDealSchema.parse(body);
  const id = generateId();
  const db = (c as any).env.DB as any;
  let stmt: any = db.prepare(`INSERT INTO deals (id, contact_id, organization_id, name, stage, amount, probability, expected_close_date, owner_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  stmt = stmt.bind(id);
  stmt = stmt.bind(validated.contact_id || null);
  stmt = stmt.bind(validated.organization_id || null);
  stmt = stmt.bind(validated.name);
  stmt = stmt.bind(validated.stage);
  stmt = stmt.bind(validated.amount || null);
  stmt = stmt.bind(validated.probability || null);
  stmt = stmt.bind(validated.expected_close_date || null);
  stmt = stmt.bind(user?.id);
  await stmt.run();
  stmt = db.prepare(`INSERT INTO audit_logs (user_id, action, table_name, record_id) VALUES (?, ?, ?, ?)`) as any;
  stmt = stmt.bind(user?.id);
  stmt = stmt.bind('create');
  stmt = stmt.bind('deals');
  stmt = stmt.bind(id);
  await stmt.run();
  stmt = db.prepare(`SELECT d.*, c.first_name, c.last_name, o.name as organization_name FROM deals d LEFT JOIN contacts c ON d.contact_id = c.id LEFT JOIN organizations o ON d.organization_id = o.id WHERE d.id = ?`) as any;
  stmt = stmt.bind(id);
  const deal = await stmt.first();
  return c.json({ message: 'Deal created successfully', data: deal }, 201);
});

dealsRoutes.put('/:id', async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();
  const body = await c.req.json();
  const validated = updateDealSchema.parse(body);
  const db = (c as any).env.DB as any;
  let existingStmt: any = db.prepare('SELECT * FROM deals WHERE id = ?');
  existingStmt = existingStmt.bind(id);
  const existing = await existingStmt.first();
  if (!existing) {
    throw new HTTPException(404, { message: 'Deal not found' });
  }
  const updates: string[] = [];
  const bindings: any[] = [];
  for (const [key, value] of Object.entries(validated)) {
    if (value !== undefined) {
      updates.push(key + ' = ?');
      bindings.push(value);
    }
  }
  if (updates.length === 0) {
    throw new HTTPException(400, { message: 'No fields to update' });
  }
  if (validated.stage && validated.stage !== existing.stage) {
    updates.push('stage_changed_at = CURRENT_TIMESTAMP');
  }
  updates.push('updated_at = CURRENT_TIMESTAMP');
  bindings.push(id);
  let stmt: any = db.prepare(`UPDATE deals SET ${updates.join(', ')} WHERE id = ?`);
  for (const b of bindings) {
    stmt = stmt.bind(b);
  }
  await stmt.run();
  stmt = db.prepare(`SELECT d.*, c.first_name, c.last_name, o.name as organization_name FROM deals d LEFT JOIN contacts c ON d.contact_id = c.id LEFT JOIN organizations o ON d.organization_id = o.id WHERE d.id = ?`) as any;
  stmt = stmt.bind(id);
  const deal = await stmt.first();
  return c.json({ message: 'Deal updated successfully', data: deal });
});

dealsRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();
  const db = (c as any).env.DB as any;
  let existingStmt: any = db.prepare('SELECT * FROM deals WHERE id = ?');
  existingStmt = existingStmt.bind(id);
  const existing = await existingStmt.first();
  if (!existing) {
    throw new HTTPException(404, { message: 'Deal not found' });
  }
  let deleteStmt: any = db.prepare('DELETE FROM deals WHERE id = ?');
  deleteStmt = deleteStmt.bind(id);
  await deleteStmt.run();
  let auditStmt: any = db.prepare(`INSERT INTO audit_logs (user_id, action, table_name, record_id) VALUES (?, ?, ?, ?)`);
  auditStmt = auditStmt.bind(user?.id);
  auditStmt = auditStmt.bind('delete');
  auditStmt = auditStmt.bind('deals');
  auditStmt = auditStmt.bind(id);
  await auditStmt.run();
  return c.json({ message: 'Deal deleted successfully' });
});

dealsRoutes.patch('/:id/stage', async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();
  const body = await c.req.json();
  const { stage, probability, amount } = body;
  if (!stage) {
    throw new HTTPException(400, { message: 'Stage is required' });
  }
  const db = (c as any).env.DB as any;
  let existingStmt: any = db.prepare('SELECT * FROM deals WHERE id = ?');
  existingStmt = existingStmt.bind(id);
  const existing = await existingStmt.first();
  if (!existing) {
    throw new HTTPException(404, { message: 'Deal not found' });
  }
  const updates: string[] = ['stage = ?', 'updated_at = CURRENT_TIMESTAMP'];
  const bindings: any[] = [stage, id];
  if (probability !== undefined) {
    updates.push('probability = ?');
    bindings.push(probability);
  }
  if (amount !== undefined) {
    updates.push('amount = ?');
    bindings.push(amount);
  }
  if (stage.toLowerCase().includes('won') || stage.toLowerCase() === 'closed won') {
    updates.push('actual_close_date = CURRENT_TIMESTAMP');
  } else if (stage.toLowerCase().includes('lost') || stage.toLowerCase() === 'closed lost') {
    updates.push('actual_close_date = CURRENT_TIMESTAMP');
  }
  let stmt: any = db.prepare(`UPDATE deals SET ${updates.join(', ')} WHERE id = ?`);
  for (const b of bindings) {
    stmt = stmt.bind(b);
  }
  await stmt.run();
  stmt = db.prepare(`INSERT INTO audit_logs (user_id, action, table_name, record_id) VALUES (?, ?, ?, ?)`) as any;
  stmt = stmt.bind(user?.id);
  stmt = stmt.bind('update_stage');
  stmt = stmt.bind('deals');
  stmt = stmt.bind(id);
  await stmt.run();
  stmt = db.prepare('SELECT * FROM deals WHERE id = ?') as any;
  stmt = stmt.bind(id);
  const deal = await stmt.first();
  return c.json({ message: 'Deal stage updated successfully', data: deal });
});

dealsRoutes.get('/:id/activities', async (c) => {
  const { id } = c.req.param();
  const db = (c as any).env.DB as any;
  let stmt: any = db.prepare('SELECT * FROM activities WHERE deal_id = ? ORDER BY created_at DESC LIMIT 50');
  stmt = stmt.bind(id);
  const activities: any = await stmt.all();
  return c.json({ data: activities || [] });
});
