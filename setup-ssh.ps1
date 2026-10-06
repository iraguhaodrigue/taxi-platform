# setup-ssh.ps1  — run this ONCE, as Administrator.
# After this, "git push" will NOT ask for your SSH passphrase again.
#
# How to run as Administrator:
#   Start menu > type "powershell" > right-click "Windows PowerShell" > Run as administrator
#   Then:  powershell -ExecutionPolicy Bypass -File .\setup-ssh.ps1

Write-Host "Setting the SSH agent to start automatically..." -ForegroundColor Green
Get-Service ssh-agent | Set-Service -StartupType Automatic
Start-Service ssh-agent

Write-Host ""
Write-Host "Now adding your key. Type your passphrase ONE time when asked." -ForegroundColor Cyan
ssh-add "$env:USERPROFILE\.ssh\id_ed25519"

Write-Host ""
Write-Host "Done. Your key is remembered now. git push will not ask again." -ForegroundColor Green
