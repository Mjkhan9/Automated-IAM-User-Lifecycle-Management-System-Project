"""
Unit Tests for IAM Provisioner
Author: Mohammad Khan

Tests for the IAM user provisioning system including:
- UserRequest validation
- Password generation
- Provisioning workflows
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime
import sys
import os

# Add scripts directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'scripts', 'python'))

from iam_provisioner import (
    IAMProvisioner,
    UserRequest,
    ProvisioningResult,
    DEPARTMENT_GROUPS,
    ROLE_POLICIES,
    PASSWORD_LENGTH
)


class TestUserRequest:
    """Tests for UserRequest dataclass validation"""

    def test_valid_user_request(self):
        """Test that valid user request passes validation"""
        request = UserRequest(
            username="jsmith",
            email="jsmith@company.com",
            department="Engineering",
            role="Developer",
            first_name="John",
            last_name="Smith"
        )
        assert request.validate() is True

    def test_invalid_email_no_at_symbol(self):
        """Test that email without @ fails validation"""
        request = UserRequest(
            username="jsmith",
            email="invalid-email",
            department="Engineering",
            role="Developer",
            first_name="John",
            last_name="Smith"
        )
        assert request.validate() is False

    def test_username_too_short(self):
        """Test that username < 3 characters fails validation"""
        request = UserRequest(
            username="js",
            email="jsmith@company.com",
            department="Engineering",
            role="Developer",
            first_name="John",
            last_name="Smith"
        )
        assert request.validate() is False

    def test_username_too_long(self):
        """Test that username > 64 characters fails validation"""
        request = UserRequest(
            username="a" * 65,
            email="test@company.com",
            department="IT",
            role="Developer",
            first_name="Test",
            last_name="User"
        )
        assert request.validate() is False

    def test_missing_required_fields(self):
        """Test that missing required fields fail validation"""
        request = UserRequest(
            username="jsmith",
            email="jsmith@company.com",
            department="",  # Empty department
            role="Developer",
            first_name="John",
            last_name="Smith"
        )
        assert request.validate() is False

    def test_display_name_property(self):
        """Test that display_name property returns correct format"""
        request = UserRequest(
            username="jsmith",
            email="jsmith@company.com",
            department="Engineering",
            role="Developer",
            first_name="John",
            last_name="Smith"
        )
        assert request.display_name == "John Smith"

    def test_optional_manager_field(self):
        """Test that manager field is optional"""
        request = UserRequest(
            username="jsmith",
            email="jsmith@company.com",
            department="Engineering",
            role="Developer",
            first_name="John",
            last_name="Smith",
            manager="mwilliams"
        )
        assert request.validate() is True
        assert request.manager == "mwilliams"


class TestProvisioningResult:
    """Tests for ProvisioningResult dataclass"""

    def test_result_auto_timestamp(self):
        """Test that timestamp is automatically set"""
        result = ProvisioningResult(
            username="jsmith",
            success=True,
            message="User provisioned successfully",
            groups_assigned=["IT-Users"],
            policies_attached=[]
        )
        assert result.timestamp is not None

    def test_result_with_credentials_location(self):
        """Test result with credentials location"""
        result = ProvisioningResult(
            username="jsmith",
            success=True,
            message="User provisioned successfully",
            groups_assigned=["IT-Users"],
            policies_attached=[],
            credentials_location="secretsmanager:iam-credentials/IT/jsmith"
        )
        assert result.credentials_location == "secretsmanager:iam-credentials/IT/jsmith"

    def test_failed_result(self):
        """Test failed provisioning result"""
        result = ProvisioningResult(
            username="jsmith",
            success=False,
            message="User already exists",
            groups_assigned=[],
            policies_attached=[]
        )
        assert result.success is False
        assert "already exists" in result.message


class TestIAMProvisioner:
    """Tests for IAMProvisioner class"""

    def test_demo_mode_initialization(self):
        """Test that demo mode doesn't initialize AWS clients"""
        provisioner = IAMProvisioner(demo_mode=True)
        assert provisioner.demo_mode is True
        assert provisioner._iam_client is None
        assert provisioner._s3_client is None
        assert provisioner._sns_client is None

    def test_password_generation_length(self):
        """Test that generated password meets length requirement"""
        provisioner = IAMProvisioner(demo_mode=True)
        password = provisioner._generate_password()
        assert len(password) == PASSWORD_LENGTH

    def test_password_generation_has_uppercase(self):
        """Test that generated password contains uppercase letter"""
        provisioner = IAMProvisioner(demo_mode=True)
        password = provisioner._generate_password()
        assert any(c.isupper() for c in password), "Password must contain uppercase"

    def test_password_generation_has_lowercase(self):
        """Test that generated password contains lowercase letter"""
        provisioner = IAMProvisioner(demo_mode=True)
        password = provisioner._generate_password()
        assert any(c.islower() for c in password), "Password must contain lowercase"

    def test_password_generation_has_digit(self):
        """Test that generated password contains digit"""
        provisioner = IAMProvisioner(demo_mode=True)
        password = provisioner._generate_password()
        assert any(c.isdigit() for c in password), "Password must contain digit"

    def test_password_generation_uniqueness(self):
        """Test that generated passwords are unique"""
        provisioner = IAMProvisioner(demo_mode=True)
        passwords = [provisioner._generate_password() for _ in range(10)]
        # All passwords should be unique
        assert len(passwords) == len(set(passwords))

    def test_create_user_demo_mode(self):
        """Test user creation in demo mode"""
        provisioner = IAMProvisioner(demo_mode=True)
        request = UserRequest(
            username="testuser",
            email="test@company.com",
            department="IT",
            role="Developer",
            first_name="Test",
            last_name="User"
        )

        result = provisioner.create_user(request)

        assert result.success is True
        assert result.username == "testuser"
        assert "StandardUsers" in result.groups_assigned
        assert "IT-Users" in result.groups_assigned

    def test_create_user_invalid_request(self):
        """Test that invalid user request returns failure"""
        provisioner = IAMProvisioner(demo_mode=True)
        request = UserRequest(
            username="ab",  # Too short
            email="invalid",
            department="IT",
            role="Developer",
            first_name="",
            last_name=""
        )

        result = provisioner.create_user(request)

        assert result.success is False
        assert "Validation failed" in result.message

    def test_assign_groups_for_engineering(self):
        """Test that Engineering department gets correct groups"""
        provisioner = IAMProvisioner(demo_mode=True)
        request = UserRequest(
            username="engineer",
            email="engineer@company.com",
            department="Engineering",
            role="Developer",
            first_name="Test",
            last_name="Engineer"
        )

        groups = provisioner._assign_groups(request)

        assert "StandardUsers" in groups
        assert "Engineering-Users" in groups
        assert "Developer-Tools" in groups
        assert "S3-Dev-Access" in groups

    def test_assign_groups_for_finance(self):
        """Test that Finance department gets correct groups"""
        provisioner = IAMProvisioner(demo_mode=True)
        request = UserRequest(
            username="finance",
            email="finance@company.com",
            department="Finance",
            role="Analyst",
            first_name="Test",
            last_name="Finance"
        )

        groups = provisioner._assign_groups(request)

        assert "StandardUsers" in groups
        assert "Finance-Users" in groups
        assert "Billing-ReadOnly" in groups

    def test_attach_policies_for_developer(self):
        """Test that Developer role gets correct policies"""
        provisioner = IAMProvisioner(demo_mode=True)
        request = UserRequest(
            username="dev",
            email="dev@company.com",
            department="IT",
            role="Developer",
            first_name="Test",
            last_name="Developer"
        )

        policies = provisioner._attach_policies(request)

        assert "arn:aws:iam::aws:policy/PowerUserAccess" in policies

    def test_attach_policies_for_admin(self):
        """Test that Admin role gets AdministratorAccess"""
        provisioner = IAMProvisioner(demo_mode=True)
        request = UserRequest(
            username="admin",
            email="admin@company.com",
            department="IT",
            role="Admin",
            first_name="Test",
            last_name="Admin"
        )

        policies = provisioner._attach_policies(request)

        assert "arn:aws:iam::aws:policy/AdministratorAccess" in policies

    def test_get_summary_empty(self):
        """Test summary with no provisioned users"""
        provisioner = IAMProvisioner(demo_mode=True)
        summary = provisioner.get_summary()

        assert summary["total_processed"] == 0
        assert summary["successful"] == 0
        assert summary["failed"] == 0
        assert summary["success_rate"] == "0.0%"

    def test_get_summary_after_provisioning(self):
        """Test summary after provisioning users"""
        provisioner = IAMProvisioner(demo_mode=True)

        # Provision some users
        for i in range(3):
            request = UserRequest(
                username=f"user{i}",
                email=f"user{i}@company.com",
                department="IT",
                role="Developer",
                first_name="Test",
                last_name=f"User{i}"
            )
            provisioner.create_user(request)

        summary = provisioner.get_summary()

        assert summary["total_processed"] == 3
        assert summary["successful"] == 3
        assert summary["failed"] == 0
        assert summary["success_rate"] == "100.0%"


