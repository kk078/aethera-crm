import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { createContactSchema, updateContactSchema, paginationSchema } from '../utils/validation';
import { generateId, calculatePagination, safeD1QuerySchemaAware, safeD1Execute } from '../utils/helpers';
import type { AppEnv } from '../types';

export const contactsRoutes = new Hono<AppEnv>();

// List contacts with pagination and filtering
contactsRoutes.get('/', async (c) => {
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

  // Filter by owner
  if (user?.role !== 'admin') {
    whereClause += ' AND owner_id = ?';
    bindings.push(user?.id);
  }

  // Search filter
  if (pagination.search) {
    whereClause += ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)';
    bindings.push(`%${pagination.search}%`, `%${pagination.search}%`, `%${pagination.search}%`);
  }

  const db = (c as any).env.DB as any;

  // Get total count
  const countResult = await safeD1QuerySchemaAware<{ total: number }>(
    db,
    `SELECT COUNT(*) as total FROM contacts ${whereClause}`,
    [...bindings]
  );

  if (countResult.tableMissing) {
    return c.json({
      data: [{ id: '0', first_name: 'System', last_name: 'Syncing...', email: '', phone: '', organization_id: null, title: '', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }],
      pagination: {
        page: pagination.page,
        per_page: pagination.per_page,
        total: 0,
        total_pages: 0,
        has_more: false,
      },
      status: 'migration_pending',
    });
  }

  const total = countResult.data[0]?.total || 0;

  // Get paginated results
  const offset = (pagination.page - 1) * pagination.per_page;
  const allBindings = [...bindings, pagination.per_page, offset];
  const queryResult = await safeD1QuerySchemaAware<any>(
    db,
    `
    SELECT c.*, o.name as organization_name
    FROM contacts c
    LEFT JOIN organizations o ON c.organization_id = o.id
    ${whereClause}
    ORDER BY c.${pagination.sort} ${pagination.order}
    LIMIT ? OFFSET ?
    `,
    allBindings
  );

  if (queryResult.tableMissing) {
    return c.json({
      data: [{ id: '0', first_name: 'System', last_name: 'Syncing...', email: '', phone: '', organization_id: null, title: '', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }],
      pagination: {
        page: pagination.page,
        per_page: pagination.per_page,
        total: 0,
        total_pages: 0,
        has_more: false,
      },
      status: 'migration_pending',
    });
  }

  const results = queryResult.data;

  const paginationInfo = calculatePagination(pagination.page, pagination.per_page, total);

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
});

// Get single contact
contactsRoutes.get('/:id', async (c) => {
  const { id } = c.req.param();
  const db = (c as any).env.DB as any;
  const result = await safeD1QuerySchemaAware<any>(
    db,
    `SELECT c.*, o.name as organization_name FROM contacts c LEFT JOIN organizations o ON c.organization_id = o.id WHERE c.id = ?`,
    [id]
  );

  if (result.tableMissing) {
    return c.json({
      data: { id: '0', first_name: 'System', last_name: 'Syncing...', email: '', phone: '', organization_id: null, title: '', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      status: 'migration_pending',
    });
  }

  if (!result.data[0]) {
    return c.json({
      data: null,
      error: 'Contact not found',
    }, 200);
  }
  return c.json({ data: result.data[0] });
});

// Create contact
contactsRoutes.post('/', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const validated = createContactSchema.parse(body);

  const id = generateId();
  const db = (c as any).env.DB as any;

  // Check if table exists first
  const tableCheck = await safeD1QuerySchemaAware<{ name: string }>(db, "SELECT name FROM sqlite_master WHERE type='table' AND name='contacts'", []);
  if (tableCheck.tableMissing) {
    return c.json({
      message: 'Database migration pending',
      data: null,
      status: 'migration_pending',
    }, 200);
  }

  await safeD1Execute(
    db,
    `
    INSERT INTO contacts (id, first_name, last_name, email, phone, organization_id, title, owner_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [id, validated.first_name, validated.last_name || null, validated.email || null, validated.phone || null, validated.organization_id || null, validated.title || null, user?.id]
  );

  await db.prepare(`INSERT INTO audit_logs (user_id, action, table_name, record_id) VALUES (?, ?, ?, ?)`).bind(user?.id, 'create', 'contacts', id).run();

  const contactResult = await safeD1QuerySchemaAware<any>(
    db,
    `SELECT c.*, o.name as organization_name FROM contacts c LEFT JOIN organizations o ON c.organization_id = o.id WHERE c.id = ?`,
    [id]
  );

  return c.json(
    {
      message: 'Contact created successfully',
      data: contactResult.data[0] || { id },
    },
    201
  );
});

// Update contact
contactsRoutes.put('/:id', async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();
  const body = await c.req.json();
  const validated = updateContactSchema.parse(body);

  const db = (c as any).env.DB as any;

  // Check if table exists first
  const tableCheck = await safeD1QuerySchemaAware<{ name: string }>(db, "SELECT name FROM sqlite_master WHERE type='table' AND name='contacts'", []);
  if (tableCheck.tableMissing) {
    return c.json({
      message: 'Database migration pending',
      data: null,
      status: 'migration_pending',
    }, 200);
  }

  const existingResult = await safeD1QuerySchemaAware<any>(db, 'SELECT * FROM contacts WHERE id = ?', [id]);
  if (existingResult.tableMissing || !existingResult.data[0]) {
    return c.json({
      message: 'Contact not found',
      data: null,
    }, 200);
  }

  const updates: string[] = [];
  const bindings: any[] = [id];

  for (const [key, value] of Object.entries(validated)) {
    if (value !== undefined) {
      updates.push(`${key} = ?`);
      bindings.push(value);
    }
  }

  if (updates.length === 0) {
    return c.json({
      message: 'No fields to update',
      data: null,
    }, 200);
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  await safeD1Execute(db, `UPDATE contacts SET ${updates.join(', ')} WHERE id = ?`, bindings);

  const contactResult = await safeD1QuerySchemaAware<any>(
    db,
    `SELECT c.*, o.name as organization_name FROM contacts c LEFT JOIN organizations o ON c.organization_id = o.id WHERE c.id = ?`,
    [id]
  );

  return c.json({
    message: 'Contact updated successfully',
    data: contactResult.data[0],
  });
});

// Delete contact
contactsRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();
  const db = (c as any).env.DB as any;

  // Check if table exists first
  const tableCheck = await safeD1QuerySchemaAware<{ name: string }>(db, "SELECT name FROM sqlite_master WHERE type='table' AND name='contacts'", []);
  if (tableCheck.tableMissing) {
    return c.json({
      message: 'Database migration pending',
      status: 'migration_pending',
    }, 200);
  }

  const existingResult = await safeD1QuerySchemaAware<any>(db, 'SELECT * FROM contacts WHERE id = ?', [id]);
  if (!existingResult.data[0]) {
    return c.json({
      message: 'Contact not found',
    }, 200);
  }

  await safeD1Execute(db, 'DELETE FROM contacts WHERE id = ?', [id]);
  await safeD1Execute(db, `INSERT INTO audit_logs (user_id, action, table_name, record_id) VALUES (?, ?, ?, ?)`, [user?.id, 'delete', 'contacts', id]);

  return c.json({ message: 'Contact deleted successfully' });
});
