import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { generateId } from '../utils/helpers';
import { getSpecialtyData, getObjectionResponse, getValuePropositions, getCommonPainPoints, getOutreachResponse } from './billing-knowledge';
import type { AppEnv } from '../types';

export const aiRoutes = new Hono<AppEnv>();

function hasAIBinding(c: any): boolean {
  return !!(c.env as any).AI && typeof (c.env as any).AI.run === 'function';
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
      intent_classification: 'POST /ai/classify/intent',
      call_outcome_prediction: 'POST /ai/predict/call-outcome',
      voice_transcription: 'POST /ai/transcribe/realtime',
    },
  });
});

// ───── Outreach Call Flow Assistant (Real-Time) ─────
aiRoutes.post('/outreach-flow', async (c) => {
  const body = await c.req.json();
  const { query, specialty, current_phase, conversation_log } = body;

  if (!query) throw new HTTPException(400, { message: 'Query is required' });

  const result = getOutreachResponse(
    query,
    specialty || 'General Practice',
    current_phase || 'hook',
    conversation_log || []
  );

  return c.json({ data: result });
});

// ───── Call Preview (Pre-Call Provider Briefing) ─────
aiRoutes.post('/call-preview', async (c) => {
  const body = await c.req.json();
  const { npi_or_phone } = body;
  if (!npi_or_phone) throw new HTTPException(400, { message: 'NPI or phone is required' });

  // Try to find provider by NPI
  let provider: any = null;
  const cleanNumber = npi_or_phone.replace(/\D/g, '');
  const isNpi = cleanNumber.length === 10 && /^\d{10}$/.test(cleanNumber);

  if (isNpi) {
    provider = await ((c as any).env as any).DB.prepare(`SELECT * FROM npi_providers WHERE npi = ?`).bind(cleanNumber).first();
  }
  if (!provider && cleanNumber.length >= 10) {
    // Search by phone
    provider = await ((c as any).env as any).DB.prepare(`SELECT * FROM npi_providers WHERE phone LIKE ?`).bind(`%${cleanNumber.slice(-10)}%`).first();
  }

  const specialty = (provider as any)?.specialty_primary || 'General Practice';
  const specialtyData = getSpecialtyData(specialty);

  // Get call history
  const result: any = await ((c as any).env as any).DB.prepare(
    `SELECT id, status, duration, transcription, ai_summary, sentiment_score, created_at FROM phone_calls WHERE from_number LIKE ? OR to_number LIKE ? ORDER BY created_at DESC LIMIT 5`
  ).bind(`%${cleanNumber.slice(-10)}%`, `%${cleanNumber.slice(-10)}%`).all();
  const historyList = result.results || [];

  // Compute sentiment trend
  let sentimentTrend = 'neutral';
  let sentimentWarning: string | null = null;
  if (historyList.length > 0) {
    const negativeCalls = historyList.filter((h: any) => h.sentiment_score !== null && h.sentiment_score < -0.2).length;
    if (negativeCalls > 1) {
      sentimentTrend = 'negative';
      sentimentWarning = '⚠️ Provider had multiple negative experience calls. Suggested opener: "Thank you for your time. I\'d like to address any concerns from prior conversations first."';
    }
  }

  const totalCalls = historyList.length;
  const lastCall = historyList[0] as any;

  // Generate suggested opening
  const painPoints = getCommonPainPoints(specialty);
  const openingScript = `Hello, this is [Your Name] from Aethera Healthcare Solutions. I'm reaching out specifically regarding ${painPoints.slice(0, 2).join(' and ')} — areas where many ${specialty} practices face billing challenges. Do you have a few minutes to discuss?`;

  return c.json({
    data: {
      provider: provider ? {
        name: (provider as any).provider_type === 'individual'
          ? `Dr. ${(provider as any).first_name} ${(provider as any).last_name}`.trim()
          : (provider as any).organization_name || '',
        specialty: (provider as any).specialty_primary || null,
        city: (provider as any).city || null,
        state: (provider as any).state || null,
        npi: (provider as any).npi || null,
        phone: (provider as any).phone || null,
        email: (provider as any).email || null,
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

  if (!call_id) throw new HTTPException(400, { message: 'Call ID is required' });

  let callRecord = await ((c as any).env as any).DB.prepare('SELECT * FROM phone_calls WHERE id = ?').bind(call_id).first();
  if (!callRecord) callRecord = await ((c as any).env as any).DB.prepare('SELECT * FROM phone_calls WHERE twilio_call_sid = ?').bind(call_id).first();

  const result: any = {
    call: callRecord ? {
      id: (callRecord as any).id,
      from: (callRecord as any).from_number,
      to: (callRecord as any).to_number,
      status: (callRecord as any).status,
      duration: (callRecord as any).duration,
    } : { id: call_id },
    assistance: { suggestions: [], script: null, objections: [], value_props: [] },
  };

  const status = (callRecord as any)?.status || '';
  const fromNumber = (callRecord as any)?.from_number || '';

  if (status === 'queued' || status === 'ringing') {
    result.assistance.suggestions = [
      'Introduce yourself and your organization clearly',
      'Confirm you are speaking with the right person',
      'State the purpose of the call upfront',
      'Ask if they have a few minutes to talk',
    ];
  } else if (status === 'in-progress' || status === 'completed') {
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
    } catch {}
  }

  if (transcription) result.assistance.sentiment = analyzeSentiment(transcription);

  return c.json({ data: result });
});

function analyzeSentiment(text: string): { score: number; label: string; details: { positiveScore: number; negativeScore: number; neutralScore: number; wordCount: number } } {
  const positiveWords = ['yes', 'great', 'interested', 'good', 'excellent', 'thanks', 'perfect', 'yes please', 'sounds good', 'helpful', 'wonderful', 'excited', 'happy', 'looking forward', 'welcome', ' appreciate', ' appreciate it'];
  const negativeWords = ['no', 'not interested', 'stop', 'don\'t call', 'busy', 'wrong number', 'remove', 'block', 'never', 'bad', 'terrible', 'angry', 'frustrated', 'upset', 'annoyed', 'bother', 'waste', 'wasted', 'hate', 'dislike', 'worst'];
  const neutralWords = ['maybe', 'not sure', 'depend', '不确定', 'uncertain', 'perhaps', 'sooner', 'later', 'time', 'schedule'];
  const lower = text.toLowerCase();
  let positiveScore = 0;
  let negativeScore = 0;
  let neutralScore = 0;
  let wordCount = 0;

  const words = lower.split(/\s+/).filter(w => w.length > 2);
  wordCount = words.length;

  for (const w of positiveWords) {
    const regex = new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(lower)) positiveScore += 0.2;
  }
  for (const w of negativeWords) {
    const regex = new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(lower)) negativeScore += 0.25;
  }
  for (const w of neutralWords) {
    const regex = new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(lower)) neutralScore += 0.1;
  }

  // Calculate net sentiment score
  let score = (positiveScore - negativeScore) / (Math.max(positiveScore, negativeScore, 1));
  score = Math.max(-1, Math.min(1, score));
  score = Math.round(score * 100) / 100;

  const label = score > 0.15 ? 'positive' : score < -0.15 ? 'negative' : 'neutral';
  return {
    score,
    label,
    details: {
      positiveScore: Math.round(positiveScore * 100) / 100,
      negativeScore: Math.round(negativeScore * 100) / 100,
      neutralScore: Math.round(neutralScore * 100) / 100,
      wordCount
    }
  };
}

