#!/bin/bash
# Aethera-CRM Automatic Deployment Script
# This script builds and deploys the frontend to crm.aetherahealthcare.com

set -e

echo "Starting deployment to crm.aetherahealthcare.com..."

# Run the build
echo "Building frontend..."
npx tsc
npx vite build

# Deploy to Cloudflare Pages
echo "Deploying to Cloudflare Pages..."
npx wrangler pages deploy dist --project-name aethera-crm

echo "Deployment complete!"