class TestDepartmentAndRoleMappings:
    """Tests for department and role configuration"""

    def test_all_departments_have_groups(self):
        """Test that all departments have group mappings"""
        expected_departments = ["IT", "Finance", "HR", "Engineering", "Marketing", "Sales"]
        for dept in expected_departments:
            assert dept in DEPARTMENT_GROUPS
            assert len(DEPARTMENT_GROUPS[dept]) > 0

    def test_all_roles_have_policies(self):
        """Test that all roles have policy mappings"""
        expected_roles = ["Developer", "Analyst", "Admin", "Manager"]
        for role in expected_roles:
            assert role in ROLE_POLICIES
            assert len(ROLE_POLICIES[role]) > 0

    def test_developer_policy_is_power_user(self):
        """Test that Developer role maps to PowerUserAccess"""
        assert "arn:aws:iam::aws:policy/PowerUserAccess" in ROLE_POLICIES["Developer"]

    def test_analyst_policy_is_read_only(self):
        """Test that Analyst role maps to ReadOnlyAccess"""
        assert "arn:aws:iam::aws:policy/ReadOnlyAccess" in ROLE_POLICIES["Analyst"]


class TestRetryDecorator:
    """Tests for retry on throttle decorator"""

    def test_retry_decorator_exists(self):
        """Test that retry decorator is importable"""
        from iam_provisioner import retry_on_throttle
        assert callable(retry_on_throttle)


class TestAuditLogDecorator:
    """Tests for audit log decorator"""

    def test_audit_decorator_exists(self):
        """Test that audit decorator is importable"""
        from iam_provisioner import audit_log
        assert callable(audit_log)


# Integration-style tests (still using demo mode)
class TestProvisioningWorkflow:
    """Integration tests for complete provisioning workflow"""

    def test_full_provisioning_workflow(self):
        """Test complete provisioning workflow in demo mode"""
        provisioner = IAMProvisioner(demo_mode=True)

        # Create multiple users
        users = [
            UserRequest(
                username="jsmith",
                email="jsmith@company.com",
                department="Engineering",
                role="Developer",
                first_name="John",
                last_name="Smith"
            ),
            UserRequest(
                username="ajohnson",
                email="ajohnson@company.com",
                department="Finance",
                role="Analyst",
                first_name="Alice",
                last_name="Johnson"
            ),
        ]

        results = []
        for user in users:
            result = provisioner.create_user(user)
            results.append(result)

        # All should succeed
        assert all(r.success for r in results)
        assert len(provisioner.provisioned_users) == 2

        # Check summary
        summary = provisioner.get_summary()
        assert summary["total_processed"] == 2
        assert summary["success_rate"] == "100.0%"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

