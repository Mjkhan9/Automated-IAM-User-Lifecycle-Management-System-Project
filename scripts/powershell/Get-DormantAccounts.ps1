<#
.SYNOPSIS
    Identifies dormant Active Directory accounts for compliance review
    
.DESCRIPTION
    Scans Active Directory for accounts that haven't logged in within the
    specified threshold. Generates compliance reports and optionally
    disables accounts automatically.
    
.AUTHOR
    Mohammad Khan
    
.EXAMPLE
    .\Get-DormantAccounts.ps1 -DaysInactive 90 -ExportReport
    
.EXAMPLE
    .\Get-DormantAccounts.ps1 -DaysInactive 60 -AutoDisable -ExcludeServiceAccounts
#>

[CmdletBinding()]
param(
    [Parameter()]
    [ValidateRange(30, 365)]
    [int]$DaysInactive = 90,
    
    [Parameter()]
    [string]$SearchBase,
    
    [Parameter()]
    [switch]$ExcludeServiceAccounts,
    
    [Parameter()]
    [switch]$ExcludeDisabled,
    
    [Parameter()]
    [switch]$AutoDisable,
    
    [Parameter()]
    [switch]$ExportReport,
    
    [Parameter()]
    [string]$ReportPath = "C:\Reports\IAM\DormantAccounts",
    
    [Parameter()]
    [string[]]$NotifyManagers,
    
    [Parameter()]
    [string]$SmtpServer = "smtp.company.local"
)

#region Configuration
$ErrorActionPreference = "Stop"
$CutoffDate = (Get-Date).AddDays(-$DaysInactive)

# Service account patterns to exclude
$ServiceAccountPatterns = @(
    "^svc_*",
    "^service_*", 
    "^app_*",
    "^sql_*",
    "^admin_*",
    "*$"  # Computer accounts
)
#endregion

#region Helper Functions
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$Timestamp] [$Level] $Message" -ForegroundColor $(
        switch ($Level) {
            "ERROR"   { "Red" }
            "WARNING" { "Yellow" }
            "SUCCESS" { "Green" }
            default   { "White" }
        }
    )
}

function Test-IsServiceAccount {
    param([string]$SamAccountName)
    
    foreach ($Pattern in $ServiceAccountPatterns) {
        if ($SamAccountName -like $Pattern) { return $true }
    }
    return $false
}

function Get-RiskLevel {
    param($User)
    
    $Risk = "Low"
    $Factors = @()
    
    # High privilege indicators
    $PrivilegedGroups = @("Domain Admins", "Enterprise Admins", "Schema Admins", "Administrators")
    $UserGroups = (Get-ADPrincipalGroupMembership -Identity $User.SamAccountName -ErrorAction SilentlyContinue).Name
    
    if ($UserGroups | Where-Object { $_ -in $PrivilegedGroups }) {
        $Risk = "Critical"
        $Factors += "Member of privileged group"
    }
    
    # Long inactivity
    $DaysInactiveActual = ((Get-Date) - $User.LastLogonDate).Days
    if ($DaysInactiveActual -gt 180) {
        if ($Risk -ne "Critical") { $Risk = "High" }
        $Factors += "Inactive > 180 days"
    }
    elseif ($DaysInactiveActual -gt 120) {
        if ($Risk -notin @("Critical", "High")) { $Risk = "Medium" }
        $Factors += "Inactive > 120 days"
    }
    
    # Password never expires
    if ($User.PasswordNeverExpires) {
        if ($Risk -eq "Low") { $Risk = "Medium" }
        $Factors += "Password never expires"
    }
    
    return @{
        Level   = $Risk
        Factors = $Factors -join "; "
    }
}
#endregion

#region Main Script
Write-Log "=== Dormant Account Scan Started ===" "INFO"
Write-Log "Threshold: $DaysInactive days (cutoff: $($CutoffDate.ToString('yyyy-MM-dd')))" "INFO"

Import-Module ActiveDirectory -ErrorAction Stop

# Build LDAP filter
$LdapFilter = "(&(objectClass=user)(objectCategory=person)"
if ($ExcludeDisabled) {
    $LdapFilter += "(!(userAccountControl:1.2.840.113556.1.4.803:=2))"
}
$LdapFilter += ")"

# Query parameters
$QueryParams = @{
    Filter     = $LdapFilter
    Properties = @(
        "SamAccountName", "DisplayName", "EmailAddress", "Department",
        "Title", "Manager", "LastLogonDate", "WhenCreated", "Enabled",
        "PasswordLastSet", "PasswordNeverExpires", "DistinguishedName"
    )
}

if ($SearchBase) {
    $QueryParams.SearchBase = $SearchBase
}

Write-Log "Querying Active Directory..." "INFO"
$AllUsers = Get-ADUser @QueryParams

Write-Log "Found $($AllUsers.Count) total user accounts" "INFO"

# Filter dormant accounts
$DormantAccounts = $AllUsers | Where-Object {
    # Must have a last logon date older than threshold, or never logged in
    ($_.LastLogonDate -lt $CutoffDate) -or ($null -eq $_.LastLogonDate)
} | Where-Object {
    # Optionally exclude service accounts
    if ($ExcludeServiceAccounts) {
        -not (Test-IsServiceAccount -SamAccountName $_.SamAccountName)
    }
    else { $true }
}

Write-Log "Identified $($DormantAccounts.Count) dormant accounts" "WARNING"

