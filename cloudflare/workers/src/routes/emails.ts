import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { createEmailSchema, emailTemplateSchema, gmailRelayConfigSchema, gmailOAuthConfigSchema, paginationSchema } from '../utils/validation';
import { generateId, calculatePagination, isValidEmail } from '../utils/helpers';
import type { AppEnv } from '../types';

// Default Gmail OAuth credentials (pre-configured)
const DEFAULT_OAUTH_CONFIG = {
  client_id: '280155650451-afhvc54egr4tm8tv24utp6mfcqe8qbku',
  client_secret: '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',
  redirect_uri: 'urn:ietf:wg:oauth:2.0:oob',
  from_email: 'info@aetherahealthcare.com',
  from_name: 'Aethera Healthcare',
  use_oauth: true,
};

// Email templates for outreach
const DEFAULT_EMAIL_TEMPLATES = [
  {
    name: 'Outreach - Initial Contact',
    subject: 'Introducing Aethera Healthcare Provider Solutions',
    body: '<p>Hi {{name}},</p><p>I hope this email finds you well. My name is [Your Name] with Aethera Healthcare, and I\'m reaching out to introduce our comprehensive provider relationship management platform.</p><p>We help healthcare practices like yours streamline provider onboarding, manage credentialing, and build stronger relationships with network providers.</p><p>Would you be open to a brief 15-minute call this week to discuss how we can help?</p><p>Best regards,</p><p>[Your Name]<br>Aethera Healthcare</p>',
    category: 'outreach',
  },
  {
    name: 'Outreach - Follow Up',
    subject: 'Following Up on Previous Communication',
    body: '<p>Hi {{name}},</p><p>I wanted to follow up on my previous email regarding Aethera Healthcare\'s provider solutions. I understand you may be busy, but I believe our platform could be a valuable addition to your practice.</p><p>Is there a better time for you to discuss this further?</p><p>Looking forward to hearing from you.</p><p>Best regards,</p><p>[Your Name]</p>',
    category: 'follow-up',
  },
  {
    name: 'Outreach - Value Proposition',
    subject: 'How Aethera Can Save You Time and Improve Outcomes',
    body: '<p>Hi {{name}},</p><p>I wanted to share how Aethera Healthcare can specifically help with your practice:</p><ul><li><strong>Efficient Provider Onboarding:</strong> Reduce onboarding time by 50%</li><li><strong>Automated Credentialing:</strong> Keep your provider directory accurate and up-to-date</li><li><strong>Enhanced Communication:</strong> Build stronger relationships with network providers</li></ul><p>Would you be interested in a personalized demo?</p><p>Best regards,</p><p>[Your Name]<br>Aethera Healthcare</p>',
    category: 'outreach',
  },
  {
    name: 'Follow-up - No Response',
    subject: 'Checking In - Still Available to Help',
    body: '<p>Hi {{name}},</p><p>I\'ve tried reaching out a couple of times and wanted to check if this is still the best email address for you? Or perhaps now isn\'t a good time to discuss provider solutions?</p><p>If you prefer, I can reach out at a later date.</p><p>Thanks for your time!</p><p>Best regards,</p><p>[Your Name]</p>',
    category: 'follow-up',
  },
  {
    name: 'General - Calendar Invite',
    subject: 'Scheduling Our Discussion',
    body: '<p>Hi {{name}},</p><p>Thanks for your response! I\'d love to schedule a brief call to discuss how Aethera can help your practice.</p><p>Here are some available times this week:</p><ul><li>Monday: 10:00 AM - 2:00 PM</li><li>Wednesday: 9:00 AM - 3:00 PM</li><li>Friday: 11:00 AM - 4:00 PM</li></ul><p>Which time works best for you?</p><p>Best regards,</p><p>[Your Name]</p>',
    category: 'general',
  },
  {
    name: 'Post-Call Follow-up',
    subject: 'Thanks for Our Conversation - Next Steps',
    body: '<p>Hi {{name}},</p><p>Thank you for taking the time to speak with me today. I enjoyed our conversation about [specific topic discussed].</p><p>As we discussed, I\'ll [specific action item]. In the meantime, if you have any questions, please don\'t hesitate to reach out.</p><p>Looking forward to next steps!</p><p>Best regards,</p><p>[Your Name]</p>',
    category: 'general',
  },
];

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

