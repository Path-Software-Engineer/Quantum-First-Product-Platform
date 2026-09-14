$ErrorActionPreference = 'Stop'

$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$containerName = 'p10-tenancy-test-' + [guid]::NewGuid().ToString('N').Substring(0, 12)
$testPassword = [guid]::NewGuid().ToString('N')
$previousUrl = $env:P10_TEST_DATABASE_URL
$started = $false

try {
    docker version --format '{{.Server.Version}}' | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Docker Server is unavailable.' }

    docker run --detach --rm `
        --name $containerName `
        --env "POSTGRES_PASSWORD=$testPassword" `
        --publish '127.0.0.1::5432' `
        postgres:17.10-alpine | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'The disposable PostgreSQL container did not start.' }
    $started = $true

    $ready = $false
    for ($attempt = 1; $attempt -le 40; $attempt++) {
        docker exec $containerName pg_isready -U postgres | Out-Null
        if ($LASTEXITCODE -eq 0) { $ready = $true; break }
        Start-Sleep -Seconds 1
    }
    if (-not $ready) { throw 'Disposable PostgreSQL did not become ready.' }

    $portMapping = docker port $containerName '5432/tcp'
    if ($LASTEXITCODE -ne 0 -or $portMapping -notmatch '127\.0\.0\.1:(\d+)') {
        throw 'Could not resolve the disposable PostgreSQL host port.'
    }
    $port = $Matches[1]
    $env:P10_TEST_DATABASE_URL = "postgresql://postgres:$testPassword@127.0.0.1:$port/postgres"

    Push-Location $projectRoot
    try {
        npm run test:integration -w control-api
        if ($LASTEXITCODE -ne 0) { throw 'Tenancy integration tests failed.' }
    }
    finally { Pop-Location }
}
finally {
    $env:P10_TEST_DATABASE_URL = $previousUrl
    if ($started) { docker rm --force $containerName | Out-Null }
}
