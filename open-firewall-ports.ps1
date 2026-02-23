# PowerShell script to open firewall ports for Smart Minds app
# Run this as Administrator

Write-Host "Opening firewall ports for Smart Minds application..." -ForegroundColor Green

# Port 5173 - Vite Frontend Dev Server
New-NetFirewallRule -DisplayName "Smart Minds - Vite Frontend (5173)" `
    -Direction Inbound `
    -LocalPort 5173 `
    -Protocol TCP `
    -Action Allow `
    -Profile Any `
    -ErrorAction SilentlyContinue

# Port 8086 - Spring Boot Backend API
New-NetFirewallRule -DisplayName "Smart Minds - Backend API (8086)" `
    -Direction Inbound `
    -LocalPort 8086 `
    -Protocol TCP `
    -Action Allow `
    -Profile Any `
    -ErrorAction SilentlyContinue

# Port 3002 - WebSocket Server
New-NetFirewallRule -DisplayName "Smart Minds - WebSocket (3002)" `
    -Direction Inbound `
    -LocalPort 3002 `
    -Protocol TCP `
    -Action Allow `
    -Profile Any `
    -ErrorAction SilentlyContinue

Write-Host "`nFirewall rules created successfully!" -ForegroundColor Green
Write-Host "Ports opened: 5173 (Frontend), 8086 (Backend), 3002 (WebSocket)" -ForegroundColor Cyan
Write-Host "`nYou can now access the app from your phone at:" -ForegroundColor Yellow
Write-Host "http://10.108.116.86:5173" -ForegroundColor White
