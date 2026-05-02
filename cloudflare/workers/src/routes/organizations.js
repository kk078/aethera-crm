import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { createOrganizationSchema, updateOrganizationSchema, paginationSchema } from '../utils/validation';
import { generateId, calculatePagination } from '../utils/helpers';
export const organizationsRoutes = new Hono();
// List organizations
organizationsRoutes.get('/', async (c) => {
    try {
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
        if (user?.role !== 'admin') {
            whereClause += ' AND owner_id = ?';
            bindings.push(user?.id);
        }
        if (pagination.search) {
            whereClause += ' AND (name LIKE ? OR industry LIKE ?)';
            bindings.push(`%${pagination.search}%`, `%${pagination.search}%`);
        }
        const db = c.env.DB;
        const countBindings = [...bindings];
        const countResult = await db.prepare(`SELECT COUNT(*) as total FROM organizations ${whereClause}`).bind(...countBindings).first();
        const total = countResult?.total || 0;
        const offset = (pagination.page - 1) * pagination.per_page;
        const allBindings = [...bindings, pagination.per_page, offset];
        const result = await db.prepare(`SELECT * FROM organizations ${whereClause} ORDER BY ${pagination.sort} ${pagination.order} LIMIT ? OFFSET ?`).bind(...allBindings).all();
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
    }
    catch (error) {
        console.error('Error listing organizations:', error);
        return c.json({
            data: [],
            pagination: {
                page: 1,
                per_page: 20,
                total: 0,
                total_pages: 0,
                has_more: false,
            },
            error: error.message || 'Failed to fetch organizations',
        }, 500);
    }
});
// Get single organization
organizationsRoutes.get('/:id', async (c) => {
    try {
        const { id } = c.req.param();
        const db = c.env.DB;
        const organization = await db.prepare('SELECT * FROM organizations WHERE id = ?').bind(id).first();
        if (!organization) {
            throw new HTTPException(404, { message: 'Organization not found' });
        }
        return c.json({ data: organization });
    }
    catch (error) {
        console.error('Error getting organization:', error);
        return c.json({
            data: null,
            error: error.message || 'Failed to fetch organization',
        }, 500);
    }
});
// Create organization
organizationsRoutes.post('/', async (c) => {
    try {
        const user = c.get('user');
        const body = await c.req.json();
        const validated = createOrganizationSchema.parse(body);
        const id = generateId();
        const db = c.env.DB;
        await db.prepare(`
      INSERT INTO organizations (id, name, type, industry, website, email, phone,
                                address, city, state, zip, employee_count, annual_revenue, owner_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, validated.name, validated.type || null, validated.industry || null, validated.website || null, validated.email || null, validated.phone || null, validated.address || null, validated.city || null, validated.state || null, validated.zip || null, validated.employee_count || null, validated.annual_revenue || null, user?.id).run();
        await db.prepare(`INSERT INTO audit_logs (user_id, action, table_name, record_id) VALUES (?, ?, ?, ?)`).bind(user?.id, 'create', 'organizations', id).run();
        const organization = await db.prepare('SELECT * FROM organizations WHERE id = ?').bind(id).first();
        return c.json({
            message: 'Organization created successfully',
            data: organization,
        }, 201);
    }
    catch (error) {
        console.error('Error creating organization:', error);
        return c.json({
            message: 'Failed to create organization',
            data: null,
            error: error.message || 'Unknown error',
        }, 500);
    }
});
// Update organization
organizationsRoutes.put('/:id', async (c) => {
    try {
        const user = c.get('user');
        const { id } = c.req.param();
        const body = await c.req.json();
        const validated = updateOrganizationSchema.parse(body);
        const db = c.env.DB;
        const existing = await db.prepare('SELECT * FROM organizations WHERE id = ?').bind(id).first();
        if (!existing) {
            throw new HTTPException(404, { message: 'Organization not found' });
        }
        const updates = [];
        const bindings = [id];
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
        await db.prepare(`UPDATE organizations SET ${updates.join(', ')} WHERE id = ?`).bind(...bindings).run();
        await db.prepare(`INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values) VALUES (?, ?, ?, ?, ?, ?)`).bind(user?.id, 'update', 'organizations', id, JSON.stringify(existing), JSON.stringify(validated)).run();
        const organization = await db.prepare('SELECT * FROM organizations WHERE id = ?').bind(id).first();
        return c.json({
            message: 'Organization updated successfully',
            data: organization,
        });
    }
    catch (error) {
        console.error('Error updating organization:', error);
        return c.json({
            message: 'Failed to update organization',
            data: null,
            error: error.message || 'Unknown error',
        }, 500);
    }
});
// Delete organization
organizationsRoutes.delete('/:id', async (c) => {
    try {
        const user = c.get('user');
        const { id } = c.req.param();
        const db = c.env.DB;
        const existing = await db.prepare('SELECT * FROM organizations WHERE id = ?').bind(id).first();
        if (!existing) {
            throw new HTTPException(404, { message: 'Organization not found' });
        }
        await db.prepare('DELETE FROM organizations WHERE id = ?').bind(id).run();
        await db.prepare(`INSERT INTO audit_logs (user_id, action, table_name, record_id) VALUES (?, ?, ?, ?)`).bind(user?.id, 'delete', 'organizations', id).run();
        return c.json({ message: 'Organization deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting organization:', error);
        return c.json({
            message: 'Failed to delete organization',
            error: error.message || 'Unknown error',
        }, 500);
    }
});
// Get organization contacts
organizationsRoutes.get('/:id/contacts', async (c) => {
    try {
        const { id } = c.req.param();
        const db = c.env.DB;
        const contacts = await db.prepare('SELECT * FROM contacts WHERE organization_id = ? ORDER BY last_name ASC').bind(id).all();
        return c.json({
            data: contacts.results || [],
        });
    }
    catch (error) {
        console.error('Error getting organization contacts:', error);
        return c.json({
            data: [],
            error: error.message || 'Failed to fetch contacts',
        }, 500);
    }
});
// Get organization deals
organizationsRoutes.get('/:id/deals', async (c) => {
    try {
        const { id } = c.req.param();
        const db = c.env.DB;
        const deals = await db.prepare('SELECT * FROM deals WHERE organization_id = ? ORDER BY created_at DESC').bind(id).all();
        return c.json({
            data: deals.results || [],
        });
    }
    catch (error) {
        console.error('Error getting organization deals:', error);
        return c.json({
            data: [],
            error: error.message || 'Failed to fetch deals',
        }, 500);
    }
});
