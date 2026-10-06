# test-live-backend.ps1  — checks every main route on the LIVE droplet backend.
# Run on your laptop:  powershell -ExecutionPolicy Bypass -File .\test-live-backend.ps1

$base = "http://146.190.21.86:8000"
$ok = 0; $fail = 0
function Check($name, $block) {
  try { & $block; Write-Host ("PASS - " + $name) -ForegroundColor Green; $script:ok++ }
  catch { Write-Host ("FAIL - " + $name + " : " + $_.Exception.Message) -ForegroundColor Red; $script:fail++ }
}

Write-Host "Testing LIVE backend at $base" -ForegroundColor Cyan
Write-Host ""

# --- public routes ---
Check "Home" { Invoke-RestMethod "$base/" | Out-Null }
Check "Geocode search (Kigali)" {
  $r = Invoke-RestMethod "$base/geocode/search?q=Kigali"; if (-not $r) { throw "no results" }
}
Check "Nearby taxis (city centre)" {
  $r = Invoke-RestMethod "$base/search/nearby?lat=-1.9441&lng=30.0619&radius_km=5"
  Write-Host ("     taxis found near city centre: " + $r.Count) -ForegroundColor DarkGray
}
Check "Fare estimate" {
  $f = @{ pickup_lat=-1.9230; pickup_lng=30.1060; destination_lat=-1.9441; destination_lng=30.0619 } | ConvertTo-Json
  $r = Invoke-RestMethod "$base/fare/estimate" -Method Post -Body $f -ContentType "application/json"
  if (-not $r.fare) { throw "no fare" }
}

# --- passenger login + booking ---
$ptok = $null
Check "Login (passenger)" {
  $b = @{ username="0780000003"; password="pass123" }
  $r = Invoke-RestMethod "$base/auth/login" -Method Post -Body $b
  if (-not $r.access_token) { throw "no token" }; $script:ptok = $r.access_token
}
$ph = @{ Authorization = "Bearer $ptok" }
Check "Get my profile (/auth/me)" { Invoke-RestMethod "$base/auth/me" -Headers $ph | Out-Null }
Check "Create booking" {
  $bk = @{ vehicle_id=1; pickup_lat=-1.9230; pickup_lng=30.1060; destination_lat=-1.9441; destination_lng=30.0619 } | ConvertTo-Json
  $r = Invoke-RestMethod "$base/bookings" -Method Post -Headers $ph -Body $bk -ContentType "application/json"
  if (-not $r.id) { throw "no booking id" }
}
Check "My bookings" { Invoke-RestMethod "$base/bookings/mine" -Headers $ph | Out-Null }

# --- driver login + vehicles ---
$dtok = $null
Check "Login (driver)" {
  $b = @{ username="0780000002"; password="driver123" }
  $r = Invoke-RestMethod "$base/auth/login" -Method Post -Body $b
  if (-not $r.access_token) { throw "no token" }; $script:dtok = $r.access_token
}
$dh = @{ Authorization = "Bearer $dtok" }
Check "Driver vehicles (/vehicles/mine)" { Invoke-RestMethod "$base/vehicles/mine" -Headers $dh | Out-Null }

# --- admin login + reports ---
$atok = $null
Check "Login (admin)" {
  $b = @{ username="0780000001"; password="admin123" }
  $r = Invoke-RestMethod "$base/auth/login" -Method Post -Body $b
  if (-not $r.access_token) { throw "no token" }; $script:atok = $r.access_token
}
$ah = @{ Authorization = "Bearer $atok" }
Check "Admin summary" { Invoke-RestMethod "$base/admin/reports/summary" -Headers $ah | Out-Null }
Check "Admin users" { Invoke-RestMethod "$base/admin/users" -Headers $ah | Out-Null }
Check "Admin vehicles" { Invoke-RestMethod "$base/admin/vehicles" -Headers $ah | Out-Null }
Check "Admin bookings" { Invoke-RestMethod "$base/admin/bookings" -Headers $ah | Out-Null }

Write-Host ""
Write-Host ("RESULT: $ok passed, $fail failed.") -ForegroundColor Cyan
if ($fail -eq 0) { Write-Host "All backend routes work." -ForegroundColor Green }
else { Write-Host "Some routes failed - send me the FAIL lines." -ForegroundColor Yellow }
