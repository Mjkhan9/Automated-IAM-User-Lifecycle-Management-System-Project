<#
.SYNOPSIS
    Pester tests for New-ADUserProvision.ps1
    
.DESCRIPTION
    Unit tests for the AD user provisioning script including:
    - Username generation
    - Password generation
    - Input validation
    
.AUTHOR
    Mohammad Khan
#>

BeforeAll {
    # Source the script functions (mock the script execution)
    # Note: In production, you'd dot-source the script with functions extracted
    
    # Mock functions for testing
    function Get-SamAccountName {
        param([string]$First, [string]$Last)
        
        $Base = ($First.Substring(0,1) + $Last).ToLower() -replace "[^a-z0-9]", ""
        $SamAccountName = $Base.Substring(0, [Math]::Min(20, $Base.Length))
        
        return $SamAccountName
    }
    
    function New-SecurePassword {
        param(
            [int]$Length = 16,
            [int]$SpecialCharCount = 4
        )
        
        # Use .NET's cryptographic random generator
        Add-Type -AssemblyName System.Web
        
        do {
            $password = [System.Web.Security.Membership]::GeneratePassword($Length, $SpecialCharCount)
            
            # Validate complexity
            $hasUpper = $password -cmatch '[A-Z]'
            $hasLower = $password -cmatch '[a-z]'
            $hasDigit = $password -match '\d'
            $hasSpecial = $password -match '[!@#$%^&*()_+=\-\[\]{}|;:,.<>?]'
            
        } while (-not ($hasUpper -and $hasLower -and $hasDigit -and $hasSpecial))
        
        return $password
    }
    
    function Test-UserInput {
        param(
            [string]$FirstName,
            [string]$LastName,
            [string]$Email
        )
        
        $errors = @()
        
        if ($FirstName -notmatch '^[a-zA-Z\-]{2,50}$') {
            $errors += "Invalid first name format"
        }
        
        if ($LastName -notmatch '^[a-zA-Z\-]{2,50}$') {
            $errors += "Invalid last name format"
        }
        
        if ($Email -notmatch '^[\w\.\-]+@[\w\.\-]+\.\w{2,}$') {
            $errors += "Invalid email format"
        }
        
        return @{
            IsValid = $errors.Count -eq 0
            Errors = $errors
        }
    }
}

Describe "Get-SamAccountName" {
    Context "When generating username from name" {
        It "Should create first initial + lastname format" {
            $result = Get-SamAccountName -First "John" -Last "Smith"
            $result | Should -Be "jsmith"
        }
        
        It "Should handle lowercase conversion" {
            $result = Get-SamAccountName -First "JANE" -Last "DOE"
            $result | Should -Be "jdoe"
        }
        
        It "Should remove special characters" {
            $result = Get-SamAccountName -First "Mary-Jane" -Last "O'Connor"
            $result | Should -Match "^[a-z0-9]+$"
        }
        
        It "Should truncate long names to 20 characters" {
            $result = Get-SamAccountName -First "A" -Last "Verylonglastnamethatexceedstwentycharacters"
            $result.Length | Should -BeLessOrEqual 20
        }
        
        It "Should handle single character first name" {
            $result = Get-SamAccountName -First "J" -Last "Doe"
            $result | Should -Be "jdoe"
        }
        
        It "Should handle hyphenated last names" {
            $result = Get-SamAccountName -First "John" -Last "Smith-Jones"
            $result | Should -Match "^j"
        }
    }
}

Describe "New-SecurePassword" {
    Context "When generating password" {
        It "Should meet default length requirement of 16" {
            $password = New-SecurePassword
            $password.Length | Should -BeGreaterOrEqual 16
        }
        
        It "Should meet custom length requirement" {
            $password = New-SecurePassword -Length 20
            $password.Length | Should -BeGreaterOrEqual 20
        }
        
        It "Should contain uppercase letters" {
            $password = New-SecurePassword
            $password | Should -Match "[A-Z]"
        }
        
        It "Should contain lowercase letters" {
            $password = New-SecurePassword
            $password | Should -Match "[a-z]"
        }
        
        It "Should contain numbers" {
            $password = New-SecurePassword
            $password | Should -Match "\d"
        }
        
        It "Should contain special characters" {
            $password = New-SecurePassword -SpecialCharCount 4
            $password | Should -Match "[^a-zA-Z0-9]"
        }
        
        It "Should generate unique passwords" {
            $passwords = @()
            for ($i = 0; $i -lt 10; $i++) {
                $passwords += New-SecurePassword
            }
            $uniquePasswords = $passwords | Select-Object -Unique
            $uniquePasswords.Count | Should -Be 10
        }
    }
}

