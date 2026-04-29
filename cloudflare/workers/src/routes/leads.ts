import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { createLeadSchema, updateLeadSchema, paginationSchema } from '../utils/validation';
import { generateId, calculatePagination } from '../utils/helpers';
import type { AppEnv } from '../types';

export const leadsRoutes = new Hono<AppEnv>();

// Simple lead scoring function (can be enhanced with AI later)
async function calculateLeadScore(c: any, lead: any): Promise<{ score: number; factors: any[] }> {
  let score = 50;
  const factors: any[] = [];

  if (lead.npi) {
    score += 20;
    factors.push({ factor: 'NPI Present', impact: 20 });
  }
  if (lead.email) {
    score += 10;
    factors.push({ factor: 'Email Present', impact: 10 });
  }
  if (lead.phone) {
    score += 10;
    factors.push({ factor: 'Phone Present', impact: 10 });
  }
  if (lead.specialty) {
    score += 10;
    factors.push({ factor: 'Specialty Present', impact: 10 });
  }
  score = Math.min(score, 100);
  return { score, factors };
}

leadsRoutes.get('/', async (c) => {
  const user = c.get('user');
  const query = c.req.query();
  const pagination = paginationSchema.parse({
    page: parseInt(query.page || '1'),
    per_page: parseInt(query.per_page || '20'),
    sort: query.sort || 'created_at',
    order: query.order || 'desc',
    search: query.search,
    status: query.status,
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
  if (pagination.search) {
    whereClause += ' AND (first_name LIKE ? OR last_name LIKE ? OR company LIKE ? OR email LIKE ?)';
    bindings.push('%' + pagination.search + '%', '%' + pagination.search + '%', '%' + pagination.search + '%', '%' + pagination.search + '%');
  }
  const db = (c as any).env.DB as any;
  let stmt: any = db.prepare(`SELECT COUNT(*) as total FROM leads ${whereClause}`);
  for (const b of bindings) {
    stmt = stmt.bind(b);
  }
  const countResult = await stmt.first();
  const offset = (pagination.page - 1) * pagination.per_page;
  stmt = db.prepare(`SELECT * FROM leads ${whereClause} ORDER BY ${pagination.sort} ${pagination.order} LIMIT ? OFFSET ?`) as any;
  for (const b of bindings) {
    stmt = stmt.bind(b);
  }
  stmt = stmt.bind(pagination.per_page);
  stmt = stmt.bind(offset);
  const results: any = await stmt.all();
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

leadsRoutes.get('/:id', async (c) => {
  const { id } = c.req.param();
  const db = (c as any).env.DB as any;
  let stmt: any = db.prepare('SELECT * FROM leads WHERE id = ?');
  stmt = stmt.bind(id);
  const lead = await stmt.first();
  if (!lead) {
    throw new HTTPException(404, { message: 'Lead not found' });
  }
  return c.json({ data: lead });
});

leadsRoutes.post('/', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const validated = createLeadSchema.parse(body);
  const id = generateId();
  const db = (c as any).env.DB as any;
  let stmt: any = db.prepare(`INSERT INTO leads (id, source, status, first_name, last_name, company, email, phone, address, specialty, npi, taxonomy, owner_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  stmt = stmt.bind(id);
  stmt = stmt.bind(validated.source || 'manual');
  stmt = stmt.bind(validated.status || 'new');
  stmt = stmt.bind(validated.first_name || null);
  stmt = stmt.bind(validated.last_name || null);
  stmt = stmt.bind(validated.company || null);
  stmt = stmt.bind(validated.email || null);
  stmt = stmt.bind(validated.phone || null);
  stmt = stmt.bind(validated.address || null);
  stmt = stmt.bind(validated.specialty || null);
  stmt = stmt.bind(validated.npi || null);
  stmt = stmt.bind(validated.taxonomy || null);
  stmt = stmt.bind(user?.id);
  await stmt.run();
  if (validated.npi) {
    const scoreResult = await calculateLeadScore(c, validated);
    stmt = db.prepare('UPDATE leads SET lead_score = ?, score_factors = ? WHERE id = ?') as any;
    stmt = stmt.bind(scoreResult.score);
    stmt = stmt.bind(JSON.stringify(scoreResult.factors));
    stmt = stmt.bind(id);
    await stmt.run();
  }
  stmt = db.prepare('INSERT INTO audit_logs (user_id, action, table_name, record_id) VALUES (?, ?, ?, ?)') as any;
  stmt = stmt.bind(user?.id);
  stmt = stmt.bind('create');
  stmt = stmt.bind('leads');
  stmt = stmt.bind(id);
  await stmt.run();
  stmt = db.prepare('SELECT * FROM leads WHERE id = ?') as any;
  stmt = stmt.bind(id);
  const lead = await stmt.first();
  return c.json({ message: 'Lead created successfully', data: lead }, 201);
});

leadsRoutes.put('/:id', async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();
  const body = await c.req.json();
  const validated = updateLeadSchema.parse(body);
  const db = (c as any).env.DB as any;
  let existingStmt: any = db.prepare('SELECT * FROM leads WHERE id = ?');
  existingStmt = existingStmt.bind(id);
  const existing = await existingStmt.first();
  if (!existing) {
    throw new HTTPException(404, { message: 'Lead not found' });
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
  let stmt: any = db.prepare(`UPDATE leads SET ${updates.join(', ')} WHERE id = ?`);
  for (const b of bindings) {
    stmt = stmt.bind(b);
  }
  await stmt.run();
  if (validated.npi && validated.npi !== existing.npi) {
    const scoreResult = await calculateLeadScore(c, { ...existing, ...validated });
    stmt = db.prepare('UPDATE leads SET lead_score = ?, score_factors = ? WHERE id = ?') as any;
    stmt = stmt.bind(scoreResult.score);
    stmt = stmt.bind(JSON.stringify(scoreResult.factors));
    stmt = stmt.bind(id);
    await stmt.run();
  }
  stmt = db.prepare('INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values) VALUES (?, ?, ?, ?, ?, ?)') as any;
  stmt = stmt.bind(user?.id);
  stmt = stmt.bind('update');
  stmt = stmt.bind('leads');
  stmt = stmt.bind(id);
  stmt = stmt.bind(JSON.stringify(existing));
  stmt = stmt.bind(JSON.stringify(validated));
  await stmt.run();
  stmt = db.prepare('SELECT * FROM leads WHERE id = ?') as any;
  stmt = stmt.bind(id);
  const lead = await stmt.first();
  return c.json({ message: 'Lead updated successfully', data: lead });
});

leadsRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();
  const db = (c as any).env.DB as any;
  let existingStmt: any = db.prepare('SELECT * FROM leads WHERE id = ?');
  existingStmt = existingStmt.bind(id);
  const existing = await existingStmt.first();
  if (!existing) {
    throw new HTTPException(404, { message: 'Lead not found' });
  }
  let deleteStmt: any = db.prepare('DELETE FROM leads WHERE id = ?');
  deleteStmt = deleteStmt.bind(id);
  await deleteStmt.run();
  let auditStmt: any = db.prepare('INSERT INTO audit_logs (user_id, action, table_name, record_id) VALUES (?, ?, ?, ?)');
  auditStmt = auditStmt.bind(user?.id);
  auditStmt = auditStmt.bind('delete');
  auditStmt = auditStmt.bind('leads');
  auditStmt = auditStmt.bind(id);
  await auditStmt.run();
  return c.json({ message: 'Lead deleted successfully' });
});

leadsRoutes.post('/:id/convert', async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();
  const db = (c as any).env.DB as any;
  let stmt: any = db.prepare('SELECT * FROM leads WHERE id = ?');
  stmt = stmt.bind(id);
  const lead = await stmt.first();
  if (!lead) {
    throw new HTTPException(404, { message: 'Lead not found' });
  }
  if (lead.status === 'converted') {
    throw new HTTPException(400, { message: 'Lead already converted' });
  }
  const contactId = generateId();
  stmt = db.prepare('INSERT INTO contacts (id, first_name, last_name, email, phone, address, company, owner_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)') as any;
  stmt = stmt.bind(contactId);
  stmt = stmt.bind(lead.first_name);
  stmt = stmt.bind(lead.last_name);
  stmt = stmt.bind(lead.email);
  stmt = stmt.bind(lead.phone);
  stmt = stmt.bind(lead.address);
  stmt = stmt.bind(lead.company);
  stmt = stmt.bind(user?.id);
  await stmt.run();
  stmt = db.prepare('UPDATE leads SET status = ?, converted_to_contact_id = ? WHERE id = ?') as any;
  stmt = stmt.bind('converted');
  stmt = stmt.bind(contactId);
  stmt = stmt.bind(id);
  await stmt.run();
  stmt = db.prepare('INSERT INTO audit_logs (user_id, action, table_name, record_id) VALUES (?, ?, ?, ?)') as any;
  stmt = stmt.bind(user?.id);
  stmt = stmt.bind('convert');
  stmt = stmt.bind('leads');
  stmt = stmt.bind(id);
  await stmt.run();
  stmt = db.prepare('SELECT * FROM contacts WHERE id = ?') as any;
  stmt = stmt.bind(contactId);
  const contact = await stmt.first();
  return c.json({ message: 'Lead converted successfully', data: { lead: { ...lead, status: 'converted' }, contact } });
});
