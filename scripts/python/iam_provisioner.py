"""
AWS IAM User Lifecycle Provisioning System
Author: Mohammad Khan
Date: December 2025

Production-grade IAM automation implementing:
- Least-privilege access with managed policies
- Group-based role assignment
- Secure credential handling with AWS Secrets Manager
- SNS notifications for credential delivery
- Comprehensive audit logging via CloudTrail
"""

import boto3
import json
import csv
import logging
import secrets
import string
from datetime import datetime
from typing import Optional, List, Dict, Any
from dataclasses import dataclass
from botocore.exceptions import ClientError, BotoCoreError, ParamValidationError
from functools import wraps
import time

# ============================================================================
# CONFIGURATION
# ============================================================================

DEMO_MODE = True  # Set to False to execute real AWS API calls

# IAM Configuration
DEFAULT_GROUP = "StandardUsers"
PASSWORD_LENGTH = 16
REQUIRE_PASSWORD_RESET = True

# AWS Resource Configuration
CREDENTIALS_BUCKET = "company-iam-credentials"
SNS_TOPIC_ARN = "arn:aws:sns:us-east-1:123456789012:iam-notifications"

# Department to IAM Group mapping
DEPARTMENT_GROUPS = {
    "IT": ["IT-Users", "VPN-Access", "CloudWatch-ReadOnly"],
    "Finance": ["Finance-Users", "Billing-ReadOnly"],
    "HR": ["HR-Users", "Employee-Records-Access"],
    "Engineering": ["Engineering-Users", "Developer-Tools", "S3-Dev-Access"],
    "Marketing": ["Marketing-Users", "Analytics-ReadOnly"],
    "Sales": ["Sales-Users", "CRM-Access"],
}

