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
        if (!data.email) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Email address is required' }));
            return;
        }

        const postData = JSON.stringify({ email: data.email });

        const options = {
            hostname: url.parse(SUPABASE_URL).hostname,
            port: 443,
            path: '/auth/v1/recover',
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
                // Supabase returns 200 even if the email doesn't exist (security best practice)
                console.log(`[PASSWORD RESET] Requested for: ${data.email} | Status: ${supabaseRes.statusCode}`);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: true, 
                    message: 'If an account with that email exists, a password reset link has been sent.' 
                }));
            });
        });

        supabaseReq.on('error', (e) => {
            console.error("[RESET PASSWORD NETWORK ERROR]", e.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Network error. Please try again.' }));
        });

        supabaseReq.write(postData);
        supabaseReq.end();
    } catch (err) {
        console.error("[RESET PASSWORD ERROR]", err.message);
        if (!res.headersSent) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid request' }));
        }
    }
};
