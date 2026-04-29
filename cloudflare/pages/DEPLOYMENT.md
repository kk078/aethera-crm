# Aethera-CRM Automatic Deployment Setup

## Overview
This document describes how to set up automatic publishing to `crm.aetherahealthcare.com`.

## Current Setup
- Frontend: Cloudflare Pages project `aethera-crm` with custom domain `crm.aetherahealthcare.com`
- Backend: Cloudflare Worker at `https://aethera-crm-api.aetherahealthcare.workers.dev`

## Manual Deployment (Current)
Run these commands to publish changes:

```bash
# Deploy Backend (Workers)
cd cloudflare/workers
npm run deploy

# Deploy Frontend (Pages)
cd ../pages
npm run publish
```

## Automatic Deployment Options

### Option 1: GitHub Actions (Recommended)
If you initialize git and push to GitHub:

1. Initialize git repo: `git init`
2. Add remote: `git remote add origin https://github.com/YOUR_USERNAME/aethera-crm.git`
3. Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy Aethera CRM

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy Backend
        run: cd cloudflare/workers && npm install && npm run deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
      - name: Deploy Frontend
        run: cd cloudflare/pages && npm install && npm run publish
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

### Option 2: Cloudflare Pages Git Integration
Connect your Pages project to a git repository in the Cloudflare dashboard:
1. Go to Pages dashboard
2. Select `aethera-crm` project
3. Click "Git" in left menu
4. Connect your git repository
5. Select `main` branch
6. Enable "Auto-publish on push"

### Option 3: Direct API Deployment
For direct upload without git, use the wrangler commands as shown above.

## Verifying Deployment
After deployment, verify at:
- Frontend: https://crm.aetherahealthcare.com
- Backend: https://aethera-crm-api.aetherahealthcare.workers.dev/api/v1/health