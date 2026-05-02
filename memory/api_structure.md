---
name: API Structure
description: Base URL /api/v1 with 13 route modules
type: project
---

**Base URL:** `http://localhost:8787/api/v1`

**Public Routes (No Auth):**
- `GET /health` - Health check
- `GET /public/providers/*` - Provider search

**Protected Routes (JWT/API Key Required):**
- `POST /auth/*` - Login, logout, API keys, JWT
- `GET /contacts/*` - Contacts CRUD
- `GET /organizations/*` - Organizations CRUD
- `GET /leads/*` - Leads CRUD + scoring
- `GET /deals/*` - Deals CRUD + pipeline
- `GET /activities/*` - Activities CRUD
- `GET /tasks/*` - Tasks CRUD
- `GET /campaigns/*` - Campaigns CRUD
- `GET /providers/*` - Providers CRUD + NPPES import
- `GET /emails/*` - Email management + Gmail sync prep
- `GET /twilio/*` - Call/SMS integration
- `GET /ai/*` - AI features (scoring, sentiment, summaries)
- `GET /workflows/*` - Workflow management
- `GET /settings/*` - Configuration
- `GET /backup/*` - Database backup

**Rate Limiting:** 1000 requests/hour per API key

**Authentication:** JWT tokens + API keys + OAuth 2.0 ( prep for Phase 5)

**Why:** RESTful API with role-based access control for B2B healthcare CRM.

**How to apply:** All new endpoints go in `cloudflare/workers/src/routes/` with appropriate auth middleware.