// ───── Lead Scoring ─────
aiRoutes.post('/score/lead', async (c) => {
  const body = await c.req.json();
  const { lead_id } = body;
  if (!lead_id) throw new HTTPException(400, { message: 'Lead ID is required' });
  const lead = await ((c as any).env as any).DB.prepare('SELECT * FROM leads WHERE id = ?').bind(lead_id).first();
  if (!lead) throw new HTTPException(404, { message: 'Lead not found' });
  let score = 50;
  const factors: Array<{ factor: string; impact: number }> = [];
  if ((lead as any).npi) { score += 10; factors.push({ factor: 'Has NPI number', impact: 10 }); }
  if ((lead as any).email) { score += 10; factors.push({ factor: 'Has email address', impact: 10 }); }
  if ((lead as any).phone) { score += 10; factors.push({ factor: 'Has phone number', impact: 10 }); }
  if ((lead as any).specialty) { score += 5; factors.push({ factor: `Specialty: ${(lead as any).specialty}`, impact: 5 }); }
  score = Math.min(100, Math.max(0, score));
  await ((c as any).env as any).DB.prepare('UPDATE leads SET lead_score = ?, score_factors = ? WHERE id = ?').bind(score, JSON.stringify(factors), lead_id).run();
  return c.json({ data: { lead_id, score, factors, method: 'rule-based' } });
});

