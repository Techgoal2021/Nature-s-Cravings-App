// --- Native AI Chatbot Interface ---

const ChatbotSystem = {
    history: [],

    init() {
        this.loadHistory();
        this.injectUI();
        this.renderHistory();
    },

    loadHistory() {
        const saved = localStorage.getItem('nc_chat_history');
        if (saved) {
            try {
                this.history = JSON.parse(saved);
            } catch (e) {
                this.history = [];
            }
        } else {
            // Initial greeting
            this.history = [{ text: "Hello! I am your Nature's Cravings AI assistant. What can I help you with today?", sender: 'bot' }];
        }
    },

    saveHistory() {
        localStorage.setItem('nc_chat_history', JSON.stringify(this.history));
    },

    injectUI() {
        const styleHTML = `
        <style>
            .chatbot-floating-btn {
                position: fixed;
                bottom: 30px;
                right: 30px;
                background-color: #1c3f2d;
                color: #e58f27;
                width: 65px;
                height: 65px;
                border-radius: 50%;
                display: flex;
                justify-content: center;
                align-items: center;
                cursor: pointer;
                box-shadow: 0 10px 30px rgba(0,0,0,0.25);
                z-index: 1000;
                transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                border: 2px solid #e58f27;
                overflow: hidden;
            }
            .chatbot-floating-btn i {
                font-size: 28px;
                filter: drop-shadow(0 4px 8px rgba(0,0,0,0.2));
            }
            .chatbot-floating-btn.hidden {
                transform: scale(0) rotate(-45deg);
                opacity: 0;
                pointer-events: none;
            }
            .chatbot-floating-btn:hover {
                transform: scale(1.1) rotate(5deg);
                background-color: #2b5c43;
                box-shadow: 0 15px 40px rgba(229,143,39,0.3);
            }
            .chatbot-window {
                position: fixed;
                bottom: 30px; /* Aligned with button */
                right: 30px;
                width: 380px;
                height: 550px;
                max-width: calc(100vw - 60px);
                max-height: calc(100vh - 60px);
                background: #f6f3eb;
                border-radius: 24px;
                box-shadow: 0 20px 50px rgba(0,0,0,0.2);
                display: flex;
                flex-direction: column;
                z-index: 1001;
                opacity: 0;
                pointer-events: none;
                transform: translateY(20px) scale(0.95);
                transform-origin: bottom right;
                transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                overflow: hidden;
                font-family: 'Outfit', sans-serif;
            }
            .chatbot-window.show {
                opacity: 1;
                pointer-events: auto;
                transform: translateY(0) scale(1);
            }

            @media (max-width: 480px) {
                .chatbot-window {
                    bottom: 0px;
                    right: 0px;
                    width: 100%;
                    height: 100%;
                    max-width: none;
                    max-height: none;
                    border-radius: 0;
                }
                .chatbot-floating-btn {
                    bottom: 20px;
                    right: 20px;
                }
            }

            .chat-header {
                background: #1c3f2d;
                color: white;
                padding: 15px 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                box-shadow: 0 4px 10px rgba(0,0,0,0.1);
            }
            .chat-header-info { display: flex; align-items: center; gap: 12px; }
            .chat-header-info img { 
                width: 32px; 
                height: 32px; 
                border-radius: 50%; 
                border: 1px solid #e58f27;
                background: white;
            }
            .chat-header h3 { margin: 0; font-size: 1.1rem; font-weight: 600; }
            .chat-header h3 span { color: #e58f27; }
            .chat-close { font-size: 1.5rem; cursor: pointer; color: rgba(255,255,255,0.6); transition: color 0.3s; }
            .chat-close:hover { color: #e58f27; }

            .chat-messages {
                flex: 1;
                padding: 20px;
                overflow-y: auto;
                display: flex;
                flex-direction: column;
                gap: 15px;
                scroll-behavior: smooth;
            }
            .msg {
                max-width: 85%;
                padding: 12px 18px;
                border-radius: 20px;
                font-size: 0.95rem;
                line-height: 1.5;
                position: relative;
                animation: msgFade 0.3s ease-out forwards;
            }
            @keyframes msgFade {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .msg.bot {
                background: white;
                color: #1c3f2d;
                align-self: flex-start;
                border-bottom-left-radius: 4px;
                box-shadow: 0 3px 10px rgba(0,0,0,0.04);
            }
            .msg.user {
                background: #e58f27;
                color: white;
                align-self: flex-end;
                border-bottom-right-radius: 4px;
                box-shadow: 0 5px 15px rgba(229,143,39,0.2);
            }

            .typing-indicator {
                display: flex;
                gap: 4px;
                padding: 5px 0;
            }
            .typing-dot {
                width: 6px;
                height: 6px;
                background: #a0acab;
                border-radius: 50%;
                animation: typingBounce 1s infinite ease-in-out;
            }
            .typing-dot:nth-child(2) { animation-delay: 0.2s; }
            .typing-dot:nth-child(3) { animation-delay: 0.4s; }
            @keyframes typingBounce {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-5px); }
            }

            .chat-input-area {
                padding: 20px;
                background: white;
                display: flex;
                gap: 12px;
                border-top: 1px solid rgba(225, 228, 227, 0.5);
                align-items: center;
            }
            .chat-input-area input {
                flex: 1;
                padding: 14px 20px;
                border: 1px solid #e1e4e3;
                border-radius: 30px;
                font-family: 'Outfit', sans-serif;
                outline: none;
                background: #f8f9f8;
                font-size: 0.95rem;
                transition: all 0.3s;
            }
            .chat-input-area input:focus {
                border-color: #e58f27;
                background: white;
                box-shadow: 0 0 0 3px rgba(229,143,39,0.1);
            }
            .chat-input-area button {
                width: 45px;
                height: 45px;
                border-radius: 50%;
                background: #1c3f2d;
                color: white;
                border: none;
                cursor: pointer;
                display: flex;
                justify-content: center;
                align-items: center;
                transition: all 0.3s;
                flex-shrink: 0;
            }
            .chat-input-area button:hover {
                background: #e58f27;
                transform: rotate(-15deg);
            }
            .chat-input-area button i { font-size: 18px; }
        </style>
        
        <div class="chatbot-floating-btn" id="openChatBtn">
            <i class="fa-solid fa-comment-dots"></i>
        </div>

        <div class="chatbot-window" id="chatbotWindow">
            <div class="chat-header">
                <div class="chat-header-info">
                   <img src="./images/favicon.png" alt="AI Agent" />
                   <h3><span>NC</span> AI Concierge</h3>
                </div>
                <div class="chat-header-actions" style="display: flex; align-items: center; gap: 15px;">
                    <i class="fa-solid fa-trash-can" id="clearChatBtn" style="cursor: pointer; font-size: 1.1rem; color: rgba(255,255,255,0.6); transition: color 0.3s;" title="Clear History"></i>
                    <div class="chat-close" id="closeChatBtn" style="cursor: pointer; font-size: 1.4rem; color: rgba(255,255,255,0.6); transition: color 0.3s;"><i class="fa-solid fa-xmark"></i></div>
                </div>
            </div>
            <div class="chat-messages" id="chatHistory">
                <!-- Messages injection -->
            </div>
            <form class="chat-input-area" id="chatForm">
                <input type="text" id="chatInput" placeholder="Message our AI..." autocomplete="off" required>
                <button type="submit" id="chatSubmitBtn"><i class="fa-solid fa-paper-plane"></i></button>
            </form>
        </div>
        `;
        document.body.insertAdjacentHTML('beforeend', styleHTML);

        const openBtn = document.getElementById('openChatBtn');
        const closeBtn = document.getElementById('closeChatBtn');
        const clearBtn = document.getElementById('clearChatBtn');
        const win = document.getElementById('chatbotWindow');
        const input = document.getElementById('chatInput');

        openBtn.onclick = () => {
            win.classList.add('show');
            openBtn.classList.add('hidden');
            setTimeout(() => input.focus(), 400);
        };
        closeBtn.onclick = () => {
            win.classList.remove('show');
            openBtn.classList.remove('hidden');
        };
        clearBtn.onclick = () => {
            if (confirm("Clear your conversation history?")) {
                localStorage.removeItem('nc_chat_history');
                this.loadHistory();
                this.renderHistory();
            }
        };

        const form = document.getElementById('chatForm');
        form.onsubmit = (e) => {
            e.preventDefault();
            this.sendMessage();
        };
    },

    renderHistory() {
        const container = document.getElementById('chatHistory');
        container.innerHTML = '';
        this.history.forEach(msg => {
            this.renderMessage(msg.text, msg.sender);
        });
    },

    renderMessage(text, sender) {
        const history = document.getElementById('chatHistory');
        const msgDiv = document.createElement('div');
        msgDiv.className = 'msg ' + sender;
        msgDiv.innerText = text;
        history.appendChild(msgDiv);
        history.scrollTop = history.scrollHeight;
    },

    showTyping() {
        const history = document.getElementById('chatHistory');
        const typingDiv = document.createElement('div');
        typingDiv.className = 'msg bot';
        typingDiv.id = 'tempTyping';
        typingDiv.innerHTML = `
            <div class="typing-indicator">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        `;
        history.appendChild(typingDiv);
        history.scrollTop = history.scrollHeight;
    },

    hideTyping() {
        const temp = document.getElementById('tempTyping');
        if (temp) temp.remove();
    },

    async sendMessage() {
        const input = document.getElementById('chatInput');
        const text = input.value.trim();
        if (!text) return;

        // Add user message
        this.history.push({ text, sender: 'user' });
        this.renderMessage(text, 'user');
        this.saveHistory();
        input.value = '';

        this.showTyping();

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text })
            });

            this.hideTyping();

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || `Server Error (${res.status})`);
            }

            const data = await res.json();
            if (data.reply) {
                this.history.push({ text: data.reply, sender: 'bot' });
                this.renderMessage(data.reply, 'bot');
                this.saveHistory();
                
                if (data.warning) {
                    console.warn('[CHATBOT] Server warning:', data.warning);
                }
            } else {
                throw new Error("Empty response from AI");
            }
        } catch(err) {
            this.hideTyping();
            let errorMsg = "I'm having trouble connecting to my AI brain right now. 🧠";
            
            if (err.message.includes('Failed to fetch')) {
                errorMsg = "Network error! Please check if your internet or local server is running. 🌐";
            } else if (err.message.includes('400')) {
                errorMsg = "I didn't quite catch that. Could you try rephrasing? ✍️";
            } else if (err.message.includes('500')) {
                errorMsg = "My servers are feeling a bit under the weather. Please try again in a moment! 🤒";
            } else {
                errorMsg = `Error: ${err.message}. I'll try to be back online soon!`;
            }
            
            this.renderMessage(errorMsg, 'bot');
        }
    }
};

document.addEventListener('DOMContentLoaded', () => ChatbotSystem.init());
