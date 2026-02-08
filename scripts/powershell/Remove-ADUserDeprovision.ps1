<#
.SYNOPSIS
    Automated Active Directory User Deprovisioning Script
    
.DESCRIPTION
    Securely offboards users by disabling accounts, removing group memberships,
    archiving data, and maintaining audit compliance. Follows enterprise security
    best practices for employee separation.
    
.AUTHOR
    Mohammad Khan
    
.EXAMPLE
    .\Remove-ADUserDeprovision.ps1 -SamAccountName "jdoe" -Reason "Resignation"
    
.EXAMPLE
    Get-Content terminated_users.txt | .\Remove-ADUserDeprovision.ps1 -Reason "Layoff" -ImmediateDisable
#>

[CmdletBinding(SupportsShouldProcess, ConfirmImpact = "High")]
param(
    [Parameter(Mandatory, ValueFromPipeline, ValueFromPipelineByPropertyName)]
    [ValidateNotNullOrEmpty()]
    [Alias("Username", "Identity")]
    [string]$SamAccountName,
    
    [Parameter(Mandatory)]
    [ValidateSet("Resignation", "Termination", "Layoff", "ContractEnd", "Transfer", "Other")]
    [string]$Reason,
    
    [Parameter()]
    [string]$TicketNumber,
    
    [Parameter()]
    [switch]$ImmediateDisable,
    
    [Parameter()]
    [switch]$PreserveMailbox,
    
    [Parameter()]
    [int]$RetentionDays = 90,
    
    [Parameter()]
    [string]$DisabledOU = "OU=Disabled Users,OU=Corporate,DC=company,DC=local",
    
    [Parameter()]
    [string]$ArchivePath = "\\fileserver\archive$\departed_users",
    
    [Parameter()]
    [string]$LogPath = "C:\Logs\IAM\Deprovisioning"
)

begin {
    $ErrorActionPreference = "Stop"
    $Script:ProcessedCount = 0
    $Script:FailedCount = 0
    
    function Write-AuditLog {
        param(
            [string]$Message,
            [ValidateSet("INFO", "WARNING", "ERROR", "SUCCESS", "SECURITY")]
            [string]$Level = "INFO",
            [string]$Username
        )
        
        $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        $LogEntry = "[$Timestamp] [$Level] [$Username] [Ticket:$TicketNumber] $Message"
        
        if (-not (Test-Path $LogPath)) {
            New-Item -ItemType Directory -Path $LogPath -Force | Out-Null
        }
        
        $LogFile = Join-Path $LogPath "deprovision_$(Get-Date -Format 'yyyyMMdd').log"
        Add-Content -Path $LogFile -Value $LogEntry
        
        # Security events also go to Windows Event Log
        if ($Level -eq "SECURITY") {
            Write-EventLog -LogName "Application" -Source "IAM-Automation" -EventId 1001 -EntryType Warning -Message $LogEntry -ErrorAction SilentlyContinue
        }
        
        switch ($Level) {
            "ERROR"    { Write-Error $Message }
            "WARNING"  { Write-Warning $Message }
            "SUCCESS"  { Write-Host $Message -ForegroundColor Green }
            "SECURITY" { Write-Host "[SECURITY] $Message" -ForegroundColor Yellow }
            default    { Write-Verbose $Message }
        }
    }
    
    Import-Module ActiveDirectory -ErrorAction Stop
    
    Write-AuditLog -Message "=== DEPROVISIONING SESSION STARTED ===" -Level "SECURITY" -Username $env:USERNAME
    Write-AuditLog -Message "Reason: $Reason | Operator: $env:USERNAME | Ticket: $TicketNumber" -Level "INFO" -Username "SYSTEM"
}

