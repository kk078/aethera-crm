import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { createCampaignSchema, updateCampaignSchema, paginationSchema } from '../utils/validation';
import { generateId, calculatePagination } from '../utils/helpers';
import type { AppEnv } from '../types';

export const campaignsRoutes = new Hono<AppEnv>();

campaignsRoutes.get('/', async (c) => {
  try {
    const user = c.get('user');
    const queryParam = c.req.query();
    const pagination = paginationSchema.parse({
      page: parseInt(queryParam.page || '1'),
      per_page: parseInt(queryParam.per_page || '20'),
      sort: queryParam.sort || 'created_at',
      order: queryParam.order || 'desc',
      status: queryParam.status,
    });
    let whereClause = '';
    const bindings: any[] = [];
    if (user?.role !== 'admin') {
      whereClause = ' WHERE owner_id = ?';
      bindings.push(user.id);
    }
    if (pagination.status) {
      whereClause += (whereClause ? ' AND ' : ' WHERE ') + ' status = ?';
      bindings.push(pagination.status);
    }
    const db = (c as any).env.DB as any;

    // Get count
    const countBindings = [...bindings];
    const countResult = await db.prepare(`SELECT COUNT(*) as total FROM campaigns ${whereClause}`).bind(...countBindings).first();
    const offset = (pagination.page - 1) * pagination.per_page;

    const sortCol = pagination.sort || 'created_at';
    const sortOrder = pagination.order || 'desc';
    const queryBindings = [...bindings, pagination.per_page, offset];
    let sqlQuery = `SELECT * FROM campaigns ${whereClause} ORDER BY ${sortCol} ${sortOrder}`;
    const result: any = await db.prepare(`${sqlQuery} LIMIT ? OFFSET ?`).bind(...queryBindings).all();
    const results = result.results || [];
    const paginationInfo = calculatePagination(pagination.page, pagination.per_page, countResult?.total || 0);
    return c.json({
      data: results,
      pagination: {
        page: paginationInfo.page,
        per_page: paginationInfo.perPage,
        total: paginationInfo.total,
        total_pages: paginationInfo.totalPages,
        has_more: paginationInfo.hasMore,
      },
    });
  } catch (error: any) {
    console.error('[CAMPAIGNS] Error in GET /campaigns:', error.message || error);
    return c.json({
      data: [],
      error: error.message || 'Failed to fetch campaigns',
      status: 'error',
    }, 200);
  }
});

campaignsRoutes.get('/:id', async (c) => {
  const { id } = c.req.param();
  const db = (c as any).env.DB as any;
  let stmt: any = db.prepare('SELECT * FROM campaigns WHERE id = ?');
  stmt = stmt.bind(id);
  const campaign = await stmt.first();
  if (!campaign) {
    throw new HTTPException(404, { message: 'Campaign not found' });
  }
  return c.json({ data: campaign });
});

campaignsRoutes.post('/', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const validated = createCampaignSchema.parse(body);
  const id = generateId();
  const db = (c as any).env.DB as any;
  let stmt: any = db.prepare('INSERT INTO campaigns (id, name, type, status, target_audience, budget, owner_id) VALUES (?, ?, ?, ?, ?, ?, ?)');
  stmt = stmt.bind(id);
  stmt = stmt.bind(validated.name);
  stmt = stmt.bind(validated.type || null);
  stmt = stmt.bind(validated.status || 'draft');
  stmt = stmt.bind(validated.target_audience || null);
  stmt = stmt.bind(validated.budget || null);
  stmt = stmt.bind(user?.id);
  await stmt.run();
  stmt = db.prepare('INSERT INTO audit_logs (user_id, action, table_name, record_id) VALUES (?, ?, ?, ?)') as any;
  stmt = stmt.bind(user?.id);
  stmt = stmt.bind('create');
  stmt = stmt.bind('campaigns');
  stmt = stmt.bind(id);
  await stmt.run();
  stmt = db.prepare('SELECT * FROM campaigns WHERE id = ?') as any;
  stmt = stmt.bind(id);
  const campaign = await stmt.first();
  return c.json({ message: 'Campaign created successfully', data: campaign }, 201);
});

campaignsRoutes.put('/:id', async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();
  const body = await c.req.json();
  const validated = updateCampaignSchema.parse(body);
  const db = (c as any).env.DB as any;
  let existingStmt: any = db.prepare('SELECT * FROM campaigns WHERE id = ?');
  existingStmt = existingStmt.bind(id);
  const existing = await existingStmt.first();
  if (!existing) {
    throw new HTTPException(404, { message: 'Campaign not found' });
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
  updates.push('updated_at = CURRENT_TIMESTAMP');
  bindings.push(id);
  let stmt: any = db.prepare(`UPDATE campaigns SET ${updates.join(', ')} WHERE id = ?`);
  for (const b of bindings) {
    stmt = stmt.bind(b);
  }
  await stmt.run();
  stmt = db.prepare('SELECT * FROM campaigns WHERE id = ?') as any;
  stmt = stmt.bind(id);
  const campaign = await stmt.first();
  return c.json({ message: 'Campaign updated successfully', data: campaign });
});

campaignsRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();
  const db = (c as any).env.DB as any;
  let existingStmt: any = db.prepare('SELECT * FROM campaigns WHERE id = ?');
  existingStmt = existingStmt.bind(id);
  const existing = await existingStmt.first();
  if (!existing) {
    throw new HTTPException(404, { message: 'Campaign not found' });
  }
  let deleteStmt: any = db.prepare('DELETE FROM campaigns WHERE id = ?');
  deleteStmt = deleteStmt.bind(id);
  await deleteStmt.run();
  let auditStmt: any = db.prepare('INSERT INTO audit_logs (user_id, action, table_name, record_id) VALUES (?, ?, ?, ?)');
  auditStmt = auditStmt.bind(user?.id);
  auditStmt = auditStmt.bind('delete');
  auditStmt = auditStmt.bind('campaigns');
  auditStmt = auditStmt.bind(id);
  await auditStmt.run();
  return c.json({ message: 'Campaign deleted successfully' });
});

campaignsRoutes.patch('/:id/toggle', async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();
  const db = (c as any).env.DB as any;
  let stmt: any = db.prepare('SELECT * FROM campaigns WHERE id = ?');
  stmt = stmt.bind(id);
  const campaign = await stmt.first();
  if (!campaign) {
    throw new HTTPException(404, { message: 'Campaign not found' });
  }
  const newStatus = campaign.status === 'active' ? 'draft' : 'active';
  stmt = db.prepare('UPDATE campaigns SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?') as any;
  stmt = stmt.bind(newStatus);
  stmt = stmt.bind(id);
  await stmt.run();
  return c.json({ message: 'Campaign ' + (newStatus === 'active' ? 'activated' : 'deactivated') + ' successfully', data: { id, status: newStatus } });
});
