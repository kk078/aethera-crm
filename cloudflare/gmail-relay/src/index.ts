// Gmail SMTP Relay for Aethera CRM
// Connects to smtp.gmail.com:465 via TLS and sends email
// Uses GMAIL_USERNAME and GMAIL_PASSWORD secrets (App Password recommended)

export interface Env {
  GMAIL_USERNAME?: string;
  GMAIL_PASSWORD?: string;
  GMAIL_USER_EMAIL?: string;
}

function b64(s: string): string {
  return btoa(unescape(encodeURIComponent(s)));
}

function buildMime(params: { to: string; subject: string; html: string; text: string; fromEmail: string; fromName: string }): string {
  const boundary = 'aethera-bnd-' + Date.now().toString(36);
  return [
    `From: ${params.fromName} <${params.fromEmail}>`,
    `To: ${params.to}`,
    `Subject: ${params.subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    b64(params.text),
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    b64(params.html),
    `--${boundary}--`,
  ].join('\n');
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Health check
    if (request.method === 'GET' && url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'healthy',
        configured: !!(env.GMAIL_USERNAME && env.GMAIL_PASSWORD),
        email: env.GMAIL_USER_EMAIL || 'info@aetherahealthcare.com',
        note: 'Set GMAIL_USERNAME and GMAIL_PASSWORD secrets. For Gmail use an App Password.',
        app_password_url: 'https://myaccount.google.com/apppasswords',
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Send email
    if (request.method === 'POST' && url.pathname === '/send') {
      try {
        const body: any = await request.json();
        const to = body.to;
        const subject = body.subject;
        const html_body = body.html_body;
        const from_email = body.from_email;
        const fromName = body.from_name || 'Aethera Healthcare';

        if (!to || !subject || !html_body) {
          return new Response(JSON.stringify({ error: 'Missing fields: to, subject, html_body' }), {
            status: 400, headers: { 'Content-Type': 'application/json' },
          });
        }

        const fromEmail = from_email || env.GMAIL_USER_EMAIL || 'info@aetherahealthcare.com';
        const username = env.GMAIL_USERNAME || fromEmail;
        const password = env.GMAIL_PASSWORD;

        if (!password) {
          return new Response(JSON.stringify({ error: 'GMAIL_PASSWORD secret not set' }), {
            status: 500, headers: { 'Content-Type': 'application/json' },
          });
        }

        const mimeMsg = buildMime({
          to, subject,
          html: html_body,
          text: html_body.replace(/<[^>]*>/g, ''),
          fromEmail, fromName,
        });

        // Connect to Gmail SMTP via secure TLS
        const socket = new Socket();
        await socket.connect({ host: 'smtp.gmail.com', port: 465, tls: true });

        const writer = socket.writable.getWriter();
        const reader = socket.readable.getReader();
        const enc = new TextEncoder();
        const dec = new TextDecoder();

        let buf = '';
        async function readLine(): Promise<string> {
          while (!buf.includes('\n')) {
            const { value, done } = await reader.read();
            if (done) break;
            buf += dec.decode(value, { stream: true });
          }
          const idx = buf.indexOf('\n');
          const line = buf.slice(0, idx === -1 ? buf.length : idx).trim();
          buf = idx === -1 ? '' : buf.slice(idx + 1);
          return line;
        }

        async function cmd(s: string): Promise<string> {
          await writer.write(enc.encode(s + '\r\n'));
          const r = await readLine();
          return r || '';
        }

        try {
          await readLine(); // greeting
          await cmd('EHLO aethera-crm');
          await cmd('AUTH LOGIN');
          await cmd(btoa(username));
          await cmd(btoa(password));
          await cmd(`MAIL FROM:<${username}>`);
          await cmd(`RCPT TO:<${to}>`);
          await cmd('DATA');
          await writer.write(enc.encode(mimeMsg + '\r\n.\r\n'));
          await readLine(); // OK or error
          await cmd('QUIT');
        } finally {
          reader.releaseLock();
          writer.releaseLock();
          try { socket.close(); } catch {}
        }

        return new Response(JSON.stringify({ success: true, message: `Sent to ${to}`, to, from: fromEmail }), {
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (e: any) {
        return new Response(JSON.stringify({ error: e?.message || 'Unknown error' }), {
          status: 500, headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // 404
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404, headers: { 'Content-Type': 'application/json' },
    });
  },
};
