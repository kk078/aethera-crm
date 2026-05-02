import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
// Import routes
import { authRoutes } from './routes/auth';
import { contactsRoutes } from './routes/contacts';
import { organizationsRoutes } from './routes/organizations';
import { leadsRoutes } from './routes/leads';
import { dealsRoutes } from './routes/deals';
import { activitiesRoutes } from './routes/activities';
import { emailsRoutes } from './routes/emails';
import { providersRoutes } from './routes/providers';
import { campaignsRoutes } from './routes/campaigns';
import { tasksRoutes } from './routes/tasks';
import { aiRoutes } from './routes/ai';
import { twilioRoutes } from './routes/twilio';
import { workflowsRoutes } from './routes/workflows';
import { settingsRoutes } from './routes/settings';
import { backupRoutes } from './routes/backup';
import { onboardingRoutes } from './routes/onboarding';
import { debugRoutes } from './routes/debug';
import { providerLeadRoutes } from './routes/provider-leads';
import { seedRoutes } from './routes/seed';
import { callQueueRoutes } from './routes/call-queue';
import { callAnalyticsRoutes } from './routes/call-analytics';
import { calendarIntegrationRoutes } from './routes/calendar-integration';
// Import middleware
import { authMiddleware, optionalAuthMiddleware } from './middleware/auth';
import { rateLimitMiddleware } from './middleware/rateLimit';
import { errorHandler } from './middleware/errorHandler';
import { schemaSentinelMiddleware } from './middleware/schemaSentinel';
// Import database initialization
import { initializeDatabase } from './db/init';
// Create Hono app
const app = new Hono();
// Environment logging - prints all available bindings
app.use('*', async (c, next) => {
    const env = c.env;
    console.log('[ENV] Available bindings:', Object.keys(env));
    if (env.DB) {
        console.log('[ENV] DB binding available');
    }
    else {
        console.warn('[ENV] WARNING: DB binding not found!');
    }
    await next();
});
// Global middleware
app.use('*', logger());
app.use('*', prettyJSON());
app.use('*', cors({
    origin: (origin, c) => {
        // For debugging: return any origin or default to localhost
        return origin || 'http://localhost:5173';
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    exposeHeaders: ['Content-Length', 'X-Request-Id'],
    maxAge: 600,
    credentials: true,
}));
// Rate limiting
app.use('*', rateLimitMiddleware);
// Schema Sentinel - checks table existence before route execution
app.use('/api/v1/*', schemaSentinelMiddleware);
// Error handling
app.use('*', errorHandler);
// Health check endpoint
app.get('/health', (c) => {
    return c.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: 'development',
    });
});
// API routes
const apiRoutes = app.basePath('/api/v1');
// Public routes (no auth required)
apiRoutes.route('/public/providers', providersRoutes);
// Auth routes
apiRoutes.route('/auth', authRoutes);
// Protected routes (auth required) - specific paths only
apiRoutes.use('/contacts/*', authMiddleware);
apiRoutes.use('/organizations/*', authMiddleware);
apiRoutes.use('/leads/*', authMiddleware);
apiRoutes.use('/deals/*', authMiddleware);
apiRoutes.use('/activities/*', authMiddleware);
apiRoutes.use('/emails/*', authMiddleware);
apiRoutes.use('/campaigns/*', authMiddleware);
apiRoutes.use('/tasks/*', authMiddleware);
apiRoutes.use('/ai/*', authMiddleware);
apiRoutes.use('/workflows/*', authMiddleware);
apiRoutes.use('/settings/*', authMiddleware);
apiRoutes.use('/backup/*', authMiddleware);
apiRoutes.use('/provider-leads/*', authMiddleware);
apiRoutes.use('/providers/import', authMiddleware);
apiRoutes.use('/onboarding/*', authMiddleware);
// Twilio routes (optional auth - webhooks are public, protected routes check inside)
apiRoutes.use('/twilio/*', optionalAuthMiddleware);
apiRoutes.route('/twilio', twilioRoutes);
apiRoutes.route('/ai', aiRoutes);
apiRoutes.route('/contacts', contactsRoutes);
apiRoutes.route('/organizations', organizationsRoutes);
apiRoutes.route('/leads', leadsRoutes);
apiRoutes.route('/deals', dealsRoutes);
apiRoutes.route('/activities', activitiesRoutes);
apiRoutes.route('/emails', emailsRoutes);
apiRoutes.route('/providers', providersRoutes);
apiRoutes.route('/campaigns', campaignsRoutes);
apiRoutes.route('/tasks', tasksRoutes);
apiRoutes.route('/workflows', workflowsRoutes);
apiRoutes.route('/settings', settingsRoutes);
apiRoutes.route('/backup', backupRoutes);
apiRoutes.route('/provider-leads', providerLeadRoutes);
apiRoutes.route('/seed', seedRoutes);
apiRoutes.route('/onboarding', onboardingRoutes);
apiRoutes.route('/debug', debugRoutes);
apiRoutes.route('/call-queue', callQueueRoutes);
apiRoutes.route('/call-analytics', callAnalyticsRoutes);
apiRoutes.route('/calendar-integration', calendarIntegrationRoutes);
// 404 handler
app.notFound((c) => {
    return c.json({
        error: 'Not Found',
        message: `Route ${c.req.method} ${c.req.path} not found`,
    }, 404);
});
// Database initialization on startup
app.use('*', async (c, next) => {
    if (!c.get('dbInitialized')) {
        try {
            await initializeDatabase(c.env.DB);
            c.set('dbInitialized', true);
        }
        catch (error) {
            console.error('Database initialization failed:', error);
        }
    }
    await next();
});
export default app;
