targetScope = 'subscription'

@description('Azure region containing the shared Container Apps Consumption environment.')
param location string = 'centralus'

@description('Resource group dedicated to the Project 10 recruiter demo.')
param resourceGroupName string = 'rg-p10-quantum-first-product-demo'

@description('Existing shared Container Apps managed environment resource ID.')
param existingEnvironmentResourceId string

@description('Public Container App name.')
param appName string = 'p10qf-platform'

@description('Immutable portal and gateway image reference.')
param gatewayImage string

@description('Immutable control API image reference.')
param apiImage string

@description('Immutable PostgreSQL demo image reference.')
param databaseImage string

@description('Existing Azure Container Registry name.')
param registryName string

@description('Resource group containing the existing registry.')
param registryResourceGroupName string

@secure()
@description('Ephemeral PostgreSQL owner password.')
param databaseOwnerPassword string

@secure()
@description('Ephemeral non-owner runtime role password.')
param databaseRuntimePassword string

@secure()
@description('Ephemeral non-owner PostgreSQL connection string.')
param databaseUrl string

resource projectResourceGroup 'Microsoft.Resources/resourceGroups@2024-11-01' = {
  name: resourceGroupName
  location: location
  tags: {
    project: '10-quantum-first-product-platform'
    release: 'v0.3.1-azure-deployment'
    costProfile: 'consumption-scale-to-zero'
    persistence: 'ephemeral-recruiter-demo'
  }
}

resource registry 'Microsoft.ContainerRegistry/registries@2023-07-01' existing = {
  scope: az.resourceGroup(registryResourceGroupName)
  name: registryName
}

module pullIdentity 'identity.bicep' = {
  name: 'p10qf-pull-identity'
  scope: projectResourceGroup
  params: {
    location: location
    identityName: '${appName}-pull'
  }
}

module acrPull 'registry-role.bicep' = {
  name: 'p10qf-acr-pull'
  scope: az.resourceGroup(registryResourceGroupName)
  params: {
    registryName: registryName
    principalId: pullIdentity.outputs.principalId
    identityName: '${appName}-pull'
  }
}

module workload 'workload.bicep' = {
  name: 'p10qf-workload'
  scope: projectResourceGroup
  params: {
    location: location
    existingEnvironmentResourceId: existingEnvironmentResourceId
    appName: appName
    gatewayImage: gatewayImage
    apiImage: apiImage
    databaseImage: databaseImage
    registryServer: registry.properties.loginServer
    pullIdentityResourceId: pullIdentity.outputs.resourceId
    databaseOwnerPassword: databaseOwnerPassword
    databaseRuntimePassword: databaseRuntimePassword
    databaseUrl: databaseUrl
  }
  dependsOn: [
    acrPull
  ]
}

output appUrl string = workload.outputs.appUrl
output appName string = workload.outputs.appName
output appResourceId string = workload.outputs.appResourceId
output revisionName string = workload.outputs.revisionName
output resourceGroupName string = projectResourceGroup.name
output costBoundary string = 'Consumption minReplicas=0 maxReplicas=1; shared environment and existing ACR; no Log Analytics, Azure Files or managed database created.'
output persistenceBoundary string = 'PostgreSQL and public synthetic projections are recreated after scale-to-zero or replica replacement.'
