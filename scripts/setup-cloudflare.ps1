# ============================================
# Aethera-CRM Cloudflare Setup Script
# ============================================

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Aethera-CRM Cloudflare Setup" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Load .env file
$envFile = Join-Path $ProjectRoot ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)\s*=\s*(.+)\s*$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim().Trim('"').Trim("'")
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
}

$accountId = $env:CLOUDFLARE_ACCOUNT_ID
$apiToken = $env:CLOUDFLARE_API_TOKEN

if (-not $accountId -or -not $apiToken) {
    Write-Host "ERROR: Cloudflare credentials not found in .env" -ForegroundColor Red
    exit 1
}

Write-Host "Account ID: $accountId" -ForegroundColor Green
Write-Host "API Token: ${apiToken.Substring(0, 10)}..." -ForegroundColor Green
Write-Host ""

# Navigate to workers directory
$workersPath = Join-Path $ProjectRoot "cloudflare\workers"
Set-Location $workersPath

# Install wrangler globally
Write-Host "Installing Wrangler CLI..." -ForegroundColor Cyan
npm install -g wrangler

# Create D1 Database
Write-Host ""
Write-Host "Creating D1 Database..." -ForegroundColor Cyan
$createOutput = npx wrangler d1 create aethera-crm-db --account $accountId 2>&1
Write-Host $createOutput

# Extract database ID from output (this is a simplified approach)
# In production, you'd parse the actual output
Write-Host ""
Write-Host "Listing databases..." -ForegroundColor Cyan
$dbList = npx wrangler d1 list --account $accountId --json 2>$null
if ($dbList) {
    Write-Host "Databases found:" -ForegroundColor Green
    Write-Host $dbList
}

# Create R2 Bucket
Write-Host ""
Write-Host "Creating R2 Bucket..." -ForegroundColor Cyan
npx wrangler r2 bucket create aethera-crm-storage --account $accountId

# Create Queues
Write-Host ""
Write-Host "Creating Queues..." -ForegroundColor Cyan
$queues = @("aethera-email-sync", "aethera-ai-jobs", "aethera-scraping")
foreach ($queue in $queues) {
    Write-Host "Creating queue: $queue" -ForegroundColor Cyan
    npx wrangler queues create $queue --account $accountId
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  Cloudflare Setup Complete!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Manual steps required:" -ForegroundColor Yellow
Write-Host "1. Update wrangler.toml with the D1 database_id" -ForegroundColor White
Write-Host "2. Update wrangler.toml with the R2 bucket_id" -ForegroundColor White
Write-Host "3. Configure AI Gateway in Cloudflare dashboard" -ForegroundColor White
Write-Host ""
