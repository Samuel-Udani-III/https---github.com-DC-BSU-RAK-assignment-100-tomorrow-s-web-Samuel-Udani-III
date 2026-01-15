$log = Join-Path $PSScriptRoot 'admin-delete-log.txt'
Remove-Item -Path $log -ErrorAction SilentlyContinue
function Log($msg) {
    $ts = (Get-Date).ToString('s')
    $line = "[$ts] $msg"
    $line | Tee-Object -FilePath $log -Append
    Write-Host $line
}

try {
    Log 'Starting admin-delete test'

    Log 'Logging in as admin...'
    $login = Invoke-RestMethod -Method Post -Uri 'http://localhost:3001/api/auth/login' -Body (@{ email='admin@example.com'; password='admin123' } | ConvertTo-Json) -ContentType 'application/json' -ErrorAction Stop
    $token = $login.token
    Log "Logged in. Token length: $($token.Length)"

    Log 'Fetching games...'
    $gamesResp = Invoke-RestMethod -Method Get -Uri 'http://localhost:3001/api/games' -ErrorAction Stop
    if (-not $gamesResp.games -or $gamesResp.games.Count -eq 0) { Log 'No games found'; exit 0 }
    $game = $gamesResp.games[0]
    Log "Using game id: $($game.id) title: $($game.title)"

    Log 'Fetching reviews for the game...'
    $reviewsResp = Invoke-RestMethod -Method Get -Uri "http://localhost:3001/api/reviews/game/$($game.id)" -ErrorAction Stop
    if (-not $reviewsResp.reviews -or $reviewsResp.reviews.Count -eq 0) { Log 'No reviews found for this game'; exit 0 }
    $review = $reviewsResp.reviews[0]
    Log "Found review id: $($review.id) userId: $($review.userId) userEmail: $($review.userEmail)"

    Log 'Attempting delete as admin...'
    try {
        $del = Invoke-RestMethod -Method Delete -Uri "http://localhost:3001/api/reviews/$($review.id)" -Headers @{ Authorization = "Bearer $token" } -ErrorAction Stop
        Log "Delete response: $(ConvertTo-Json $del -Depth 5)"
    } catch {
        Log 'Delete request failed'
        Log $_.Exception.Message
        if ($_.Exception.Response) {
            try { $body = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd(); Log 'Response body:'; Log $body } catch {}
        }
    }

    Log 'Admin-delete test completed'
} catch {
    Log 'Unexpected error during test'
    Log $_.Exception.Message
    if ($_.Exception.Response) {
        try { $body = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd(); Log 'Response body:'; Log $body } catch {}
    }
}

Log '---- Log file contents ----'
Get-Content -Path $log | ForEach-Object { Write-Host $_ }
