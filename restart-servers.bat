@echo off
rem restart-servers.bat
rem Restarts all P.R.G. services using Docker Compose

echo Stopping all services...
docker-compose down

echo Starting all services...
docker-compose up -d

echo.
echo Waiting for services to start...
timeout /t 5 /nobreak > nul

echo.
echo P.R.G. services restarted!
echo Frontend: http://localhost
echo Backend API: http://localhost:3001
echo MongoDB: localhost:27017
echo.
pause