process {
    Write-AuditLog -Message "Starting deprovisioning for: $SamAccountName" -Level "SECURITY" -Username $SamAccountName
    
    try {
        # Verify user exists
        $User = Get-ADUser -Identity $SamAccountName -Properties * -ErrorAction Stop
        $DisplayName = $User.DisplayName
        $Email = $User.EmailAddress
        
        Write-AuditLog -Message "User found: $DisplayName ($Email)" -Level "INFO" -Username $SamAccountName
        
        #region Step 1: Immediate Account Disable
        if ($ImmediateDisable -or $Reason -in @("Termination", "Layoff")) {
            if ($PSCmdlet.ShouldProcess($SamAccountName, "Disable Account Immediately")) {
                Disable-ADAccount -Identity $SamAccountName
                Write-AuditLog -Message "Account DISABLED (immediate)" -Level "SECURITY" -Username $SamAccountName
            }
        }
        #endregion
        
        #region Step 2: Reset Password (Revoke Active Sessions)
        if ($PSCmdlet.ShouldProcess($SamAccountName, "Reset Password")) {
            $RandomPassword = [System.Web.Security.Membership]::GeneratePassword(32, 8)
            Set-ADAccountPassword -Identity $SamAccountName -NewPassword (ConvertTo-SecureString $RandomPassword -AsPlainText -Force) -Reset
            Write-AuditLog -Message "Password reset (sessions invalidated)" -Level "SECURITY" -Username $SamAccountName
        }
        #endregion
        
        #region Step 3: Remove All Group Memberships
        if ($PSCmdlet.ShouldProcess($SamAccountName, "Remove Group Memberships")) {
            $Groups = Get-ADPrincipalGroupMembership -Identity $SamAccountName | Where-Object { $_.Name -ne "Domain Users" }
            $GroupList = @()
            
            foreach ($Group in $Groups) {
                try {
                    Remove-ADGroupMember -Identity $Group -Members $SamAccountName -Confirm:$false
                    $GroupList += $Group.Name
                }
                catch {
                    Write-AuditLog -Message "Failed to remove from group: $($Group.Name)" -Level "WARNING" -Username $SamAccountName
                }
            }
            
            Write-AuditLog -Message "Removed from $($GroupList.Count) groups: $($GroupList -join ', ')" -Level "INFO" -Username $SamAccountName
        }
        #endregion
        
        #region Step 4: Archive Home Directory
        if ($PSCmdlet.ShouldProcess($SamAccountName, "Archive Home Directory")) {
            $HomeDir = $User.HomeDirectory
            
            if ($HomeDir -and (Test-Path $HomeDir)) {
                $ArchiveDate = Get-Date -Format "yyyyMMdd"
                $ArchiveFolder = Join-Path $ArchivePath "$SamAccountName`_$ArchiveDate"
                
                # Create archive with metadata
                New-Item -ItemType Directory -Path $ArchiveFolder -Force | Out-Null
                
                # Copy home directory
                Copy-Item -Path "$HomeDir\*" -Destination $ArchiveFolder -Recurse -Force -ErrorAction SilentlyContinue
                
                # Create metadata file
                $Metadata = @{
                    Username        = $SamAccountName
                    DisplayName     = $DisplayName
                    Email           = $Email
                    Department      = $User.Department
                    Title           = $User.Title
                    Manager         = $User.Manager
                    Reason          = $Reason
                    TicketNumber    = $TicketNumber
                    ArchivedBy      = $env:USERNAME
                    ArchivedDate    = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
                    RetentionDays   = $RetentionDays
                    DeleteAfter     = (Get-Date).AddDays($RetentionDays).ToString("yyyy-MM-dd")
                    OriginalPath    = $HomeDir
                    GroupMemberships = $GroupList
                }
                
                $Metadata | ConvertTo-Json -Depth 3 | Out-File (Join-Path $ArchiveFolder "_ARCHIVE_METADATA.json")
                
                Write-AuditLog -Message "Home directory archived to: $ArchiveFolder" -Level "SUCCESS" -Username $SamAccountName
                
                # Remove original home directory
                Remove-Item -Path $HomeDir -Recurse -Force -ErrorAction SilentlyContinue
                Write-AuditLog -Message "Original home directory removed" -Level "INFO" -Username $SamAccountName
            }
        }
        #endregion
        
        #region Step 5: Update User Attributes
        if ($PSCmdlet.ShouldProcess($SamAccountName, "Update User Attributes")) {
            $Description = "DEPROVISIONED: $Reason on $(Get-Date -Format 'yyyy-MM-dd') by $env:USERNAME [Ticket: $TicketNumber]"
            
            Set-ADUser -Identity $SamAccountName -Description $Description -Clear Manager
            Set-ADUser -Identity $SamAccountName -Replace @{
                extensionAttribute1 = "DEPROVISIONED"
                extensionAttribute2 = $Reason
                extensionAttribute3 = Get-Date -Format "yyyy-MM-dd"
            }
            
            Write-AuditLog -Message "User attributes updated for compliance tracking" -Level "INFO" -Username $SamAccountName
        }
        #endregion
        
        #region Step 6: Move to Disabled OU
        if ($PSCmdlet.ShouldProcess($SamAccountName, "Move to Disabled OU")) {
            Move-ADObject -Identity $User.DistinguishedName -TargetPath $DisabledOU
            Write-AuditLog -Message "Moved to Disabled OU: $DisabledOU" -Level "INFO" -Username $SamAccountName
        }
        #endregion
        
        #region Step 7: Final Disable (if not already)
        if (-not $ImmediateDisable) {
            if ($PSCmdlet.ShouldProcess($SamAccountName, "Disable Account")) {
                Disable-ADAccount -Identity $SamAccountName
                Write-AuditLog -Message "Account DISABLED (final)" -Level "SECURITY" -Username $SamAccountName
            }
        }
        #endregion
        
        $Script:ProcessedCount++
        Write-AuditLog -Message "=== DEPROVISIONING COMPLETE ===" -Level "SUCCESS" -Username $SamAccountName
        
        # Output result object
        [PSCustomObject]@{
            SamAccountName  = $SamAccountName
            DisplayName     = $DisplayName
            Email           = $Email
            Reason          = $Reason
            TicketNumber    = $TicketNumber
            Status          = "Deprovisioned"
            ArchivedTo      = $ArchiveFolder
            ProcessedBy     = $env:USERNAME
            Timestamp       = Get-Date
        }
        
    }
    catch {
        $Script:FailedCount++
        Write-AuditLog -Message "DEPROVISIONING FAILED: $_" -Level "ERROR" -Username $SamAccountName
        
        [PSCustomObject]@{
            SamAccountName = $SamAccountName
            Status         = "Failed"
            Error          = $_.Exception.Message
            Timestamp      = Get-Date
        }
    }
}

end {
    Write-AuditLog -Message "=== SESSION COMPLETE: $Script:ProcessedCount deprovisioned, $Script:FailedCount failed ===" -Level "SECURITY" -Username $env:USERNAME
    
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "  Deprovisioning Summary" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  Processed: $Script:ProcessedCount" -ForegroundColor Green
    Write-Host "  Failed:    $Script:FailedCount" -ForegroundColor $(if ($Script:FailedCount -gt 0) { "Red" } else { "Green" })
    Write-Host "  Reason:    $Reason" -ForegroundColor Gray
    Write-Host "  Ticket:    $TicketNumber" -ForegroundColor Gray
    Write-Host "  Log File:  $LogPath" -ForegroundColor Gray
    Write-Host "========================================`n" -ForegroundColor Cyan
}

