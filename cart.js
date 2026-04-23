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

        // Pre-load Interswitch SDK in background so checkout is instant
        this._preloadInlineCheckoutSDK();
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

    // ── Pre-load SDK on page load (non-blocking, silent) ─────────────────
    _preloadInlineCheckoutSDK() {
        if (window.webpayCheckout || document.getElementById('iswSDKScript')) return;
        const script = document.createElement('script');
        script.id = 'iswSDKScript';
        script.src = 'https://newwebpay.qa.interswitchng.com/inline-checkout.js';
        script.async = true;
        script.onload = () => console.log('[INTERSWITCH] SDK pre-loaded successfully.');
        script.onerror = () => console.warn('[INTERSWITCH] SDK pre-load failed — will retry at checkout.');
        document.body.appendChild(script);
    },

    // ── Load SDK with timeout (used at checkout time) ────────────────────
    _loadInlineCheckoutSDK() {
        return new Promise((resolve, reject) => {
            if (window.webpayCheckout) {
                resolve();
                return;
            }

            // If pre-load script exists but hasn't finished, wait for it
            const existing = document.getElementById('iswSDKScript');
            if (existing) {
                const startWait = Date.now();
                const check = setInterval(() => {
                    if (window.webpayCheckout) {
                        clearInterval(check);
                        resolve();
                    } else if (Date.now() - startWait > 15000) {
                        clearInterval(check);
                        reject(new Error('Interswitch payment gateway is taking too long to respond. Please check your internet and try again.'));
                    }
                }, 300);
                return;
            }

            // Fresh load with timeout
            const script = document.createElement('script');
            script.id = 'iswSDKScript';
            script.src = 'https://newwebpay.qa.interswitchng.com/inline-checkout.js';
            const timeout = setTimeout(() => {
                reject(new Error('Interswitch payment gateway is taking too long to respond. Please check your internet and try again.'));
            }, 15000);
            script.onload = () => {
                clearTimeout(timeout);
                console.log('[INTERSWITCH] Inline Checkout SDK loaded.');
                resolve();
            };
            script.onerror = () => {
                clearTimeout(timeout);
                reject(new Error('Failed to load Interswitch payment SDK. Check your internet connection.'));
            };
            document.body.appendChild(script);
        });
    },

    // ── Reset the checkout button to its default state ────────────────────
    _resetCheckoutBtn() {
        const btn = document.getElementById('checkoutBtn');
        const btnIcon = document.getElementById('btnIcon');
        const btnText = document.getElementById('btnText');
        const btnSpinner = document.getElementById('btnSpinner');
        const loading = document.getElementById('checkoutLoading');
        if (btn) btn.disabled = false;
        if (btnIcon) btnIcon.style.display = 'inline-block';
        if (btnText) btnText.innerText = 'Pay with Interswitch';
        if (btnSpinner) btnSpinner.style.display = 'none';
        if (loading) loading.style.display = 'none';
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

        try {
            // 1. Load Interswitch SDK if not already loaded
            await this._loadInlineCheckoutSDK();

            btnText.innerText = 'Connecting to Gateway...';

            // 2. Get payment parameters from our backend
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

            // 3. Save order to history before payment
            const orderRef = data.payment.txn_ref;
            const pastOrders = JSON.parse(localStorage.getItem('nc_orders') || '[]');
            pastOrders.push({
                id: orderRef,
                date: new Date().toLocaleDateString(),
                total: '$' + Number(this.getTotal()).toFixed(2),
                items: [...this.items],
                status: 'pending'
            });
            localStorage.setItem('nc_orders', JSON.stringify(pastOrders));

            // 4. Launch Interswitch Inline Checkout popup
            const cartRef = this;
            const paymentRequest = {
                merchant_code:     data.payment.merchant_code,
                pay_item_id:       data.payment.pay_item_id,
                txn_ref:           data.payment.txn_ref,
                amount:            data.payment.amount,
                currency:          data.payment.currency,
                site_redirect_url: data.payment.site_redirect_url,
                mode:              data.payment.mode,
                onComplete: function(response) {
                    console.log('[INTERSWITCH] Payment response:', response);
                    
                    // Update order status in local storage
                    const orders = JSON.parse(localStorage.getItem('nc_orders') || '[]');
                    const order = orders.find(o => o.id === orderRef);
                    if (order) {
                        order.status = (response.resp === '00') ? 'paid' : 'failed';
                        order.gatewayRef = response.retRef || '';
                        localStorage.setItem('nc_orders', JSON.stringify(orders));
                    }

                    if (response.resp === '00') {
                        // ✅ Payment Successful
                        cartRef.items = [];
                        cartRef.save();
                        cartRef.closeDrawer();
                        
                        // Show success notification
                        const toast = document.createElement('div');
                        toast.id = 'paymentSuccessToast';
                        toast.style.cssText = `
                            position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
                            background: linear-gradient(135deg, #1c3f2d, #2d6a4f); color: white;
                            padding: 20px 40px; border-radius: 16px; z-index: 9999;
                            font-family: 'Outfit', sans-serif; font-size: 1.1rem; font-weight: 600;
                            box-shadow: 0 10px 40px rgba(0,0,0,0.25);
                            animation: slideDown 0.5s ease forwards;
                        `;
                        toast.innerHTML = '<i class="fa-solid fa-circle-check" style="margin-right: 10px; color: #80ed99;"></i> Payment Successful! Thank you for your order.';
                        document.body.appendChild(toast);
                        
                        // Add animation keyframes
                        if (!document.getElementById('toastAnimStyle')) {
                            const style = document.createElement('style');
                            style.id = 'toastAnimStyle';
                            style.textContent = `
                                @keyframes slideDown { from { opacity: 0; top: -50px; } to { opacity: 1; top: 20px; } }
                            `;
                            document.head.appendChild(style);
                        }

                        setTimeout(() => toast.remove(), 5000);
                    } else {
                        // ❌ Payment Failed or Cancelled
                        alert('Payment was not completed. Response: ' + (response.desc || response.resp || 'Unknown'));
                    }
                    
                    cartRef._resetCheckoutBtn();
                }
            };

            console.log('[INTERSWITCH] Launching checkout with:', paymentRequest);
            btnText.innerText = 'Opening Payment...';

            // Close the cart drawer so the popup is visible
            this.closeDrawer();

            // Small delay to allow drawer animation to complete
            setTimeout(() => {
                window.webpayCheckout(paymentRequest);
                this._resetCheckoutBtn();
            }, 400);

        } catch (err) {
            console.error('[CHECKOUT ERROR]', err);
            alert("Checkout Error: " + err.message);
            this._resetCheckoutBtn();
        }
    }
};

document.addEventListener('DOMContentLoaded', () => CartSystem.init());