// Setup default Gmail OAuth config and email templates
emailsRoutes.post('/setup', async (c) => {
  const db = (c as any).env.DB as any;
  const query = c.req.query();

  // Check if already set up
  let stmt: any = db.prepare("SELECT value FROM settings WHERE key = 'gmail_oauth_client_id'");
  const existing = await stmt.first();

  if (existing && query.force !== 'true') {
    return c.json({
      message: 'Already configured',
      data: { already_setup: true },
    });
  }

  // Save OAuth config
  const oauthPairs: Record<string, string> = {
    gmail_oauth_client_id: DEFAULT_OAUTH_CONFIG.client_id,
    gmail_oauth_client_secret: DEFAULT_OAUTH_CONFIG.client_secret,
    gmail_oauth_redirect_uri: DEFAULT_OAUTH_CONFIG.redirect_uri,
    gmail_oauth_from_email: DEFAULT_OAUTH_CONFIG.from_email,
    gmail_oauth_from_name: DEFAULT_OAUTH_CONFIG.from_name,
    gmail_oauth_use_oauth: 'true',
  };

  for (const [key, value] of Object.entries(oauthPairs)) {
    stmt = db.prepare("SELECT id FROM settings WHERE key = ?");
    stmt = stmt.bind(key);
    const existing = await stmt.first();

    if (existing) {
      stmt = db.prepare("UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?") as any;
      stmt = stmt.bind(value);
      stmt = stmt.bind(key);
      await stmt.run();
    } else {
      stmt = db.prepare("INSERT INTO settings (id, key, value, category) VALUES (?, ?, ?, 'gmail_oauth')") as any;
      stmt = stmt.bind(generateId());
      stmt = stmt.bind(key);
      stmt = stmt.bind(value);
      await stmt.run();
    }
  }

  // Insert default email templates
  for (const template of DEFAULT_EMAIL_TEMPLATES) {
    let templateStmt: any = db.prepare("SELECT id FROM email_templates WHERE name = ?");
    templateStmt = templateStmt.bind(template.name);
    const existingTemplate = await templateStmt.first();

    if (!existingTemplate) {
      const templateId = generateId();
      let insertStmt: any = db.prepare(`
        INSERT INTO email_templates (id, name, subject, body, category, owner_id)
        VALUES (?, ?, ?, ?, ?, 'system')
      `);
      insertStmt = insertStmt.bind(templateId);
      insertStmt = insertStmt.bind(template.name);
      insertStmt = insertStmt.bind(template.subject);
      insertStmt = insertStmt.bind(template.body);
      insertStmt = insertStmt.bind(template.category);
      await insertStmt.run();
    }
  }

  return c.json({
    message: 'Setup completed successfully',
    data: {
      oauth_configured: true,
      templates_count: DEFAULT_EMAIL_TEMPLATES.length,
    },
  });
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

// ───── Gmail OAuth Configuration ─────

// Get Gmail OAuth config
emailsRoutes.get('/oauth/config', async (c) => {
  const db = (c as any).env.DB as any;
  let stmt: any = db.prepare("SELECT key, value FROM settings WHERE key LIKE 'gmail_oauth_%'");
  const settings: any = await stmt.all();

  const config: Record<string, string> = {};
  for (const row of settings || []) {
    const r = row as any;
    if (r.key === 'gmail_oauth_client_secret') {
      config.client_secret = r.value ? '••••••••' : '';
    } else {
      config[r.key.replace('gmail_oauth_', '')] = r.value || '';
    }
  }

  return c.json({
    data: {
      client_id: config.client_id || '',
      redirect_uri: config.redirect_uri || '',
      from_email: config.from_email || 'info@aetherahealthcare.com',
      from_name: config.from_name || 'Aethera Healthcare',
      use_oauth: config.use_oauth === 'true',
    },
  });
});

// Save Gmail OAuth config
emailsRoutes.put('/oauth/config', async (c) => {
  const body = await c.req.json();
  const validated = gmailOAuthConfigSchema.parse(body);

  const pairs: Record<string, string> = {
    gmail_oauth_client_id: validated.client_id,
    gmail_oauth_client_secret: validated.client_secret || '',
    gmail_oauth_redirect_uri: validated.redirect_uri || '',
    gmail_oauth_from_email: validated.from_email || 'info@aetherahealthcare.com',
    gmail_oauth_from_name: validated.from_name || 'Aethera Healthcare',
    gmail_oauth_use_oauth: validated.use_oauth ? 'true' : 'false',
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
      stmt = db.prepare("INSERT INTO settings (id, key, value, category) VALUES (?, ?, ?, 'gmail_oauth')") as any;
      stmt = stmt.bind(generateId());
      stmt = stmt.bind(key);
      stmt = stmt.bind(value);
      await stmt.run();
    }
  }

  return c.json({ message: 'Gmail OAuth configuration saved successfully' });
});

// Generate Gmail OAuth auth URL
emailsRoutes.post('/oauth/auth-url', async (c) => {
  const db = (c as any).env.DB as any;
  let stmt: any = db.prepare("SELECT key, value FROM settings WHERE key LIKE 'gmail_oauth_%'");
  const settings: any = await stmt.all();
  const config: Record<string, string> = {};
  for (const row of settings || []) {
    const r = row as any;
    config[r.key] = r.value;
  }

  const clientId = config.gmail_oauth_client_id;
  const redirectUri = config.gmail_oauth_redirect_uri || 'urn:ietf:wg:oauth:2.0:oob';
  const scope = 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile';

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`;

  return c.json({
    data: { auth_url: authUrl },
  });
});

// Exchange OAuth code for token (for manual setup - user provides code)
emailsRoutes.post('/oauth/token', async (c) => {
  const body = await c.req.json();
  const { code } = body;

  if (!code) {
    throw new HTTPException(400, { message: 'Authorization code required' });
  }

  const db = (c as any).env.DB as any;
  let stmt: any = db.prepare("SELECT key, value FROM settings WHERE key LIKE 'gmail_oauth_%'");
  const settings: any = await stmt.all();
  const config: Record<string, string> = {};
  for (const row of settings || []) {
    const r = row as any;
    config[r.key] = r.value;
  }

  const clientId = config.gmail_oauth_client_id;
  const clientSecret = config.gmail_oauth_client_secret;

  if (!clientId || !clientSecret) {
    throw new HTTPException(400, { message: 'Gmail OAuth client ID and secret required' });
  }

  const redirectUri = config.gmail_oauth_redirect_uri || 'urn:ietf:wg:oauth:2.0:oob';

  try {
    const tokenUrl = 'https://oauth2.googleapis.com/token';
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const err = await tokenResponse.text();
      throw new HTTPException(400, { message: `Token exchange failed: ${err}` });
    }

    const tokenData = await tokenResponse.json();

    // Store the tokens in settings
    let storeStmt: any = db.prepare("SELECT id FROM settings WHERE key = ?");
    for (const [key, value] of Object.entries({
      gmail_oauth_access_token: tokenData.access_token,
      gmail_oauth_refresh_token: tokenData.refresh_token || '',
      gmail_oauth_token_expiry: tokenData.expires_in ? (Date.now() / 1000 + tokenData.expires_in).toString() : '',
      gmail_oauth_use_oauth: 'true',
    })) {
      storeStmt = storeStmt.bind(key);
      const existing = await storeStmt.first();
      storeStmt = db.prepare("SELECT id FROM settings WHERE key = ?") as any;

      if (existing) {
        storeStmt = db.prepare("UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?") as any;
        storeStmt = storeStmt.bind(value);
        storeStmt = storeStmt.bind(key);
        await storeStmt.run();
      } else {
        storeStmt = db.prepare("INSERT INTO settings (id, key, value, category) VALUES (?, ?, ?, 'gmail_oauth')") as any;
        storeStmt = storeStmt.bind(generateId());
        storeStmt = storeStmt.bind(key);
        storeStmt = storeStmt.bind(value);
        await storeStmt.run();
      }
    }

    // Get user info
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userInfo = await userInfoResponse.json();

    return c.json({
      message: 'Gmail OAuth configured successfully',
      data: {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        email: userInfo.email,
        name: userInfo.name,
      },
    });
  } catch (e: any) {
    throw new HTTPException(500, { message: `OAuth error: ${e.message}` });
  }
});

// Refresh Gmail OAuth token
emailsRoutes.post('/oauth/refresh', async (c) => {
  const db = (c as any).env.DB as any;
  let stmt: any = db.prepare("SELECT key, value FROM settings WHERE key LIKE 'gmail_oauth_%'");
  const settings: any = await stmt.all();
  const config: Record<string, string> = {};
  for (const row of settings || []) {
    const r = row as any;
    config[r.key] = r.value;
  }

  const refreshToken = config.gmail_oauth_refresh_token;
  const clientId = config.gmail_oauth_client_id;
  const clientSecret = config.gmail_oauth_client_secret;

  if (!refreshToken || !clientId || !clientSecret) {
    throw new HTTPException(400, { message: 'Refresh token and client credentials required' });
  }

  try {
    const tokenUrl = 'https://oauth2.googleapis.com/token';
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
      }),
    });

    if (!tokenResponse.ok) {
      const err = await tokenResponse.text();
      throw new HTTPException(400, { message: `Token refresh failed: ${err}` });
    }

    const tokenData = await tokenResponse.json();

    // Update access token in settings
    let storeStmt: any = db.prepare("UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?") as any;
    storeStmt = storeStmt.bind(tokenData.access_token);
    storeStmt = storeStmt.bind('gmail_oauth_access_token');
    await storeStmt.run();

    return c.json({
      message: 'Token refreshed successfully',
      data: { access_token: tokenData.access_token },
    });
  } catch (e: any) {
    throw new HTTPException(500, { message: `Token refresh error: ${e.message}` });
  }
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

// ───── Gmail OAuth Sending Logic ─────

async function sendViaGmailOAuth(opts: {
  accessToken: string;
  fromEmail: string;
  fromName: string;
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
}): Promise<any> {
  // Create MIME message
  const boundary = 'boundary-' + Date.now();
  const textBody = opts.textBody || opts.htmlBody.replace(/<[^>]*>/g, '');

  let mimeMessage = `From: ${opts.fromName} <${opts.fromEmail}>\r\n`;
  mimeMessage += `To: ${opts.to}\r\n`;
  mimeMessage += `Subject: ${opts.subject}\r\n`;
  mimeMessage += `MIME-Version: 1.0\r\n`;
  mimeMessage += `Content-Type: multipart/alternative; boundary="${boundary}"\r\n`;
  mimeMessage += `\r\n--${boundary}\r\n`;
  mimeMessage += `Content-Type: text/plain; charset=UTF-8\r\n`;
  mimeMessage += `\r\n${textBody}\r\n`;
  mimeMessage += `\r\n--${boundary}\r\n`;
  mimeMessage += `Content-Type: text/html; charset=UTF-8\r\n`;
  mimeMessage += `\r\n${opts.htmlBody}\r\n`;
  mimeMessage += `\r\n--${boundary}--\r\n`;

  const encodedMessage = btoa(mimeMessage).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const resp = await fetch('https://www.googleapis.com/upload/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${opts.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: encodedMessage }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Gmail API error (${resp.status}): ${err}`);
  }

  return await resp.json();
}

