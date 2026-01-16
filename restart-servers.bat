@echo off
rem restart-servers.bat
rem Stops processes on ports 3001 and 5500, optionally starts Docker Compose, then restarts backend and frontend servers.

echo Starting Docker Compose services (docker-compose up -d)...
docker-compose up -d
timeout /t 3 /nobreak >nul

echo Stopping any processes listening on port 3001 (backend)...
for /f "tokens=5" %%a in ('netstat -ano ^| find ":3001"') do (
  echo Killing PID %%a
  taskkill /PID %%a /F >nul 2>&1
)

echo Stopping any processes listening on port 5500 (frontend)...
for /f "tokens=5" %%a in ('netstat -ano ^| find ":5500"') do (
  echo Killing PID %%a
  taskkill /PID %%a /F >nul 2>&1
)

echo Starting backend (npm run dev in server)...
start "PRG Backend" powershell -NoExit -Command "cd \"%~dp0server\"; npm run dev"

echo Starting frontend static server (npx http-server on port 5500)...
start "PRG Frontend" powershell -NoExit -Command "cd \"%~dp0\"; npx http-server -p 5500"

echo Opening site in default browser...
start http://localhost:5500

echo Done.
