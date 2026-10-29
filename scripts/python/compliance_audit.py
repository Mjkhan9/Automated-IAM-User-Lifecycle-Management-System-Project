"""
Microsoft Entra ID Compliance Audit System
Author: Mohammad Khan
Date: December 2025

Automated compliance scanning for Microsoft Entra ID:
- App credential (client secret) age analysis
- MFA enforcement verification
- Inactive account detection
- Directory role assignment review
- CIS Microsoft 365 Foundations Benchmark alignment
"""

import json
import logging
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
from enum import Enum

import requests
from azure.identity import DefaultAzureCredential

# ============================================================================
# CONFIGURATION
# ============================================================================

DEMO_MODE = True

# Microsoft Graph
GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0"
GRAPH_SCOPE = "https://graph.microsoft.com/.default"

# Compliance thresholds
MAX_PASSWORD_AGE_DAYS = 90
MAX_ACCESS_KEY_AGE_DAYS = 90  # app client secret age
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
        "UserId": "11111111-0000-0000-0000-000000000001",
        "CreateDate": datetime.now(timezone.utc) - timedelta(days=400),
        "LastSignIn": datetime.now(timezone.utc) - timedelta(days=5),
        "MFAMethods": [],
        "AppCredentials": [
            {"KeyId": "secret-admin-1", "Status": "Active",
             "CreateDate": datetime.now(timezone.utc) - timedelta(days=200)}
        ],
        "DirectoryRoles": [{"RoleName": "Global Administrator", "RoleId": "62e90394-69f5-4237-9190-012177145e10"}],
        "Groups": ["Administrators"]
    },
    {
        "UserName": "developer_jane",
        "UserId": "11111111-0000-0000-0000-000000000002",
        "CreateDate": datetime.now(timezone.utc) - timedelta(days=180),
        "LastSignIn": datetime.now(timezone.utc) - timedelta(days=2),
        "MFAMethods": [{"Type": "microsoftAuthenticatorAuthenticationMethod"}],
        "AppCredentials": [
            {"KeyId": "secret-jane-1", "Status": "Active",
             "CreateDate": datetime.now(timezone.utc) - timedelta(days=60)}
        ],
        "DirectoryRoles": [],
        "Groups": ["Developers"]
    },
    {
        "UserName": "inactive_user",
        "UserId": "11111111-0000-0000-0000-000000000003",
        "CreateDate": datetime.now(timezone.utc) - timedelta(days=365),
        "LastSignIn": datetime.now(timezone.utc) - timedelta(days=120),
        "MFAMethods": [],
        "AppCredentials": [
            {"KeyId": "secret-inactive-1", "Status": "Active",
             "CreateDate": datetime.now(timezone.utc) - timedelta(days=300)}
        ],
        "DirectoryRoles": [{"RoleName": "Privileged Role Administrator", "RoleId": "e8611ab8-c189-46e8-94e1-60213ab1f814"}],
        "Groups": []
    },
    {
        "UserName": "service_account",
        "UserId": "11111111-0000-0000-0000-000000000004",
        "CreateDate": datetime.now(timezone.utc) - timedelta(days=500),
        "LastSignIn": None,
        "MFAMethods": [],
        "AppCredentials": [
            {"KeyId": "secret-svc-1", "Status": "Active",
             "CreateDate": datetime.now(timezone.utc) - timedelta(days=500)},
            {"KeyId": "secret-svc-2", "Status": "Active",
             "CreateDate": datetime.now(timezone.utc) - timedelta(days=30)}
        ],
        "DirectoryRoles": [],
        "Groups": ["ServiceAccounts"]
    },
    {
        "UserName": "compliant_user",
        "UserId": "11111111-0000-0000-0000-000000000005",
        "CreateDate": datetime.now(timezone.utc) - timedelta(days=60),
        "LastSignIn": datetime.now(timezone.utc) - timedelta(days=1),
        "MFAMethods": [{"Type": "fido2AuthenticationMethod"}],
        "AppCredentials": [
            {"KeyId": "secret-compliant-1", "Status": "Active",
             "CreateDate": datetime.now(timezone.utc) - timedelta(days=30)}
        ],
        "DirectoryRoles": [],
        "Groups": ["StandardUsers"]
    }
]


