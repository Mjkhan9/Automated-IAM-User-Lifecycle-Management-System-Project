# IAM Lifecycle Automation Platform - Architecture

## System Architecture Overview

This document describes the architecture of the IAM Lifecycle Automation Platform (Microsoft Entra ID edition), including data flows, components, and security boundaries.

## Architecture Diagram

```mermaid
flowchart TB
    subgraph External["External Systems"]
        HR[("🏢 HR System<br/>(Workday/SAP)")]
        EMAIL["📧 Email/Notifications"]
    end

    subgraph OnPrem["On-Premises Infrastructure"]
        subgraph AD["Active Directory Domain"]
            ADC["🖥️ Domain Controller"]
            ADOU["📁 Organizational Units"]
            ADGP["📋 Group Policies"]
        end
        
        subgraph Scripts["Automation Scripts"]
            PS["⚡ PowerShell Scripts<br/>• New-ADUserProvision.ps1<br/>• Remove-ADUserDeprovision.ps1<br/>• Get-DormantAccounts.ps1<br/>• Sync-ADGroupMembership.ps1"]
        end
        
        FS["📂 File Server<br/>(Home Directories)"]
    end

    subgraph Azure["Microsoft Cloud (Entra ID + Azure)"]
        subgraph Compute["Compute Layer"]
            PY["🐍 Python Microsoft Graph Scripts<br/>• entra_provisioner.py<br/>• compliance_audit.py"]
            FUNC["⚡ Azure Functions<br/>(Optional)"]
        end
        
        subgraph ENTRA_SVC["Entra ID Services"]
            ENU["👤 Entra Users"]
            ENG["👥 Security Groups"]
            ENP["📜 RBAC Directory Roles"]
            ENR["🔐 Managed Identity"]
        end
        
        subgraph Storage["Storage & Secrets"]
            KV["🔑 Azure Key Vault<br/>(Credentials)"]
            BLOB["📦 Blob Storage<br/>(Audit Archives)"]
        end
        
        subgraph Messaging["Messaging & Audit"]
            MAIL["📢 Graph sendMail<br/>(Notifications)"]
            AL["📊 Entra Audit Logs<br/>(Audit Logs)"]
            MON["📈 Azure Monitor<br/>(Monitoring)"]
        end
        
        subgraph Security["Security Layer"]
            KVK["🔐 Key Vault RBAC<br/>(Access Control)"]
            CA["🛡️ Conditional Access"]
        end
    end

    subgraph WebUI["Web Console"]
        FLASK["🌐 Flask Dashboard<br/>(Portfolio Demo)"]
    end

    %% Data Flows
    HR -->|"1. New Hire Event"| PS
    HR -->|"1. Termination Event"| PS
    
    PS -->|"2. Create/Disable Account"| ADC
    PS -->|"2. Manage Groups"| ADOU
    PS -->|"3. Create Home Dir"| FS
    
    PS -->|"4. Trigger Entra Provisioning"| PY
    PY -->|"5. Create Entra User"| ENU
    PY -->|"5. Assign Groups"| ENG
    PY -->|"5. Assign Roles"| ENP
    
    PY -->|"6. Store Credentials"| KV
    KV -->|"Protected by"| KVK
    
    PY -->|"7. Send Notification"| MAIL
    MAIL -->|"8. Alert"| EMAIL
    
    PY -->|"9. Actions logged"| AL
    AL -->|"Archive"| BLOB
    BLOB -->|"Accessed via"| ENR
    
    FLASK -->|"View Status"| PY
    FLASK -->|"View Logs"| AL

    %% Styling
    classDef cloud fill:#0078D4,stroke:#002050,color:white
    classDef onprem fill:#5C2D91,stroke:#2E1648,color:white
    classDef security fill:#DD3522,stroke:#8B0000,color:white
    classDef external fill:#6B7280,stroke:#374151,color:white
    
    class HR,EMAIL external
    class ADC,ADOU,ADGP,PS,FS onprem
    class ENU,ENG,ENP,ENR,KV,BLOB,MAIL,AL,MON,FUNC,PY cloud
    class KVK,CA security
```

## Component Details

### 1. HR System Integration
- **Source**: Workday, SAP, or similar HRIS
- **Events**: New hire, termination, department transfer, role change
- **Integration**: CSV export, API webhooks, or scheduled sync

### 2. PowerShell Scripts (On-Premises)

| Script | Purpose |
|--------|---------|
| `New-ADUserProvision.ps1` | Create AD accounts with proper OU placement, group memberships |
| `Remove-ADUserDeprovision.ps1` | Disable accounts, revoke access, archive data |
| `Get-DormantAccounts.ps1` | Identify inactive accounts for compliance |
| `Sync-ADGroupMembership.ps1` | Synchronize group memberships based on roles |

