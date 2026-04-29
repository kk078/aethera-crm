import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { createContactSchema, updateContactSchema, paginationSchema } from '../utils/validation';
import { generateId, calculatePagination } from '../utils/helpers';
export const contactsRoutes = new Hono();
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
    const bindings = [];
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
    const db = c.env.DB;
    let stmt = db.prepare(`SELECT COUNT(*) as total FROM contacts ${whereClause}`);
    for (const b of bindings) {
        stmt = stmt.bind(b);
    }
    const countResult = await stmt.first();
    const total = countResult?.total || 0;
    // Get paginated results
    const offset = (pagination.page - 1) * pagination.per_page;
    stmt = db.prepare(`
    SELECT c.*, o.name as organization_name
    FROM contacts c
    LEFT JOIN organizations o ON c.organization_id = o.id
    ${whereClause}
    ORDER BY c.${pagination.sort} ${pagination.order}
    LIMIT ? OFFSET ?
  `);
    for (const b of bindings) {
        stmt = stmt.bind(b);
    }
    stmt = stmt.bind(pagination.per_page);
    stmt = stmt.bind(offset);
    const results = await stmt.all();
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
// Get single contact
contactsRoutes.get('/:id', async (c) => {
    const { id } = c.req.param();
    const db = c.env.DB;
    let stmt = db.prepare(`SELECT c.*, o.name as organization_name FROM contacts c LEFT JOIN organizations o ON c.organization_id = o.id WHERE c.id = ?`);
    stmt = stmt.bind(id);
    const contact = await stmt.first();
    if (!contact) {
        throw new HTTPException(404, { message: 'Contact not found' });
    }
    return c.json({ data: contact });
});
// Create contact
contactsRoutes.post('/', async (c) => {
    const user = c.get('user');
    const body = await c.req.json();
    const validated = createContactSchema.parse(body);
    const id = generateId();
    const db = c.env.DB;
    let stmt = db.prepare(`
    INSERT INTO contacts (id, first_name, last_name, email, phone, organization_id, title, owner_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
    stmt = stmt.bind(id);
    stmt = stmt.bind(validated.first_name);
    stmt = stmt.bind(validated.last_name || null);
    stmt = stmt.bind(validated.email || null);
    stmt = stmt.bind(validated.phone || null);
    stmt = stmt.bind(validated.organization_id || null);
    stmt = stmt.bind(validated.title || null);
    stmt = stmt.bind(user?.id);
    await stmt.run();
    stmt = db.prepare(`INSERT INTO audit_logs (user_id, action, table_name, record_id) VALUES (?, ?, ?, ?)`);
    stmt = stmt.bind(user?.id);
    stmt = stmt.bind('create');
    stmt = stmt.bind('contacts');
    stmt = stmt.bind(id);
    await stmt.run();
    stmt = db.prepare(`SELECT c.*, o.name as organization_name FROM contacts c LEFT JOIN organizations o ON c.organization_id = o.id WHERE c.id = ?`);
    stmt = stmt.bind(id);
    const contact = await stmt.first();
    return c.json({
        message: 'Contact created successfully',
        data: contact,
    }, 201);
});
// Update contact
contactsRoutes.put('/:id', async (c) => {
    const user = c.get('user');
    const { id } = c.req.param();
    const body = await c.req.json();
    const validated = updateContactSchema.parse(body);
    const db = c.env.DB;
    let existingStmt = db.prepare('SELECT * FROM contacts WHERE id = ?');
    existingStmt = existingStmt.bind(id);
    const existing = await existingStmt.first();
    if (!existing) {
        throw new HTTPException(404, { message: 'Contact not found' });
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
    updates.push('updated_at = CURRENT_TIMESTAMP');
    bindings.push(id);
    let stmt = db.prepare(`UPDATE contacts SET ${updates.join(', ')} WHERE id = ?`);
    for (const b of bindings) {
        stmt = stmt.bind(b);
    }
    await stmt.run();
    let contactStmt = db.prepare(`SELECT c.*, o.name as organization_name FROM contacts c LEFT JOIN organizations o ON c.organization_id = o.id WHERE c.id = ?`);
    contactStmt = contactStmt.bind(id);
    const contact = await contactStmt.first();
    return c.json({
        message: 'Contact updated successfully',
        data: contact,
    });
});
// Delete contact
contactsRoutes.delete('/:id', async (c) => {
    const user = c.get('user');
    const { id } = c.req.param();
    const db = c.env.DB;
    let existingStmt = db.prepare('SELECT * FROM contacts WHERE id = ?');
    existingStmt = existingStmt.bind(id);
    const existing = await existingStmt.first();
    if (!existing) {
        throw new HTTPException(404, { message: 'Contact not found' });
    }
    let deleteStmt = db.prepare('DELETE FROM contacts WHERE id = ?');
    deleteStmt = deleteStmt.bind(id);
    await deleteStmt.run();
    let auditStmt = db.prepare(`INSERT INTO audit_logs (user_id, action, table_name, record_id) VALUES (?, ?, ?, ?)`);
    auditStmt = auditStmt.bind(user?.id);
    auditStmt = auditStmt.bind('delete');
    auditStmt = auditStmt.bind('contacts');
    auditStmt = auditStmt.bind(id);
    await auditStmt.run();
    return c.json({ message: 'Contact deleted successfully' });
});
