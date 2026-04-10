const crypto = require('crypto');

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

            // Interswitch Demo Credentials
            const PRODUCT_ID = "1076";
            const PAY_ITEM_ID = "101";
            const MAC_KEY = "D3D1D05AFE42AD50818167EAC73C109168A0F108F32645C8B59E897FA930DA44F9230910DAC9E20641823799A107A02068F7BC0F4CC41D2952E249552255710F";
            
            const protocol = req.headers['x-forwarded-proto'] || 'http';
            const host = req.headers['host'] || 'localhost:3000';
            const REDIRECT_URL = `${protocol}://${host}/`;

            const txn_ref = 'NC-' + Date.now();
            let rawAmount = parseFloat(data.amount) || 0;
            // Interswitch typically expects amounts in Kobo (lowest currency unit)
            const amountInKobo = Math.round(rawAmount * 100).toString();

            const macString = txn_ref + PRODUCT_ID + PAY_ITEM_ID + amountInKobo + REDIRECT_URL + MAC_KEY;
            const mac = crypto.createHash('sha512').update(macString).digest('hex');

            console.log(`[PAYMENT INIT] Ref: ${txn_ref}, Amount: ${amountInKobo} Kobo`);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                payload: {
                    txn_ref,
                    product_id: PRODUCT_ID,
                    pay_item_id: PAY_ITEM_ID,
                    amount: amountInKobo,
                    site_redirect_url: REDIRECT_URL,
                    mac,
                    currency: "566" // NGN
                },
                interswitch_url: "https://qa.interswitchng.com/collections/w/pay"
            }));
        } catch (err) {
            console.error("[PAYMENT JSON ERROR]", err);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid JSON request' }));
        }
    });
};
