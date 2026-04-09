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
            adminName.innerText = user.name.split('@')[0];
        }

        this.loadBookings();
        this.setupEventListeners();
    },

    setupEventListeners() {
        const tabs = document.querySelectorAll('.admin-nav a[data-tab]');
        tabs.forEach(tab => {
            tab.onclick = (e) => {
                e.preventDefault();
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                // Tab switching logic can go here for Orders/Analytics
                const activeTab = tab.getAttribute('data-tab');
                console.log(`Switching to ${activeTab} tab...`);
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
    }
};

document.addEventListener('DOMContentLoaded', () => AdminDashboard.init());
