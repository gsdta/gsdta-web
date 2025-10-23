# Test API Endpoints

Write-Host "Testing GSDTA API Endpoints..." -ForegroundColor Cyan
Write-Host ""

# Test Health Endpoint
Write-Host "Testing GET /v1/health..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/v1/health" -Method Get
    Write-Host "✓ Health check successful!" -ForegroundColor Green
    $response | ConvertTo-Json
} catch {
    Write-Host "✗ Health check failed: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "---"
Write-Host ""

# Test Echo Endpoint
Write-Host "Testing POST /v1/echo..." -ForegroundColor Yellow
try {
    $body = @{
        message = "Hello from GSDTA API"
        timestamp = Get-Date -Format "o"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "http://localhost:3001/v1/echo" -Method Post -Body $body -ContentType "application/json"
    Write-Host "✓ Echo endpoint successful!" -ForegroundColor Green
    $response | ConvertTo-Json
} catch {
    Write-Host "✗ Echo endpoint failed: $_" -ForegroundColor Red
}

