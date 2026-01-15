@echo off
echo Starting P.R.G. Website...
echo.

echo 1. Starting MongoDB...
docker-compose up -d
timeout /t 3 /nobreak > nul

echo 2. Starting Backend Server...
start "PRG Backend" cmd /k "cd server && npm run dev"
timeout /t 3 /nobreak > nul

echo 3. Frontend Server...
echo Please start VS Code Live Server:
echo - Open index.html in VS Code
echo - Right-click and select "Open with Live Server"
echo - Or press Ctrl+Shift+P and type "Live Server: Open with Live Server"

echo.
echo Website will be available at: http://localhost:5500
echo Backend API at: http://localhost:3001
echo.
echo Press any key to continue...
pause > nul