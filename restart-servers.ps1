<#
Restart-Servers.ps1

Stops any processes listening on ports 3001 (backend) and 5500 (frontend),
optionally starts Docker Compose services, then restarts the backend and a
simple static frontend server (`http-server` via npx) and opens the site.

Usage:
  .\restart-servers.ps1            # Kill ports, restart backend and frontend server
  .\restart-servers.ps1 -StartDocker  # Also run `docker-compose up -d`
#>

param(
    [switch]$StartDocker
)

Set-StrictMode -Version Latest
Write-Host "Running restart-servers.ps1 from: $PSScriptRoot"
# store current process id to avoid referencing automatic variable directly in comparisons
$MyPid = $PID

function Kill-Port {
    param([int]$Port)
    # Prefer Get-NetTCPConnection when available
    $pids = @()
    try {
        $pids = @(Get-NetTCPConnection -LocalPort $Port -ErrorAction Stop | Select-Object -ExpandProperty OwningProcess)
    } catch {
        $lines = netstat -ano | Select-String ":$Port"
        if (-not $lines) { return }
        $pids = $lines | ForEach-Object {
            ($_.ToString() -replace '\s+', ' ') -split ' ' | Select-Object -Last 1
        } | Where-Object { $_ -match '^[0-9]+$' } | Sort-Object -Unique
    }

    foreach ($pid in $pids | Sort-Object -Unique) {
        if ($pid -and [int]$pid -ne $MyPid) {
            try {
                Write-Host "Killing PID $pid listening on port $Port..."
                taskkill /PID $pid /F | Out-Null
            } catch {
                Write-Warning ("Failed to kill PID {0} - {1}" -f $pid, $_)
            }
        }
    }
}

try {
    Write-Host "Stopping any processes on port 3001 (backend) and 5500 (frontend)..."
    Kill-Port -Port 3001
    Kill-Port -Port 5500

    if ($StartDocker) {
        $composeFile = Join-Path $PSScriptRoot 'docker-compose.yml'
        if (Test-Path $composeFile) {
            Write-Host "Starting Docker Compose services (docker-compose up -d)..."
            Push-Location $PSScriptRoot
            try {
                docker-compose up -d
            } catch {
                Write-Warning ("docker-compose failed: {0}" -f $_)
            }
            Pop-Location
            Start-Sleep -Seconds 3
        } else {
            Write-Warning "No docker-compose.yml found in $PSScriptRoot; skipping Docker step."
        }
    }

    # Start backend in a new PowerShell window
    Write-Host "Starting backend: npm run dev (in \server)"
    $backendCmd = "cd '$PSScriptRoot\server'; npm run dev"
    Start-Process powershell -ArgumentList $backendCmd -WindowStyle Normal

    # Start a lightweight static server for the frontend using npx http-server on port 5500
    Write-Host "Starting frontend static server on port 5500 (npx http-server)..."
    $frontendCmd = "cd '$PSScriptRoot'; npx http-server -p 5500"
    Start-Process powershell -ArgumentList $frontendCmd -WindowStyle Normal

    Start-Sleep -Seconds 1
    Write-Host "Opening http://localhost:5500 in default browser..."
    Start-Process "http://localhost:5500"

    Write-Host "Restart sequence completed. Check the PowerShell windows for server logs."
} catch {
    Write-Error ("An error occurred: {0}" -f $_)
    exit 1
}
