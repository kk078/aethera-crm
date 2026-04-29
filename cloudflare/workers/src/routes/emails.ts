import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { createEmailSchema, emailTemplateSchema, gmailRelayConfigSchema, paginationSchema } from '../utils/validation';
import { generateId, calculatePagination, isValidEmail } from '../utils/helpers';
import type { AppEnv } from '../types';

export const emailsRoutes = new Hono<AppEnv>();

// ───── Gmail Relay Configuration ─────

// Get Gmail relay config (masks API key)
emailsRoutes.get('/smtp/config', async (c) => {
  const db = (c as any).env.DB as any;
  let stmt: any = db.prepare("SELECT key, value FROM settings WHERE key LIKE 'gmail_relay_%'");
  const settings: any = await stmt.all();

  const config: Record<string, string> = {};
  for (const row of settings || []) {
    const r = row as any;
    if (r.key === 'gmail_relay_api_key') {
      config.api_key = r.value ? '••••••••' : '';
    } else {
      config[r.key.replace('gmail_relay_', '')] = r.value || '';
    }
  }

  return c.json({
    data: {
      relay_url: config.relay_url || '',
      api_key: config.api_key || '',
      from_email: config.from_email || 'info@aetherahealthcare.com',
      from_name: config.from_name || 'Aethera Healthcare',
      use_relay: config.use_relay === 'true',
    },
  });
});

// Save Gmail relay config
emailsRoutes.put('/smtp/config', async (c) => {
  const body = await c.req.json();
  const validated = gmailRelayConfigSchema.parse(body);

  const pairs: Record<string, string> = {
    gmail_relay_relay_url: validated.relay_url,
    gmail_relay_api_key: validated.api_key,
    gmail_relay_from_email: validated.from_email || 'info@aetherahealthcare.com',
    gmail_relay_from_name: validated.from_name || 'Aethera Healthcare',
    gmail_relay_use_relay: validated.use_relay ? 'true' : 'false',
  };

  const db = (c as any).env.DB as any;
  for (const [key, value] of Object.entries(pairs)) {
    let stmt: any = db.prepare("SELECT id FROM settings WHERE key = ?");
    stmt = stmt.bind(key);
    const existing = await stmt.first();

    if (existing) {
      stmt = db.prepare("UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?") as any;
      stmt = stmt.bind(value);
      stmt = stmt.bind(key);
      await stmt.run();
    } else {
      stmt = db.prepare("INSERT INTO settings (id, key, value, category) VALUES (?, ?, ?, 'gmail_relay')") as any;
      stmt = stmt.bind(generateId());
      stmt = stmt.bind(key);
      stmt = stmt.bind(value);
      await stmt.run();
    }
  }

  return c.json({ message: 'Gmail relay configuration saved successfully' });
});

