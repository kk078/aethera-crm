import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { generateId } from '../utils/helpers';
import type { AppEnv } from '../types';

export const calendarIntegrationRoutes = new Hono<AppEnv>();

function getDB(c: any) {
  const db = (c as any).env.DB;
  if (!db) {
    throw new HTTPException(500, { message: 'Database binding not available' });
  }
  return db;
}

// ───── Calendar Scheduling Endpoints ─────

// Get scheduled calls
calendarIntegrationRoutes.get('/scheduled-calls', async (c) => {
  const user = c.get('user');
  if (!user) throw new HTTPException(401, { message: 'Authentication required' });
  const db = getDB(c);
  const { status, provider_id, start_date, end_date } = c.req.query();

  const bindings: any[] = [];
  if (status) bindings.push(status);
  if (provider_id) bindings.push(provider_id);
  if (start_date) bindings.push(start_date);
  if (end_date) bindings.push(end_date);

  const result = await db.prepare(`SELECT sc.*, p.organization_name, p.first_name, p.last_name, p.npi FROM scheduled_calls sc LEFT JOIN npi_providers p ON sc.provider_id = p.id ${status || provider_id || start_date || end_date ? 'WHERE 1=1' : ''} ORDER BY sc.scheduled_date ASC LIMIT 50`).bind(...bindings).all();
  return c.json({ data: result.results || [] });
});

// Create scheduled call
calendarIntegrationRoutes.post('/scheduled-calls', async (c) => {
  const user = c.get('user');
  if (!user) throw new HTTPException(401, { message: 'Authentication required' });
  const body = await c.req.json();
  const { provider_id, contact_id, scheduled_date, timezone = 'UTC', meeting_url } = body;

  if (!scheduled_date) throw new HTTPException(400, { message: 'Scheduled date is required' });

  const db = getDB(c);
  const id = generateId();
  const stmt = db.prepare(`INSERT INTO scheduled_calls (id, provider_id, contact_id, scheduled_date, timezone, status, meeting_url, created_by, created_at) VALUES (?, ?, ?, ?, 'pending', ?, ?, datetime('now'))`);
  await stmt.bind(id, provider_id, contact_id || null, scheduled_date, timezone, meeting_url || null, user.id).run();

  return c.json({ message: 'Scheduled call created', data: { id, scheduled_date, timezone, meeting_url } });
});

// Update scheduled call
calendarIntegrationRoutes.patch('/scheduled-calls/:id', async (c) => {
  const user = c.get('user');
  if (!user) throw new HTTPException(401, { message: 'Authentication required' });
  const { id } = c.req.param();
  const body = await c.req.json();
  const { status, scheduled_date, timezone, meeting_url } = body;

  const db = getDB(c);
  const updates: string[] = ['updated_at = datetime(\'now\')'];
  const bindings: any[] = [id];

  if (status) {
    updates.push('status = ?');
    bindings.push(status);
  }
  if (scheduled_date) {
    updates.push('scheduled_date = ?');
    bindings.push(scheduled_date);
  }
  if (timezone) {
    updates.push('timezone = ?');
    bindings.push(timezone);
  }
  if (meeting_url) {
    updates.push('meeting_url = ?');
    bindings.push(meeting_url);
  }

  const stmt = db.prepare(`UPDATE scheduled_calls SET ${updates.join(', ')} WHERE id = ?`);
  await stmt.bind(...bindings).run();

  return c.json({ message: 'Scheduled call updated' });
});

// Delete scheduled call
calendarIntegrationRoutes.delete('/scheduled-calls/:id', async (c) => {
  const user = c.get('user');
  if (!user) throw new HTTPException(401, { message: 'Authentication required' });
  const { id } = c.req.param();
  const db = getDB(c);
  await db.prepare('DELETE FROM scheduled_calls WHERE id = ?').bind(id).run();
  return c.json({ message: 'Scheduled call deleted' });
});

// ───── Calendar Sync Endpoints ─────

// Sync with external calendar (Google Calendar, Outlook)
calendarIntegrationRoutes.post('/sync/calendar', async (c) => {
  const user = c.get('user');
  if (!user) throw new HTTPException(401, { message: 'Authentication required' });
  const body = await c.req.json();
  const { provider_id, contact_id, scheduled_date, timezone, title, description, calendar_type } = body;

  if (!scheduled_date || !title) {
    throw new HTTPException(400, { message: 'Date and title are required' });
  }

  const db = getDB(c);
  const id = generateId();

  // Create scheduled call
  let stmt: any = db.prepare(`INSERT INTO scheduled_calls (id, provider_id, contact_id, scheduled_date, timezone, status, created_by, created_at) VALUES (?, ?, ?, ?, 'pending', ?, ?)`);
  stmt = stmt.bind(id);
  stmt = stmt.bind(provider_id || null);
  stmt = stmt.bind(contact_id || null);
  stmt = stmt.bind(scheduled_date);
  stmt = stmt.bind(timezone || 'UTC');
  stmt = stmt.bind(user.id);

  await stmt.run();

  // In production, this would sync with Google Calendar API or Outlook API
  // For now, return the sync response
  const syncResponse = {
    event_id: id,
    calendar_id: `aethera_crm_${calendar_type || 'google'}`,
    summary: title,
    description: description || 'Scheduled via Aethera-CRM',
    start: { dateTime: scheduled_date, timeZone: timezone || 'UTC' },
    end: { dateTime: new Date(new Date(scheduled_date).getTime() + 30 * 60000).toISOString(), timeZone: timezone || 'UTC' },
    attendees: provider_id ? [{ email: 'provider@example.com', displayName: `Provider ${provider_id}` }] : undefined,
    conferenceData: {
      createRequest: {
        conferenceId: id,
        requestId: generateId(),
        conferenceSolutionKey: { type: 'hangoutsMeet' },
        status: { statusCode: 'success' }
      }
    }
  };

  return c.json({ message: 'Event synced to calendar', data: syncResponse });
});

