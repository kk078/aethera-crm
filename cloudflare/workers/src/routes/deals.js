import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { createDealSchema, updateDealSchema, paginationSchema } from '../utils/validation';
import { generateId, calculatePagination, formatCurrency } from '../utils/helpers';
export const dealsRoutes = new Hono();
dealsRoutes.get('/', async (c) => {
    const user = c.get('user');
    const query = c.req.query();
    const pagination = paginationSchema.parse({
        page: parseInt(query.page || '1'),
        per_page: parseInt(query.per_page || '20'),
        sort: query.sort || 'created_at',
        order: query.order || 'desc',
        search: query.search,
        pipeline_stage: query.pipeline_stage,
        onboarding_stage: query.onboarding_stage,
    });
    let whereClause = 'WHERE 1=1';
    const bindings = [];
    if (user?.role !== 'admin') {
        whereClause += ' AND owner_id = ?';
        bindings.push(user?.id);
    }
    if (pagination.pipeline_stage) {
        whereClause += ' AND pipeline_stage = ?';
        bindings.push(pagination.pipeline_stage);
    }
    if (pagination.onboarding_stage) {
        whereClause += ' AND onboarding_stage = ?';
        bindings.push(pagination.onboarding_stage);
    }
    if (pagination.search) {
        whereClause += ' AND name LIKE ?';
        bindings.push('%' + pagination.search + '%');
    }
    const db = c.env.DB;
    const countBindings = [...bindings];
    const countResult = await db.prepare(`SELECT COUNT(*) as total FROM deals ${whereClause}`).bind(...countBindings).first();
    const offset = (pagination.page - 1) * pagination.per_page;
    const queryBindings = [...bindings, pagination.per_page, offset];
    const result = await db.prepare(`SELECT d.*, c.first_name, c.last_name, o.name as organization_name, p.first_name as provider_first, p.last_name as provider_last, p.organization_name as provider_organization FROM deals d LEFT JOIN contacts c ON d.contact_id = c.id LEFT JOIN organizations o ON d.organization_id = o.id LEFT JOIN npi_providers p ON d.provider_id = p.id ${whereClause} ORDER BY ${pagination.sort} ${pagination.order} LIMIT ? OFFSET ?`).bind(...queryBindings).all();
    const results = result.results || [];
    const paginationInfo = calculatePagination(pagination.page, pagination.per_page, countResult?.total || 0);
    const formattedDeals = (results || []).map((deal) => ({
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
    const bindings = [];
    if (user?.role !== 'admin') {
        whereClause += ' AND owner_id = ?';
        bindings.push(user?.id);
    }
    const db = c.env.DB;
    const pipelineBindings = [...bindings];
    const result = await db.prepare(`SELECT pipeline_stage, COUNT(*) as count, SUM(amount) as total_amount, AVG(probability) as avg_probability FROM deals ${whereClause} GROUP BY pipeline_stage ORDER BY pipeline_stage`).bind(...pipelineBindings).all();
    const pipeline = result.results || [];
    // Onboarding stage overview
    const onboardingResult = await db.prepare(`SELECT onboarding_stage, COUNT(*) as count FROM deals ${whereClause} GROUP BY onboarding_stage ORDER BY onboarding_stage`).bind(...pipelineBindings).all();
    return c.json({ data: { pipeline, onboarding: onboardingResult.results || [] } });
});
dealsRoutes.get('/:id', async (c) => {
    const { id } = c.req.param();
    const db = c.env.DB;
    const deal = await db.prepare(`SELECT d.*, c.first_name, c.last_name, c.email as contact_email, o.name as organization_name, o.type as organization_type, p.first_name as provider_first, p.last_name as provider_last, p.organization_name as provider_organization FROM deals d LEFT JOIN contacts c ON d.contact_id = c.id LEFT JOIN organizations o ON d.organization_id = o.id LEFT JOIN npi_providers p ON d.provider_id = p.id WHERE d.id = ?`).bind(id).first();
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
    const db = c.env.DB;
    const pipelineStage = validated.pipeline_stage || 'qualified';
    const onboardingStage = validated.onboarding_stage || 'initial';
    await db.prepare(`INSERT INTO deals (id, contact_id, organization_id, provider_id, name, pipeline_stage, onboarding_stage, stage, amount, probability, expected_close_date, owner_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(id, validated.contact_id || null, validated.organization_id || null, validated.provider_id || null, validated.name, pipelineStage, onboardingStage, validated.stage || pipelineStage, validated.amount || null, validated.probability || null, validated.expected_close_date || null, user?.id).run();
    await db.prepare(`INSERT INTO audit_logs (user_id, action, table_name, record_id) VALUES (?, ?, ?, ?)`).bind(user?.id, 'create', 'deals', id).run();
    const deal = await db.prepare(`SELECT d.*, c.first_name, c.last_name, o.name as organization_name, p.first_name as provider_first, p.last_name as provider_last FROM deals d LEFT JOIN contacts c ON d.contact_id = c.id LEFT JOIN organizations o ON d.organization_id = o.id LEFT JOIN npi_providers p ON d.provider_id = p.id WHERE d.id = ?`).bind(id).first();
    return c.json({ message: 'Deal created successfully', data: deal }, 201);
});
dealsRoutes.put('/:id', async (c) => {
    const user = c.get('user');
    const { id } = c.req.param();
    const body = await c.req.json();
    const validated = updateDealSchema.parse(body);
    const db = c.env.DB;
    const existing = await db.prepare('SELECT * FROM deals WHERE id = ?').bind(id).first();
    if (!existing) {
        throw new HTTPException(404, { message: 'Deal not found' });
    }
    const updates = [];
    const bindings = [];
    for (const [key, value] of Object.entries(validated)) {
        if (value !== undefined) {
            updates.push(key + ' = ?');
            bindings.push(value);
        }
    }
    if (updates.length === 0) {
        throw new HTTPException(400, { message: 'No fields to update' });
    }
    if ((validated.pipeline_stage && validated.pipeline_stage !== existing.pipeline_stage) ||
        (validated.onboarding_stage && validated.onboarding_stage !== existing.onboarding_stage)) {
        updates.push('updated_at = CURRENT_TIMESTAMP');
    }
    updates.push('updated_at = CURRENT_TIMESTAMP');
    bindings.push(id);
    await db.prepare(`UPDATE deals SET ${updates.join(', ')} WHERE id = ?`).bind(...bindings).run();
    const deal = await db.prepare(`SELECT d.*, c.first_name, c.last_name, o.name as organization_name, p.first_name as provider_first, p.last_name as provider_last FROM deals d LEFT JOIN contacts c ON d.contact_id = c.id LEFT JOIN organizations o ON d.organization_id = o.id LEFT JOIN npi_providers p ON d.provider_id = p.id WHERE d.id = ?`).bind(id).first();
    return c.json({ message: 'Deal updated successfully', data: deal });
});
dealsRoutes.delete('/:id', async (c) => {
    const user = c.get('user');
    const { id } = c.req.param();
    const db = c.env.DB;
    const existing = await db.prepare('SELECT * FROM deals WHERE id = ?').bind(id).first();
    if (!existing) {
        throw new HTTPException(404, { message: 'Deal not found' });
    }
    await db.prepare('DELETE FROM deals WHERE id = ?').bind(id).run();
    await db.prepare(`INSERT INTO audit_logs (user_id, action, table_name, record_id) VALUES (?, ?, ?, ?)`).bind(user?.id, 'delete', 'deals', id).run();
    return c.json({ message: 'Deal deleted successfully' });
});
// ───── RCM Pipeline Endpoints ─────
// Get all deals grouped by pipeline stage (Kanban board)
dealsRoutes.get('/pipeline/stages', async (c) => {
    const user = c.get('user');
    const db = c.env.DB;
    const stages = ['qualified', 'proposal_sent', 'contract_signed', 'credentialing', 'technical_setup', 'active', 'closed'];
    const result = {};
    for (const stage of stages) {
        const whereClause = user?.role !== 'admin' ? 'WHERE d.pipeline_stage = ? AND d.owner_id = ?' : 'WHERE d.pipeline_stage = ?';
        const dealResult = await db.prepare(`
      SELECT d.*, p.first_name, p.last_name, p.organization_name
      FROM deals d
      LEFT JOIN npi_providers p ON d.provider_id = p.id
      ${whereClause}
      ORDER BY d.created_at DESC
    `).bind(stage, user?.id).all();
        result[stage] = dealResult.results || [];
    }
    return c.json({ data: result });
});
// Move deal to a different pipeline stage with task automation
dealsRoutes.patch('/:id/pipeline', async (c) => {
    const user = c.get('user');
    const { id } = c.req.param();
    const body = await c.req.json();
    const { pipeline_stage, onboarding_stage } = body;
    const db = c.env.DB;
    const existing = await db.prepare('SELECT * FROM deals WHERE id = ?').bind(id).first();
    if (!existing) {
        throw new HTTPException(404, { message: 'Deal not found' });
    }
    const updates = ['updated_at = CURRENT_TIMESTAMP'];
    const bindings = [id];
    let stageChanged = false;
    if (pipeline_stage !== undefined && pipeline_stage !== existing.pipeline_stage) {
        updates.push('pipeline_stage = ?');
        bindings.push(pipeline_stage);
        stageChanged = true;
    }
    if (onboarding_stage !== undefined && onboarding_stage !== existing.onboarding_stage) {
        updates.push('onboarding_stage = ?');
        bindings.push(onboarding_stage);
        stageChanged = true;
    }
    await db.prepare(`UPDATE deals SET ${updates.join(', ')} WHERE id = ?`).bind(...bindings).run();
    // Create follow-up task if stage changed
    if (stageChanged) {
        await createFollowUpTask(db, existing, pipeline_stage || existing.pipeline_stage, user?.id);
        // Create technical setup tasks when moving to technical_setup stage
        if (pipeline_stage === 'technical_setup') {
            await createTechnicalSetupTasks(db, existing, user?.id);
        }
        // Create credentialing audit task when moving to contracting stage
        if (pipeline_stage === 'contract_signed' || pipeline_stage === 'credentialing') {
            await createCredentialingAuditTask(db, existing, user?.id);
        }
    }
    const deal = await db.prepare('SELECT d.*, p.first_name, p.last_name, p.organization_name FROM deals d LEFT JOIN npi_providers p ON d.provider_id = p.id WHERE d.id = ?').bind(id).first();
    return c.json({ message: 'Pipeline stage updated', data: deal });
});
// Get pipeline summary with counts
dealsRoutes.get('/pipeline/summary', async (c) => {
    const user = c.get('user');
    const db = c.env.DB;
    let whereClause = 'WHERE 1=1';
    const bindings = [];
    if (user?.role !== 'admin') {
        whereClause += ' AND owner_id = ?';
        bindings.push(user?.id);
    }
    const counts = {};
    const stages = ['qualified', 'proposal_sent', 'contract_signed', 'credentialing', 'technical_setup', 'active', 'closed'];
    const pipelineBindings = [...bindings];
    for (const stage of stages) {
        const result = await db.prepare(`SELECT COUNT(*) as count FROM deals ${whereClause} AND pipeline_stage = ?`).bind(...pipelineBindings, stage).first();
        counts[stage] = result?.count || 0;
    }
    // Get onboarding stage counts
    const onboardingCounts = {};
    const onboardingStages = ['initial', 'legal', 'credentialing', 'technical', 'complete'];
    for (const stage of onboardingStages) {
        const result = await db.prepare(`SELECT COUNT(*) as count FROM deals ${whereClause} AND onboarding_stage = ?`).bind(...pipelineBindings, stage).first();
        onboardingCounts[stage] = result?.count || 0;
    }
    return c.json({ pipeline: counts, onboarding: onboardingCounts });
});
// Get all deals for a specific provider
dealsRoutes.get('/provider/:providerId', async (c) => {
    const { providerId } = c.req.param();
    const db = c.env.DB;
    const result = await db.prepare(`SELECT d.*, c.first_name, c.last_name, o.name as organization_name FROM deals d LEFT JOIN contacts c ON d.contact_id = c.id LEFT JOIN organizations o ON d.organization_id = o.id WHERE d.provider_id = ? ORDER BY d.created_at DESC`).bind(providerId).all();
    const deals = result.results || [];
    // Get onboarding checklist for this provider's deals
    const checklistResult = await db.prepare(`
    SELECT oc.*, d.id as deal_id, d.name as deal_name
    FROM onboarding_checklists oc
    JOIN deals d ON oc.deal_id = d.id
    WHERE oc.provider_id = ?
  `).bind(providerId).all();
    const checklists = checklistResult.results || [];
    return c.json({ deals, checklists });
});
dealsRoutes.get('/:id/activities', async (c) => {
    const { id } = c.req.param();
    const db = c.env.DB;
    const activities = await db.prepare('SELECT * FROM activities WHERE deal_id = ? ORDER BY created_at DESC LIMIT 50').bind(id).all();
    return c.json({ data: activities.results || [] });
});
const createFollowUpTask = async (db, deal, newStage, userId) => {
    // Task configurations based on pipeline stage
    const taskConfig = {
        proposal_sent: { title: 'Follow up on proposal - ask for feedback', days: 3, priority: 'high' },
        contract_signed: { title: 'Schedule contract review meeting', days: 2, priority: 'high' },
        credentialing: { title: 'Verify credentialing status with payer', days: 5, priority: 'medium' },
        technical_setup: { title: 'Confirm EDI/ERA setup progress', days: 7, priority: 'medium' },
    };
    const config = taskConfig[newStage];
    if (!config)
        return;
    const taskId = generateId();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + config.days);
    await db.prepare(`
    INSERT INTO tasks (id, title, description, status, priority, due_date, related_type, related_id, owner_id)
    VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?)
  `).bind(taskId, config.title, `Auto-generated follow-up for deal: ${deal.name}`, config.priority, dueDate.toISOString().split('T')[0], 'deal', deal.id, userId).run();
};
// Create technical setup tasks when moving to Technical Setup stage
const createTechnicalSetupTasks = async (db, deal, userId) => {
    const tasks = [
        { title: 'Verify CAQH Profile', description: 'Confirm provider CAQH profile is complete and up to date', days: 3, priority: 'high' },
        { title: 'Submit EDI to Availity', description: 'Submit EDI enrollment forms to Availity for claims processing', days: 5, priority: 'high' },
        { title: 'Test ERA Posting', description: 'Verify ERA files are being received and posted correctly', days: 7, priority: 'medium' },
    ];
    for (const task of tasks) {
        const taskId = generateId();
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + task.days);
        await db.prepare(`
      INSERT INTO tasks (id, title, description, status, priority, due_date, related_type, related_id, owner_id)
      VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?)
    `).bind(taskId, task.title, task.description, task.priority, dueDate.toISOString().split('T')[0], 'deal', deal.id, userId).run();
    }
};
// Create credentialing audit task for Contracting stage
const createCredentialingAuditTask = async (db, deal, userId) => {
    const taskId = generateId();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7); // 7 days to complete audit
    await db.prepare(`
    INSERT INTO tasks (id, title, description, status, priority, due_date, related_type, related_id, owner_id)
    VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?)
  `).bind(taskId, 'Credentialing Audit', `Complete credentialing audit for provider: ${deal.name}`, 'high', dueDate.toISOString().split('T')[0], 'deal_audits', deal.id, userId).run();
};
