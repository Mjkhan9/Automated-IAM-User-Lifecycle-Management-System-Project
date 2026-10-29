"""
Microsoft Entra ID User Lifecycle Provisioning System
Author: Mohammad Khan
Date: December 2025

Production-grade identity automation implementing:
- Least-privilege access with Entra RBAC role assignments
- Security-group-based role assignment
- Secure credential handling with Azure Key Vault
- Microsoft Graph sendMail notifications for credential delivery
- Comprehensive audit logging via Microsoft Entra audit logs
"""

import json
import csv
import logging
import secrets
import string
from datetime import datetime
from typing import Optional, List, Dict, Any
from dataclasses import dataclass
from functools import wraps
import time

import requests
from azure.core.exceptions import AzureError
from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient
from azure.storage.blob import BlobServiceClient

# ============================================================================
# CONFIGURATION
# ============================================================================

DEMO_MODE = True  # Set to False to execute real Microsoft Graph and Azure calls

# Identity Configuration
DEFAULT_GROUP = "StandardUsers"
PASSWORD_LENGTH = 16
REQUIRE_PASSWORD_RESET = True

# Microsoft Graph and Azure Resource Configuration
GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0"
GRAPH_SCOPE = "https://graph.microsoft.com/.default"
KEY_VAULT_URL = "https://company-iam-credentials.vault.azure.net"
AUDIT_ARCHIVE_ACCOUNT_URL = "https://companyiamaudit.blob.core.windows.net"
NOTIFICATION_SENDER = "iam-automation@company.com"
NOTIFICATION_RECIPIENT = "it-security@company.com"

# Department to Entra security group mapping
DEPARTMENT_GROUPS = {
    "IT": ["IT-Users", "VPN-Access", "Monitoring-ReadOnly"],
    "Finance": ["Finance-Users", "Billing-ReadOnly"],
    "HR": ["HR-Users", "Employee-Records-Access"],
    "Engineering": ["Engineering-Users", "Developer-Tools", "Storage-Dev-Access"],
    "Marketing": ["Marketing-Users", "Analytics-ReadOnly"],
    "Sales": ["Sales-Users", "CRM-Access"],
}

# Role-based Entra directory role assignments (RBAC)
ROLE_POLICIES = {
    "Developer": ["Application Developer"],
    "Analyst": ["Global Reader"],
    "Admin": ["Global Administrator"],
    "Manager": ["Reports Reader"],
}

# Built-in Entra role template IDs (Microsoft Entra built-in roles reference)
ENTRA_ROLE_TEMPLATE_IDS = {
    "Application Developer": "cf1c38e5-3621-4004-a7cb-879624dced7c",
    "Global Reader": "f2ef992c-3afb-46b9-b7cf-a126ee74c451",
    "Global Administrator": "62e90394-69f5-4237-9190-012177145e10",
    "Reports Reader": "4a5d8f65-41da-4de4-8968-e035b65339cf",
}

# Logging configuration
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)


# ============================================================================
# DATA CLASSES
# ============================================================================

@dataclass
class UserRequest:
    """Represents a user provisioning request"""
    username: str
    email: str
    department: str
    role: str
    first_name: str
    last_name: str
    manager: Optional[str] = None

    @property
    def display_name(self) -> str:
        return f"{self.first_name} {self.last_name}"

    def validate(self) -> bool:
        """Validate user request fields"""
        if not all([self.username, self.email, self.department, self.role]):
            return False
        if "@" not in self.email:
            return False
        if len(self.username) < 3 or len(self.username) > 64:
            return False
        return True


@dataclass
class ProvisioningResult:
    """Result of a provisioning operation"""
    username: str
    success: bool
    message: str
    groups_assigned: List[str]
    policies_attached: List[str]
    credentials_location: Optional[str] = None
    timestamp: str = None

    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now().isoformat()


class GraphError(Exception):
    """Error returned by Microsoft Graph"""
    def __init__(self, status: int, code: str, message: str):
        super().__init__(f"{status} {code}: {message}")
        self.status = status
        self.code = code
        self.message = message


