# Hybrid IAM User Lifecycle Automation (Active Directory + Microsoft Entra ID)

[![Microsoft Entra ID](https://img.shields.io/badge/Microsoft%20Entra%20ID-Microsoft%20Graph%20|%20Bicep-0078D4?logo=microsoft)](https://learn.microsoft.com/entra/identity/) [![Python](https://img.shields.io/badge/Python-3.9%2B-3776ab?logo=python)](https://www.python.org/) [![PowerShell](https://img.shields.io/badge/PowerShell-5.1%2B-5391FE?logo=powershell)](https://learn.microsoft.com/powershell/)

> **Solving the user provisioning nightmare:** From 4+ hours per user to minutes of automation

Identity and Access Management automation for hybrid Active Directory and Microsoft Entra ID environments.

> History: the original AWS version of this project is preserved at tag [`v1-aws`](https://github.com/Mjkhan9/Automated-IAM-User-Lifecycle-Management-System-Project/tree/v1-aws).

## The Problem

User provisioning was manual and repeated across two directories:

1. **Active Directory** - Create account, set OU, configure security groups (1-2 hours)
2. **Microsoft Entra ID** - Repeat the process for the cloud identity (1-2 hours)
3. **Permissions** - Configure role-based access and directory roles (1 hour)
4. **Documentation** - Log everything for compliance (30 min)

**Total: 4+ hours per user. Error-prone. Repetitive at scale.**

This platform automates the entire workflow end-to-end with zero manual intervention.

**[📺 Live Demo](https://mjkhan9.github.io/Automated-IAM-User-Lifecycle-Management-System-Project/)**

---

## What It Does

Handles the **complete user lifecycle** automatically:

| Phase | What Happens | Time Saved |
|-------|--------------|-----------|
| **Provisioning** | Creates users in AD + Entra ID with role-based permissions | 3.5 hours |
| **De-provisioning** | Secure offboarding with data archival and revocation | 2 hours |
| **Compliance** | Continuous CIS Benchmark checks and dormant account detection | 1 hour/month |
| **Audit Trail** | 7-year retention logs for regulatory compliance | Automatic |

---

## How It Works

```
┌─────────────────────────────────────────────────────────────────────┐
│                    User Provisioning Flow                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  HR System (CSV/API)                                               │
│        │                                                            │
│        ▼                                                            │
│  PowerShell Scripts ─────────┐                                     │
│        │                     ├─────▶ Active Directory              │
│        │                     │       ├─ Create user                │
│        │                     │       ├─ Set OU                     │
│        │                     │       └─ Assign groups              │
│        │                     │                                      │
│        ▼                     │                                      │
│  Python/Microsoft Graph ────┼─────▶ Microsoft Entra ID             │
│        │                    │       ├─ Create user                 │
│        │                    │       ├─ Assign RBAC roles           │
│        │                    │       └─ Add security groups         │
│        │                    │                                      │
│        ▼                    │                                      │
│  Azure Key Vault ───────────┼─────▶ Credentials (Encrypted)        │
│        │                    │                                      │
│        ▼                    │                                      │
│  Graph sendMail ────────────┼─────▶ Manager Approval               │
│        │                    │                                      │
│        ▼                    │                                      │
│  Entra Audit Logs ──────────┴─────▶ Compliance Audit Trail         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Hybrid Architecture:**
- **On-Premises:** PowerShell scripts manage Active Directory
- **Cloud:** Python and Microsoft Graph handle Entra ID users, groups and directory roles
- **Security:** Azure Key Vault for encrypted credential storage (RBAC authorization, soft delete)

### Component Breakdown

**Active Directory Automation (PowerShell)**
- `New-ADUserProvision.ps1` - Creates users with proper OU placement and security groups
- `Remove-ADUserDeprovision.ps1` - Secure offboarding with mailbox archival
- `Get-DormantAccounts.ps1` - Finds inactive accounts for deprovisioning review
- `Sync-ADGroupMembership.ps1` - Keeps group memberships in sync with HR data

**Microsoft Entra ID Automation (Python/Microsoft Graph)**
- `entra_provisioner.py` - Creates Entra users with least-privilege directory roles based on role
- `compliance_audit.py` - Runs automated CIS Microsoft 365 Foundations Benchmark checks
- Uses Microsoft Graph (REST), Azure Key Vault and Azure Blob Storage clients for provisioning workflows

**Infrastructure (Bicep)**
- Deploys Azure Key Vault for encrypted credential storage
- Deploys a Storage account for the audit log archive (archive tier, 7-year retention)
- Creates a managed identity for the automation, with least-privilege role assignments
- Notifications use Microsoft Graph sendMail (no extra resource); audit data comes from Microsoft Entra audit and sign-in logs

**Note:** This is a CLI-based automation system. A Flask-based web console is planned for future enhancement.

---

## Getting Started

### Prerequisites

- Azure CLI signed in to the target subscription
- An Entra app registration or managed identity with Microsoft Graph application permissions: `User.ReadWrite.All`, `Group.ReadWrite.All`, `RoleManagement.ReadWrite.Directory`, `Mail.Send`, `AuditLog.Read.All` (sign-in activity needs Microsoft Entra ID P1)
- Python 3.9+ with pip
- PowerShell 5.1+ (for Active Directory scripts)
- Active Directory access (for on-premises integration)

### Quick Deploy

```bash
# Clone the repository
git clone https://github.com/Mjkhan9/Automated-IAM-User-Lifecycle-Management-System-Project.git
cd Automated-IAM-User-Lifecycle-Management-System-Project

# Deploy Azure infrastructure
az deployment group create \
    --resource-group rg-iam-automation \
    --template-file deploy/bicep/main.bicep \
    --parameters environment=dev

# Install Python dependencies
pip install -r requirements.txt

# Run provisioning demo
python scripts/python/entra_provisioner.py
```

### Run Compliance Audit

```bash
python scripts/python/compliance_audit.py
```

---

## Project Structure

```
deploy/
├── bicep/
│   └── main.bicep                      # Azure infrastructure as code
├── docs/                               # Interactive portfolio site
│   ├── index.html
│   ├── architecture.md
│   ├── css/style.css
│   ├── js/app.js
│   └── images/
│       └── architecture.svg
├── scripts/
│   ├── python/
│   │   ├── entra_provisioner.py       # Microsoft Entra ID automation
│   │   ├── compliance_audit.py        # CIS benchmark checks
│   │   └── requirements.txt           # Python dependencies
│   └── powershell/
│       ├── New-ADUserProvision.ps1    # AD user creation
│       ├── Remove-ADUserDeprovision.ps1
│       ├── Get-DormantAccounts.ps1
│       └── Sync-ADGroupMembership.ps1
├── tests/
│   ├── python/
│   │   ├── test_entra_provisioner.py
│   │   └── test_compliance_audit.py
│   └── powershell/
│       └── New-ADUserProvision.Tests.ps1
├── data/
│   └── sample_data/
│       └── users.csv                  # Example user data
├── requirements.txt
├── LICENSE
└── README.md
```

---

## Key Features

### ✅ Security by Design
- **Encryption at Rest:** Azure Key Vault and Azure Storage encryption (Microsoft-managed keys)
- **Encryption in Transit:** TLS 1.2+ for all API calls
- **Least Privilege:** Users only get minimum permissions for their role
- **MFA Enforcement:** The compliance audit flags any user who signs in without a registered MFA method
- **Audit Everything:** Microsoft Entra audit and sign-in logs, archived to Storage (7-year retention)

### ✅ Compliance Built-In
- **CIS Microsoft 365 Foundations Benchmark** automated checks
- **FERPA compliant** (education data isolation)
- **HIPAA compatible** (encryption, audit trails)
- **SOX audit-ready** (complete access logs)

### ✅ Real-World Operations
- **Error Handling:** Retry logic with exponential backoff
- **Input Validation:** Prevents invalid user creation attempts
- **Demo Mode:** Safe testing without touching production
- **Comprehensive Logging:** Track every provisioning decision

---

## Running Tests

### Python Tests

```bash
pip install -r requirements.txt
pytest tests/python/ -v --cov=scripts/python --cov-report=html
```

### PowerShell Tests

```powershell
Install-Module -Name Pester -Force -SkipPublisherCheck
Invoke-Pester tests/powershell/ -Output Detailed
```

---

## Usage Examples

### Provision a User (Python)

```python
from entra_provisioner import EntraProvisioner, UserRequest

provisioner = EntraProvisioner(demo_mode=True)

# Create user request
request = UserRequest(
    username="jsmith",
    email="jsmith@company.com",
    department="Engineering",
    role="Developer",
    first_name="John",
    last_name="Smith"
)

# Provision in Entra ID
result = provisioner.create_user(request)
print(f"User created: {result.success}")
print(f"Groups assigned: {result.groups_assigned}")
print(f"Access configured: {result.policies_attached}")
```

### Run Compliance Audit (Python)

```python
from compliance_audit import IAMComplianceAuditor

auditor = IAMComplianceAuditor(demo_mode=True)
report = auditor.run_full_audit()
auditor.print_report(report)
```

---

## Cost Breakdown

Designed to be extremely cost-effective:

| Service | Cost | Notes |
|---------|------|-------|
| Microsoft Entra ID | **Included** | Sign-in activity reports need Entra ID P1 |
| Azure Key Vault (Standard) | ~$0.03 per 10,000 operations | Encrypted credential storage |
| Storage (audit archive) | Cents per GB/month | Cool and archive tiers, 7-year retention |
| Microsoft Graph sendMail | **Included** | Uses an existing Exchange Online mailbox |
| Microsoft Entra audit logs | **Included** | Exported to the archive with a diagnostic setting |
| Managed identity | **Free** | Automation identity |
| **Total** | **Under $1/month** | *Plus licensing already in place* |

---

## What I Learned Building This

✅ **Hybrid identity orchestration** - Bridging on-premises AD with Microsoft Entra ID  
✅ **Infrastructure as Code** - Bicep templates for repeatable deployments  
✅ **Security best practices** - Encryption, audit trails, least-privilege RBAC  
✅ **Operational maturity** - Error handling, logging, comprehensive compliance  
✅ **Polyglot automation** - PowerShell + Python + Microsoft Graph working together  

---

## Roadmap

- [ ] Azure Functions event-driven provisioning (real-time sync)
- [ ] Multi-tenant support
- [ ] Integration with Microsoft Entra ID Governance (lifecycle workflows, access reviews)
- [ ] Terraform IaC alternative to Bicep
- [ ] Okta connector support

---

## Author

**Mohammad Khan**  
Information Technology Specialist | IAM & Microsoft Security @ Accredo Packaging  
AWS Certified Solutions Architect – Associate · SC-300 Microsoft Identity and Access Administrator (exam scheduled Nov 2026)  
University of Houston (B.S., Computer & Information Systems Security / Information Assurance)

[🔗 LinkedIn](https://linkedin.com/in/mohammad-jkhan) · [🔗 GitHub](https://github.com/Mjkhan9)

---

## License

MIT License - see [LICENSE](LICENSE) for details.

*Created for educational and portfolio demonstration purposes. For production use, customize security policies and tenant setup to match your organization's requirements.*
