@description('Deployment region inherited from the resource group.')
param location string

param existingEnvironmentResourceId string
param appName string
param gatewayImage string
param apiImage string
param databaseImage string
param registryServer string
param pullIdentityResourceId string

@secure()
param databaseOwnerPassword string

@secure()
param databaseRuntimePassword string

@secure()
param databaseUrl string

resource app 'Microsoft.App/containerApps@2024-03-01' = {
  name: appName
  location: location
  tags: {
    project: '10-quantum-first-product-platform'
    release: 'v0.3.1-azure-deployment'
    costProfile: 'consumption-scale-to-zero'
    persistence: 'ephemeral-recruiter-demo'
  }
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${pullIdentityResourceId}': {}
    }
  }
  properties: {
    environmentId: existingEnvironmentResourceId
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        allowInsecure: false
        targetPort: 8088
        transport: 'auto'
        traffic: [
          {
            latestRevision: true
            weight: 100
          }
        ]
      }
      registries: [
        {
          server: registryServer
          identity: pullIdentityResourceId
        }
      ]
      secrets: [
        {
          name: 'database-owner-password'
          value: databaseOwnerPassword
        }
        {
          name: 'database-runtime-password'
          value: databaseRuntimePassword
        }
        {
          name: 'database-url'
          value: databaseUrl
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'gateway'
          image: gatewayImage
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: '/'
                port: 8088
                scheme: 'HTTP'
              }
              initialDelaySeconds: 10
              periodSeconds: 20
              timeoutSeconds: 5
              failureThreshold: 6
            }
          ]
        }
        {
          name: 'api'
          image: apiImage
          env: [
            {
              name: 'NODE_ENV'
              value: 'production'
            }
            {
              name: 'PORT'
              value: '8080'
            }
            {
              name: 'SWAGGER_PATH'
              value: 'swagger'
            }
            {
              name: 'DATABASE_URL'
              secretRef: 'database-url'
            }
          ]
          resources: {
            cpu: json('0.5')
            memory: '1.0Gi'
          }
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: '/health/live'
                port: 8080
                scheme: 'HTTP'
              }
              initialDelaySeconds: 10
              periodSeconds: 20
              timeoutSeconds: 5
              failureThreshold: 6
            }
            {
              type: 'Readiness'
              httpGet: {
                path: '/health/ready'
                port: 8080
                scheme: 'HTTP'
              }
              initialDelaySeconds: 15
              periodSeconds: 10
              timeoutSeconds: 5
              failureThreshold: 18
            }
          ]
        }
        {
          name: 'database'
          image: databaseImage
          env: [
            {
              name: 'POSTGRES_DB'
              value: 'p10'
            }
            {
              name: 'POSTGRES_USER'
              value: 'p10_owner'
            }
            {
              name: 'POSTGRES_PASSWORD'
              secretRef: 'database-owner-password'
            }
            {
              name: 'P10_RUNTIME_PASSWORD'
              secretRef: 'database-runtime-password'
            }
            {
              name: 'PGDATA'
              value: '/var/lib/postgresql/data/pgdata'
            }
          ]
          resources: {
            cpu: json('0.5')
            memory: '1.0Gi'
          }
          probes: [
            {
              type: 'Readiness'
              tcpSocket: {
                port: 5432
              }
              initialDelaySeconds: 10
              periodSeconds: 10
              timeoutSeconds: 5
              failureThreshold: 18
            }
          ]
        }
      ]
      scale: {
        minReplicas: 0
        maxReplicas: 1
        rules: [
          {
            name: 'recruiter-http'
            http: {
              metadata: {
                concurrentRequests: '10'
              }
            }
          }
        ]
      }
    }
  }
}

output appName string = app.name
output appUrl string = 'https://${app.properties.configuration.ingress.fqdn}'
output appResourceId string = app.id
output revisionName string = app.properties.latestRevisionName
