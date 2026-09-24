$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path

function Invoke-Checked {
    param([string]$Label, [scriptblock]$Command)
    Write-Host "  -> $Label"
    & $Command
    if ($LASTEXITCODE -ne 0) { throw "$Label failed with exit code $LASTEXITCODE." }
}

Push-Location $projectRoot
try {
    Invoke-Checked 'Frozen npm install' { npm ci --no-audit --no-fund }
    Invoke-Checked 'Playwright Chromium install' { npx playwright install chromium }
    Write-Host 'OK - Project 10 local toolchain is ready'
}
finally { Pop-Location }
