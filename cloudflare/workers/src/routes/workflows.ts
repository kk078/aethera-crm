import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { createWorkflowSchema, updateWorkflowSchema, paginationSchema } from '../utils/validation';
import { generateId, calculatePagination } from '../utils/helpers';
import type { AppEnv } from '../types';

export const workflowsRoutes = new Hono<AppEnv>();

// List workflows
workflowsRoutes.get('/', async (c) => {
  const user = c.get('user');
  const query = c.req.query();

  const pagination = paginationSchema.parse({
    page: parseInt(query.page || '1'),
    per_page: parseInt(query.per_page || '20'),
    sort: query.sort || 'created_at',
    order: query.order || 'desc',
  });

  let whereClause = 'WHERE 1=1';
  const bindings: any[] = [];

  if (user?.role !== 'admin') {
    whereClause += ' AND owner_id = ?';
    bindings.push(user?.id);
  }

  const db = (c as any).env.DB as any;
  let stmt: any = db.prepare(`SELECT COUNT(*) as total FROM workflows ${whereClause}`);
  for (const b of bindings) {
    stmt = stmt.bind(b);
  }
  const countResult = await stmt.first();
  const total = countResult?.total || 0;

  const offset = (pagination.page - 1) * pagination.per_page;
  stmt = db.prepare(`SELECT * FROM workflows ${whereClause} ORDER BY ${pagination.sort} ${pagination.order} LIMIT ? OFFSET ?`) as any;
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

// Get single workflow
workflowsRoutes.get('/:id', async (c) => {
  const { id } = c.req.param();
  const db = (c as any).env.DB as any;
  let stmt: any = db.prepare('SELECT * FROM workflows WHERE id = ?');
  stmt = stmt.bind(id);
  const workflow = await stmt.first();
  if (!workflow) {
    throw new HTTPException(404, { message: 'Workflow not found' });
  }
  return c.json({ data: workflow });
});

// Create workflow
workflowsRoutes.post('/', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const validated = createWorkflowSchema.parse(body);

  const id = generateId();
  const db = (c as any).env.DB as any;
  let stmt: any = db.prepare(`
    INSERT INTO workflows (id, name, description, trigger_type, trigger_config, nodes, owner_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt = stmt.bind(id);
  stmt = stmt.bind(validated.name);
  stmt = stmt.bind(validated.description || null);
  stmt = stmt.bind(validated.trigger_type);
  stmt = stmt.bind(validated.trigger_config);
  stmt = stmt.bind(validated.nodes);
  stmt = stmt.bind(user?.id);
  await stmt.run();

  stmt = db.prepare(`INSERT INTO audit_logs (user_id, action, table_name, record_id) VALUES (?, ?, ?, ?)`) as any;
  stmt = stmt.bind(user?.id);
  stmt = stmt.bind('create');
  stmt = stmt.bind('workflows');
  stmt = stmt.bind(id);
  await stmt.run();

  stmt = db.prepare('SELECT * FROM workflows WHERE id = ?') as any;
  stmt = stmt.bind(id);
  const workflow = await stmt.first();

  return c.json(
    {
      message: 'Workflow created successfully',
      data: workflow,
    },
    201
  );
});

// Update workflow
workflowsRoutes.put('/:id', async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();
  const body = await c.req.json();
  const validated = updateWorkflowSchema.parse(body);

  const db = (c as any).env.DB as any;
  let existingStmt: any = db.prepare('SELECT * FROM workflows WHERE id = ?');
  existingStmt = existingStmt.bind(id);
  const existing = await existingStmt.first();
  if (!existing) {
    throw new HTTPException(404, { message: 'Workflow not found' });
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

  let stmt: any = db.prepare(`UPDATE workflows SET ${updates.join(', ')} WHERE id = ?`);
  for (const b of bindings) {
    stmt = stmt.bind(b);
  }
  await stmt.run();

  stmt = db.prepare('SELECT * FROM workflows WHERE id = ?') as any;
  stmt = stmt.bind(id);
  const workflow = await stmt.first();

  return c.json({
    message: 'Workflow updated successfully',
    data: workflow,
  });
});

// Delete workflow
workflowsRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();
  const db = (c as any).env.DB as any;

  let existingStmt: any = db.prepare('SELECT * FROM workflows WHERE id = ?');
  existingStmt = existingStmt.bind(id);
  const existing = await existingStmt.first();
  if (!existing) {
    throw new HTTPException(404, { message: 'Workflow not found' });
  }

  let deleteStmt: any = db.prepare('DELETE FROM workflows WHERE id = ?');
  deleteStmt = deleteStmt.bind(id);
  await deleteStmt.run();

  let auditStmt: any = db.prepare(`INSERT INTO audit_logs (user_id, action, table_name, record_id) VALUES (?, ?, ?, ?)`);
  auditStmt = auditStmt.bind(user?.id);
  auditStmt = auditStmt.bind('delete');
  auditStmt = auditStmt.bind('workflows');
  auditStmt = auditStmt.bind(id);
  await auditStmt.run();

  return c.json({ message: 'Workflow deleted successfully' });
});

// Toggle workflow active status
workflowsRoutes.patch('/:id/toggle', async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();
  const db = (c as any).env.DB as any;
  let stmt: any = db.prepare('SELECT * FROM workflows WHERE id = ?');
  stmt = stmt.bind(id);
  const workflow = await stmt.first();
  if (!workflow) {
    throw new HTTPException(404, { message: 'Workflow not found' });
  }

  const newStatus = workflow.is_active ? 0 : 1;

  stmt = db.prepare(`
    UPDATE workflows
    SET is_active = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `) as any;
  stmt = stmt.bind(newStatus);
  stmt = stmt.bind(id);
  await stmt.run();

  return c.json({
    message: `Workflow ${newStatus ? 'activated' : 'deactivated'} successfully`,
    data: { id, is_active: newStatus },
  });
});

// Trigger workflow manually
workflowsRoutes.post('/:id/trigger', async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();
  const body = await c.req.json();
  const { payload } = body;

  const db = (c as any).env.DB as any;
  let stmt: any = db.prepare('SELECT * FROM workflows WHERE id = ?');
  stmt = stmt.bind(id);
  const workflow = await stmt.first();
  if (!workflow) {
    throw new HTTPException(404, { message: 'Workflow not found' });
  }

  if (!workflow.is_active) {
    throw new HTTPException(400, { message: 'Workflow is not active' });
  }

  // Send to n8n webhook
  try {
    const triggerConfig = JSON.parse(workflow.trigger_config);
    const n8nWebhookUrl = triggerConfig.n8n_webhook_url;

    if (!n8nWebhookUrl) {
      throw new Error('n8n webhook URL not configured');
    }

    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        workflow_id: id,
        workflow_name: workflow.name,
        triggered_by: user?.username,
        timestamp: new Date().toISOString(),
        payload,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to trigger workflow');
    }

    let auditStmt: any = db.prepare(`INSERT INTO audit_logs (user_id, action, table_name, record_id) VALUES (?, ?, ?, ?)`);
    auditStmt = auditStmt.bind(user?.id);
    auditStmt = auditStmt.bind('trigger');
    auditStmt = auditStmt.bind('workflows');
    auditStmt = auditStmt.bind(id);
    await auditStmt.run();

    return c.json({
      message: 'Workflow triggered successfully',
      data: {
        workflow_id: id,
        triggered_at: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    throw new HTTPException(500, { message: `Failed to trigger workflow: ${error.message}` });
  }
});

// Get workflow execution history
workflowsRoutes.get('/:id/executions', async (c) => {
  const { id } = c.req.param();
  const db = (c as any).env.DB as any;
  let stmt: any = db.prepare(`
    SELECT * FROM audit_logs
    WHERE table_name = 'workflows' AND record_id = ? AND action = 'trigger'
    ORDER BY created_at DESC
    LIMIT 50
  `);
  stmt = stmt.bind(id);
  const executions: any = await stmt.all();

  return c.json({
    data: executions || [],
  });
});

// Import workflow (from n8n export)
workflowsRoutes.post('/import', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const { n8n_workflow, name } = body;

  if (!n8n_workflow) {
    throw new HTTPException(400, { message: 'n8n workflow data is required' });
  }

  const id = generateId();
  const workflowName = name || n8n_workflow.name || 'Imported Workflow';

  const db = (c as any).env.DB as any;
  let stmt: any = db.prepare(`
    INSERT INTO workflows (id, name, description, trigger_type, trigger_config, nodes, owner_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt = stmt.bind(id);
  stmt = stmt.bind(workflowName);
  stmt = stmt.bind(n8n_workflow.notes || null);
  stmt = stmt.bind('webhook');
  stmt = stmt.bind(JSON.stringify({
    n8n_workflow_id: n8n_workflow.id,
    n8n_webhook_url: n8n_workflow.webhookUrl,
  }));
  stmt = stmt.bind(JSON.stringify(n8n_workflow));
  stmt = stmt.bind(user?.id);
  await stmt.run();

  stmt = db.prepare('SELECT * FROM workflows WHERE id = ?') as any;
  stmt = stmt.bind(id);
  const workflow = await stmt.first();

  return c.json(
    {
      message: 'Workflow imported successfully',
      data: workflow,
    },
    201
  );
});

// Export workflow
workflowsRoutes.get('/:id/export', async (c) => {
  const { id } = c.req.param();
  const db = (c as any).env.DB as any;
  let stmt: any = db.prepare('SELECT * FROM workflows WHERE id = ?');
  stmt = stmt.bind(id);
  const workflow = await stmt.first();

  if (!workflow) {
    throw new HTTPException(404, { message: 'Workflow not found' });
  }

  return c.json({
    data: {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      nodes: JSON.parse(workflow.nodes || '{}'),
      trigger_config: JSON.parse(workflow.trigger_config || '{}'),
      exported_at: new Date().toISOString(),
    },
  });
});
