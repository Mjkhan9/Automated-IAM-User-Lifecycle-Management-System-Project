<#
.SYNOPSIS
    Automated Active Directory User Provisioning Script
    
.DESCRIPTION
    Creates new AD users with proper group memberships, home directories,
    and notifications. Implements least-privilege access and audit logging.
    
.AUTHOR
    Mohammad Khan
    
.EXAMPLE
    .\New-ADUserProvision.ps1 -FirstName "John" -LastName "Doe" -Department "IT" -Title "Developer"
    
.EXAMPLE
    Import-Csv users.csv | .\New-ADUserProvision.ps1 -Verbose
#>

[CmdletBinding(SupportsShouldProcess)]
param(
    [Parameter(Mandatory, ValueFromPipelineByPropertyName)]
    [ValidateNotNullOrEmpty()]
    [string]$FirstName,
    
    [Parameter(Mandatory, ValueFromPipelineByPropertyName)]
    [ValidateNotNullOrEmpty()]
    [string]$LastName,
    
    [Parameter(Mandatory, ValueFromPipelineByPropertyName)]
    [ValidateSet("IT", "Finance", "HR", "Marketing", "Sales", "Engineering", "Operations")]
    [string]$Department,
    
    [Parameter(ValueFromPipelineByPropertyName)]
    [string]$Title = "Employee",
    
    [Parameter(ValueFromPipelineByPropertyName)]
    [string]$Manager,
    
    [Parameter()]
    [string]$OUPath = "OU=Users,OU=Corporate,DC=company,DC=local",
    
    [Parameter()]
    [string]$HomeDriveRoot = "\\fileserver\home$",
    
    [Parameter()]
    [switch]$SendWelcomeEmail,
    
    [Parameter()]
    [string]$LogPath = "C:\Logs\IAM\Provisioning"
)

begin {
    #region Configuration
    $ErrorActionPreference = "Stop"
    $Script:ProvisionedCount = 0
    $Script:FailedCount = 0
    
    # Department to Security Group mapping
    $DepartmentGroups = @{
        "IT"          = @("SG-IT-Users", "SG-VPN-Access", "SG-RemoteDesktop")
        "Finance"     = @("SG-Finance-Users", "SG-Financial-Systems")
        "HR"          = @("SG-HR-Users", "SG-Employee-Records")
        "Marketing"   = @("SG-Marketing-Users", "SG-Social-Media-Tools")
        "Sales"       = @("SG-Sales-Users", "SG-CRM-Access")
        "Engineering" = @("SG-Engineering-Users", "SG-DevTools", "SG-SourceControl")
        "Operations"  = @("SG-Operations-Users", "SG-Monitoring-Tools")
    }
    
    # Title to additional groups mapping
    $TitleGroups = @{
        "Manager"   = @("SG-Managers", "SG-Expense-Approvers")
        "Director"  = @("SG-Directors", "SG-Managers", "SG-Budget-Access")
        "Executive" = @("SG-Executives", "SG-Directors", "SG-Confidential-Access")
    }
    #endregion
    
    #region Helper Functions
    function Write-AuditLog {
        param(
            [string]$Message,
            [ValidateSet("INFO", "WARNING", "ERROR", "SUCCESS")]
            [string]$Level = "INFO",
            [string]$Username
        )
        
        $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        $LogEntry = "[$Timestamp] [$Level] [$Username] $Message"
        
        # Ensure log directory exists
        if (-not (Test-Path $LogPath)) {
            New-Item -ItemType Directory -Path $LogPath -Force | Out-Null
        }
        
        $LogFile = Join-Path $LogPath "provision_$(Get-Date -Format 'yyyyMMdd').log"
        Add-Content -Path $LogFile -Value $LogEntry
        
        # Also write to verbose stream
        switch ($Level) {
            "ERROR"   { Write-Error $Message }
            "WARNING" { Write-Warning $Message }
            "SUCCESS" { Write-Host $Message -ForegroundColor Green }
            default   { Write-Verbose $Message }
        }
    }
    
    function New-SecurePassword {
        param([int]$Length = 16)
        
        $Chars = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
        $Password = -join ((1..$Length) | ForEach-Object { $Chars[(Get-Random -Maximum $Chars.Length)] })
        
        # Ensure complexity requirements
        if ($Password -notmatch "[A-Z]") { $Password = "A" + $Password.Substring(1) }
        if ($Password -notmatch "[a-z]") { $Password = $Password.Substring(0,1) + "a" + $Password.Substring(2) }
        if ($Password -notmatch "[0-9]") { $Password = $Password.Substring(0,2) + "1" + $Password.Substring(3) }
        if ($Password -notmatch "[!@#$%^&*]") { $Password = $Password.Substring(0,3) + "!" + $Password.Substring(4) }
        
        return $Password
    }
    
    function Get-SamAccountName {
        param([string]$First, [string]$Last)
        
        # Generate username: first initial + last name (max 20 chars)
        $Base = ($First.Substring(0,1) + $Last).ToLower() -replace "[^a-z0-9]", ""
        $SamAccountName = $Base.Substring(0, [Math]::Min(20, $Base.Length))
        
        # Check for conflicts and append number if needed
        $Counter = 1
        $Original = $SamAccountName
        while (Get-ADUser -Filter "SamAccountName -eq '$SamAccountName'" -ErrorAction SilentlyContinue) {
            $SamAccountName = "$Original$Counter"
            $Counter++
        }
        
        return $SamAccountName
    }
    #endregion
    
    # Verify AD module is available
    if (-not (Get-Module -ListAvailable -Name ActiveDirectory)) {
        throw "ActiveDirectory module is not installed. Install RSAT tools."
    }
    Import-Module ActiveDirectory -ErrorAction Stop
    
    Write-AuditLog -Message "=== IAM Provisioning Session Started ===" -Level "INFO" -Username $env:USERNAME
}

