import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { createOrganizationSchema, updateOrganizationSchema, paginationSchema } from '../utils/validation';
import { generateId, calculatePagination } from '../utils/helpers';
import type { AppEnv } from '../types';

export const organizationsRoutes = new Hono<AppEnv>();

// List organizations
organizationsRoutes.get('/', async (c) => {
  const user = c.get('user');
  const query = c.req.query();

  const pagination = paginationSchema.parse({
    page: parseInt(query.page || '1'),
    per_page: parseInt(query.per_page || '20'),
    sort: query.sort || 'created_at',
    order: query.order || 'desc',
    search: query.search,
  });

  let whereClause = 'WHERE 1=1';
  const bindings: any[] = [];

  if (user?.role !== 'admin') {
    whereClause += ' AND owner_id = ?';
    bindings.push(user?.id);
  }

  if (pagination.search) {
    whereClause += ' AND (name LIKE ? OR industry LIKE ?)';
    bindings.push(`%${pagination.search}%`, `%${pagination.search}%`);
  }

  const db = (c as any).env.DB as any;
  let stmt: any = db.prepare(`SELECT COUNT(*) as total FROM organizations ${whereClause}`);
  for (const b of bindings) {
    stmt = stmt.bind(b);
  }
  const countResult = await stmt.first();
  const total = countResult?.total || 0;

  const offset = (pagination.page - 1) * pagination.per_page;
  stmt = db.prepare(`SELECT * FROM organizations ${whereClause} ORDER BY ${pagination.sort} ${pagination.order} LIMIT ? OFFSET ?`) as any;
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

// Get single organization
organizationsRoutes.get('/:id', async (c) => {
  const { id } = c.req.param();
  const db = (c as any).env.DB as any;
  let stmt: any = db.prepare('SELECT * FROM organizations WHERE id = ?');
  stmt = stmt.bind(id);
  const organization = await stmt.first();
  if (!organization) {
    throw new HTTPException(404, { message: 'Organization not found' });
  }
  return c.json({ data: organization });
});

// Create organization
organizationsRoutes.post('/', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const validated = createOrganizationSchema.parse(body);

  const id = generateId();
  const db = (c as any).env.DB as any;
  let stmt: any = db.prepare(`
    INSERT INTO organizations (id, name, type, industry, website, email, phone,
                              address, city, state, zip, employee_count, annual_revenue, owner_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt = stmt.bind(id);
  stmt = stmt.bind(validated.name);
  stmt = stmt.bind(validated.type || null);
  stmt = stmt.bind(validated.industry || null);
  stmt = stmt.bind(validated.website || null);
  stmt = stmt.bind(validated.email || null);
  stmt = stmt.bind(validated.phone || null);
  stmt = stmt.bind(validated.address || null);
  stmt = stmt.bind(validated.city || null);
  stmt = stmt.bind(validated.state || null);
  stmt = stmt.bind(validated.zip || null);
  stmt = stmt.bind(validated.employee_count || null);
  stmt = stmt.bind(validated.annual_revenue || null);
  stmt = stmt.bind(user?.id);
  await stmt.run();

  stmt = db.prepare(`INSERT INTO audit_logs (user_id, action, table_name, record_id) VALUES (?, ?, ?, ?)`) as any;
  stmt = stmt.bind(user?.id);
  stmt = stmt.bind('create');
  stmt = stmt.bind('organizations');
  stmt = stmt.bind(id);
  await stmt.run();

  stmt = db.prepare('SELECT * FROM organizations WHERE id = ?') as any;
  stmt = stmt.bind(id);
  const organization = await stmt.first();

  return c.json(
    {
      message: 'Organization created successfully',
      data: organization,
    },
    201
  );
});

// Update organization
organizationsRoutes.put('/:id', async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();
  const body = await c.req.json();
  const validated = updateOrganizationSchema.parse(body);

  const db = (c as any).env.DB as any;
  let existingStmt: any = db.prepare('SELECT * FROM organizations WHERE id = ?');
  existingStmt = existingStmt.bind(id);
  const existing = await existingStmt.first();
  if (!existing) {
    throw new HTTPException(404, { message: 'Organization not found' });
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

  updates.push('updated_at = CURRENT_TIMESTAMP');
  bindings.push(id);

  let stmt: any = db.prepare(`UPDATE organizations SET ${updates.join(', ')} WHERE id = ?`);
  for (const b of bindings) {
    stmt = stmt.bind(b);
  }
  await stmt.run();

  let auditStmt: any = db.prepare(`INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values) VALUES (?, ?, ?, ?, ?, ?)`);
  auditStmt = auditStmt.bind(user?.id);
  auditStmt = auditStmt.bind('update');
  auditStmt = auditStmt.bind('organizations');
  auditStmt = auditStmt.bind(id);
  auditStmt = auditStmt.bind(JSON.stringify(existing));
  auditStmt = auditStmt.bind(JSON.stringify(validated));
  await auditStmt.run();

  stmt = db.prepare('SELECT * FROM organizations WHERE id = ?') as any;
  stmt = stmt.bind(id);
  const organization = await stmt.first();

  return c.json({
    message: 'Organization updated successfully',
    data: organization,
  });
});

// Delete organization
organizationsRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();
  const db = (c as any).env.DB as any;

  let existingStmt: any = db.prepare('SELECT * FROM organizations WHERE id = ?');
  existingStmt = existingStmt.bind(id);
  const existing = await existingStmt.first();
  if (!existing) {
    throw new HTTPException(404, { message: 'Organization not found' });
  }

  let deleteStmt: any = db.prepare('DELETE FROM organizations WHERE id = ?');
  deleteStmt = deleteStmt.bind(id);
  await deleteStmt.run();

  let auditStmt: any = db.prepare(`INSERT INTO audit_logs (user_id, action, table_name, record_id) VALUES (?, ?, ?, ?)`);
  auditStmt = auditStmt.bind(user?.id);
  auditStmt = auditStmt.bind('delete');
  auditStmt = auditStmt.bind('organizations');
  auditStmt = auditStmt.bind(id);
  await auditStmt.run();

  return c.json({ message: 'Organization deleted successfully' });
});

// Get organization contacts
organizationsRoutes.get('/:id/contacts', async (c) => {
  const { id } = c.req.param();
  const db = (c as any).env.DB as any;
  let stmt: any = db.prepare('SELECT * FROM contacts WHERE organization_id = ? ORDER BY last_name ASC');
  stmt = stmt.bind(id);
  const contacts: any = await stmt.all();
  return c.json({
    data: contacts || [],
  });
});

// Get organization deals
organizationsRoutes.get('/:id/deals', async (c) => {
  const { id } = c.req.param();
  const db = (c as any).env.DB as any;
  let stmt: any = db.prepare('SELECT * FROM deals WHERE organization_id = ? ORDER BY created_at DESC');
  stmt = stmt.bind(id);
  const deals: any = await stmt.all();
  return c.json({
    data: deals || [],
  });
});
