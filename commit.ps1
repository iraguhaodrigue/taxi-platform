# commit.ps1  — saves ALL your changes to GitHub in one run.
# Put this file in the taxi-platform folder (next to README.md).
#
# Use it:
#   .\commit.ps1 "what I changed"      (write your own message)
#   .\commit.ps1                        (uses date/time as the message)

param(
  [string]$Message = ("Update: " + (Get-Date -Format "yyyy-MM-dd HH:mm"))
)

$root = $PSScriptRoot
Set-Location $root

git add .
git commit -m $Message
git push

Write-Host ""
Write-Host "Saved and pushed to GitHub." -ForegroundColor Green
Write-Host "Message: $Message"