// Test Gmail relay config
emailsRoutes.post('/smtp/test', async (c) => {
  const body = await c.req.json();
  const { to } = body;

  if (!to) {
    throw new HTTPException(400, { message: 'Test recipient email required' });
  }

  const db = (c as any).env.DB as any;
  let stmt: any = db.prepare("SELECT key, value FROM settings WHERE key LIKE 'gmail_relay_%'");
  const settings: any = await stmt.all();
  const config: Record<string, string> = {};
  for (const row of settings || []) {
    const r = row as any;
    config[r.key] = r.value;
  }

  const useRelay = config.gmail_relay_use_relay === 'true';
  const fromEmail = config.gmail_relay_from_email || 'info@aetherahealthcare.com';
  const fromName = config.gmail_relay_from_name || 'Aethera Healthcare';

  // Try Cloudflare Email Binding (highest priority)
  const emailBinding = (c.env as any).EMAIL as any;
  if (emailBinding && typeof emailBinding.send === 'function') {
    try {
      await emailBinding.send({
        from: `${fromName} <${fromEmail}>`,
        to,
        subject: 'Test from Aethera CRM',
        htmlBody: `<p>Test from <strong>Aethera CRM</strong> via Cloudflare Email.</p><p>${new Date().toISOString()}</p>`,
        textBody: `Test from Aethera CRM via Cloudflare Email. ${new Date().toISOString()}`,
      });
      return c.json({ message: 'Test email sent successfully via Cloudflare Email' });
    } catch (e: any) {
      const msg = e.message || String(e);
      if (msg.includes('verified address')) {
        return c.json({
          message: 'Test email queued (verify destination in Cloudflare Email Routing dashboard)',
          data: { note: msg },
        });
      }
      throw new HTTPException(500, { message: `Cloudflare Email error: ${msg}` });
    }
  }

  // Try external relay
  if (useRelay && config.gmail_relay_relay_url && config.gmail_relay_api_key) {
    try {
      await sendViaGmailRelay({
        relayUrl: config.gmail_relay_relay_url,
        apiKey: config.gmail_relay_api_key,
        fromEmail,
        fromName,
        to,
        subject: 'Test from Aethera CRM',
        htmlBody: `<p>Test from <strong>Aethera CRM</strong>.</p><p>${new Date().toISOString()}</p>`,
      });
      return c.json({ message: 'Test email sent successfully via relay' });
    } catch (e: any) {
      throw new HTTPException(500, { message: `Relay error: ${e.message}` });
    }
  }

  return c.json({
    message: 'No sending method configured. Enable the relay in Settings or set up Cloudflare Email Routing.',
    data: {
      has_cloudflare_binding: !!(emailBinding && typeof (emailBinding as any).send === 'function'),
      relay_configured: useRelay && !!config.gmail_relay_relay_url,
    },
  });
});

// ───── Gmail Relay Sending Logic ─────

