"""
Unit Tests for Compliance Audit System
Author: Mohammad Khan

Tests for the IAM compliance auditing system including:
- Finding generation
- Compliance checks
- Report generation
"""

import pytest
from unittest.mock import Mock, patch
from datetime import datetime, timedelta, timezone
import sys
import os

# Add scripts directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'scripts', 'python'))

from compliance_audit import (
    IAMComplianceAuditor,
    Finding,
    AuditReport,
    Severity,
    ComplianceStatus,
    DEMO_USERS,
    MAX_PASSWORD_AGE_DAYS,
    MAX_ACCESS_KEY_AGE_DAYS,
    MAX_UNUSED_DAYS
)


class TestSeverityEnum:
    """Tests for Severity enumeration"""

    def test_severity_values(self):
        """Test all severity levels exist"""
        assert Severity.CRITICAL.value == "CRITICAL"
        assert Severity.HIGH.value == "HIGH"
        assert Severity.MEDIUM.value == "MEDIUM"
        assert Severity.LOW.value == "LOW"
        assert Severity.INFO.value == "INFO"


class TestComplianceStatusEnum:
    """Tests for ComplianceStatus enumeration"""

    def test_compliance_status_values(self):
        """Test all compliance statuses exist"""
        assert ComplianceStatus.COMPLIANT.value == "COMPLIANT"
        assert ComplianceStatus.NON_COMPLIANT.value == "NON_COMPLIANT"
        assert ComplianceStatus.NOT_APPLICABLE.value == "N/A"


class TestFinding:
    """Tests for Finding dataclass"""

    def test_finding_creation(self):
        """Test creating a finding"""
        finding = Finding(
            rule_id="CIS-1.2",
            rule_name="MFA for Console Users",
            resource_type="IAM User",
            resource_id="testuser",
            severity=Severity.HIGH,
            status=ComplianceStatus.NON_COMPLIANT,
            description="User has console access but MFA is not enabled",
            recommendation="Enable MFA for this user immediately"
        )

        assert finding.rule_id == "CIS-1.2"
        assert finding.severity == Severity.HIGH
        assert finding.status == ComplianceStatus.NON_COMPLIANT

    def test_finding_to_dict(self):
        """Test finding serialization to dict"""
        finding = Finding(
            rule_id="CIS-1.2",
            rule_name="MFA for Console Users",
            resource_type="IAM User",
            resource_id="testuser",
            severity=Severity.HIGH,
            status=ComplianceStatus.NON_COMPLIANT,
            description="Test description",
            recommendation="Test recommendation",
            details={"test_key": "test_value"}
        )

        result = finding.to_dict()

        assert result["rule_id"] == "CIS-1.2"
        assert result["severity"] == "HIGH"
        assert result["status"] == "NON_COMPLIANT"
        assert result["details"]["test_key"] == "test_value"


class TestAuditReport:
    """Tests for AuditReport dataclass"""

    def test_audit_report_creation(self):
        """Test creating an audit report"""
        finding = Finding(
            rule_id="CIS-1.2",
            rule_name="Test",
            resource_type="IAM User",
            resource_id="testuser",
            severity=Severity.HIGH,
            status=ComplianceStatus.NON_COMPLIANT,
            description="Test",
            recommendation="Test"
        )

        report = AuditReport(
            scan_timestamp=datetime.now().isoformat(),
            total_users=5,
            total_findings=1,
            critical_count=0,
            high_count=1,
            medium_count=0,
            low_count=0,
            compliance_score=80.0,
            findings=[finding]
        )

        assert report.total_users == 5
        assert report.high_count == 1
        assert report.compliance_score == 80.0

    def test_audit_report_to_dict(self):
        """Test audit report serialization"""
        report = AuditReport(
            scan_timestamp="2024-01-01T00:00:00",
            total_users=10,
            total_findings=5,
            critical_count=1,
            high_count=2,
            medium_count=1,
            low_count=1,
            compliance_score=50.0,
            findings=[]
        )

        result = report.to_dict()

        assert result["total_users"] == 10
        assert result["findings_by_severity"]["critical"] == 1
        assert result["findings_by_severity"]["high"] == 2
        assert result["compliance_score"] == "50.0%"


