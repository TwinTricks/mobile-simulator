# Push Mobile Simulator to GitHub
#
# Self-contained: runs from wherever it lives (uses $PSScriptRoot).
# Idempotent: re-running just commits new changes and pushes.

$ExtPath = $PSScriptRoot
$Remote  = "https://TwinTricks@github.com/TwinTricks/mobile-simulator.git"

Write-Host "[*] Pushing Mobile Simulator to GitHub..." -ForegroundColor Cyan
Write-Host "    Path:   $ExtPath"
Write-Host "    Remote: $Remote"
Write-Host ""

Push-Location $ExtPath

# Init if needed
if (-not (Test-Path ".git")) {
    Write-Host "[*] git init..." -ForegroundColor Yellow
    git init | Out-Null
    git branch -M main
}

# Ensure remote (idempotent: always reset to the correct URL)
Write-Host "[*] Configuring remote origin..." -ForegroundColor Yellow
cmd /c "git remote remove origin >nul 2>nul"
git remote add origin $Remote
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to add remote origin" -ForegroundColor Red
    Pop-Location
    exit 1
}

# Stage
Write-Host "[*] Staging files..." -ForegroundColor Yellow
git add .

# Commit if there are changes
$status = git status --porcelain
if ($status) {
    Write-Host "[*] Creating commit..." -ForegroundColor Yellow
    git commit -m "Mobile Simulator v1.1.0 - initial public release"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Commit failed" -ForegroundColor Red
        Pop-Location
        exit 1
    }
} else {
    Write-Host "[*] Nothing to commit (working tree clean)" -ForegroundColor Gray
}

# Force push
Write-Host "[*] Force-pushing to origin/main..." -ForegroundColor Yellow
git push --force --set-upstream origin main
$pushExit = $LASTEXITCODE

Pop-Location

Write-Host ""
if ($pushExit -eq 0) {
    Write-Host "[OK] Mobile Simulator pushed successfully" -ForegroundColor Green
    Write-Host "    Repo:    https://github.com/TwinTricks/mobile-simulator"
    Write-Host "    Privacy: https://twintricks.github.io/mobile-simulator/ (after Pages enabled)"
    Write-Host ""
    Write-Host "    Next step: enable GitHub Pages with Source=main, Folder=/docs"
    Write-Host "    https://github.com/TwinTricks/mobile-simulator/settings/pages"
} else {
    Write-Host "[ERROR] Push failed with exit code $pushExit" -ForegroundColor Red
    exit $pushExit
}
