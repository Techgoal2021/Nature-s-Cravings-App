const https = require('https');
const url = require('url');
const crypto = require('crypto');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://juesjtwbsxqbbfpkbtlj.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1ZXNqdHdic3hxYmJmcGtidGxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNjI5MzMsImV4cCI6MjA5MDgzODkzM30.Kp7OWNESjf7pn-JMhvSHHJd0lwVeQSjrOU-N3Oe2Too';

module.exports = async (req, res) => {
    // Add CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // Helper to read body
    const getBody = () => new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                resolve(JSON.parse(body));
            } catch (e) {
                resolve({});
            }
        });
        req.on('error', reject);
    });

    try {
        if (req.method === 'POST' && pathname === '/api/contact') {
            const data = await getBody();
            const postData = JSON.stringify({
                fullName: data.fullName,
                email: data.email,
                phone: data.phone,
                message: data.message
            });

            await forwardToSupabase(res, '/rest/v1/Message', 'POST', postData);
            
        } else if (req.method === 'POST' && pathname === '/api/booking') {
            const data = await getBody();
            const postData = JSON.stringify({
                name: data.name,
                email: data.email,
                phone: data.phone,
                bookingDate: data.bookingDate,
                guests: data.guests
            });

            await forwardToSupabase(res, '/rest/v1/Booking', 'POST', postData, { 'Prefer': 'return=representation' });

        } else if (req.method === 'POST' && pathname === '/api/signup') {
            const data = await getBody();
            const postData = JSON.stringify({ email: data.email, password: data.password });
            await forwardToSupabase(res, '/auth/v1/signup', 'POST', postData);

        } else if (req.method === 'POST' && pathname === '/api/signin') {
            const data = await getBody();
            const postData = JSON.stringify({ email: data.email, password: data.password });
            
            const supabaseRes = await callSupabaseRaw('/auth/v1/token?grant_type=password', 'POST', postData);
            const user = JSON.parse(supabaseRes.body);
            const adminEmails = (process.env.ADMIN_EMAILS || "").split(",");
            
            if (user.user && user.user.email && adminEmails.includes(user.user.email)) {
                user.is_admin = true;
            }
            
            res.writeHead(supabaseRes.statusCode, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(user));

        } else if (req.method === 'GET' && pathname === '/api/admin/bookings') {
            await forwardToSupabase(res, '/rest/v1/Booking?select=*&order=id.desc', 'GET');

        } else if (req.method === 'POST' && pathname === '/api/initiate-payment') {
            const data = await getBody();
            const PRODUCT_ID = "1076";
            const PAY_ITEM_ID = "101";
            const MAC_KEY = "D3D1D05AFE42AD50818167EAC73C109168A0F108F32645C8B59E897FA930DA44F9230910DAC9E20641823799A107A02068F7BC0F4CC41D2952E249552255710F";
            
            const protocol = req.headers['x-forwarded-proto'] || 'http';
            const host = req.headers['host'];
            const REDIRECT_URL = `${protocol}://${host}/`;

            const txn_ref = 'NC-' + Date.now();
            let rawAmount = parseFloat(data.amount) || 0;
            const amountInKobo = Math.round(rawAmount * 100000).toString();

            const macString = txn_ref + PRODUCT_ID + PAY_ITEM_ID + amountInKobo + REDIRECT_URL + MAC_KEY;
            const mac = crypto.createHash('sha512').update(macString).digest('hex');

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
                    currency: "566"
                },
                interswitch_url: "https://qa.interswitchng.com/collections/w/pay"
            }));

        } else if (req.method === 'POST' && pathname === '/api/chat') {
            const data = await getBody();
            const userMessage = data.message || '';
            const key = process.env.GEMINI_API_KEY;

            const getMockReply = (msg) => {
                let mockReply = "Hello! I am your Nature's Cravings AI assistant. I'm here to help you explore our organic menu, meal plans, and booking process. How can I delight your senses today?";
                const lowMsg = msg.toLowerCase();
                if (lowMsg.includes('zucchini') || lowMsg.includes('vegetable')) {
                    mockReply = "Our Organic Zucchini is a customer favorite, sourced entirely from local, pesticide-free farms. It's packed with antioxidants and pairs perfectly with our signature grills!";
                } else if (lowMsg.includes('chicken') || lowMsg.includes('menu') || lowMsg.includes('list')) {
                    mockReply = "Our Charcoal Grilled Chicken ($15.99) is marinated for 24 hours in a secret organic spice blend. It's one of our top-rated dishes—would you like to see it in our menu?";
                } else if (lowMsg.includes('book') || lowMsg.includes('reservation')) {
                    mockReply = "Booking a table is easy! Just click the 'Book a Table' button at the top of your screen. We require a ₦5,000 deposit to secure your organic dining experience.";
                } else if (lowMsg.includes('burger') || lowMsg.includes('beef')) {
                    mockReply = "Our Classic Beef Burger ($14.99) features 100% grass-fed organic beef and a fresh whole-wheat bun. It's the ultimate healthy comfort food!";
                } else if (lowMsg.includes('plan') || lowMsg.includes('subscription')) {
                    mockReply = "We offer premium organic meal plans delivered to your door! Explore the 'Plans' tab to find the 5-day or 7-day nourishing package that fits your lifestyle.";
                }
                return mockReply;
            };

            if (!key) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ reply: getMockReply(userMessage) }));
                return;
            }

            const postData = JSON.stringify({
                contents: [{
                    parts: [{ text: "You are the premium, highly enthusiastic customer support AI for 'Nature's Cravings'. We are an organic food platform offering signature meals ($10-25 range), weekly meal plans, and table reservations. Your goal is to be exceptionally helpful, warm, and concise. Only answer platform-related questions. If you don't know something, offer to connect them with human support via the footer contacts. Customer query: " + userMessage }]
                }]
            });

            const reqOptions = {
                hostname: 'generativelanguage.googleapis.com',
                path: '/v1/models/gemini-1.5-flash:generateContent?key=' + key,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                }
            };

            const apiRes = await new Promise((resolve, reject) => {
                const apiReq = https.request(reqOptions, (apiRes) => {
                    let apiData = '';
                    apiRes.on('data', d => apiData += d);
                    apiRes.on('end', () => resolve({ body: apiData, statusCode: apiRes.statusCode }));
                });
                apiReq.on('error', reject);
                apiReq.write(postData);
                apiReq.end();
            });

            try {
                const responseObj = JSON.parse(apiRes.body);
                if (responseObj.error) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ reply: getMockReply(userMessage), note: "API Fallback Triggered" }));
                } else {
                    const aiReply = responseObj.candidates[0].content.parts[0].text;
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ reply: aiReply }));
                }
            } catch (e) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ reply: getMockReply(userMessage) }));
            }

        } else {
            // Vercel handles static files, but if someone hits /api/ and it's not handled:
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'API route not found' }));
        }
    } catch (err) {
        console.error(err);
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Internal Server Error', detail: err.message }));
    }
};

async function forwardToSupabase(res, path, method, body, extraHeaders = {}) {
    const supabaseRes = await callSupabaseRaw(path, method, body, extraHeaders);
    res.writeHead(supabaseRes.statusCode, { 'Content-Type': 'application/json' });
    res.end(supabaseRes.body);
}

function callSupabaseRaw(path, method, body, extraHeaders = {}) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: url.parse(SUPABASE_URL).hostname,
            port: 443,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                ...extraHeaders
            }
        };

        if (body) {
            options.headers['Content-Length'] = Buffer.byteLength(body);
        }

        const req = https.request(options, (res) => {
            let resBody = '';
            res.on('data', d => resBody += d);
            res.on('end', () => resolve({ body: resBody, statusCode: res.statusCode }));
        });
        req.on('error', reject);
        if (body) req.write(body);
        req.end();
    });
}
