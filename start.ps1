# start.ps1  — starts the whole system in one run.
# Put this file in the taxi-platform folder (next to README.md).
# Run it:  right-click > Run with PowerShell
#   or in a terminal:  powershell -ExecutionPolicy Bypass -File .\start.ps1

$root = $PSScriptRoot

Write-Host "Starting backend..." -ForegroundColor Green
Start-Process powershell -ArgumentList @(
  "-NoExit", "-Command",
  "cd `"$root\backend`"; .\.venv\Scripts\Activate.ps1; uvicorn app.main:app --reload --host 0.0.0.0"
)

Start-Sleep -Seconds 2

Write-Host "Starting mobile app..." -ForegroundColor Green
Start-Process powershell -ArgumentList @(
  "-NoExit", "-Command",
  "cd `"$root\mobile`"; npx expo start"
)

Write-Host ""
Write-Host "Two windows opened: one for the backend, one for the mobile app." -ForegroundColor Cyan
Write-Host "The backend runs at http://localhost:8000  (and on your Wi-Fi IP)."
Write-Host "Scan the QR code in the mobile window with Expo Go."
