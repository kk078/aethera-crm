# Aethera-CRM - Installation Guide

## Quick Start (Automated)

### Option 1: Full Automated Setup (Recommended)

1. **Run the automated setup script as Administrator:**
```powershell
# Right-click PowerShell and select "Run as Administrator"
cd C:\Aethera-CRM
.\scripts\install-prerequisites.ps1
```

2. **After prerequisites install, restart your computer, then run:**
```powershell
.\scripts\setup.ps1
```

3. **Follow the prompts to start development servers**

### Option 2: Manual Installation

If you prefer manual installation or the automated script doesn't work:

#### Step 1: Install Node.js

1. Download Node.js 20 LTS from: https://nodejs.org
2. Run the installer
3. Restart your computer (important for PATH updates)
4. Verify installation: `node --version` (should show v20.x.x)

#### Step 2: Install Dependencies

```powershell
# Backend
cd C:\Aethera-CRM\cloudflare\workers
npm install

# Frontend
cd C:\Aethera-CRM\cloudflare\pages
npm install
```

#### Step 3: Setup Cloudflare Resources

```powershell
cd C:\Aethera-CRM
.\scripts\setup-cloudflare.ps1
```

This script will:
- Install Wrangler CLI
- Create D1 database
- Create R2 bucket
- Create Queues
- Update configuration files

#### Step 4: Configure Environment

The `.env` file is already configured with your Cloudflare credentials. After running the Cloudflare setup script, you need to update the database IDs in `cloudflare/workers/wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "aethera-crm-db"
database_id = "YOUR_DATABASE_ID_HERE"  # ← Update this

[[r2_buckets]]
binding = "STORAGE"
bucket_name = "aethera-crm-storage"
bucket_id = "YOUR_BUCKET_ID_HERE"  # ← Update this
```

#### Step 5: Start Development Servers

Open TWO terminal windows:

**Terminal 1 (Backend):**
```powershell
cd C:\Aethera-CRM\cloudflare\workers
npm run dev
```

**Terminal 2 (Frontend):**
```powershell
cd C:\Aethera-CRM\cloudflare\pages
npm run dev
```

#### Step 6: Access the Application

1. Open your browser to: http://localhost:5173
2. Login with:
   - **Username:** `aethera`
   - **Password:** `Aetherahealthcare@2026`

## Troubleshooting

### Node.js Not Found

**Problem:** `node is not recognized as an internal or external command`

**Solution:**
1. Install Node.js from https://nodejs.org
2. Restart your computer (required for PATH updates)
3. Open a NEW terminal window
4. Verify: `node --version`

### npm install Fails

**Problem:** Dependency installation errors

**Solution:**
```powershell
# Clear npm cache
npm cache clean --force

# Delete node_modules
Remove-Item -Recurse -Force node_modules

# Reinstall
npm install
```

### Wrangler Authentication Errors

**Problem:** `Error: You need to provide a Cloudflare API token`

**Solution:**
```powershell
# Login to Cloudflare
npx wrangler login

# Or set token manually
$env:CLOUDFLARE_API_TOKEN="your_api_token_here"
```

### D1 Database Errors

**Problem:** Database not found or migration errors

**Solution:**
```powershell
# Check if database exists
npx wrangler d1 list

# Run migrations manually
npx wrangler d1 execute aethera-crm-db --file=src/db/schema.sql

# Or reset database
npx wrangler d1 delete aethera-crm-db
npx wrangler d1 create aethera-crm-db
npx wrangler d1 execute aethera-crm-db --file=src/db/schema.sql
```

### Port Already in Use

**Problem:** Port 8787 or 5173 already in use

**Solution:**
```powershell
# Find process using the port
netstat -ano | findstr :8787

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

## Production Deployment

### Deploy Backend

```powershell
cd C:\Aethera-CRM\cloudflare\workers
npm run deploy
```

### Deploy Frontend

```powershell
cd C:\Aethera-CRM\cloudflare\pages
npm run build
npx wrangler pages deploy dist
```

### Configure Custom Domain

1. Go to Cloudflare Dashboard → Pages
2. Select `aethera-crm-pages`
3. Click "Custom domains"
4. Add your domain (e.g., `app.aetherahealthcare.com`)

## Next Steps

After successful installation:

1. **Phase 1 Complete:** ✅ Core CRM is functional
2. **Phase 2:** Core CRM enhancements (Week 2)
3. **Phase 3:** NPPES integration (Week 3)
4. **Phase 4:** Email scraping (Week 4)
5. **Phase 5:** Gmail integration (Week 5)
6. **Phase 6:** AI features (Week 6)
7. **Phases 7-12:** Advanced features

See `docs/PHASE1-STATUS.md` for detailed status.

## Support

For issues:
1. Check this troubleshooting guide
2. Review Cloudflare docs: https://developers.cloudflare.com/workers/
3. Check application logs in terminal windows
4. Verify all environment variables are set correctly
