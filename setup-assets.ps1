New-Item -ItemType Directory -Force -Path "assets" | Out-Null
# Create a simple placeholder icon using PowerShell if no icon exists
if (-not (Test-Path "assets\icon.png")) {
    Write-Host "Note: Place your icon.png and icon.ico in the assets/ folder before building the EXE."
    # Create empty placeholder files to prevent build errors
    [System.IO.File]::WriteAllBytes("assets\icon.png", [byte[]]@())
}
Write-Host "Assets directory is ready."