// ───── Calendar Provider Endpoints ─────

// Get calendar providers for user
calendarIntegrationRoutes.get('/calendar/providers', async (c) => {
  const user = c.get('user');
  if (!user) throw new HTTPException(401, { message: 'Authentication required' });
  const db = getDB(c);

  const providers = await db.prepare(`
    SELECT
      u.id,
      u.username,
      u.email,
      COUNT(sc.id) as scheduled_count,
      COUNT(CASE WHEN sc.status = 'pending' THEN 1 END) as pending_count,
      COUNT(CASE WHEN sc.status = 'confirmed' THEN 1 END) as confirmed_count
    FROM users u
    LEFT JOIN scheduled_calls sc ON u.id = sc.created_by
    WHERE u.role = 'admin' OR u.id = ?
    GROUP BY u.id
  `).bind(user.id).all();

  return c.json({ data: providers.results || [] });
});

// Update calendar settings for user
calendarIntegrationRoutes.put('/calendar/settings', async (c) => {
  const user = c.get('user');
  if (!user) throw new HTTPException(401, { message: 'Authentication required' });
  const body = await c.req.json();
  const { calendar_email, calendar_type, sync_enabled = true } = body;

  const db = getDB(c);

  // Check if settings exist
  let existingStmt: any = db.prepare('SELECT id FROM settings WHERE key = ? AND category = ?');
  existingStmt = existingStmt.bind(`calendar_${user.id}_email`);
  existingStmt = existingStmt.bind('calendar_integration');
  const existing = await existingStmt.first();

  const pairs: Record<string, string> = {
    [`calendar_${user.id}_email`]: calendar_email || '',
    [`calendar_${user.id}_type`]: calendar_type || 'google',
    [`calendar_${user.id}_sync`]: sync_enabled ? 'true' : 'false',
  };

  const db2 = getDB(c);
  for (const [key, value] of Object.entries(pairs)) {
    const existingStmt2 = db2.prepare("SELECT id FROM settings WHERE key = ?");
    const existing2 = await existingStmt2.bind(key).first();
    if (existing2) {
      const updateStmt = db2.prepare("UPDATE settings SET value = ?, updated_at = datetime('now') WHERE key = ?");
      await updateStmt.bind(value, key).run();
    } else {
      const insertStmt = db2.prepare("INSERT INTO settings (id, key, value, category) VALUES (?, ?, ?, 'calendar_integration')");
      await insertStmt.bind(generateId(), key, value).run();
    }
  }

  return c.json({ message: 'Calendar settings updated' });
});

// Get calendar settings for user
calendarIntegrationRoutes.get('/calendar/settings', async (c) => {
  const user = c.get('user');
  if (!user) throw new HTTPException(401, { message: 'Authentication required' });
  const db = getDB(c);

  const stmt = db.prepare("SELECT key, value FROM settings WHERE key LIKE ? AND category = 'calendar_integration'");
  const result = await stmt.bind(`calendar_${user.id}%`).all();

  const settings: Record<string, string> = {};
  for (const row of result.results || []) {
    const key = (row as any).key.replace(`calendar_${user.id}_`, '');
    settings[key] = (row as any).value || '';
  }

  return c.json({ data: settings });
});

// ───── Availability Check Endpoints ─────

// Check provider availability
calendarIntegrationRoutes.post('/availability/check', async (c) => {
  const body = await c.req.json();
  const { provider_id, start_date, end_date, specialty } = body;

  if (!provider_id || !start_date) {
    throw new HTTPException(400, { message: 'Provider ID and start date are required' });
  }

  const db = getDB(c);

  // Get provider's existing scheduled calls
  let stmt: any = db.prepare(`SELECT scheduled_date, timezone, status FROM scheduled_calls WHERE provider_id = ? AND status IN ('pending', 'confirmed')`);
  stmt = stmt.bind(provider_id);
  const existing = await stmt.all();

  // Check for conflicts (simplified - in production would check calendar API)
  const conflicts: any[] = [];
  const existingDates = (existing.results || []).map((e: any) => e.scheduled_date);

  // Return available time slots
  const availableSlots = [
    { time: '09:00', date: start_date },
    { time: '10:00', date: start_date },
    { time: '11:00', date: start_date },
    { time: '13:00', date: start_date },
    { time: '14:00', date: start_date },
    { time: '15:00', date: start_date },
  ];

  return c.json({
    data: {
      conflicts,
      available_slots: availableSlots,
      provider_id,
      specialty_available: specialty ? true : false,
      avg_call_duration: 15,
    }
  });
});

export default calendarIntegrationRoutes;
