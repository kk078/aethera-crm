import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { SignJWT } from 'jose';
import { generateId } from '../utils/helpers';
import { twilioConfigSchema, callOutcomeSchema } from '../utils/validation';
import { findBillingAnswer } from './billing-knowledge';
import { ErrorLogger } from '../utils/error-logger';
// Helper function to get DB binding
function getDB(c) {
    const db = c.env.DB;
    if (!db) {
        throw new HTTPException(500, { message: 'Database binding not available' });
    }
    return db;
}
// Helper function to get ErrorLogger instance
function getErrorLogger(c) {
    const db = getDB(c);
    return new ErrorLogger(db, 'twilio-webhook');
}
export const twilioRoutes = new Hono();
const NOTIFY_NUMBERS = ['+18135194640', '+18135870015', '+919003045325'];
const COMPANY = 'Aethera Healthcare Solutions';
twilioRoutes.get('/config', async (c) => {
    const user = c.get('user');
    if (!user)
        throw new HTTPException(401, { message: 'Authentication required' });
    const db = getDB(c);
    try {
        const stmt = db.prepare("SELECT key, value FROM settings WHERE key LIKE 'twilio_%'");
        const result = await stmt.all();
        const settings = result.results || [];
        const config = {};
        for (const row of settings) {
            const key = row.key.replace('twilio_', '');
            if (key === 'auth_token' || key === 'account_sid') {
                config[key] = row.value ? '••••••••' : '';
            }
            else {
                config[key] = row.value || '';
            }
        }
        return c.json({ data: { account_sid: config.account_sid || '', auth_token: config.auth_token || '', phone_number: config.phone_number || '', enabled: config.enabled === 'true' } });
    }
    catch (error) {
        console.error('Error fetching twilio config:', error);
        throw new HTTPException(500, { message: `Failed to fetch Twilio config: ${error.message}` });
    }
});
twilioRoutes.put('/config', async (c) => {
    const user = c.get('user');
    if (!user)
        throw new HTTPException(401, { message: 'Authentication required' });
    const body = await c.req.json();
    const validated = twilioConfigSchema.parse(body);
    const pairs = { twilio_account_sid: validated.account_sid, twilio_auth_token: validated.auth_token, twilio_phone_number: validated.phone_number, twilio_enabled: validated.enabled ? 'true' : 'false' };
    const db = getDB(c);
    for (const [key, value] of Object.entries(pairs)) {
        const existingStmt = db.prepare("SELECT id FROM settings WHERE key = ?");
        const existing = await existingStmt.bind(key).first();
        if (existing) {
            const updateStmt = db.prepare("UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?");
            await updateStmt.bind(value, key).run();
        }
        else {
            const insertStmt = db.prepare("INSERT INTO settings (id, key, value, category) VALUES (?, ?, ?, 'twilio')");
            await insertStmt.bind(generateId(), key, value).run();
        }
    }
    return c.json({ message: 'Twilio configuration saved successfully' });
});
async function getTwilioClient(c) {
    let accountSid = c.env.TWILIO_ACCOUNT_SID;
    let authToken = c.env.TWILIO_AUTH_TOKEN;
    if (!accountSid || !authToken) {
        const db = getDB(c);
        const sidStmt = db.prepare("SELECT value FROM settings WHERE key = ?");
        const sidSetting = await sidStmt.bind('twilio_account_sid').first();
        const tokenStmt = db.prepare("SELECT value FROM settings WHERE key = ?");
        const tokenSetting = await tokenStmt.bind('twilio_auth_token').first();
        if (sidSetting && sidSetting.value)
            accountSid = sidSetting.value;
        if (tokenSetting && tokenSetting.value)
            authToken = tokenSetting.value;
    }
    if (!accountSid || !authToken)
        throw new HTTPException(400, { message: 'Twilio not configured.' });
    return { baseUrl: 'https://api.twilio.com/2010-04-01', authHeader: `Basic ${btoa(`${accountSid}:${authToken}`)}`, accountSid };
}
// ───── Browser Softphone Access Token ─────
twilioRoutes.post('/token', async (c) => {
    const user = c.get('user');
    if (!user)
        throw new HTTPException(401, { message: 'Authentication required' });
    const accountSid = c.env.TWILIO_ACCOUNT_SID;
    const apiKeySid = c.env.TWILIO_API_KEY_SID;
    const apiKeySecret = c.env.TWILIO_API_KEY_SECRET;
    if (!accountSid || !apiKeySid || !apiKeySecret) {
        throw new HTTPException(400, { message: 'Twilio Voice SDK not configured. Set API Key secrets.' });
    }
    const identity = user.username || 'crm-rep';
    const twimlAppSid = 'APde40a24c2818a491e3be0cb2024e879b';
    const token = await new SignJWT({
        sub: accountSid,
        grants: {
            identity,
            voice: {
                incoming: { allow: true },
                outgoing: {
                    application_sid: twimlAppSid,
                    allow: true,
                },
            },
        },
    })
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT', cty: 'twilio-fpa;v=1' })
        .setIssuer(apiKeySid)
        .setSubject(accountSid)
        .setAudience(`https://api.twilio.com`)
        .setExpirationTime('1h')
        .setNotBefore('0s')
        .setIssuedAt()
        .sign(new TextEncoder().encode(apiKeySecret));
    return c.json({ data: { token, identity, expiration: Math.floor(Date.now() / 1000) + 3600 } });
});
async function sendSmsNotification(c, fromNumber, messageBody) {
    const { baseUrl, authHeader } = await getTwilioClient(c);
    for (const to of NOTIFY_NUMBERS) {
        try {
            const params = new URLSearchParams();
            params.append('To', to);
            params.append('From', fromNumber);
            params.append('Body', messageBody);
            await fetch(`${baseUrl}/Accounts/${c.env.TWILIO_ACCOUNT_SID}/Messages.json`, {
                method: 'POST', headers: { 'Authorization': authHeader, 'Content-Type': 'application/x-www-form-urlencoded' }, body: params,
            });
        }
        catch { }
    }
}
// ───── TwiML for Browser Softphone Outbound Calls ─────
// Called by Twilio when the browser Device initiates an outbound call
twilioRoutes.all('/voice', async (c) => {
    const body = await c.req.formData();
    const to = (body.get('To') || '');
    const fromNumber = c.env.TWILIO_PHONE_NUMBER || '+18636940325';
    // Connect browser caller to the provider's phone number
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${fromNumber}" record="from-answer" timeout="30">
    <Number statusCallbackEvent="initiated ringing answered completed"
            statusCallback="/api/v1/twilio/call-twiml/status"
            statusCallbackMethod="POST">
      ${to}
    </Number>
  </Dial>
</Response>`;
    return c.text(twiml, 200, { 'Content-Type': 'text/xml' });
});
// Make outbound call (REST API method - kept for API compatibility)
twilioRoutes.post('/calls', async (c) => {
    const user = c.get('user');
    if (!user)
        throw new HTTPException(401, { message: 'Authentication required' });
    const body = await c.req.json();
    const { to_number, from_number } = body;
    if (!to_number)
        throw new HTTPException(400, { message: 'To number is required' });
    const { baseUrl, authHeader } = await getTwilioClient(c);
    const fromNumber = from_number || c.env.TWILIO_PHONE_NUMBER;
    if (!fromNumber)
        throw new HTTPException(400, { message: 'From number not configured' });
    // Build webhook URL dynamically from request headers
    const host = c.req.header('x-forwarded-host') || c.req.header('host') || 'localhost';
    const protocol = c.req.header('x-forwarded-proto') || 'https';
    const webhookUrl = `${protocol}://${host.replace(/\/$/, '')}/api/v1/twilio/call-twiml`;
    const params = new URLSearchParams();
    params.append('To', to_number);
    params.append('From', fromNumber);
    params.append('Url', webhookUrl);
    params.append('StatusCallback', `${webhookUrl}/status`);
    params.append('Record', 'true');
    params.append('MachineDetection', 'Enable');
    const response = await fetch(`${baseUrl}/Accounts/${c.env.TWILIO_ACCOUNT_SID}/Calls.json`, {
        method: 'POST', headers: { 'Authorization': authHeader, 'Content-Type': 'application/x-www-form-urlencoded' }, body: params,
    });
    if (!response.ok) {
        const error = await response.json();
        throw new HTTPException(400, { message: `Twilio API error: ${error.message}` });
    }
    const call = await response.json();
    const callId = generateId();
    await getDB(c).prepare(`INSERT INTO phone_calls (id, twilio_call_sid, from_number, to_number, direction, status, owner_id, created_at) VALUES (?, ?, ?, ?, 'outbound', 'queued', ?, datetime('now'))`).bind(callId, call.sid, fromNumber, to_number, user?.id).run();
    return c.json({ message: 'Call initiated with AI assistant', data: { id: callId, twilio_call_sid: call.sid, status: call.status } });
});
// Send SMS
twilioRoutes.post('/sms', async (c) => {
    const user = c.get('user');
    if (!user)
        throw new HTTPException(401, { message: 'Authentication required' });
    const body = await c.req.json();
    const { to_number, body: messageBody, media_url } = body;
    if (!to_number || !messageBody)
        throw new HTTPException(400, { message: 'To number and message body are required' });
    const { baseUrl, authHeader } = await getTwilioClient(c);
    const fromNumber = c.env.TWILIO_PHONE_NUMBER;
    if (!fromNumber)
        throw new HTTPException(400, { message: 'Twilio phone number not configured' });
    const params = new URLSearchParams();
    params.append('To', to_number);
    params.append('From', fromNumber);
    params.append('Body', messageBody);
    if (media_url)
        params.append('MediaUrl', media_url);
    const response = await fetch(`${baseUrl}/Accounts/${c.env.TWILIO_ACCOUNT_SID}/Messages.json`, {
        method: 'POST', headers: { 'Authorization': authHeader, 'Content-Type': 'application/x-www-form-urlencoded' }, body: params,
    });
    if (!response.ok) {
        const error = await response.json();
        throw new HTTPException(400, { message: `Twilio API error: ${error.message}` });
    }
    const message = await response.json();
    return c.json({ message: 'SMS sent successfully', data: { twilio_message_sid: message.sid, status: message.status } });
});
// ───── Call Outcome ─────
twilioRoutes.patch('/calls/:id/outcome', async (c) => {
    const user = c.get('user');
    if (!user)
        throw new HTTPException(401, { message: 'Authentication required' });
    const { id } = c.req.param();
    const body = await c.req.json();
    const validated = callOutcomeSchema.parse(body);
    const db = getDB(c);
    const errorLogger = getErrorLogger(c);
    try {
        // UPSERT pattern: First try to find by twilio_call_sid, then by id
        let existing = await db.prepare('SELECT id, twilio_call_sid FROM phone_calls WHERE twilio_call_sid = ?').bind(id).first();
        if (!existing) {
            existing = await db.prepare('SELECT id, twilio_call_sid FROM phone_calls WHERE id = ?').bind(id).first();
        }
        const outcome = validated.outcome;
        const notes = `[OUTCOME:${outcome}] ${validated.notes || ''}`.trim();
        if (!existing) {
            // Create a new record with reconciled_post_call flag for cases where webhook didn't create one
            const newId = generateId();
            await db.prepare(`INSERT INTO phone_calls (id, twilio_call_sid, status, reconciled_post_call, created_at, updated_at) VALUES (?, ?, ?, 1, datetime('now'), datetime('now'))`).bind(newId, id, 'completed').run();
            await db.prepare(`UPDATE phone_calls SET notes = ?, status = ? WHERE id = ?`).bind(notes, outcome, newId).run();
        }
        else {
            // Update existing record with reconciliation flag
            const callId = existing.id;
            await db.prepare(`UPDATE phone_calls SET notes = ?, status = ?, reconciled_post_call = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(notes, outcome, callId).run();
        }
    }
    catch (e) {
        await errorLogger.logError(e, { id, outcome: validated.outcome });
        throw new HTTPException(500, { message: `Failed to save outcome: ${e.message}` });
    }
    return c.json({ message: 'Outcome saved', reconciled: true });
});
// ───── Pre-flight Call Initialization (for Optimistic UI) ─────
// Creates a Pending call record before Twilio connects, enabling optimistic UI updates
twilioRoutes.post('/calls/init', async (c) => {
    const user = c.get('user');
    if (!user)
        throw new HTTPException(401, { message: 'Authentication required' });
    const body = await c.req.json();
    const { from_number, to_number, direction = 'outbound' } = body;
    if (!to_number)
        throw new HTTPException(400, { message: 'To number is required' });
    const db = getDB(c);
    const errorLogger = getErrorLogger(c);
    try {
        const callId = generateId();
        const twilioCallSid = `pending-${callId}`;
        // Create a Pending record for optimistic UI
        await db.prepare(`
      INSERT INTO phone_calls (id, twilio_call_sid, from_number, to_number, direction, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'pending', datetime('now'))
    `).bind(callId, twilioCallSid, from_number || c.env.TWILIO_PHONE_NUMBER, to_number, direction).run();
        return c.json({
            message: 'Call initialized',
            data: { id: callId, status: 'pending', twilio_call_sid: twilioCallSid }
        });
    }
    catch (e) {
        await errorLogger.logError(e, { from_number, to_number, direction });
        throw new HTTPException(500, { message: `Failed to initialize call: ${e.message}` });
    }
});
// ───── AI Medical Billing Call TwiML ─────
twilioRoutes.all('/call-twiml', async (c) => {
    const body = await c.req.formData();
    const callSid = (body.get('CallSid') || '');
    const fromNumber = (body.get('From') || '');
    const toNumber = (body.get('To') || '');
    const speechResult = (body.get('SpeechResult') || '');
    const digits = (body.get('Digits') || '');
    const callStatus = (body.get('CallStatus') || '');
    const answeredBy = (body.get('AnsweredBy') || '');
    // Error logger for this webhook
    const errorLogger = getErrorLogger(c);
    // Store the call record
    let inboundCallId = null;
    if (callSid && callStatus) {
        try {
            const db = getDB(c);
            const existing = await db.prepare('SELECT id FROM phone_calls WHERE twilio_call_sid = ?').bind(callSid).first();
            if (!existing) {
                inboundCallId = generateId();
                await db.prepare(`INSERT INTO phone_calls (id, twilio_call_sid, from_number, to_number, direction, status, created_at) VALUES (?, ?, ?, ?, 'inbound', ?, datetime('now'))`).bind(inboundCallId, callSid, fromNumber, toNumber, callStatus).run();
            }
            else {
                inboundCallId = existing.id;
                await db.prepare(`UPDATE phone_calls SET status = ? WHERE twilio_call_sid = ?`).bind(callStatus, callSid).run();
            }
        }
        catch (e) {
            await errorLogger.logError(e, { callSid, fromNumber, toNumber, callStatus });
            console.error('Error storing call record:', e);
        }
    }
    // ───── Voicemail Detection ─────
    if (answeredBy === 'machine_start' || callStatus === 'no-answer') {
        let vmCallId = inboundCallId;
        try {
            if (!vmCallId) {
                vmCallId = generateId();
                const db = getDB(c);
                await db.prepare(`INSERT INTO phone_calls (id, twilio_call_sid, from_number, to_number, direction, status, created_at) VALUES (?, ?, ?, ?, 'inbound', 'voicemail', datetime('now'))`).bind(vmCallId, callSid, fromNumber, toNumber).run();
            }
        }
        catch (e) {
            await errorLogger.logError(e, { callSid, fromNumber, toNumber });
            console.error('Error creating voicemail record:', e);
        }
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">
    Thank you for calling ${COMPANY}. We are sorry that our representative is busy on another call, but feel free to leave a message and someone should be able to get back to you as soon as possible.
  </Say>
  <Record action="/api/v1/twilio/voicemail-callback?call_id=${vmCallId}" method="POST" maxLength="60" playBeep="true"/>
  <Say voice="Polly.Joanna">You did not leave a message. Goodbye.</Say>
  <Hangup/>
</Response>`;
        return c.text(twiml, 200, { 'Content-Type': 'text/xml' });
    }
    const query = speechResult || '';
    const pressedDigits = digits || '';
    // Handle "press 1 for specialist"
    if (pressedDigits === '1' || query.toLowerCase().includes('speak') || query.toLowerCase().includes('agent') || query.toLowerCase().includes('representative') || query.toLowerCase().includes('human') || query.toLowerCase().includes('person')) {
        const db = getDB(c);
        const callRecord = await db.prepare('SELECT id, transcription FROM phone_calls WHERE twilio_call_sid = ?').bind(callSid).first();
        if (callRecord) {
            const existingTrans = callRecord.transcription || '';
            await db.prepare(`UPDATE phone_calls SET transcription = ? WHERE twilio_call_sid = ?`).bind(existingTrans + `\nCaller requested to speak with a billing specialist.`, callSid).run();
        }
        const fromNum = c.env.TWILIO_PHONE_NUMBER || '+18636940325';
        await sendSmsNotification(c, fromNum, `📞 Callback requested from ${fromNumber} - called ${COMPANY} billing support and requested a specialist callback.`).catch(() => { });
        return c.text(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Your request has been noted. A billing specialist from ${COMPANY} will return your call within 24 hours. We have sent a notification to our team.</Say>
  <Say voice="Polly.Joanna">Before you go, would you like to hear answers to common billing questions? Press 1 for CPT codes, 2 for denial management, 3 for claim status.</Say>
  <Gather numDigits="1" action="/api/v1/twilio/call-twiml" method="POST" timeout="8"><Say voice="Polly.Joanna">Press a number now, or stay on the line.</Say></Gather>
  <Say voice="Polly.Joanna">Thank you for calling ${COMPANY}. Goodbye.</Say><Hangup/>
</Response>`, 200, { 'Content-Type': 'text/xml' });
    }
    if (pressedDigits === '2') {
        return c.text(`<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="Polly.Joanna">Denial management. Common denial reasons include missing codes, medical necessity issues, and timely filing problems. Submit an appeal letter with supporting documentation within 30 to 180 days depending on the payer.</Say><Gather input="speech dtmf" timeout="5" speechTimeout="auto" action="/api/v1/twilio/call-twiml" method="POST"><Say voice="Polly.Joanna">Would you like to ask another question? Press 1 or say yes. Press 2 or say no.</Say></Gather><Say voice="Polly.Joanna">Thank you. Goodbye.</Say><Hangup/></Response>`, 200, { 'Content-Type': 'text/xml' });
    }
    if (pressedDigits === '3') {
        return c.text(`<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="Polly.Joanna">Claim status inquiries are handled by our billing team. Please have your claim ID ready. A representative will follow up within 48 hours.</Say><Hangup/></Response>`, 200, { 'Content-Type': 'text/xml' });
    }
    if (query) {
        const results = findBillingAnswer(query);
        let responseText = '';
        if (results.length > 0) {
            responseText = `Based on your question about ${results[0].topic}, here is the information: ${results[0].answer}`;
            if (results.length > 1) {
                responseText += ` I also found information about ${results.slice(1).map(r => r.topic).join(', ')}.`;
            }
        }
        else {
            responseText = 'I could not find a specific answer in our billing knowledge base. You can say "denial management", "CPT codes", or "claim status" for common topics.';
        }
        const db = getDB(c);
        const callRecord = await db.prepare('SELECT id, transcription FROM phone_calls WHERE twilio_call_sid = ?').bind(callSid).first();
        if (callRecord) {
            const existingTrans = callRecord.transcription || '';
            await db.prepare(`UPDATE phone_calls SET transcription = ? WHERE twilio_call_sid = ?`).bind(existingTrans + `\nCaller: ${query}\nAI: ${responseText}`, callSid).run();
        }
        return c.text(`<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="Polly.Joanna">${escapeXml(responseText)}</Say><Gather input="speech dtmf" timeout="5" numDigits="1" speechTimeout="auto" action="/api/v1/twilio/call-twiml" method="POST"><Say voice="Polly.Joanna">Would you like to ask another question? Press 1 or say yes to continue. Press 2 or say no to end.</Say></Gather><Say voice="Polly.Joanna">Thank you for calling ${COMPANY}. Goodbye.</Say><Hangup/></Response>`, 200, { 'Content-Type': 'text/xml' });
    }
    // Initial greeting
    return c.text(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Welcome to ${COMPANY} Billing Support. I am your AI-powered billing assistant. I can help you with medical coding, denial management, claim status, CPT codes, ICD-10 codes, revenue cycle management, and more. You can also press 1 to speak with a billing specialist. What would you like to know?</Say>
  <Gather input="speech dtmf" timeout="5" numDigits="1" speechTimeout="auto" action="/api/v1/twilio/call-twiml" method="POST">
    <Say voice="Polly.Joanna">For example, you can ask about CPT 99214, denial appeals, modifier 25, prior authorization, or Medicare billing. Please speak your question now.</Say>
  </Gather>
  <Say voice="Polly.Joanna">I did not hear a response. Please call back when you are ready. Goodbye.</Say>
  <Hangup/>
</Response>`, 200, { 'Content-Type': 'text/xml' });
});
// ───── Voicemail Recording Callback ─────
twilioRoutes.all('/voicemail-callback', async (c) => {
    const body = await c.req.formData();
    const callSid = (body.get('CallSid') || '');
    const fromNumber = (body.get('From') || '');
    const recordingUrl = (body.get('RecordingUrl') || '');
    const recordingSid = (body.get('RecordingSid') || '');
    const callIdFromQuery = c.req.query('call_id') || '';
    const errorLogger = getErrorLogger(c);
    try {
        if (recordingUrl && callIdFromQuery) {
            await getDB(c).prepare(`UPDATE phone_calls SET recording_url = ?, status = 'voicemail' WHERE id = ?`).bind(recordingUrl, callIdFromQuery).run();
        }
        else if (recordingUrl && callSid) {
            await getDB(c).prepare(`UPDATE phone_calls SET recording_url = ?, status = 'voicemail' WHERE twilio_call_sid = ?`).bind(recordingUrl, callSid).run();
        }
        else if (recordingUrl && callIdFromQuery === '' && callSid === '') {
            await errorLogger.logWarning('Voicemail callback called without call_id or call_sid', { recordingUrl });
        }
    }
    catch (e) {
        await errorLogger.logError(e, { recordingUrl, callIdFromQuery, callSid });
    }
    const fromNum = c.env.TWILIO_PHONE_NUMBER || '+18636940325';
    const msg = `📞 New voicemail from ${fromNumber}. Listen: ${recordingUrl}`;
    try {
        await sendSmsNotification(c, fromNum, msg);
    }
    catch (e) {
        await errorLogger.logError(e, { fromNumber, recordingUrl });
    }
    return c.text(`<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="Polly.Joanna">Your message has been recorded. Someone from ${COMPANY} will get back to you shortly. Goodbye.</Say><Hangup/></Response>`, 200, { 'Content-Type': 'text/xml' });
});
function escapeXml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
// Call status callback
twilioRoutes.all('/call-twiml/status', async (c) => {
    const body = await c.req.formData();
    const callSid = (body.get('CallSid') || '');
    const callStatus = (body.get('CallStatus') || '');
    const duration = (body.get('CallDuration') || '');
    const recordingUrl = (body.get('RecordingUrl') || '');
    const answeredBy = (body.get('AnsweredBy') || '');
    const errorLogger = getErrorLogger(c);
    try {
        if (callSid) {
            await getDB(c).prepare(`UPDATE phone_calls SET status = ?, duration = ?, recording_url = ? WHERE twilio_call_sid = ?`).bind(callStatus, duration ? parseInt(duration) : null, recordingUrl, callSid).run();
            // Auto-detect outcome from duration
            if (callStatus === 'completed' && duration) {
                const dur = parseInt(duration);
                if (dur < 15) {
                    await getDB(c).prepare(`UPDATE phone_calls SET notes = ? WHERE twilio_call_sid = ?`).bind(`[OUTCOME:no_answer] Call lasted ${dur}s`, callSid).run();
                }
                else if (dur > 120) {
                    await getDB(c).prepare(`UPDATE phone_calls SET notes = ? WHERE twilio_call_sid = ?`).bind(`[OUTCOME:interested_positive] Call lasted ${dur}s`, callSid).run();
                }
            }
        }
    }
    catch (e) {
        await errorLogger.logError(e, { callSid, callStatus, duration, recordingUrl });
    }
    return c.text('OK');
});
// Existing webhook
twilioRoutes.post('/webhook', async (c) => {
    const body = await c.req.formData();
    const errorLogger = getErrorLogger(c);
    try {
        if (body.get('MessageSid')) {
            const messageSid = body.get('MessageSid');
            const from = body.get('From');
            const to = body.get('To');
            const messageBody = body.get('Body');
            await getDB(c).prepare(`INSERT INTO phone_calls (id, twilio_call_sid, from_number, to_number, direction, status, transcription) VALUES (?, ?, ?, ?, 'inbound', 'received', ?)`).bind(generateId(), messageSid, from, to, messageBody).run();
        }
    }
    catch (e) {
        await errorLogger.logError(e, { messageSid: body.get('MessageSid') });
    }
    return c.json({ success: true });
});
// Get call logs
twilioRoutes.get('/calls/log', async (c) => {
    const user = c.get('user');
    if (!user)
        throw new HTTPException(401, { message: 'Authentication required' });
    const query = c.req.query();
    let whereClause = 'WHERE 1=1';
    const bindings = [];
    if (user?.role !== 'admin') {
        whereClause += ' AND owner_id = ?';
        bindings.push(user?.id);
    }
    if (query.status) {
        whereClause += ' AND status = ?';
        bindings.push(query.status);
    }
    if (query.direction) {
        whereClause += ' AND direction = ?';
        bindings.push(query.direction);
    }
    const db = getDB(c);
    const queryBindings = [];
    if (user?.role !== 'admin') {
        whereClause += ' AND owner_id = ?';
        queryBindings.push(user?.id);
    }
    if (query.status) {
        whereClause += ' AND status = ?';
        queryBindings.push(query.status);
    }
    if (query.direction) {
        whereClause += ' AND direction = ?';
        queryBindings.push(query.direction);
    }
    const calls = await db.prepare(`SELECT pc.*, c.first_name, c.last_name FROM phone_calls pc LEFT JOIN contacts c ON pc.contact_id = c.id ${whereClause} ORDER BY pc.created_at DESC LIMIT 50`).bind(...queryBindings).all();
    return c.json({ data: calls || [] });
});
// Get call by SID
twilioRoutes.get('/calls/:sid', async (c) => {
    const user = c.get('user');
    if (!user)
        throw new HTTPException(401, { message: 'Authentication required' });
    const { sid } = c.req.param();
    const { baseUrl, authHeader } = await getTwilioClient(c);
    const response = await fetch(`${baseUrl}/Accounts/${c.env.TWILIO_ACCOUNT_SID}/Calls/${sid}.json`, { headers: { 'Authorization': authHeader } });
    if (!response.ok)
        throw new HTTPException(404, { message: 'Call not found' });
    const call = await response.json();
    const db = getDB(c);
    const dbCall = await db.prepare('SELECT * FROM phone_calls WHERE twilio_call_sid = ?').bind(sid).first();
    return c.json({ data: { ...call, crm_record: dbCall } });
});
// Recording
twilioRoutes.get('/recordings/:sid', async (c) => {
    const { sid } = c.req.param();
    const { baseUrl, authHeader } = await getTwilioClient(c);
    const response = await fetch(`${baseUrl}/Accounts/${c.env.TWILIO_ACCOUNT_SID}/Recordings/${sid}.json`, { headers: { 'Authorization': authHeader } });
    if (!response.ok)
        throw new HTTPException(404, { message: 'Recording not found' });
    return c.json({ data: await response.json() });
});
// Usage stats
twilioRoutes.get('/usage/stats', async (c) => {
    const { baseUrl, authHeader } = await getTwilioClient(c);
    const response = await fetch(`${baseUrl}/Accounts/${c.env.TWILIO_ACCOUNT_SID}/Usage/Records/ThisMonth.json`, { headers: { 'Authorization': authHeader } });
    if (!response.ok)
        throw new HTTPException(400, { message: 'Failed to fetch usage' });
    const usage = await response.json();
    return c.json({ data: { usage_records: usage.usage_records || [] } });
});
// ───── Status Reconciliation (for Cron Job) ─────
// Sync missing Twilio SIDs from the last hour that are missing from the phone_calls table
twilioRoutes.post('/reconcile', async (c) => {
    const user = c.get('user');
    if (!user)
        throw new HTTPException(401, { message: 'Authentication required' });
    if (user.role !== 'admin')
        throw new HTTPException(403, { message: 'Admin access required' });
    const errorLogger = getErrorLogger(c);
    const db = getDB(c);
    try {
        const { hours = 1 } = await c.req.json();
        // Get Twilio configuration
        const { baseUrl, authHeader, accountSid } = await getTwilioClient(c);
        // Fetch calls from Twilio API from the last N hours
        const since = new Date();
        since.setHours(since.getHours() - hours);
        const response = await fetch(`${baseUrl}/Accounts/${accountSid}/Calls.json?DateCreated>=${since.toISOString()}`, { headers: { 'Authorization': authHeader } });
        if (!response.ok) {
            const error = await response.json();
            throw new HTTPException(400, { message: `Twilio API error: ${error.message}` });
        }
        const data = await response.json();
        const calls = data.calls || [];
        let imported = 0;
        let existing = 0;
        for (const call of calls) {
            const sid = call.sid;
            const existingRecord = await db.prepare('SELECT id FROM phone_calls WHERE twilio_call_sid = ?').bind(sid).first();
            if (!existingRecord) {
                // Create record from Twilio data
                const callId = generateId();
                await db.prepare(`
          INSERT INTO phone_calls (id, twilio_call_sid, from_number, to_number, direction, status, duration, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(callId, sid, call.from || null, call.to || null, call.direction === 'inbound' ? 'inbound' : 'outbound', call.status, call.duration ? parseInt(call.duration) : null, call.date_created || new Date().toISOString()).run();
                imported++;
            }
            else {
                existing++;
            }
        }
        await ErrorLogger.logToSystem(db, 'INFO', 'twilio-reconciliation', `Reconciliation completed`, {
            imported,
            existing,
            hours,
        });
        return c.json({
            message: 'Reconciliation completed',
            imported,
            existing,
            total: calls.length,
        });
    }
    catch (e) {
        await errorLogger.logError(e, { hours: c.req.json().then((j) => j.hours || 1) });
        throw new HTTPException(500, { message: `Reconciliation failed: ${e.message}` });
    }
});
