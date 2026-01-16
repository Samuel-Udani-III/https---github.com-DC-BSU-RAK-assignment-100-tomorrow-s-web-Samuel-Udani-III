@echo off
echo Starting P.R.G. Website...
echo.

echo Starting all services (MongoDB, Backend, Frontend)...
docker-compose up -d

echo.
echo Waiting for services to start...
timeout /t 5 /nobreak > nul

echo.
echo P.R.G. Website is now running!
echo Frontend: http://localhost
echo Backend API: http://localhost:3001
echo MongoDB: localhost:27017
echo.
echo To stop the services, run: docker-compose down
echo.
pause