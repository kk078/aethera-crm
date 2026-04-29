# ============================================
# Aethera-CRM Automated Setup Script
# ============================================

param(
    [switch]$SkipNPM,
    [switch]$SkipCloudflare,
    [switch]$Production
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Aethera-CRM Automated Setup" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

function Test-NodeVersion {
    if (-not (Get-Command "node" -ErrorAction SilentlyContinue)) {
        Write-Host "Node.js not found. Please install Node.js 18+" -ForegroundColor Red
        return $false
    }
    
    $nodeVersion = node --version
    Write-Host "Node.js found: $nodeVersion" -ForegroundColor Green
    
    $majorVersion = $nodeVersion -replace 'v(\d+)\..*', '$1'
    if ([int]$majorVersion -lt 18) {
        Write-Host "Node.js version must be 18 or higher" -ForegroundColor Red
        return $false
    }
    
    return $true
}

function Install-NPM {
    param($path)
    
    Write-Host "Installing dependencies in $path..." -ForegroundColor Cyan
    
    Push-Location $path
    try {
        npm install
        Write-Host "Dependencies installed successfully" -ForegroundColor Green
    }
    catch {
        Write-Host "Failed to install dependencies" -ForegroundColor Red
        throw
    }
    finally {
        Pop-Location
    }
}

try {
    Set-Location $ProjectRoot
    
    Write-Host "Checking prerequisites..." -ForegroundColor Cyan
    
    $nodeOk = Test-NodeVersion
    if (-not $nodeOk) {
        throw "Node.js 18+ is required"
    }
    
    if (-not $SkipNPM) {
        Install-NPM (Join-Path $ProjectRoot "cloudflare\workers")
        Install-NPM (Join-Path $ProjectRoot "cloudflare\pages")
    }
    
    Write-Host ""
    Write-Host "Setup Complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Run setup-cloudflare.ps1 to configure Cloudflare" -ForegroundColor White
    Write-Host "2. Run npm run dev in cloudflare/workers" -ForegroundColor White
    Write-Host "3. Run npm run dev in cloudflare/pages" -ForegroundColor White
    Write-Host ""
}
catch {
    Write-Host "Setup failed: $_" -ForegroundColor Red
    exit 1
}
