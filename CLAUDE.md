# Aethera-CRM - Project Documentation

## Overview

**Aethera-CRM** is an AI-powered healthcare provider relationship management system built on Cloudflare's serverless platform. It's a B2B SaaS application for managing healthcare provider data, leads, deals, and relationships.

**Status:** Phase 1 (Core CRM) - 95% Complete

---

## Architecture

```
Aethera-CRM/
├── cloudflare/
│   ├── workers/          # Backend API (Hono.js + TypeScript)
│   └── pages/            # Frontend (React + Ant Design)
├── docs/                 # Documentation
├── scripts/              # PowerShell setup scripts
└── .env                  # Environment configuration
```

### Tech Stack

| Component | Technology |
|-----------|-----------|
| Backend | TypeScript, Cloudflare Workers, Hono.js |
| Frontend | TypeScript, React 18, Ant Design 5.x, Vite |
| Database | Cloudflare D1 (SQLite) |
| Storage | Cloudflare R2 (configured) |
| AI | Cloudflare AI Gateway (Gemma, Llama, Mistral) |
| Auth | JWT + API Keys |
| State | Zustand + TanStack Query |
| Validation | Zod |

---

## Project Structure

### Backend (`cloudflare/workers`)

**Route Modules (13 total):**
- `/auth/*` - Login, logout, API keys, JWT
- `/contacts/*` - Contact CRUD
- `/organizations/*` - Organization CRUD
- `/leads/*` - Lead CRUD + scoring
- `/deals/*` - Deal CRUD + pipeline
- `/activities/*` - Activities CRUD
- `/tasks/*` - Task CRUD
- `/campaigns/*` - Campaign CRUD
- `/providers/*` - Provider directory + NPPES
- `/emails/*` - Email management
- `/twilio/*` - Call/SMS integration
- `/ai/*` - AI features (scoring, sentiment, summaries)
- `/workflows/*` - Workflow management
- `/settings/*` - Configuration
- `/backup/*` - Database backup

**Key Files:**
- `src/index.ts` - Main entry point with middleware stack
- `src/db/schema.sql` - 21 tables with indexes
- `src/middleware/` - Auth, rate limiting, error handling
- `wrangler.toml` - Cloudflare configuration

### Frontend (`cloudflare/pages`)

**Modules (11 total):**
- Login, Dashboard, Contacts, Organizations
- Leads, Deals, Activities, Tasks
- Providers, Email, Settings
- PublicDirectory (provider search)

**Key Files:**
- `src/main.tsx` - React entry point
- `src/App.tsx` - Router setup with protected routes
- `src/stores/` - Zustand state management
- `src/services/` - API client with axios
- `vite.config.ts` - Build configuration

---

## Database Schema

**21 Tables:**
- `users` - User accounts
- `organizations` - B2B accounts
- `contacts` - Person records
- `leads` - Lead tracking
- `deals` - Sales pipeline
- `activities` - Calls, emails, tasks, meetings
- `emails` - Synced from Gmail
- `phone_calls` - Twilio call records
- `npi_providers` - Provider directory (20+ fields)
- `provider_claims` - Provider profile claims
- `campaigns`, `tasks`, `workflows`
- `ai_models`, `ai_predictions`
- `integrations`, `api_keys`, `oauth_tokens`
- `audit_logs`, `settings`, `backups`, `rate_limits`

**See `cloudflare/workers/src/db/schema.sql` for full schema.**

---

## Development Setup

### Prerequisites
- Node.js 20+ LTS
- Cloudflare account with Workers, Pages, D1 access

### Quick Start

```powershell
# Automated setup (run as Administrator)
cd C:\Aethera-CRM
.\scripts\install-prerequisites.ps1
.\scripts\setup.ps1

# Manual setup
cd cloudflare\workers
npm install

cd ..\pages
npm install

# Start development servers
# Terminal 1 - Backend
cd cloudflare\workers
npm run dev  # http://localhost:8787

# Terminal 2 - Frontend
cd cloudflare\pages
npm run dev  # http://localhost:5173
```

