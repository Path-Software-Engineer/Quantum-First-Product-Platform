@description('Deployment region inherited from the resource group.')
param location string

param identityName string

resource identity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: identityName
  location: location
  tags: {
    project: '10-quantum-first-product-platform'
    purpose: 'acr-pull-only'
  }
}

output resourceId string = identity.id
output principalId string = identity.properties.principalId
