"""
Unit Tests for Entra Provisioner
Author: Mohammad Khan

Tests for the Entra ID user provisioning system including:
- UserRequest validation
- Password generation
- Provisioning workflows
- Microsoft Graph / Key Vault calls (mocked)
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime
import sys
import os

# Add scripts directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'scripts', 'python'))

from entra_provisioner import (
    EntraProvisioner,
    UserRequest,
    ProvisioningResult,
    DEPARTMENT_GROUPS,
    ROLE_POLICIES,
    ENTRA_ROLE_TEMPLATE_IDS,
    PASSWORD_LENGTH
)


def graph_response(status=200, body=None):
    """Build a mocked Microsoft Graph HTTP response"""
    response = Mock()
    response.status_code = status
    response.content = b"{}" if body is not None else b""
    response.json.return_value = body if body is not None else {}
    response.text = ""
    return response


def live_provisioner(graph_handler):
    """EntraProvisioner in live mode with Graph, Key Vault and Blob clients mocked"""
    with patch("entra_provisioner.DefaultAzureCredential") as credential, \
         patch("entra_provisioner.SecretClient") as secret_client, \
         patch("entra_provisioner.BlobServiceClient"), \
         patch("entra_provisioner.requests.Session") as session:
        credential.return_value.get_token.return_value = Mock(token="test-token")
        session.return_value.request.side_effect = graph_handler
        provisioner = EntraProvisioner(demo_mode=False)
    return provisioner, session.return_value, secret_client.return_value


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
            credentials_location="keyvault:iam-credentials-IT-jsmith"
        )
        assert result.credentials_location == "keyvault:iam-credentials-IT-jsmith"

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


class TestEntraProvisioner:
    """Tests for EntraProvisioner class"""

    def test_demo_mode_initialization(self):
        """Test that demo mode doesn't initialize Graph or Azure clients"""
        provisioner = EntraProvisioner(demo_mode=True)
        assert provisioner.demo_mode is True
        assert provisioner._graph_session is None
        assert provisioner._blob_client is None
        assert provisioner._mail_sender is None

    def test_password_generation_length(self):
        """Test that generated password meets length requirement"""
        provisioner = EntraProvisioner(demo_mode=True)
        password = provisioner._generate_password()
        assert len(password) == PASSWORD_LENGTH

    def test_password_generation_has_uppercase(self):
        """Test that generated password contains uppercase letter"""
        provisioner = EntraProvisioner(demo_mode=True)
        password = provisioner._generate_password()
        assert any(c.isupper() for c in password), "Password must contain uppercase"

    def test_password_generation_has_lowercase(self):
        """Test that generated password contains lowercase letter"""
        provisioner = EntraProvisioner(demo_mode=True)
        password = provisioner._generate_password()
        assert any(c.islower() for c in password), "Password must contain lowercase"

    def test_password_generation_has_digit(self):
        """Test that generated password contains digit"""
        provisioner = EntraProvisioner(demo_mode=True)
        password = provisioner._generate_password()
        assert any(c.isdigit() for c in password), "Password must contain digit"

    def test_password_generation_uniqueness(self):
        """Test that generated passwords are unique"""
        provisioner = EntraProvisioner(demo_mode=True)
        passwords = [provisioner._generate_password() for _ in range(10)]
        # All passwords should be unique
        assert len(passwords) == len(set(passwords))

    def test_create_user_demo_mode(self):
        """Test user creation in demo mode"""
        provisioner = EntraProvisioner(demo_mode=True)
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
        provisioner = EntraProvisioner(demo_mode=True)
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
        provisioner = EntraProvisioner(demo_mode=True)
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
        assert "Storage-Dev-Access" in groups

    def test_assign_groups_for_finance(self):
        """Test that Finance department gets correct groups"""
        provisioner = EntraProvisioner(demo_mode=True)
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
        """Test that Developer role gets correct directory role"""
        provisioner = EntraProvisioner(demo_mode=True)
        request = UserRequest(
            username="dev",
            email="dev@company.com",
            department="IT",
            role="Developer",
            first_name="Test",
            last_name="Developer"
        )

        policies = provisioner._attach_policies(request)

        assert "Application Developer" in policies

    def test_attach_policies_for_admin(self):
        """Test that Admin role gets Global Administrator"""
        provisioner = EntraProvisioner(demo_mode=True)
        request = UserRequest(
            username="admin",
            email="admin@company.com",
            department="IT",
            role="Admin",
            first_name="Test",
            last_name="Admin"
        )

        policies = provisioner._attach_policies(request)

        assert "Global Administrator" in policies

    def test_get_summary_empty(self):
        """Test summary with no provisioned users"""
        provisioner = EntraProvisioner(demo_mode=True)
        summary = provisioner.get_summary()

        assert summary["total_processed"] == 0
        assert summary["successful"] == 0
        assert summary["failed"] == 0
        assert summary["success_rate"] == "0.0%"

    def test_get_summary_after_provisioning(self):
        """Test summary after provisioning users"""
        provisioner = EntraProvisioner(demo_mode=True)

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
        """Test that all roles have directory role mappings"""
        expected_roles = ["Developer", "Analyst", "Admin", "Manager"]
        for role in expected_roles:
            assert role in ROLE_POLICIES
            assert len(ROLE_POLICIES[role]) > 0

    def test_developer_policy_is_application_developer(self):
        """Test that Developer role maps to Application Developer"""
        assert "Application Developer" in ROLE_POLICIES["Developer"]

    def test_analyst_policy_is_global_reader(self):
        """Test that Analyst role maps to Global Reader"""
        assert "Global Reader" in ROLE_POLICIES["Analyst"]

    def test_every_mapped_role_has_template_id(self):
        """Test that every mapped directory role resolves to a built-in role template ID"""
        for roles in ROLE_POLICIES.values():
            for role_name in roles:
                assert role_name in ENTRA_ROLE_TEMPLATE_IDS


