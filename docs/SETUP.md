# Aethera-CRM Setup Guide

## Prerequisites

Before starting, ensure you have:
- Node.js 18+ installed
- npm or yarn package manager
- Cloudflare account with access to Workers, Pages, D1, and AI Gateway
- Git (optional, for version control)

## Quick Start

### 1. Install Dependencies

```bash
# Backend (Workers)
cd cloudflare/workers
npm install

# Frontend (Pages)
cd cloudflare/pages
npm install
```

### 2. Configure Environment

```bash
# From project root
cp .env.example .env
```

Edit `.env` with your credentials:
- `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare account ID
- `CLOUDFLARE_API_TOKEN`: API token with Workers, Pages, D1 permissions
- `JWT_SECRET`: Generate a secure random string
- Other values as needed

### 3. Create Cloudflare Resources

```bash
cd cloudflare/workers

# Create D1 Database
npx wrangler d1 create aethera-crm-db

# Note the database_id from the output and update wrangler.toml

# Run database migrations
npx wrangler d1 execute aethera-crm-db --file=src/db/schema.sql

# Create R2 Bucket (optional, for file storage)
npx wrangler r2 bucket create aethera-crm-storage

# Create Queues (optional, for async processing)
npx wrangler queues create aethera-email-sync
npx wrangler queues create aethera-ai-jobs
npx wrangler queues create aethera-scraping
```

### 4. Update Configuration

Edit `cloudflare/workers/wrangler.toml`:
- Replace `database_id` with your D1 database ID
- Replace `bucket_id` with your R2 bucket ID (if using)
- Update `account_id` if different

### 5. Run Development Servers

```bash
# Terminal 1 - Backend
cd cloudflare/workers
npm run dev
# Backend runs on http://localhost:8787

# Terminal 2 - Frontend
cd cloudflare/pages
npm run dev
# Frontend runs on http://localhost:5173
```

### 6. Test the Application

1. Open http://localhost:5173 in your browser
2. Login with default credentials:
   - Username: `aethera`
   - Password: `Aetherahealthcare@2026`
3. Explore the dashboard and modules

## Deployment

### Deploy Backend

```bash
cd cloudflare/workers
npm run deploy
```

### Deploy Frontend

```bash
cd cloudflare/pages
npm run build
npx wrangler pages deploy dist
```

Or configure automatic deployments via Cloudflare dashboard.

## Troubleshooting

### Common Issues

**D1 Database Errors:**
- Ensure database ID is correct in wrangler.toml
- Run migrations with `npx wrangler d1 execute ...`

**Authentication Issues:**
- Check JWT_SECRET is set in .env
- Ensure it's the same in both workers and pages

**API Connection Errors:**
- Verify backend is running on port 8787
- Check proxy configuration in vite.config.ts

### Getting Help

- Check Cloudflare Workers documentation: https://developers.cloudflare.com/workers/
- Check Cloudflare Pages documentation: https://developers.cloudflare.com/pages/
- Review D1 documentation: https://developers.cloudflare.com/d1/

## Next Steps

After Phase 1 setup:
1. Phase 2: Core CRM enhancements
2. Phase 3: NPPES integration
3. Phase 4: Email scraping
4. Phase 5: Gmail integration
5. Phase 6: AI features
6. Phase 7-12: Advanced features

See individual phase documentation for details.
