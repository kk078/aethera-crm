# ============================================
# Aethera-CRM Project Verification Script
# ============================================

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Aethera-CRM Project Verification" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$checks = @{
    "Project Structure" = @(
        "cloudflare\workers\src\routes",
        "cloudflare\workers\src\middleware",
        "cloudflare\workers\src\db",
        "cloudflare\workers\src\types",
        "cloudflare\workers\src\utils",
        "cloudflare\pages\src\modules",
        "cloudflare\pages\src\components",
        "cloudflare\pages\src\services",
        "cloudflare\pages\src\stores",
        "scripts",
        "docs",
        "backups"
    )
    "Backend Files" = @(
        "cloudflare\workers\package.json",
        "cloudflare\workers\wrangler.toml",
        "cloudflare\workers\tsconfig.json",
        "cloudflare\workers\src\index.ts",
        "cloudflare\workers\src\db\schema.sql",
        "cloudflare\workers\src\middleware\auth.ts",
        "cloudflare\workers\src\routes\auth.ts",
        "cloudflare\workers\src\routes\contacts.ts",
        "cloudflare\workers\src\routes\organizations.ts",
        "cloudflare\workers\src\routes\leads.ts",
        "cloudflare\workers\src\routes\deals.ts",
        "cloudflare\workers\src\routes\activities.ts",
        "cloudflare\workers\src\routes\tasks.ts",
        "cloudflare\workers\src\routes\campaigns.ts",
        "cloudflare\workers\src\routes\providers.ts",
        "cloudflare\workers\src\routes\emails.ts",
        "cloudflare\workers\src\routes\twilio.ts",
        "cloudflare\workers\src\routes\ai.ts",
        "cloudflare\workers\src\routes\workflows.ts",
        "cloudflare\workers\src\routes\settings.ts",
        "cloudflare\workers\src\routes\backup.ts"
    )
    "Frontend Files" = @(
        "cloudflare\pages\package.json",
        "cloudflare\pages\vite.config.ts",
        "cloudflare\pages\tsconfig.json",
        "cloudflare\pages\index.html",
        "cloudflare\pages\src\main.tsx",
        "cloudflare\pages\src\App.tsx",
        "cloudflare\pages\src\stores\authStore.ts",
        "cloudflare\pages\src\services\api.ts",
        "cloudflare\pages\src\components\layout\MainLayout.tsx",
        "cloudflare\pages\src\modules\auth\Login.tsx",
        "cloudflare\pages\src\modules\dashboard\Dashboard.tsx",
        "cloudflare\pages\src\modules\contacts\Contacts.tsx",
        "cloudflare\pages\src\modules\organizations\Organizations.tsx",
        "cloudflare\pages\src\modules\leads\Leads.tsx",
        "cloudflare\pages\src\modules\deals\Deals.tsx",
        "cloudflare\pages\src\modules\activities\Activities.tsx",
        "cloudflare\pages\src\modules\tasks\Tasks.tsx",
        "cloudflare\pages\src\modules\email\Email.tsx",
        "cloudflare\pages\src\modules\providers\Providers.tsx",
        "cloudflare\pages\src\modules\settings\Settings.tsx",
        "cloudflare\pages\src\modules\public-directory\PublicDirectory.tsx"
    )
    "Configuration Files" = @(
        ".env",
        ".env.example",
        ".gitignore",
        "README.md",
        "INSTALL.md",
        "IMPLEMENTATION_STATUS.md"
    )
    "Scripts" = @(
        "scripts\setup.ps1",
        "scripts\setup-cloudflare.ps1",
        "scripts\install-prerequisites.ps1"
    )
    "Documentation" = @(
        "docs\SETUP.md",
        "docs\PHASE1-STATUS.md"
    )
}

$allPassed = $true

foreach ($category in $checks.Keys) {
    Write-Host "`n$category" -ForegroundColor Cyan
    $categoryPassed = $true
    
    foreach ($item in $checks[$category]) {
        $path = Join-Path $ProjectRoot $item
        if (Test-Path $path) {
            Write-Host "  ✓ $item" -ForegroundColor Green
        }
        else {
            Write-Host "  ✗ $item (MISSING)" -ForegroundColor Red
            $categoryPassed = $false
            $allPassed = $false
        }
    }
    
    if (-not $categoryPassed) {
        Write-Host "  WARNING: Some files in $category are missing!" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan

if ($allPassed) {
    Write-Host "  ✓ ALL CHECKS PASSED" -ForegroundColor Green
    Write-Host "============================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Project structure is complete and ready!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Install Node.js 20 from https://nodejs.org" -ForegroundColor White
    Write-Host "2. Run: .\scripts\setup.ps1" -ForegroundColor White
    Write-Host "3. Start dev servers and test the application" -ForegroundColor White
    Write-Host ""
}
else {
    Write-Host "  ✗ SOME CHECKS FAILED" -ForegroundColor Red
    Write-Host "============================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please review the missing files above." -ForegroundColor Red
    Write-Host ""
}

# Count files
$backendRoutes = (Get-ChildItem (Join-Path $ProjectRoot "cloudflare\workers\src\routes") -Filter "*.ts").Count
$frontendModules = (Get-ChildItem (Join-Path $ProjectRoot "cloudflare\pages\src\modules") -Recurse -Filter "*.tsx").Count
$totalFiles = (Get-ChildItem $ProjectRoot -Recurse -File -Exclude "node_modules","dist",".git").Count

Write-Host "File Statistics:" -ForegroundColor Cyan
Write-Host "  Backend Routes: $backendRoutes" -ForegroundColor White
Write-Host "  Frontend Modules: $frontendModules" -ForegroundColor White
Write-Host "  Total Files: $totalFiles" -ForegroundColor White
Write-Host ""
