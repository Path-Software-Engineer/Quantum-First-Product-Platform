[CmdletBinding()]
param(
    [switch]$Apply,
    [string]$Location = 'centralus',
    [string]$ResourceGroupName = 'rg-p10-quantum-first-product-demo',
    [string]$AppName = 'p10qf-platform',
    [string]$SharedEnvironmentResourceGroupName = 'rg-p7-rl-simulation-demo',
    [string]$SharedEnvironmentName = 'p7rl-env',
    [string]$RegistryResourceGroupName = 'rg-p7-rl-simulation-demo',
    [string]$RegistryName = 'p7rlqmfakszb6jgus',
    [string]$ImageTag = ''
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

function Assert-Command([string]$Name) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "$Name is required."
    }
}

function Invoke-Native([string]$Label, [scriptblock]$Command) {
    Write-Host "  -> $Label"
    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw "$Label failed."
    }
}

function Get-SourceDigest {
    $Entries = git ls-files --cached --others --exclude-standard -- .
    if ($LASTEXITCODE -ne 0 -or -not $Entries) {
        throw 'The project source inventory could not be resolved.'
    }
    $Lines = foreach ($Relative in ($Entries | Sort-Object)) {
        $Target = Join-Path $Root $Relative
        if (Test-Path -LiteralPath $Target -PathType Leaf) {
            "$($Relative.Replace('\', '/'))`:$((Get-FileHash -LiteralPath $Target -Algorithm SHA256).Hash)"
        }
    }
    $Bytes = [Text.Encoding]::UTF8.GetBytes(($Lines -join "`n"))
    $Hasher = [Security.Cryptography.SHA256]::Create()
    try {
        return ([BitConverter]::ToString($Hasher.ComputeHash($Bytes))).Replace('-', '').ToLower()
    }
    finally {
        $Hasher.Dispose()
    }
}