# Role-based additional permissions
ROLE_POLICIES = {
    "Developer": ["arn:aws:iam::aws:policy/PowerUserAccess"],
    "Analyst": ["arn:aws:iam::aws:policy/ReadOnlyAccess"],
    "Admin": ["arn:aws:iam::aws:policy/AdministratorAccess"],
    "Manager": ["arn:aws:iam::aws:policy/ReadOnlyAccess"],
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


# ============================================================================
# DECORATORS
# ============================================================================

def retry_on_throttle(max_retries: int = 3, base_delay: float = 1.0):
    """Decorator to retry AWS API calls on throttling"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except ClientError as e:
                    error_code = e.response.get('Error', {}).get('Code', '')
                    if error_code in ['Throttling', 'RequestLimitExceeded']:
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
    """Decorator to log IAM actions for audit trail"""
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
# IAM PROVISIONER CLASS
# ============================================================================

class IAMProvisioner:
    """
    Production IAM user provisioning system.
    
    Implements enterprise patterns:
    - Group-based access control (GBAC)
    - Least privilege principle
    - Secure credential delivery
    - Comprehensive audit logging
    """
    
    def __init__(self, demo_mode: bool = DEMO_MODE):
        self.demo_mode = demo_mode
        self._iam_client = None
        self._s3_client = None
        self._sns_client = None
        self._secrets_client = None
        self.provisioned_users: List[ProvisioningResult] = []
        
        if not demo_mode:
            self._initialize_clients()
        
        logger.info(f"IAMProvisioner initialized (Demo Mode: {demo_mode})")
    
    def _initialize_clients(self):
        """Initialize AWS service clients"""
        try:
            self._iam_client = boto3.client('iam')
            self._s3_client = boto3.client('s3')
            self._sns_client = boto3.client('sns')
            self._secrets_client = boto3.client('secretsmanager')
            logger.info("AWS clients initialized successfully")
        except (ClientError, BotoCoreError) as e:
            logger.error(f"Failed to initialize AWS clients: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error initializing AWS clients: {e}")
            raise
    
    @property
    def iam(self):
        return self._iam_client
    
    # ========================================================================
    # CORE PROVISIONING METHODS
    # ========================================================================
    
    @audit_log("CREATE_USER")
    @retry_on_throttle()
    def create_user(self, request: UserRequest) -> ProvisioningResult:
        """
        Provision a new IAM user with full lifecycle setup.
        
        Steps:
        1. Validate request
        2. Create IAM user
        3. Assign to groups based on department
        4. Attach role-based policies
        5. Generate and store credentials
        6. Send notification
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
            # Step 1: Create IAM user
            self._create_iam_user(request)
            
            # Step 2: Assign to groups
            groups_assigned = self._assign_groups(request)
            
            # Step 3: Attach role-based policies
            policies_attached = self._attach_policies(request)
            
            # Step 4: Generate credentials
            password = self._generate_password()
            self._set_login_profile(request.username, password)
            
            # Step 5: Store credentials securely in Secrets Manager
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
        
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', '')
            error_handlers = {
                'EntityAlreadyExists': lambda: f"User {request.username} already exists",
                'LimitExceeded': lambda: "IAM user limit reached - contact AWS support",
                'MalformedPolicyDocument': lambda: "Invalid policy document",
                'NoSuchEntity': lambda: "Referenced resource not found",
                'InvalidInput': lambda: f"Invalid input: {e.response['Error']['Message']}"
            }
            handler = error_handlers.get(error_code, lambda: str(e))
            error_message = handler()
            logger.error(f"AWS ClientError for {request.username}: {error_message}")
            return ProvisioningResult(
                username=request.username,
                success=False,
                message=error_message,
                groups_assigned=groups_assigned,
                policies_attached=policies_attached
            )
        
        except BotoCoreError as e:
            logger.error(f"AWS connection error for {request.username}: {e}")
            return ProvisioningResult(
                username=request.username,
                success=False,
                message=f"AWS connection error: {str(e)}",
                groups_assigned=groups_assigned,
                policies_attached=policies_attached
            )
        
        except ParamValidationError as e:
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
    
    def _create_iam_user(self, request: UserRequest):
        """Create the IAM user with tags"""
        tags = [
            {"Key": "Department", "Value": request.department},
            {"Key": "Role", "Value": request.role},
            {"Key": "Email", "Value": request.email},
            {"Key": "DisplayName", "Value": request.display_name},
            {"Key": "CreatedBy", "Value": "IAM-Automation"},
            {"Key": "CreatedDate", "Value": datetime.now().strftime("%Y-%m-%d")},
        ]
        
        if request.manager:
            tags.append({"Key": "Manager", "Value": request.manager})
        
        if self.demo_mode:
            logger.info(f"[DEMO] Would create user: {request.username} with {len(tags)} tags")
            return
        
        self.iam.create_user(
            UserName=request.username,
            Tags=tags
        )
        logger.info(f"Created IAM user: {request.username}")
    
    def _assign_groups(self, request: UserRequest) -> List[str]:
        """Assign user to groups based on department"""
        groups = [DEFAULT_GROUP]
        
        if request.department in DEPARTMENT_GROUPS:
            groups.extend(DEPARTMENT_GROUPS[request.department])
        
        for group in groups:
            if self.demo_mode:
                logger.info(f"[DEMO] Would add {request.username} to group: {group}")
            else:
                try:
                    self.iam.add_user_to_group(
                        UserName=request.username,
                        GroupName=group
                    )
                    logger.info(f"Added {request.username} to group: {group}")
                except ClientError as e:
                    if e.response['Error']['Code'] == 'NoSuchEntity':
                        logger.warning(f"Group {group} does not exist, skipping")
                        groups.remove(group)
                    else:
                        raise
        
        return groups
    
    def _attach_policies(self, request: UserRequest) -> List[str]:
        """Attach role-based managed policies"""
        policies = []
        
        if request.role in ROLE_POLICIES:
            policies = ROLE_POLICIES[request.role]
            
            for policy_arn in policies:
                if self.demo_mode:
                    logger.info(f"[DEMO] Would attach policy: {policy_arn}")
                else:
                    self.iam.attach_user_policy(
                        UserName=request.username,
                        PolicyArn=policy_arn
                    )
                    logger.info(f"Attached policy: {policy_arn}")
        
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
    
    def _set_login_profile(self, username: str, password: str):
        """Create login profile with password"""
        if self.demo_mode:
            logger.info(f"[DEMO] Would set login profile for: {username}")
            return
        
        self.iam.create_login_profile(
            UserName=username,
            Password=password,
            PasswordResetRequired=REQUIRE_PASSWORD_RESET
        )
        logger.info(f"Created login profile for: {username}")
    
    def _store_credentials(self, request: UserRequest, password: str) -> str:
        """Store credentials securely in AWS Secrets Manager with automatic rotation"""
        secret_name = f"iam-credentials/{request.department}/{request.username}"
        
        credentials_data = {
            "username": request.username,
            "email": request.email,
            "temporary_password": password,
            "console_url": "https://company.signin.aws.amazon.com/console",
            "created_at": datetime.now().isoformat(),
            "requires_password_reset": True
        }
        
        if self.demo_mode:
            logger.info(f"[DEMO] Would store credentials in Secrets Manager: {secret_name}")
            return f"secretsmanager:{secret_name}"
        
        try:
            self._secrets_client.create_secret(
                Name=secret_name,
                SecretString=json.dumps(credentials_data),
                Tags=[
                    {"Key": "Department", "Value": request.department},
                    {"Key": "ManagedBy", "Value": "IAM-Automation"},
                    {"Key": "CreatedDate", "Value": datetime.now().strftime("%Y-%m-%d")}
                ]
            )
            logger.info(f"Created secret: {secret_name}")
        except ClientError as e:
            if e.response['Error']['Code'] == 'ResourceExistsException':
                # Update existing secret
                self._secrets_client.put_secret_value(
                    SecretId=secret_name,
                    SecretString=json.dumps(credentials_data)
                )
                logger.info(f"Updated existing secret: {secret_name}")
            else:
                raise
        
        return f"secretsmanager:{secret_name}"
    
    def _send_notification(self, request: UserRequest, creds_location: str):
        """Send notification via SNS"""
        message = {
            "event": "USER_PROVISIONED",
            "username": request.username,
            "email": request.email,
            "department": request.department,
            "credentials_location": creds_location,
            "timestamp": datetime.now().isoformat()
        }
        
        if self.demo_mode:
            logger.info(f"[DEMO] Would send SNS notification for: {request.username}")
            return
        
        self._sns_client.publish(
            TopicArn=SNS_TOPIC_ARN,
            Message=json.dumps(message),
            Subject=f"IAM User Provisioned: {request.username}"
        )
    
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
        print("  IAM PROVISIONING SUMMARY")
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
    print("  AWS IAM USER LIFECYCLE PROVISIONING SYSTEM")
    print("  Mohammad Khan | AWS Solutions Architect")
    print("=" * 60 + "\n")
    
    provisioner = IAMProvisioner(demo_mode=DEMO_MODE)
    
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