### 3. Python Microsoft Graph Scripts (Entra ID)

| Script | Purpose |
|--------|---------|
| `entra_provisioner.py` | Create Entra users, add security groups, assign directory roles |
| `compliance_audit.py` | CIS benchmark checks, credential age analysis |

### 4. Microsoft Entra ID and Azure Services

| Service | Purpose |
|---------|---------|
| **Microsoft Entra ID** | User/group/directory role management |
| **Azure Key Vault** | Secure credential storage with versioning |
| **Blob Storage** | Audit log archival with 7-year retention |
| **Microsoft Graph sendMail** | Real-time notifications to managers |
| **Entra audit and sign-in logs** | Complete audit trail of all identity actions |
| **Managed identity** | Credential-free access to Key Vault and Storage |
| **Azure Monitor** | Monitoring and alerting |

## Data Flow Sequence

```mermaid
sequenceDiagram
    participant HR as HR System
    participant PS as PowerShell
    participant AD as Active Directory
    participant PY as Python/Graph
    participant ENTRA as Entra ID
    participant KV as Key Vault
    participant MAIL as Graph sendMail
    participant AL as Entra Audit Logs

    HR->>PS: 1. New hire notification
    PS->>AD: 2. Create AD account
    PS->>AD: 3. Add to security groups
    PS->>PS: 4. Create home directory
    PS->>PY: 5. Trigger Entra provisioning
    PY->>ENTRA: 6. Create Entra user
    PY->>ENTRA: 7. Add to security groups
    PY->>ENTRA: 8. Assign directory roles
    PY->>KV: 9. Store credentials (encrypted)
    PY->>MAIL: 10. Send notification
    MAIL-->>HR: 11. Email to manager
    ENTRA->>AL: 12. Record audit event
    AL-->>AL: 13. Archive to Blob Storage
```

## Security Boundaries

### Network Security
- **Key Vault firewall**: Trusted Azure services bypass, deny-by-default available
- **Storage**: HTTPS only, no public blob access, TLS 1.2 minimum
- **Conditional Access**: Sign-in conditions for the automation and admin accounts

### Identity Security
- **Least Privilege**: Minimal permissions per role
- **MFA Required**: Audited for every user who signs in
- **Password Policy**: Temporary password, change required at next sign-in

### Data Security
- **Encryption at Rest**: Key Vault and Blob Storage (Microsoft-managed keys)
- **Encryption in Transit**: TLS 1.2+ for all communications
- **Secret Versioning**: Every credential write is a new Key Vault secret version

### Audit & Compliance
- **Entra audit logs**: All directory changes logged
- **Retention**: 7-year log retention for compliance
- **Immutability**: Time-based retention on the archive container in production

## Microsoft Well-Architected Alignment

| Pillar | Implementation |
|--------|----------------|
| **Security** | Key Vault RBAC, least-privilege directory roles, managed identity |
| **Reliability** | Zone-redundant options, retry logic, error handling |
| **Cost Optimization** | Serverless components, lifecycle policies |
| **Operational Excellence** | Entra audit logs, Azure Monitor, automated responses |
| **Performance** | Graph batching-ready calls, efficient API usage |
| **Sustainability** | Right-sized resources, lifecycle policies |

## Deployment Architecture

```mermaid
flowchart LR
    subgraph Dev["Development"]
        DEV_BICEP["Bicep Deployment"]
        DEV_KV["Key Vault"]
        DEV_ST["Storage Account"]
    end
    
    subgraph Staging["Staging"]
        STG_BICEP["Bicep Deployment"]
        STG_KV["Key Vault"]
        STG_ST["Storage Account"]
    end
    
    subgraph Prod["Production"]
        PROD_BICEP["Bicep Deployment"]
        PROD_KV["Key Vault"]
        PROD_ST["Storage Account"]
    end
    
    GH["GitHub Actions<br/>CI/CD Pipeline"] --> Dev
    Dev -->|"Promote"| Staging
    Staging -->|"Promote"| Prod
```

## Cost Estimation

| Service | Monthly Cost (Estimated) |
|---------|-------------------------|
| Microsoft Entra ID | Included (sign-in activity needs P1) |
| Blob Storage (audit archive) | Cents per GB |
| Azure Key Vault | ~$0.03 per 10,000 operations |
| Microsoft Graph sendMail | Included with an Exchange Online mailbox |
| Entra audit logs | Included |
| Managed identity | Free |
| **Total** | **Under $1/month** |

---

*Last Updated: October 2026*
*Author: Mohammad Khan*

