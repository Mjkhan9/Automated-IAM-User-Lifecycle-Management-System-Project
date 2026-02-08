<#
.SYNOPSIS
    Synchronizes Active Directory group memberships based on HR data
    
.DESCRIPTION
    Reconciles AD group memberships with authoritative HR data source.
    Identifies and corrects unauthorized access, implements RBAC,
    and generates compliance audit reports.
    
.AUTHOR
    Mohammad Khan
    
.EXAMPLE
    .\Sync-ADGroupMembership.ps1 -HRDataPath "\\hr\data\employees.csv" -WhatIf
    
.EXAMPLE
    .\Sync-ADGroupMembership.ps1 -HRDataPath "employees.csv" -AutoRemediate -NotifyChanges
#>

[CmdletBinding(SupportsShouldProcess)]
param(
    [Parameter(Mandatory)]
    [ValidateScript({ Test-Path $_ })]
    [string]$HRDataPath,
    
    [Parameter()]
    [switch]$AutoRemediate,
    
    [Parameter()]
    [switch]$NotifyChanges,
    
    [Parameter()]
    [string]$ReportPath = "C:\Reports\IAM\GroupSync",
    
    [Parameter()]
    [string]$LogPath = "C:\Logs\IAM\GroupSync"
)

#region Configuration
$ErrorActionPreference = "Stop"

# Role-Based Access Control Matrix
# Maps Department + Title combinations to required security groups
$RBACMatrix = @{
    # IT Department
    "IT|Developer"      = @("SG-IT-Users", "SG-DevTools", "SG-SourceControl", "SG-VPN-Access")
    "IT|Administrator"  = @("SG-IT-Users", "SG-IT-Admins", "SG-ServerAccess", "SG-VPN-Access")
    "IT|Manager"        = @("SG-IT-Users", "SG-IT-Admins", "SG-Managers", "SG-VPN-Access")
    "IT|*"              = @("SG-IT-Users", "SG-VPN-Access")
    
    # Finance Department
    "Finance|Analyst"   = @("SG-Finance-Users", "SG-Financial-Systems", "SG-Reports-Read")
    "Finance|Manager"   = @("SG-Finance-Users", "SG-Financial-Systems", "SG-Managers", "SG-Budget-Access")
    "Finance|*"         = @("SG-Finance-Users")
    
    # HR Department
    "HR|Specialist"     = @("SG-HR-Users", "SG-Employee-Records", "SG-HRIS-Access")
    "HR|Manager"        = @("SG-HR-Users", "SG-Employee-Records", "SG-HRIS-Admin", "SG-Managers")
    "HR|*"              = @("SG-HR-Users")
    
    # Engineering Department
    "Engineering|Developer"  = @("SG-Engineering-Users", "SG-DevTools", "SG-SourceControl", "SG-AWS-Dev")
    "Engineering|Lead"       = @("SG-Engineering-Users", "SG-DevTools", "SG-SourceControl", "SG-AWS-Dev", "SG-Managers")
    "Engineering|*"          = @("SG-Engineering-Users", "SG-SourceControl")
    
    # Default
    "*|*" = @("SG-AllEmployees")
}

# Groups that should NEVER be auto-assigned (require manual approval)
$ProtectedGroups = @(
    "Domain Admins",
    "Enterprise Admins",
    "Schema Admins",
    "Administrators",
    "SG-Confidential-Access",
    "SG-PCI-Systems"
)
#endregion

