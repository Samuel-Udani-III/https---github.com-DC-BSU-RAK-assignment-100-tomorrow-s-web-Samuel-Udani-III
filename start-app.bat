@echo off
echo Starting MongoDB in Docker...
docker-compose up -d
echo Starting backend server...
cd server
start cmd /k "npm run dev"
cd ..
echo Please serve the frontend using Live Server (port 5500) or another method.
echo Then open http://localhost:5500 in your browser.
echo Admin: admin@example.com / admin123