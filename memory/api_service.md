---
name: API Service Layer
description: Axios client with interceptors and typed API functions
type: project
---

**API Client Configuration:**
- **Base URL:** `VITE_API_URL` env or default `https://aethera-crm-api.aetherahealthcare.workers.dev/api/v1`
- **Library:** Axios with interceptors
- **Auth:** Bearer token from `useAuthStore.getState().token`

**Interceptors:**
- **Request:** Adds `Authorization: Bearer <token>` header
- **Response:** 
  - 401 → logs out and redirects to `/login`
  - 500/502/503 → returns empty arrays for list endpoints (defensive fallback)

**API Service Functions:**
- `authAPI` - Login, logout, API keys, JWT
- `contactsAPI` - Contact CRUD + activities/emails
- `organizationsAPI` - Organization CRUD + contacts/deals
- `leadsAPI` - Leads CRUD + convert
- `dealsAPI` - Deals CRUD + pipeline/phase management
- `activitiesAPI` - Activities CRUD + filtering
- `tasksAPI` - Tasks CRUD + status filters
- `providersAPI` - NPI providers + NPPES search/import
- `emailsAPI` - Email CRUD + templates + Gmail OAuth
- `twilioAPI` - Calls + SMS + usage stats
- `aiAPI` - Lead scoring, sentiment, call assist, search
- `workflowsAPI` - Workflow CRUD + triggers + n8n import/export
- `settingsAPI` - Configuration + integrations
- `backupAPI` - Backup trigger + list + cleanup
- `onboardingAPI` - 35+ endpoints for RCM workflows
- `callQueueAPI` - Queue management + provider availability
- `callAnalyticsAPI` - Metrics, analytics, dashboard stats

**Why:** Centralized API layer with automatic auth and error handling.

**How to apply:** New API endpoints add typed functions in this file.
