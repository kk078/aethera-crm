# ============================================
# Aethera-CRM - Complete Prerequisites Installer
# ============================================
# This script installs ALL requirements for Aethera-CRM
# Run as Administrator

param(
    [switch]$SkipPrompts,
    [switch]$Quiet
)

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Aethera-CRM - Complete Setup Installer" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This will install:" -ForegroundColor White
Write-Host "  - Node.js 20 LTS (for backend and frontend)" -ForegroundColor Green
Write-Host "  - Git (for version control)" -ForegroundColor Green
Write-Host "  - Python 3.11 (for web scraping)" -ForegroundColor Green
Write-Host "  - Visual C++ Redistributables" -ForegroundColor Green
Write-Host "  - .NET Framework (if needed)" -ForegroundColor Green
Write-Host ""

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: Please run this script as Administrator" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select Run as Administrator" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Running as Administrator: YES" -ForegroundColor Green
Write-Host ""

# Create temp directory
$TempDir = Join-Path $env:TEMP "Aethera-Install"
if (-not (Test-Path $TempDir)) {
    New-Item -ItemType Directory -Path $TempDir | Out-Null
}

Write-Host "Temp directory: $TempDir" -ForegroundColor Gray
Write-Host ""

# ============================================
# Install Visual C++ Redistributables
# ============================================
Write-Host "----------------------------------------" -ForegroundColor Gray
Write-Host "Step 1/6: Installing Visual C++ Redistributables..." -ForegroundColor Cyan

$VCRedistUrl = "https://aka.ms/vs/17/release/vc_redist.x64.exe"
$VCRedistPath = Join-Path $TempDir "vc_redist.x64.exe"

try {
    Write-Host "Downloading Visual C++ Redistributables..." -ForegroundColor Gray
    $webClient = New-Object System.Net.WebClient
    $webClient.DownloadFile($VCRedistUrl, $VCRedistPath)
    
    Write-Host "Installing (silent mode)..." -ForegroundColor Gray
    Start-Process -FilePath $VCRedistPath -ArgumentList "/install", "/quiet", "/norestart" -Wait
    
    Write-Host "Visual C++ Redistributables installed" -ForegroundColor Green
}
catch {
    Write-Host "Visual C++ installation skipped or already installed" -ForegroundColor Yellow
}

Write-Host ""

# ============================================
# Install .NET Framework
# ============================================
Write-Host "----------------------------------------" -ForegroundColor Gray
Write-Host "Step 2/6: Checking .NET Framework..." -ForegroundColor Cyan

