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
                
                <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #5b6b63;">Email Address</label>
                <input type="email" id="authEmail" placeholder="you@example.com" style="width: 100%; padding: 14px; margin-bottom: 20px; border: 2px solid #eee; border-radius: 10px; font-size: 1rem; outline: none; transition: border 0.3s; box-sizing: border-box;" onfocus="this.style.borderColor='#e58f27'" onblur="this.style.borderColor='#eee'">
                
                <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #5b6b63;">Password</label>
                <input type="password" id="authPassword" placeholder="Minimum 6 characters" style="width: 100%; padding: 14px; margin-bottom: 25px; border: 2px solid #eee; border-radius: 10px; font-size: 1rem; outline: none; transition: border 0.3s; box-sizing: border-box;" onfocus="this.style.borderColor='#e58f27'" onblur="this.style.borderColor='#eee'">
                
                <button id="authActionBtn" style="width: 100%; padding: 16px; background: #e58f27; color: white; border: none; border-radius: 30px; font-size: 1.1rem; font-weight: bold; cursor: pointer; transition: 0.3s; box-shadow: 0 10px 20px rgba(229,143,39,0.3);">Sign In</button>
                
                <div style="text-align: center; margin-top: 25px; font-size: 0.95rem; font-weight: 600;">
                    <a href="#" id="authToggleMode" style="color: #1c3f2d; text-decoration: none;">Don't have an account? <span style="color: #e58f27;">Sign Up</span></a>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        let isSignup = false;
        const modal = document.getElementById('authModal');
        const errBox = document.getElementById('authError');
        const title = document.getElementById('authTitle');
        const actionBtn = document.getElementById('authActionBtn');
        const toggleBtn = document.getElementById('authToggleMode');

        document.getElementById('closeAuthModal').onclick = () => modal.style.display = 'none';

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.style.display = 'none';
        });

        toggleBtn.onclick = (e) => {
            e.preventDefault();
            isSignup = !isSignup;
            title.innerText = isSignup ? 'Create Account' : 'Sign In';
            actionBtn.innerText = isSignup ? 'Create Account' : 'Sign In';
            toggleBtn.innerHTML = isSignup 
                ? `Already have an account? <span style="color: #e58f27;">Sign In</span>`
                : `Don't have an account? <span style="color: #e58f27;">Sign Up</span>`;
            errBox.style.display = 'none';
        };

        // Allow Enter key to submit
        [document.getElementById('authEmail'), document.getElementById('authPassword')].forEach(input => {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') actionBtn.click();
            });
        });

        actionBtn.onclick = async () => {
            const email = document.getElementById('authEmail').value.trim();
            const password = document.getElementById('authPassword').value;
            
            if (!email || !password) {
                errBox.innerText = 'Please fill in both email and password.';
                errBox.style.display = 'block';
                return;
            }
            if (password.length < 6) {
                errBox.innerText = 'Password must be at least 6 characters.';
                errBox.style.display = 'block';
                return;
            }

            errBox.style.display = 'none';
            actionBtn.innerText = 'Processing...';
            actionBtn.disabled = true;

            try {
                const endpoint = isSignup ? '/api/signup' : '/api/signin';
                const res = await fetch(endpoint, {
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                let data;
                try {
                    data = await res.json();
                } catch (jsonErr) {
                    throw new Error('Server returned an unreadable response. Please try again.');
                }
                
                if (res.ok && !data.error) {
                    if (isSignup) {
                        // Supabase signup: may require email confirmation
                        // user object is at data.user
                        if (data.user && data.user.email) {
                            // Email confirmation may be required
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
                        // Subtle success without disruptive alert
                        this._showToast('Welcome back! You are now signed in.');
                    }
                } else {
                    const msg = data.error_description
                        || data.error?.message
                        || data.msg
                        || data.error
                        || 'Authentication failed. Please check your credentials.';
                    errBox.style.background = '#fee';
                    errBox.style.color = '#c62828';
                    errBox.innerText = msg;
                    errBox.style.display = 'block';
                }
            } catch (e) {
                errBox.style.background = '#fee';
                errBox.style.color = '#c62828';
                errBox.innerText = e.message || 'Network error. Please check your connection and try again.';
                errBox.style.display = 'block';
            }
            actionBtn.innerText = isSignup ? 'Create Account' : 'Sign In';
            actionBtn.disabled = false;
        };
    },

    _saveSession(data, isAdmin) {
        try {
            const user = data.user || data;
            if (!user || !user.email) return;

            const sessionData = { ...data, is_admin: isAdmin };
            localStorage.setItem('nc_supabase_session', JSON.stringify(sessionData));
            localStorage.setItem('nc_user', JSON.stringify({ name: user.email, email: user.email }));

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
        if (un && this.user && this.user.email) {
            un.innerText = this.user.email.split('@')[0];
        }
    }
};

document.addEventListener('DOMContentLoaded', () => AuthSystem.init());