# ============================================================================
# COMPLIANCE AUDIT CLASS
# ============================================================================

class IAMComplianceAuditor:
    """
    Microsoft Entra ID Compliance Auditor

    Checks for:
    - CIS Microsoft 365 Foundations Benchmark v5.0.0 rules
    - Password policy compliance
    - MFA enforcement
    - App credential rotation
    - Inactive accounts
    - Standing privileged role assignments
    """

    def __init__(self, demo_mode: bool = DEMO_MODE):
        self.demo_mode = demo_mode
        self.findings: List[Finding] = []
        self._iam_client = None
        self._credential = None

        if not demo_mode:
            self._credential = DefaultAzureCredential()
            self._iam_client = requests.Session()

        logger.info(f"IAMComplianceAuditor initialized (Demo: {demo_mode})")

    def _graph_get(self, path: str) -> List[Dict]:
        """GET a Microsoft Graph collection, following @odata.nextLink pages"""
        token = self._credential.get_token(GRAPH_SCOPE).token
        url = f"{GRAPH_BASE_URL}{path}"
        items = []
        while url:
            response = self._iam_client.get(url, headers={"Authorization": f"Bearer {token}"}, timeout=30)
            response.raise_for_status()
            page = response.json()
            items.extend(page.get("value", []))
            url = page.get("@odata.nextLink")
        return items

    def run_full_audit(self) -> AuditReport:
        """Execute complete Entra ID compliance audit"""
        logger.info("Starting Entra ID compliance audit...")
        self.findings = []

        users = self._get_users()

        for user in users:
            self._check_mfa_enabled(user)
            self._check_access_key_age(user)
            self._check_unused_credentials(user)
            self._check_multiple_access_keys(user)
            self._check_direct_policy_attachment(user)
            self._check_admin_privileges(user)

        # Tenant-level checks
        self._check_password_policy()
        self._check_root_account()

        return self._generate_report(len(users))

    def _get_users(self) -> List[Dict]:
        """Get all Entra ID users"""
        if self.demo_mode:
            logger.info(f"[DEMO] Returning {len(DEMO_USERS)} sample users")
            return DEMO_USERS

        users = []
        for user in self._graph_get("/users?$select=id,userPrincipalName,createdDateTime,signInActivity"):
            # Enrich with additional data
            user_data = self._enrich_user_data(user)
            users.append(user_data)

        return users

    @staticmethod
    def _parse_time(value: Optional[str]) -> Optional[datetime]:
        if not value:
            return None
        return datetime.fromisoformat(value.replace('Z', '+00:00'))

    def _enrich_user_data(self, user: Dict) -> Dict:
        """Add MFA methods, app credentials, directory roles and groups to user"""
        user_id = user['id']
        now = datetime.now(timezone.utc)

        # Get registered authentication methods (password alone is not MFA)
        methods = self._graph_get(f"/users/{user_id}/authentication/methods")
        mfa_methods = [
            {"Type": m.get("@odata.type", "").split(".")[-1]}
            for m in methods
            if not m.get("@odata.type", "").endswith("passwordAuthenticationMethod")
        ]

        # Get client secrets on app registrations the user owns
        apps = self._graph_get(f"/users/{user_id}/ownedObjects/microsoft.graph.application?$select=passwordCredentials")
        app_credentials = []
        for app in apps:
            for cred in app.get("passwordCredentials", []):
                end = self._parse_time(cred.get("endDateTime"))
                app_credentials.append({
                    "KeyId": cred.get("keyId"),
                    "Status": "Active" if end is None or end > now else "Expired",
                    "CreateDate": self._parse_time(cred.get("startDateTime"))
                })

        # Get directory roles assigned directly to the user
        assignments = self._graph_get(
            f"/roleManagement/directory/roleAssignments?$filter=principalId eq '{user_id}'&$expand=roleDefinition"
        )
        directory_roles = [
            {"RoleName": a["roleDefinition"]["displayName"], "RoleId": a["roleDefinitionId"]}
            for a in assignments
        ]

        # Get groups
        groups = self._graph_get(f"/users/{user_id}/memberOf/microsoft.graph.group?$select=displayName")

        return {
            "UserName": user['userPrincipalName'],
            "UserId": user_id,
            "CreateDate": self._parse_time(user.get('createdDateTime')),
            "LastSignIn": self._parse_time((user.get('signInActivity') or {}).get('lastSignInDateTime')),
            "MFAMethods": mfa_methods,
            "AppCredentials": app_credentials,
            "DirectoryRoles": directory_roles,
            "Groups": [g['displayName'] for g in groups]
        }

    # ========================================================================
    # COMPLIANCE CHECKS
    # ========================================================================

    def _check_mfa_enabled(self, user: Dict):
        """CIS M365 5.2.2.2: Ensure multifactor authentication is enabled for all users"""
        username = user['UserName']
        has_mfa = len(user.get('MFAMethods', [])) > 0
        has_sign_in = user.get('LastSignIn') is not None

        if has_sign_in and not has_mfa:
            self.findings.append(Finding(
                rule_id="CIS-5.2.2.2",
                rule_name="MFA for All Users",
                resource_type="Entra User",
                resource_id=username,
                severity=Severity.HIGH,
                status=ComplianceStatus.NON_COMPLIANT,
                description=f"User {username} signs in interactively but has no MFA method registered",
                recommendation="Require MFA registration for this user immediately",
                details={"has_sign_in_activity": True, "mfa_registered": False}
            ))
            logger.warning(f"[NON-COMPLIANT] {username}: MFA not registered")

    def _check_access_key_age(self, user: Dict):
        """Best practice: Rotate app client secrets within 90 days"""
        username = user['UserName']

        for key in user.get('AppCredentials', []):
            if key['Status'] != 'Active':
                continue

            create_date = key['CreateDate']
            if isinstance(create_date, str):
                create_date = datetime.fromisoformat(create_date.replace('Z', '+00:00'))

            age_days = (datetime.now(timezone.utc) - create_date).days

            if age_days > MAX_ACCESS_KEY_AGE_DAYS:
                self.findings.append(Finding(
                    rule_id="BP-3",
                    rule_name="App Credential Rotation",
                    resource_type="App Client Secret",
                    resource_id=f"{username}/{key['KeyId']}",
                    severity=Severity.MEDIUM,
                    status=ComplianceStatus.NON_COMPLIANT,
                    description=f"Client secret is {age_days} days old (max: {MAX_ACCESS_KEY_AGE_DAYS})",
                    recommendation="Rotate the client secret, or move the app to a certificate or managed identity",
                    details={"key_age_days": age_days, "threshold": MAX_ACCESS_KEY_AGE_DAYS}
                ))
                logger.warning(f"[NON-COMPLIANT] {username}: Client secret {age_days} days old")

    def _check_unused_credentials(self, user: Dict):
        """Best practice: Disable accounts with no sign-in for 45+ days"""
        username = user['UserName']

        # Check last sign-in
        last_used = user.get('LastSignIn')
        if last_used:
            if isinstance(last_used, str):
                last_used = datetime.fromisoformat(last_used.replace('Z', '+00:00'))

            days_unused = (datetime.now(timezone.utc) - last_used).days

            if days_unused > MAX_UNUSED_DAYS:
                self.findings.append(Finding(
                    rule_id="BP-4",
                    rule_name="Inactive Account",
                    resource_type="Entra User Sign-in",
                    resource_id=username,
                    severity=Severity.MEDIUM,
                    status=ComplianceStatus.NON_COMPLIANT,
                    description=f"No sign-in for {days_unused} days",
                    recommendation="Disable the account or confirm it through an access review",
                    details={"days_unused": days_unused, "threshold": MAX_UNUSED_DAYS}
                ))

    def _check_multiple_access_keys(self, user: Dict):
        """Best practice: Apps should have at most one active client secret"""
        username = user['UserName']
        active_keys = [k for k in user.get('AppCredentials', []) if k['Status'] == 'Active']

        if len(active_keys) > 1:
            self.findings.append(Finding(
                rule_id="BP-1",
                rule_name="Multiple App Credentials",
                resource_type="Entra User",
                resource_id=username,
                severity=Severity.LOW,
                status=ComplianceStatus.NON_COMPLIANT,
                description=f"User owns {len(active_keys)} active client secrets",
                recommendation="Remove unused client secrets",
                details={"active_key_count": len(active_keys)}
            ))

    def _check_direct_policy_attachment(self, user: Dict):
        """Best practice: Use role-assignable groups for directory role assignment"""
        username = user['UserName']
        direct_roles = user.get('DirectoryRoles', [])

        if direct_roles:
            self.findings.append(Finding(
                rule_id="BP-2",
                rule_name="Direct Role Assignment",
                resource_type="Entra User",
                resource_id=username,
                severity=Severity.LOW,
                status=ComplianceStatus.NON_COMPLIANT,
                description=f"User has {len(direct_roles)} directly assigned directory roles",
                recommendation="Assign directory roles through role-assignable security groups",
                details={"roles": [r['RoleName'] for r in direct_roles]}
            ))

    def _check_admin_privileges(self, user: Dict):
        """Best practice: No standing assignment of the most privileged directory roles"""
        username = user['UserName']
        admin_roles = ['Global Administrator', 'Privileged Role Administrator']

        for role in user.get('DirectoryRoles', []):
            if role['RoleName'] in admin_roles:
                self.findings.append(Finding(
                    rule_id="BP-5",
                    rule_name="Standing Privileged Role",
                    resource_type="Entra User",
                    resource_id=username,
                    severity=Severity.CRITICAL,
                    status=ComplianceStatus.NON_COMPLIANT,
                    description=f"User has {role['RoleName']} assigned directly",
                    recommendation="Use least-privilege roles, with just-in-time elevation for admin tasks",
                    details={"role": role['RoleName']}
                ))
                logger.error(f"[CRITICAL] {username}: Has {role['RoleName']}")

    def _check_password_policy(self):
        """CIS M365 1.3.1: Password expiration policy"""
        if self.demo_mode:
            # Simulate a password expiration policy finding
            self.findings.append(Finding(
                rule_id="CIS-1.3.1",
                rule_name="Password Expiration Policy",
                resource_type="Tenant Password Policy",
                resource_id="PasswordPolicy",
                severity=Severity.MEDIUM,
                status=ComplianceStatus.NON_COMPLIANT,
                description="Passwords are set to expire every 90 days",
                recommendation="Set passwords to never expire (recommended), with MFA and password protection",
                details={"current_value": 90, "required_value": "never expire"}
            ))

    def _check_root_account(self):
        """CIS M365 1.1.2: Ensure two emergency access accounts have been defined"""
        if self.demo_mode:
            self.findings.append(Finding(
                rule_id="CIS-1.1.2",
                rule_name="Emergency Access Accounts",
                resource_type="Emergency Access Account",
                resource_id="break-glass",
                severity=Severity.INFO,
                status=ComplianceStatus.COMPLIANT,
                description="Two emergency access accounts are defined and unused in the last 90 days",
                recommendation="Keep monitoring emergency access sign-ins",
                details={"accounts": 2, "last_used": "Never or >90 days"}
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
        print("  MICROSOFT ENTRA ID COMPLIANCE AUDIT REPORT")
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
    print("  MICROSOFT ENTRA ID COMPLIANCE AUDIT SYSTEM")
    print("  Mohammad Khan | Identity & Access Management")
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

