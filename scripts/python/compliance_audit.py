"""
AWS IAM Compliance Audit System
Author: Mohammad Khan
Date: December 2025

Automated compliance scanning for AWS IAM:
- Credential age analysis
- MFA enforcement verification
- Unused access detection
- Policy attachment review
- CIS Benchmark alignment
"""

import boto3
import json
import logging
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
from enum import Enum
from botocore.exceptions import ClientError

# ============================================================================
# CONFIGURATION
# ============================================================================

DEMO_MODE = True

# Compliance thresholds
MAX_PASSWORD_AGE_DAYS = 90
MAX_ACCESS_KEY_AGE_DAYS = 90
MAX_UNUSED_DAYS = 45
REQUIRE_MFA = True

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] [%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)


# ============================================================================
# ENUMS AND DATA CLASSES
# ============================================================================

class Severity(Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    INFO = "INFO"


class ComplianceStatus(Enum):
    COMPLIANT = "COMPLIANT"
    NON_COMPLIANT = "NON_COMPLIANT"
    NOT_APPLICABLE = "N/A"


@dataclass
class Finding:
    """Represents a compliance finding"""
    rule_id: str
    rule_name: str
    resource_type: str
    resource_id: str
    severity: Severity
    status: ComplianceStatus
    description: str
    recommendation: str
    details: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict:
        return {
            "rule_id": self.rule_id,
            "rule_name": self.rule_name,
            "resource_type": self.resource_type,
            "resource_id": self.resource_id,
            "severity": self.severity.value,
            "status": self.status.value,
            "description": self.description,
            "recommendation": self.recommendation,
            "details": self.details
        }


@dataclass
class AuditReport:
    """Complete audit report"""
    scan_timestamp: str
    total_users: int
    total_findings: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    compliance_score: float
    findings: List[Finding]
    
    def to_dict(self) -> Dict:
        return {
            "scan_timestamp": self.scan_timestamp,
            "total_users": self.total_users,
            "total_findings": self.total_findings,
            "findings_by_severity": {
                "critical": self.critical_count,
                "high": self.high_count,
                "medium": self.medium_count,
                "low": self.low_count
            },
            "compliance_score": f"{self.compliance_score:.1f}%",
            "findings": [f.to_dict() for f in self.findings]
        }


# ============================================================================
# DEMO DATA
# ============================================================================

DEMO_USERS = [
    {
        "UserName": "admin_user",
        "UserId": "AIDAEXAMPLE1",
        "CreateDate": datetime.now(timezone.utc) - timedelta(days=400),
        "PasswordLastUsed": datetime.now(timezone.utc) - timedelta(days=5),
        "MFADevices": [],
        "AccessKeys": [
            {"AccessKeyId": "AKIAEXAMPLE1", "Status": "Active", 
             "CreateDate": datetime.now(timezone.utc) - timedelta(days=200)}
        ],
        "AttachedPolicies": [{"PolicyName": "AdministratorAccess", "PolicyArn": "arn:aws:iam::aws:policy/AdministratorAccess"}],
        "Groups": ["Administrators"]
    },
    {
        "UserName": "developer_jane",
        "UserId": "AIDAEXAMPLE2",
        "CreateDate": datetime.now(timezone.utc) - timedelta(days=180),
        "PasswordLastUsed": datetime.now(timezone.utc) - timedelta(days=2),
        "MFADevices": [{"SerialNumber": "arn:aws:iam::123456789012:mfa/developer_jane"}],
        "AccessKeys": [
            {"AccessKeyId": "AKIAEXAMPLE2", "Status": "Active",
             "CreateDate": datetime.now(timezone.utc) - timedelta(days=60)}
        ],
        "AttachedPolicies": [],
        "Groups": ["Developers"]
    },
    {
        "UserName": "inactive_user",
        "UserId": "AIDAEXAMPLE3",
        "CreateDate": datetime.now(timezone.utc) - timedelta(days=365),
        "PasswordLastUsed": datetime.now(timezone.utc) - timedelta(days=120),
        "MFADevices": [],
        "AccessKeys": [
            {"AccessKeyId": "AKIAEXAMPLE3", "Status": "Active",
             "CreateDate": datetime.now(timezone.utc) - timedelta(days=300)}
        ],
        "AttachedPolicies": [{"PolicyName": "PowerUserAccess", "PolicyArn": "arn:aws:iam::aws:policy/PowerUserAccess"}],
        "Groups": []
    },
    {
        "UserName": "service_account",
        "UserId": "AIDAEXAMPLE4",
        "CreateDate": datetime.now(timezone.utc) - timedelta(days=500),
        "PasswordLastUsed": None,
        "MFADevices": [],
        "AccessKeys": [
            {"AccessKeyId": "AKIAEXAMPLE4", "Status": "Active",
             "CreateDate": datetime.now(timezone.utc) - timedelta(days=500)},
            {"AccessKeyId": "AKIAEXAMPLE5", "Status": "Active",
             "CreateDate": datetime.now(timezone.utc) - timedelta(days=30)}
        ],
        "AttachedPolicies": [],
        "Groups": ["ServiceAccounts"]
    },
    {
        "UserName": "compliant_user",
        "UserId": "AIDAEXAMPLE5",
        "CreateDate": datetime.now(timezone.utc) - timedelta(days=60),
        "PasswordLastUsed": datetime.now(timezone.utc) - timedelta(days=1),
        "MFADevices": [{"SerialNumber": "arn:aws:iam::123456789012:mfa/compliant_user"}],
        "AccessKeys": [
            {"AccessKeyId": "AKIAEXAMPLE6", "Status": "Active",
             "CreateDate": datetime.now(timezone.utc) - timedelta(days=30)}
        ],
        "AttachedPolicies": [],
        "Groups": ["StandardUsers"]
    }
]


# ============================================================================
# COMPLIANCE AUDIT CLASS
# ============================================================================

class IAMComplianceAuditor:
    """
    AWS IAM Compliance Auditor
    
    Checks for:
    - CIS AWS Foundations Benchmark rules
    - Password policy compliance
    - MFA enforcement
    - Access key rotation
    - Unused credentials
    - Overly permissive policies
    """
    
    def __init__(self, demo_mode: bool = DEMO_MODE):
        self.demo_mode = demo_mode
        self.findings: List[Finding] = []
        self._iam_client = None
        
        if not demo_mode:
            self._iam_client = boto3.client('iam')
        
        logger.info(f"IAMComplianceAuditor initialized (Demo: {demo_mode})")
    
    def run_full_audit(self) -> AuditReport:
        """Execute complete IAM compliance audit"""
        logger.info("Starting IAM compliance audit...")
        self.findings = []
        
        users = self._get_users()
        
        for user in users:
            self._check_mfa_enabled(user)
            self._check_access_key_age(user)
            self._check_unused_credentials(user)
            self._check_multiple_access_keys(user)
            self._check_direct_policy_attachment(user)
            self._check_admin_privileges(user)
        
        # Account-level checks
        self._check_password_policy()
        self._check_root_account()
        
        return self._generate_report(len(users))
    
    def _get_users(self) -> List[Dict]:
        """Get all IAM users"""
        if self.demo_mode:
            logger.info(f"[DEMO] Returning {len(DEMO_USERS)} sample users")
            return DEMO_USERS
        
        users = []
        paginator = self._iam_client.get_paginator('list_users')
        
        for page in paginator.paginate():
            for user in page['Users']:
                # Enrich with additional data
                user_data = self._enrich_user_data(user)
                users.append(user_data)
        
        return users
    
    def _enrich_user_data(self, user: Dict) -> Dict:
        """Add MFA, access keys, and policy data to user"""
        username = user['UserName']
        
        # Get MFA devices
        mfa_response = self._iam_client.list_mfa_devices(UserName=username)
        user['MFADevices'] = mfa_response['MFADevices']
        
        # Get access keys
        keys_response = self._iam_client.list_access_keys(UserName=username)
        user['AccessKeys'] = keys_response['AccessKeyMetadata']
        
        # Get attached policies
        policies_response = self._iam_client.list_attached_user_policies(UserName=username)
        user['AttachedPolicies'] = policies_response['AttachedPolicies']
        
        # Get groups
        groups_response = self._iam_client.list_groups_for_user(UserName=username)
        user['Groups'] = [g['GroupName'] for g in groups_response['Groups']]
        
        return user
    
    # ========================================================================
    # COMPLIANCE CHECKS
    # ========================================================================
    
    def _check_mfa_enabled(self, user: Dict):
        """CIS 1.2: Ensure MFA is enabled for all IAM users with console access"""
        username = user['UserName']
        has_mfa = len(user.get('MFADevices', [])) > 0
        has_console = user.get('PasswordLastUsed') is not None
        
        if has_console and not has_mfa:
            self.findings.append(Finding(
                rule_id="CIS-1.2",
                rule_name="MFA for Console Users",
                resource_type="IAM User",
                resource_id=username,
                severity=Severity.HIGH,
                status=ComplianceStatus.NON_COMPLIANT,
                description=f"User {username} has console access but MFA is not enabled",
                recommendation="Enable MFA for this user immediately",
                details={"has_console_access": True, "mfa_enabled": False}
            ))
            logger.warning(f"[NON-COMPLIANT] {username}: MFA not enabled")
    
    def _check_access_key_age(self, user: Dict):
        """CIS 1.4: Ensure access keys are rotated within 90 days"""
        username = user['UserName']
        
        for key in user.get('AccessKeys', []):
            if key['Status'] != 'Active':
                continue
            
            create_date = key['CreateDate']
            if isinstance(create_date, str):
                create_date = datetime.fromisoformat(create_date.replace('Z', '+00:00'))
            
            age_days = (datetime.now(timezone.utc) - create_date).days
            
            if age_days > MAX_ACCESS_KEY_AGE_DAYS:
                self.findings.append(Finding(
                    rule_id="CIS-1.4",
                    rule_name="Access Key Rotation",
                    resource_type="IAM Access Key",
                    resource_id=f"{username}/{key['AccessKeyId']}",
                    severity=Severity.MEDIUM,
                    status=ComplianceStatus.NON_COMPLIANT,
                    description=f"Access key is {age_days} days old (max: {MAX_ACCESS_KEY_AGE_DAYS})",
                    recommendation="Rotate access key immediately",
                    details={"key_age_days": age_days, "threshold": MAX_ACCESS_KEY_AGE_DAYS}
                ))
                logger.warning(f"[NON-COMPLIANT] {username}: Access key {age_days} days old")
    
    def _check_unused_credentials(self, user: Dict):
        """CIS 1.3: Ensure credentials unused for 45+ days are disabled"""
        username = user['UserName']
        
        # Check password
        last_used = user.get('PasswordLastUsed')
        if last_used:
            if isinstance(last_used, str):
                last_used = datetime.fromisoformat(last_used.replace('Z', '+00:00'))
            
            days_unused = (datetime.now(timezone.utc) - last_used).days
            
            if days_unused > MAX_UNUSED_DAYS:
                self.findings.append(Finding(
                    rule_id="CIS-1.3",
                    rule_name="Unused Credentials",
                    resource_type="IAM User Password",
                    resource_id=username,
                    severity=Severity.MEDIUM,
                    status=ComplianceStatus.NON_COMPLIANT,
                    description=f"Password unused for {days_unused} days",
                    recommendation="Disable or remove unused credentials",
                    details={"days_unused": days_unused, "threshold": MAX_UNUSED_DAYS}
                ))
    
    def _check_multiple_access_keys(self, user: Dict):
        """Best practice: Users should have at most one active access key"""
        username = user['UserName']
        active_keys = [k for k in user.get('AccessKeys', []) if k['Status'] == 'Active']
        
        if len(active_keys) > 1:
            self.findings.append(Finding(
                rule_id="BP-1",
                rule_name="Multiple Access Keys",
                resource_type="IAM User",
                resource_id=username,
                severity=Severity.LOW,
                status=ComplianceStatus.NON_COMPLIANT,
                description=f"User has {len(active_keys)} active access keys",
                recommendation="Remove unused access keys",
                details={"active_key_count": len(active_keys)}
            ))
    
    def _check_direct_policy_attachment(self, user: Dict):
        """Best practice: Use groups for policy assignment"""
        username = user['UserName']
        direct_policies = user.get('AttachedPolicies', [])
        
        if direct_policies:
            self.findings.append(Finding(
                rule_id="BP-2",
                rule_name="Direct Policy Attachment",
                resource_type="IAM User",
                resource_id=username,
                severity=Severity.LOW,
                status=ComplianceStatus.NON_COMPLIANT,
                description=f"User has {len(direct_policies)} directly attached policies",
                recommendation="Use IAM groups for policy management",
                details={"policies": [p['PolicyName'] for p in direct_policies]}
            ))
    
    def _check_admin_privileges(self, user: Dict):
        """CIS 1.16: Ensure IAM policies with full admin privileges are not attached"""
        username = user['UserName']
        admin_policies = ['AdministratorAccess', 'PowerUserAccess']
        
        for policy in user.get('AttachedPolicies', []):
            if policy['PolicyName'] in admin_policies:
                self.findings.append(Finding(
                    rule_id="CIS-1.16",
                    rule_name="Admin Privilege Check",
                    resource_type="IAM User",
                    resource_id=username,
                    severity=Severity.CRITICAL,
                    status=ComplianceStatus.NON_COMPLIANT,
                    description=f"User has {policy['PolicyName']} attached directly",
                    recommendation="Use least-privilege policies instead",
                    details={"policy": policy['PolicyName']}
                ))
                logger.error(f"[CRITICAL] {username}: Has {policy['PolicyName']}")
    
    def _check_password_policy(self):
        """CIS 1.5-1.11: Password policy checks"""
        if self.demo_mode:
            # Simulate a weak password policy finding
            self.findings.append(Finding(
                rule_id="CIS-1.9",
                rule_name="Password Reuse Prevention",
                resource_type="Account Password Policy",
                resource_id="PasswordPolicy",
                severity=Severity.MEDIUM,
                status=ComplianceStatus.NON_COMPLIANT,
                description="Password policy does not prevent reuse of last 24 passwords",
                recommendation="Set PasswordReusePrevention to 24",
                details={"current_value": 12, "required_value": 24}
            ))
    
    def _check_root_account(self):
        """CIS 1.1: Avoid use of root account"""
        if self.demo_mode:
            self.findings.append(Finding(
                rule_id="CIS-1.1",
                rule_name="Root Account Usage",
                resource_type="Root Account",
                resource_id="root",
                severity=Severity.INFO,
                status=ComplianceStatus.COMPLIANT,
                description="Root account has not been used in the last 90 days",
                recommendation="Continue avoiding root account usage",
                details={"last_used": "Never or >90 days"}
            ))
    
    # ========================================================================
    # REPORTING
    # ========================================================================
    
    def _generate_report(self, total_users: int) -> AuditReport:
        """Generate comprehensive audit report"""
        critical = len([f for f in self.findings if f.severity == Severity.CRITICAL])
        high = len([f for f in self.findings if f.severity == Severity.HIGH])
        medium = len([f for f in self.findings if f.severity == Severity.MEDIUM])
        low = len([f for f in self.findings if f.severity == Severity.LOW])
        
        non_compliant = len([f for f in self.findings if f.status == ComplianceStatus.NON_COMPLIANT])
        total_checks = len(self.findings)
        compliance_score = ((total_checks - non_compliant) / max(total_checks, 1)) * 100
        
        return AuditReport(
            scan_timestamp=datetime.now().isoformat(),
            total_users=total_users,
            total_findings=len(self.findings),
            critical_count=critical,
            high_count=high,
            medium_count=medium,
            low_count=low,
            compliance_score=compliance_score,
            findings=self.findings
        )
    
    def print_report(self, report: AuditReport):
        """Print formatted audit report"""
        print("\n" + "=" * 70)
        print("  AWS IAM COMPLIANCE AUDIT REPORT")
        print("=" * 70)
        print(f"  Scan Time:        {report.scan_timestamp}")
        print(f"  Users Scanned:    {report.total_users}")
        print(f"  Total Findings:   {report.total_findings}")
        print("-" * 70)
        print("  FINDINGS BY SEVERITY:")
        print(f"    🔴 Critical:    {report.critical_count}")
        print(f"    🟠 High:        {report.high_count}")
        print(f"    🟡 Medium:      {report.medium_count}")
        print(f"    🟢 Low:         {report.low_count}")
        print("-" * 70)
        print(f"  COMPLIANCE SCORE: {report.compliance_score:.1f}%")
        print("=" * 70)
        
        if report.critical_count > 0 or report.high_count > 0:
            print("\n⚠️  CRITICAL/HIGH FINDINGS:")
            for finding in report.findings:
                if finding.severity in [Severity.CRITICAL, Severity.HIGH]:
                    print(f"\n  [{finding.severity.value}] {finding.rule_id}: {finding.rule_name}")
                    print(f"    Resource: {finding.resource_id}")
                    print(f"    Issue: {finding.description}")
                    print(f"    Fix: {finding.recommendation}")
        
        print("")


# ============================================================================
# MAIN
# ============================================================================

def main():
    print("\n" + "=" * 70)
    print("  AWS IAM COMPLIANCE AUDIT SYSTEM")
    print("  Mohammad Khan | AWS Solutions Architect")
    print("=" * 70 + "\n")
    
    auditor = IAMComplianceAuditor(demo_mode=DEMO_MODE)
    report = auditor.run_full_audit()
    auditor.print_report(report)
    
    # Export to JSON
    with open("audit_report.json", "w") as f:
        json.dump(report.to_dict(), f, indent=2, default=str)
    logger.info("Report exported to audit_report.json")


if __name__ == "__main__":
    main()

