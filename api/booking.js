const https = require('https');
const url = require('url');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://juesjtwbsxqbbfpkbtlj.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1ZXNqdHdic3hxYmJmcGtidGxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNjI5MzMsImV4cCI6MjA5MDgzODkzM30.Kp7OWNESjf7pn-JMhvSHHJd0lwVeQSjrOU-N3Oe2Too';

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
            if (!data.email || !data.bookingDate) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Missing required booking details' }));
                return;
            }

            const postData = JSON.stringify({
                name: data.name,
                email: data.email,
                phone: data.phone,
                bookingDate: data.bookingDate,
                guests: data.guests
            });

            const options = {
                hostname: url.parse(SUPABASE_URL).hostname,
                port: 443,
                path: '/rest/v1/Booking',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Length': Buffer.byteLength(postData),
                    'Prefer': 'return=representation'
                }
            };

            const supabaseReq = https.request(options, (supabaseRes) => {
                let responseBody = '';
                supabaseRes.on('data', d => responseBody += d);
                supabaseRes.on('end', () => {
                    if (supabaseRes.statusCode >= 200 && supabaseRes.statusCode < 300) {
                        console.log(`[BOOKING SUCCESS] User: ${data.email}`);
                        res.writeHead(supabaseRes.statusCode, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true, message: 'Reservation confirmed!' }));
                    } else {
                        console.warn(`[BOOKING FAILED] Status: ${supabaseRes.statusCode}`, responseBody);
                        res.writeHead(supabaseRes.statusCode, { 'Content-Type': 'application/json' });
                        res.end(responseBody);
                    }
                });
            });

            supabaseReq.on('error', (e) => {
                console.error("[BOOKING NETWORK ERROR]", e.message);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Failed to process booking due to network error' }));
            });

            supabaseReq.write(postData);
            supabaseReq.end();
        } catch (err) {
            console.error("[BOOKING JSON ERROR]", err);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid JSON request' }));
        }
    });
};
