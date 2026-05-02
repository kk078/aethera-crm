---
name: Architecture
description: Cloudflare Workers (Hono+TS) + Pages (React+Ant Design) + D1
type: project
---

**Tech Stack:**

| Component | Technology |
|-----------|-----------|
| Backend | TypeScript, Cloudflare Workers, Hono.js |
| Frontend | TypeScript, React 18, Ant Design 5.x, Vite |
| Database | Cloudflare D1 (SQLite) |
| Storage | Cloudflare R2 (configured) |
| Queues | Cloudflare Queues |
| AI | Cloudflare AI Gateway (Gemma, Llama, Mistral) |
| Auth | JWT + API Keys |
| State | Zustand + TanStack Query |
| Validation | Zod |

**Project Structure:**
```
Aethera-CRM/
├── cloudflare/
│   ├── workers/          # Backend API (Hono.js + TypeScript)
│   └── pages/            # Frontend (React + Ant Design)
├── docs/                 # Documentation
├── scripts/              # PowerShell setup scripts
└── .env                  # Environment configuration
```

**Why:** Cloudflare serverless platform for global low-latency healthcare CRM with integrated AI.

**How to apply:** All new features should follow Cloudflare Workers/Pages architecture patterns.
