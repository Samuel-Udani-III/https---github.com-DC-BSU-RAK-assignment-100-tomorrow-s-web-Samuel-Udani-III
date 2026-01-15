# Start MongoDB in Docker
Write-Host "Starting MongoDB in Docker..."
docker-compose up -d

# Start backend server in new window
Write-Host "Starting backend server..."
Start-Process powershell -ArgumentList "cd server; npm run dev"

Write-Host "Please serve the frontend using Live Server (port 5500) or another method."
Write-Host "Then open http://localhost:5500 in your browser."
Write-Host "Admin: admin@example.com / admin123"