#region Helper Functions
function Write-AuditLog {
    param(
        [string]$Message,
        [ValidateSet("INFO", "WARNING", "ERROR", "SUCCESS", "CHANGE")]
        [string]$Level = "INFO",
        [string]$Username = "SYSTEM"
    )
    
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogEntry = "[$Timestamp] [$Level] [$Username] $Message"
    
    if (-not (Test-Path $LogPath)) {
        New-Item -ItemType Directory -Path $LogPath -Force | Out-Null
    }
    
    $LogFile = Join-Path $LogPath "groupsync_$(Get-Date -Format 'yyyyMMdd').log"
    Add-Content -Path $LogFile -Value $LogEntry
    
    $Color = switch ($Level) {
        "ERROR"   { "Red" }
        "WARNING" { "Yellow" }
        "SUCCESS" { "Green" }
        "CHANGE"  { "Cyan" }
        default   { "White" }
    }
    Write-Host $LogEntry -ForegroundColor $Color
}

function Get-RequiredGroups {
    param(
        [string]$Department,
        [string]$Title
    )
    
    $Key = "$Department|$Title"
    
    # Try exact match
    if ($RBACMatrix.ContainsKey($Key)) {
        return $RBACMatrix[$Key]
    }
    
    # Try department wildcard
    $DeptWildcard = "$Department|*"
    if ($RBACMatrix.ContainsKey($DeptWildcard)) {
        return $RBACMatrix[$DeptWildcard]
    }
    
    # Return default
    return $RBACMatrix["*|*"]
}
#endregion

#region Main Script
Write-AuditLog "=== GROUP MEMBERSHIP SYNC STARTED ===" "INFO"
Write-AuditLog "HR Data Source: $HRDataPath" "INFO"
Write-AuditLog "Auto-Remediate: $AutoRemediate" "INFO"

Import-Module ActiveDirectory -ErrorAction Stop

# Load HR Data
$HRData = Import-Csv -Path $HRDataPath
Write-AuditLog "Loaded $($HRData.Count) employee records from HR" "INFO"

# Initialize tracking
$Results = @{
    Analyzed    = 0
    Compliant   = 0
    MissingAccess = @()
    ExcessAccess  = @()
    Remediated  = @()
    Errors      = @()
}

foreach ($Employee in $HRData) {
    $SamAccountName = $Employee.SamAccountName
    $Department = $Employee.Department
    $Title = $Employee.Title
    
    $Results.Analyzed++
    
    try {
        # Get current AD user and groups
        $ADUser = Get-ADUser -Identity $SamAccountName -Properties MemberOf -ErrorAction Stop
        $CurrentGroups = ($ADUser.MemberOf | ForEach-Object { 
            (Get-ADGroup $_).Name 
        }) | Where-Object { $_ -ne "Domain Users" }
        
        # Get required groups based on RBAC
        $RequiredGroups = Get-RequiredGroups -Department $Department -Title $Title
        
        # Find discrepancies
        $MissingGroups = $RequiredGroups | Where-Object { $_ -notin $CurrentGroups }
        $ExcessGroups = $CurrentGroups | Where-Object { 
            ($_ -notin $RequiredGroups) -and ($_ -notin $ProtectedGroups)
        }
        
        if ($MissingGroups.Count -eq 0 -and $ExcessGroups.Count -eq 0) {
            $Results.Compliant++
            continue
        }
        
        # Report missing access
        foreach ($Group in $MissingGroups) {
            $Results.MissingAccess += [PSCustomObject]@{
                SamAccountName = $SamAccountName
                Department     = $Department
                Title          = $Title
                Group          = $Group
                Action         = "ADD"
                Reason         = "Required by RBAC policy"
            }
            
            Write-AuditLog "MISSING: $SamAccountName should have $Group" "WARNING" $SamAccountName
            
            if ($AutoRemediate -and $PSCmdlet.ShouldProcess($SamAccountName, "Add to $Group")) {
                try {
                    Add-ADGroupMember -Identity $Group -Members $SamAccountName -ErrorAction Stop
                    Write-AuditLog "REMEDIATED: Added $SamAccountName to $Group" "CHANGE" $SamAccountName
                    $Results.Remediated += "$SamAccountName -> +$Group"
                }
                catch {
                    Write-AuditLog "Failed to add to $Group`: $_" "ERROR" $SamAccountName
                }
            }
        }
        
        # Report excess access
        foreach ($Group in $ExcessGroups) {
            $Results.ExcessAccess += [PSCustomObject]@{
                SamAccountName = $SamAccountName
                Department     = $Department
                Title          = $Title
                Group          = $Group
                Action         = "REMOVE"
                Reason         = "Not authorized by RBAC policy"
            }
            
            Write-AuditLog "EXCESS: $SamAccountName should NOT have $Group" "WARNING" $SamAccountName
            
            if ($AutoRemediate -and $PSCmdlet.ShouldProcess($SamAccountName, "Remove from $Group")) {
                try {
                    Remove-ADGroupMember -Identity $Group -Members $SamAccountName -Confirm:$false -ErrorAction Stop
                    Write-AuditLog "REMEDIATED: Removed $SamAccountName from $Group" "CHANGE" $SamAccountName
                    $Results.Remediated += "$SamAccountName -> -$Group"
                }
                catch {
                    Write-AuditLog "Failed to remove from $Group`: $_" "ERROR" $SamAccountName
                }
            }
        }
    }
    catch {
        Write-AuditLog "ERROR processing $SamAccountName`: $_" "ERROR" $SamAccountName
        $Results.Errors += "$SamAccountName`: $_"
    }
}