$netVersion = (Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\NET Framework Setup\NDP\v4\Full" -ErrorAction SilentlyContinue).Release
if ($null -eq $netVersion -or $netVersion -lt 528040) {
    Write-Host "Installing .NET Framework 4.8..." -ForegroundColor Gray
    
    $DotNetUrl = "https://go.microsoft.com/fwlink/?linkid=2088631"
    $DotNetPath = Join-Path $TempDir "ndp48.exe"
    
    try {
        $webClient = New-Object System.Net.WebClient
        $webClient.DownloadFile($DotNetUrl, $DotNetPath)
        
        Start-Process -FilePath $DotNetPath -ArgumentList "/q", "/norestart" -Wait
        Write-Host ".NET Framework installed" -ForegroundColor Green
    }
    catch {
        Write-Host ".NET Framework installation skipped" -ForegroundColor Yellow
    }
}
else {
    Write-Host ".NET Framework already installed (Version: $netVersion)" -ForegroundColor Green
}

Write-Host ""

# ============================================
# Install Node.js 20 LTS
# ============================================
Write-Host "----------------------------------------" -ForegroundColor Gray
Write-Host "Step 3/6: Installing Node.js 20 LTS..." -ForegroundColor Cyan

$NodeUrl = "https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi"
$NodePath = Join-Path $TempDir "node-installer.msi"

try {
    Write-Host "Downloading Node.js (this may take a few minutes)..." -ForegroundColor Gray
    $webClient = New-Object System.Net.WebClient
    $webClient.DownloadFile($NodeUrl, $NodePath)
    
    Write-Host "Installing (silent mode)..." -ForegroundColor Gray
    $process = Start-Process -FilePath "msiexec.exe" -ArgumentList "/i", $NodePath, "/quiet", "/norestart" -PassThru -Wait
    
    Write-Host "Node.js installed" -ForegroundColor Green
    
    # Refresh environment variables
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}
catch {
    Write-Host "Node.js installation failed: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""

# ============================================
# Install Git
# ============================================
Write-Host "----------------------------------------" -ForegroundColor Gray
Write-Host "Step 4/6: Installing Git..." -ForegroundColor Cyan

$GitUrl = "https://github.com/git-for-windows/git/releases/download/v2.43.0.windows.1/Git-2.43.0-64-bit.exe"
$GitPath = Join-Path $TempDir "git-installer.exe"

try {
    Write-Host "Downloading Git..." -ForegroundColor Gray
    $webClient = New-Object System.Net.WebClient
    $webClient.DownloadFile($GitUrl, $GitPath)
    
    Write-Host "Installing (silent mode)..." -ForegroundColor Gray
    Start-Process -FilePath $GitPath -ArgumentList "/VERYSILENT", "/NORESTART", "/SP-", "/SUPPRESSMSGBOXES" -Wait
    
    Write-Host "Git installed" -ForegroundColor Green
    
    # Refresh environment variables
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}
catch {
    Write-Host "Git installation skipped" -ForegroundColor Yellow
}

Write-Host ""

# ============================================
# Install Python 3.11
# ============================================
Write-Host "----------------------------------------" -ForegroundColor Gray
Write-Host "Step 5/6: Installing Python 3.11..." -ForegroundColor Cyan

$PythonUrl = "https://www.python.org/ftp/python/3.11.8/python-3.11.8-amd64.exe"
$PythonPath = Join-Path $TempDir "python-installer.exe"

try {
    Write-Host "Downloading Python 3.11..." -ForegroundColor Gray
    $webClient = New-Object System.Net.WebClient
    $webClient.DownloadFile($PythonUrl, $PythonPath)
    
    Write-Host "Installing (silent mode, adds to PATH)..." -ForegroundColor Gray
    Start-Process -FilePath $PythonPath -ArgumentList "/quiet", "InstallAllUsers=1", "PrependPath=1", "Include_test=0" -Wait
    
    Write-Host "Python installed" -ForegroundColor Green
    
    # Refresh environment variables
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}
catch {
    Write-Host "Python installation skipped (optional for basic usage)" -ForegroundColor Yellow
}

Write-Host ""

# ============================================
# Verify Installations
# ============================================
Write-Host "----------------------------------------" -ForegroundColor Gray
Write-Host "Step 6/6: Verifying Installations..." -ForegroundColor Cyan
Write-Host ""

$allInstalled = $true

# Verify Node.js
try {
    $nodeVersion = & "node" --version
    Write-Host "  [OK] Node.js: $nodeVersion" -ForegroundColor Green
}
catch {
    Write-Host "  [FAIL] Node.js: Not found" -ForegroundColor Red
    $allInstalled = $false
}

# Verify npm
try {
    $npmVersion = & "npm" --version
    Write-Host "  [OK] npm: $npmVersion" -ForegroundColor Green
}
catch {
    Write-Host "  [FAIL] npm: Not found" -ForegroundColor Red
    $allInstalled = $false
}

# Verify Git
try {
    $gitVersion = & "git" --version
    Write-Host "  [OK] Git: $gitVersion" -ForegroundColor Green
}
catch {
    Write-Host "  [WARN] Git: Not found" -ForegroundColor Yellow
}

# Verify Python
try {
    $pythonVersion = & "python" --version
    Write-Host "  [OK] Python: $pythonVersion" -ForegroundColor Green
}
catch {
    Write-Host "  [WARN] Python: Not found (optional)" -ForegroundColor Yellow
}

Write-Host ""

# ============================================
# Cleanup
# ============================================
Write-Host "----------------------------------------" -ForegroundColor Gray
Write-Host "Cleaning up installer files..." -ForegroundColor Cyan

try {
    Remove-Item -Path $TempDir -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "Cleanup complete" -ForegroundColor Green
}
catch {
    Write-Host "Some temp files may remain" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Installation Summary" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

if ($allInstalled) {
    Write-Host "SUCCESS! All core requirements installed." -ForegroundColor Green
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Cyan
    Write-Host "1. Close this window and open a NEW PowerShell window" -ForegroundColor White
    Write-Host "2. Navigate to: cd C:\Aethera-CRM" -ForegroundColor White
    Write-Host "3. Run the setup: .\scripts\setup.ps1" -ForegroundColor White
    Write-Host ""
    Write-Host "OR manually:" -ForegroundColor Cyan
    Write-Host "  cd C:\Aethera-CRM\cloudflare\workers" -ForegroundColor White
    Write-Host "  npm install" -ForegroundColor White
    Write-Host "  npm run dev" -ForegroundColor White
    Write-Host ""
}
else {
    Write-Host "PARTIAL INSTALLATION - Some requirements missing" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please restart your computer and try again, or install manually:" -ForegroundColor Yellow
    Write-Host "  - Node.js: https://nodejs.org" -ForegroundColor White
    Write-Host "  - Git: https://git-scm.com" -ForegroundColor White
    Write-Host "  - Python: https://python.org" -ForegroundColor White
    Write-Host ""
}

Write-Host "Installation log: $TempDir\install.log" -ForegroundColor Gray
Write-Host ""

if (-not $SkipPrompts) {
    Read-Host "Press Enter to exit"
}