// ───── Advanced Sentiment Analysis using AI Gateway ─────
aiRoutes.post('/analyze/sentiment', async (c) => {
  const body = await c.req.json();
  const { text } = body;
  if (!text) throw new HTTPException(400, { message: 'Text is required' });

  // Emotion categories for detection
  const emotionCategories = [
    { id: 'frustration', keywords: ['frustrated', 'annoyed', 'bothered', 'angry', 'upset', 'irritated', 'mad', 'pissed', 'hate', 'worst'] },
    { id: 'excitement', keywords: ['excited', 'happy', 'enthusiastic', 'thrilled', 'great', 'awesome', 'amazing', 'love', 'perfect', 'excellent'] },
    { id: 'confusion', keywords: ['confused', 'unsure', 'unclear', 'don\'t understand', 'not sure', 'what', 'why', 'how'] },
    { id: 'satisfaction', keywords: ['satisfied', 'happy', 'content', 'good', 'nice', 'great', 'well', 'fine', 'acceptable'] },
    { id: 'impatience', keywords: ['busy', 'rushed', 'hurry', 'quick', 'fast', 'now', 'immediately', 'late', 'waiting'] },
    { id: 'boredom', keywords: ['boring', 'tedious', 'long', 'slow', 'dull', 'uninteresting'] },
  ];

  // Detect emotions in text
  const detectedEmotions: Array<{ emotion: string; confidence: number }> = [];
  const lowerText = text.toLowerCase();
  for (const category of emotionCategories) {
    let matches = 0;
    for (const keyword of category.keywords) {
      if (lowerText.includes(keyword)) matches++;
    }
    if (matches > 0) {
      detectedEmotions.push({
        emotion: category.id,
        confidence: Math.min(0.9, matches * 0.3)
      });
    }
  }

  // If AI Gateway is available, use LLM for nuanced analysis
  if (hasAIBinding(c)) {
    try {
      const response = await c.env.AI.run('@cf/meta/llama-3.1-70b-instruct', {
        messages: [{
          role: 'user',
          content: `Analyze the sentiment of this text and return a JSON object with:
            - sentiment: positive/negative/neutral
            - emotions: array of detected emotions (frustration, excitement, confusion, satisfaction, impatience, boredom, neutrality, concern, interest)
            - confidence: 0-1
            - key_phrases: array of important phrases
            - tone: brief description of tone (professional, friendly, aggressive, passive, etc.)
            - urgency_level: low/medium/high based on language
            Text: "${text.substring(0, 500)}"
            Return ONLY valid JSON.`
        }]
      });
      const result = JSON.parse(response.response);
      return c.json({
        data: {
          ...result,
          emotions: [...detectedEmotions, ...(result.emotions || [])],
          method: 'llm',
          word_count: text.split(/\s+/).length
        }
      });
    } catch (error) {
      // Fall back to rule-based if AI fails
      const ruleBased = analyzeSentiment(text);
      return c.json({
        data: {
          ...ruleBased,
          emotions: detectedEmotions,
          method: 'rule-based-fallback',
          word_count: text.split(/\s+/).length
        }
      });
    }
  }

  const ruleBased = analyzeSentiment(text);
  return c.json({
    data: {
      ...ruleBased,
      emotions: detectedEmotions,
      method: 'rule-based',
      word_count: text.split(/\s+/).length
    }
  });
});

// ───── Voice Intent Classification ─────
const intentCategories = [
  { id: 'billing_inquiry', keywords: ['billing', 'charge', 'payment', 'cost', 'price', 'invoice', 'statement', 'amount owed', 'balance', 'due'] },
  { id: 'insurance_verification', keywords: ['insurance', 'coverage', 'eligible', 'medicare', 'medicaid', 'policy', 'plan', 'verify', 'effective', 'termination'] },
  { id: 'appointment_scheduling', keywords: ['schedule', 'appointment', 'meeting', 'visit', 'available', 'time', 'date', 'booking', 'reschedule', 'cancel'] },
  { id: 'technical_support', keywords: ['technical', 'support', 'issue', 'problem', 'error', 'broken', 'fix', 'not working', 'troubleshoot', 'debug'] },
  { id: 'emergency_urgent', keywords: ['emergency', 'urgent', 'critical', 'immediate', 'now', 'today', 'quick', 'ASAP', 'right away', 'can\'t wait'] },
  { id: 'general_inquiry', keywords: ['information', 'about', 'what', 'how', 'why', 'who', 'where', 'who are you', 'what is this'] },
  { id: 'provider_registration', keywords: ['register', 'apply', 'join', 'partner', 'contract', 'onboard', 'enrollment', 'credential', 'become'] },
  { id: 'credentialing', keywords: ['credential', 'verify', 'license', 'board', 'certification', 'npi', 'education', 'training', 'diploma'] },
  { id: 'payer_enrollment', keywords: ['enroll', 'payer', 'carrier', 'insurance', 'provider', 'contract', 'contracting', 'negotiate'] },
  { id: 'complaint', keywords: ['complaint', 'issue', 'problem', 'angry', 'frustrated', 'upset', 'disappointed', 'annoyed', 'worst', 'terrible'] },
  { id: 'onboarding_status', keywords: ['status', 'progress', 'timeline', 'next steps', 'where we are', 'onboarding', 'setup', 'technical'] },
  { id: 'revenue_questions', keywords: ['revenue', 'income', 'payments', 'collections', 'accounts', 'ar', 'aging', 'denial'] },
  { id: 'credentialing_status', keywords: ['credentialing', 'status', 'progress', 'timeline', 'credential', 'verification', 'CAQH', ' privileging'] },
];

