const https = require('https');

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

            const apiReq = https.request(reqOptions, (apiRes) => {
                let apiData = '';
                apiRes.on('data', d => apiData += d);
                apiRes.on('end', () => {
                    try {
                        const responseObj = JSON.parse(apiData);
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
                });
            });

            apiReq.on('error', () => {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ reply: getMockReply(userMessage) }));
            });
            apiReq.write(postData);
            apiReq.end();
        } catch (err) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: err.message }));
        }
    });
};
