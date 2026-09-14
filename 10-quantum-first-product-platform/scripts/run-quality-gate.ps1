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
    Invoke-Checked 'Nest lint' { npm run lint -w control-api }
    Invoke-Checked 'Strict TypeScript and Nest build' { npm run typecheck }
    Invoke-Checked 'Nest unit tests' { npm run test -w control-api }
    Invoke-Checked 'Nest HTTP tests' { npm run test:e2e -w control-api }
    Write-Host '  -> Disposable PostgreSQL tenant isolation tests'
    & (Join-Path $PSScriptRoot 'run-tenancy-integration.ps1')
    Invoke-Checked 'Docusaurus production build' { npm run build -w portal }
    Invoke-Checked 'Dependency security audit' { npm audit --audit-level=high }
    Invoke-Checked 'Git whitespace' { git diff --check }
    Write-Host 'OK - Project 10 local bootstrap quality gate passed'
}
finally { Pop-Location }
