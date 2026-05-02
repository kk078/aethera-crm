---
name: Deployment
description: Cloudflare Workers and Pages deployment process
type: project
---

**Deployment Process:**

**Backend (Cloudflare Workers):**
```powershell
cd cloudflare\workers
npm run deploy
```
- Uses Wrangler for deployment
- TypeScript runs directly (no build step)
- Auto-scales based on request volume

**Frontend (Cloudflare Pages):**
```powershell
cd cloudflare\pages
npm run build
npx wrangler pages deploy dist
```
- Vite builds to `dist/` folder
- Static file deployment
- Can configure automatic deployments via Cloudflare dashboard

**Environment Setup:**
1. Update `.env` with Cloudflare credentials
2. Create D1 database: `npx wrangler d1 create aethera-crm-db`
3. Run migrations: `npx wrangler d1 execute aethera-crm-db --file=src/db/schema.sql`
4. Update `wrangler.toml` with database_id
5. Create R2 bucket (optional): `npx wrangler r2 bucket create aethera-crm-storage`
6. Create Queues (optional): `npx wrangler queues create aethera-email-sync`

**Production Considerations:**
- Change `JWT_SECRET` to a secure random string
- Configure custom domain in Cloudflare dashboard
- Set up SSL certificates
- Configure environment variables in Cloudflare dashboard
- Update frontend API base URL for production

**Why:** Serverless deployment with Cloudflare's global network for low latency.

**How to apply:** Use these commands for deployment - never commit `.env` to version control.