aiRoutes.post('/classify/intent', async (c) => {
  const body = await c.req.json();
  const { query, specialty, conversation_history } = body;

  if (!query) throw new HTTPException(400, { message: 'Query is required' });

  let bestIntent = 'general_inquiry';
  let bestScore = 0;
  const detectedKeywords: string[] = [];
  const detectedCategories: Array<{ category: string; score: number }> = [];

  const lowerQuery = query.toLowerCase();
  for (const category of intentCategories) {
    let score = 0;
    for (const keyword of category.keywords) {
      if (lowerQuery.includes(keyword.toLowerCase())) {
        score += 1;
        detectedKeywords.push(keyword);
      }
    }
    if (score > 0) {
      detectedCategories.push({ category: category.id, score });
    }
    if (score > bestScore) {
      bestScore = score;
      bestIntent = category.id;
    }
  }

  // Get conversation context for more accurate classification
  const context = conversation_history ? conversation_history.slice(-3).join(' ') : '';

  // If AI Gateway available, verify intent with LLM using conversation context
  if (hasAIBinding(c)) {
    try {
      const response = await c.env.AI.run('@cf/meta/llama-3.1-70b-instruct', {
        messages: [{
          role: 'user',
          content: `Classify this caller's intent using conversation context.
Context: "${context}"
Current utterance: "${query.substring(0, 150)}"

Choose from: billing_inquiry, insurance_verification, appointment_scheduling, technical_support, emergency_urgent, general_inquiry, provider_registration, credentialing, payer_enrollment, complaint, onboarding_status, revenue_questions, credentialing_status, scheduling_followup, payment_arrangement, documentation_request.

Return ONLY the intent ID.`
        }]
      });
      const classifiedIntent = response.response.trim().toLowerCase().replace(/[^a-z_]/g, '').replace(/_+/, '_').replace(/^_|_$/g, '');
      if (intentCategories.some(c => c.id === classifiedIntent)) {
        bestIntent = classifiedIntent;
        bestScore = 2; // LLM has higher confidence
      }
    } catch {}
  }

  // Get specialty-specific response suggestion
  let responseSuggestion = 'I understand. How can I help you with this?';
  if (bestIntent === 'billing_inquiry') {
    responseSuggestion = `I can help with billing questions. Could you tell me which specific charge or invoice you're inquiring about? I can look up your account and explain any charges.`;
  } else if (bestIntent === 'insurance_verification') {
    responseSuggestion = `I can help verify your insurance coverage. Could you provide your insurance ID and the name of your insurance provider?`;
  } else if (bestIntent === 'appointment_scheduling') {
    responseSuggestion = `I can help schedule an appointment. When would you prefer to meet, and what specific topic would you like to discuss?`;
  } else if (bestIntent === 'onboarding_status') {
    responseSuggestion = `I can help check your onboarding status. Would you like to know about credentialing progress or technical setup?`;
  } else if (bestIntent === 'revenue_questions') {
    responseSuggestion = `I can help with revenue questions. Are you looking for AR aging details, denial management, or collections status?`;
  } else if (bestIntent === 'credentialing_status') {
    responseSuggestion = `I can help you check your credentialing status. Are you looking for CAQH progress or credentialing timeline?`;
  } else if (bestIntent === 'complaint') {
    responseSuggestion = `I understand you have concerns. Could you tell me specifically what issue you're experiencing so I can help resolve it?`;
  }

  return c.json({
    data: {
      intent: bestIntent,
      intent_label: bestIntent.replace(/_/g, ' '),
      confidence: bestScore > 0 ? Math.min(0.95, (bestScore + (hasAIBinding(c) ? 0.5 : 0)) * 0.2) : 0.5,
      detected_keywords: Array.from(new Set(detectedKeywords)),
      detected_categories: detectedCategories.sort((a, b) => b.score - a.score).slice(0, 3),
      response_suggestion: responseSuggestion,
      method: hasAIBinding(c) ? 'llm-enhanced' : 'keyword-based'
    }
  });
});