async function sendViaGmailRelay(opts: {
  relayUrl: string;
  apiKey: string;
  fromEmail: string;
  fromName: string;
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
}): Promise<any> {
  const payload = {
    to: opts.to,
    subject: opts.subject,
    html_body: opts.htmlBody,
    text_body: opts.textBody || opts.htmlBody.replace(/<[^>]*>/g, ''),
    from_email: opts.fromEmail,
    from_name: opts.fromName,
  };

  const resp = await fetch(opts.relayUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${opts.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Gmail relay error (${resp.status}): ${err}`);
  }

  return await resp.json();
}

// ───── List emails ─────

emailsRoutes.get('/', async (c) => {
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

  if (query.crm_record_id) {
    whereClause += ' AND crm_record_id = ?';
    bindings.push(query.crm_record_id);
  }

  if (query.direction) {
    whereClause += ' AND direction = ?';
    bindings.push(query.direction);
  }

  const db = (c as any).env.DB as any;
  let stmt: any = db.prepare(`SELECT COUNT(*) as total FROM emails ${whereClause}`);
  for (const b of bindings) {
    stmt = stmt.bind(b);
  }
  const countResult = await stmt.first();
  const total = countResult?.total || 0;

  const offset = (pagination.page - 1) * pagination.per_page;
  stmt = db.prepare(`SELECT * FROM emails ${whereClause} ORDER BY ${pagination.sort} ${pagination.order} LIMIT ? OFFSET ?`) as any;
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

// ───── Email Templates CRUD ─────

emailsRoutes.get('/templates', async (c) => {
  const db = (c as any).env.DB as any;
  let stmt: any = db.prepare(`
    SELECT * FROM email_templates
    ORDER BY category, name
  `);
  const templates: any = await stmt.all();
  return c.json({
    data: templates || [],
  });
});

emailsRoutes.post('/templates', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const validated = emailTemplateSchema.parse(body);

  const id = generateId();
  const db = (c as any).env.DB as any;
  let stmt: any = db.prepare(`
    INSERT INTO email_templates (id, name, subject, body, category, owner_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt = stmt.bind(id);
  stmt = stmt.bind(validated.name);
  stmt = stmt.bind(validated.subject || null);
  stmt = stmt.bind(validated.body);
  stmt = stmt.bind(validated.category || null);
  stmt = stmt.bind(user?.id);
  await stmt.run();

  stmt = db.prepare('SELECT * FROM email_templates WHERE id = ?') as any;
  stmt = stmt.bind(id);
  const template = await stmt.first();

  return c.json(
    {
      message: 'Template created successfully',
      data: template,
    },
    201
  );
});

emailsRoutes.put('/templates/:id', async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();
  const validated = emailTemplateSchema.parse(body);

  const db = (c as any).env.DB as any;
  let existingStmt: any = db.prepare('SELECT * FROM email_templates WHERE id = ?');
  existingStmt = existingStmt.bind(id);
  const existing = await existingStmt.first();
  if (!existing) {
    throw new HTTPException(404, { message: 'Template not found' });
  }

  let stmt: any = db.prepare(`
    UPDATE email_templates
    SET name = ?, subject = ?, body = ?, category = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  stmt = stmt.bind(validated.name);
  stmt = stmt.bind(validated.subject || null);
  stmt = stmt.bind(validated.body);
  stmt = stmt.bind(validated.category || null);
  stmt = stmt.bind(id);
  await stmt.run();

  stmt = db.prepare('SELECT * FROM email_templates WHERE id = ?') as any;
  stmt = stmt.bind(id);
  const template = await stmt.first();

  return c.json({
    message: 'Template updated successfully',
    data: template,
  });
});

emailsRoutes.delete('/templates/:id', async (c) => {
  const { id } = c.req.param();
  const db = (c as any).env.DB as any;
  let existingStmt: any = db.prepare('SELECT * FROM email_templates WHERE id = ?');
  existingStmt = existingStmt.bind(id);
  const existing = await existingStmt.first();
  if (!existing) {
    throw new HTTPException(404, { message: 'Template not found' });
  }
  let deleteStmt: any = db.prepare('DELETE FROM email_templates WHERE id = ?');
  deleteStmt = deleteStmt.bind(id);
  await deleteStmt.run();
  return c.json({ message: 'Template deleted successfully' });
});

// ───── Send email via Gmail API or Cloudflare Email Binding ─────

emailsRoutes.post('/send', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const validated = createEmailSchema.parse(body);

  const emailId = generateId();
  let messageId = `pending-${emailId.slice(0, 8)}`;
  let status = 'sent';
  let sendError: string | null = null;
  let sentVia = 'db';
  const fromEmail = 'info@aetherahealthcare.com';
  const fromName = 'Aethera Healthcare';

  // Try Cloudflare Email Binding first
  const emailBinding = (c.env as any).EMAIL as { send: (m: any) => Promise<{ messageId: string }> } | undefined;
  if (emailBinding && typeof emailBinding.send === 'function') {
    try {
      const result = await emailBinding.send({
        from: `${fromName} <${fromEmail}>`,
        to: validated.to,
        subject: validated.subject || '',
        htmlBody: validated.body,
        textBody: validated.body.replace(/<[^>]*>/g, ''),
      });
      messageId = result.messageId || `cf-${emailId.slice(0, 8)}`;
      sentVia = 'cloudflare-email';
    } catch (e: any) {
      console.error('Cloudflare Email Binding failed:', e.message);
      sendError = e.message;
      status = 'pending';
      sentVia = 'db';
    }
  }

  // Try external Gmail relay if no binding or binding failed
  let db: any = (c as any).env.DB as any;
  let stmt: any;
  if (sentVia === 'db') {
    stmt = db.prepare("SELECT key, value FROM settings WHERE key LIKE 'gmail_relay_%'");
    const settings: any = await stmt.all();
    const cfg: Record<string, string> = {};
    for (const row of settings || []) {
      const r = row as any;
      cfg[r.key] = r.value;
    }
    const useRelay = cfg.gmail_relay_use_relay === 'true';

    if (useRelay && cfg.gmail_relay_relay_url && cfg.gmail_relay_api_key) {
      try {
        const result = await sendViaGmailRelay({
          relayUrl: cfg.gmail_relay_relay_url,
          apiKey: cfg.gmail_relay_api_key,
          fromEmail,
          fromName,
          to: validated.to,
          subject: validated.subject || '',
          htmlBody: validated.body,
        });
        messageId = result.id || result.thread_id || `relay-${emailId.slice(0, 8)}`;
        sentVia = 'gmail-relay';
        status = 'sent';
        sendError = null;
      } catch (e: any) {
        console.error('Gmail relay failed:', e.message);
        sendError = e.message;
        status = 'pending';
      }
    }
  }

  stmt = db.prepare(`
    INSERT INTO emails (id, message_id, thread_id, from_address, to_addresses, subject, body, direction, status,
                       crm_record_type, crm_record_id, owner_id, synced_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'outbound', ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `) as any;
  stmt = stmt.bind(emailId);
  stmt = stmt.bind(messageId);
  stmt = stmt.bind(null);
  stmt = stmt.bind(fromEmail);
  stmt = stmt.bind(validated.to);
  stmt = stmt.bind(validated.subject || '');
  stmt = stmt.bind(validated.body);
  stmt = stmt.bind(status);
  stmt = stmt.bind(validated.crm_record_type || null);
  stmt = stmt.bind(validated.crm_record_id || null);
  stmt = stmt.bind(user?.id);
  await stmt.run();

  return c.json({
    message: sendError ? `Email queued with status "${status}" (${sendError})` : `Email sent via ${sentVia}`,
    data: {
      id: emailId,
      message_id: messageId,
      status,
      sent_via: sentVia,
    },
  });
});

// ───── Get email thread ─────

emailsRoutes.get('/thread/:threadId', async (c) => {
  const { threadId } = c.req.param();
  const db = (c as any).env.DB as any;
  let stmt: any = db.prepare(`
    SELECT * FROM emails
    WHERE thread_id = ?
    ORDER BY created_at ASC
  `);
  stmt = stmt.bind(threadId);
  const emails: any = await stmt.all();
  return c.json({
    data: emails || [],
  });
});

// ───── Email analytics ─────

emailsRoutes.get('/analytics/summary', async (c) => {
  const user = c.get('user');

  let whereClause = '1=1';
  const bindings: any[] = [];

  if (user?.role !== 'admin') {
    whereClause += ' AND owner_id = ?';
    bindings.push(user?.id);
  }

  let summary: any;
  try {
    const sql = `
      SELECT
        COUNT(*) as total_emails,
        COUNT(CASE WHEN direction = 'inbound' THEN 1 END) as inbound_count,
        COUNT(CASE WHEN direction = 'outbound' THEN 1 END) as outbound_count
      FROM emails WHERE ${whereClause}
    `;
    const db = (c as any).env.DB as any;
    let stmt: any = db.prepare(sql);
    for (const b of bindings) {
      stmt = stmt.bind(b);
    }
    summary = await stmt.first();
  } catch (e) {
    console.error('Analytics summary error:', e);
  }

  const summaryResult = {
    total_emails: summary?.total_emails || 0,
    inbound_count: summary?.inbound_count || 0,
    outbound_count: summary?.outbound_count || 0,
    avg_sentiment: 0,
    negative_count: 0,
    positive_count: 0,
  };

  let byCategoryResult: any = { results: [] };
  try {
    const sql2 = `
      SELECT category, COUNT(*) as count
      FROM emails WHERE ${whereClause} AND category IS NOT NULL AND category != ''
      GROUP BY category
      ORDER BY count DESC
    `;
    const db = (c as any).env.DB as any;
    let stmt: any = db.prepare(sql2);
    for (const b of bindings) {
      stmt = stmt.bind(b);
    }
    byCategoryResult = await stmt.all();
  } catch (e) {
    console.error('Analytics category error:', e);
  }

  return c.json({
    data: {
      summary: summaryResult,
      by_category: byCategoryResult || [],
    },
  });
});

// ───── Get single email ─────

emailsRoutes.get('/:id', async (c) => {
  const { id } = c.req.param();
  const db = (c as any).env.DB as any;
  let stmt: any = db.prepare('SELECT * FROM emails WHERE id = ?');
  stmt = stmt.bind(id);
  const email = await stmt.first();
  if (!email) {
    throw new HTTPException(404, { message: 'Email not found' });
  }
  return c.json({ data: email });
});
