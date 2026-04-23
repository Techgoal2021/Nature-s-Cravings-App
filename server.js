const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const HOST = '0.0.0.0';

// ─── .env Loader ────────────────────────────────────────────────────────────
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
        const eqIdx = line.indexOf('=');
        if (eqIdx > 0) {
            const key = line.slice(0, eqIdx).trim();
            const value = line.slice(eqIdx + 1).trim().replace(/^"(.*)"$/, '$1');
            if (key && !process.env[key]) process.env[key] = value;
        }
    });
}

const PORT = process.env.PORT || 8080;
console.log(`[DEBUG] Attempting to listen on port: ${PORT}`);

// ─── MIME Types ──────────────────────────────────────────────────────────────
const MIME = {
    '.html': 'text/html',
    '.js':   'text/javascript',
    '.css':  'text/css',
    '.json': 'application/json',
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.avif': 'image/avif',
    '.gif':  'image/gif',
    '.svg':  'image/svg+xml',
    '.ico':  'image/x-icon',
};

// ─── Server ──────────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname  = decodeURIComponent(parsedUrl.pathname);

    // ── API Routing ──────────────────────────────────────────────────────────
    if (pathname.startsWith('/api/')) {
        // Convert /api/admin/bookings  →  <root>/api/admin/bookings.js
        const apiFilePath = path.join(__dirname, pathname.replace(/\/$/, '') + '.js');

        // Safety: must stay inside project
        if (!apiFilePath.startsWith(__dirname)) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Forbidden' }));
            return;
        }

        if (fs.existsSync(apiFilePath)) {
            console.log(`[API] ${req.method} ${pathname}`);
            try {
                // HOT-RELOAD: Clear the cache so changes to API files take effect without a restart
                delete require.cache[require.resolve(apiFilePath)];
                
                const handler = require(apiFilePath);
                if (typeof handler === 'function') {
                    // Optimized Async Wrapper: Ensures both sync and async errors are caught
                    (async () => {
                        try {
                            await handler(req, res);
                        } catch (err) {
                            console.error(`[API RUNTIME ERROR] ${pathname}:`, err);
                            if (!res.headersSent) {
                                res.writeHead(500, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ error: 'Internal server error', message: err.message }));
                            }
                        }
                    })();
                    return;
                }
            } catch (err) {
                console.error(`[API LOAD ERROR] ${pathname}:`, err.message);
                if (!res.headersSent) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Failed to load API handler', detail: err.message }));
                }
                return;
            }
        }

        // API file not found
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `API endpoint not found: ${pathname}` }));
        return;
    }

    // ── Static Files ─────────────────────────────────────────────────────────
    let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);

    // Safety check
    if (!filePath.startsWith(__dirname)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                // Try appending .html for clean URLs
                fs.readFile(filePath + '.html', (err2, content2) => {
                    if (err2) {
                        res.writeHead(404, { 'Content-Type': 'text/html' });
                        res.end('<h2>404 – Page not found</h2>');
                    } else {
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(content2);
                    }
                });
            } else {
                res.writeHead(500);
                res.end('Server Error: ' + err.code);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
});

// ── Error Resilience ─────────────────────────────────────────────────────────
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ Port ${PORT} is already in use by another process.`);
        console.error(`💡 Try: PORT=${parseInt(PORT) + 1} node server.js OR kill the process on port ${PORT}.\n`);
    } else if (err.code === 'EPERM') {
        console.error(`\n❌ Permission denied (EPERM) while trying to listen on ${HOST}:${PORT}.`);
        console.error(`💡 This can happen if port ${PORT} is in a "TIME_WAIT" state or restricted by your OS.\n`);
    } else {
        console.error('[SERVER ERROR]', err.message);
    }
    process.exit(1);
});

server.listen(PORT, () => {
    console.log(`
  🌿  Nature's Cravings — Running
  ──────────────────────────────────
  Local: http://localhost:${PORT}
  
  Press Ctrl+C to stop.
    `);
});