// ───── Real-Time Voice Intent Classification (Stream) ─────
aiRoutes.post('/classify/intent/stream', async (c) => {
  const body = await c.req.json();
  const { transcriptions, specialty } = body;

  if (!transcriptions || !Array.isArray(transcriptions) || transcriptions.length === 0) {
    throw new HTTPException(400, { message: 'Array of transcriptions is required' });
  }

  const allText = transcriptions.join(' ');
  let bestIntent = 'general_inquiry';
  let bestScore = 0;
  const detectedKeywords: string[] = [];
  const detectedCategories: Array<{ category: string; score: number }> = [];

  const lowerText = allText.toLowerCase();
  for (const category of intentCategories) {
    let score = 0;
    for (const keyword of category.keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        score += 1;
        detectedKeywords.push(keyword);
      }
    }
    if (score > 0) {
      detectedCategories.push({ category: category.id, score });
    }
    if (score > bestScore) {
      bestScore = score;
      bestIntent = category.id;
    }
  }

  // Use LLM for nuanced classification if available
  if (hasAIBinding(c)) {
    try {
      const response = await c.env.AI.run('@cf/meta/llama-3.1-70b-instruct', {
        messages: [{
          role: 'user',
          content: `Analyze this entire conversation transcript and identify the primary intent.
Transcript: "${allText.substring(0, 2000)}"

Choose from: billing_inquiry, insurance_verification, appointment_scheduling, technical_support, emergency_urgent, general_inquiry, provider_registration, credentialing, payer_enrollment, complaint, onboarding_status, revenue_questions, credentialing_status, scheduling_followup, payment_arrangement, documentation_request.

Return ONLY the intent ID.`
        }]
      });
      const classifiedIntent = response.response.trim().toLowerCase().replace(/[^a-z_]/g, '').replace(/_+/, '_').replace(/^_|_$/g, '');
      if (intentCategories.some(c => c.id === classifiedIntent)) {
        bestIntent = classifiedIntent;
        bestScore = 2;
      }
    } catch {}
  }

  // Calculate confidence based on keyword matches and LLM
  const confidence = bestScore > 0 ? Math.min(0.95, (bestScore + (hasAIBinding(c) ? 0.5 : 0)) * 0.2) : 0.5;

  return c.json({
    data: {
      intent: bestIntent,
      intent_label: bestIntent.replace(/_/g, ' '),
      confidence: Math.round(confidence * 100) / 100,
      detected_keywords: Array.from(new Set(detectedKeywords)),
      detected_categories: detectedCategories.sort((a, b) => b.score - a.score).slice(0, 3),
      transcription_count: transcriptions.length,
      total_characters: allText.length,
      method: hasAIBinding(c) ? 'llm-enhanced-stream' : 'keyword-based-stream'
    }
  });
});