function New-HexSecret {
    return ([guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N'))
}

function Write-DeploymentParameters(
    [string]$Path,
    [string]$OwnerPassword,
    [string]$RuntimePassword
) {
    $Document = @{
        '$schema' = 'https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#'
        contentVersion = '1.0.0.0'
        parameters = @{
            location = @{ value = $Location }
            resourceGroupName = @{ value = $ResourceGroupName }
            existingEnvironmentResourceId = @{ value = $EnvironmentResourceId }
            appName = @{ value = $AppName }
            gatewayImage = @{ value = $GatewayImage }
            apiImage = @{ value = $ApiImage }
            databaseImage = @{ value = $DatabaseImage }
            registryName = @{ value = $RegistryName }
            registryResourceGroupName = @{ value = $RegistryResourceGroupName }
            databaseOwnerPassword = @{ value = $OwnerPassword }
            databaseRuntimePassword = @{ value = $RuntimePassword }
            databaseUrl = @{
                value = "postgresql://p10_app:$RuntimePassword@127.0.0.1:5432/p10"
            }
        }
    }
    $Json = $Document | ConvertTo-Json -Depth 8
    [IO.File]::WriteAllText($Path, $Json, [Text.UTF8Encoding]::new($false))
}

Assert-Command 'az'
Assert-Command 'git'

$Account = az account show --output json | ConvertFrom-Json
if ($LASTEXITCODE -ne 0 -or -not $Account.id) {
    throw 'Azure authentication is required.'
}
$Subscription = az rest `
    --method get `
    --url "https://management.azure.com/subscriptions/$($Account.id)?api-version=2022-12-01" `
    --output json | ConvertFrom-Json
if ($LASTEXITCODE -ne 0 -or -not $Subscription.state) {
    throw 'The authoritative Azure subscription state could not be resolved.'
}
if ($Subscription.state -ne 'Enabled') {
    throw (
        "Azure subscription '$($Account.name)' is $($Subscription.state). " +
        'Azure blocks validation and deployment while it is read-only; ' +
        'reactivate it in Cost Management + Billing, then rerun this script.'
    )
}

$GitCommit = git rev-parse HEAD
if ($LASTEXITCODE -ne 0 -or -not $GitCommit) {
    throw 'Git commit identity could not be resolved.'
}
if (-not $ImageTag) {
    $ImageTag = "release-$($GitCommit.Substring(0, 12))"
}

$EnvironmentResourceId = (
    "/subscriptions/$($Account.id)/resourceGroups/$SharedEnvironmentResourceGroupName" +
    "/providers/Microsoft.App/managedEnvironments/$SharedEnvironmentName"
)
$Environment = az rest `
    --method get `
    --url "https://management.azure.com${EnvironmentResourceId}?api-version=2024-03-01" `
    --output json | ConvertFrom-Json
if ($LASTEXITCODE -ne 0 -or -not $Environment.properties.defaultDomain) {
    throw 'The shared Container Apps environment could not be resolved.'
}

$Registry = az acr show `
    --name $RegistryName `
    --resource-group $RegistryResourceGroupName `
    --output json | ConvertFrom-Json
if ($LASTEXITCODE -ne 0 -or -not $Registry.loginServer) {
    throw 'The existing Azure Container Registry could not be resolved.'
}

$GatewayImage = "$($Registry.loginServer)/p10/gateway:$ImageTag"
$ApiImage = "$($Registry.loginServer)/p10/control-api:$ImageTag"
$DatabaseImage = "$($Registry.loginServer)/p10/database:$ImageTag"
$AppUrl = "https://$AppName.$($Environment.properties.defaultDomain)"
$Template = Join-Path $Root 'infra\azure\main.bicep'
$SourceDigest = Get-SourceDigest

Write-Host "Azure release target: $($Account.name) / $ResourceGroupName / $Location"
Write-Host "Git commit: $GitCommit"
Write-Host "Source digest: $SourceDigest"
Write-Host "Container Apps environment: $SharedEnvironmentName (shared)"
Write-Host "Registry: $($Registry.loginServer) (existing $($Registry.sku.name) ACR)"
Write-Host "Gateway image: $GatewayImage"
Write-Host "API image: $ApiImage"
Write-Host "Database image: $DatabaseImage"
Write-Host 'Cost boundary: Consumption min=0 max=1; no new registry, Log Analytics, file share or managed database.'
Write-Warning 'The existing Standard ACR is already billable. This release adds image storage but creates no new fixed-cost service.'
Write-Warning 'The demo database is ephemeral and is recreated after scale-to-zero or replica replacement.'

Invoke-Native 'Bicep compilation' { az bicep build --file $Template --stdout | Out-Null }

$PreflightParameters = New-TemporaryFile
try {
    Write-DeploymentParameters `
        $PreflightParameters `
        ('0' * 64) `
        ('1' * 64)
    Invoke-Native 'Azure deployment validation before image publication' {
        az deployment sub validate `
            --name 'p10qf-release-validate' `
            --location $Location `
            --template-file $Template `
            --parameters "@$PreflightParameters" `
            --output none
    }
    Invoke-Native 'Azure deployment what-if before image publication' {
        az deployment sub what-if `
            --name 'p10qf-release-what-if' `
            --location $Location `
            --template-file $Template `
            --parameters "@$PreflightParameters" `
            --result-format ResourceIdOnly
    }
}
finally {
    Remove-Item -LiteralPath $PreflightParameters -Force -ErrorAction SilentlyContinue
}

if (-not $Apply) {
    Write-Host 'OK - Azure preflight passed without publishing images or creating resources'
    Write-Host 'Apply requires a clean v0.3.1-azure-deployment tag at HEAD.'
    exit 0
}

Assert-Command 'docker'
$Dirty = git status --porcelain -- .
if ($LASTEXITCODE -ne 0 -or $Dirty) {
    throw '-Apply requires a clean Project 10 Git worktree.'
}
$ReleaseTag = git describe --exact-match --tags HEAD 2>$null
if ($LASTEXITCODE -ne 0 -or $ReleaseTag -ne 'v0.3.1-azure-deployment') {
    throw '-Apply requires HEAD to carry tag v0.3.1-azure-deployment.'
}

Write-Host 'Running the strict Sprint 3 quality gate before publication'
& .\scripts\run-quality-gate.ps1
if ($LASTEXITCODE -ne 0) {
    throw 'Sprint 3 quality gate failed; no images were published.'
}

Invoke-Native 'Microsoft.App provider registration' {
    az provider register --namespace Microsoft.App --wait --output none
}
Invoke-Native 'Azure Container Registry login' {
    az acr login --name $RegistryName --output none
}
Invoke-Native 'Gateway image build' {
    docker build `
        --file deployment/gateway.Dockerfile `
        --build-arg "P10_PUBLIC_API_URL=" `
        --build-arg "P10_PUBLIC_SITE_URL=$AppUrl" `
        --label "org.opencontainers.image.revision=$GitCommit" `
        --label "org.opencontainers.image.source=https://github.com/Path-Software-Engineer/Quantum-First-Product-Platform" `
        --tag $GatewayImage .
}
Invoke-Native 'Control API image build' {
    docker build `
        --file deployment/api.Dockerfile `
        --label "org.opencontainers.image.revision=$GitCommit" `
        --label "org.opencontainers.image.source=https://github.com/Path-Software-Engineer/Quantum-First-Product-Platform" `
        --tag $ApiImage .
}
Invoke-Native 'Ephemeral PostgreSQL image build' {
    docker build `
        --file deployment/database.Dockerfile `
        --label "org.opencontainers.image.revision=$GitCommit" `
        --label "org.opencontainers.image.source=https://github.com/Path-Software-Engineer/Quantum-First-Product-Platform" `
        --tag $DatabaseImage .
}
Invoke-Native 'Gateway image publication' { docker push $GatewayImage }
Invoke-Native 'Control API image publication' { docker push $ApiImage }
Invoke-Native 'Database image publication' { docker push $DatabaseImage }

$GatewayDigest = az acr repository show `
    --name $RegistryName --image "p10/gateway:$ImageTag" --query digest --output tsv
$ApiDigest = az acr repository show `
    --name $RegistryName --image "p10/control-api:$ImageTag" --query digest --output tsv
$DatabaseDigest = az acr repository show `
    --name $RegistryName --image "p10/database:$ImageTag" --query digest --output tsv
if ($LASTEXITCODE -ne 0 -or -not $GatewayDigest -or -not $ApiDigest -or -not $DatabaseDigest) {
    throw 'Published image digests could not be resolved.'
}

$OwnerPassword = New-HexSecret
$RuntimePassword = New-HexSecret
$Parameters = New-TemporaryFile
try {
    Write-DeploymentParameters $Parameters $OwnerPassword $RuntimePassword
    Invoke-Native 'Azure scale-to-zero deployment' {
        az deployment sub create `
            --name 'p10qf-release' `
            --location $Location `
            --template-file $Template `
            --parameters "@$Parameters" `
            --output none
    }
}
finally {
    $OwnerPassword = $null
    $RuntimePassword = $null
    Remove-Item -LiteralPath $Parameters -Force -ErrorAction SilentlyContinue
}

