# test-backend.ps1  — checks that the backend works.
# Start the backend first (run start.ps1, or the uvicorn command), then run this.
#   powershell -ExecutionPolicy Bypass -File .\test-backend.ps1

$base = "http://localhost:8000"
$ok = 0
$fail = 0

function Check($name, $block) {
  try {
    & $block
    Write-Host ("PASS - " + $name) -ForegroundColor Green
    $script:ok++
  } catch {
    Write-Host ("FAIL - " + $name + " : " + $_.Exception.Message) -ForegroundColor Red
    $script:fail++
  }
}

Write-Host "Testing backend at $base ..." -ForegroundColor Cyan
Write-Host ""

Check "Home page" {
  Invoke-RestMethod "$base/" | Out-Null
}

Check "Address search (Kigali)" {
  $r = Invoke-RestMethod "$base/geocode/search?q=Kigali"
  if (-not $r) { throw "no results" }
}

Check "Nearby taxis" {
  Invoke-RestMethod "$base/search/nearby?lat=-1.9441&lng=30.0619&radius_km=5" | Out-Null
}

$token = $null
Check "Login (passenger)" {
  $body = @{ username = "0780000003"; password = "pass123" }
  $login = Invoke-RestMethod "$base/auth/login" -Method Post -Body $body
  if (-not $login.access_token) { throw "no token" }
  $script:token = $login.access_token
}

Check "Fare estimate" {
  $fare = @{ pickup_lat = -1.9230; pickup_lng = 30.1060; destination_lat = -1.9441; destination_lng = 30.0619 } | ConvertTo-Json
  $r = Invoke-RestMethod "$base/fare/estimate" -Method Post -Body $fare -ContentType "application/json"
  if (-not $r.fare) { throw "no fare returned" }
}

Check "Admin report (admin login)" {
  $body = @{ username = "0780000001"; password = "admin123" }
  $alogin = Invoke-RestMethod "$base/auth/login" -Method Post -Body $body
  $headers = @{ Authorization = "Bearer " + $alogin.access_token }
  Invoke-RestMethod "$base/admin/reports/summary" -Headers $headers | Out-Null
}

Write-Host ""
Write-Host ("RESULT: $ok passed, $fail failed.") -ForegroundColor Cyan
if ($fail -eq 0) { Write-Host "Backend is working." -ForegroundColor Green }
else { Write-Host "Some checks failed - is the backend running?" -ForegroundColor Yellow }
