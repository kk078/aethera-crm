---
name: Setup Commands
description: Quick start scripts and development commands
type: reference
---

**Prerequisites Installation:**
```powershell
cd C:\Aethera-CRM
.\scripts\install-prerequisites.ps1
.\scripts\setup.ps1
```

**Development Servers:**
```powershell
# Terminal 1 - Backend
cd cloudflare\workers
npm run dev  # http://localhost:8787

# Terminal 2 - Frontend
cd cloudflare\pages
npm run dev  # http://localhost:5173
```

**Cloudflare Deployment:**
```powershell
# Backend
cd cloudflare\workers
npm run deploy

# Frontend
cd cloudflare\pages
npm run build
npx wrangler pages deploy dist
```

**Database Setup:**
```powershell
npx wrangler d1 create aethera-crm-db
npx wrangler d1 execute aethera-crm-db --file=src/db/schema.sql
```

**Why:** Standardized setup ensures consistent development environment.

**How to apply:** Use these commands for new development setups or troubleshooting.
