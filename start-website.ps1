# Start P.R.G. Website
Write-Host "Starting P.R.G. Website..." -ForegroundColor Green
Write-Host ""

Write-Host "1. Starting MongoDB..." -ForegroundColor Yellow
docker-compose up -d
Start-Sleep 3

Write-Host "2. Starting Backend Server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "cd server; npm run dev" -WindowStyle Normal

Write-Host "3. Frontend Server..." -ForegroundColor Yellow
Write-Host "Please start VS Code Live Server:" -ForegroundColor Cyan
Write-Host "- Open index.html in VS Code" -ForegroundColor White
Write-Host "- Right-click and select 'Open with Live Server'" -ForegroundColor White
Write-Host "- Or press Ctrl+Shift+P and type 'Live Server: Open with Live Server'" -ForegroundColor White

Write-Host ""
Write-Host "Website will be available at: http://localhost:5500" -ForegroundColor Green
Write-Host "Backend API at: http://localhost:3001" -ForegroundColor Green
Write-Host ""
Read-Host "Press Enter to continue"