class TestIAMComplianceAuditor:
    """Tests for IAMComplianceAuditor class"""

    def test_demo_mode_initialization(self):
        """Test auditor initializes in demo mode"""
        auditor = IAMComplianceAuditor(demo_mode=True)
        assert auditor.demo_mode is True
        assert auditor._iam_client is None

    def test_get_users_returns_demo_data(self):
        """Test that demo mode returns demo users"""
        auditor = IAMComplianceAuditor(demo_mode=True)
        users = auditor._get_users()

        assert len(users) == len(DEMO_USERS)
        assert users[0]["UserName"] == "admin_user"

    def test_run_full_audit_returns_report(self):
        """Test that full audit returns a report"""
        auditor = IAMComplianceAuditor(demo_mode=True)
        report = auditor.run_full_audit()

        assert isinstance(report, AuditReport)
        assert report.total_users == len(DEMO_USERS)
        assert report.total_findings > 0

    def test_mfa_check_finds_violations(self):
        """Test that MFA check identifies users without MFA"""
        auditor = IAMComplianceAuditor(demo_mode=True)
        auditor.findings = []

        # User with console access but no MFA
        user = {
            "UserName": "no_mfa_user",
            "PasswordLastUsed": datetime.now(timezone.utc),
            "MFADevices": []
        }

        auditor._check_mfa_enabled(user)

        # Should have one finding
        assert len(auditor.findings) == 1
        assert auditor.findings[0].rule_id == "CIS-1.2"
        assert auditor.findings[0].severity == Severity.HIGH

    def test_mfa_check_compliant_user(self):
        """Test that MFA check passes for compliant user"""
        auditor = IAMComplianceAuditor(demo_mode=True)
        auditor.findings = []

        # User with MFA enabled
        user = {
            "UserName": "mfa_user",
            "PasswordLastUsed": datetime.now(timezone.utc),
            "MFADevices": [{"SerialNumber": "arn:aws:iam::123:mfa/mfa_user"}]
        }

        auditor._check_mfa_enabled(user)

        # Should have no findings
        assert len(auditor.findings) == 0

    def test_access_key_age_check(self):
        """Test access key age compliance check"""
        auditor = IAMComplianceAuditor(demo_mode=True)
        auditor.findings = []

        # User with old access key
        user = {
            "UserName": "old_key_user",
            "AccessKeys": [{
                "AccessKeyId": "AKIAEXAMPLE",
                "Status": "Active",
                "CreateDate": datetime.now(timezone.utc) - timedelta(days=120)
            }]
        }

        auditor._check_access_key_age(user)

        # Should have one finding
        assert len(auditor.findings) == 1
        assert auditor.findings[0].rule_id == "CIS-1.4"

    def test_access_key_age_compliant(self):
        """Test access key age passes for recent key"""
        auditor = IAMComplianceAuditor(demo_mode=True)
        auditor.findings = []

        # User with recent access key
        user = {
            "UserName": "new_key_user",
            "AccessKeys": [{
                "AccessKeyId": "AKIAEXAMPLE",
                "Status": "Active",
                "CreateDate": datetime.now(timezone.utc) - timedelta(days=30)
            }]
        }

        auditor._check_access_key_age(user)

        # Should have no findings
        assert len(auditor.findings) == 0

    def test_unused_credentials_check(self):
        """Test unused credentials compliance check"""
        auditor = IAMComplianceAuditor(demo_mode=True)
        auditor.findings = []

        # User who hasn't logged in for a while
        user = {
            "UserName": "inactive_user",
            "PasswordLastUsed": datetime.now(timezone.utc) - timedelta(days=100)
        }

        auditor._check_unused_credentials(user)

        # Should have one finding
        assert len(auditor.findings) == 1
        assert auditor.findings[0].rule_id == "CIS-1.3"

    def test_multiple_access_keys_check(self):
        """Test multiple access keys finding"""
        auditor = IAMComplianceAuditor(demo_mode=True)
        auditor.findings = []

        # User with multiple active keys
        user = {
            "UserName": "multi_key_user",
            "AccessKeys": [
                {"AccessKeyId": "AKIA1", "Status": "Active", "CreateDate": datetime.now(timezone.utc)},
                {"AccessKeyId": "AKIA2", "Status": "Active", "CreateDate": datetime.now(timezone.utc)}
            ]
        }

        auditor._check_multiple_access_keys(user)

        # Should have one finding
        assert len(auditor.findings) == 1
        assert auditor.findings[0].rule_id == "BP-1"
        assert auditor.findings[0].severity == Severity.LOW

    def test_direct_policy_attachment_check(self):
        """Test direct policy attachment finding"""
        auditor = IAMComplianceAuditor(demo_mode=True)
        auditor.findings = []

        # User with directly attached policies
        user = {
            "UserName": "direct_policy_user",
            "AttachedPolicies": [
                {"PolicyName": "MyPolicy", "PolicyArn": "arn:aws:iam::123:policy/MyPolicy"}
            ]
        }

        auditor._check_direct_policy_attachment(user)

        # Should have one finding
        assert len(auditor.findings) == 1
        assert auditor.findings[0].rule_id == "BP-2"

    def test_admin_privileges_check(self):
        """Test admin privileges check finds violations"""
        auditor = IAMComplianceAuditor(demo_mode=True)
        auditor.findings = []

        # User with admin policy
        user = {
            "UserName": "admin_user",
            "AttachedPolicies": [
                {"PolicyName": "AdministratorAccess", "PolicyArn": "arn:aws:iam::aws:policy/AdministratorAccess"}
            ]
        }

        auditor._check_admin_privileges(user)

        # Should have one finding
        assert len(auditor.findings) == 1
        assert auditor.findings[0].rule_id == "CIS-1.16"
        assert auditor.findings[0].severity == Severity.CRITICAL

    def test_compliance_score_calculation(self):
        """Test compliance score is calculated correctly"""
        auditor = IAMComplianceAuditor(demo_mode=True)

        # Create some findings
        auditor.findings = [
            Finding(
                rule_id="TEST-1",
                rule_name="Test",
                resource_type="User",
                resource_id="user1",
                severity=Severity.HIGH,
                status=ComplianceStatus.NON_COMPLIANT,
                description="Test",
                recommendation="Test"
            ),
            Finding(
                rule_id="TEST-2",
                rule_name="Test",
                resource_type="User",
                resource_id="user2",
                severity=Severity.INFO,
                status=ComplianceStatus.COMPLIANT,
                description="Test",
                recommendation="Test"
            )
        ]

        report = auditor._generate_report(5)

        # 1 compliant out of 2 = 50%
        assert report.compliance_score == 50.0


