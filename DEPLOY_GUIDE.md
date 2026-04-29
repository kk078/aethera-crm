# 🚀 Cloudflare Pages Manual Deployment Guide

## Quick Deploy: 5-Minute Setup

### ✅ Prerequisites
- [ ] Cloudflare account (you have this!)
- [ ] Built frontend files ready (`dist/` folder)

---

## Method 1: Direct Upload (Fastest - 2 minutes)

### Step 1: Log in to Cloudflare Dashboard
1. Go to **https://dash.cloudflare.com**
2. Sign in with your account: **aetherahealthcare@gmail.com**

### Step 2: Create Pages Project
1. Click **Workers & Pages** in the left sidebar
2. Click **Create Application**
3. Select the **Pages** tab
4. Click **Upload assets**

### Step 3: Upload Your Build
1. **Project name:** `aethera-crm`
2. Click **Create project**
3. Drag and drop the entire **`dist/` folder** from:
   ```
   C:\Aethera-CRM\cloudflare\pages\dist
   ```
4. Wait for upload (should be ~2-5 seconds)
5. Click **Deploy site**

### Step 4: Configure Environment Variables
1. Go to your project settings
2. Click **Settings** → **Environment variables**
3. Add:
   - `VITE_API_URL` = `https://aethera-crm-api.aetherahealthcare.workers.dev/api/v1`

### Step 5: Your Site is Live! 🎉
- **URL:** `https://aethera-crm.pages.dev`
- **Custom domain:** Can add later if needed

---

## Method 2: Using Wrangler CLI (If Token Has Permissions)

If you generate a new API token with Pages permissions:

```bash
# Set token as environment variable
$env:CLOUDFLARE_API_TOKEN = "your-token-here"

# Deploy
cd C:\Aethera-CRM\cloudflare\pages
npx wrangler pages deploy dist --project-name aethera-crm
```

### Required Token Permissions:
- `Zone:Read`
- `Account:Read`
- `Cloudflare Pages:Edit`

---

## 🔧 Post-Deployment Configuration

### CORS Settings
Your backend already has CORS configured for:
- `localhost:5173` (local dev)
- `aetherahealthcare.com` (production)
- `aethera-crm.pages.dev` (Pages default)

If you use a custom domain, update `wrangler.toml`:
```toml
[vars]
FRONTEND_URL = "https://your-custom-domain.com"
```

### API Endpoint Configuration
The frontend is built with API endpoint pointing to:
```
https://aethera-crm-api.aetherahealthcare.workers.dev/api/v1
```

If this changes, rebuild with:
```bash
$env:VITE_API_URL = "https://your-new-api.com/api/v1"
npm run build
```

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] Site loads at `https://aethera-crm.pages.dev`
- [ ] Login page works
- [ ] Can log in with: `aethera` / `Aetherahealthcare@2026`
- [ ] Dashboard shows data cards
- [ ] Contacts module loads and shows data
- [ ] Organizations module loads
- [ ] Providers shows 247 Florida providers
- [ ] All other modules load without errors
- [ ] No CORS errors in browser console

---

## 🐛 Troubleshooting

### "CORS Error"
- Check that `FRONTEND_URL` in wrangler.toml matches your Pages URL
- Redeploy backend if needed: `npm run deploy` in workers folder

### "404 Not Found" on refresh
- Pages uses SPA routing - ensure `_redirects` file is in dist/
- Or configure Pages: Settings → Build & Deploy → SPA settings

### "API Error 401"
- Backend is not running or token expired
- Check backend: `https://aethera-crm-api.aetherahealthcare.workers.dev/health`

### "Blank Page"
- Check browser console for JavaScript errors
- Verify all files uploaded (check dist/ folder has index.html + assets/)

---

## 📱 Access Information

### Production URLs
```
Frontend: https://aethera-crm.pages.dev
Backend:  https://aethera-crm-api.aetherahealthcare.workers.dev
API Base: https://aethera-crm-api.aetherahealthcare.workers.dev/api/v1
```

### Credentials
```
Username: aethera
Password: Aetherahealthcare@2026
Role: admin
```

---

## 🔄 Updating the Deployment

To update after making changes:

1. Rebuild: `npm run build`
2. Re-upload the `dist/` folder to Cloudflare Pages
3. Or use Wrangler CLI if configured

---

**Last Updated:** April 28, 2026
**Status:** Ready for deployment
**Frontend Build:** `C:\Aethera-CRM\cloudflare\pages\dist`

🚀 **Deploy now and start using Aethera-CRM!**
