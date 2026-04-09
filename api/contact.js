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
            const data = JSON.parse(body);
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
                    res.writeHead(supabaseRes.statusCode, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, message: 'Message sent!' }));
                });
            });

            supabaseReq.on('error', (e) => {
                res.writeHead(500);
                res.end(JSON.stringify({ error: 'Failed to send message' }));
            });

            supabaseReq.write(postData);
            supabaseReq.end();
        } catch (err) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
    });
};
