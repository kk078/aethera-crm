import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { generateId } from '../utils/helpers';
import type { AppEnv } from '../types';

export const callQueueRoutes = new Hono<AppEnv>();

function getDB(c: any) {
  const db = (c as any).env.DB;
  if (!db) {
    throw new HTTPException(500, { message: 'Database binding not available' });
  }
  return db;
}

// ───── Queue Management ─────

// Get queue status
callQueueRoutes.get('/queue/status', async (c) => {
  const user = c.get('user');
  if (!user) throw new HTTPException(401, { message: 'Authentication required' });
  const db = getDB(c);

  const stats = await db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN priority = 0 THEN 1 ELSE 0 END) as high_priority,
      SUM(CASE WHEN priority = 1 THEN 1 ELSE 0 END) as medium_priority,
      SUM(CASE WHEN priority = 2 THEN 1 ELSE 0 END) as low_priority,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'assigned' THEN 1 ELSE 0 END) as assigned,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
    FROM call_queue
  `).first();

  return c.json({ data: stats || { total: 0, high_priority: 0, medium_priority: 0, low_priority: 0 } });
});

// Get queue items
callQueueRoutes.get('/queue/items', async (c) => {
  const user = c.get('user');
  if (!user) throw new HTTPException(401, { message: 'Authentication required' });
  const db = getDB(c);
  const query = c.req.query();
  const status = query.status as string | undefined;
  const limit = parseInt(query.limit || '50');
  const offset = parseInt(query.offset || '0');

  const bindings: any[] = [];
  if (status) {
    bindings.push(status);
  }

  const items = await db.prepare(`SELECT * FROM call_queue ${status ? 'WHERE status = ?' : ''} ORDER BY created_at ASC LIMIT ? OFFSET ?`).bind(...bindings, limit, offset).all();
  return c.json({ data: items.results || [] });
});

// Add to queue
callQueueRoutes.post('/queue/items', async (c) => {
  const user = c.get('user');
  if (!user) throw new HTTPException(401, { message: 'Authentication required' });
  const body = await c.req.json();
  const { caller_number, intent, priority = 1 } = body;

  if (!caller_number) throw new HTTPException(400, { message: 'Caller number is required' });

  const db = getDB(c);
  const id = generateId();
  const status = 'pending';
  await db.prepare(`INSERT INTO call_queue (id, caller_number, intent, priority, status, created_at) VALUES (?, ?, ?, ?, ?, datetime('now'))`).bind(id, caller_number, intent, priority, status).run();

  return c.json({ message: 'Added to queue', data: { id, caller_number, intent, priority } });
});

// Update queue item
callQueueRoutes.patch('/queue/items/:id', async (c) => {
  const user = c.get('user');
  if (!user) throw new HTTPException(401, { message: 'Authentication required' });
  const { id } = c.req.param();
  const body = await c.req.json();
  const { status, assigned_agent_id, intent, priority } = body;

  const db = getDB(c);

  const updates: string[] = [];
  const bindings: any[] = [];

  if (status !== undefined) { updates.push('status = ?'); bindings.push(status); }
  if (assigned_agent_id !== undefined) { updates.push('assigned_agent_id = ?'); bindings.push(assigned_agent_id); }
  if (intent !== undefined) { updates.push('intent = ?'); bindings.push(intent); }
  if (priority !== undefined) { updates.push('priority = ?'); bindings.push(priority); }
  updates.push('updated_at = datetime(\'now\')');
  bindings.push(id);

  const stmt = db.prepare(`UPDATE call_queue SET ${updates.join(', ')} WHERE id = ?`);
  await stmt.bind(...bindings).run();
  return c.json({ message: 'Queue item updated' });
});

// Remove from queue
callQueueRoutes.delete('/queue/items/:id', async (c) => {
  const user = c.get('user');
  if (!user) throw new HTTPException(401, { message: 'Authentication required' });
  const { id } = c.req.param();

  const db = getDB(c);
  await db.prepare('DELETE FROM call_queue WHERE id = ?').bind(id).run();
  return c.json({ message: 'Removed from queue' });
});

// ───── Provider Availability ─────

// Get provider availability
callQueueRoutes.get('/availability/providers', async (c) => {
  const user = c.get('user');
  if (!user) throw new HTTPException(401, { message: 'Authentication required' });
  const db = getDB(c);

  const stmt = db.prepare(`
    SELECT
      pa.*,
      u.username as agent_name,
      (SELECT COUNT(*) FROM call_queue cq WHERE cq.assigned_agent_id = pa.provider_id AND cq.status IN ('pending', 'assigned')) as current_calls
    FROM provider_availability pa
    LEFT JOIN users u ON pa.provider_id = u.id
    WHERE pa.is_available = 1
  `);

  const result = await stmt.all();
  return c.json({ data: result.results || [] });
});

// Update provider availability
callQueueRoutes.put('/availability/providers/:id', async (c) => {
  const user = c.get('user');
  if (!user) throw new HTTPException(401, { message: 'Authentication required' });
  const { id } = c.req.param();
  const body = await c.req.json();
  const { is_available, current_call_count } = body;

  const db = getDB(c);
  const stmt = db.prepare(`UPDATE provider_availability SET is_available = ?, current_call_count = ?, last_available_at = datetime('now') WHERE provider_id = ?`);
  await stmt.bind(is_available !== undefined ? (is_available ? 1 : 0) : 1, current_call_count !== undefined ? current_call_count : 0, id).run();

  return c.json({ message: 'Availability updated' });
});

// Register provider availability
callQueueRoutes.post('/availability/providers', async (c) => {
  const user = c.get('user');
  if (!user) throw new HTTPException(401, { message: 'Authentication required' });
  const body = await c.req.json();
  const { provider_id, is_available = true, current_call_count = 0 } = body;

  const db = getDB(c);

  // Check if exists
  const checkStmt = db.prepare('SELECT id FROM provider_availability WHERE provider_id = ?');
  const existing = await checkStmt.bind(provider_id).first();

  if (existing) {
    const stmt = db.prepare(`UPDATE provider_availability SET is_available = ?, current_call_count = ?, last_available_at = datetime('now') WHERE provider_id = ?`);
    await stmt.bind(is_available ? 1 : 0, current_call_count, provider_id).run();
  } else {
    const id = generateId();
    const stmt = db.prepare(`INSERT INTO provider_availability (id, provider_id, is_available, current_call_count, created_at) VALUES (?, ?, ?, ?, datetime('now'))`);
    await stmt.bind(id, provider_id, is_available ? 1 : 0, current_call_count).run();
  }

  return c.json({ message: 'Provider availability registered' });
});

// ───── Queue Statistics ─────

callQueueRoutes.get('/stats/queue-time', async (c) => {
  const user = c.get('user');
  if (!user) throw new HTTPException(401, { message: 'Authentication required' });
  const db = getDB(c);

  const stats = await db.prepare(`
    SELECT
      AVG(strftime('%s', dequeued_at) - strftime('%s', created_at)) as avg_wait_seconds,
      MAX(strftime('%s', dequeued_at) - strftime('%s', created_at)) as max_wait_seconds,
      MIN(strftime('%s', dequeued_at) - strftime('%s', created_at)) as min_wait_seconds
    FROM call_queue
    WHERE status = 'completed' AND dequeued_at IS NOT NULL
  `).first();

  return c.json({ data: stats || { avg_wait_seconds: null, max_wait_seconds: null, min_wait_seconds: null } });
});

// ───── Call Routing ─────

// Get next available provider
callQueueRoutes.get('/routing/next-provider', async (c) => {
  const user = c.get('user');
  if (!user) throw new HTTPException(401, { message: 'Authentication required' });
  const db = getDB(c);

  const provider = await db.prepare(`
    SELECT
      pa.provider_id,
      u.username,
      u.email,
      pa.current_call_count,
      (SELECT COUNT(*) FROM call_queue cq WHERE cq.assigned_agent_id = pa.provider_id AND cq.status IN ('pending', 'assigned')) as active_calls
    FROM provider_availability pa
    LEFT JOIN users u ON pa.provider_id = u.id
    WHERE pa.is_available = 1
    ORDER BY pa.current_call_count ASC, pa.last_available_at ASC
    LIMIT 1
  `).first();

  if (!provider) {
    throw new HTTPException(404, { message: 'No available providers' });
  }

  return c.json({ data: provider });
});

// Assign call to provider
callQueueRoutes.post('/routing/assign', async (c) => {
  const user = c.get('user');
  if (!user) throw new HTTPException(401, { message: 'Authentication required' });
  const body = await c.req.json();
  const { queue_id, provider_id } = body;

  if (!queue_id || !provider_id) {
    throw new HTTPException(400, { message: 'Queue ID and provider ID are required' });
  }

  const db = getDB(c);

  // Update queue item
  await db.prepare('UPDATE call_queue SET assigned_agent_id = ?, status = ?, dequeued_at = datetime(\'now\') WHERE id = ?').bind(provider_id, 'assigned', queue_id).run();

  // Update provider call count
  await db.prepare('UPDATE provider_availability SET current_call_count = current_call_count + 1 WHERE provider_id = ?').bind(provider_id).run();

  return c.json({ message: 'Call assigned to provider', data: { queue_id, provider_id } });
});

export default callQueueRoutes;
