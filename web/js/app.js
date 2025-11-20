// IAM Automation Dashboard JavaScript

const policies = {
    Developer: {
        name: 'PowerUserAccess',
        statement: 'Allows full access to AWS services except IAM management',
    },
    Analyst: {
        name: 'ReadOnlyAccess',
        statement: 'Read-only access to all resources',
    },
    Admin: {
        name: 'AdministratorAccess',
        statement: 'Full administrative access',
    },
    Manager: {
        name: 'ViewOnlyAccess',
        statement: 'View billing and reporting dashboards',
    },
};

const auditEvents = [
    { user: 'jdoe', action: 'Provision', system: 'AWS', time: '2024-06-01T12:30:00Z', status: 'SUCCESS' },
    { user: 'asmith', action: 'Deprovision', system: 'AD', time: '2024-06-01T09:15:00Z', status: 'SUCCESS' },
    { user: 'jdoe', action: 'Policy', system: 'AWS', time: '2024-06-01T08:00:00Z', status: 'CHANGED' },
    { user: 'lgreen', action: 'Provision', system: 'AD', time: '2024-05-31T20:11:00Z', status: 'SUCCESS' },
    { user: 'mmartinez', action: 'Provision', system: 'AWS', time: '2024-05-31T19:44:00Z', status: 'SUCCESS' },
    { user: 'bwayne', action: 'Deprovision', system: 'AWS', time: '2024-05-31T16:20:00Z', status: 'SUCCESS' },
];

const dormantUsers = [
    { user: 'kpatel', system: 'AWS', lastSeen: 52, nextAction: 'Archive keys' },
    { user: 'lgreen', system: 'AD', lastSeen: 41, nextAction: 'Disable account' },
    { user: 'mmartinez', system: 'AWS', lastSeen: 33, nextAction: 'Notify manager' },
];

const complianceMetrics = {
    mfaCoverage: 0.96,
    dormant: dormantUsers.length,
    accessCert: 0.92,
    usersManaged: 8421,
    timeSavings: 0.42,
    incidents: 0,
};

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function addConsoleLine(text, options = {}) {
    const consoleEl = document.getElementById('console');
    const line = document.createElement('div');
    line.className = 'console-line';
    line.textContent = text;
    if (options.color) line.style.color = options.color;
    if (options.bold) line.style.fontWeight = '700';
    consoleEl.appendChild(line);
    consoleEl.scrollTop = consoleEl.scrollHeight;
}

function setStatus(message, type = 'info') {
    const formStatus = document.getElementById('formStatus');
    if (!formStatus) return;
    formStatus.textContent = message;
    formStatus.className = `form-status ${type}`;
}

function updatePolicyPreview(role) {
    const preview = document.getElementById('policyPreview');
    const title = document.getElementById('policyTitle');
    const policy = policies[role];

    if (!preview || !title) return;

    if (!policy) {
        title.textContent = 'Select a role to view policy';
        preview.textContent = '{\n  "Version": "2012-10-17",\n  "Statement": []\n}';
        return;
    }

    title.textContent = `${policy.name} (${role})`;
    preview.textContent = `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "*",
      "Resource": "*",
      "Description": "${policy.statement}"
    }
  ]
}`;
}

function renderAuditRows(events) {
    const body = document.getElementById('auditBody');
    if (!body) return;
    body.innerHTML = '';

    events.forEach((event) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${event.user}</td>
            <td><span class="pill pill-${event.action.toLowerCase()}">${event.action}</span></td>
            <td>${event.system}</td>
            <td>${formatDate(event.time)}</td>
            <td><span class="status status-${event.status.toLowerCase()}">${event.status}</span></td>
        `;
        body.appendChild(row);
    });
}

function renderDormantUsers() {
    const body = document.getElementById('dormantBody');
    if (!body) return;
    body.innerHTML = '';

    dormantUsers.forEach((user) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.user}</td>
            <td>${user.system}</td>
            <td>${user.lastSeen} days</td>
            <td>${user.nextAction}</td>
        `;
        body.appendChild(row);
    });
}

function updateKPIs() {
    document.getElementById('kpi-users').textContent = complianceMetrics.usersManaged.toLocaleString();
    document.getElementById('kpi-savings').textContent = `${Math.round(complianceMetrics.timeSavings * 100)}%`;
    document.getElementById('kpi-compliance').textContent = `${Math.round(complianceMetrics.accessCert * 100)}%`;
    document.getElementById('kpi-incidents').textContent = complianceMetrics.incidents;
}

function updateCompliance() {
    document.getElementById('mfaCoverage').textContent = `${Math.round(complianceMetrics.mfaCoverage * 100)}%`;
    document.getElementById('dormantCount').textContent = complianceMetrics.dormant;
    document.getElementById('accessCert').textContent = `${Math.round(complianceMetrics.accessCert * 100)}%`;
    document.getElementById('mfaBar').style.width = `${complianceMetrics.mfaCoverage * 100}%`;
}

function updateAuditKPIs(filtered) {
    const lastDay = new Date();
    lastDay.setHours(lastDay.getHours() - 24);

    const inWindow = filtered.filter((e) => new Date(e.time) >= lastDay);
    document.getElementById('kpiEvents').textContent = inWindow.length;
    document.getElementById('kpiProvisioning').textContent = inWindow.filter((e) => e.action === 'Provision').length;
    document.getElementById('kpiDeprovisioning').textContent = inWindow.filter((e) => e.action === 'Deprovision').length;
}

function initNav() {
    const links = document.querySelectorAll('nav a');
    links.forEach((link) => {
        link.addEventListener('click', () => {
            links.forEach((l) => l.classList.remove('active'));
            link.classList.add('active');
        });
    });
}

