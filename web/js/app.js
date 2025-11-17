// IAM Automation Dashboard JavaScript

document.getElementById('provisionForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const email = document.getElementById('email').value;
    const department = document.getElementById('department').value;
    const role = document.getElementById('role').value;
    const username = (firstName.charAt(0) + lastName).toLowerCase();
    
    const console = document.getElementById('console');
    console.innerHTML = '';
    
    // Simulate provisioning workflow
    const steps = [
        { delay: 500, text: 🔄 Starting provisioning for  ... },
        { delay: 1000, text: 📝 Validating user data... },
        { delay: 1500, text: ✅ Validation complete },
        { delay: 2000, text: 🔐 Creating AWS IAM user:  },
        { delay: 2500, text: ✅ IAM user created: arn:aws:iam::123456789012:user/ },
        { delay: 3000, text: 🔑 Generating access keys... },
        { delay: 3500, text: ✅ Access keys created: AKIA************ },
        { delay: 4000, text: 📦 Storing encrypted credentials in S3... },
        { delay: 4500, text: ✅ Credentials stored: s3://iam-credentials/.json },
        { delay: 5000, text: 👥 Adding to department group:  },
        { delay: 5500, text: ✅ Added to group: GRP_ },
        { delay: 6000, text: 🔒 Attaching role-based policy:  },
        { delay: 6500, text: ✅ Policy attached:  },
        { delay: 7000, text: 📧 Sending notification via SNS... },
        { delay: 7500, text: ✅ Notification sent to manager },
        { delay: 8000, text: 📊 Logging audit event... },
        { delay: 8500, text: ✅ Audit log written to CloudTrail },
        { delay: 9000, text: `, html: <div style="color: #10B981; font-weight: bold; font-size: 1.1rem;">━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div> },
        { delay: 9200, text: ✨ PROVISIONING COMPLETE ✨, color: '#10B981' },
        { delay: 9400, text: `, html: <div style="color: #10B981; font-weight: bold; font-size: 1.1rem;">━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div> },
        { delay: 9600, text: 📋 Summary: },
        { delay: 9800, text:    Username:  },
        { delay: 10000, text:    Email:  },
        { delay: 10200, text:    Department:  },
        { delay: 10400, text:    Role:  },
        { delay: 10600, text:    Status: ✅ Active },
        { delay: 11000, text: ⏱️ Total time: 8.5 seconds },
        { delay: 11500, text: 💾 User data archived for compliance }
    ];
    
    for (const step of steps) {
        await new Promise(resolve => setTimeout(resolve, step.delay - (steps[steps.indexOf(step) - 1]?.delay || 0)));
        const line = document.createElement('div');
        line.className = 'console-line';
        if (step.html) {
            line.innerHTML = step.html;
        } else {
            line.textContent = step.text;
            if (step.color) line.style.color = step.color;
        }
        console.appendChild(line);
        console.scrollTop = console.scrollHeight;
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

function showProvision() {
    document.getElementById('demo').scrollIntoView({ behavior: 'smooth' });
}

function showDeprovision() {
    alert('De-provisioning demo coming soon!');
}

function showCompliance() {
    alert('Compliance dashboard coming soon!');
}

function showAudit() {
    alert('Audit logs viewer coming soon!');
}

function showScripts() {
    window.open('https://github.com/Mjkhan9/Automated-IAM-User-Lifecycle-Management-System-Project/tree/main/scripts', '_blank');
}

function showAWS() {
    alert('AWS integration details: IAM, S3, SNS, CloudTrail');
}
