// ========================================
// IAM Automation Platform - Enhanced JavaScript
// ========================================

// ========================================
// Initialize on DOM Load
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    initializeAnimations();
    initializeScrollEffects();
    initializeNavigation();
    initializeProvisioningDemo();
    initializeCounters();
});

// ========================================
// Scroll-based Animations
// ========================================
function initializeAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const delay = entry.target.dataset.delay || 0;
                setTimeout(() => {
                    entry.target.classList.add('animated');
                }, delay);
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe all animated elements
    document.querySelectorAll('[data-animate]').forEach(el => {
        observer.observe(el);
    });
}

// ========================================
// Scroll Effects
// ========================================
function initializeScrollEffects() {
    const header = document.getElementById('header');
    const scrollTopBtn = document.getElementById('scrollTop');
    
    let lastScroll = 0;
    
    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        
        // Header shadow on scroll
        if (currentScroll > 10) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
        
        // Scroll to top button
        if (currentScroll > 500) {
            scrollTopBtn.classList.add('visible');
        } else {
            scrollTopBtn.classList.remove('visible');
        }
        
        lastScroll = currentScroll;
    });
    
    // Scroll to top functionality
    scrollTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

// ========================================
// Navigation
// ========================================
function initializeNavigation() {
    // Smooth scroll for nav links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const headerOffset = 80;
                const elementPosition = target.offsetTop;
                const offsetPosition = elementPosition - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
                
                // Update active nav link
                document.querySelectorAll('.nav-link').forEach(link => {
                    link.classList.remove('active');
                });
                this.classList.add('active');
            }
        });
    });
    
    // Mobile menu toggle
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const nav = document.querySelector('.nav');
    
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', () => {
            nav.classList.toggle('mobile-active');
            mobileMenuToggle.classList.toggle('active');
        });
    }
}

// ========================================
// Animated Counters
// ========================================
function initializeCounters() {
    const counters = document.querySelectorAll('.stat-number[data-count]');
    
    const observerOptions = {
        threshold: 0.5
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const counter = entry.target;
                const target = parseInt(counter.dataset.count);
                const duration = 2000;
                const increment = target / (duration / 16);
                let current = 0;
                
                const updateCounter = () => {
                    current += increment;
                    if (current < target) {
                        counter.textContent = Math.floor(current).toLocaleString();
                        requestAnimationFrame(updateCounter);
                    } else {
                        counter.textContent = target.toLocaleString();
                    }
                };
                
                updateCounter();
                observer.unobserve(counter);
            }
        });
    }, observerOptions);
    
    counters.forEach(counter => observer.observe(counter));
}

