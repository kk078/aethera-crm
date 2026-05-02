import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
export const callAnalyticsRoutes = new Hono();
function getDB(c) {
    const db = c.env.DB;
    if (!db) {
        throw new HTTPException(500, { message: 'Database binding not available' });
    }
    return db;
}
// ───── Call Metrics ─────
// Daily call summary
callAnalyticsRoutes.get('/metrics/daily', async (c) => {
    const user = c.get('user');
    if (!user)
        throw new HTTPException(401, { message: 'Authentication required' });
    const db = getDB(c);
    const { date } = c.req.query(); // Format: YYYY-MM-DD
    const targetDate = date || new Date().toISOString().split('T')[0];
    const metrics = await db.prepare(`
    SELECT
      COUNT(*) as total_calls,
      SUM(CASE WHEN direction = 'outbound' THEN 1 ELSE 0 END) as outbound_calls,
      SUM(CASE WHEN direction = 'inbound' THEN 1 ELSE 0 END) as inbound_calls,
      AVG(COALESCE(duration, 0)) as avg_duration,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_calls,
      SUM(CASE WHEN status = 'no_answer' THEN 1 ELSE 0 END) as no_answer_calls,
      SUM(CASE WHEN status = 'voicemail' THEN 1 ELSE 0 END) as voicemail_calls,
      SUM(CASE WHEN sentiment_score > 0.1 THEN 1 ELSE 0 END) as positive_sentiment,
      SUM(CASE WHEN sentiment_score < -0.1 THEN 1 ELSE 0 END) as negative_sentiment
    FROM phone_calls
    WHERE DATE(created_at) = ?
  `).bind(targetDate).first();
    return c.json({ data: metrics || { total_calls: 0, avg_duration: 0 } });
});
// Weekly call summary
callAnalyticsRoutes.get('/metrics/weekly', async (c) => {
    const user = c.get('user');
    if (!user)
        throw new HTTPException(401, { message: 'Authentication required' });
    const db = getDB(c);
    const metrics = await db.prepare(`
    SELECT
      strftime('%Y-%W', created_at) as week,
      COUNT(*) as total_calls,
      AVG(COALESCE(duration, 0)) as avg_duration,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_calls
    FROM phone_calls
    WHERE created_at >= date('now', '-7 days')
    GROUP BY strftime('%Y-%W', created_at)
    ORDER BY week DESC
    LIMIT 4
  `).all();
    return c.json({ data: metrics.results || [] });
});
// Monthly summary
callAnalyticsRoutes.get('/metrics/monthly', async (c) => {
    const user = c.get('user');
    if (!user)
        throw new HTTPException(401, { message: 'Authentication required' });
    const db = getDB(c);
    const metrics = await db.prepare(`
    SELECT
      strftime('%Y-%m', created_at) as month,
      COUNT(*) as total_calls,
      AVG(COALESCE(duration, 0)) as avg_duration,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_calls
    FROM phone_calls
    WHERE created_at >= date('now', '-30 days')
    GROUP BY strftime('%Y-%m', created_at)
    ORDER BY month DESC
    LIMIT 6
  `).all();
    return c.json({ data: metrics.results || [] });
});
// ───── Performance Analytics ─────
// Team performance metrics
callAnalyticsRoutes.get('/analytics/team', async (c) => {
    const user = c.get('user');
    if (!user)
        throw new HTTPException(401, { message: 'Authentication required' });
    const db = getDB(c);
    const metrics = await db.prepare(`
    SELECT
      u.username,
      u.id as user_id,
      COUNT(pc.id) as total_calls,
      AVG(COALESCE(pc.duration, 0)) as avg_duration,
      SUM(CASE WHEN pc.status = 'completed' THEN 1 ELSE 0 END) as completed_calls,
      AVG(COALESCE(pc.sentiment_score, 0)) as avg_sentiment,
      COUNT(DISTINCT pc.from_number) as unique_callers
    FROM users u
    LEFT JOIN phone_calls pc ON u.id = pc.owner_id
    WHERE u.role != 'admin' OR u.id = ?
    GROUP BY u.id
    ORDER BY total_calls DESC
  `).bind(user.id).all();
    return c.json({ data: metrics.results || [] });
});
// Individual call performance
callAnalyticsRoutes.get('/analytics/user/:userId', async (c) => {
    const user = c.get('user');
    if (!user)
        throw new HTTPException(401, { message: 'Authentication required' });
    const { userId } = c.req.param();
    const db = getDB(c);
    const stats = await db.prepare(`
    SELECT
      COUNT(*) as total_calls,
      AVG(COALESCE(duration, 0)) as avg_duration,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_calls,
      SUM(CASE WHEN status = 'no_answer' THEN 1 ELSE 0 END) as no_answer_calls,
      AVG(COALESCE(sentiment_score, 0)) as avg_sentiment,
      strftime('%H', created_at) as hour,
      COUNT(*) as calls_per_hour
    FROM phone_calls
    WHERE owner_id = ?
    GROUP BY hour
    ORDER BY hour
  `).bind(userId).all();
    return c.json({ data: stats.results || [] });
});
// ───── Pipeline Integration Analytics ─────
// Pipeline stage transition analytics
callAnalyticsRoutes.get('/analytics/pipeline', async (c) => {
    const user = c.get('user');
    if (!user)
        throw new HTTPException(401, { message: 'Authentication required' });
    const db = getDB(c);
    const metrics = await db.prepare(`
    SELECT
      workflow_stage,
      COUNT(*) as count,
      AVG(COALESCE(duration, 0)) as avg_duration,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
    FROM phone_calls
    WHERE workflow_stage IS NOT NULL
    GROUP BY workflow_stage
    ORDER BY count DESC
  `).all();
    return c.json({ data: metrics.results || [] });
});
// Call outcome by pipeline stage
callAnalyticsRoutes.get('/analytics/outcomes', async (c) => {
    const user = c.get('user');
    if (!user)
        throw new HTTPException(401, { message: 'Authentication required' });
    const db = getDB(c);
    const metrics = await db.prepare(`
    SELECT
      workflow_stage,
      JSON_EXTRACT(notes, '$.outcome') as outcome,
      COUNT(*) as count
    FROM phone_calls
    WHERE notes IS NOT NULL AND workflow_stage IS NOT NULL
    GROUP BY workflow_stage, JSON_EXTRACT(notes, '$.outcome')
    ORDER BY workflow_stage, count DESC
  `).all();
    return c.json({ data: metrics.results || [] });
});
// ───── AI Usage Analytics ─────
// AI suggestion usage
callAnalyticsRoutes.get('/analytics/ai-usage', async (c) => {
    const user = c.get('user');
    if (!user)
        throw new HTTPException(401, { message: 'Authentication required' });
    const db = getDB(c);
    const metrics = await db.prepare(`
    SELECT
      json_extract(ai_summary, '$.method') as ai_method,
      COUNT(*) as usage_count,
      AVG(COALESCE(sentiment_score, 0)) as avg_sentiment
    FROM phone_calls
    WHERE ai_summary IS NOT NULL
    GROUP BY json_extract(ai_summary, '$.method')
  `).all();
    return c.json({ data: metrics.results || [] });
});
// Call summary usage
callAnalyticsRoutes.get('/analytics/summarization', async (c) => {
    const user = c.get('user');
    if (!user)
        throw new HTTPException(401, { message: 'Authentication required' });
    const db = getDB(c);
    const metrics = await db.prepare(`
    SELECT
      COUNT(*) as total_calls,
      SUM(CASE WHEN ai_summary IS NOT NULL THEN 1 ELSE 0 END) as summarized_calls,
      SUM(CASE WHEN transcription IS NOT NULL THEN 1 ELSE 0 END) as transcribed_calls
    FROM phone_calls
  `).first();
    return c.json({ data: metrics || { total_calls: 0, summarized_calls: 0, transcribed_calls: 0 } });
});
// ───── Real-Time Dashboard Data ─────
// Live call metrics
callAnalyticsRoutes.get('/dashboard/live', async (c) => {
    const user = c.get('user');
    if (!user)
        throw new HTTPException(401, { message: 'Authentication required' });
    const db = getDB(c);
    const metrics = await db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM phone_calls WHERE status IN ('ringing', 'in-progress')) as active_calls,
      (SELECT COUNT(*) FROM call_queue WHERE status = 'pending') as pending_queue,
      (SELECT COUNT(*) FROM phone_calls WHERE DATE(created_at) = date('now')) as today_calls,
      (SELECT AVG(COALESCE(duration, 0)) FROM phone_calls WHERE DATE(created_at) = date('now')) as today_avg_duration
  `).first();
    return c.json({ data: metrics || { active_calls: 0, pending_queue: 0, today_calls: 0, today_avg_duration: 0 } });
});
// Quick stats for dashboard
callAnalyticsRoutes.get('/dashboard/stats', async (c) => {
    const user = c.get('user');
    if (!user)
        throw new HTTPException(401, { message: 'Authentication required' });
    const db = getDB(c);
    const stats = await db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM phone_calls) as total_calls,
      (SELECT COUNT(*) FROM phone_calls WHERE DATE(created_at) = date('now')) as today_calls,
      (SELECT COUNT(*) FROM phone_calls WHERE strftime('%W', created_at) = strftime('%W', 'now')) as this_week_calls,
      (SELECT COUNT(*) FROM phone_calls WHERE DATE(created_at) >= date('now', '-7 days')) as last_7_days_calls,
      (SELECT AVG(duration) FROM phone_calls WHERE status = 'completed') as avg_duration_all,
      (SELECT AVG(sentiment_score) FROM phone_calls WHERE sentiment_score IS NOT NULL) as avg_sentiment,
      (SELECT COUNT(*) FROM call_queue WHERE status = 'pending') as pending_queue,
      (SELECT COUNT(*) FROM call_queue WHERE status = 'assigned') as assigned_queue
  `).first();
    return c.json({ data: stats || {} });
});
// Top performers
callAnalyticsRoutes.get('/dashboard/top-performers', async (c) => {
    const user = c.get('user');
    if (!user)
        throw new HTTPException(401, { message: 'Authentication required' });
    const db = getDB(c);
    const performers = await db.prepare(`
    SELECT
      u.username,
      u.id as user_id,
      COUNT(pc.id) as total_calls,
      AVG(COALESCE(pc.duration, 0)) as avg_duration,
      AVG(COALESCE(pc.sentiment_score, 0)) as avg_sentiment,
      SUM(CASE WHEN pc.status = 'completed' THEN 1 ELSE 0 END) as completed_calls
    FROM users u
    LEFT JOIN phone_calls pc ON u.id = pc.owner_id
    WHERE u.role != 'admin'
    GROUP BY u.id
    HAVING total_calls > 0
    ORDER BY completed_calls DESC
    LIMIT 10
  `).all();
    return c.json({ data: performers.results || [] });
});
export default callAnalyticsRoutes;
