// ====================== AUTHENTICATION SYSTEM ======================

// Valid credentials configuration
const AUTH_CONFIG = {
    validCredentials: [
        { email: 'admin@gmai.com', password: 'admin123' },
        { email: 'manager@attendance.com', password: 'manager123' },
        { email: 'coordinator@attendance.com', password: 'coord123' }
    ]
};

// Main authentication function called when "Manage Batches" is clicked
async function authenticateAndRedirect() {
    try {
        const result = await Swal.fire({
            title: '🔒 Authentication Required',
            html: `
                <div style="text-align: left; padding: 0 20px;">
                    <div style="margin-bottom: 15px;">
                        <label for="auth-email" style="display: block; margin-bottom: 5px; font-weight: 600;">📧 Email Address:</label>
                        <input type="email" id="auth-email" class="swal2-input" placeholder="Enter your email" 
                               style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px;">
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label for="auth-password" style="display: block; margin-bottom: 5px; font-weight: 600;">🔑 Password:</label>
                        <div style="position: relative;">
                            <input type="password" id="auth-password" class="swal2-input" placeholder="Enter your password"
                                   style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px; padding-right: 45px;">
                            <button type="button" id="toggle-password" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; font-size: 18px; cursor: pointer;">👁️</button>
                        </div>
                    </div>
                    <div style="margin-top: 15px; text-align: center;">
                        <small style="color: #666;">
                            💡 <a href="#" onclick="showCredentials()" style="color: #007bff; text-decoration: none;">Click here to see valid credentials</a>
                        </small>
                    </div>
                </div>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: '🚀 Access Batch Manager',
            cancelButtonText: '❌ Cancel',
            confirmButtonColor: '#004d61',
            cancelButtonColor: '#6c757d',
            width: '450px',
            focusConfirm: false,
            allowOutsideClick: false,
            didOpen: () => {
                // Add password toggle functionality
                const toggleBtn = document.getElementById('toggle-password');
                const passwordInput = document.getElementById('auth-password');
                
                if (toggleBtn && passwordInput) {
                    toggleBtn.addEventListener('click', () => {
                        if (passwordInput.type === 'password') {
                            passwordInput.type = 'text';
                            toggleBtn.textContent = '🙈';
                        } else {
                            passwordInput.type = 'password';
                            toggleBtn.textContent = '👁️';
                        }
                    });
                }

                // Focus on email input
                document.getElementById('auth-email').focus();
            },
            preConfirm: () => {
                const email = document.getElementById('auth-email').value.trim();
                const password = document.getElementById('auth-password').value;

                // Validation checks
                if (!email) {
                    Swal.showValidationMessage('❌ Please enter your email address');
                    return false;
                }

                if (!password) {
                    Swal.showValidationMessage('❌ Please enter your password');
                    return false;
                }

                // Email format validation
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    Swal.showValidationMessage('❌ Please enter a valid email address');
                    return false;
                }

                // Check credentials against our valid list
                const validUser = AUTH_CONFIG.validCredentials.find(
                    user => user.email.toLowerCase() === email.toLowerCase() && user.password === password
                );

                if (!validUser) {
                    Swal.showValidationMessage('❌ Invalid email or password. Please check your credentials and try again.');
                    return false;
                }

                return { email: validUser.email, password: validUser.password };
            }
        });

        // If user confirmed and validation passed
        if (result.isConfirmed && result.value) {
            // Show success message
            await Swal.fire({
                icon: 'success',
                title: '✅ Authentication Successful!',
                text: `Welcome ${result.value.email}! Redirecting to Batch Manager...`,
                showConfirmButton: false,
                timer: 1500,
                timerProgressBar: true
            });
            
            // Redirect to batch manager after success message
            window.location.href = 'batch-manager.html';
        }
        // If user cancelled or validation failed, stay on current page
        // No action needed - user stays on index.html
        
    } catch (error) {
        console.error('Authentication error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Authentication Error',
            text: 'An error occurred during authentication. Please try again.'
        });
    }
}

// Function to show valid credentials (helper function)
function showCredentials() {
    Swal.fire({
        title: '🔑 Valid Test Credentials',
        html: `
            <div style="text-align: left; padding: 0 20px;">
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 10px 0;">
                    <h6 style="color: #004d61; margin-bottom: 8px;">👑 Admin Access:</h6>
                    <p style="margin: 5px 0;"><strong>Email:</strong> admin@attendance.com</p>
                    <p style="margin: 5px 0;"><strong>Password:</strong> admin123</p>
                </div>
                
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 10px 0;">
                    <h6 style="color: #004d61; margin-bottom: 8px;">🏢 Manager Access:</h6>
                    <p style="margin: 5px 0;"><strong>Email:</strong> manager@attendance.com</p>
                    <p style="margin: 5px 0;"><strong>Password:</strong> manager123</p>
                </div>
                
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 10px 0;">
                    <h6 style="color: #004d61; margin-bottom: 8px;">🤝 Coordinator Access:</h6>
                    <p style="margin: 5px 0;"><strong>Email:</strong> coordinator@attendance.com</p>
                    <p style="margin: 5px 0;"><strong>Password:</strong> coord123</p>
                </div>
                
                <div style="text-align: center; margin-top: 15px;">
                    <small style="color: #666; font-style: italic;">
                        ℹ️ These are demo credentials for testing purposes
                    </small>
                </div>
            </div>
        `,
        icon: 'info',
        confirmButtonText: 'Got it! 👍',
        confirmButtonColor: '#004d61',
        width: '500px'
    });
}