// ========================================
// User Provisioning Demo
// ========================================
function initializeProvisioningDemo() {
    const form = document.getElementById('provisionForm');
    if (!form) return;
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Get form values
        const firstName = document.getElementById('firstName').value;
        const lastName = document.getElementById('lastName').value;
        const email = document.getElementById('email').value;
        const department = document.getElementById('department').value;
        const role = document.getElementById('role').value;
        const username = (firstName.charAt(0) + lastName).toLowerCase();
        
        // Update status
        const statusEl = document.getElementById('demoStatus');
        const provisionBtn = document.getElementById('provisionBtn');
        const consoleEl = document.getElementById('console');
        const executionTimeEl = document.getElementById('executionTime');
        
        statusEl.textContent = 'Processing';
        statusEl.className = 'demo-status processing';
        provisionBtn.disabled = true;
        
        // Clear console
        consoleEl.innerHTML = '';
        
        const startTime = Date.now();
        
        // Provisioning workflow steps
        const steps = [
            { delay: 0, text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', color: '#60A5FA', prompt: false },
            { delay: 100, text: '🔄 IAM Provisioning Workflow Started', color: '#60A5FA', prompt: true },
            { delay: 300, text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', color: '#60A5FA', prompt: false },
            { delay: 600, text: '', prompt: false },
            { delay: 800, text: `📝 User: ${firstName} ${lastName}`, color: '#E0E7FF', prompt: true },
            { delay: 1200, text: `📧 Email: ${email}`, color: '#E0E7FF', prompt: true },
            { delay: 1600, text: `🏢 Department: ${department}`, color: '#E0E7FF', prompt: true },
            { delay: 2000, text: `👤 Role: ${role}`, color: '#E0E7FF', prompt: true },
            { delay: 2400, text: '', prompt: false },
            { delay: 2600, text: '🔍 Validating user data...', color: '#F59E0B', prompt: true },
            { delay: 3200, text: '✅ Validation passed', color: '#10B981', prompt: true },
            { delay: 3600, text: '', prompt: false },
            { delay: 3800, text: '🔐 Creating AWS IAM user...', color: '#F59E0B', prompt: true },
            { delay: 4400, text: `✅ IAM user created: ${username}`, color: '#10B981', prompt: true },
            { delay: 4800, text: `   ARN: arn:aws:iam::123456789012:user/${username}`, color: '#6B7280', prompt: false },
            { delay: 5200, text: '', prompt: false },
            { delay: 5400, text: '🔑 Generating access keys...', color: '#F59E0B', prompt: true },
            { delay: 6000, text: '✅ Access keys generated', color: '#10B981', prompt: true },
            { delay: 6300, text: '   Access Key ID: AKIAXXXXXXXXXXXXXXXX', color: '#6B7280', prompt: false },
            { delay: 6600, text: '', prompt: false },
            { delay: 6800, text: '📦 Storing credentials in S3...', color: '#F59E0B', prompt: true },
            { delay: 7400, text: `✅ Stored: s3://iam-credentials/${username}.json`, color: '#10B981', prompt: true },
            { delay: 7700, text: '   Encryption: AES-256-GCM', color: '#6B7280', prompt: false },
            { delay: 8000, text: '', prompt: false },
            { delay: 8200, text: `👥 Adding to Department-${department} group...`, color: '#F59E0B', prompt: true },
            { delay: 8800, text: `✅ Group membership assigned`, color: '#10B981', prompt: true },
            { delay: 9100, text: '', prompt: false },
            { delay: 9300, text: `🔒 Attaching policy: ${getRolePolicy(role)}`, color: '#F59E0B', prompt: true },
            { delay: 9900, text: '✅ Policy attached successfully', color: '#10B981', prompt: true },
            { delay: 10200, text: '', prompt: false },
            { delay: 10400, text: '📧 Sending SNS notification...', color: '#F59E0B', prompt: true },
            { delay: 11000, text: '✅ Manager notified via SNS', color: '#10B981', prompt: true },
            { delay: 11300, text: '', prompt: false },
            { delay: 11500, text: '📊 Writing to CloudTrail...', color: '#F59E0B', prompt: true },
            { delay: 12100, text: '✅ Audit event logged', color: '#10B981', prompt: true },
            { delay: 12400, text: '', prompt: false },
            { delay: 12600, text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', color: '#10B981', prompt: false },
            { delay: 12800, text: '✨ PROVISIONING COMPLETE ✨', color: '#10B981', prompt: false, bold: true },
            { delay: 13000, text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', color: '#10B981', prompt: false },
            { delay: 13200, text: '', prompt: false },
            { delay: 13400, text: '📋 SUMMARY:', color: '#60A5FA', prompt: true, bold: true },
            { delay: 13600, text: `   👤 Username: ${username}`, color: '#E0E7FF', prompt: false },
            { delay: 13800, text: `   📧 Email: ${email}`, color: '#E0E7FF', prompt: false },
            { delay: 14000, text: `   🏢 Department: ${department}`, color: '#E0E7FF', prompt: false },
            { delay: 14200, text: `   💼 Role: ${role}`, color: '#E0E7FF', prompt: false },
            { delay: 14400, text: '   ✅ Status: Active', color: '#10B981', prompt: false },
            { delay: 14600, text: '   🔐 MFA: Required on first login', color: '#E0E7FF', prompt: false },
            { delay: 14800, text: '', prompt: false },
            { delay: 15000, text: '⏱️  Execution time: 8.7 seconds', color: '#60A5FA', prompt: true },
            { delay: 15200, text: '💾 Data archived for compliance', color: '#60A5FA', prompt: true },
            { delay: 15400, text: `🎉 Welcome aboard, ${firstName}!`, color: '#10B981', prompt: true, bold: true }
        ];
        
        // Execute provisioning steps
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            const prevDelay = i > 0 ? steps[i - 1].delay : 0;
            await new Promise(resolve => setTimeout(resolve, step.delay - prevDelay));
            
            const line = document.createElement('div');
            line.className = 'console-line';
            
            if (step.prompt) {
                const prompt = document.createElement('span');
                prompt.className = 'console-prompt';
                prompt.textContent = '$';
                line.appendChild(prompt);
            }
            
            const text = document.createElement('span');
            text.textContent = step.text;
            if (step.color) text.style.color = step.color;
            if (step.bold) text.style.fontWeight = 'bold';
            line.appendChild(text);
            
            consoleEl.appendChild(line);
            consoleEl.scrollTop = consoleEl.scrollHeight;
        }
        
        // Update final status
        const endTime = Date.now();
        const executionTime = ((endTime - startTime) / 1000).toFixed(1);
        
        statusEl.textContent = 'Complete';
        statusEl.className = 'demo-status';
        provisionBtn.disabled = false;
        executionTimeEl.textContent = `Executed in ${executionTime}s`;
        
        // Show success notification
        showNotification('User provisioned successfully!', 'success');
    });
}

// ========================================
// Helper Functions
// ========================================
function getRolePolicy(role) {
    const policies = {
        'Developer': 'PowerUserAccess',
        'Analyst': 'ReadOnlyAccess',
        'Admin': 'AdministratorAccess',
        'Manager': 'ViewOnlyAccess',
        'Executive': 'ExecutiveAccess'
    };
    return policies[role] || 'ReadOnlyAccess';
}

function clearConsole() {
    const consoleEl = document.getElementById('console');
    consoleEl.innerHTML = `
        <div class="console-line console-ready">
            <span class="console-prompt">$</span> IAM Automation System v2.0 Ready...
        </div>
        <div class="console-line console-info">
            <span class="console-prompt">$</span> Waiting for user input...
        </div>
    `;
    
    const executionTimeEl = document.getElementById('executionTime');
    if (executionTimeEl) {
        executionTimeEl.textContent = '';
    }
}

function scrollToDemo() {
    const demoSection = document.getElementById('demo');
    if (demoSection) {
        const headerOffset = 80;
        const elementPosition = demoSection.offsetTop;
        const offsetPosition = elementPosition - headerOffset;

        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    }
}

function showFeatureDetails(feature) {
    switch(feature) {
        case 'deprovision':
            showDeprovisionWorkflow();
            break;
        case 'compliance':
            showComplianceDashboard();
            break;
        case 'audit':
            showAuditLogs();
            break;
        case 'aws':
            showAWSIntegration();
            break;
        default:
            showNotification('Feature details coming soon!', 'info');
    }
}

function showComplianceDashboard() {
    const modal = createModal('Compliance Dashboard', `
        <div class="dashboard-grid">
            <div class="dashboard-card">
                <div class="dashboard-card-header">
                    <span class="dashboard-card-title">Total Users</span>
                </div>
                <div class="dashboard-card-value">8,247</div>
                <div class="dashboard-card-label">Active accounts</div>
                <div class="dashboard-card-trend up">↑ 3.2% from last month</div>
            </div>
            
            <div class="dashboard-card">
                <div class="dashboard-card-header">
                    <span class="dashboard-card-title">Dormant Accounts</span>
                </div>
                <div class="dashboard-card-value">127</div>
                <div class="dashboard-card-label">Inactive > 90 days</div>
                <div class="dashboard-card-trend down">↓ 15% from last month</div>
            </div>
            
            <div class="dashboard-card">
                <div class="dashboard-card-header">
                    <span class="dashboard-card-title">Compliance Score</span>
                </div>
                <div class="dashboard-card-value">98.5%</div>
                <div class="dashboard-card-label">Policy adherence</div>
                <div class="dashboard-card-trend up">↑ 2.1% from last month</div>
            </div>
            
            <div class="dashboard-card">
                <div class="dashboard-card-header">
                    <span class="dashboard-card-title">Pending Reviews</span>
                </div>
                <div class="dashboard-card-value">43</div>
                <div class="dashboard-card-label">Access certifications</div>
                <div class="dashboard-card-trend">Due within 7 days</div>
            </div>
        </div>
        
        <h4 style="margin: 2rem 0 1rem; color: var(--text-primary); font-size: 1.25rem;">Recent Compliance Alerts</h4>
        <table class="dashboard-table">
            <thead>
                <tr>
                    <th>User</th>
                    <th>Alert Type</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Action Required</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>john.smith@company.com</td>
                    <td>Dormant Account</td>
                    <td><span class="status-badge warning">Review</span></td>
                    <td>Nov 15, 2024</td>
                    <td>Verify activity</td>
                </tr>
                <tr>
                    <td>sarah.johnson@company.com</td>
                    <td>Excessive Permissions</td>
                    <td><span class="status-badge warning">Review</span></td>
                    <td>Nov 14, 2024</td>
                    <td>Policy review</td>
                </tr>
                <tr>
                    <td>mike.davis@company.com</td>
                    <td>MFA Not Enabled</td>
                    <td><span class="status-badge inactive">Action Required</span></td>
                    <td>Nov 13, 2024</td>
                    <td>Enable MFA</td>
                </tr>
                <tr>
                    <td>emily.wilson@company.com</td>
                    <td>Access Certification</td>
                    <td><span class="status-badge active">Completed</span></td>
                    <td>Nov 12, 2024</td>
                    <td>None</td>
                </tr>
                <tr>
                    <td>david.brown@company.com</td>
                    <td>Password Expiry</td>
                    <td><span class="status-badge warning">Pending</span></td>
                    <td>Nov 10, 2024</td>
                    <td>Password reset</td>
                </tr>
            </tbody>
        </table>
    `);
    showModal(modal);
}

function showAuditLogs() {
    const modal = createModal('Audit Logs', `
        <h4 style="margin-bottom: 1.5rem; color: var(--text-primary);">Recent IAM Activities</h4>
        
        <div class="audit-log-entry">
            <div class="audit-log-time">2024-11-17 14:23:45 UTC</div>
            <div class="audit-log-action">User Provisioned: john.doe@company.com</div>
            <div class="audit-log-details">Created IAM user with Developer role in IT department. Access keys generated and stored in S3. Manager notification sent via SNS.</div>
        </div>
        
        <div class="audit-log-entry">
            <div class="audit-log-time">2024-11-17 13:15:22 UTC</div>
            <div class="audit-log-action">Policy Attached: sarah.johnson@company.com</div>
            <div class="audit-log-details">Attached PowerUserAccess policy. Modified by: admin@company.com. Reason: Role change to Senior Developer.</div>
        </div>
        
        <div class="audit-log-entry">
            <div class="audit-log-time">2024-11-17 11:45:10 UTC</div>
            <div class="audit-log-action">Account Deactivated: mike.davis@company.com</div>
            <div class="audit-log-details">Account disabled due to employment termination. Access keys revoked. Data archived to S3://compliance-archive/2024/11/.</div>
        </div>
        
        <div class="audit-log-entry">
            <div class="audit-log-time">2024-11-17 10:30:55 UTC</div>
            <div class="audit-log-action">Group Membership Changed: emily.wilson@company.com</div>
            <div class="audit-log-details">Added to group: Department-Finance. Previous groups: Department-HR. Modified by: hr-admin@company.com.</div>
        </div>
        
        <div class="audit-log-entry">
            <div class="audit-log-time">2024-11-17 09:12:33 UTC</div>
            <div class="audit-log-action">MFA Enabled: david.brown@company.com</div>
            <div class="audit-log-details">Multi-factor authentication configured successfully. Device: Virtual MFA. Setup initiated by user.</div>
        </div>
        
        <div class="audit-log-entry">
            <div class="audit-log-time">2024-11-17 08:05:18 UTC</div>
            <div class="audit-log-action">Access Key Rotated: system-service-account</div>
            <div class="audit-log-details">Automated key rotation completed. Old key deactivated. New key stored securely. Next rotation: 2025-02-17.</div>
        </div>
        
        <p style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--border-color); color: var(--text-secondary); font-size: 0.875rem;">
            📊 All audit logs are encrypted and stored in S3 with 7-year retention for compliance.
            CloudTrail integration provides complete forensic analysis capabilities.
        </p>
    `);
    showModal(modal);
}

function showDeprovisionWorkflow() {
    const modal = createModal('De-provisioning Workflow', `
        <h4 style="margin-bottom: 1.5rem; color: var(--text-primary);">Automated Account Deactivation Process</h4>
        
        <div class="workflow-step">
            <div class="workflow-step-number">1</div>
            <div class="workflow-step-content">
                <h4>Trigger Event Detection</h4>
                <p>System detects termination event from HR system (Workday/SAP) or manual trigger by administrator. Workflow initiates automatically within 5 minutes of event detection.</p>
            </div>
        </div>
        
        <div class="workflow-step">
            <div class="workflow-step-number">2</div>
            <div class="workflow-step-content">
                <h4>Account Suspension</h4>
                <p>User account is immediately disabled in Active Directory and AWS IAM. Login access is revoked across all systems. Existing sessions are terminated within 15 minutes.</p>
            </div>
        </div>
        
        <div class="workflow-step">
            <div class="workflow-step-number">3</div>
            <div class="workflow-step-content">
                <h4>Access Revocation</h4>
                <p>All AWS access keys are deactivated. Group memberships are removed. IAM policies are detached. VPN and network access is revoked immediately.</p>
            </div>
        </div>
        
        <div class="workflow-step">
            <div class="workflow-step-number">4</div>
            <div class="workflow-step-content">
                <h4>Data Archival</h4>
                <p>User data is backed up to S3 with AES-256 encryption. Home directory contents, email archives, and project files are preserved for 7 years per compliance requirements.</p>
            </div>
        </div>
        
        <div class="workflow-step">
            <div class="workflow-step-number">5</div>
            <div class="workflow-step-content">
                <h4>Notification & Audit</h4>
                <p>Manager receives notification via SNS. IT Security team is alerted. Complete audit trail is logged to CloudTrail. Exit checklist is generated for final review.</p>
            </div>
        </div>
        
        <div class="workflow-step">
            <div class="workflow-step-number">6</div>
            <div class="workflow-step-content">
                <h4>Account Deletion</h4>
                <p>After 90-day retention period, account is permanently deleted. All credentials are destroyed. Final compliance report is generated and archived.</p>
            </div>
        </div>
        
        <div style="margin-top: 2rem; padding: 1.5rem; background: var(--bg-secondary); border-radius: 8px; border-left: 4px solid var(--success);">
            <strong style="color: var(--text-primary);">Key Benefits:</strong>
            <ul style="margin-top: 0.75rem; margin-left: 1.25rem; color: var(--text-secondary);">
                <li>Automated execution reduces human error</li>
                <li>Immediate security posture improvement</li>
                <li>Full compliance with SOX, HIPAA, GDPR requirements</li>
                <li>Complete audit trail for forensic analysis</li>
                <li>Zero manual intervention required</li>
            </ul>
        </div>
    `);
    showModal(modal);
}

function showAWSIntegration() {
    const modal = createModal('AWS Service Integration', `
        <div class="dashboard-grid">
            <div class="dashboard-card">
                <div class="dashboard-card-header">
                    <span class="dashboard-card-title">AWS IAM</span>
                </div>
                <div class="dashboard-card-label" style="margin-top: 1rem;">User and policy management, role-based access control, credential generation</div>
            </div>
            
            <div class="dashboard-card">
                <div class="dashboard-card-header">
                    <span class="dashboard-card-title">Amazon S3</span>
                </div>
                <div class="dashboard-card-label" style="margin-top: 1rem;">Encrypted credential storage, data archival, compliance retention</div>
            </div>
            
            <div class="dashboard-card">
                <div class="dashboard-card-header">
                    <span class="dashboard-card-title">AWS SNS</span>
                </div>
                <div class="dashboard-card-label" style="margin-top: 1rem;">Real-time notifications, alert distribution, workflow triggers</div>
            </div>
            
            <div class="dashboard-card">
                <div class="dashboard-card-header">
                    <span class="dashboard-card-title">CloudTrail</span>
                </div>
                <div class="dashboard-card-label" style="margin-top: 1rem;">Complete audit logging, forensic analysis, compliance reporting</div>
            </div>
        </div>
        
        <h4 style="margin: 2rem 0 1rem; color: var(--text-primary); font-size: 1.25rem;">Integration Architecture</h4>
        
        <div style="background: var(--bg-secondary); padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem;">
            <strong style="color: var(--text-primary);">IAM Provisioning Flow:</strong>
            <p style="margin-top: 0.75rem; color: var(--text-secondary); line-height: 1.6;">
                Python/PowerShell scripts → AWS SDK (Boto3) → IAM User Creation → Policy Attachment → 
                Access Key Generation → S3 Encryption → SNS Notification → CloudTrail Logging
            </p>
        </div>
        
        <div style="background: var(--bg-secondary); padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem;">
            <strong style="color: var(--text-primary);">Security Features:</strong>
            <ul style="margin-top: 0.75rem; margin-left: 1.25rem; color: var(--text-secondary); line-height: 1.6;">
                <li>AES-256-GCM encryption for all stored credentials</li>
                <li>S3 bucket policies with least-privilege access</li>
                <li>IAM roles for service-to-service authentication</li>
                <li>CloudTrail logs encrypted and immutable</li>
                <li>SNS topic encryption with KMS keys</li>
            </ul>
        </div>
        
        <div style="background: var(--bg-secondary); padding: 1.5rem; border-radius: 8px;">
            <strong style="color: var(--text-primary);">Compliance & Audit:</strong>
            <p style="margin-top: 0.75rem; color: var(--text-secondary); line-height: 1.6;">
                7-year retention in S3 Glacier for long-term compliance. CloudTrail provides complete 
                forensic audit trails. Automated compliance reports generated monthly. SOC 2, HIPAA, 
                and GDPR compliant architecture.
            </p>
        </div>
    `);
    showModal(modal);
}

function createModal(title, content) {
    const modalHTML = `
        <div class="modal-overlay" id="featureModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="modal-close" onclick="closeModal()">✕</button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
            </div>
        </div>
    `;
    return modalHTML;
}

function showModal(modalHTML) {
    // Remove existing modal if any
    const existingModal = document.getElementById('featureModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add new modal
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Show modal
    setTimeout(() => {
        document.getElementById('featureModal').classList.add('active');
    }, 10);
    
    // Close on overlay click
    document.getElementById('featureModal').addEventListener('click', (e) => {
        if (e.target.id === 'featureModal') {
            closeModal();
        }
    });
    
    // Close on ESC key
    document.addEventListener('keydown', handleEscKey);
}

function closeModal() {
    const modal = document.getElementById('featureModal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.remove();
            document.removeEventListener('keydown', handleEscKey);
        }, 300);
    }
}

function handleEscKey(e) {
    if (e.key === 'Escape') {
        closeModal();
    }
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 2rem;
        background: ${type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#2563EB'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        z-index: 9999;
        animation: slideInRight 0.3s ease-out;
        max-width: 400px;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Remove after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 5000);
}

// Add notification animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// ========================================
// Console Log
// ========================================
console.log('%c🚀 IAM Automation Platform Loaded', 'color: #2563EB; font-size: 16px; font-weight: bold;');
console.log('%cVersion 2.0 | Enhanced Edition', 'color: #6B7280; font-size: 12px;');
