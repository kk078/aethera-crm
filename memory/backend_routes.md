---
name: Backend Routes
description: 20+ route files in cloudflare/workers/src/routes
type: project
---

**Route Modules (20+ files):**

| File | Purpose |
|------|---------|
| `auth.ts` | Login, logout, JWT, API keys |
| `contacts.ts` | Contact CRUD operations |
| `organizations.ts` | Organization CRUD |
| `leads.ts` | Leads CRUD + scoring |
| `deals.ts` | Deals CRUD + pipeline |
| `activities.ts` | Activities CRUD (calls, emails, tasks, meetings) |
| `emails.ts` | Email management + Gmail sync prep |
| `providers.ts` | Providers CRUD + NPPES integration |
| `campaigns.ts` | Campaigns CRUD |
| `tasks.ts` | Tasks CRUD |
| `ai.ts` | AI features (scoring, sentiment, drafting) |
| `twilio.ts` | Call/SMS integration |
| `workflows.ts` | Workflow management (n8n prep) |
| `settings.ts` | Configuration settings |
| `backup.ts` | Database backup operations |
| `onboarding.ts` | Onboarding checklists |
| `provider-leads.ts` | Provider lead generation |
| `call-queue.ts` | Call queue management |
| `call-analytics.ts` | Call analytics and predictions |
| `calendar-integration.ts` | Calendar sync |
| `seed.ts` | Database seeding |
| `debug.ts` | Debug endpoints |
| `scraper.ts` | Web scraper |
| `billing-knowledge.ts` | Billing knowledge base |

**Why:** Organized by domain with clear separation of concerns.

**How to apply:** New API endpoints go in dedicated route files with Zod validation.