class TestDemoUsers:
    """Tests for demo user data"""

    def test_demo_users_exist(self):
        """Test that demo users are defined"""
        assert len(DEMO_USERS) > 0

    def test_demo_users_have_required_fields(self):
        """Test that demo users have all required fields"""
        required_fields = [
            "UserName", "UserId", "CreateDate", "PasswordLastUsed",
            "MFADevices", "AccessKeys", "AttachedPolicies", "Groups"
        ]

        for user in DEMO_USERS:
            for field in required_fields:
                assert field in user, f"User missing field: {field}"

    def test_demo_users_have_variety(self):
        """Test that demo users represent different compliance states"""
        mfa_enabled = sum(1 for u in DEMO_USERS if len(u.get("MFADevices", [])) > 0)
        mfa_disabled = sum(1 for u in DEMO_USERS if len(u.get("MFADevices", [])) == 0)

        # Should have both MFA enabled and disabled users for testing
        assert mfa_enabled > 0
        assert mfa_disabled > 0


class TestComplianceThresholds:
    """Tests for compliance threshold configuration"""

    def test_password_age_threshold(self):
        """Test password age threshold is set"""
        assert MAX_PASSWORD_AGE_DAYS == 90

    def test_access_key_age_threshold(self):
        """Test access key age threshold is set"""
        assert MAX_ACCESS_KEY_AGE_DAYS == 90

    def test_unused_days_threshold(self):
        """Test unused days threshold is set"""
        assert MAX_UNUSED_DAYS == 45


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