// ───── Call Outcome Prediction ─────
aiRoutes.post('/predict/call-outcome', async (c) => {
  const body = await c.req.json();
  const { caller_number, specialty, call_history } = body;

  if (!caller_number) throw new HTTPException(400, { message: 'Caller number is required' });

  const db = ((c as any).env as any).DB;
  let callTranscription = '';
  let sentimentTrend = 'neutral';

  // Get call history for this number
  if (call_history && call_history.length > 0) {
    callTranscription = call_history.join('\n');
    const negativeCalls = call_history.filter((h: any) => h.sentiment_score && h.sentiment_score < -0.2).length;
    if (negativeCalls > 1) sentimentTrend = 'negative';
    else if (negativeCalls === 1) sentimentTrend = 'mixed';
    else sentimentTrend = 'positive';
  } else {
    // Look up in database
    const cleanNumber = caller_number.replace(/\D/g, '');
    const history = await db.prepare(`
      SELECT transcription, sentiment_score, status FROM phone_calls
      WHERE from_number LIKE ? OR to_number LIKE ?
      ORDER BY created_at DESC LIMIT 3
    `).bind(`%${cleanNumber.slice(-10)}%`, `%${cleanNumber.slice(-10)}%`).all();

    const historyList = history.results || [];
    if (historyList.length > 0) {
      callTranscription = historyList.map((h: any) => h.transcription || '').join('\n');
      const negativeCalls = historyList.filter((h: any) => h.sentiment_score !== null && h.sentiment_score < -0.2).length;
      if (negativeCalls > 1) sentimentTrend = 'negative';
      else if (negativeCalls === 1) sentimentTrend = 'mixed';
      else sentimentTrend = 'positive';
    }
  }

  // Calculate prediction using rule-based + AI
  let successProbability = 0.5;
  const factors: Array<{ factor: string; impact: number }> = [];
  let recommendedApproach = 'Standard outreach';

  if (sentimentTrend === 'negative') {
    successProbability = 0.3;
    factors.push({ factor: 'Negative sentiment history', impact: -0.2 });
    recommendedApproach = 'Empathy-first approach, address concerns before pitching';
  } else if (sentimentTrend === 'positive') {
    successProbability = 0.7;
    factors.push({ factor: 'Positive sentiment history', impact: 0.2 });
    recommendedApproach = 'Direct value proposition, focus on next steps';
  } else {
    successProbability = 0.5;
    factors.push({ factor: 'Neutral sentiment history', impact: 0 });
    recommendedApproach = 'Standard outreach with moderate persistence';
  }

  // Check for specialty-specific patterns
  if (specialty) {
    const lowerSpecialty = specialty.toLowerCase();
    if (lowerSpecialty.includes('cardiology') || lowerSpecialty.includes('orthopedic')) {
      successProbability += 0.1;
      factors.push({ factor: `High-value specialty: ${specialty}`, impact: 0.1 });
    } else if (lowerSpecialty.includes('family') || lowerSpecialty.includes('primary')) {
      successProbability += 0.05;
      factors.push({ factor: `Mass-market specialty: ${specialty}`, impact: 0.05 });
    }
  }

  // AI enhancement
  if (hasAIBinding(c) && callTranscription.length > 100) {
    try {
      const response = await c.env.AI.run('@cf/meta/llama-3.1-70b-instruct', {
        messages: [{
          role: 'user',
          content: `Predict the likelihood this outbound call will succeed based on call history. Return JSON: { success_probability: 0-1, key_factors: string[], recommended_timing: string }. History: "${callTranscription.substring(0, 1000)}"`
        }]
      });
      const prediction = JSON.parse(response.response);
      successProbability = prediction.success_probability;
      factors.push({ factor: 'AI pattern match', impact: (prediction.success_probability - 0.5) * 0.2 });
      if (prediction.recommended_timing) recommendedApproach = `AI recommends: ${prediction.recommended_timing}`;
    } catch {}
  }

  successProbability = Math.max(0.1, Math.min(0.95, successProbability));

  return c.json({
    data: {
      success_probability: Math.round(successProbability * 100) / 100,
      sentiment_trend: sentimentTrend,
      factors,
      recommended_approach: recommendedApproach,
      recommended_timing: sentimentTrend === 'positive' ? 'Immediate follow-up' : sentimentTrend === 'negative' ? 'Wait 3-5 days, then follow up' : 'Follow up in 2-3 days',
      method: hasAIBinding(c) ? 'llm-enhanced' : 'rule-based'
    }
  });
});

// ───── Call Summarization (Legacy - Rule-based only) ─────
aiRoutes.post('/summarize/call/legacy', async (c) => {
  const body = await c.req.json();
  const { transcription, call_id } = body;
  let callTranscription = transcription;
  if (call_id && !transcription) {
    const call = await ((c as any).env as any).DB.prepare('SELECT transcription FROM phone_calls WHERE id = ? OR twilio_call_sid = ?').bind(call_id, call_id).first();
    if (!call || !(call as any).transcription) throw new HTTPException(404, { message: 'Call or transcription not found' });
    callTranscription = (call as any).transcription;
  }
  if (!callTranscription) throw new HTTPException(400, { message: 'No transcription available.' });
  const lines = (callTranscription as string).split('.').filter((l: string) => l.trim().length > 0);
  const summary = lines.length > 0 ? `Call with ${lines.length} key points discussed. ${lines[0]}.` : 'Call transcript recorded.';
  const actionItems: string[] = [];
  const lower = (callTranscription as string).toLowerCase();
  if (lower.includes('follow')) actionItems.push('Schedule follow-up');
  if (lower.includes('email') || lower.includes('send')) actionItems.push('Send information via email');
  if (lower.includes('call back') || lower.includes('callback')) actionItems.push('Schedule callback');
  if (lower.includes('meeting') || lower.includes('appointment')) actionItems.push('Confirm appointment');
  if (actionItems.length === 0) actionItems.push('Review call transcript for action items');
  const sentiment = analyzeSentiment(callTranscription as string);
  const result = { summary, action_items: actionItems, key_points: lines.slice(0, 3).map((l: string) => l.trim()) || ['No key points extracted'], sentiment: sentiment.label, sentiment_score: sentiment.score, follow_up_required: sentiment.label !== 'positive' || actionItems.length > 1, method: 'rule-based' };
  if (call_id) { await ((c as any).env as any).DB.prepare('UPDATE phone_calls SET ai_summary = ?, sentiment_score = ? WHERE id = ? OR twilio_call_sid = ?').bind(result.summary, sentiment.score, call_id, call_id).run(); }
  return c.json({ data: result });
});

