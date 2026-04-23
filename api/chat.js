const https = require('https');

// ─── Full restaurant context for Gemini & Keyword Backup ─────────────────────
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
- Be warm, concise, and conversational. Use emojis naturally.
- Answer platform-related questions. If unknown, offer to connect with human support.`;

// ─── Local Keyword Backup Engine (Always works, even without internet or API key) ──
const getKeywordReply = (msg) => {
    const low = msg.toLowerCase().trim();
    if (/\b(hi|hello|hey|morning|evening)\b/.test(low)) {
        return "Hello! Welcome to Nature's Cravings 🌿 I'm your AI concierge. How can I help you explore our organic menu today?";
    }
    if (/\b(order|how.*order|buy|get|purchase)\b/.test(low)) {
        return "Ordering is simple! 🛒 Browse our 'Our Food' or 'Plans' pages, click 'Add to Cart' on your favorites, then checkout using the Pay with Interswitch button in your cart.";
    }
    if (/\b(chicken|grilled|charcoal)\b/.test(low)) {
        return "Our Charcoal Grilled Chicken ($15.99) is a best-seller! 🔥 Marinated for 24 hours in our secret organic blend. It's available under 'Our Food'.";
    }
    if (/\b(zucchini|bowl|organic zucchini)\b/.test(low)) {
        return "Our Organic Zucchini Bowl ($12.99) is fresh, healthy, and sourced from local pesticide-free farms. Perfect for a nourishing meal! 🥦";
    }
    if (/\b(burger|beef)\b/.test(low)) {
        return "The Classic Beef Burger ($14.99) features 100% grass-fed organic beef on a fresh whole-wheat bun. Healthy comfort food at its best! 🍔";
    }
    if (/\b(book|reserve|reservation|table)\b/.test(low)) {
        return "To book a table, just click the 'Book a Table' button at the top of our site. 📅 We require a ₦5,000 deposit to secure your organic dining experience.";
    }
    if (/\b(plan|subscription|weekly|deliver)\b/.test(low)) {
        return "We offer premium 5-day and 7-day organic meal plans delivered to your door. 🚚 Check out the 'Plans' tab for details!";
    }
    if (/\b(thanks|thank you|ty)\b/.test(low)) {
        return "You're very welcome! 😊 Is there anything else I can help you with?";
    }
    if (/\b(price|cost|how much)\b/.test(low)) {
        return "Our meals range from $8.99 to $25.00. 💰 You can see specific prices for every item on our 'Our Food' page.";
    }
    return "That's a great question! 🌿 I specialize in Nature's Cravings menu, reservations, and meal plans. Could you tell me more about what you're looking for?";
};

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204); res.end(); return;
    }

    if (req.method !== 'POST') {
        res.writeHead(405); res.end(JSON.stringify({ error: 'Method not allowed' })); return;
    }

    // ── Parse body: Vercel provides req.body; local server.js streams manually ──
    let data;
    if (req.body && typeof req.body === 'object') {
        data = req.body;
    } else if (typeof req.body === 'string') {
        try { data = JSON.parse(req.body); } catch { data = {}; }
    } else {
        // Fallback: manual stream for local dev (server.js)
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
        const userMessage = (data.message || '').trim();
        if (!userMessage) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Message is required' }));
            return;
        }

        const key = (process.env.GROQ_API_KEY || '').trim();

        if (!key || !key.startsWith('gsk_')) {
            console.warn('[CHAT] No valid GROQ_API_KEY found. Falling back to Keyword Engine.');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                reply: getKeywordReply(userMessage), 
                source: 'keyword_fallback', 
                warning: 'Using local keyword engine (AI key missing)' 
            }));
            return;
        }

        // ── TRY GROQ (LLAMA 3.1) FIRST ─────────────────────────────────────
        const attemptGroq = () => {
            return new Promise((resolve) => {
                const postData = JSON.stringify({
                    model: 'llama-3.1-8b-instant',
                    messages: [
                        { role: 'system', content: SYSTEM_PROMPT },
                        { role: 'user', content: userMessage }
                    ]
                });

                const reqOptions = {
                    hostname: 'api.groq.com',
                    path: '/openai/v1/chat/completions',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${key}`,
                        'Content-Length': Buffer.byteLength(postData)
                    },
                    timeout: 8000 // 8 seconds
                };

                const apiReq = https.request(reqOptions, (apiRes) => {
                    let apiData = '';
                    apiRes.on('data', d => apiData += d);
                    apiRes.on('end', () => {
                        if (apiRes.statusCode !== 200) {
                            console.error(`[GROQ API ERROR] Status: ${apiRes.statusCode}`, apiData);
                            resolve(null);
                            return;
                        }
                        try {
                            const responseObj = JSON.parse(apiData);
                            const text = responseObj?.choices?.[0]?.message?.content;
                            if (text) {
                                console.log('[GROQ SUCCESS]');
                                resolve(text);
                            } else {
                                console.error('[GROQ FAIL] Unexpected JSON structure.', apiData.substring(0, 300));
                                resolve(null);
                            }
                        } catch (e) { 
                            console.error('[GROQ PARSE ERROR]', e.message);
                            resolve(null); 
                        }
                    });
                });

                apiReq.on('error', (e) => { 
                    console.error('[GROQ NET ERROR]', e.message); 
                    resolve(null); 
                });
                apiReq.on('timeout', () => { 
                    console.warn('[GROQ TIMEOUT] Request took too long.');
                    apiReq.destroy(); 
                    resolve(null); 
                });
                apiReq.write(postData);
                apiReq.end();
            });
        };

        const aiReply = await attemptGroq();

        // ── RESULT: AI REPLY IF SUCCESS, KEYWORD REPLY IF FAILURE ────────
        const finalReply = aiReply || getKeywordReply(userMessage);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ reply: finalReply, source: aiReply ? 'groq_llama3' : 'keyword_fallback' }));

    } catch (err) {
        console.error('[CHAT ERROR]', err.message);
        if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Internal error' }));
        }
    }
};
