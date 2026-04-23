module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.method !== 'POST') {
        res.writeHead(405);
        res.end(JSON.stringify({ error: 'Method not allowed' }));
        return;
    }

    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', async () => {
        try {
            const data = JSON.parse(body || '{}');
            if (!data.amount) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Missing payment amount' }));
                return;
            }

            // ── Interswitch Official Test/Demo Credentials ──────────────────
            // Source: https://docs.interswitchgroup.com/docs/default-test-credentials
            const MERCHANT_CODE = "MX6072";
            const PAY_ITEM_ID   = "9405967";

            const protocol = req.headers['x-forwarded-proto'] || 'http';
            const host = req.headers['host'] || 'localhost:3000';
            const SITE_REDIRECT_URL = `${protocol}://${host}/`;

            const txn_ref = 'NC-' + Date.now();
            let rawAmount = parseFloat(data.amount) || 0;
            // Interswitch expects amounts in the lowest currency unit (Kobo for NGN)
            const amountInKobo = Math.round(rawAmount * 100);

            console.log(`[PAYMENT INIT] Ref: ${txn_ref}, Amount: ${amountInKobo} Kobo, Merchant: ${MERCHANT_CODE}`);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                payment: {
                    merchant_code: MERCHANT_CODE,
                    pay_item_id: PAY_ITEM_ID,
                    txn_ref,
                    amount: amountInKobo,
                    currency: 566,            // ISO 4217 numeric code for NGN
                    site_redirect_url: SITE_REDIRECT_URL,
                    mode: 'TEST'              // Sandbox mode
                }
            }));
        } catch (err) {
            console.error("[PAYMENT JSON ERROR]", err);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid JSON request' }));
        }
    });
};