class TestRetryDecorator:
    """Tests for retry on throttle decorator"""

    def test_retry_decorator_exists(self):
        """Test that retry decorator is importable"""
        from entra_provisioner import retry_on_throttle
        assert callable(retry_on_throttle)

    def test_retry_on_graph_429(self):
        """Test that a Graph 429 is retried and then succeeds"""
        from entra_provisioner import retry_on_throttle, GraphError
        calls = []

        @retry_on_throttle(max_retries=3, base_delay=0)
        def flaky():
            calls.append(1)
            if len(calls) < 2:
                raise GraphError(429, "TooManyRequests", "Throttled")
            return "ok"

        assert flaky() == "ok"
        assert len(calls) == 2


class TestAuditLogDecorator:
    """Tests for audit log decorator"""

    def test_audit_decorator_exists(self):
        """Test that audit decorator is importable"""
        from entra_provisioner import audit_log
        assert callable(audit_log)


# Integration-style tests (still using demo mode)
class TestProvisioningWorkflow:
    """Integration tests for complete provisioning workflow"""

    def test_full_provisioning_workflow(self):
        """Test complete provisioning workflow in demo mode"""
        provisioner = EntraProvisioner(demo_mode=True)

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


# Live-mode tests with Microsoft Graph and Key Vault mocked
class TestGraphProvisioning:
    """Tests for the live provisioning path against mocked Microsoft Graph"""

    @staticmethod
    def happy_graph(method, url, **kwargs):
        if method == "POST" and url.endswith("/users"):
            return graph_response(201, {"id": "user-id-1"})
        if method == "GET" and "/groups?$filter=" in url:
            return graph_response(200, {"value": [{"id": "group-id-1"}]})
        if method == "POST" and url.endswith("/members/$ref"):
            return graph_response(204)
        if method == "POST" and url.endswith("/roleManagement/directory/roleAssignments"):
            return graph_response(201, {"id": "assignment-1"})
        if method == "POST" and url.endswith("/sendMail"):
            return graph_response(202)
        raise AssertionError(f"Unexpected Graph call: {method} {url}")

    def test_live_create_user_calls_graph_and_key_vault(self):
        """Test the live path creates the user, groups, role, secret and mail"""
        provisioner, session, secrets = live_provisioner(self.happy_graph)
        request = UserRequest(
            username="testuser",
            email="testuser@company.com",
            department="IT",
            role="Developer",
            first_name="Test",
            last_name="User"
        )

        result = provisioner.create_user(request)

        assert result.success is True
        assert result.credentials_location == "keyvault:iam-credentials-IT-testuser"
        urls = [c.args[1] for c in session.request.call_args_list]
        assert any(u.endswith("/users") for u in urls)
        assert sum(u.endswith("/members/$ref") for u in urls) == 1 + len(DEPARTMENT_GROUPS["IT"])
        assert any(u.endswith("/sendMail") for u in urls)

        create_body = session.request.call_args_list[0].kwargs["json"]
        assert create_body["userPrincipalName"] == "testuser@company.com"
        assert create_body["passwordProfile"]["forceChangePasswordNextSignIn"] is True

        role_call = [c for c in session.request.call_args_list if c.args[1].endswith("/roleAssignments")][0]
        assert role_call.kwargs["json"]["roleDefinitionId"] == ENTRA_ROLE_TEMPLATE_IDS["Application Developer"]
        assert role_call.kwargs["json"]["principalId"] == "user-id-1"

        secrets.set_secret.assert_called_once()
        assert secrets.set_secret.call_args.args[0] == "iam-credentials-IT-testuser"

    def test_live_missing_group_is_skipped(self):
        """Test that a group missing from the tenant is skipped, not fatal"""
        def graph(method, url, **kwargs):
            if method == "GET" and "VPN-Access" in url:
                return graph_response(200, {"value": []})
            return self.happy_graph(method, url, **kwargs)

        provisioner, _, _ = live_provisioner(graph)
        request = UserRequest(
            username="testuser",
            email="testuser@company.com",
            department="IT",
            role="Analyst",
            first_name="Test",
            last_name="User"
        )

        result = provisioner.create_user(request)

        assert result.success is True
        assert "VPN-Access" not in result.groups_assigned

    def test_live_existing_user_returns_failure(self):
        """Test that a Graph 'already exists' error is reported, not raised"""
        def graph(method, url, **kwargs):
            if method == "POST" and url.endswith("/users"):
                return graph_response(400, {"error": {
                    "code": "Request_BadRequest",
                    "message": "Another object with the same value for property userPrincipalName already exists."
                }})
            return self.happy_graph(method, url, **kwargs)

        provisioner, _, secrets = live_provisioner(graph)
        request = UserRequest(
            username="testuser",
            email="testuser@company.com",
            department="IT",
            role="Developer",
            first_name="Test",
            last_name="User"
        )

        result = provisioner.create_user(request)

        assert result.success is False
        assert result.message == "User testuser already exists"
        secrets.set_secret.assert_not_called()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

