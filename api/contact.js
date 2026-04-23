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

    // ── Parse body: Vercel provides req.body; local server.js streams manually ──
    let data;
    if (req.body && typeof req.body === 'object') {
        data = req.body;
    } else if (typeof req.body === 'string') {
        try { data = JSON.parse(req.body); } catch { data = {}; }
    } else {
        data = await new Promise((resolve) => {
            let raw = '';
            req.on('data', chunk => raw += chunk.toString());
            req.on('end', () => {
                try { resolve(JSON.parse(raw || '{}')); }
                catch { resolve({}); }
            });
        });
    }

    try {
        if (!data.email || !data.message) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing email or message' }));
            return;
        }

        const postData = JSON.stringify({
            fullName: data.fullName,
            email: data.email,
            phone: data.phone,
            message: data.message
        });

        const options = {
            hostname: url.parse(SUPABASE_URL).hostname,
            port: 443,
            path: '/rest/v1/Message',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const supabaseReq = https.request(options, (supabaseRes) => {
            let responseBody = '';
            supabaseRes.on('data', d => responseBody += d);
            supabaseRes.on('end', () => {
                if (supabaseRes.statusCode >= 200 && supabaseRes.statusCode < 300) {
                    console.log(`[CONTACT SUCCESS] From: ${data.email}`);
                    res.writeHead(supabaseRes.statusCode, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, message: 'Message sent!' }));
                } else {
                    console.warn(`[CONTACT FAILED] Status: ${supabaseRes.statusCode}`, responseBody);
                    res.writeHead(supabaseRes.statusCode, { 'Content-Type': 'application/json' });
                    res.end(responseBody);
                }
            });
        });

        supabaseReq.on('error', (e) => {
            console.error("[CONTACT NETWORK ERROR]", e.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to send message due to network error' }));
        });

        supabaseReq.write(postData);
        supabaseReq.end();
    } catch (err) {
        console.error("[CONTACT ERROR]", err.message);
        if (!res.headersSent) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid JSON request' }));
        }
    }
};