Describe "Test-UserInput" {
    Context "When validating valid input" {
        It "Should accept valid simple names" {
            $result = Test-UserInput -FirstName "John" -LastName "Smith" -Email "john@company.com"
            $result.IsValid | Should -Be $true
            $result.Errors.Count | Should -Be 0
        }
        
        It "Should accept hyphenated names" {
            $result = Test-UserInput -FirstName "Mary-Jane" -LastName "Smith-Jones" -Email "mj@company.com"
            $result.IsValid | Should -Be $true
        }
        
        It "Should accept email with subdomain" {
            $result = Test-UserInput -FirstName "John" -LastName "Smith" -Email "john@mail.company.com"
            $result.IsValid | Should -Be $true
        }
    }
    
    Context "When validating invalid first name" {
        It "Should reject names with numbers" {
            $result = Test-UserInput -FirstName "John123" -LastName "Smith" -Email "john@company.com"
            $result.IsValid | Should -Be $false
            $result.Errors | Should -Contain "Invalid first name format"
        }
        
        It "Should reject names that are too short" {
            $result = Test-UserInput -FirstName "J" -LastName "Smith" -Email "j@company.com"
            $result.IsValid | Should -Be $false
            $result.Errors | Should -Contain "Invalid first name format"
        }
        
        It "Should reject names with special characters" {
            $result = Test-UserInput -FirstName "John@" -LastName "Smith" -Email "john@company.com"
            $result.IsValid | Should -Be $false
        }
    }
    
    Context "When validating invalid last name" {
        It "Should reject names with numbers" {
            $result = Test-UserInput -FirstName "John" -LastName "Smith123" -Email "john@company.com"
            $result.IsValid | Should -Be $false
            $result.Errors | Should -Contain "Invalid last name format"
        }
        
        It "Should reject names that are too short" {
            $result = Test-UserInput -FirstName "John" -LastName "S" -Email "john@company.com"
            $result.IsValid | Should -Be $false
        }
    }
    
    Context "When validating invalid email" {
        It "Should reject email without @ symbol" {
            $result = Test-UserInput -FirstName "John" -LastName "Smith" -Email "johncompany.com"
            $result.IsValid | Should -Be $false
            $result.Errors | Should -Contain "Invalid email format"
        }
        
        It "Should reject email without domain" {
            $result = Test-UserInput -FirstName "John" -LastName "Smith" -Email "john@"
            $result.IsValid | Should -Be $false
            $result.Errors | Should -Contain "Invalid email format"
        }
        
        It "Should reject email without TLD" {
            $result = Test-UserInput -FirstName "John" -LastName "Smith" -Email "john@company"
            $result.IsValid | Should -Be $false
        }
        
        It "Should reject email with spaces" {
            $result = Test-UserInput -FirstName "John" -LastName "Smith" -Email "john smith@company.com"
            $result.IsValid | Should -Be $false
        }
    }
    
    Context "When validating multiple errors" {
        It "Should return all validation errors" {
            $result = Test-UserInput -FirstName "J" -LastName "S" -Email "invalid"
            $result.IsValid | Should -Be $false
            $result.Errors.Count | Should -BeGreaterThan 1
        }
    }
}

Describe "Department Group Mappings" {
    BeforeAll {
        $DepartmentGroups = @{
            "IT"          = @("SG-IT-Users", "SG-VPN-Access", "SG-RemoteDesktop")
            "Finance"     = @("SG-Finance-Users", "SG-Financial-Systems")
            "HR"          = @("SG-HR-Users", "SG-Employee-Records")
            "Marketing"   = @("SG-Marketing-Users", "SG-Social-Media-Tools")
            "Sales"       = @("SG-Sales-Users", "SG-CRM-Access")
            "Engineering" = @("SG-Engineering-Users", "SG-DevTools", "SG-SourceControl")
            "Operations"  = @("SG-Operations-Users", "SG-Monitoring-Tools")
        }
    }
    
    Context "When checking department mappings" {
        It "Should have IT department groups" {
            $DepartmentGroups.ContainsKey("IT") | Should -Be $true
            $DepartmentGroups["IT"] | Should -Contain "SG-IT-Users"
        }
        
        It "Should have Finance department groups" {
            $DepartmentGroups.ContainsKey("Finance") | Should -Be $true
            $DepartmentGroups["Finance"] | Should -Contain "SG-Finance-Users"
        }
        
        It "Should have Engineering department groups" {
            $DepartmentGroups.ContainsKey("Engineering") | Should -Be $true
            $DepartmentGroups["Engineering"] | Should -Contain "SG-Engineering-Users"
            $DepartmentGroups["Engineering"] | Should -Contain "SG-DevTools"
        }
        
        It "Should have all standard departments" {
            $expectedDepts = @("IT", "Finance", "HR", "Marketing", "Sales", "Engineering", "Operations")
            foreach ($dept in $expectedDepts) {
                $DepartmentGroups.ContainsKey($dept) | Should -Be $true
            }
        }
    }
}

Describe "Title Group Mappings" {
    BeforeAll {
        $TitleGroups = @{
            "Manager"   = @("SG-Managers", "SG-Expense-Approvers")
            "Director"  = @("SG-Directors", "SG-Managers", "SG-Budget-Access")
            "Executive" = @("SG-Executives", "SG-Directors", "SG-Confidential-Access")
        }
    }
    
    Context "When checking title mappings" {
        It "Should have Manager title groups" {
            $TitleGroups.ContainsKey("Manager") | Should -Be $true
            $TitleGroups["Manager"] | Should -Contain "SG-Managers"
        }
        
        It "Should have Director title groups including Manager groups" {
            $TitleGroups["Director"] | Should -Contain "SG-Directors"
            $TitleGroups["Director"] | Should -Contain "SG-Managers"
        }
        
        It "Should have Executive title groups with confidential access" {
            $TitleGroups["Executive"] | Should -Contain "SG-Executives"
            $TitleGroups["Executive"] | Should -Contain "SG-Confidential-Access"
        }
    }
}

