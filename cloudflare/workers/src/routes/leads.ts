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
  const countBindings = [...bindings];
  const countResult = await db.prepare(`SELECT COUNT(*) as total FROM leads ${whereClause}`).bind(...countBindings).first();
  const offset = (pagination.page - 1) * pagination.per_page;
  const queryBindings = [...bindings, pagination.per_page, offset];
  const result: any = await db.prepare(`SELECT * FROM leads ${whereClause} ORDER BY ${pagination.sort} ${pagination.order} LIMIT ? OFFSET ?`).bind(...queryBindings).all();
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

leadsRoutes.get('/:id', async (c) => {
  const { id } = c.req.param();
  const db = (c as any).env.DB as any;
  const lead = await db.prepare('SELECT * FROM leads WHERE id = ?').bind(id).first();
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
  await db.prepare(`INSERT INTO leads (id, source, status, first_name, last_name, company, email, phone, address, specialty, npi, taxonomy, owner_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
    id, validated.source || 'manual', validated.status || 'new', validated.first_name || null, validated.last_name || null, validated.company || null, validated.email || null, validated.phone || null, validated.address || null, validated.specialty || null, validated.npi || null, validated.taxonomy || null, user?.id
  ).run();
  if (validated.npi) {
    const scoreResult = await calculateLeadScore(c, validated);
    await db.prepare('UPDATE leads SET lead_score = ?, score_factors = ? WHERE id = ?').bind(scoreResult.score, JSON.stringify(scoreResult.factors), id).run();
  }
  await db.prepare('INSERT INTO audit_logs (user_id, action, table_name, record_id) VALUES (?, ?, ?, ?)').bind(user?.id, 'create', 'leads', id).run();
  const lead = await db.prepare('SELECT * FROM leads WHERE id = ?').bind(id).first();
  return c.json({ message: 'Lead created successfully', data: lead }, 201);
});

leadsRoutes.put('/:id', async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();
  const body = await c.req.json();
  const validated = updateLeadSchema.parse(body);
  const db = (c as any).env.DB as any;
  const existing = await db.prepare('SELECT * FROM leads WHERE id = ?').bind(id).first();
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
  await db.prepare(`UPDATE leads SET ${updates.join(', ')} WHERE id = ?`).bind(...bindings).run();
  if (validated.npi && validated.npi !== existing.npi) {
    const scoreResult = await calculateLeadScore(c, { ...existing, ...validated });
    await db.prepare('UPDATE leads SET lead_score = ?, score_factors = ? WHERE id = ?').bind(scoreResult.score, JSON.stringify(scoreResult.factors), id).run();
  }
  await db.prepare('INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values) VALUES (?, ?, ?, ?, ?, ?)').bind(user?.id, 'update', 'leads', id, JSON.stringify(existing), JSON.stringify(validated)).run();
  const lead = await db.prepare('SELECT * FROM leads WHERE id = ?').bind(id).first();
  return c.json({ message: 'Lead updated successfully', data: lead });
});

leadsRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();
  const db = (c as any).env.DB as any;
  const existing = await db.prepare('SELECT * FROM leads WHERE id = ?').bind(id).first();
  if (!existing) {
    throw new HTTPException(404, { message: 'Lead not found' });
  }
  await db.prepare('DELETE FROM leads WHERE id = ?').bind(id).run();
  await db.prepare('INSERT INTO audit_logs (user_id, action, table_name, record_id) VALUES (?, ?, ?, ?)').bind(user?.id, 'delete', 'leads', id).run();
  return c.json({ message: 'Lead deleted successfully' });
});

leadsRoutes.post('/:id/convert', async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();
  const db = (c as any).env.DB as any;
  const lead = await db.prepare('SELECT * FROM leads WHERE id = ?').bind(id).first();
  if (!lead) {
    throw new HTTPException(404, { message: 'Lead not found' });
  }
  if (lead.status === 'converted') {
    throw new HTTPException(400, { message: 'Lead already converted' });
  }
  const contactId = generateId();
  await db.prepare('INSERT INTO contacts (id, first_name, last_name, email, phone, address, company, owner_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(
    contactId, lead.first_name, lead.last_name, lead.email, lead.phone, lead.address, lead.company, user?.id
  ).run();
  await db.prepare('UPDATE leads SET status = ?, converted_to_contact_id = ? WHERE id = ?').bind('converted', contactId, id).run();
  await db.prepare('INSERT INTO audit_logs (user_id, action, table_name, record_id) VALUES (?, ?, ?, ?)').bind(user?.id, 'convert', 'leads', id).run();
  const contact = await db.prepare('SELECT * FROM contacts WHERE id = ?').bind(contactId).first();
  return c.json({ message: 'Lead converted successfully', data: { lead: { ...lead, status: 'converted' }, contact } });
});
