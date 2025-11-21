// ========================================
// IAM Automation Platform - Enhanced JavaScript
// ========================================

// ========================================
// Initialize on DOM Load
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    initializeAnimations();
    initializeScrollEffects();
    initializeNavigation();
    initializeProvisioningDemo();
    initializeCounters();
    initializeSearch();
    initializeKeyboardShortcuts();
    initializeMobileMenu();
});

// ========================================
// Theme Management
// ========================================
function initializeTheme() {
    const themeToggle = document.getElementById('themeToggle');
    const savedTheme = localStorage.getItem('theme') || 'light';
    
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            
            showToast('Theme changed', `Switched to ${newTheme} mode`, 'success');
        });
    }
}

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
                
                // Close mobile menu if open
                const mobileMenu = document.getElementById('mobileMenu');
                const mobileMenuToggle = document.getElementById('mobileMenuToggle');
                if (mobileMenu && mobileMenu.classList.contains('active')) {
                    mobileMenu.classList.remove('active');
                    mobileMenuToggle.classList.remove('active');
                }
            }
        });
    });
}

// ========================================
// Mobile Menu
// ========================================
function initializeMobileMenu() {
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const mobileMenu = document.getElementById('mobileMenu');
    
    if (mobileMenuToggle && mobileMenu) {
        mobileMenuToggle.addEventListener('click', () => {
            mobileMenu.classList.toggle('active');
            mobileMenuToggle.classList.toggle('active');
        });
        
        // Close mobile menu when clicking a link
        document.querySelectorAll('.mobile-menu-link').forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.remove('active');
                mobileMenuToggle.classList.remove('active');
            });
        });
    }
}

// ========================================
// Search Functionality
// ========================================
function initializeSearch() {
    const searchInput = document.getElementById('searchInput');
    
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            
            if (searchTerm.length < 2) {
                // Clear any previous highlights
                return;
            }
            
            // Search through feature cards
            const featureCards = document.querySelectorAll('.feature-card');
            let foundCount = 0;
            
            featureCards.forEach(card => {
                const text = card.textContent.toLowerCase();
                if (text.includes(searchTerm)) {
                    card.style.display = 'block';
                    card.style.outline = '2px solid var(--primary)';
                    foundCount++;
                } else {
                    card.style.display = 'none';
                    card.style.outline = 'none';
                }
            });
            
            if (searchTerm && foundCount === 0) {
                showToast('No results', `No features found matching "${searchTerm}"`, 'info');
            }
        });
        
        // Clear search on escape
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                searchInput.value = '';
                document.querySelectorAll('.feature-card').forEach(card => {
                    card.style.display = 'block';
                    card.style.outline = 'none';
                });
            }
        });
    }
}

