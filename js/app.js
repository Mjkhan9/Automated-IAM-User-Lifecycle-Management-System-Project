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
    const messages = {
        'deprovision': 'De-provisioning workflow automates account deactivation, access revocation, and compliance archiving when employees transition roles or leave the organization.',
        'compliance': 'Compliance dashboard provides real-time monitoring of dormant accounts, policy violations, and access certifications with automated remediation workflows.',
        'audit': 'Audit logging system maintains comprehensive 7-year encrypted trails of all IAM operations with CloudTrail integration for forensic analysis and compliance reporting.',
        'aws': 'AWS Integration seamlessly connects with IAM, S3, SNS, CloudTrail, and other AWS services to provide complete cloud infrastructure automation and monitoring.'
    };
    
    showNotification(messages[feature] || 'Feature details coming soon!', 'info');
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
