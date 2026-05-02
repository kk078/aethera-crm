# Memory Index - Aethera-CRM

This file indexes all memory entries for the project.

## Project Context

- [Project Status](memory/project_status.md) - Phase 1 complete (95%), core CRM ready
- [Architecture](memory/architecture.md) - Cloudflare Workers + Pages + D1 stack
- [Database Schema](memory/database_schema.md) - 21+ healthcare-specific tables
- [API Structure](memory/api_structure.md) - 13 route modules with JWT auth
- [Default Credentials](memory/default_credentials.md) - Dev login credentials
- [Setup Commands](memory/setup_commands.md) - Quick start scripts

## Configuration

- `.env` - Environment variables (Cloudflare, AI Gateway, integrations)
- `cloudflare/workers/wrangler.toml` - Worker configuration
- `cloudflare/pages/vite.config.ts` - Frontend build config

## Documentation

- `README.md` - Main project overview
- `IMPLEMENTATION_STATUS.md` - Detailed implementation report
- `docs/PHASE1-STATUS.md` - Phase 1 completion status
- `docs/SETUP.md` - Setup guide

## Backend

- [API Service Layer](memory/api_service.md) - Axios client with typed API functions
- [Deployment](memory/deployment.md) - Cloudflare Workers and Pages deployment
- [AI Gateway](memory/ai_gateway.md) - Cloudflare AI Gateway configuration

## Routes (Backend - 20+ files)

### Core CRM
- `src/routes/contacts.ts` - Contact CRUD
- `src/routes/organizations.ts` - Organization CRUD
- `src/routes/leads.ts` - Lead management + scoring
- `src/routes/deals.ts` - Deal pipeline management
- `src/routes/activities.ts` - Activity tracking
- `src/routes/tasks.ts` - Tasks CRUD

### Specialized
- `src/routes/auth.ts` - Authentication (JWT + API keys)
- `src/routes/providers.ts` - Provider directory + NPPES
- `src/routes/ai.ts` - AI features (scoring, sentiment, summaries)
- `src/routes/twilio.ts` - Call/SMS integration
- `src/routes/emails.ts` - Email management + Gmail prep
- `src/routes/campaigns.ts` - Campaigns CRUD
- `src/routes/workflows.ts` - Workflow automation (n8n prep)

### Advanced Features
- `src/routes/onboarding.ts` - RCM onboarding workflows
- `src/routes/provider-leads.ts` - Provider lead generation
- `src/routes/call-queue.ts` - Call queue management
- `src/routes/call-analytics.ts` - Call analytics and predictions
- `src/routes/calendar-integration.ts` - Calendar sync
- `src/routes/backup.ts` - Database backup operations
- `src/routes/settings.ts` - Configuration management
- `src/routes/debug.ts` - Debug endpoints
- `src/routes/seed.ts` - Database seeding

## Frontend Modules (10 modules)

- `src/modules/auth/Login.tsx` - Authentication page
- `src/modules/dashboard/Dashboard.tsx` - Main dashboard
- `src/modules/contacts/Contacts.tsx` - Contact management
- `src/modules/leads/Leads.tsx` - Lead tracking
- `src/modules/deals/Deals.tsx` - Pipeline view
- `src/modules/organizations/Organizations.tsx` - Organization CRUD
- `src/modules/activities/Activities.tsx` - Activity tracking
- `src/modules/providers/Providers.tsx` - Provider directory
- `src/modules/tasks/Tasks.tsx` - Task management
- `src/modules/calls/Calls.tsx` - Call management
- `src/modules/email/Email.tsx` - Email client (Phase 5)
- `src/modules/settings/Settings.tsx` - Settings
- `src/modules/public-directory/PublicDirectory.tsx` - Public search

## State Management

- `src/stores/authStore.ts` - Authentication state (Zustand + persist)

## Key Files

| File | Description |
|------|-------------|
| `cloudflare/workers/src/index.ts` | Main entry point with middleware stack |
| `cloudflare/workers/src/db/schema.sql` | Database schema (650+ lines, 50+ indexes) |
| `cloudflare/workers/src/middleware/auth.ts` | JWT + API key authentication |
| `cloudflare/pages/src/App.tsx` | Frontend routing with protected routes |
| `cloudflare/pages/src/services/api.ts` | API client with typed functions |
| `.env` | Environment configuration |