// ========================================
// Keyboard Shortcuts
// ========================================
function initializeKeyboardShortcuts() {
    const shortcutsHelp = document.getElementById('shortcutsHelp');
    
    document.addEventListener('keydown', (e) => {
        // Don't trigger shortcuts when typing in inputs
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
            return;
        }
        
        switch(e.key) {
            case '?':
                e.preventDefault();
                if (shortcutsHelp) {
                    shortcutsHelp.classList.toggle('active');
                }
                break;
            case '/':
                e.preventDefault();
                const searchInput = document.getElementById('searchInput');
                if (searchInput) {
                    searchInput.focus();
                }
                break;
            case 'd':
            case 'D':
                e.preventDefault();
                scrollToDemo();
                break;
            case 't':
            case 'T':
                e.preventDefault();
                document.getElementById('themeToggle')?.click();
                break;
            case 'Escape':
                // Close modals
                closeModal();
                if (shortcutsHelp) {
                    shortcutsHelp.classList.remove('active');
                }
                break;
        }
    });
    
    // Close shortcuts help when clicking outside
    if (shortcutsHelp) {
        shortcutsHelp.addEventListener('click', (e) => {
            if (e.target === shortcutsHelp) {
                shortcutsHelp.classList.remove('active');
            }
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
        const progressContainer = document.getElementById('progressContainer');
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');
        
        statusEl.textContent = 'Processing';
        statusEl.className = 'demo-status processing';
        provisionBtn.disabled = true;
        progressContainer.classList.add('active');
        
        // Clear console
        consoleEl.innerHTML = '';
        
        const startTime = Date.now();
        
        // Provisioning workflow steps
        const steps = [
            { delay: 0, text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', color: '#60A5FA', prompt: false, progress: 5 },
            { delay: 100, text: '🔄 IAM Provisioning Workflow Started', color: '#60A5FA', prompt: true, progress: 10 },
            { delay: 300, text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', color: '#60A5FA', prompt: false, progress: 15 },
            { delay: 600, text: '', prompt: false, progress: 20 },
            { delay: 800, text: `📝 User: ${firstName} ${lastName}`, color: '#E0E7FF', prompt: true, progress: 25 },
            { delay: 1200, text: `📧 Email: ${email}`, color: '#E0E7FF', prompt: true, progress: 30 },
            { delay: 1600, text: `🏢 Department: ${department}`, color: '#E0E7FF', prompt: true, progress: 35 },
            { delay: 2000, text: `👤 Role: ${role}`, color: '#E0E7FF', prompt: true, progress: 40 },
            { delay: 2400, text: '', prompt: false, progress: 45 },
            { delay: 2600, text: '🔍 Validating user data...', color: '#F59E0B', prompt: true, progress: 50 },
            { delay: 3200, text: '✅ Validation passed', color: '#10B981', prompt: true, progress: 55 },
            { delay: 3600, text: '', prompt: false, progress: 60 },
            { delay: 3800, text: '🔐 Creating AWS IAM user...', color: '#F59E0B', prompt: true, progress: 65 },
            { delay: 4400, text: `✅ IAM user created: ${username}`, color: '#10B981', prompt: true, progress: 70 },
            { delay: 4800, text: `   ARN: arn:aws:iam::123456789012:user/${username}`, color: '#6B7280', prompt: false, progress: 75 },
            { delay: 5200, text: '', prompt: false, progress: 78 },
            { delay: 5400, text: '🔑 Generating access keys...', color: '#F59E0B', prompt: true, progress: 80 },
            { delay: 6000, text: '✅ Access keys generated', color: '#10B981', prompt: true, progress: 82 },
            { delay: 6300, text: '   Access Key ID: AKIAXXXXXXXXXXXXXXXX', color: '#6B7280', prompt: false, progress: 84 },
            { delay: 6600, text: '', prompt: false, progress: 86 },
            { delay: 6800, text: '📦 Storing credentials in S3...', color: '#F59E0B', prompt: true, progress: 88 },
            { delay: 7400, text: `✅ Stored: s3://iam-credentials/${username}.json`, color: '#10B981', prompt: true, progress: 90 },
            { delay: 7700, text: '   Encryption: AES-256-GCM', color: '#6B7280', prompt: false, progress: 92 },
            { delay: 8000, text: '', prompt: false, progress: 93 },
            { delay: 8200, text: `👥 Adding to Department-${department} group...`, color: '#F59E0B', prompt: true, progress: 94 },
            { delay: 8800, text: `✅ Group membership assigned`, color: '#10B981', prompt: true, progress: 95 },
            { delay: 9100, text: '', prompt: false, progress: 96 },
            { delay: 9300, text: `🔒 Attaching policy: ${getRolePolicy(role)}`, color: '#F59E0B', prompt: true, progress: 97 },
            { delay: 9900, text: '✅ Policy attached successfully', color: '#10B981', prompt: true, progress: 98 },
            { delay: 10200, text: '', prompt: false, progress: 99 },
            { delay: 10400, text: '📧 Sending SNS notification...', color: '#F59E0B', prompt: true, progress: 99 },
            { delay: 11000, text: '✅ Manager notified via SNS', color: '#10B981', prompt: true, progress: 100 },
            { delay: 11300, text: '', prompt: false, progress: 100 },
            { delay: 11500, text: '📊 Writing to CloudTrail...', color: '#F59E0B', prompt: true, progress: 100 },
            { delay: 12100, text: '✅ Audit event logged', color: '#10B981', prompt: true, progress: 100 },
            { delay: 12400, text: '', prompt: false, progress: 100 },
            { delay: 12600, text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', color: '#10B981', prompt: false, progress: 100 },
            { delay: 12800, text: '✨ PROVISIONING COMPLETE ✨', color: '#10B981', prompt: false, bold: true, progress: 100 },
            { delay: 13000, text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', color: '#10B981', prompt: false, progress: 100 },
            { delay: 13200, text: '', prompt: false, progress: 100 },
            { delay: 13400, text: '📋 SUMMARY:', color: '#60A5FA', prompt: true, bold: true, progress: 100 },
            { delay: 13600, text: `   👤 Username: ${username}`, color: '#E0E7FF', prompt: false, progress: 100 },
            { delay: 13800, text: `   📧 Email: ${email}`, color: '#E0E7FF', prompt: false, progress: 100 },
            { delay: 14000, text: `   🏢 Department: ${department}`, color: '#E0E7FF', prompt: false, progress: 100 },
            { delay: 14200, text: `   💼 Role: ${role}`, color: '#E0E7FF', prompt: false, progress: 100 },
            { delay: 14400, text: '   ✅ Status: Active', color: '#10B981', prompt: false, progress: 100 },
            { delay: 14600, text: '   🔐 MFA: Required on first login', color: '#E0E7FF', prompt: false, progress: 100 },
            { delay: 14800, text: '', prompt: false, progress: 100 },
            { delay: 15000, text: '⏱️  Execution time: 8.7 seconds', color: '#60A5FA', prompt: true, progress: 100 },
            { delay: 15200, text: '💾 Data archived for compliance', color: '#60A5FA', prompt: true, progress: 100 },
            { delay: 15400, text: `🎉 Welcome aboard, ${firstName}!`, color: '#10B981', prompt: true, bold: true, progress: 100 }
        ];
        
        // Execute provisioning steps
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            const prevDelay = i > 0 ? steps[i - 1].delay : 0;
            await new Promise(resolve => setTimeout(resolve, step.delay - prevDelay));
            
            // Update progress bar
            if (progressBar && progressText) {
                progressBar.style.width = `${step.progress}%`;
                progressText.textContent = `${step.progress}%`;
            }
            
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
        progressContainer.classList.remove('active');
        
        // Show success notification
        showToast('Success!', 'User provisioned successfully!', 'success');
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
            <span class="console-prompt">$</span> IAM Automation System v2.0 (Simulation) Ready...
        </div>
        <div class="console-line console-info">
            <span class="console-prompt">$</span> Waiting for user input...
        </div>
    `;
    
    const executionTimeEl = document.getElementById('executionTime');
    if (executionTimeEl) {
        executionTimeEl.textContent = '';
    }
    
    const progressContainer = document.getElementById('progressContainer');
    if (progressContainer) {
        progressContainer.classList.remove('active');
    }
    
    showToast('Console cleared', 'Ready for new provisioning', 'info');
}

function exportConsoleLog() {
    const consoleEl = document.getElementById('console');
    const logText = consoleEl.innerText;
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const filename = `iam-console-log-${timestamp}.txt`;
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('Export successful', `Log saved as ${filename}`, 'success');
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
            showToast('Coming soon', 'Feature details will be available soon!', 'info');
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
                    <button class="modal-close" onclick="closeModal()" aria-label="Close modal">✕</button>
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
    
    // Close on ESC key (handled by keyboard shortcuts)
}

function closeModal() {
    const modal = document.getElementById('featureModal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
}

// ========================================
// Toast Notifications
// ========================================
function showToast(title, message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;
    
    const toastId = `toast-${Date.now()}`;
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.id = toastId;
    toast.innerHTML = `
        <div class="toast-icon">${icons[type]}</div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="closeToast('${toastId}')" aria-label="Close notification">✕</button>
    `;
    
    toastContainer.appendChild(toast);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        closeToast(toastId);
    }, 5000);
}

function closeToast(toastId) {
    const toast = document.getElementById(toastId);
    if (toast) {
        toast.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }
}

// ========================================
// Performance & Analytics
// ========================================
function trackPagePerformance() {
    if ('performance' in window && 'PerformanceObserver' in window) {
        // Track page load time
        window.addEventListener('load', () => {
            const perfData = performance.getEntriesByType('navigation')[0];
            if (perfData) {
                const loadTime = perfData.loadEventEnd - perfData.fetchStart;
                console.log(`Page load time: ${(loadTime / 1000).toFixed(2)}s`);
            }
        });
    }
}

// Initialize performance tracking
trackPagePerformance();

// ========================================
// Service Worker Registration (Optional)
// ========================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Uncomment to enable service worker
        // navigator.serviceWorker.register('/sw.js')
        //     .then(reg => console.log('Service Worker registered'))
        //     .catch(err => console.log('Service Worker registration failed'));
    });
}

// ========================================
// Console Branding
// ========================================
console.log('%c🚀 IAM Automation Platform Loaded', 'color: #0066CC; font-size: 16px; font-weight: bold;');
console.log('%cVersion 2.0 | Enhanced Edition', 'color: #6B7280; font-size: 12px;');
console.log('%c\n💡 Keyboard Shortcuts:\n? - Show help\n/ - Focus search\nD - Jump to demo\nT - Toggle theme\nEsc - Close modals', 'color: #9CA3AF; font-size: 11px;');

// ========================================
// Error Handling
// ========================================
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
    // Optionally show user-friendly error message
    // showToast('Error', 'Something went wrong. Please refresh the page.', 'error');
});

// ========================================
// Accessibility Enhancements
// ========================================
function initializeAccessibility() {
    // Add skip to main content link
    const skipLink = document.createElement('a');
    skipLink.href = '#dashboard';
    skipLink.className = 'skip-link';
    skipLink.textContent = 'Skip to main content';
    skipLink.style.cssText = `
        position: absolute;
        top: -40px;
        left: 0;
        background: var(--primary);
        color: white;
        padding: 0.5rem 1rem;
        text-decoration: none;
        z-index: 10000;
    `;
    skipLink.addEventListener('focus', () => {
        skipLink.style.top = '0';
    });
    skipLink.addEventListener('blur', () => {
        skipLink.style.top = '-40px';
    });
    document.body.insertBefore(skipLink, document.body.firstChild);
    
    // Announce dynamic content changes to screen readers
    const announcer = document.createElement('div');
    announcer.setAttribute('role', 'status');
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only';
    announcer.style.cssText = `
        position: absolute;
        left: -10000px;
        width: 1px;
        height: 1px;
        overflow: hidden;
    `;
    document.body.appendChild(announcer);
    
    // Store announcer for later use
    window.a11yAnnouncer = announcer;
}

function announce(message) {
    if (window.a11yAnnouncer) {
        window.a11yAnnouncer.textContent = message;
        setTimeout(() => {
            window.a11yAnnouncer.textContent = '';
        }, 1000);
    }
}

// Initialize accessibility features
initializeAccessibility();

// ========================================
// Utility Functions
// ========================================
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// ========================================
// Network Status Detection
// ========================================
window.addEventListener('online', () => {
    showToast('Connection restored', 'You are back online', 'success');
});

window.addEventListener('offline', () => {
    showToast('No connection', 'You are currently offline', 'warning');
});

// ========================================
// Lazy Loading Images
// ========================================
if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                }
                observer.unobserve(img);
            }
        });
    });
    
    document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
    });
}

// ========================================
// Copy to Clipboard Helper
// ========================================
function copyToClipboard(text, successMessage = 'Copied to clipboard') {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('Success', successMessage, 'success');
        }).catch(err => {
            console.error('Failed to copy:', err);
            showToast('Error', 'Failed to copy to clipboard', 'error');
        });
    } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            showToast('Success', successMessage, 'success');
        } catch (err) {
            console.error('Failed to copy:', err);
            showToast('Error', 'Failed to copy to clipboard', 'error');
        }
        document.body.removeChild(textArea);
    }
}

// ========================================
// Enhanced Console Log Export
// ========================================
function formatConsoleLogForExport() {
    const consoleEl = document.getElementById('console');
    const lines = consoleEl.querySelectorAll('.console-line');
    let output = '='.repeat(60) + '\n';
    output += 'IAM AUTOMATION SYSTEM - CONSOLE LOG\n';
    output += `Export Date: ${new Date().toLocaleString()}\n`;
    output += '='.repeat(60) + '\n\n';
    
    lines.forEach(line => {
        output += line.innerText + '\n';
    });
    
    output += '\n' + '='.repeat(60) + '\n';
    output += 'END OF LOG\n';
    output += '='.repeat(60);
    
    return output;
}

// ========================================
// Local Storage Helpers
// ========================================
function saveToLocalStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (e) {
        console.error('Failed to save to localStorage:', e);
        return false;
    }
}

function getFromLocalStorage(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
        console.error('Failed to get from localStorage:', e);
        return defaultValue;
    }
}

// ========================================
// Export Functions to Global Scope
// ========================================
window.scrollToDemo = scrollToDemo;
window.showFeatureDetails = showFeatureDetails;
window.clearConsole = clearConsole;
window.exportConsoleLog = exportConsoleLog;
window.closeModal = closeModal;
window.closeToast = closeToast;
window.copyToClipboard = copyToClipboard;

// ========================================
// Development Helpers (Remove in Production)
// ========================================
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('%c🛠️ Development Mode', 'color: #F59E0B; font-size: 14px; font-weight: bold;');
    console.log('Available functions:', {
        showToast,
        showModal,
        copyToClipboard,
        clearConsole,
        exportConsoleLog
    });
}

// ========================================
// Page Visibility API - Pause animations when tab is hidden
// ========================================
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log('Tab hidden - pausing animations');
    } else {
        console.log('Tab visible - resuming animations');
    }
});
