const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Load environment variables (Simple manual loader)
const envPath = path.join(__dirname, '.env');
const env = {};
if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) env[key.trim()] = value.trim().replace(/^"(.*)"$/, '$1');
    });
}

const SUPABASE_URL = 'https://juesjtwbsxqbbfpkbtlj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1ZXNqdHdic3hxYmJmcGtidGxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNjI5MzMsImV4cCI6MjA5MDgzODkzM30.Kp7OWNESjf7pn-JMhvSHHJd0lwVeQSjrOU-N3Oe2Too';
const PORT = process.env.PORT || env['PORT'] || 3000;

const server = http.createServer((req, res) => {
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

    if (req.method === 'POST' && parsedUrl.pathname === '/api/contact') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            const data = JSON.parse(body);
            
            // Forward to Supabase REST API
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
                supabaseRes.on('data', (d) => {
                    responseBody += d;
                });
                supabaseRes.on('end', () => {
                   res.writeHead(supabaseRes.statusCode, { 'Content-Type': 'application/json' });
                   res.end(JSON.stringify({ success: true, message: 'Message sent!' }));
                });
            });

            supabaseReq.on('error', (e) => {
                console.error(e);
                res.writeHead(500);
                res.end(JSON.stringify({ error: 'Failed to send message' }));
            });

            supabaseReq.write(postData);
            supabaseReq.end();
        });
    } else if (req.method === 'POST' && parsedUrl.pathname === '/api/booking') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            const data = JSON.parse(body);
            
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
                supabaseRes.on('data', (d) => {
                    responseBody += d;
                });
                supabaseRes.on('end', () => {
                   if (supabaseRes.statusCode >= 200 && supabaseRes.statusCode < 300) {
                       res.writeHead(supabaseRes.statusCode, { 'Content-Type': 'application/json' });
                       res.end(JSON.stringify({ success: true, message: 'Reservation confirmed!' }));
                   } else {
                       res.writeHead(supabaseRes.statusCode, { 'Content-Type': 'application/json' });
                       res.end(responseBody);
                   }
                });
            });

            supabaseReq.on('error', (e) => {
                console.error(e);
                res.writeHead(500);
                res.end(JSON.stringify({ error: 'Failed to process booking' }));
            });

            supabaseReq.write(postData);
            supabaseReq.end();
        });
    } else if (req.method === 'POST' && parsedUrl.pathname === '/api/signup') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            const data = JSON.parse(body);
            const postData = JSON.stringify({ email: data.email, password: data.password });

            const options = {
                hostname: url.parse(SUPABASE_URL).hostname,
                port: 443,
                path: '/auth/v1/signup',
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
                    res.end(responseBody);
                });
            });
            supabaseReq.on('error', (e) => {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Failed to communicate with Auth Server' }));
            });
            supabaseReq.write(postData);
            supabaseReq.end();
        });
    } else if (req.method === 'POST' && parsedUrl.pathname === '/api/signin') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            const data = JSON.parse(body);
            const postData = JSON.stringify({ email: data.email, password: data.password });

            const options = {
                hostname: url.parse(SUPABASE_URL).hostname,
                port: 443,
                path: '/auth/v1/token?grant_type=password',
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
                    try {
                        const user = JSON.parse(responseBody);
                        const adminEmails = (process.env.ADMIN_EMAILS || "").split(",");
                        
                        if (user.user && user.user.email && adminEmails.includes(user.user.email)) {
                            user.is_admin = true;
                        }
                        
                        res.writeHead(supabaseRes.statusCode, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify(user));
                    } catch (err) {
                        console.error("[SIGNIN PARSE ERROR] Body:", responseBody);
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Invalid response from Auth Server', detail: responseBody }));
                    }
                });
            });
            supabaseReq.on('error', (e) => {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Failed to communicate with Auth Server' }));
            });
            supabaseReq.write(postData);
            supabaseReq.end();
        });
    } else if (req.method === 'GET' && parsedUrl.pathname === '/api/admin/bookings') {
        const options = {
            hostname: url.parse(SUPABASE_URL).hostname,
            port: 443,
            path: '/rest/v1/Booking?select=*&order=id.desc',
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        };

        const supabaseReq = https.request(options, (supabaseRes) => {
            let responseBody = '';
            supabaseRes.on('data', d => { responseBody += d.toString(); });
            supabaseRes.on('end', () => {
                if (supabaseRes.statusCode >= 200 && supabaseRes.statusCode < 300) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    // Always ensure we return a valid JSON array even if body is empty
                    res.end(responseBody.trim() || '[]');
                } else {
                    console.error("[ADMIN BOOKINGS DB ERROR]", supabaseRes.statusCode, responseBody);
                    res.writeHead(supabaseRes.statusCode, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Database Error', detail: responseBody }));
                }
            });
        });

        supabaseReq.on('error', (e) => {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to fetch bookings' }));
        });
        supabaseReq.end();
    } else if (req.method === 'POST' && parsedUrl.pathname === '/api/initiate-payment') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                // Interswitch Demo Credentials
                const PRODUCT_ID = "1076";
                const PAY_ITEM_ID = "101";
                const MAC_KEY = "D3D1D05AFE42AD50818167EAC73C109168A0F108F32645C8B59E897FA930DA44F9230910DAC9E20641823799A107A02068F7BC0F4CC41D2952E249552255710F";
                const REDIRECT_URL = `http://localhost:${PORT}/`; // normally this would be a success page

                const txn_ref = 'NC-' + Date.now();
                
                // Assuming data.amount comes in as USD standard decimal (e.g. 15.99). 
                // Convert to NGN at mock rate 1000, then to Kobo for Interswitch
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
                        currency: "566" // NGN
                    },
                    interswitch_url: "https://qa.interswitchng.com/collections/w/pay"
                }));
            } catch(err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
    } else if (req.method === 'POST' && parsedUrl.pathname === '/api/chat') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const userMessage = data.message || '';
                const key = process.env.GEMINI_API_KEY || env['GEMINI_API_KEY'];
                
                // --- NATURE'S CRAVINGS CONCIERGE (MOCK ENGINE) ---
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

                // Call to Google Gemini API
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

                const apiReq = https.request(reqOptions, (apiRes) => {
                    let apiData = '';
                    apiRes.on('data', d => apiData += d);
                    apiRes.on('end', () => {
                        try {
                            const responseObj = JSON.parse(apiData);
                            if (responseObj.error) {
                                console.log('[GEMINI API ERROR]', responseObj.error.message);
                                // FALLBACK: If API is overloaded or errors, use the Concierge Engine
                                res.writeHead(200, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ 
                                    reply: getMockReply(userMessage),
                                    note: "API Fallback Triggered" 
                                }));
                                return;
                            }
                            const aiReply = responseObj.candidates[0].content.parts[0].text;
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ reply: aiReply }));
                        } catch(e) {
                             res.writeHead(200, { 'Content-Type': 'application/json' });
                             res.end(JSON.stringify({ reply: getMockReply(userMessage) }));
                        }
                    });
                });

                apiReq.on('error', (e) => {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ reply: getMockReply(userMessage) }));
                });
                apiReq.write(postData);
                apiReq.end();
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ reply: "Server input error." }));
            }
        });
    } else if (req.method === 'GET' && parsedUrl.pathname.startsWith('/ai-images/')) {
        const aiFilename = parsedUrl.pathname.replace('/ai-images/', '');
        const fullPath = '/Users/user/.gemini/antigravity/brain/5a5a1267-e209-495f-b15b-8d2181865039/' + decodeURIComponent(aiFilename);
        
        fs.readFile(fullPath, (err, content) => {
             if(err) {
                  res.writeHead(404);
                  res.end('AI Image Not Found');
             } else {
                  res.writeHead(200, { 'Content-Type': 'image/png' });
                  res.end(content, 'binary');
             }
        });
    } else {
        // Attempt to serve static files
        let filePath = '.' + decodeURIComponent(parsedUrl.pathname);
        if (filePath === './') {
            filePath = './index.html';
        }

        const extname = String(path.extname(filePath)).toLowerCase();
        const mimeTypes = {
            '.html': 'text/html',
            '.js': 'text/javascript',
            '.css': 'text/css',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.webp': 'image/webp',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml'
        };

        const contentType = mimeTypes[extname] || 'application/octet-stream';

        fs.readFile(path.join(__dirname, filePath), (err, content) => {
            if (err) {
                if (err.code == 'ENOENT') {
                    res.writeHead(404);
                    res.end('404 Not Found');
                } else {
                    res.writeHead(500);
                    res.end('Server Error: ' + err.code);
                }
            } else {
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(content, 'utf-8');
            }
        });
    }
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
});
