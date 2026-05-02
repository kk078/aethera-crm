// Gmail Relay Worker for Aethera CRM
// This worker acts as a proxy to send emails via Gmail API
//
// Setup Instructions:
// 1. Get OAuth authorization code by visiting:
//    https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=280155650451-afhvc54egr4tm8tv24utp6mfcqe8qbku&redirect_uri=urn%3Aietf%3Awg%3Aoauth%3A2.0%3Aoob&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fgmail.send%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fgmail.readonly%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.email%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.profile&access_type=offline&prompt=consent
// 2. Exchange the code for tokens using:
//    curl -X POST https://oauth2.googleapis.com/token \
//      -d client_id=280155650451-afhvc54egr4tm8tv24utp6mfcqe8qbku \
//      -d client_secret=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 \
//      -d code=YOUR_AUTH_CODE \
//      -d redirect_uri=urn:ietf:wg:oauth:2.0:oob \
//      -d grant_type=authorization_code
// 3. Add the refresh token as a worker secret:
//    npx wrangler secret put GMAIL_REFRESH_TOKEN --env production
// 4. Update CRM settings to use: https://relay-email-proxy-production.aetherahealthcare.workers.dev
//
// The relay worker will automatically refresh tokens when they expire.

const SHARED_SECRET = 'shared_secret';

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
        return new Response(JSON.stringify({
          error: 'No refresh token configured',
          instructions: 'Please configure GMAIL_REFRESH_TOKEN secret. To get a refresh token:\n1. Visit the OAuth auth URL in your browser\n2. Sign in with info@aetherahealthcare.com\n3. Allow the requested permissions\n4. Exchange the authorization code via the /emails/oauth/token endpoint\n5. Add the refresh token as a worker secret',
          current_config: {
            client_id: clientId,
            from_email: fromEmail,
            from_name: fromName,
          },
        }), {
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
        message: 'Email sent successfully via Gmail API',
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Relay error:', error);
      return new Response(JSON.stringify({
        error: error.message,
        details: error.stack?.split('\n').slice(0, 3).join('\n'),
      }), {
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
