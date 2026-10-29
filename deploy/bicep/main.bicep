// =============================================================================
// Identity Lifecycle Automation Platform Infrastructure
//
// This template deploys the infrastructure for the identity automation platform:
// - Azure Key Vault for credential storage (RBAC, soft delete, purge protection in prod)
// - Storage account for the audit log archive (7-year retention, HTTPS only)
// - User-assigned managed identity for the automation scripts
// - Role assignments for that identity on the vault and the archive
//
// Notifications use Microsoft Graph sendMail and need no Azure resource.
// Audit logging comes from Microsoft Entra audit and sign-in logs; export them to the
// archive with a tenant-level Entra diagnostic setting (configured outside this
// resource-group template). Microsoft Graph application permissions for the
// identity (User.ReadWrite.All, Group.ReadWrite.All, RoleManagement.ReadWrite.Directory,
// Mail.Send, AuditLog.Read.All) are granted by an Entra administrator.
//
// Author: Mohammad Khan
// Version: 1.0.0
// =============================================================================

// =============================================================================
// PARAMETERS
// =============================================================================

@description('Deployment environment (affects resource naming and retention policies)')
@allowed([
  'dev'
  'staging'
  'prod'
])
param environment string = 'dev'

@description('Project name used for resource naming')
@minLength(3)
@maxLength(12)
param projectName string = 'iamauto'

@description('Azure region for all resources')
param location string = resourceGroup().location

@description('Number of days to retain audit logs (default 7 years for compliance)')
@minValue(90)
@maxValue(3650)
param auditLogRetentionDays int = 2555

@description('Number of days before archived audit logs move to the archive tier')
@minValue(30)
@maxValue(365)
param archiveTierAfterDays int = 90

// =============================================================================
// VARIABLES
// =============================================================================

var isProduction = environment == 'prod'
var suffix = uniqueString(resourceGroup().id, projectName, environment)
var keyVaultName = take('${projectName}-kv-${environment}-${suffix}', 24)
var storageAccountName = take(toLower('${projectName}audit${environment}${suffix}'), 24)
var tags = {
  Environment: environment
  Project: projectName
  ManagedBy: 'Bicep'
}

// Built-in Azure role definition IDs
var keyVaultSecretsOfficerRoleId = 'b86a8fe4-44ce-4948-aee5-eccb2c155cd7'
var storageBlobDataContributorRoleId = 'ba92f5b4-2d11-453d-a403-e96b0029c9fe'

// =============================================================================
// RESOURCES
// =============================================================================

// -----------------------------------------------------------------------------
// MANAGED IDENTITY - For automation scripts and Azure Functions
// -----------------------------------------------------------------------------
resource automationIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: '${projectName}-automation-${environment}'
  location: location
  tags: tags
}

// -----------------------------------------------------------------------------
// KEY VAULT - Credential storage (RBAC authorization, soft delete)
// -----------------------------------------------------------------------------
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: keyVaultName
  location: location
  tags: union(tags, { DataClassification: 'Confidential' })
  properties: {
    tenantId: subscription().tenantId
    sku: {
      family: 'A'
      name: 'standard'
    }
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: isProduction ? 90 : 7
    enablePurgeProtection: isProduction ? true : null
    publicNetworkAccess: 'Enabled'
    networkAcls: {
      bypass: 'AzureServices'
      defaultAction: 'Allow'
    }
  }
}

// -----------------------------------------------------------------------------
// STORAGE ACCOUNT - Audit log archive (HTTPS only, no public blobs)
// -----------------------------------------------------------------------------
resource auditStorage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageAccountName
  location: location
  tags: union(tags, { DataClassification: 'Audit', RetentionPolicy: '${auditLogRetentionDays} days' })
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Cool'
    supportsHttpsTrafficOnly: true
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    allowSharedKeyAccess: false
  }
}

resource auditBlobService 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: auditStorage
  name: 'default'
  properties: {
    isVersioningEnabled: true
    deleteRetentionPolicy: {
      enabled: true
      days: 30
    }
  }
}

resource auditContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: auditBlobService
  name: 'audit-logs'
  properties: {
    publicAccess: 'None'
  }
}

// Time-based retention (write once, read many) in production
resource auditImmutability 'Microsoft.Storage/storageAccounts/blobServices/containers/immutabilityPolicies@2023-05-01' = if (isProduction) {
  parent: auditContainer
  name: 'default'
  properties: {
    immutabilityPeriodSinceCreationInDays: 365
    allowProtectedAppendWrites: true
  }
}

// Lifecycle: archive tier after N days, delete after the retention period
resource auditLifecycle 'Microsoft.Storage/storageAccounts/managementPolicies@2023-05-01' = {
  parent: auditStorage
  name: 'default'
  properties: {
    policy: {
      rules: [
        {
          name: 'archive-then-expire'
          enabled: true
          type: 'Lifecycle'
          definition: {
            filters: {
              blobTypes: [
                'blockBlob'
              ]
              prefixMatch: [
                'audit-logs/'
              ]
            }
            actions: {
              baseBlob: {
                tierToArchive: {
                  daysAfterModificationGreaterThan: archiveTierAfterDays
                }
                delete: {
                  daysAfterModificationGreaterThan: auditLogRetentionDays
                }
              }
              version: {
                delete: {
                  daysAfterCreationGreaterThan: 30
                }
              }
            }
          }
        }
      ]
    }
  }
}

// -----------------------------------------------------------------------------
// ROLE ASSIGNMENTS - Least privilege for the automation identity
// -----------------------------------------------------------------------------
resource vaultSecretsOfficer 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, automationIdentity.id, keyVaultSecretsOfficerRoleId)
  scope: keyVault
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', keyVaultSecretsOfficerRoleId)
    principalId: automationIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

resource archiveBlobContributor 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(auditStorage.id, automationIdentity.id, storageBlobDataContributorRoleId)
  scope: auditStorage
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', storageBlobDataContributorRoleId)
    principalId: automationIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

// =============================================================================
// OUTPUTS
// =============================================================================

output keyVaultName string = keyVault.name
output keyVaultUri string = keyVault.properties.vaultUri
output auditStorageAccountName string = auditStorage.name
output auditArchiveBlobEndpoint string = auditStorage.properties.primaryEndpoints.blob
output automationIdentityClientId string = automationIdentity.properties.clientId
output automationIdentityPrincipalId string = automationIdentity.properties.principalId
output environmentName string = environment
output deploymentLocation string = location
