// IAM Automation Dashboard JavaScript

document.getElementById('provisionForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const email = document.getElementById('email').value;
    const department = document.getElementById('department').value;
    const role = document.getElementById('role').value;
    const username = (firstName.charAt(0) + lastName).toLowerCase();
    
    const consoleEl = document.getElementById('console');
    consoleEl.innerHTML = '';
    
    const steps = [
        { delay: 0, text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', color: '#60A5FA' },
        { delay: 100, text: '🔄 IAM Provisioning Workflow Started', color: '#60A5FA' },
        { delay: 300, text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', color: '#60A5FA' },
        { delay: 600, text: '' },
        { delay: 800, text: '📝 User: ' + firstName + ' ' + lastName },
        { delay: 1200, text: '📧 Email: ' + email },
        { delay: 1600, text: '🏢 Department: ' + department },
        { delay: 2000, text: '👤 Role: ' + role },
        { delay: 2400, text: '' },
        { delay: 2600, text: '🔍 Validating user data...', color: '#F59E0B' },
        { delay: 3200, text: '✅ Validation passed', color: '#10B981' },
        { delay: 3600, text: '' },
        { delay: 3800, text: '🔐 Creating AWS IAM user...', color: '#F59E0B' },
        { delay: 4400, text: '✅ IAM user created: ' + username, color: '#10B981' },
        { delay: 4800, text: '   ARN: arn:aws:iam::123456789012:user/' + username, color: '#6B7280' },
        { delay: 5200, text: '' },
        { delay: 5400, text: '🔑 Generating access keys...', color: '#F59E0B' },
        { delay: 6000, text: '✅ Access keys generated', color: '#10B981' },
        { delay: 6300, text: '   Access Key: AKIAXXXXXXXXXXXXXXXX', color: '#6B7280' },
        { delay: 6600, text: '' },
        { delay: 6800, text: '📦 Storing credentials in S3...', color: '#F59E0B' },
        { delay: 7400, text: '✅ Stored: s3://iam-creds/' + username + '.json', color: '#10B981' },
        { delay: 7700, text: '   Encryption: AES-256', color: '#6B7280' },
        { delay: 8000, text: '' },
        { delay: 8200, text: '👥 Adding to Department-' + department, color: '#F59E0B' },
        { delay: 8800, text: '✅ Group membership assigned', color: '#10B981' },
        { delay: 9100, text: '' },
        { delay: 9300, text: '🔒 Attaching policy: ' + getRolePolicy(role), color: '#F59E0B' },
        { delay: 9900, text: '✅ Policy attached', color: '#10B981' },
        { delay: 10200, text: '' },
        { delay: 10400, text: '📧 Sending SNS notification...', color: '#F59E0B' },
        { delay: 11000, text: '✅ Manager notified', color: '#10B981' },
        { delay: 11300, text: '' },
        { delay: 11500, text: '📊 Writing to CloudTrail...', color: '#F59E0B' },
        { delay: 12100, text: '✅ Audit event logged', color: '#10B981' },
        { delay: 12400, text: '' },
        { delay: 12600, text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', color: '#10B981' },
        { delay: 12800, text: '✨ PROVISIONING COMPLETE ✨', color: '#10B981', bold: true },
        { delay: 13000, text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', color: '#10B981' },
        { delay: 13200, text: '' },
        { delay: 13400, text: '📋 SUMMARY:', color: '#60A5FA', bold: true },
        { delay: 13600, text: '   👤 Username: ' + username },
        { delay: 13800, text: '   📧 Email: ' + email },
        { delay: 14000, text: '   🏢 Department: ' + department },
        { delay: 14200, text: '   💼 Role: ' + role },
        { delay: 14400, text: '   ✅ Status: Active' },
        { delay: 14600, text: '   🔐 MFA: Required on first login' },
        { delay: 14800, text: '' },
        { delay: 15000, text: '⏱️  Execution time: 8.7 seconds', color: '#60A5FA' },
        { delay: 15200, text: '💾 Data archived for compliance', color: '#60A5FA' },
        { delay: 15400, text: '🎉 Welcome, ' + firstName + '!', color: '#10B981' }
    ];
    
    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const prevDelay = i > 0 ? steps[i - 1].delay : 0;
        await new Promise(r => setTimeout(r, step.delay - prevDelay));
        
        const line = document.createElement('div');
        line.className = 'console-line';
        line.textContent = step.text;
        
        if (step.color) line.style.color = step.color;
        if (step.bold) line.style.fontWeight = 'bold';
        
        consoleEl.appendChild(line);
        consoleEl.scrollTop = consoleEl.scrollHeight;
    }
});

function getRolePolicy(role) {
    const policies = {
        'Developer': 'PowerUserAccess',
        'Analyst': 'ReadOnlyAccess',
        'Admin': 'AdministratorAccess',
        'Manager': 'ViewOnlyAccess'
    };
    return policies[role] || 'ReadOnlyAccess';
}

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

console.log('🚀 IAM Dashboard loaded successfully');
// ================================
// PAGE NAVIGATION HANDLERS (FIX)
// ================================
function showProvision() {
    document.querySelector('#provision')?.scrollIntoView({ behavior: 'smooth' });
}

function showDeprovision() {
    window.location.href = "deprovision.html";
}

function showCompliance() {
    window.location.href = "compliance.html";
}

function showAudit() {
    window.location.href = "audit.html";
}

function showScripts() {
    window.location.href = "scripts.html";
}
