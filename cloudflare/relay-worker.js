// Gmail Relay Worker for Aethera CRM
// This worker acts as a proxy to send emails via Gmail API
// Configuration:
// 1. Set up OAuth credentials in the worker environment variables
// 2. Add your refresh token to the worker secrets
// 3. Configure the relay URL in the CRM settings

const SHARED_SECRET = 'shared_secret';

// Environment variables should be set:
// - GMAIL_CLIENT_ID
// - GMAIL_CLIENT_SECRET
// - GMAIL_REFRESH_TOKEN (get this by going through OAuth flow once)
// - GMAIL_FROM_EMAIL
// - GMAIL_FROM_NAME

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    // Only POST allowed
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    // Check authorization
    const authHeader = request.headers.get('Authorization');
    const hasValidAuth = authHeader && (authHeader.includes(SHARED_SECRET) || authHeader.includes('Bearer '));

    if (!hasValidAuth) {
      return new Response('Unauthorized', { status: 401 });
    }

    try {
      const body = await request.json();
      const { to, subject, html_body, text_body, from_email, from_name, api_key } = body;

      if (!to || !subject || !html_body) {
        return new Response(JSON.stringify({ error: 'Missing required fields: to, subject, html_body' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Get OAuth token from env
      const clientId = env.GMAIL_CLIENT_ID || '280155650451-afhvc54egr4tm8tv24utp6mfcqe8qbku';
      const clientSecret = env.GMAIL_CLIENT_SECRET || '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';
      const refreshToken = env.GMAIL_REFRESH_TOKEN;
      const fromEmail = from_email || env.GMAIL_FROM_EMAIL || 'info@aetherahealthcare.com';
      const fromName = from_name || env.GMAIL_FROM_NAME || 'Aethera Healthcare';

      if (!refreshToken) {
        return new Response(JSON.stringify({ error: 'No refresh token configured. Please configure GMAIL_REFRESH_TOKEN in worker environment.' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Get access token
      const accessToken = await getAccessToken(clientId, clientSecret, refreshToken);

      // Send email via Gmail API
      const result = await sendEmail(
        to,
        subject,
        html_body,
        text_body || html_body.replace(/<[^>]*>/g, ''),
        fromEmail,
        fromName,
        accessToken
      );

      return new Response(JSON.stringify({
        success: true,
        id: result.id,
        thread_id: result.threadId,
        message: 'Email sent successfully',
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Relay error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },
};

async function getAccessToken(clientId, clientSecret, refreshToken) {
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!tokenResponse.ok) {
    const err = await tokenResponse.text();
    throw new Error(`Token refresh failed: ${err}`);
  }

  const data = await tokenResponse.json();
  return data.access_token;
}

async function sendEmail(to, subject, htmlBody, textBody, fromEmail, fromName, accessToken) {
  // Create MIME message
  const boundary = 'boundary-' + Date.now();

  let mimeMessage = `From: ${fromName} <${fromEmail}>\r\n`;
  mimeMessage += `To: ${to}\r\n`;
  mimeMessage += `Subject: ${subject}\r\n`;
  mimeMessage += `MIME-Version: 1.0\r\n`;
  mimeMessage += `Content-Type: multipart/alternative; boundary="${boundary}"\r\n`;
  mimeMessage += `\r\n--${boundary}\r\n`;
  mimeMessage += `Content-Type: text/plain; charset=UTF-8\r\n`;
  mimeMessage += `\r\n${textBody}\r\n`;
  mimeMessage += `\r\n--${boundary}\r\n`;
  mimeMessage += `Content-Type: text/html; charset=UTF-8\r\n`;
  mimeMessage += `\r\n${htmlBody}\r\n`;
  mimeMessage += `\r\n--${boundary}--\r\n`;

  const encodedMessage = btoa(mimeMessage)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const response = await fetch(
    'https://www.googleapis.com/upload/gmail/v1/users/me/messages/send',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: encodedMessage }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gmail API error (${response.status}): ${err}`);
  }

  return await response.json();
}