// ───── Automated Call Summarization with AI ─────
aiRoutes.post('/summarize/call', async (c) => {
  const body = await c.req.json();
  const { transcription, call_id } = body;
  let callTranscription = transcription;
  if (call_id && !transcription) {
    const call = await ((c as any).env as any).DB.prepare('SELECT transcription FROM phone_calls WHERE id = ? OR twilio_call_sid = ?').bind(call_id, call_id).first();
    if (!call || !(call as any).transcription) throw new HTTPException(404, { message: 'Call or transcription not found' });
    callTranscription = (call as any).transcription;
  }
  if (!callTranscription) throw new HTTPException(400, { message: 'No transcription available.' });

  // If AI Gateway is available, use LLM for intelligent summarization
  if (hasAIBinding(c)) {
    try {
      const response = await c.env.AI.run('@cf/meta/llama-3.1-70b-instruct', {
        messages: [{
          role: 'user',
          content: `Summarize this call transcription and extract key information. Return a JSON object with:
            - summary: 2-3 sentence summary of the call
            - action_items: array of specific action items mentioned
            - key_points: array of key discussion topics
            - sentiment: positive/negative/neutral
            - pain_points: array of problems or concerns mentioned
            - next_steps: array of next steps agreed upon

          Transcription:
          "${callTranscription.substring(0, 3000)}"

          Return ONLY valid JSON.`
        }]
      });
      const parsed = JSON.parse(response.response);
      const summaryResult = {
        ...parsed,
        method: 'llm',
        transcription_length: callTranscription.length
      };
      if (call_id) {
        await ((c as any).env as any).DB.prepare('UPDATE phone_calls SET ai_summary = ?, sentiment_score = ? WHERE id = ? OR twilio_call_sid = ?').bind(JSON.stringify(summaryResult), 0.5, call_id, call_id).run();
      }
      return c.json({ data: summaryResult });
    } catch (error) {
      // Fall back to rule-based if AI fails
      return c.json({ data: getRuleBasedSummary(callTranscription, call_id, c) });
    }
  }

  return c.json({ data: getRuleBasedSummary(callTranscription, call_id, c) });
});

// Rule-based summarization fallback
function getRuleBasedSummary(callTranscription: string, call_id: string | undefined, c: any): any {
  const lines = (callTranscription as string).split('.').filter((l: string) => l.trim().length > 5);
  const summary = lines.length > 0 ? `Call with ${lines.length} key points discussed. ${lines[0]}.` : 'Call transcript recorded.';
  const actionItems: string[] = [];
  const lower = (callTranscription as string).toLowerCase();
  if (lower.includes('follow')) actionItems.push('Schedule follow-up');
  if (lower.includes('email') || lower.includes('send')) actionItems.push('Send information via email');
  if (lower.includes('call back') || lower.includes('callback')) actionItems.push('Schedule callback');
  if (lower.includes('meeting') || lower.includes('appointment')) actionItems.push('Confirm appointment');
  if (lower.includes('schedule') && lower.includes('call')) actionItems.push('Schedule a call');
  if (lower.includes('send') && lower.includes('info')) actionItems.push('Send information');
  if (lower.includes('pain') || lower.includes('problem') || lower.includes('issue') || lower.includes('struggling')) actionItems.push('Address pain points');
  if (actionItems.length === 0) actionItems.push('Review call transcript for action items');

  const sentiment = analyzeSentiment(callTranscription as string);
  return {
    summary,
    action_items: actionItems,
    key_points: lines.slice(0, 5).map((l: string) => l.trim()),
    sentiment: sentiment.label,
    sentiment_score: sentiment.score,
    method: 'rule-based',
    transcription_length: callTranscription.length
  };
}

