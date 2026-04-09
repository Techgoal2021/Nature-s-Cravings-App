/* auth.js */
const AuthSystem = {
    isLoggedIn: false,
    isAdmin: false,
    user: null,

    init() {
        // Read Supabase session from localStorage
        const session = localStorage.getItem('nc_supabase_session');
        if (session) {
            const data = JSON.parse(session);
            // In case session data is nested
            this.user = data.user || data;
            this.isLoggedIn = true;
            this.isAdmin = data.is_admin || false;
        }
        this.injectAuthModal();
        this.updateUI();
    },

    injectAuthModal() {
        const modalHTML = `
        <div id="authModal" style="display:none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 9999; background: rgba(0,0,0,0.6); backdrop-filter: blur(5px);">
            <div style="background: white; width: 90%; max-width: 400px; margin: 10vh auto; padding: 35px; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.3); position: relative;">
                <span id="closeAuthModal" style="position: absolute; right: 20px; top: 20px; cursor: pointer; font-size: 24px; font-weight: bold; color: #5b6b63;">&times;</span>
                <h2 id="authTitle" style="color: #1c3f2d; margin-bottom: 25px; font-size: 1.8rem; font-weight: 800;">Sign In</h2>
                
                <div id="authError" style="background: #fee; color: #c62828; padding: 12px; margin-bottom: 20px; border-radius: 8px; font-size: 0.9rem; display: none; font-weight: 600;"></div>
                
                <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #5b6b63;">Email Address</label>
                <input type="email" id="authEmail" placeholder="you@example.com" style="width: 100%; padding: 14px; margin-bottom: 20px; border: 2px solid #eee; border-radius: 10px; font-size: 1rem; outline: none; transition: border 0.3s;" onfocus="this.style.borderColor='#e58f27'" onblur="this.style.borderColor='#eee'">
                
                <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #5b6b63;">Password</label>
                <input type="password" id="authPassword" placeholder="Minimum 6 characters" style="width: 100%; padding: 14px; margin-bottom: 25px; border: 2px solid #eee; border-radius: 10px; font-size: 1rem; outline: none; transition: border 0.3s;" onfocus="this.style.borderColor='#e58f27'" onblur="this.style.borderColor='#eee'">
                
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

        actionBtn.onclick = async () => {
            const email = document.getElementById('authEmail').value;
            const password = document.getElementById('authPassword').value;
            
            if(!email || !password) {
                errBox.innerText = "Please fill in all fields.";
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
                const data = await res.json();
                
                if (res.ok && !data.error) {
                    let sessionData = isSignup ? { user: data.user || data } : data;
                    localStorage.setItem('nc_supabase_session', JSON.stringify(sessionData));
                    localStorage.setItem('nc_user', JSON.stringify({ name: sessionData.user.email, email: sessionData.user.email }));
                    
                    AuthSystem.isLoggedIn = true;
                    // Support both nested and flat response structures
                    AuthSystem.user = sessionData.user || sessionData;
                    AuthSystem.isAdmin = data.is_admin || false;

                    modal.style.display = 'none';
                    AuthSystem.updateUI();
                    
                    if (AuthSystem.isAdmin) {
                        alert("Welcome, Administrator!");
                        window.location.href = './admin.html';
                    } else if(window.location.pathname.includes('account.html')) {
                        window.location.reload();
                    } else {
                        alert("Successfully authenticated!");
                    }
                } else {
                    errBox.innerText = data.error_description || data.msg || data.error?.message || "Authentication Failed";
                    errBox.style.display = 'block';
                }
            } catch(e) {
                errBox.innerText = "Network Error connecting to server.";
                errBox.style.display = 'block';
            }
            actionBtn.innerText = isSignup ? 'Create Account' : 'Sign In';
            actionBtn.disabled = false;
        };
    },

    toggleLogin() {
        if (this.isLoggedIn) {
            localStorage.removeItem('nc_supabase_session');
            localStorage.removeItem('nc_user');
            this.user = null;
            this.isLoggedIn = false;
            this.isAdmin = false;
            this.updateUI();
            if(window.location.pathname.includes('account.html') || window.location.pathname.includes('admin.html')) {
                window.location.href = './index.html';
            }
        } else {
            document.getElementById('authModal').style.display = 'block';
        }
    },

    updateUI() {
        const icons = document.querySelectorAll('#authIcon');
        const texts = document.querySelectorAll('#authText');
        
        icons.forEach(icon => {
            icon.className = this.isLoggedIn ? 'fa-solid fa-arrow-right-from-bracket' : 'fa-solid fa-right-to-bracket';
        });
        texts.forEach(text => {
            text.innerText = this.isLoggedIn ? 'Sign Out' : 'Sign In';
        });

        // Toggle Admin Link
        const navList = document.querySelector('nav ul');
        if (navList) {
            let adminLink = document.getElementById('adminNavLink');
            if (this.isAdmin) {
                if (!adminLink) {
                    const li = document.createElement('li');
                    li.id = 'adminNavLink';
                    li.innerHTML = `<a href="./admin.html" style="color: #e58f27; font-weight: 800;"><i class="fa-solid fa-screwdriver-wrench"></i> D-Board</a>`;
                    navList.insertBefore(li, navList.children[navList.children.length - 1]);
                }
            } else if (adminLink) {
                adminLink.remove();
            }
        }

        const un = document.getElementById('userName');
        if (un && this.user) un.innerText = this.user.email.split('@')[0];
    }
};

document.addEventListener('DOMContentLoaded', () => AuthSystem.init());
