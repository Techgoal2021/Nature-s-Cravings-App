// --- Global Shopping Cart & Interswitch Checkout System ---

const CartSystem = {
    items: [],
    
    init() {
        // Load cache
        const saved = localStorage.getItem('natureCart');
        if (saved) {
            this.items = JSON.parse(saved);
        }
        
        this.injectUI();
        this.updateBadge();
        
        // Expose to globally accessible level for inline HTML onclicks 
        window.addToCart = this.addItem.bind(this);
    },

    save() {
        localStorage.setItem('natureCart', JSON.stringify(this.items));
        this.updateBadge();
        this.renderDrawer();
    },

    addItem(name, price) {
        // Clean price string (e.g. "$15.99" -> 15.99)
        const numPrice = parseFloat(price.toString().replace(/[^0-9.]/g, ''));
        
        const existing = this.items.find(i => i.name === name);
        if (existing) {
            existing.qty += 1;
        } else {
            this.items.push({ name, price: numPrice, qty: 1 });
        }
        this.save();
        this.openDrawer();
    },

    removeItem(index) {
        this.items.splice(index, 1);
        this.save();
    },

    getTotal() {
        return this.items.reduce((total, item) => total + (Number(item.price || 0) * Number(item.qty || 1)), 0);
    },

    updateBadge() {
        const bdg = document.getElementById('navCartBadge');
        if (!bdg) return;
        const totalQty = this.items.reduce((sum, item) => sum + Number(item.qty || 1), 0);
        if(totalQty > 0) {
            bdg.style.display = 'flex';
            bdg.innerText = totalQty;
        } else {
            bdg.style.display = 'none';
        }
    },

    injectUI() {
        const uiHTML = `
        <style>
            .cart-drawer-overlay {
                position: fixed;
                top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.5);
                backdrop-filter: blur(5px);
                z-index: 2000;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.3s ease;
            }
            .cart-drawer-overlay.show {
                opacity: 1;
                pointer-events: auto;
            }
            .cart-drawer {
                position: fixed;
                top: 0; right: -400px;
                width: 100%;
                max-width: 400px;
                height: 100vh;
                background: #f6f3eb;
                z-index: 2001;
                box-shadow: -5px 0 30px rgba(0,0,0,0.1);
                transition: right 0.4s ease;
                display: flex;
                flex-direction: column;
                font-family: 'Outfit', sans-serif;
            }
            .cart-drawer.show {
                right: 0;
            }
            .cart-header {
                padding: 20px;
                background: #1c3f2d;
                color: white;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .cart-close {
                font-size: 28px;
                cursor: pointer;
                color: #e58f27;
            }
            .cart-items {
                flex: 1;
                overflow-y: auto;
                padding: 20px;
            }
            .cart-item {
                background: white;
                padding: 15px;
                border-radius: 12px;
                margin-bottom: 15px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                box-shadow: 0 4px 10px rgba(0,0,0,0.03);
            }
            .cart-item h4 { margin: 0 0 5px; color: #1c3f2d; }
            .cart-item p { margin: 0; color: #5b6b63; font-weight: bold; }
            .remove-btn { color: #D32F2F; cursor: pointer; font-size: 18px; }
            .cart-footer {
                padding: 20px;
                background: white;
                border-top: 1px solid #e1e4e3;
            }
            .cart-total {
                display: flex;
                justify-content: space-between;
                font-size: 1.2rem;
                font-weight: bold;
                color: #1c3f2d;
                margin-bottom: 20px;
            }
            .interswitch-btn {
                background: #00425F;
                color: white;
                width: 100%;
                padding: 15px;
                border: none;
                border-radius: 50px;
                font-size: 1.1rem;
                font-weight: bold;
                cursor: pointer;
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 10px;
                transition: background 0.3s;
            }
            .interswitch-btn:hover { background: #002d42; }
            .interswitch-btn:disabled { background: #a0acab; cursor: not-allowed; }
            .checkout-loading {
                display: none;
                margin-top: 10px;
                text-align: center;
                color: #e58f27;
                font-weight: bold;
            }
        </style>

        <div class="cart-drawer-overlay" id="cartOverlay"></div>
        <div class="cart-drawer" id="cartDrawer">
            <div class="cart-header">
                <h2 style="margin:0;">Your Order</h2>
                <div class="cart-close" id="closeCartBtn">&times;</div>
            </div>
            <div class="cart-items" id="cartItemsList">
                <!-- Injected via JS -->
            </div>
            <div class="cart-footer">
                <div class="cart-total">
                    <span>Total:</span>
                    <span id="cartTotalSum">$0.00</span>
                </div>
                <button class="interswitch-btn" id="checkoutBtn">
                    <span id="btnIcon"><i class="fa-solid fa-lock"></i></span>
                    <span id="btnText">Pay with Interswitch</span>
                    <div id="btnSpinner" style="display:none;" class="spinner-small"></div>
                </button>
                <div class="checkout-loading" id="checkoutLoading">
                    <i class="fa-solid fa-shield-halved"></i> Initializing Secure Payment Gateway...
                </div>
            </div>
        </div>

        <style>
            .spinner-small {
                width: 20px;
                height: 20px;
                border: 3px solid rgba(255,255,255,0.3);
                border-radius: 50%;
                border-top-color: #fff;
                animation: spin 1s ease-in-out infinite;
            }
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
            .checkout-loading i {
                margin-right: 8px;
                color: #e58f27;
            }
        </style>
        `;
        document.body.insertAdjacentHTML('beforeend', uiHTML);

        document.getElementById('closeCartBtn').onclick = () => this.closeDrawer();
        document.getElementById('cartOverlay').onclick = () => this.closeDrawer();
        document.getElementById('checkoutBtn').onclick = () => this.processCheckout();
    },

    openDrawer() {
        this.renderDrawer();
        document.getElementById('cartOverlay').classList.add('show');
        document.getElementById('cartDrawer').classList.add('show');
    },

    closeDrawer() {
        document.getElementById('cartOverlay').classList.remove('show');
        document.getElementById('cartDrawer').classList.remove('show');
    },

    renderDrawer() {
        const list = document.getElementById('cartItemsList');
        const totalEl = document.getElementById('cartTotalSum');
        const checkoutBtn = document.getElementById('checkoutBtn');
        list.innerHTML = '';

        if (this.items.length === 0) {
            list.innerHTML = '<p style="text-align:center; margin-top: 50px; color: #a0acab;">Your cart is empty.</p>';
            checkoutBtn.disabled = true;
        } else {
            checkoutBtn.disabled = false;
            this.items.forEach((item, index) => {
                list.innerHTML += `
                <div class="cart-item">
                    <div>
                        <h4>${item.name || 'Unknown Item'}</h4>
                        <p>$${Number(item.price || 0).toFixed(2)} x ${Number(item.qty || 1)}</p>
                    </div>
                    <i class="fa-solid fa-trash remove-btn" onclick="CartSystem.removeItem(${index})"></i>
                </div>
                `;
            });
        }
        totalEl.innerText = '$' + Number(this.getTotal()).toFixed(2);
    },

    async processCheckout() {
        const amount = this.getTotal();
        if (amount <= 0) return;

        const btn = document.getElementById('checkoutBtn');
        const btnIcon = document.getElementById('btnIcon');
        const btnText = document.getElementById('btnText');
        const btnSpinner = document.getElementById('btnSpinner');
        const loading = document.getElementById('checkoutLoading');

        // Immediate Visual Feedback
        btn.disabled = true;
        btnIcon.style.display = 'none';
        btnText.innerText = 'Securing Connection...';
        btnSpinner.style.display = 'block';
        loading.style.display = 'block';

        const fakeRef = 'NC-' + Math.floor(Math.random() * 1000000);

        try {
            // Save mock order to history
            const pastOrders = JSON.parse(localStorage.getItem('nc_orders') || '[]');
            pastOrders.push({
                id: fakeRef,
                date: new Date().toLocaleDateString(),
                total: '$' + Number(this.getTotal()).toFixed(2),
                items: [...this.items]
            });
            localStorage.setItem('nc_orders', JSON.stringify(pastOrders));

            const res = await fetch('/api/initiate-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount })
            });

            const responseText = await res.text();
            let data;
            try {
                data = JSON.parse(responseText);
            } catch(e) {
                throw new Error('Server returned an unexpected response. Make sure the Node.js server is running.');
            }

            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to initiate payment');
            }

            // Construct Interswitch WebPay Hidden Form
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = data.interswitch_url;
            
            const payload = data.payload;
            for (const key in payload) {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = key;
                input.value = payload[key];
                form.appendChild(input);
            }

            document.body.appendChild(form);
            form.submit();

        } catch (err) {
            alert("Checkout Error: " + err.message);
            btn.disabled = false;
            btnIcon.style.display = 'inline-block';
            btnText.innerText = 'Pay with Interswitch';
            btnSpinner.style.display = 'none';
            loading.style.display = 'none';
        }
    }
};

document.addEventListener('DOMContentLoaded', () => CartSystem.init());
