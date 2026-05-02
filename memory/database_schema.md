---
name: Database Schema
description: 21+ tables including users, organizations, leads, deals, npi_providers
type: project
---

**Key Tables:**

| Table | Purpose |
|-------|---------|
| `users` | User accounts with roles (admin/user/readonly) |
| `organizations` | B2B accounts |
| `contacts` | Person records (B2B + B2C) |
| `leads` | Lead tracking with workflow_stage |
| `deals` | Sales pipeline with onboarding_stage |
| `activities` | Calls, emails, tasks, meetings |
| `emails` | Synced from Gmail |
| `phone_calls` | Twilio call records with transcription |
| `npi_providers` | Provider directory (20+ fields) |
| `payer_enrollment` | Carrier enrollment tracking |
| `compliance` | BAA status and audit dates |
| `provider_claims` | Provider profile claims |
| `campaigns`, `tasks`, `workflows` | Marketing/ops |
| `ai_models`, `ai_predictions` | AI features |
| `integrations`, `api_keys`, `oauth_tokens` | Integration management |
| `audit_logs`, `system_logs` | Observability |
| `onboarding_checklists` | HIPAA-compliant onboarding |
| `document_vault` | HIPAA-compliant document tracking |
| `call_queue`, `call_predictions`, `scheduled_calls` | Call center features |
| `technical_setup` | Provider technical implementation tracking |

**See:** `cloudflare/workers/src/db/schema.sql` for full schema with 50+ indexes.

**Why:** Healthcare-specific schema with RCM workflow stages, compliance tracking, and call center analytics.

**How to apply:** New features requiring data storage must add appropriate tables/indexes to schema.sql.
