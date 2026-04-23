/* auth.js - Hardened for production */
const AuthSystem = {
    isLoggedIn: false,
    isAdmin: false,
    user: null,

    init() {
        try {
            const session = localStorage.getItem('nc_supabase_session');
            if (session) {
                const data = JSON.parse(session);
                this.user = data.user || data;
                this.isLoggedIn = !!(this.user && this.user.email);
                this.isAdmin = data.is_admin || false;
            }
        } catch (e) {
            // Corrupted session – wipe it and start clean
            console.warn('[AUTH] Corrupted session data, clearing.', e);
            localStorage.removeItem('nc_supabase_session');
            localStorage.removeItem('nc_user');
        }
        this.injectAuthModal();
        this.updateUI();
    },

    injectAuthModal() {
        // Guard: don't inject twice
        if (document.getElementById('authModal')) return;

        const modalHTML = `
        <div id="authModal" style="display:none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 9999; background: rgba(0,0,0,0.6); backdrop-filter: blur(5px);">
            <div style="background: white; width: 90%; max-width: 400px; margin: 10vh auto; padding: 35px; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.3); position: relative;">
                <span id="closeAuthModal" style="position: absolute; right: 20px; top: 20px; cursor: pointer; font-size: 24px; font-weight: bold; color: #5b6b63;">&times;</span>
                <h2 id="authTitle" style="color: #1c3f2d; margin-bottom: 25px; font-size: 1.8rem; font-weight: 800;">Sign In</h2>
                
                <div id="authError" style="background: #fee; color: #c62828; padding: 12px; margin-bottom: 20px; border-radius: 8px; font-size: 0.9rem; display: none; font-weight: 600;"></div>
                
                <!-- Sign In / Sign Up Fields -->
                <div id="authFormFields">
                    <div id="firstNameGroup" style="display: none;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #5b6b63;">First Name</label>
                        <input type="text" id="authFirstName" placeholder="Your first name" style="width: 100%; padding: 14px; margin-bottom: 20px; border: 2px solid #eee; border-radius: 10px; font-size: 1rem; outline: none; transition: border 0.3s; box-sizing: border-box;" onfocus="this.style.borderColor='#e58f27'" onblur="this.style.borderColor='#eee'">
                    </div>

                    <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #5b6b63;">Email Address</label>
                    <input type="email" id="authEmail" placeholder="you@example.com" style="width: 100%; padding: 14px; margin-bottom: 20px; border: 2px solid #eee; border-radius: 10px; font-size: 1rem; outline: none; transition: border 0.3s; box-sizing: border-box;" onfocus="this.style.borderColor='#e58f27'" onblur="this.style.borderColor='#eee'">
                    
                    <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #5b6b63;">Password</label>
                    <input type="password" id="authPassword" placeholder="Minimum 6 characters" style="width: 100%; padding: 14px; margin-bottom: 10px; border: 2px solid #eee; border-radius: 10px; font-size: 1rem; outline: none; transition: border 0.3s; box-sizing: border-box;" onfocus="this.style.borderColor='#e58f27'" onblur="this.style.borderColor='#eee'">
                    
                    <div id="forgotPasswordLink" style="text-align: right; margin-bottom: 20px;">
                        <a href="#" id="authForgotBtn" style="color: #e58f27; font-size: 0.85rem; font-weight: 600; text-decoration: none;">Forgot password?</a>
                    </div>
                </div>

                <!-- Forgot Password Fields (hidden by default) -->
                <div id="resetFormFields" style="display: none;">
                    <p style="color: #5b6b63; font-size: 0.95rem; margin-bottom: 20px; line-height: 1.5;">Enter the email address you signed up with and we'll send you a link to reset your password.</p>
                    <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #5b6b63;">Email Address</label>
                    <input type="email" id="resetEmail" placeholder="you@example.com" style="width: 100%; padding: 14px; margin-bottom: 25px; border: 2px solid #eee; border-radius: 10px; font-size: 1rem; outline: none; transition: border 0.3s; box-sizing: border-box;" onfocus="this.style.borderColor='#e58f27'" onblur="this.style.borderColor='#eee'">
                </div>
                
                <button id="authActionBtn" style="width: 100%; padding: 16px; background: #e58f27; color: white; border: none; border-radius: 30px; font-size: 1.1rem; font-weight: bold; cursor: pointer; transition: 0.3s; box-shadow: 0 10px 20px rgba(229,143,39,0.3);">Sign In</button>
                
                <div id="authFooterLinks" style="text-align: center; margin-top: 25px; font-size: 0.95rem; font-weight: 600;">
                    <a href="#" id="authToggleMode" style="color: #1c3f2d; text-decoration: none;">Don't have an account? <span style="color: #e58f27;">Sign Up</span></a>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // ── State ────────────────────────────────────────────────────────
        // Modes: 'signin', 'signup', 'reset'
        let mode = 'signin';

        const modal        = document.getElementById('authModal');
        const errBox       = document.getElementById('authError');
        const title        = document.getElementById('authTitle');
        const actionBtn    = document.getElementById('authActionBtn');
        const toggleBtn    = document.getElementById('authToggleMode');
        const forgotBtn    = document.getElementById('authForgotBtn');
        const forgotLink   = document.getElementById('forgotPasswordLink');
        const authFields   = document.getElementById('authFormFields');
        const resetFields  = document.getElementById('resetFormFields');
        const footerLinks  = document.getElementById('authFooterLinks');

        // ── Helper: Switch between modes ─────────────────────────────────
        const switchMode = (newMode) => {
            mode = newMode;
            errBox.style.display = 'none';
            errBox.style.background = '#fee';
            errBox.style.color = '#c62828';

            if (mode === 'signin') {
                title.innerText = 'Sign In';
                actionBtn.innerText = 'Sign In';
                authFields.style.display = 'block';
                resetFields.style.display = 'none';
                document.getElementById('firstNameGroup').style.display = 'none';
                forgotLink.style.display = 'block';
                footerLinks.style.display = 'block';
                toggleBtn.innerHTML = `Don't have an account? <span style="color: #e58f27;">Sign Up</span>`;
            } else if (mode === 'signup') {
                title.innerText = 'Create Account';
                actionBtn.innerText = 'Create Account';
                authFields.style.display = 'block';
                resetFields.style.display = 'none';
                document.getElementById('firstNameGroup').style.display = 'block';
                forgotLink.style.display = 'none';
                footerLinks.style.display = 'block';
                toggleBtn.innerHTML = `Already have an account? <span style="color: #e58f27;">Sign In</span>`;
            } else if (mode === 'reset') {
                title.innerText = 'Reset Password';
                actionBtn.innerText = 'Send Reset Link';
                authFields.style.display = 'none';
                resetFields.style.display = 'block';
                footerLinks.style.display = 'block';
                toggleBtn.innerHTML = `Remembered your password? <span style="color: #e58f27;">Sign In</span>`;
                // Pre-fill reset email from signin email if available
                const signinEmail = document.getElementById('authEmail').value.trim();
                if (signinEmail) {
                    document.getElementById('resetEmail').value = signinEmail;
                }
            }
        };

        // ── Close handlers ───────────────────────────────────────────────
        document.getElementById('closeAuthModal').onclick = () => modal.style.display = 'none';
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.style.display = 'none';
        });

        // ── Toggle between Sign In / Sign Up ─────────────────────────────
        toggleBtn.onclick = (e) => {
            e.preventDefault();
            if (mode === 'signin') switchMode('signup');
            else switchMode('signin');
        };

        // ── Forgot Password link ─────────────────────────────────────────
        forgotBtn.onclick = (e) => {
            e.preventDefault();
            switchMode('reset');
        };

        // ── Enter key to submit ──────────────────────────────────────────
        ['authEmail', 'authPassword', 'authFirstName', 'resetEmail'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') actionBtn.click();
            });
        });

        // ── Main Action Button ───────────────────────────────────────────
        actionBtn.onclick = async () => {
            errBox.style.display = 'none';

            // ── RESET PASSWORD MODE ──────────────────────────────────────
            if (mode === 'reset') {
                const email = document.getElementById('resetEmail').value.trim();
                if (!email) {
                    this._showError(errBox, 'Please enter your email address.');
                    return;
                }

                actionBtn.innerText = 'Sending...';
                actionBtn.disabled = true;

                try {
                    const res = await fetch('/api/reset-password', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email })
                    });

                    let data;
                    try { data = await res.json(); } 
                    catch(e) { throw new Error('Server returned an unreadable response.'); }

                    // Always show success (security: don't reveal if email exists)
                    errBox.style.background = '#e8f5e9';
                    errBox.style.color = '#2e7d32';
                    errBox.innerHTML = `
                        <i class="fa-solid fa-circle-check" style="margin-right: 6px;"></i>
                        If an account with <strong>${email}</strong> exists, we've sent a password reset link to your inbox. Check your spam folder too!
                    `;
                    errBox.style.display = 'block';
                } catch (e) {
                    this._showError(errBox, e.message || 'Network error. Please try again.');
                }

                actionBtn.innerText = 'Send Reset Link';
                actionBtn.disabled = false;
                return;
            }

            // ── SIGN IN / SIGN UP MODE ───────────────────────────────────
            const email = document.getElementById('authEmail').value.trim();
            const password = document.getElementById('authPassword').value;
            const firstName = mode === 'signup' ? document.getElementById('authFirstName').value.trim() : '';
            
            if (mode === 'signup' && !firstName) {
                this._showError(errBox, 'Please enter your first name.');
                return;
            }
            if (!email || !password) {
                this._showError(errBox, 'Please fill in both email and password.');
                return;
            }
            if (password.length < 6) {
                this._showError(errBox, 'Password must be at least 6 characters.');
                return;
            }

            actionBtn.innerText = 'Processing...';
            actionBtn.disabled = true;

            try {
                const endpoint = mode === 'signup' ? '/api/signup' : '/api/signin';
                const body = mode === 'signup' 
                    ? { email, password, firstName } 
                    : { email, password };

                const res = await fetch(endpoint, {
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });

                let data;
                try {
                    data = await res.json();
                } catch (jsonErr) {
                    throw new Error('Server returned an unreadable response. Please try again.');
                }
                
                if (res.ok && !data.error) {
                    if (mode === 'signup') {
                        // Supabase signup: may require email confirmation
                        if (data.user && data.user.email) {
                            const needsConfirm = !data.user.confirmed_at && !data.user.email_confirmed_at;
                            if (needsConfirm) {
                                errBox.style.background = '#e8f5e9';
                                errBox.style.color = '#2e7d32';
                                errBox.innerText = '✅ Account created! Please check your email to confirm your account, then sign in.';
                                errBox.style.display = 'block';
                                actionBtn.innerText = 'Create Account';
                                actionBtn.disabled = false;
                                return;
                            }
                        }
                        // Auto sign-in after signup if no confirmation needed
                        const sessionData = { user: data.user || data };
                        this._saveSession(sessionData, false);
                    } else {
                        // Sign in: data is the full session object
                        this._saveSession(data, data.is_admin || false);
                    }

                    modal.style.display = 'none';
                    this.updateUI();

                    // Notify other parts of the page (e.g. account.html dashboard)
                    document.dispatchEvent(new CustomEvent('authStateChanged', { detail: { isLoggedIn: true } }));

                    if (this.isAdmin) {
                        window.location.href = './admin.html';
                    } else if (window.location.pathname.includes('account.html')) {
                        window.location.reload();
                    } else {
                        const name = this.user?.user_metadata?.first_name || email.split('@')[0];
                        this._showToast(`Welcome back, ${name}! You are now signed in.`);
                    }
                } else {
                    // ── Smart Error Handling ──────────────────────────────
                    const rawMsg = data.error_description
                        || data.error?.message
                        || data.msg
                        || data.error
                        || '';

                    if (mode === 'signup' && this._isDuplicateEmailError(rawMsg)) {
                        // Email already registered during signup
                        errBox.style.background = '#fff3e0';
                        errBox.style.color = '#e65100';
                        errBox.innerHTML = `
                            <i class="fa-solid fa-circle-exclamation" style="margin-right: 6px;"></i>
                            This email is already registered.<br>
                            <span style="display: inline-block; margin-top: 8px;">
                                <a href="#" id="errSwitchSignin" style="color: #1c3f2d; font-weight: 700; text-decoration: underline;">Sign in instead</a>
                                &nbsp;or&nbsp;
                                <a href="#" id="errResetPassword" style="color: #e58f27; font-weight: 700; text-decoration: underline;">Reset your password</a>
                            </span>
                        `;
                        errBox.style.display = 'block';

                        // Wire up the inline links
                        setTimeout(() => {
                            const signInLink = document.getElementById('errSwitchSignin');
                            const resetLink = document.getElementById('errResetPassword');
                            if (signInLink) signInLink.onclick = (e) => { e.preventDefault(); switchMode('signin'); };
                            if (resetLink) resetLink.onclick = (e) => { e.preventDefault(); switchMode('reset'); };
                        }, 0);

                    } else if (mode === 'signin' && this._isInvalidCredentialsError(rawMsg)) {
                        // Wrong password / email not found during sign in
                        errBox.style.background = '#fee';
                        errBox.style.color = '#c62828';
                        errBox.innerHTML = `
                            <i class="fa-solid fa-lock" style="margin-right: 6px;"></i>
                            Incorrect email or password.<br>
                            <span style="display: inline-block; margin-top: 8px;">
                                <a href="#" id="errForgotPassword" style="color: #e58f27; font-weight: 700; text-decoration: underline;">Forgot your password?</a>
                            </span>
                        `;
                        errBox.style.display = 'block';

                        setTimeout(() => {
                            const forgotLink = document.getElementById('errForgotPassword');
                            if (forgotLink) forgotLink.onclick = (e) => { e.preventDefault(); switchMode('reset'); };
                        }, 0);

                    } else {
                        // Generic fallback
                        this._showError(errBox, rawMsg || 'Authentication failed. Please check your credentials.');
                    }
                }
            } catch (e) {
                this._showError(errBox, e.message || 'Network error. Please check your connection and try again.');
            }
            actionBtn.innerText = mode === 'signup' ? 'Create Account' : 'Sign In';
            actionBtn.disabled = false;
        };
    },

    // ── Error Detection Helpers ──────────────────────────────────────────
    _isDuplicateEmailError(msg) {
        if (!msg) return false;
        const lower = msg.toLowerCase();
        return lower.includes('already registered') 
            || lower.includes('already been registered')
            || lower.includes('user already exists')
            || lower.includes('already exists')
            || lower.includes('duplicate')
            || lower.includes('unique constraint');
    },

    _isInvalidCredentialsError(msg) {
        if (!msg) return false;
        const lower = msg.toLowerCase();
        return lower.includes('invalid login credentials')
            || lower.includes('invalid credentials')
            || lower.includes('wrong password')
            || lower.includes('invalid email or password')
            || lower.includes('unauthorized');
    },

    _showError(errBox, message) {
        errBox.style.background = '#fee';
        errBox.style.color = '#c62828';
        errBox.innerText = message;
        errBox.style.display = 'block';
    },

    _saveSession(data, isAdmin) {
        try {
            const user = data.user || data;
            if (!user || !user.email) return;

            const sessionData = { ...data, is_admin: isAdmin };
            localStorage.setItem('nc_supabase_session', JSON.stringify(sessionData));
            localStorage.setItem('nc_user', JSON.stringify({ ...user, name: user.email }));

            this.user = user;
            this.isLoggedIn = true;
            this.isAdmin = isAdmin;
        } catch (e) {
            console.error('[AUTH] Failed to save session:', e);
        }
    },

    _showToast(message) {
        const existing = document.getElementById('ncToast');
        if (existing) existing.remove();
        const toast = document.createElement('div');
        toast.id = 'ncToast';
        toast.style.cssText = 'position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:#1c3f2d;color:white;padding:14px 28px;border-radius:30px;font-weight:600;font-size:0.95rem;z-index:10000;box-shadow:0 8px 24px rgba(0,0,0,0.2);animation:fadeIn 0.3s ease;';
        toast.innerText = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3500);
    },

    toggleLogin() {
        if (this.isLoggedIn) {
            if (!confirm('Are you sure you want to sign out?')) return;
            localStorage.removeItem('nc_supabase_session');
            localStorage.removeItem('nc_user');
            this.user = null;
            this.isLoggedIn = false;
            this.isAdmin = false;
            this.updateUI();
            document.dispatchEvent(new CustomEvent('authStateChanged', { detail: { isLoggedIn: false } }));
            const isProtectedPage = window.location.pathname.includes('account.html') || window.location.pathname.includes('admin.html');
            if (isProtectedPage) {
                window.location.href = './index.html';
            }
        } else {
            const modal = document.getElementById('authModal');
            if (modal) modal.style.display = 'block';
        }
    },

    updateUI() {
        // Update all sign-in/out icons and text (there may be multiple on a page)
        document.querySelectorAll('#authIcon').forEach(icon => {
            icon.className = this.isLoggedIn ? 'fa-solid fa-arrow-right-from-bracket' : 'fa-solid fa-right-to-bracket';
        });
        document.querySelectorAll('#authText').forEach(text => {
            text.innerText = this.isLoggedIn ? 'Sign Out' : 'Sign In';
        });

        // Toggle Admin Dashboard link in nav
        const navList = document.querySelector('nav ul');
        if (navList) {
            let adminLink = document.getElementById('adminNavLink');
            if (this.isAdmin && !adminLink) {
                const li = document.createElement('li');
                li.id = 'adminNavLink';
                li.innerHTML = `<a href="./admin.html" style="color: #e58f27; font-weight: 800;"><i class="fa-solid fa-screwdriver-wrench"></i> D-Board</a>`;
                navList.insertBefore(li, navList.lastElementChild);
            } else if (!this.isAdmin && adminLink) {
                adminLink.remove();
            }
        }

        // Update username display if present
        const un = document.getElementById('userName');
        if (un && this.user) {
            let firstName = 'Guest';
            
            // Priority 1: Metadata from Supabase
            if (this.user.user_metadata && this.user.user_metadata.first_name) {
                firstName = this.user.user_metadata.first_name;
            } 
            // Priority 2: Guess from email
            else if (this.user.email) {
                const emailPart = this.user.email.split('@')[0];
                const namePart = emailPart.split('.')[0].split('_')[0].split('-')[0];
                firstName = namePart.charAt(0).toUpperCase() + namePart.slice(1).toLowerCase();
            }
            
            un.innerText = firstName;
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    AuthSystem.init();
    // Dispatch event after a small delay to ensure all DOM listeners are ready
    setTimeout(() => {
        if (AuthSystem.isLoggedIn) {
            document.dispatchEvent(new CustomEvent('authStateChanged', { 
                detail: { isLoggedIn: true, user: AuthSystem.user } 
            }));
        }
    }, 100);
});