process {
    $SamAccountName = Get-SamAccountName -First $FirstName -Last $LastName
    $DisplayName = "$FirstName $LastName"
    $UPN = "$SamAccountName@company.local"
    $Email = "$SamAccountName@company.com"
    
    Write-AuditLog -Message "Starting provisioning for: $DisplayName ($SamAccountName)" -Level "INFO" -Username $SamAccountName
    
    try {
        #region Create AD User
        if ($PSCmdlet.ShouldProcess($SamAccountName, "Create AD User")) {
            $SecurePassword = New-SecurePassword | ConvertTo-SecureString -AsPlainText -Force
            
            $UserParams = @{
                Name              = $DisplayName
                GivenName         = $FirstName
                Surname           = $LastName
                SamAccountName    = $SamAccountName
                UserPrincipalName = $UPN
                EmailAddress      = $Email
                DisplayName       = $DisplayName
                Department        = $Department
                Title             = $Title
                Path              = $OUPath
                AccountPassword   = $SecurePassword
                Enabled           = $true
                ChangePasswordAtLogon = $true
                PasswordNeverExpires  = $false
            }
            
            if ($Manager) {
                $ManagerDN = (Get-ADUser -Filter "Name -eq '$Manager'" -ErrorAction SilentlyContinue).DistinguishedName
                if ($ManagerDN) {
                    $UserParams.Manager = $ManagerDN
                }
            }
            
            New-ADUser @UserParams
            Write-AuditLog -Message "Created AD user account" -Level "SUCCESS" -Username $SamAccountName
        }
        #endregion
        
        #region Assign Security Groups
        $GroupsToAssign = @("SG-Domain-Users", "SG-AllEmployees")  # Base groups
        
        # Add department-specific groups
        if ($DepartmentGroups.ContainsKey($Department)) {
            $GroupsToAssign += $DepartmentGroups[$Department]
        }
        
        # Add title-specific groups
        foreach ($TitleKey in $TitleGroups.Keys) {
            if ($Title -match $TitleKey) {
                $GroupsToAssign += $TitleGroups[$TitleKey]
            }
        }
        
        foreach ($Group in ($GroupsToAssign | Select-Object -Unique)) {
            try {
                if (Get-ADGroup -Filter "Name -eq '$Group'" -ErrorAction SilentlyContinue) {
                    Add-ADGroupMember -Identity $Group -Members $SamAccountName
                    Write-AuditLog -Message "Added to group: $Group" -Level "INFO" -Username $SamAccountName
                }
            }
            catch {
                Write-AuditLog -Message "Failed to add to group $Group`: $_" -Level "WARNING" -Username $SamAccountName
            }
        }
        #endregion
        
        #region Create Home Directory
        if ($PSCmdlet.ShouldProcess($SamAccountName, "Create Home Directory")) {
            $HomeDir = Join-Path $HomeDriveRoot $SamAccountName
            
            if (-not (Test-Path $HomeDir)) {
                New-Item -ItemType Directory -Path $HomeDir -Force | Out-Null
                
                # Set permissions (user = Full Control)
                $Acl = Get-Acl $HomeDir
                $AccessRule = New-Object System.Security.AccessControl.FileSystemAccessRule(
                    "$env:USERDOMAIN\$SamAccountName",
                    "FullControl",
                    "ContainerInherit,ObjectInherit",
                    "None",
                    "Allow"
                )
                $Acl.AddAccessRule($AccessRule)
                Set-Acl -Path $HomeDir -AclObject $Acl
                
                # Update AD user with home directory
                Set-ADUser -Identity $SamAccountName -HomeDrive "H:" -HomeDirectory $HomeDir
                
                Write-AuditLog -Message "Created home directory: $HomeDir" -Level "SUCCESS" -Username $SamAccountName
            }
        }
        #endregion
        
        #region Send Welcome Email
        if ($SendWelcomeEmail -and $PSCmdlet.ShouldProcess($Email, "Send Welcome Email")) {
            $EmailParams = @{
                To         = $Email
                From       = "it-automation@company.com"
                Subject    = "Welcome to Company - Your Account Details"
                Body       = @"
Welcome $FirstName,

Your corporate account has been created:

Username: $SamAccountName
Email: $Email
Department: $Department

Please contact the IT Help Desk to receive your initial password.

Best regards,
IT Department
"@
                SmtpServer = "smtp.company.local"
            }
            
            try {
                Send-MailMessage @EmailParams
                Write-AuditLog -Message "Welcome email sent" -Level "SUCCESS" -Username $SamAccountName
            }
            catch {
                Write-AuditLog -Message "Failed to send welcome email: $_" -Level "WARNING" -Username $SamAccountName
            }
        }
        #endregion
        
        $Script:ProvisionedCount++
        
        # Output provisioned user object
        [PSCustomObject]@{
            SamAccountName = $SamAccountName
            DisplayName    = $DisplayName
            Email          = $Email
            Department     = $Department
            Title          = $Title
            Status         = "Success"
            Timestamp      = Get-Date
        }
        
    }
    catch {
        $Script:FailedCount++
        Write-AuditLog -Message "FAILED: $_" -Level "ERROR" -Username $SamAccountName
        
        [PSCustomObject]@{
            SamAccountName = $SamAccountName
            DisplayName    = $DisplayName
            Status         = "Failed"
            Error          = $_.Exception.Message
            Timestamp      = Get-Date
        }
    }
}

end {
    Write-AuditLog -Message "=== Session Complete: $Script:ProvisionedCount succeeded, $Script:FailedCount failed ===" -Level "INFO" -Username $env:USERNAME
    
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "  IAM Provisioning Summary" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  Provisioned: $Script:ProvisionedCount" -ForegroundColor Green
    Write-Host "  Failed:      $Script:FailedCount" -ForegroundColor $(if ($Script:FailedCount -gt 0) { "Red" } else { "Green" })
    Write-Host "  Log File:    $LogPath" -ForegroundColor Gray
    Write-Host "========================================`n" -ForegroundColor Cyan
}