# ============================================================================
# DECORATORS
# ============================================================================

def retry_on_throttle(max_retries: int = 3, base_delay: float = 1.0):
    """Decorator to retry Microsoft Graph calls on throttling (HTTP 429)"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except GraphError as e:
                    if e.status == 429 or e.code in ['TooManyRequests', 'activityLimitReached']:
                        if attempt < max_retries - 1:
                            delay = base_delay * (2 ** attempt)
                            logger.warning(f"Throttled, retrying in {delay}s...")
                            time.sleep(delay)
                            continue
                    raise
            return None
        return wrapper
    return decorator


def audit_log(action: str):
    """Decorator to log identity actions for audit trail"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = datetime.now()
            try:
                result = func(*args, **kwargs)
                logger.info(f"AUDIT: {action} - SUCCESS - Duration: {(datetime.now() - start_time).total_seconds():.2f}s")
                return result
            except Exception as e:
                logger.error(f"AUDIT: {action} - FAILED - Error: {str(e)}")
                raise
        return wrapper
    return decorator


# ============================================================================
# ENTRA PROVISIONER CLASS
# ============================================================================

class EntraProvisioner:
    """
    Production Microsoft Entra ID user provisioning system.

    Implements enterprise patterns:
    - Group-based access control (GBAC)
    - Least privilege principle
    - Secure credential delivery
    - Comprehensive audit logging
    """

    def __init__(self, demo_mode: bool = DEMO_MODE):
        self.demo_mode = demo_mode
        self._graph_session = None
        self._blob_client = None
        self._mail_sender = None
        self._secrets_client = None
        self._credential = None
        self._user_ids: Dict[str, str] = {}
        self.provisioned_users: List[ProvisioningResult] = []

        if not demo_mode:
            self._initialize_clients()

        logger.info(f"EntraProvisioner initialized (Demo Mode: {demo_mode})")

    def _initialize_clients(self):
        """Initialize Microsoft Graph and Azure service clients"""
        try:
            self._credential = DefaultAzureCredential()
            self._graph_session = requests.Session()
            self._blob_client = BlobServiceClient(account_url=AUDIT_ARCHIVE_ACCOUNT_URL, credential=self._credential)
            self._mail_sender = NOTIFICATION_SENDER
            self._secrets_client = SecretClient(vault_url=KEY_VAULT_URL, credential=self._credential)
            logger.info("Microsoft Graph and Azure clients initialized successfully")
        except AzureError as e:
            logger.error(f"Failed to initialize Azure clients: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error initializing Azure clients: {e}")
            raise

    def _graph(self, method: str, path: str, body: Optional[Dict] = None) -> Dict:
        """Call Microsoft Graph and return the JSON body (empty dict for 202/204)"""
        token = self._credential.get_token(GRAPH_SCOPE).token
        response = self._graph_session.request(
            method,
            f"{GRAPH_BASE_URL}{path}",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json=body,
            timeout=30
        )
        if response.status_code >= 400:
            try:
                error = response.json().get("error", {})
            except ValueError:
                error = {}
            raise GraphError(response.status_code, error.get("code", ""), error.get("message", response.text))
        if response.status_code in (202, 204) or not response.content:
            return {}
        return response.json()

    @property
    def graph(self):
        return self._graph_session

    # ========================================================================
    # CORE PROVISIONING METHODS
    # ========================================================================

    @audit_log("CREATE_USER")
    @retry_on_throttle()
    def create_user(self, request: UserRequest) -> ProvisioningResult:
        """
        Provision a new Entra ID user with full lifecycle setup.

        Steps:
        1. Validate request
        2. Generate the temporary password profile
        3. Create the Entra user
        4. Assign to security groups based on department
        5. Assign role-based Entra directory roles
        6. Store credentials in Key Vault
        7. Send notification
        """
        logger.info(f"Starting provisioning for: {request.username}")

        if not request.validate():
            return ProvisioningResult(
                username=request.username,
                success=False,
                message="Validation failed",
                groups_assigned=[],
                policies_attached=[]
            )

        groups_assigned = []
        policies_attached = []

        try:
            # Step 1: Generate credentials (Graph requires the password profile at creation)
            password = self._generate_password()
            password_profile = self._set_login_profile(request.username, password)

            # Step 2: Create Entra user
            self._create_entra_user(request, password_profile)

            # Step 3: Assign to security groups
            groups_assigned = self._assign_groups(request)

            # Step 4: Assign role-based Entra directory roles
            policies_attached = self._attach_policies(request)

            # Step 5: Store credentials securely in Azure Key Vault
            creds_location = self._store_credentials(request, password)

            # Step 6: Send notification
            self._send_notification(request, creds_location)

            result = ProvisioningResult(
                username=request.username,
                success=True,
                message="User provisioned successfully",
                groups_assigned=groups_assigned,
                policies_attached=policies_attached,
                credentials_location=creds_location
            )

            self.provisioned_users.append(result)
            logger.info(f"Successfully provisioned: {request.username}")

            return result

        except GraphError as e:
            error_code = e.code
            if error_code == 'Request_BadRequest' and 'already exist' in e.message:
                error_code = 'ObjectConflict'
            error_handlers = {
                'ObjectConflict': lambda: f"User {request.username} already exists",
                'Directory_QuotaExceeded': lambda: "Directory object quota reached - contact Microsoft support",
                'Authorization_RequestDenied': lambda: "Insufficient Microsoft Graph permissions",
                'Request_ResourceNotFound': lambda: "Referenced resource not found",
                'Request_BadRequest': lambda: f"Invalid input: {e.message}"
            }
            handler = error_handlers.get(error_code, lambda: str(e))
            error_message = handler()
            logger.error(f"Microsoft Graph error for {request.username}: {error_message}")
            return ProvisioningResult(
                username=request.username,
                success=False,
                message=error_message,
                groups_assigned=groups_assigned,
                policies_attached=policies_attached
            )

        except (requests.RequestException, AzureError) as e:
            logger.error(f"Microsoft Graph / Azure connection error for {request.username}: {e}")
            return ProvisioningResult(
                username=request.username,
                success=False,
                message=f"Microsoft Graph / Azure connection error: {str(e)}",
                groups_assigned=groups_assigned,
                policies_attached=policies_attached
            )

        except ValueError as e:
            logger.error(f"Parameter validation error: {e}")
            return ProvisioningResult(
                username=request.username,
                success=False,
                message=f"Parameter validation error: {str(e)}",
                groups_assigned=groups_assigned,
                policies_attached=policies_attached
            )

        except Exception as e:
            logger.error(f"Unexpected error provisioning {request.username}: {e}")
            return ProvisioningResult(
                username=request.username,
                success=False,
                message=f"Unexpected error: {str(e)}",
                groups_assigned=groups_assigned,
                policies_attached=policies_attached
            )

    def _create_entra_user(self, request: UserRequest, password_profile: Dict):
        """Create the Entra user with directory attributes"""
        attributes = {
            "department": request.department,
            "jobTitle": request.role,
            "mail": request.email,
            "displayName": request.display_name,
            "extensionAttribute1": "IAM-Automation",
            "extensionAttribute2": datetime.now().strftime("%Y-%m-%d"),
        }

        if request.manager:
            attributes["extensionAttribute3"] = request.manager

        if self.demo_mode:
            logger.info(f"[DEMO] Would create user: {request.username} with {len(attributes)} attributes")
            return

        body = {
            "accountEnabled": True,
            "userPrincipalName": request.email,
            "mailNickname": request.username,
            "givenName": request.first_name,
            "surname": request.last_name,
            "displayName": attributes["displayName"],
            "department": attributes["department"],
            "jobTitle": attributes["jobTitle"],
            "mail": attributes["mail"],
            "passwordProfile": password_profile,
            "onPremisesExtensionAttributes": {
                k: v for k, v in attributes.items() if k.startswith("extensionAttribute")
            },
        }
        user = self._graph("POST", "/users", body)
        self._user_ids[request.username] = user["id"]
        logger.info(f"Created Entra user: {request.username}")

    def _assign_groups(self, request: UserRequest) -> List[str]:
        """Assign user to security groups based on department"""
        groups = [DEFAULT_GROUP]

        if request.department in DEPARTMENT_GROUPS:
            groups.extend(DEPARTMENT_GROUPS[request.department])

        for group in groups:
            if self.demo_mode:
                logger.info(f"[DEMO] Would add {request.username} to group: {group}")
            else:
                found = self._graph("GET", f"/groups?$filter=displayName eq '{group}'&$select=id").get("value", [])
                if not found:
                    logger.warning(f"Group {group} does not exist, skipping")
                    groups.remove(group)
                    continue
                self._graph(
                    "POST",
                    f"/groups/{found[0]['id']}/members/$ref",
                    {"@odata.id": f"{GRAPH_BASE_URL}/directoryObjects/{self._user_ids[request.username]}"}
                )
                logger.info(f"Added {request.username} to group: {group}")

        return groups

    def _attach_policies(self, request: UserRequest) -> List[str]:
        """Assign role-based Entra directory roles (RBAC)"""
        policies = []

        if request.role in ROLE_POLICIES:
            policies = ROLE_POLICIES[request.role]

            for role_name in policies:
                if self.demo_mode:
                    logger.info(f"[DEMO] Would assign directory role: {role_name}")
                else:
                    self._graph("POST", "/roleManagement/directory/roleAssignments", {
                        "principalId": self._user_ids[request.username],
                        "roleDefinitionId": ENTRA_ROLE_TEMPLATE_IDS[role_name],
                        "directoryScopeId": "/"
                    })
                    logger.info(f"Assigned directory role: {role_name}")

        return policies

    def _generate_password(self) -> str:
        """Generate a secure random password"""
        alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
        password = ''.join(secrets.choice(alphabet) for _ in range(PASSWORD_LENGTH))

        # Ensure complexity requirements
        if not any(c.isupper() for c in password):
            password = secrets.choice(string.ascii_uppercase) + password[1:]
        if not any(c.islower() for c in password):
            password = password[0] + secrets.choice(string.ascii_lowercase) + password[2:]
        if not any(c.isdigit() for c in password):
            password = password[:2] + secrets.choice(string.digits) + password[3:]

        return password

    def _set_login_profile(self, username: str, password: str) -> Dict:
        """Build the Entra password profile (temporary password, change at next sign-in)"""
        if self.demo_mode:
            logger.info(f"[DEMO] Would set password profile for: {username}")

        return {
            "password": password,
            "forceChangePasswordNextSignIn": REQUIRE_PASSWORD_RESET
        }

    def _store_credentials(self, request: UserRequest, password: str) -> str:
        """Store credentials securely in Azure Key Vault (each write is a new secret version)"""
        secret_name = f"iam-credentials-{request.department}-{request.username}"

        credentials_data = {
            "username": request.username,
            "email": request.email,
            "temporary_password": password,
            "sign_in_url": "https://myapps.microsoft.com",
            "created_at": datetime.now().isoformat(),
            "requires_password_reset": True
        }

        if self.demo_mode:
            logger.info(f"[DEMO] Would store credentials in Key Vault: {secret_name}")
            return f"keyvault:{secret_name}"

        self._secrets_client.set_secret(
            secret_name,
            json.dumps(credentials_data),
            content_type="application/json",
            tags={
                "Department": request.department,
                "ManagedBy": "IAM-Automation",
                "CreatedDate": datetime.now().strftime("%Y-%m-%d")
            }
        )
        logger.info(f"Stored secret: {secret_name}")

        return f"keyvault:{secret_name}"

    def _send_notification(self, request: UserRequest, creds_location: str):
        """Send notification via Microsoft Graph sendMail"""
        message = {
            "event": "USER_PROVISIONED",
            "username": request.username,
            "email": request.email,
            "department": request.department,
            "credentials_location": creds_location,
            "timestamp": datetime.now().isoformat()
        }

        if self.demo_mode:
            logger.info(f"[DEMO] Would send Graph mail notification for: {request.username}")
            return

        self._graph("POST", f"/users/{self._mail_sender}/sendMail", {
            "message": {
                "subject": f"Entra User Provisioned: {request.username}",
                "body": {"contentType": "Text", "content": json.dumps(message, indent=2)},
                "toRecipients": [{"emailAddress": {"address": NOTIFICATION_RECIPIENT}}]
            },
            "saveToSentItems": False
        })

    # ========================================================================
    # BULK OPERATIONS
    # ========================================================================

    def provision_from_csv(self, csv_path: str) -> List[ProvisioningResult]:
        """
        Bulk provision users from CSV file.

        Expected CSV columns:
        - username, email, department, role, first_name, last_name, manager
        """
        results = []

        logger.info(f"Starting bulk provisioning from: {csv_path}")

        with open(csv_path, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                request = UserRequest(
                    username=row.get('username', row.get('Username', '')),
                    email=row.get('email', row.get('Email', '')),
                    department=row.get('department', row.get('Department', '')),
                    role=row.get('role', row.get('Role', 'Employee')),
                    first_name=row.get('first_name', row.get('FirstName', '')),
                    last_name=row.get('last_name', row.get('LastName', '')),
                    manager=row.get('manager', row.get('Manager'))
                )

                result = self.create_user(request)
                results.append(result)

                # Rate limiting
                time.sleep(0.1)

        return results

    # ========================================================================
    # REPORTING
    # ========================================================================

    def get_summary(self) -> Dict[str, Any]:
        """Generate provisioning summary"""
        successful = [r for r in self.provisioned_users if r.success]
        failed = [r for r in self.provisioned_users if not r.success]

        return {
            "total_processed": len(self.provisioned_users),
            "successful": len(successful),
            "failed": len(failed),
            "success_rate": f"{(len(successful) / max(len(self.provisioned_users), 1)) * 100:.1f}%",
            "users_provisioned": [r.username for r in successful],
            "users_failed": [{"username": r.username, "error": r.message} for r in failed]
        }

    def print_summary(self):
        """Print formatted summary to console"""
        summary = self.get_summary()

        print("\n" + "=" * 60)
        print("  ENTRA ID PROVISIONING SUMMARY")
        print("=" * 60)
        print(f"  Total Processed:  {summary['total_processed']}")
        print(f"  Successful:       {summary['successful']}")
        print(f"  Failed:           {summary['failed']}")
        print(f"  Success Rate:     {summary['success_rate']}")
        print("=" * 60 + "\n")


# ============================================================================
# MAIN EXECUTION
# ============================================================================

def main():
    """Main entry point"""
    print("\n" + "=" * 60)
    print("  MICROSOFT ENTRA ID USER LIFECYCLE PROVISIONING SYSTEM")
    print("  Mohammad Khan | Identity & Access Management")
    print("=" * 60 + "\n")

    provisioner = EntraProvisioner(demo_mode=DEMO_MODE)

    # Example: Single user provisioning
    test_users = [
        UserRequest(
            username="jsmith",
            email="jsmith@company.com",
            department="Engineering",
            role="Developer",
            first_name="John",
            last_name="Smith",
            manager="mwilliams"
        ),
        UserRequest(
            username="ajohnson",
            email="ajohnson@company.com",
            department="Finance",
            role="Analyst",
            first_name="Alice",
            last_name="Johnson"
        ),
        UserRequest(
            username="bwilliams",
            email="bwilliams@company.com",
            department="IT",
            role="Admin",
            first_name="Bob",
            last_name="Williams"
        ),
    ]

    for user in test_users:
        provisioner.create_user(user)

    provisioner.print_summary()


if __name__ == "__main__":
    main()

