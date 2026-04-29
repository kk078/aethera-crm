# ============================================
# Aethera-CRM Prerequisites Installer
# ============================================
# This script installs all required dependencies

$ErrorActionPreference = "Stop"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Aethera-CRM Prerequisites Installer" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "Please run this script as Administrator (Right-click -> Run as Administrator)" -ForegroundColor Yellow
    Write-Host "Exiting..." -ForegroundColor Yellow
    exit 1
}

# Function to download and install
function Install-Prerequisite {
    param($name, $url, $installerName, $arguments)
    
    Write-Host "Downloading $name..." -ForegroundColor Cyan
    
    $tempPath = [System.IO.Path]::GetTempPath()
    $installerPath = Join-Path $tempPath $installerName
    
    try {
        $webClient = New-Object System.Net.WebClient
        $webClient.DownloadFile($url, $installerPath)
        
        Write-Host "Installing $name..." -ForegroundColor Cyan
        Start-Process -FilePath $installerPath -ArgumentList $arguments -Wait
        
        Write-Host "$name installed successfully" -ForegroundColor Green
        
        # Clean up
        Remove-Item $installerPath -Force
    }
    catch {
        Write-Host "Failed to install $name : $_" -ForegroundColor Red
    }
}

# Install Node.js
Write-Host ""
Write-Host "Installing Node.js LTS..." -ForegroundColor Cyan
Install-Prerequisite `
    -name "Node.js" `
    -url "https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi" `
    -installerName "node-installer.msi" `
    -arguments @("/quiet", "/norestart")

# Install Git
Write-Host ""
Write-Host "Installing Git..." -ForegroundColor Cyan
Install-Prerequisite `
    -name "Git" `
    -url "https://github.com/git-for-windows/git/releases/download/v2.43.0.windows.1/Git-2.43.0-64-bit.exe" `
    -installerName "git-installer.exe" `
    -arguments @("/VERYSILENT", "/NORESTART")

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  Installation Complete!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Please restart your computer or log out and back in" -ForegroundColor Yellow
Write-Host "Then run: scripts\setup.ps1" -ForegroundColor Cyan
Write-Host ""
