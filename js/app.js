// ========================================
// IAM Automation Platform - Enhanced JavaScript
// ========================================

(function() {
    'use strict';

    // ========================================
    // Initialize on DOM Load
    // ========================================
    document.addEventListener('DOMContentLoaded', () => {
        initTheme();
        initAnimations();
        initScrollEffects();
        initNavigation();
        initMobileMenu();
        initProvisioningDemo();
        initCounters();
        initKeyboardShortcuts();
    });

    // ========================================
    // Theme Management
    // ========================================
    function initTheme() {
        const themeToggle = document.getElementById('themeToggle');
        const savedTheme = localStorage.getItem('theme') || 'dark';
        
        document.body.setAttribute('data-theme', savedTheme);
        
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                const currentTheme = document.body.getAttribute('data-theme');
                const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
                
                document.body.setAttribute('data-theme', newTheme);
                localStorage.setItem('theme', newTheme);
                
                showToast('Theme Updated', `Switched to ${newTheme} mode`, 'success');
            });
        }
    }

    // ========================================
    // Scroll-based Animations
    // ========================================
    function initAnimations() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -60px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animated');
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        document.querySelectorAll('[data-animate]').forEach(el => {
            observer.observe(el);
        });
    }

    // ========================================
    // Scroll Effects
    // ========================================
    function initScrollEffects() {
        const header = document.getElementById('header');
        const scrollTopBtn = document.getElementById('scrollTop');
        let ticking = false;

        const handleScroll = () => {
            const scrollY = window.scrollY;
            
            // Header shadow
            if (scrollY > 20) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
            
            // Scroll to top button
            if (scrollY > 500) {
                scrollTopBtn.classList.add('visible');
            } else {
                scrollTopBtn.classList.remove('visible');
            }
            
            ticking = false;
        };

        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(handleScroll);
                ticking = true;
            }
        }, { passive: true });

        // Scroll to top
        if (scrollTopBtn) {
            scrollTopBtn.addEventListener('click', () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }
    }

    // ========================================
    // Navigation
    // ========================================
    function initNavigation() {
        const navLinks = document.querySelectorAll('a[href^="#"]');
        
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                if (href === '#') return;
                
                e.preventDefault();
                const target = document.querySelector(href);
                
                if (target) {
                    const headerHeight = 80;
                    const targetPosition = target.offsetTop - headerHeight;
                    
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                    
                    // Update active state
                    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                    if (link.classList.contains('nav-link')) {
                        link.classList.add('active');
                    }
                    
                    // Close mobile menu
                    closeMobileMenu();
                }
            });
        });

        // Update active nav on scroll
        const sections = document.querySelectorAll('section[id]');
        
        const updateActiveNav = () => {
            const scrollY = window.scrollY + 100;
            
            sections.forEach(section => {
                const sectionTop = section.offsetTop;
                const sectionHeight = section.offsetHeight;
                const sectionId = section.getAttribute('id');
                
                if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
                    document.querySelectorAll('.nav-link').forEach(link => {
                        link.classList.remove('active');
                        if (link.getAttribute('href') === `#${sectionId}`) {
                            link.classList.add('active');
                        }
                    });
                }
            });
        };

        window.addEventListener('scroll', throttle(updateActiveNav, 100), { passive: true });
    }

    // ========================================
    // Mobile Menu
    // ========================================
    function initMobileMenu() {
        const toggle = document.getElementById('mobileMenuToggle');
        const menu = document.getElementById('mobileMenu');
        
        if (toggle && menu) {
            toggle.addEventListener('click', () => {
                const isOpen = menu.classList.contains('active');
                
                if (isOpen) {
                    closeMobileMenu();
                } else {
                    menu.classList.add('active');
                    toggle.classList.add('active');
                    document.body.style.overflow = 'hidden';
                }
            });
            
            // Close on link click
            menu.querySelectorAll('.mobile-menu-link').forEach(link => {
                link.addEventListener('click', closeMobileMenu);
            });
        }
    }

    function closeMobileMenu() {
        const toggle = document.getElementById('mobileMenuToggle');
        const menu = document.getElementById('mobileMenu');
        
        if (menu && toggle) {
            menu.classList.remove('active');
            toggle.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    // ========================================
    // Animated Counters
    // ========================================
    function initCounters() {
        const counters = document.querySelectorAll('.metric-number[data-count]');
        
        const observerOptions = {
            threshold: 0.5
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const counter = entry.target;
                    const target = parseInt(counter.dataset.count);
                    animateCounter(counter, target);
                    observer.unobserve(counter);
                }
            });
        }, observerOptions);
        
        counters.forEach(counter => observer.observe(counter));
    }

    function animateCounter(element, target) {
        const duration = 2000;
        const startTime = performance.now();
        
        const update = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Ease out cubic
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(easeOut * target);
            
            element.textContent = current.toLocaleString();
            
            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                element.textContent = target.toLocaleString();
            }
        };
        
        requestAnimationFrame(update);
    }

    // ========================================
    // Provisioning Demo
    // ========================================
    function initProvisioningDemo() {
        const form = document.getElementById('provisionForm');
        if (!form) return;
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const firstName = document.getElementById('firstName').value;
            const lastName = document.getElementById('lastName').value;
            const email = document.getElementById('email').value;
            const department = document.getElementById('department').value;
            const role = document.getElementById('role').value;
            const username = (firstName.charAt(0) + lastName).toLowerCase();
            
            const statusEl = document.getElementById('demoStatus');
            const provisionBtn = document.getElementById('provisionBtn');
            const consoleEl = document.getElementById('console');
            const executionTimeEl = document.getElementById('executionTime');
            const progressContainer = document.getElementById('progressContainer');
            const progressBar = document.getElementById('progressBar');
            const progressText = document.getElementById('progressText');
            
            // Update UI state
            statusEl.textContent = 'Processing';
            statusEl.className = 'status-badge status-processing';
            provisionBtn.disabled = true;
            progressContainer.classList.add('active');
            consoleEl.innerHTML = '';
            
            const startTime = Date.now();
            
            // Define workflow steps
            const steps = [
                { progress: 5, lines: [
                    { prompt: true, text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', class: 'text-accent' }
                ]},
                { progress: 10, lines: [
                    { prompt: true, text: '🔄 IAM Provisioning Workflow Started', class: 'text-accent' }
                ]},
                { progress: 15, lines: [
                    { prompt: true, text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', class: 'text-accent' },
                    { prompt: false, text: '' }
                ]},
                { progress: 25, lines: [
                    { prompt: true, text: `📝 User: ${firstName} ${lastName}`, class: '' }
                ]},
                { progress: 30, lines: [
                    { prompt: true, text: `📧 Email: ${email}`, class: '' }
                ]},
                { progress: 35, lines: [
                    { prompt: true, text: `🏢 Department: ${department}`, class: '' }
                ]},
                { progress: 40, lines: [
                    { prompt: true, text: `👤 Role: ${role}`, class: '' },
                    { prompt: false, text: '' }
                ]},
                { progress: 50, lines: [
                    { prompt: true, text: '🔍 Validating user data...', class: 'text-warning' }
                ]},
                { progress: 55, lines: [
                    { prompt: true, text: '✅ Validation passed', class: 'text-success' },
                    { prompt: false, text: '' }
                ]},
                { progress: 65, lines: [
                    { prompt: true, text: '🔐 Creating AWS IAM user...', class: 'text-warning' }
                ]},
                { progress: 70, lines: [
                    { prompt: true, text: `✅ IAM user created: ${username}`, class: 'text-success' },
                    { prompt: false, text: `   ARN: arn:aws:iam::123456789012:user/${username}`, class: 'text-muted' },
                    { prompt: false, text: '' }
                ]},
                { progress: 78, lines: [
                    { prompt: true, text: '🔑 Generating access keys...', class: 'text-warning' }
                ]},
                { progress: 82, lines: [
                    { prompt: true, text: '✅ Access keys generated', class: 'text-success' },
                    { prompt: false, text: '   Access Key ID: AKIAXXXXXXXXXXXXXXXX', class: 'text-muted' },
                    { prompt: false, text: '' }
                ]},
                { progress: 88, lines: [
                    { prompt: true, text: '📦 Storing credentials in S3...', class: 'text-warning' }
                ]},
                { progress: 92, lines: [
                    { prompt: true, text: `✅ Stored: s3://iam-credentials/${username}.json`, class: 'text-success' },
                    { prompt: false, text: '   Encryption: AES-256-GCM', class: 'text-muted' },
                    { prompt: false, text: '' }
                ]},
                { progress: 94, lines: [
                    { prompt: true, text: `👥 Adding to Department-${department} group...`, class: 'text-warning' }
                ]},
                { progress: 96, lines: [
                    { prompt: true, text: '✅ Group membership assigned', class: 'text-success' },
                    { prompt: false, text: '' }
                ]},
                { progress: 97, lines: [
                    { prompt: true, text: `🔒 Attaching policy: ${getRolePolicy(role)}`, class: 'text-warning' }
                ]},
                { progress: 98, lines: [
                    { prompt: true, text: '✅ Policy attached successfully', class: 'text-success' },
                    { prompt: false, text: '' }
                ]},
                { progress: 99, lines: [
                    { prompt: true, text: '📧 Sending SNS notification...', class: 'text-warning' },
                    { prompt: true, text: '✅ Manager notified via SNS', class: 'text-success' },
                    { prompt: false, text: '' }
                ]},
                { progress: 100, lines: [
                    { prompt: true, text: '📊 Writing to CloudTrail...', class: 'text-warning' },
                    { prompt: true, text: '✅ Audit event logged', class: 'text-success' },
                    { prompt: false, text: '' },
                    { prompt: false, text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', class: 'text-success' },
                    { prompt: false, text: '✨ PROVISIONING COMPLETE ✨', class: 'text-success', bold: true },
                    { prompt: false, text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', class: 'text-success' },
                    { prompt: false, text: '' },
                    { prompt: true, text: '📋 SUMMARY:', class: 'text-accent', bold: true },
                    { prompt: false, text: `   👤 Username: ${username}`, class: '' },
                    { prompt: false, text: `   📧 Email: ${email}`, class: '' },
                    { prompt: false, text: `   🏢 Department: ${department}`, class: '' },
                    { prompt: false, text: `   💼 Role: ${role}`, class: '' },
                    { prompt: false, text: '   ✅ Status: Active', class: 'text-success' },
                    { prompt: false, text: '   🔐 MFA: Required on first login', class: '' }
                ]}
            ];
            
            // Execute steps
            for (let i = 0; i < steps.length; i++) {
                const step = steps[i];
                
                await sleep(i === 0 ? 0 : 400 + Math.random() * 300);
                
                progressBar.style.width = `${step.progress}%`;
                progressText.textContent = `${step.progress}%`;
                
                step.lines.forEach(line => {
                    appendConsoleLine(consoleEl, line);
                });
                
                consoleEl.scrollTop = consoleEl.scrollHeight;
            }
            
            // Final update
            const endTime = Date.now();
            const executionTime = ((endTime - startTime) / 1000).toFixed(1);
            
            appendConsoleLine(consoleEl, { prompt: false, text: '' });
            appendConsoleLine(consoleEl, { prompt: true, text: `⏱️  Execution time: ${executionTime}s`, class: 'text-accent' });
            appendConsoleLine(consoleEl, { prompt: true, text: `🎉 Welcome aboard, ${firstName}!`, class: 'text-success', bold: true });
            
            statusEl.textContent = 'Complete';
            statusEl.className = 'status-badge status-complete';
            provisionBtn.disabled = false;
            executionTimeEl.textContent = `Completed in ${executionTime}s`;
            progressContainer.classList.remove('active');
            
            showToast('Success!', `User ${firstName} ${lastName} provisioned successfully`, 'success');
        });
    }

    function appendConsoleLine(container, { prompt, text, class: className, bold }) {
        const line = document.createElement('div');
        line.className = 'console-line';
        
        if (prompt) {
            const promptEl = document.createElement('span');
            promptEl.className = 'console-prompt';
            promptEl.textContent = '→';
            line.appendChild(promptEl);
        }
        
        const textEl = document.createElement('span');
        textEl.className = `console-text ${className || ''}`;
        textEl.textContent = text;
        if (bold) textEl.style.fontWeight = '600';
        line.appendChild(textEl);
        
        container.appendChild(line);
    }

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

    // ========================================
    // Keyboard Shortcuts
    // ========================================
    function initKeyboardShortcuts() {
        const shortcutsHelp = document.getElementById('shortcutsHelp');
        
        document.addEventListener('keydown', (e) => {
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
                    if (searchInput) searchInput.focus();
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
                    closeAllModals();
                    break;
            }
        });
        
        if (shortcutsHelp) {
            shortcutsHelp.addEventListener('click', (e) => {
                if (e.target === shortcutsHelp) {
                    shortcutsHelp.classList.remove('active');
                }
            });
        }
    }

    // ========================================
    // Toast Notifications
    // ========================================
    function showToast(title, message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        
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
            <span class="toast-icon">${icons[type]}</span>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" onclick="closeToast('${toastId}')">×</button>
        `;
        
        container.appendChild(toast);
        
        setTimeout(() => closeToast(toastId), 5000);
    }

    // ========================================
    // Modal Functions
    // ========================================
    function createModal(title, content, isLarge = false) {
        return `
            <div class="modal-backdrop active" id="featureModal" onclick="handleModalClick(event)">
                <div class="modal-content ${isLarge ? 'feature-modal' : ''}">
                    <div class="modal-header">
                        <h4>${title}</h4>
                        <button class="modal-close" onclick="closeModal()">×</button>
                    </div>
                    <div class="modal-body">
                        ${content}
                    </div>
                </div>
            </div>
        `;
    }

    function showModal(html) {
        const existing = document.getElementById('featureModal');
        if (existing) existing.remove();
        
        document.body.insertAdjacentHTML('beforeend', html);
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        const modal = document.getElementById('featureModal');
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
            document.body.style.overflow = '';
        }
    }

    function closeAllModals() {
        closeModal();
        const shortcutsHelp = document.getElementById('shortcutsHelp');
        if (shortcutsHelp) shortcutsHelp.classList.remove('active');
        closeMobileMenu();
    }

    // ========================================
    // Feature Detail Modals
    // ========================================
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
                showToast('Coming Soon', 'Feature details will be available soon!', 'info');
        }
    }

    function showComplianceDashboard() {
        const html = createModal('Compliance Dashboard', `
            <div class="dashboard-stats">
                <div class="stat-box">
                    <div class="stat-box-value">8,247</div>
                    <div class="stat-box-label">Active Users</div>
                    <div class="stat-box-trend up">↑ 3.2%</div>
                </div>
                <div class="stat-box">
                    <div class="stat-box-value">127</div>
                    <div class="stat-box-label">Dormant Accounts</div>
                    <div class="stat-box-trend down">↓ 15%</div>
                </div>
                <div class="stat-box">
                    <div class="stat-box-value">98.5%</div>
                    <div class="stat-box-label">Compliance Score</div>
                    <div class="stat-box-trend up">↑ 2.1%</div>
                </div>
                <div class="stat-box">
                    <div class="stat-box-value">43</div>
                    <div class="stat-box-label">Pending Reviews</div>
                    <div class="stat-box-trend">Due in 7 days</div>
                </div>
            </div>
            <p style="font-size: var(--text-sm); color: var(--text-secondary); margin-top: var(--space-4);">
                This dashboard demonstrates the kind of compliance monitoring real IAM teams rely on 
                for policy enforcement and access certifications.
            </p>
        `, true);
        showModal(html);
    }

    function showAuditLogs() {
        const html = createModal('Audit Logs', `
            <div class="audit-list">
                <div class="audit-entry">
                    <div class="audit-time">2024-11-17 14:23:45 UTC</div>
                    <div class="audit-action">User Provisioned: john.doe@company.com</div>
                    <div class="audit-details">Created IAM user with Developer role in IT department. Access keys generated and stored in S3.</div>
                </div>
                <div class="audit-entry">
                    <div class="audit-time">2024-11-17 13:15:22 UTC</div>
                    <div class="audit-action">Policy Attached: sarah.johnson@company.com</div>
                    <div class="audit-details">Attached PowerUserAccess policy. Modified by: admin@company.com.</div>
                </div>
                <div class="audit-entry">
                    <div class="audit-time">2024-11-17 11:45:10 UTC</div>
                    <div class="audit-action">Account Deactivated: mike.davis@company.com</div>
                    <div class="audit-details">Account disabled due to employment termination. Access keys revoked.</div>
                </div>
                <div class="audit-entry">
                    <div class="audit-time">2024-11-17 10:30:55 UTC</div>
                    <div class="audit-action">Group Membership Changed: emily.wilson@company.com</div>
                    <div class="audit-details">Added to group: Department-Finance. Previous groups: Department-HR.</div>
                </div>
                <div class="audit-entry">
                    <div class="audit-time">2024-11-17 09:12:33 UTC</div>
                    <div class="audit-action">MFA Enabled: david.brown@company.com</div>
                    <div class="audit-details">Multi-factor authentication configured successfully. Device: Virtual MFA.</div>
                </div>
            </div>
        `, true);
        showModal(html);
    }

    function showDeprovisionWorkflow() {
        const html = createModal('De-provisioning Workflow', `
            <div class="workflow-list">
                <div class="workflow-step">
                    <div class="workflow-number">1</div>
                    <div class="workflow-content">
                        <h4>Trigger Event Detection</h4>
                        <p>System detects termination event from HR system or manual trigger. Workflow initiates within 5 minutes.</p>
                    </div>
                </div>
                <div class="workflow-step">
                    <div class="workflow-number">2</div>
                    <div class="workflow-content">
                        <h4>Account Suspension</h4>
                        <p>User account is immediately disabled in Active Directory and AWS IAM. Login access is revoked across all systems.</p>
                    </div>
                </div>
                <div class="workflow-step">
                    <div class="workflow-number">3</div>
                    <div class="workflow-content">
                        <h4>Access Revocation</h4>
                        <p>All AWS access keys are deactivated. Group memberships removed. IAM policies detached.</p>
                    </div>
                </div>
                <div class="workflow-step">
                    <div class="workflow-number">4</div>
                    <div class="workflow-content">
                        <h4>Data Archival</h4>
                        <p>User data backed up to S3 with AES-256 encryption. 7-year retention for compliance.</p>
                    </div>
                </div>
                <div class="workflow-step">
                    <div class="workflow-number">5</div>
                    <div class="workflow-content">
                        <h4>Notification & Audit</h4>
                        <p>Manager notified via SNS. Complete audit trail logged to CloudTrail.</p>
                    </div>
                </div>
            </div>
        `, true);
        showModal(html);
    }

    function showAWSIntegration() {
        const html = createModal('AWS Integration', `
            <div class="dashboard-stats">
                <div class="stat-box">
                    <div class="stat-box-value" style="font-size: var(--text-lg);">AWS IAM</div>
                    <div class="stat-box-label">User & policy management</div>
                </div>
                <div class="stat-box">
                    <div class="stat-box-value" style="font-size: var(--text-lg);">Amazon S3</div>
                    <div class="stat-box-label">Encrypted credential storage</div>
                </div>
                <div class="stat-box">
                    <div class="stat-box-value" style="font-size: var(--text-lg);">AWS SNS</div>
                    <div class="stat-box-label">Real-time notifications</div>
                </div>
                <div class="stat-box">
                    <div class="stat-box-value" style="font-size: var(--text-lg);">CloudTrail</div>
                    <div class="stat-box-label">Complete audit logging</div>
                </div>
            </div>
            <div style="margin-top: var(--space-6); padding: var(--space-4); background: var(--surface-1); border-radius: var(--radius-md);">
                <p style="font-size: var(--text-sm); color: var(--text-secondary); margin-bottom: var(--space-3);">
                    <strong style="color: var(--text-primary);">Integration Flow:</strong>
                </p>
                <p style="font-size: var(--text-sm); color: var(--text-tertiary); line-height: 1.7;">
                    Python/PowerShell → AWS SDK (boto3) → IAM User Creation → Policy Attachment → 
                    Access Key Generation → S3 Encryption → SNS Notification → CloudTrail Logging
                </p>
            </div>
        `, true);
        showModal(html);
    }

    // ========================================
    // Console Functions
    // ========================================
    function clearConsole() {
        const consoleEl = document.getElementById('console');
        if (consoleEl) {
            consoleEl.innerHTML = `
                <div class="console-line">
                    <span class="console-prompt">→</span>
                    <span class="console-text text-accent">IAM Automation System v2.0</span>
                </div>
                <div class="console-line">
                    <span class="console-prompt">→</span>
                    <span class="console-text text-muted">Console cleared. Awaiting input...</span>
                </div>
            `;
        }
        
        const executionTimeEl = document.getElementById('executionTime');
        if (executionTimeEl) executionTimeEl.textContent = '';
        
        const progressContainer = document.getElementById('progressContainer');
        if (progressContainer) progressContainer.classList.remove('active');
        
        showToast('Console Cleared', 'Ready for new provisioning', 'info');
    }

    function exportConsoleLog() {
        const consoleEl = document.getElementById('console');
        if (!consoleEl) return;
        
        const logText = consoleEl.innerText;
        const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
        const filename = `iam-console-${timestamp}.txt`;
        
        const blob = new Blob([logText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showToast('Export Successful', `Saved as ${filename}`, 'success');
    }

    // ========================================
    // Utility Functions
    // ========================================
    function scrollToDemo() {
        const demoSection = document.getElementById('demo');
        if (demoSection) {
            const headerHeight = 80;
            const targetPosition = demoSection.offsetTop - headerHeight;
            window.scrollTo({ top: targetPosition, behavior: 'smooth' });
        }
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
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

    function closeShortcutsHelp() {
        const shortcutsHelp = document.getElementById('shortcutsHelp');
        if (shortcutsHelp) shortcutsHelp.classList.remove('active');
    }

    function handleModalClick(event) {
        if (event.target.classList.contains('modal-backdrop')) {
            closeModal();
        }
    }

    function closeToast(toastId) {
        const toast = document.getElementById(toastId);
        if (toast) {
            toast.style.animation = 'slideOutRight 0.3s ease-out forwards';
            setTimeout(() => toast.remove(), 300);
        }
    }

    // ========================================
    // Global Exports
    // ========================================
    window.scrollToDemo = scrollToDemo;
    window.showFeatureDetails = showFeatureDetails;
    window.clearConsole = clearConsole;
    window.exportConsoleLog = exportConsoleLog;
    window.closeModal = closeModal;
    window.closeToast = closeToast;
    window.closeShortcutsHelp = closeShortcutsHelp;
    window.handleModalClick = handleModalClick;
    window.showToast = showToast;

    // ========================================
    // Console Branding
    // ========================================
    console.log('%c🔐 IAM Platform Loaded', 'color: #14B8A6; font-size: 14px; font-weight: bold;');
    console.log('%cPress ? for keyboard shortcuts', 'color: #64748B; font-size: 11px;');

})();