$Deployment = az deployment sub show `
    --name 'p10qf-release' `
    --query properties.outputs `
    --output json | ConvertFrom-Json
if ($LASTEXITCODE -ne 0 -or -not $Deployment.appResourceId.value) {
    throw 'The deployed Container App identity could not be resolved.'
}

$Ready = $false
for ($Attempt = 1; $Attempt -le 48; $Attempt++) {
    try {
        $Response = Invoke-RestMethod -Uri "$AppUrl/health/ready" -TimeoutSec 10
        if ($Response.status -eq 'ok' -and $Response.database -eq 'connected') {
            $Ready = $true
            break
        }
    }
    catch {
        Write-Host "Cold-start acceptance: attempt $Attempt/48"
    }
    Start-Sleep -Seconds 5
}
if (-not $Ready) {
    throw 'Azure did not expose a database-backed ready API within 240 seconds.'
}

$Web = Invoke-WebRequest -Uri $AppUrl -UseBasicParsing -TimeoutSec 30
$Swagger = Invoke-WebRequest -Uri "$AppUrl/swagger/" -UseBasicParsing -TimeoutSec 30
$OpenApi = Invoke-RestMethod -Uri "$AppUrl/openapi.json" -TimeoutSec 30
$OnePager = Invoke-RestMethod `
    -Uri "$AppUrl/api/v1/public/one-pagers/10000000-0000-4000-8000-000000000001" `
    -TimeoutSec 30
$PqcReport = Invoke-RestMethod `
    -Uri "$AppUrl/api/v1/public/pqc-reports/10000000-0000-4000-8000-000000000002" `
    -TimeoutSec 30
$DeveloperDocs = Invoke-RestMethod `
    -Uri "$AppUrl/api/v1/public/developer-docs/10000000-0000-4000-8000-000000000003" `
    -TimeoutSec 30
$Runtime = az rest `
    --method get `
    --url "https://management.azure.com$($Deployment.appResourceId.value)?api-version=2024-03-01" `
    --output json | ConvertFrom-Json

if (
    $Web.StatusCode -ne 200 -or
    $Web.Content -notmatch 'Sprints 1–3 are released' -or
    $Swagger.StatusCode -ne 200 -or
    $Swagger.Content -notmatch 'swagger-ui' -or
    -not $OpenApi.paths.'/api/v1/public/developer-docs/{buildId}' -or
    $OnePager.buildId -ne '10000000-0000-4000-8000-000000000001' -or
    $PqcReport.buildId -ne '10000000-0000-4000-8000-000000000002' -or
    $DeveloperDocs.buildId -ne '10000000-0000-4000-8000-000000000003' -or
    $Runtime.properties.template.scale.minReplicas -ne 0 -or
    $Runtime.properties.template.scale.maxReplicas -ne 1 -or
    $Runtime.properties.environmentId -ne $EnvironmentResourceId
) {
    throw 'Azure cross-layer release acceptance failed.'
}

Write-Host 'OK - Project 10 deployed to Azure Container Apps Consumption'
Write-Host "Web:       $AppUrl"
Write-Host "API:       $AppUrl/api/v1"
Write-Host "Swagger:   $AppUrl/swagger/"
Write-Host "OpenAPI:   $AppUrl/openapi.json"
Write-Host "Revision:  $($Runtime.properties.latestReadyRevisionName)"
Write-Host "Gateway:   $GatewayDigest"
Write-Host "API:       $ApiDigest"
Write-Host "Database:  $DatabaseDigest"
Write-Host 'Persistence: ephemeral PostgreSQL; synthetic public projections are recreated after cold start.'
Write-Host 'Cost: no new fixed-cost service; existing Standard ACR remains billable and Container Apps usage is not an absolute zero-bill guarantee.'