# Process and enrich results
$Results = foreach ($User in $DormantAccounts) {
    $RiskAssessment = Get-RiskLevel -User $User
    $DaysInactiveActual = if ($User.LastLogonDate) { 
        [math]::Round(((Get-Date) - $User.LastLogonDate).TotalDays) 
    } else { 
        "Never" 
    }
    
    $ManagerName = if ($User.Manager) {
        (Get-ADUser -Identity $User.Manager -Properties DisplayName -ErrorAction SilentlyContinue).DisplayName
    } else { "N/A" }
    
    [PSCustomObject]@{
        SamAccountName    = $User.SamAccountName
        DisplayName       = $User.DisplayName
        Email             = $User.EmailAddress
        Department        = $User.Department
        Title             = $User.Title
        Manager           = $ManagerName
        LastLogon         = $User.LastLogonDate
        DaysInactive      = $DaysInactiveActual
        AccountCreated    = $User.WhenCreated
        Enabled           = $User.Enabled
        PasswordLastSet   = $User.PasswordLastSet
        PasswordNeverExpires = $User.PasswordNeverExpires
        RiskLevel         = $RiskAssessment.Level
        RiskFactors       = $RiskAssessment.Factors
        DistinguishedName = $User.DistinguishedName
    }
}

# Sort by risk level
$RiskOrder = @{ "Critical" = 0; "High" = 1; "Medium" = 2; "Low" = 3 }
$Results = $Results | Sort-Object { $RiskOrder[$_.RiskLevel] }, DaysInactive -Descending

#region Display Results
Write-Host "`n" + "=" * 80 -ForegroundColor Cyan
Write-Host "  DORMANT ACCOUNT COMPLIANCE REPORT" -ForegroundColor Cyan
Write-Host "  Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host "=" * 80 -ForegroundColor Cyan

$Summary = $Results | Group-Object RiskLevel
Write-Host "`n  Risk Summary:" -ForegroundColor Yellow
foreach ($Group in $Summary) {
    $Color = switch ($Group.Name) {
        "Critical" { "Red" }
        "High"     { "Magenta" }
        "Medium"   { "Yellow" }
        "Low"      { "Green" }
    }
    Write-Host "    $($Group.Name): $($Group.Count)" -ForegroundColor $Color
}
Write-Host ""

# Display top 20 highest risk
$Results | Select-Object -First 20 | Format-Table -AutoSize `
    SamAccountName, DisplayName, Department, DaysInactive, RiskLevel, Enabled
#endregion

#region Export Report
if ($ExportReport) {
    if (-not (Test-Path $ReportPath)) {
        New-Item -ItemType Directory -Path $ReportPath -Force | Out-Null
    }
    
    $ReportDate = Get-Date -Format "yyyyMMdd_HHmmss"
    $CsvPath = Join-Path $ReportPath "DormantAccounts_$ReportDate.csv"
    $HtmlPath = Join-Path $ReportPath "DormantAccounts_$ReportDate.html"
    
    # CSV Export
    $Results | Export-Csv -Path $CsvPath -NoTypeInformation
    Write-Log "CSV report exported: $CsvPath" "SUCCESS"
    
    # HTML Report
    $HtmlHeader = @"
<!DOCTYPE html>
<html>
<head>
    <title>Dormant Account Report - $ReportDate</title>
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        h1 { color: #333; border-bottom: 3px solid #0066cc; padding-bottom: 10px; }
        .summary { background: #fff; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .critical { background: #ffebee; }
        .high { background: #fff3e0; }
        .medium { background: #fffde7; }
        .low { background: #e8f5e9; }
        table { width: 100%; border-collapse: collapse; background: #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        th { background: #0066cc; color: white; padding: 12px; text-align: left; }
        td { padding: 10px; border-bottom: 1px solid #eee; }
        tr:hover { background: #f5f5f5; }
        .risk-critical { color: #c62828; font-weight: bold; }
        .risk-high { color: #ef6c00; font-weight: bold; }
        .risk-medium { color: #f9a825; }
        .risk-low { color: #2e7d32; }
    </style>
</head>
<body>
    <h1>🔒 Dormant Account Compliance Report</h1>
    <div class="summary">
        <p><strong>Generated:</strong> $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')</p>
        <p><strong>Threshold:</strong> $DaysInactive days of inactivity</p>
        <p><strong>Total Dormant:</strong> $($Results.Count) accounts</p>
    </div>
"@
    
    $HtmlTable = $Results | ConvertTo-Html -Fragment -Property `
        SamAccountName, DisplayName, Department, DaysInactive, RiskLevel, Enabled
    
    $HtmlFooter = "</body></html>"
    
    ($HtmlHeader + $HtmlTable + $HtmlFooter) | Out-File $HtmlPath -Encoding UTF8
    Write-Log "HTML report exported: $HtmlPath" "SUCCESS"
}
#endregion

#region Auto-Disable
if ($AutoDisable) {
    Write-Log "Auto-disable enabled - processing Critical and High risk accounts..." "WARNING"
    
    $ToDisable = $Results | Where-Object { $_.RiskLevel -in @("Critical", "High") -and $_.Enabled }
    
    foreach ($Account in $ToDisable) {
        try {
            Disable-ADAccount -Identity $Account.SamAccountName -WhatIf:$false
            Write-Log "DISABLED: $($Account.SamAccountName) (Risk: $($Account.RiskLevel))" "SUCCESS"
        }
        catch {
            Write-Log "Failed to disable $($Account.SamAccountName): $_" "ERROR"
        }
    }
}
#endregion

Write-Log "=== Dormant Account Scan Complete ===" "INFO"

# Return results for pipeline
return $Results
#endregion