#region Generate Report
if (-not (Test-Path $ReportPath)) {
    New-Item -ItemType Directory -Path $ReportPath -Force | Out-Null
}

$ReportDate = Get-Date -Format "yyyyMMdd_HHmmss"

# Export discrepancies to CSV
if ($Results.MissingAccess.Count -gt 0) {
    $Results.MissingAccess | Export-Csv (Join-Path $ReportPath "MissingAccess_$ReportDate.csv") -NoTypeInformation
}

if ($Results.ExcessAccess.Count -gt 0) {
    $Results.ExcessAccess | Export-Csv (Join-Path $ReportPath "ExcessAccess_$ReportDate.csv") -NoTypeInformation
}
#endregion

#region Summary
Write-Host "`n" + "=" * 70 -ForegroundColor Cyan
Write-Host "  GROUP MEMBERSHIP SYNC SUMMARY" -ForegroundColor Cyan
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host "  Accounts Analyzed:    $($Results.Analyzed)" -ForegroundColor White
Write-Host "  Fully Compliant:      $($Results.Compliant)" -ForegroundColor Green
Write-Host "  Missing Access Found: $($Results.MissingAccess.Count)" -ForegroundColor Yellow
Write-Host "  Excess Access Found:  $($Results.ExcessAccess.Count)" -ForegroundColor Yellow
Write-Host "  Changes Remediated:   $($Results.Remediated.Count)" -ForegroundColor Cyan
Write-Host "  Errors:               $($Results.Errors.Count)" -ForegroundColor $(if ($Results.Errors.Count -gt 0) { "Red" } else { "Green" })
Write-Host "=" * 70 -ForegroundColor Cyan

$ComplianceRate = [math]::Round(($Results.Compliant / $Results.Analyzed) * 100, 1)
Write-Host "`n  Compliance Rate: $ComplianceRate%" -ForegroundColor $(
    if ($ComplianceRate -ge 95) { "Green" }
    elseif ($ComplianceRate -ge 80) { "Yellow" }
    else { "Red" }
)
Write-Host ""
#endregion

Write-AuditLog "=== GROUP MEMBERSHIP SYNC COMPLETE ===" "INFO"

# Return results for pipeline
return [PSCustomObject]@{
    Timestamp     = Get-Date
    Analyzed      = $Results.Analyzed
    Compliant     = $Results.Compliant
    ComplianceRate = $ComplianceRate
    MissingAccess = $Results.MissingAccess
    ExcessAccess  = $Results.ExcessAccess
    Remediated    = $Results.Remediated
    Errors        = $Results.Errors
}
#endregion