// ───── Smart Search ─────
aiRoutes.post('/search', async (c) => {
  const body = await c.req.json();
  const { query, limit } = body;
  if (!query) throw new HTTPException(400, { message: 'Search query is required' });
  const searchTerm = `%${query}%`;
  const results = await ((c as any).env as any).DB.prepare(`
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
  const predictions = await ((c as any).env as any).DB.prepare('SELECT * FROM ai_predictions WHERE record_type = ? AND record_id = ? ORDER BY created_at DESC LIMIT 10').bind(type, id).all();
  return c.json({ data: predictions || [] });
});

// ───── Status ─────
aiRoutes.get('/status', async (c) => {
  const models = await ((c as any).env as any).DB.prepare('SELECT * FROM ai_models WHERE is_active = 1').all();
  return c.json({ data: { models: models || [], ai_gateway_configured: hasAIBinding(c), note: hasAIBinding(c) ? 'AI Gateway configured' : 'AI Gateway not configured. Rule-based features work without it.' } });
});

// ───── Sentiment Trend Tracking ─────
aiRoutes.get('/trend/sentiment/:number', async (c) => {
  const { number } = c.req.param();
  if (!number) throw new HTTPException(400, { message: 'Phone number is required' });

  const db = ((c as any).env as any).DB;
  const cleanNumber = number.replace(/\D/g, '');
  const history = await db.prepare(`
    SELECT id, transcription, sentiment_score, status, created_at
    FROM phone_calls
    WHERE from_number LIKE ? OR to_number LIKE ?
    ORDER BY created_at DESC LIMIT 10
  `).bind(`%${cleanNumber.slice(-10)}%`, `%${cleanNumber.slice(-10)}%`).all();

  const calls = history.results || [];
  if (calls.length === 0) {
    return c.json({
      data: {
        trend: 'no_data',
        recent_sentiments: [],
        average_score: null,
        total_calls: 0
      }
    });
  }

  // Calculate sentiment trend
  const sentiments = calls.map((call: any) => ({
    id: call.id,
    date: call.created_at,
    score: call.sentiment_score,
    label: call.sentiment_score !== null
      ? call.sentiment_score > 0.15 ? 'positive' : call.sentiment_score < -0.15 ? 'negative' : 'neutral'
      : 'unknown'
  }));

  // Calculate average sentiment
  const scores = sentiments.filter((s: any) => s.score !== null).map((s: any) => s.score);
  const averageScore = scores.length > 0
    ? Math.round((scores.reduce((a: number, b: number) => a + b, 0) / scores.length) * 100) / 100
    : null;

  // Determine trend
  let trend: 'improving' | 'declining' | 'stable' | 'volatile' | 'no_data' = 'no_data';
  if (scores.length >= 2) {
    const recentAverage = scores.slice(0, 3).reduce((a: number, b: number) => a + b, 0) / Math.min(3, scores.length);
    const olderAverage = scores.slice(3).reduce((a: number, b: number) => a + b, 0) / Math.max(1, scores.length - 3);
    const diff = recentAverage - olderAverage;
    if (Math.abs(diff) < 0.1) {
      trend = 'stable';
    } else if (diff > 0.2) {
      trend = 'improving';
    } else if (diff < -0.2) {
      trend = 'declining';
    } else {
      trend = 'volatile';
    }
  }

  return c.json({
    data: {
      trend,
      average_score: averageScore,
      total_calls: calls.length,
      recent_sentiments: sentiments.slice(0, 5),
      positive_calls: sentiments.filter((s: any) => s.label === 'positive').length,
      negative_calls: sentiments.filter((s: any) => s.label === 'negative').length,
      neutral_calls: sentiments.filter((s: any) => s.label === 'neutral').length
    }
  });
});

// ───── Bulk Sentiment Analysis ─────
aiRoutes.post('/analyze/sentiments', async (c) => {
  const body = await c.req.json();
  const { texts } = body;
  if (!texts || !Array.isArray(texts) || texts.length === 0) {
    throw new HTTPException(400, { message: 'Array of texts is required' });
  }

  const results = [];
  for (const text of texts) {
    results.push(analyzeSentiment(text));
  }

  return c.json({
    data: {
      results,
      total_analyzed: results.length,
      positive_count: results.filter((r: any) => r.label === 'positive').length,
      negative_count: results.filter((r: any) => r.label === 'negative').length,
      neutral_count: results.filter((r: any) => r.label === 'neutral').length
    }
  });
});

export default aiRoutes;