// ───── Helper function to get OAuth tokens ─────

async function getGmailOAuthTokens(db: any) {
  let stmt: any = db.prepare("SELECT key, value FROM settings WHERE key LIKE 'gmail_oauth_%'");
  const settings: any = await stmt.all();
  const config: Record<string, string> = {};
  for (const row of settings || []) {
    const r = row as any;
    config[r.key] = r.value;
  }

  const accessToken = config.gmail_oauth_access_token;
  const refreshToken = config.gmail_oauth_refresh_token;
  const clientId = config.gmail_oauth_client_id;
  const clientSecret = config.gmail_oauth_client_secret;

  if (!accessToken) {
    return null;
  }

  // Check if token is expired
  const tokenExpiry = parseInt(config.gmail_oauth_token_expiry || '0');
  const now = Date.now() / 1000;
  const isExpired = tokenExpiry && now > tokenExpiry;

  if (isExpired && refreshToken && clientId && clientSecret) {
    // Refresh the token
    try {
      const tokenUrl = 'https://oauth2.googleapis.com/token';
      const tokenResponse = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          refresh_token: refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'refresh_token',
        }),
      });

      if (tokenResponse.ok) {
        const tokenData = await tokenResponse.json();
        // Update access token in settings
        let updateStmt: any = db.prepare("UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?") as any;
        updateStmt = updateStmt.bind(tokenData.access_token);
        updateStmt = updateStmt.bind('gmail_oauth_access_token');
        await updateStmt.run();

        // Update expiry
        if (tokenData.expires_in) {
          let expiryStmt: any = db.prepare("UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?") as any;
          expiryStmt = expiryStmt.bind((now + tokenData.expires_in).toString());
          expiryStmt = expiryStmt.bind('gmail_oauth_token_expiry');
          await expiryStmt.run();
        }

        return tokenData.access_token;
      }
    } catch (e) {
      console.error('Token refresh failed:', e.message);
    }
  }

  return accessToken;
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

  // Try Gmail OAuth if configured
  if (sentVia === 'db') {
    stmt = db.prepare("SELECT key, value FROM settings WHERE key LIKE 'gmail_oauth_%'");
    const oauthSettings: any = await stmt.all();
    const oauthCfg: Record<string, string> = {};
    for (const row of oauthSettings || []) {
      const r = row as any;
      oauthCfg[r.key] = r.value;
    }

    const useOauth = oauthCfg.gmail_oauth_use_oauth === 'true';
    const fromEmail = oauthCfg.gmail_oauth_from_email || 'info@aetherahealthcare.com';
    const fromName = oauthCfg.gmail_oauth_from_name || 'Aethera Healthcare';

    if (useOauth && oauthCfg.gmail_oauth_access_token) {
      try {
        const accessToken = await getGmailOAuthTokens(db);
        if (accessToken) {
          const result = await sendViaGmailOAuth({
            accessToken,
            fromEmail,
            fromName,
            to: validated.to,
            subject: validated.subject || '',
            htmlBody: validated.body,
            textBody: validated.body.replace(/<[^>]*>/g, ''),
          });
          messageId = result.id || result.threadId || `oauth-${emailId.slice(0, 8)}`;
          sentVia = 'gmail-oauth';
          status = 'sent';
          sendError = null;
        }
      } catch (e: any) {
        console.error('Gmail OAuth failed:', e.message);
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