function addSeparator() {
    const consoleEl = document.getElementById('console');
    const line = document.createElement('div');
    line.innerHTML = '<div style="color: #10B981; font-weight: bold; font-size: 1.1rem;">━━━━━━━━━━━━━━━━━━━━━━━</div>';
    consoleEl.appendChild(line);
}

document.getElementById('role')?.addEventListener('change', (e) => {
    updatePolicyPreview(e.target.value);
});

document.getElementById('provisionForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const email = document.getElementById('email').value.trim();
    const department = document.getElementById('department').value;
    const role = document.getElementById('role').value;

    if (!firstName || !lastName || !email || !department || !role) {
        setStatus('Please fill out all fields to provision a user.', 'error');
        return;
    }

    const username = (firstName.charAt(0) + lastName).toLowerCase();
    const groupName = `GRP_${department.toUpperCase()}`;
    const policy = policies[role];
    const accessKey = `AKIA${Math.random().toString(36).substring(2, 10).toUpperCase()}****`;
    const s3Path = `s3://iam-credentials/${username}.json`;

    const consoleEl = document.getElementById('console');
    consoleEl.innerHTML = '';
    setStatus('Provisioning in progress...');
    addConsoleLine(`🔄 Starting provisioning for ${firstName} ${lastName}`);
    addConsoleLine('📝 Validating user data...');
    await new Promise((r) => setTimeout(r, 400));
    addConsoleLine('✅ Validation complete', { color: '#10B981' });
    addConsoleLine(`🔐 Creating AWS IAM user: ${username}`);
    await new Promise((r) => setTimeout(r, 400));
    addConsoleLine(`✅ IAM user created: arn:aws:iam::123456789012:user/${username}`, { color: '#10B981' });
    addConsoleLine('🔑 Generating access keys...');
    await new Promise((r) => setTimeout(r, 400));
    addConsoleLine(`✅ Access keys created: ${accessKey}`, { color: '#10B981' });
    addConsoleLine('📦 Storing encrypted credentials in S3...');
    await new Promise((r) => setTimeout(r, 400));
    addConsoleLine(`✅ Credentials stored: ${s3Path}`, { color: '#10B981' });
    addConsoleLine(`👥 Adding to department group: ${groupName}`);
    await new Promise((r) => setTimeout(r, 400));
    addConsoleLine(`✅ Added to group: ${groupName}`, { color: '#10B981' });
    addConsoleLine(`🔒 Attaching role-based policy: ${policy?.name || 'ReadOnlyAccess'}`);
    await new Promise((r) => setTimeout(r, 400));
    addConsoleLine(`✅ Policy attached: ${policy?.name || 'ReadOnlyAccess'}`, { color: '#10B981' });
    addConsoleLine('📧 Sending notification via SNS...');
    await new Promise((r) => setTimeout(r, 400));
    addConsoleLine('✅ Notification sent to manager', { color: '#10B981' });
    addConsoleLine('📊 Logging audit event...');
    await new Promise((r) => setTimeout(r, 400));
    addConsoleLine('✅ Audit log written to CloudTrail', { color: '#10B981' });
    addSeparator();
    addConsoleLine('✨ PROVISIONING COMPLETE ✨', { color: '#10B981', bold: true });
    addSeparator();
    addConsoleLine('📋 Summary:');
    addConsoleLine(`   Username: ${username}`);
    addConsoleLine(`   Email: ${email}`);
    addConsoleLine(`   Department: ${department}`);
    addConsoleLine(`   Role: ${role}`);
    addConsoleLine('   Status: ✅ Active');
    addConsoleLine('⏱️ Total time: 3.2 seconds');
    addConsoleLine('💾 User data archived for compliance');

    document.getElementById('generatedUser').textContent = `${firstName} ${lastName}`;
    document.getElementById('credentialStatus').textContent = 'Active';
    document.getElementById('credentialUsername').textContent = username;
    document.getElementById('credentialKey').textContent = accessKey.replace(/.(?=.{4})/g, '*');
    document.getElementById('credentialS3').textContent = s3Path;
    setStatus('User provisioned successfully!', 'success');
});

function showProvision() {
    document.getElementById('provision').scrollIntoView({ behavior: 'smooth' });
}

function showDeprovision() {
    document.getElementById('deprovision').scrollIntoView({ behavior: 'smooth' });
}

function showCompliance() {
    document.getElementById('compliance').scrollIntoView({ behavior: 'smooth' });
}

function showAudit() {
    document.getElementById('audit').scrollIntoView({ behavior: 'smooth' });
}

function showScripts() {
    window.open('https://github.com/Mjkhan9/Automated-IAM-User-Lifecycle-Management-System-Project/tree/main/scripts', '_blank');
}

function showAWS() {
    document.getElementById('aws').scrollIntoView({ behavior: 'smooth' });
}

document.getElementById('applyFilters')?.addEventListener('click', () => {
    const user = document.getElementById('filterUser').value.trim().toLowerCase();
    const action = document.getElementById('filterAction').value;
    const date = document.getElementById('filterDate').value;

    const filtered = auditEvents.filter((event) => {
        const matchesUser = !user || event.user.toLowerCase().includes(user);
        const matchesAction = !action || event.action === action;
        const matchesDate = !date || event.time.startsWith(date);
        return matchesUser && matchesAction && matchesDate;
    });

    renderAuditRows(filtered);
    updateAuditKPIs(filtered);
});

document.addEventListener('DOMContentLoaded', () => {
    initNav();
    renderAuditRows(auditEvents);
    renderDormantUsers();
    updateCompliance();
    updateKPIs();
    updateAuditKPIs(auditEvents);
});
