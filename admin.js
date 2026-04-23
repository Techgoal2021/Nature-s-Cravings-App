/* admin.js */
const AdminDashboard = {
    bookings: [],

    init() {
        // Security check: If not logged in as admin, redirect home
        const session = localStorage.getItem('nc_supabase_session');
        if (!session || !JSON.parse(session).is_admin) {
            alert("Access Denied. Administrator credentials required.");
            window.location.href = './index.html';
            return;
        }

        const user = JSON.parse(localStorage.getItem('nc_user'));
        const adminName = document.getElementById('adminName');
        if (adminName && user) {
            let name = user.email.split('@')[0];
            if (user.user_metadata && user.user_metadata.first_name) {
                name = user.user_metadata.first_name;
            }
            adminName.innerText = name;
        }

        this.loadBookings();
        this.loadOrders();
        this.setupEventListeners();
    },

    setupEventListeners() {
        const tabs = document.querySelectorAll('.admin-nav a[data-tab]');
        tabs.forEach(tab => {
            tab.onclick = (e) => {
                e.preventDefault();
                const targetTab = tab.getAttribute('data-tab');
                
                // Update UI active states
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                // Switch visible sections
                document.querySelectorAll('.admin-content').forEach(section => section.classList.remove('active'));
                
                if (targetTab === 'dashboard') {
                    document.getElementById('dashboardSection').classList.add('active');
                } else if (targetTab === 'bookings') {
                    // We can reuse the same section or show a specific list
                    document.getElementById('dashboardSection').classList.add('active');
                    this.loadBookings();
                } else if (targetTab === 'orders') {
                    document.getElementById('ordersSection').classList.add('active');
                    this.loadOrders();
                }
                
                console.log(`Switched to ${targetTab} tab.`);
            };
        });
    },

    async loadBookings() {
        const tbody = document.getElementById('bookingsBody');
        const countDisplay = document.getElementById('totalBookings');
        
        try {
            const res = await fetch('/api/admin/bookings');
            const text = await res.text();
            
            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                console.error("Malformed JSON:", text);
                throw new Error("Invalid response from server. Check your Supabase connection.");
            }
            
            if (res.ok && Array.isArray(data)) {
                this.bookings = data;
                countDisplay.innerText = data.length;
                this.renderBookings(data);
            } else {
                throw new Error(data.error || "Failed to load database. Ensure you are logged in as an Admin.");
            }
        } catch (e) {
            tbody.innerHTML = `<tr><td colspan="5" style="color:#e74c3c; text-align:center; padding: 20px; font-weight: bold;">
                <i class="fa-solid fa-triangle-exclamation"></i> ${e.message}
            </td></tr>`;
        }
    },

    renderBookings(bookings) {
        const tbody = document.getElementById('bookingsBody');
        if (!bookings || bookings.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No reservations found yet.</td></tr>`;
            return;
        }

        tbody.innerHTML = bookings.map(b => `
            <tr>
                <td>
                    <div style="font-weight: 800;">${b.name || 'Anonymous'}</div>
                    <div style="font-size: 0.8rem; color: #7f8c8d;">${b.email || 'No email'}</div>
                </td>
                <td>${this.formatDate(b.bookingDate || b.date)}</td>
                <td>${b.bookingTime || b.time || 'N/A'}</td>
                <td>${b.guests || b.people || 1}</td>
                <td><span class="status-badge status-confirmed">Confirmed</span></td>
            </tr>
        `).join('');
    },

    formatDate(dateStr) {
        if (!dateStr) return 'N/A';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    },

    loadOrders() {
        const saved = localStorage.getItem('nc_orders');
        let orders = [];
        if (saved) {
            try {
                orders = JSON.parse(saved);
            } catch (e) {
                console.error("Failed to parse local orders:", e);
            }
        }
        
        this.renderOrders(orders);
        this.calculateAnalytics(orders);
    },

    renderOrders(orders) {
        const tbody = document.getElementById('ordersBody');
        if (!orders || orders.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No orders found yet.</td></tr>`;
            return;
        }

        tbody.innerHTML = orders.map(o => `
            <tr>
                <td><code style="background:#eee; padding:2px 5px; border-radius:4px;">${o.id}</code></td>
                <td>Guest Customer</td>
                <td>${o.date}</td>
                <td style="font-weight:bold; color:#1c3f2d;">${o.total}</td>
                <td>
                    <div style="font-size:0.8rem; color:#666;">
                        ${(o.items || []).map(i => `${i.qty}x ${i.name}`).join(', ')}
                    </div>
                </td>
            </tr>
        `).join('');
    },

    calculateAnalytics(orders) {
        const pendingCount = document.getElementById('pendingOrders');
        const revenueDisplay = document.getElementById('estRevenue');
        
        if (pendingCount) pendingCount.innerText = orders.length;
        
        const totalRev = orders.reduce((sum, o) => {
            const val = parseFloat(o.total.replace(/[^0-9.]/g, '')) || 0;
            return sum + val;
        }, 0);
        
        if (revenueDisplay) revenueDisplay.innerText = `$${totalRev.toFixed(2)}`;
    }
};

document.addEventListener('DOMContentLoaded', () => AdminDashboard.init());
