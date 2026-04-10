const https = require('https');

// ─── Full restaurant context for Gemini ─────────────────────────────────────
const SYSTEM_PROMPT = `You are "NC Concierge", the warm, professional AI assistant for Nature's Cravings — a premium organic dining platform.

ABOUT NATURE'S CRAVINGS:
- We serve 100% organic, farm-to-table meals with no pesticides or artificial additives.
- Open 7 days a week, 8:00 AM – 10:00 PM.
- Contact: support@naturescravings.com | +1 (800) 123-4567
- Payments: Interswitch WebPay (secure online checkout)

OUR MENU:
Grills:
  - Charcoal Grilled Chicken — $15.99 (marinated 24hrs in organic spice blend)
  - Classic Beef Burger — $14.99 (100% grass-fed beef, whole-wheat bun)
  - Organic Lamb Chops — $22.99 (herb-marinated, slow-grilled)

Salads:
  - Greek Salad — $12.99 (fresh feta, olives, organic vegetables)
  - Organic Zucchini Bowl — $12.99 (pesticide-free, antioxidant-rich)
  - Caesar Salad — $11.99 (house-made organic dressing)

Drinks:
  - Fresh Fruit Smoothie — $8.99 (cold-pressed, no added sugar)
  - Green Detox Juice — $9.99 (spinach, kale, ginger, lemon)
  - Organic Lemonade — $6.99

Meal Plans (weekly delivery):
  - 5-Day Nourish Plan — curated organic lunches & dinners
  - 7-Day Wellness Package — full-day organic meal coverage

TABLE RESERVATIONS:
  - Click "Book a Table" on any page
  - A ₦5,000 deposit is required to secure the booking
  - Confirmation within a few hours

HOW TO ORDER ONLINE:
  1. Browse "Our Food" or "Plans" in the navigation
  2. Click "Add to Cart" on any item
  3. Open cart and click "Pay with Interswitch" to checkout securely

BEHAVIOUR RULES:
- Be warm, concise, and conversational. Use emojis naturally but sparingly.
- Answer ANY question a diner might ask — food preferences, dietary requirements, allergies, how to order, payment, delivery, ambiance, etc.
- If something is outside your knowledge (e.g. today's live specials), direct them warmly to contact support.
- NEVER refuse to engage. NEVER say you can't help with something without offering an alternative.
- Keep replies under 100 words unless a list or detailed explanation is genuinely needed.`;

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
            const userMessage = (data.message || '').trim();

            if (!userMessage) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'No message provided' }));
                return;
            }

            const key = process.env.GEMINI_API_KEY;

            // ── Fallback: used ONLY when Gemini is unreachable ───────────────
            const getFallbackReply = () => {
                return "I'm having a little trouble reaching my AI brain right now 🌿 Please try again in a moment, or reach us directly at support@naturescravings.com for immediate help!";
            };

            // ── If no API key, tell the operator ─────────────────────────────
            if (!key) {
                console.warn('[CHAT] No GEMINI_API_KEY set in .env — AI responses are disabled.');
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    reply: "Our AI concierge is not configured yet. Please contact us at support@naturescravings.com and we'll be happy to help! 🌿"
                }));
                return;
            }

            // ── Build Gemini request with full system context ─────────────────
            const postData = JSON.stringify({
                contents: [{
                    parts: [{
                        text: SYSTEM_PROMPT + '\n\nCustomer says: ' + userMessage
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 300,
                    topP: 0.9
                }
            });

            const reqOptions = {
                hostname: 'generativelanguage.googleapis.com',
                path: '/v1beta/models/gemini-1.5-flash:generateContent?key=' + key,
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
                            console.error('[GEMINI ERROR]', responseObj.error.message);
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ reply: getFallbackReply() }));
                            return;
                        }

                        const aiReply = responseObj?.candidates?.[0]?.content?.parts?.[0]?.text;
                        if (!aiReply) {
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ reply: getFallbackReply() }));
                            return;
                        }

                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ reply: aiReply }));
                    } catch (e) {
                        console.error('[GEMINI PARSE ERROR]', e.message);
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ reply: getFallbackReply() }));
                    }
                });
            });

            apiReq.on('error', (e) => {
                console.error('[GEMINI NETWORK ERROR]', e.message);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ reply: getFallbackReply() }));
            });

            apiReq.write(postData);
            apiReq.end();

        } catch (err) {
            console.error('[CHAT ERROR]', err.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Internal server error' }));
        }
    });
};