### Default Credentials
- **Username:** `aethera`
- **Password:** `Aetherahealthcare@2026`

---

## Configuration

### Environment Variables (`.env`)

```env
# Cloudflare
CLOUDFLARE_ACCOUNT_ID=2c268625d9e6e4c084ff296fcdf5f3bd
CLOUDFLARE_API_TOKEN=your_api_token_here

# Database
D1_DATABASE_NAME=aethera-crm-db
D1_DATABASE_ID=2695343a-69be-4f82-a0a6-f95250d6da23

# AI Gateway
AI_GATEWAY_URL=https://gateway.ai.cloudflare.com/v1/.../aethera-gateway
AI_GEMMA_MODEL=@cf/google/gemma-7b-it

# Auth
JWT_SECRET=aethera_healthcare_jwt_secret_2026
JWT_EXPIRY_HOURS=24

# Integrations
TWILIO_ACCOUNT_SID=
GOOGLE_CLIENT_ID=
```

**See `.env` for complete configuration.**

---

## API Structure

**Base URL:** `http://localhost:8787/api/v1`

### Public Routes (No Auth)
- `GET /health` - Health check
- `GET /public/providers/*` - Provider search

### Protected Routes (JWT/API Key)
- `POST /auth/login` - Login
- `POST /auth/logout` - Logout
- `GET /contacts/*` - Contacts CRUD
- `GET /organizations/*` - Organizations CRUD
- `GET /leads/*` - Leads CRUD
- `GET /deals/*` - Deals CRUD
- `GET /activities/*` - Activities CRUD
- `GET /providers/*` - Providers CRUD
- `GET /tasks/*` - Tasks CRUD
- `GET /ai/*` - AI features
- `GET /settings/*` - Configuration

**Rate Limiting:** 1000 requests/hour per API key

---

## Key Features

### Implemented (Phase 1)
- ✅ Full CRUD for contacts, organizations, leads, deals
- ✅ Activity tracking (calls, emails, tasks, meetings)
- ✅ Authentication with JWT + API keys
- ✅ Rate limiting middleware
- ✅ Audit logging
- ✅ Provider directory with NPPES integration prep
- ✅ Lead scoring (rule-based)
- ✅ Sentiment analysis (AI Gateway)
- ✅ Call transcription and summaries

### Pending (Phases 2-12)
- ⏳ NPPES live API integration
- ⏳ Gmail sync
- ⏳ Twilio voice/SMS
- ⏳ Email scraping
- ⏳ AI Gateway configuration
- ⏳ Workflow automation (n8n)
- ⏳ Self-hosted services (DocuSeal, Cal.com, Jitsi)

---

## Deployment

### Deploy Backend
```powershell
cd cloudflare\workers
npm run deploy
```

### Deploy Frontend
```powershell
cd cloudflare\pages
npm run build
npx wrangler pages deploy dist
```

---

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/install-prerequisites.ps1` | Install Node.js and dependencies |
| `scripts/setup.ps1` | Setup Cloudflare resources |
| `scripts/setup-cloudflare.ps1` | Create D1, R2, Queues |

---

## Important Notes

1. **Database:** D1 database ID must be updated in `wrangler.toml` after creation
2. **AI Gateway:** Configure manually in Cloudflare dashboard
3. **CORS:** Already configured for localhost:5173
4. **Build:** No backend build step required (Workers run TypeScript directly)
5. **Testing:** Phase 12 will include test suite

---

## Files of Interest

| File | Description |
|------|-------------|
| `cloudflare/workers/src/index.ts` | Main API entry point |
| `cloudflare/workers/src/db/schema.sql` | Database schema |
| `cloudflare/pages/src/App.tsx` | Frontend routing |
| `cloudflare/pages/vite.config.ts` | Frontend build config |
| `.env` | Environment configuration |
| `IMPLEMENTATION_STATUS.md` | Detailed implementation report |

---

## Support

- **Email:** info@aetherahealthcare.com
- **Documentation:** `docs/` folder
- **Status:** `IMPLEMENTATION_STATUS.md`

---

**Built for Aethera Healthcare | © 2026**
