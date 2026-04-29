import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { getSpecialtyData, getValuePropositions, getCommonPainPoints, getOutreachResponse } from './billing-knowledge';
export const aiRoutes = new Hono();
function hasAIBinding(c) {
    return !!c.env.AI && typeof c.env.AI.run === 'function';
}
aiRoutes.get('/', async (c) => {
    return c.json({
        message: 'AI Gateway API',
        version: '1.0.0',
        ai_gateway_configured: hasAIBinding(c),
        endpoints: {
            outreach_flow: 'POST /ai/outreach-flow',
            call_preview: 'POST /ai/call-preview',
            call_assist: 'POST /ai/call/assist',
            lead_scoring: 'POST /ai/score/lead',
            sentiment_analysis: 'POST /ai/analyze/sentiment',
            call_summary: 'POST /ai/summarize/call',
            smart_search: 'POST /ai/search',
        },
    });
});
// ───── Outreach Call Flow Assistant (Real-Time) ─────
aiRoutes.post('/outreach-flow', async (c) => {
    const body = await c.req.json();
    const { query, specialty, current_phase, conversation_log } = body;
    if (!query)
        throw new HTTPException(400, { message: 'Query is required' });
    const result = getOutreachResponse(query, specialty || 'General Practice', current_phase || 'hook', conversation_log || []);
    return c.json({ data: result });
});
// ───── Call Preview (Pre-Call Provider Briefing) ─────
aiRoutes.post('/call-preview', async (c) => {
    const body = await c.req.json();
    const { npi_or_phone } = body;
    if (!npi_or_phone)
        throw new HTTPException(400, { message: 'NPI or phone is required' });
    // Try to find provider by NPI
    let provider = null;
    const cleanNumber = npi_or_phone.replace(/\D/g, '');
    const isNpi = cleanNumber.length === 10 && /^\d{10}$/.test(cleanNumber);
    if (isNpi) {
        provider = await c.env.DB.prepare(`SELECT * FROM npi_providers WHERE npi = ?`).bind(cleanNumber).first();
    }
    if (!provider && cleanNumber.length >= 10) {
        // Search by phone
        provider = await c.env.DB.prepare(`SELECT * FROM npi_providers WHERE phone LIKE ?`).bind(`%${cleanNumber.slice(-10)}%`).first();
    }
    const specialty = provider?.specialty_primary || 'General Practice';
    const specialtyData = getSpecialtyData(specialty);
    // Get call history
    const callHistory = await c.env.DB.prepare(`SELECT id, status, duration, transcription, ai_summary, sentiment_score, created_at FROM phone_calls WHERE from_number LIKE ? OR to_number LIKE ? ORDER BY created_at DESC LIMIT 5`).bind(`%${cleanNumber.slice(-10)}%`, `%${cleanNumber.slice(-10)}%`).all();
    const historyList = callHistory.results || [];
    // Compute sentiment trend
    let sentimentTrend = 'neutral';
    let sentimentWarning = null;
    if (historyList.length > 0) {
        const negativeCalls = historyList.filter((h) => h.sentiment_score !== null && h.sentiment_score < -0.2).length;
        if (negativeCalls > 1) {
            sentimentTrend = 'negative';
            sentimentWarning = '⚠️ Provider had multiple negative experience calls. Suggested opener: "Thank you for your time. I\'d like to address any concerns from prior conversations first."';
        }
    }
    const totalCalls = historyList.length;
    const lastCall = historyList[0];
    // Generate suggested opening
    const painPoints = getCommonPainPoints(specialty);
    const openingScript = `Hello, this is [Your Name] from Aethera Healthcare Solutions. I'm reaching out specifically regarding ${painPoints.slice(0, 2).join(' and ')} — areas where many ${specialty} practices face billing challenges. Do you have a few minutes to discuss?`;
    return c.json({
        data: {
            provider: provider ? {
                name: provider.provider_type === 'individual'
                    ? `Dr. ${provider.first_name} ${provider.last_name}`.trim()
                    : provider.organization_name || '',
                specialty: provider.specialty_primary || null,
                city: provider.city || null,
                state: provider.state || null,
                npi: provider.npi || null,
                phone: provider.phone || null,
                email: provider.email || null,
            } : null,
            call_history: {
                total_calls: totalCalls,
                last_call_date: lastCall?.created_at || null,
                last_outcome: lastCall?.status || null,
                sentiment_trend: sentimentTrend,
                recent_calls: historyList.slice(0, 3),
            },
            suggested_script: {
                opening: openingScript,
                value_propositions: getValuePropositions(specialty),
                objections: specialtyData.objections.map(o => ({ objection: o.objection, response: o.response })),
                common_pain_points: painPoints,
            },
            sentiment_warning: sentimentWarning,
        },
    });
});
// ───── Call Assistance (Twilio + AI + Objections) ─────
aiRoutes.post('/call/assist', async (c) => {
    const body = await c.req.json();
    const { call_id, transcription, recording_url } = body;
    if (!call_id)
        throw new HTTPException(400, { message: 'Call ID is required' });
    let callRecord = await c.env.DB.prepare('SELECT * FROM phone_calls WHERE id = ?').bind(call_id).first();
    if (!callRecord)
        callRecord = await c.env.DB.prepare('SELECT * FROM phone_calls WHERE twilio_call_sid = ?').bind(call_id).first();
    const result = {
        call: callRecord ? {
            id: callRecord.id,
            from: callRecord.from_number,
            to: callRecord.to_number,
            status: callRecord.status,
            duration: callRecord.duration,
        } : { id: call_id },
        assistance: { suggestions: [], script: null, objections: [], value_props: [] },
    };
    const status = callRecord?.status || '';
    const fromNumber = callRecord?.from_number || '';
    if (status === 'queued' || status === 'ringing') {
        result.assistance.suggestions = [
            'Introduce yourself and your organization clearly',
            'Confirm you are speaking with the right person',
            'State the purpose of the call upfront',
            'Ask if they have a few minutes to talk',
        ];
    }
    else if (status === 'in-progress' || status === 'completed') {
        result.assistance.suggestions = [
            'Summarize key points before ending the call',
            'Confirm next steps and follow-up actions',
            'Thank the provider for their time',
        ];
    }
    if (fromNumber) {
        result.assistance.suggestions.push('Reference any prior communications or interactions');
        result.assistance.suggestions.push('Ask about their current needs and challenges');
    }
    // Load value propositions and objections if we can determine specialty
    const specialty = 'General Practice';
    const specData = getSpecialtyData(specialty);
    result.assistance.objections = specData.objections;
    result.assistance.value_props = getValuePropositions(specialty);
    result.assistance.script = {
        opening: 'Hello, this is [Your Name] from Aethera Healthcare Solutions. Am I speaking with [Provider Name]?',
        purpose: `I'm reaching out regarding how we can support your practice's revenue cycle.`,
        closing: 'Thank you for your time. I will send you a follow-up email with more details.',
    };
    if (transcription && hasAIBinding(c)) {
        try {
            const summaryResp = await c.env.AI.run('@cf/meta/llama-3.1-70b-instruct', {
                messages: [{ role: 'user', content: `Summarize this call transcription in 2-3 sentences and list 3 action items:\n${transcription}\nReturn ONLY a JSON object with keys "summary" and "action_items" (array).` }],
            });
            const parsed = JSON.parse(summaryResp.response);
            result.assistance.ai_summary = parsed.summary;
            result.assistance.ai_action_items = parsed.action_items;
        }
        catch { }
    }
    if (transcription)
        result.assistance.sentiment = analyzeSentiment(transcription);
    return c.json({ data: result });
});
function analyzeSentiment(text) {
    const positiveWords = ['yes', 'great', 'interested', 'good', 'excellent', 'thanks', 'perfect', 'yes please', 'sounds good', 'helpful', 'wonderful'];
    const negativeWords = ['no', 'not interested', 'stop', 'don\'t call', 'busy', 'wrong number', 'remove', 'block', 'never', 'bad', 'terrible'];
    const lower = text.toLowerCase();
    let score = 0;
    for (const w of positiveWords) {
        if (lower.includes(w))
            score += 0.15;
    }
    for (const w of negativeWords) {
        if (lower.includes(w))
            score -= 0.2;
    }
    score = Math.max(-1, Math.min(1, score));
    const label = score > 0.15 ? 'positive' : score < -0.15 ? 'negative' : 'neutral';
    return { score: Math.round(score * 100) / 100, label };
}
// ───── Lead Scoring ─────
aiRoutes.post('/score/lead', async (c) => {
    const body = await c.req.json();
    const { lead_id } = body;
    if (!lead_id)
        throw new HTTPException(400, { message: 'Lead ID is required' });
    const lead = await c.env.DB.prepare('SELECT * FROM leads WHERE id = ?').bind(lead_id).first();
    if (!lead)
        throw new HTTPException(404, { message: 'Lead not found' });
    let score = 50;
    const factors = [];
    if (lead.npi) {
        score += 10;
        factors.push({ factor: 'Has NPI number', impact: 10 });
    }
    if (lead.email) {
        score += 10;
        factors.push({ factor: 'Has email address', impact: 10 });
    }
    if (lead.phone) {
        score += 10;
        factors.push({ factor: 'Has phone number', impact: 10 });
    }
    if (lead.specialty) {
        score += 5;
        factors.push({ factor: `Specialty: ${lead.specialty}`, impact: 5 });
    }
    score = Math.min(100, Math.max(0, score));
    await c.env.DB.prepare('UPDATE leads SET lead_score = ?, score_factors = ? WHERE id = ?').bind(score, JSON.stringify(factors), lead_id).run();
    return c.json({ data: { lead_id, score, factors, method: 'rule-based' } });
});
// ───── Sentiment Analysis ─────
aiRoutes.post('/analyze/sentiment', async (c) => {
    const body = await c.req.json();
    const { text } = body;
    if (!text)
        throw new HTTPException(400, { message: 'Text is required' });
    return c.json({ data: analyzeSentiment(text) });
});
// ───── Call Summarization ─────
aiRoutes.post('/summarize/call', async (c) => {
    const body = await c.req.json();
    const { transcription, call_id } = body;
    let callTranscription = transcription;
    if (call_id && !transcription) {
        const call = await c.env.DB.prepare('SELECT transcription FROM phone_calls WHERE id = ? OR twilio_call_sid = ?').bind(call_id, call_id).first();
        if (!call || !call.transcription)
            throw new HTTPException(404, { message: 'Call or transcription not found' });
        callTranscription = call.transcription;
    }
    if (!callTranscription)
        throw new HTTPException(400, { message: 'No transcription available.' });
    const lines = callTranscription.split('.').filter((l) => l.trim().length > 0);
    const summary = lines.length > 0 ? `Call with ${lines.length} key points discussed. ${lines[0]}.` : 'Call transcript recorded.';
    const actionItems = [];
    const lower = callTranscription.toLowerCase();
    if (lower.includes('follow'))
        actionItems.push('Schedule follow-up');
    if (lower.includes('email') || lower.includes('send'))
        actionItems.push('Send information via email');
    if (lower.includes('call back') || lower.includes('callback'))
        actionItems.push('Schedule callback');
    if (lower.includes('meeting') || lower.includes('appointment'))
        actionItems.push('Confirm appointment');
    if (actionItems.length === 0)
        actionItems.push('Review call transcript for action items');
    const sentiment = analyzeSentiment(callTranscription);
    const result = { summary, action_items: actionItems, key_points: lines.slice(0, 3).map((l) => l.trim()) || ['No key points extracted'], sentiment: sentiment.label, sentiment_score: sentiment.score, follow_up_required: sentiment.label !== 'positive' || actionItems.length > 1, method: 'rule-based' };
    if (call_id) {
        await c.env.DB.prepare('UPDATE phone_calls SET ai_summary = ?, sentiment_score = ? WHERE id = ? OR twilio_call_sid = ?').bind(result.summary, sentiment.score, call_id, call_id).run();
    }
    return c.json({ data: result });
});
// ───── Smart Search ─────
aiRoutes.post('/search', async (c) => {
    const body = await c.req.json();
    const { query, limit } = body;
    if (!query)
        throw new HTTPException(400, { message: 'Search query is required' });
    const searchTerm = `%${query}%`;
    const results = await c.env.DB.prepare(`
    (SELECT 'contact' as type, id, first_name || ' ' || last_name as title, email, created_at FROM contacts WHERE first_name LIKE ? OR last_name LIKE ? OR email LIKE ? LIMIT ?)
    UNION (SELECT 'lead' as type, id, first_name || ' ' || last_name as title, email, created_at FROM leads WHERE first_name LIKE ? OR last_name LIKE ? OR company LIKE ? LIMIT ?)
    UNION (SELECT 'organization' as type, id, name as title, email, created_at FROM organizations WHERE name LIKE ? LIMIT ?)
    UNION (SELECT 'provider' as type, id, organization_name || ' ' || first_name || ' ' || last_name, email, created_at FROM npi_providers WHERE first_name LIKE ? OR last_name LIKE ? OR organization_name LIKE ? OR specialty_primary LIKE ? LIMIT ?)
  `).bind(searchTerm, searchTerm, searchTerm, limit || 10, searchTerm, searchTerm, searchTerm, limit || 10, searchTerm, limit || 10, searchTerm, searchTerm, searchTerm, searchTerm, limit || 10).all();
    return c.json({ data: { results: results || [], query, total: results?.length || 0 } });
});
// ───── Predictions ─────
aiRoutes.get('/predictions/:type/:id', async (c) => {
    const { type, id } = c.req.param();
    const predictions = await c.env.DB.prepare('SELECT * FROM ai_predictions WHERE record_type = ? AND record_id = ? ORDER BY created_at DESC LIMIT 10').bind(type, id).all();
    return c.json({ data: predictions || [] });
});
// ───── Status ─────
aiRoutes.get('/status', async (c) => {
    const models = await c.env.DB.prepare('SELECT * FROM ai_models WHERE is_active = 1').all();
    return c.json({ data: { models: models.results || [], ai_gateway_configured: hasAIBinding(c), note: hasAIBinding(c) ? 'AI Gateway configured' : 'AI Gateway not configured. Rule-based features work without it.' } });
});
export default aiRoutes;
