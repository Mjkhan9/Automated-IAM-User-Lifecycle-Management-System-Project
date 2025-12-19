# IAM Lifecycle Automation Platform

[![AWS](https://img.shields.io/badge/AWS-IAM%20|%20CloudFormation-FF9900?logo=amazon-aws)](https://aws.amazon.com/) [![Python](https://img.shields.io/badge/Python-3.9%2B-3776ab?logo=python)](https://www.python.org/) [![PowerShell](https://img.shields.io/badge/PowerShell-5.1%2B-5391FE?logo=powershell)](https://learn.microsoft.com/powershell/)

> **Solving the user provisioning nightmare:** From 4+ hours per user to minutes of automation

Identity and Access Management automation for hybrid Active Directory and AWS environments.

## The Problem

Manual identity provisioning across hybrid AD and AWS environments introduces latency, configuration drift, and audit risk:

1. **Active Directory** - Create account, set OU, configure security groups (1-2 hours)
2. **AWS IAM** - Duplicate the entire process in AWS (1-2 hours)
3. **Permissions** - Configure role-based policies and access levels (1 hour)
4. **Documentation** - Log everything for compliance (30 min)

**Total: 4+ hours per user. Error-prone. Repetitive at scale.**

This platform automates user lifecycle events with consistent policy application and immutable audit trails.

**[📺 Live Demo](https://mjkhan9.github.io/Automated-IAM-User-Lifecycle-Management-System-Project/)**

---

## What It Does

Handles the **complete user lifecycle** automatically:

| Phase | What Happens | Time Saved |
|-------|--------------|-----------|
| **Provisioning** | Creates users in AD + AWS with role-based permissions | 3.5 hours |
| **De-provisioning** | Secure offboarding with data archival and revocation | 2 hours |
| **Compliance** | Continuous CIS Benchmark checks and dormant account detection | 1 hour/month |
| **Audit Trail** | 7-year retention logs for regulatory compliance | Automatic |

---

## Failure Modes & Safeguards

Handled explicitly:
- Partial provisioning (AD succeeds, AWS fails)
- Duplicate user detection
- Policy attachment conflicts

Not handled automatically:
- Conflicting HR source data
- Privilege escalation requests outside predefined roles

These require manual review by design.

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
│  Python/Boto3 Scripts ──────┼─────▶ AWS IAM                        │
│        │                    │       ├─ Create user                 │
│        │                    │       ├─ Attach policies             │
│        │                    │       └─ Setup console access        │
│        │                    │                                      │
│        ▼                    │                                      │
│  Secrets Manager ───────────┼─────▶ Credentials (Encrypted)        │
│        │                    │                                      │
│        ▼                    │                                      │
│  SNS Notifications ─────────┼─────▶ Manager Approval               │
│        │                    │                                      │
│        ▼                    │                                      │
│  CloudTrail Logging ────────┴─────▶ Compliance Audit Trail         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Hybrid Architecture:**
- **On-Premises:** PowerShell scripts manage Active Directory
- **Cloud:** Python/Boto3 handles AWS IAM seamlessly
- **Security:** Secrets Manager for encrypted credential storage (KMS encryption managed by AWS)

### Component Breakdown

**Active Directory Automation (PowerShell)**
- `New-ADUserProvision.ps1` - Creates users with proper OU placement and security groups
- `Remove-ADUserDeprovision.ps1` - Secure offboarding with mailbox archival
- `Get-DormantAccounts.ps1` - Finds inactive accounts for deprovisioning review
- `Sync-ADGroupMembership.ps1` - Keeps group memberships in sync with HR data

**AWS IAM Automation (Python/Boto3)**
- `iam_provisioner.py` - Creates IAM users with least-privilege policies based on role
- `compliance_audit.py` - Runs automated CIS Benchmark compliance checks
- Uses IAM, S3, SNS, and Secrets Manager clients for provisioning workflows

**Infrastructure (CloudFormation)**
- Deploys Secrets Manager for encrypted credential storage (AWS-managed KMS encryption)
- Sets up SNS topics for manager notifications and alerts
- Configures CloudTrail with S3 logging for audit trails

**Note:** This is a CLI-based automation system. A Flask-based web console is planned for future enhancement.

---

## Getting Started

### Prerequisites

- AWS CLI configured with appropriate IAM permissions
- Python 3.9+ with pip
- PowerShell 5.1+ (for Active Directory scripts)
- Active Directory access (for on-premises integration)

### Quick Deploy

```bash
# Clone the repository
git clone https://github.com/Mjkhan9/Automated-IAM-User-Lifecycle-Management-System-Project.git
cd Automated-IAM-User-Lifecycle-Management-System-Project

# Deploy AWS infrastructure
aws cloudformation deploy \
    --template-file deploy/cloudformation/iam-platform-stack.yaml \
    --stack-name iam-automation-platform \
    --parameter-overrides Environment=dev NotificationEmail=your@email.com \
    --capabilities CAPABILITY_NAMED_IAM

# Install Python dependencies
pip install -r requirements.txt

# Run provisioning demo
python scripts/python/iam_provisioner.py
```

### Run Compliance Audit

```bash
python scripts/python/compliance_audit.py
```

---

## Project Structure

```
deploy/
├── cloudformation/
│   └── iam-platform-stack.yaml         # AWS infrastructure as code
├── docs/                               # Interactive portfolio site
│   ├── index.html
│   ├── architecture.md
│   ├── css/style.css
│   ├── js/app.js
│   └── images/
│       └── architecture.svg
├── scripts/
│   ├── python/
│   │   ├── iam_provisioner.py         # AWS IAM automation
│   │   ├── compliance_audit.py        # CIS benchmark checks
│   │   └── requirements.txt           # Python dependencies
│   └── powershell/
│       ├── New-ADUserProvision.ps1    # AD user creation
│       ├── Remove-ADUserDeprovision.ps1
│       ├── Get-DormantAccounts.ps1
│       └── Sync-ADGroupMembership.ps1
├── tests/
│   ├── python/
│   │   ├── test_iam_provisioner.py
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
- **Encryption at Rest:** AWS-managed KMS encryption for Secrets Manager, S3, CloudTrail
- **Encryption in Transit:** TLS 1.2+ for all API calls
- **Least Privilege:** Users only get minimum permissions for their role
- **MFA Enforcement:** All console access requires multi-factor authentication
- **Audit Everything:** CloudTrail logs every API call (7-year retention)

### ✅ Designed to Support Compliance Controls
- **CIS AWS Foundations Benchmark** automated checks
- Designed to support **FERPA-aligned** access controls (education data isolation)
- Designed to support **HIPAA-aligned** controls (encryption, audit trails)
- Designed to support **SOX audit requirements** (complete access logs)

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
from iam_provisioner import IAMProvisioner, UserRequest

provisioner = IAMProvisioner(demo_mode=True)

# Create user request
request = UserRequest(
    username="jsmith",
    email="jsmith@company.com",
    department="Engineering",
    role="Developer",
    first_name="John",
    last_name="Smith"
)

# Provision in both AD and AWS
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
| IAM | **Free** | Within AWS limits |
| Secrets Manager | ~$0.40/secret/month | Encrypted credential storage |
| S3 (audit logs) | ~$0.50/month | 7-year retention |
| SNS (notifications) | ~$0.50/month | Manager alerts |
| CloudTrail | **Free** | First trail included |
| KMS (encryption keys) | ~$1/key/month | 2-3 keys typical |
| **Total** | **$2-5/month** | *Plus minimal data transfer* |

---

## What I Learned Building This

✅ **Hybrid cloud orchestration** - Bridging on-premises AD with AWS IAM seamlessly  
✅ **Infrastructure as Code** - CloudFormation templates for repeatable deployments  
✅ **Security best practices** - Encryption, audit trails, least privilege IAM  
✅ **Operational maturity** - Error handling, logging, comprehensive compliance  
✅ **Polyglot automation** - PowerShell + Python + Boto3 working together  

---

## Roadmap

- [ ] Lambda-based event-driven provisioning (real-time sync)
- [ ] AWS Organizations multi-account support
- [ ] Integration with AWS SSO / Identity Center
- [ ] Terraform IaC alternative to CloudFormation
- [ ] Okta/AzureAD connector support

---

## Author

**Mohammad Khan**  
AWS Certified Solutions Architect Associate  
IT Operations Specialist @ Nagarro (NYCPS/OPT)  
University of Houston (CIS)

[🔗 LinkedIn](https://linkedin.com/in/mohammad-jkhan) · [🔗 GitHub](https://github.com/Mjkhan9)

---

## License

MIT License - see [LICENSE](LICENSE) for details.

*Created for educational and portfolio demonstration purposes. For production use, customize security policies and AWS account setup to match your organization's requirements.*
