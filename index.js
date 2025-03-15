const express = require('express');
const serveIndex = require('serve-index');
const path = require('path');
const fs = require('fs');
const app = express();

// Configuration (can be overridden by environment variables)
const PORT = process.env.PORT || 42069;
const FOLDER_PATH = "../sharedfolder";
const HOST = process.env.HOST || "0.0.0.0";
const HIDE_DOTFILES = process.env.HIDE_DOTFILES === 'true' || true;
const IP_LOG_FILE = process.env.IP_LOG_FILE || path.join(__dirname, 'access_logs.txt');

// Verify that the shared folder exists
if (!fs.existsSync(FOLDER_PATH)) {
    console.error(`Error: Shared folder path ${FOLDER_PATH} does not exist!`);
    console.log('Creating the directory...');
    try {
        fs.mkdirSync(FOLDER_PATH, { recursive: true });
        console.log(`Directory ${FOLDER_PATH} created successfully.`);
    } catch (err) {
        console.error(`Failed to create directory: ${err.message}`);
        process.exit(1);
    }
}

// Function to log IP addresses and access information
function logAccess(ip, method, url, userAgent) {
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp} | IP: ${ip} | ${method} ${url} | ${userAgent}\n`;

    fs.appendFile(IP_LOG_FILE, logEntry, (err) => {
        if (err) {
            console.error(`Error writing to log file: ${err.message}`);
        }
    });
}

// IP logging middleware
app.use((req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'Unknown';

    // Log the access
    logAccess(ip, req.method, req.url, userAgent);

    next();
});

// Logger middleware
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const ip = req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress;
        console.log(`${ip} | ${req.method} ${req.url} ${res.statusCode} - ${duration}ms`);
    });
    next();
});

// Serve static assets from the public directory
app.use('/static', express.static(path.join(__dirname, 'public')));

// Basic security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline';");
    next();
});

// Simple rate limiting
const requestCounts = {};
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100;

app.use((req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();

    // Initialize or clean up old entries
    if (!requestCounts[ip] || now - requestCounts[ip].timestamp > RATE_LIMIT_WINDOW_MS) {
        requestCounts[ip] = {
            count: 1,
            timestamp: now
        };
        return next();
    }

    // Increment count for existing IP
    requestCounts[ip].count++;

    // Check if rate limit exceeded
    if (requestCounts[ip].count > RATE_LIMIT_MAX_REQUESTS) {
        return res.status(429).send('Too many requests. Please try again later.');
    }

    next();
});

// Serve files from the shared folder and provide directory listings
app.use('/', express.static(FOLDER_PATH), serveIndex(FOLDER_PATH, {
    stylesheet: path.join(__dirname, "public/css/customStyle.css"),
    template: path.join(__dirname, "public/tpl/customTemplate.html"),
    icons: true,
    maxAge: '10m',
    filter: (filename, req) => {
        // Hide dotfiles if configured
        if (HIDE_DOTFILES && path.basename(filename).startsWith('.')) {
            return false;
        }

        // Add more filtering logic as needed
        return true;
    }
}));

// Add a health check endpoint
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Add endpoint to view access logs (protected)
app.get('/admin/logs', (req, res) => {
    // For production, you should add authentication here
    // This is a simple example and should be properly secured

    fs.readFile(IP_LOG_FILE, 'utf8', (err, data) => {
        if (err) {
            console.error(`Error reading log file: ${err.message}`);
            return res.status(500).send('Error reading log file');
        }

        // Format logs as HTML
        const logLines = data.split('\n').filter(line => line.trim() !== '');
        const formattedLogs = logLines.map(line => `<div>${line}</div>`).join('');

        res.send(`
            <html>
                <head>
                    <title>Access Logs</title>
                    <style>
                        body { font-family: monospace; padding: 20px; }
                        div { padding: 5px; border-bottom: 1px solid #eee; }
                    </style>
                </head>
                <body>
                    <h1>Access Logs</h1>
                    ${formattedLogs}
                </body>
            </html>
        `);
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).send('Something went wrong!');
});

// Start the server
const server = app.listen(PORT, HOST, () => {
    console.log(`File sharing server is up and listening at http://${HOST}:${PORT}`);
    console.log(`Serving files from: ${FOLDER_PATH}`);
    console.log(`IP access logs stored in: ${IP_LOG_FILE}`);
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Error: Port ${PORT} is already in use. Please choose a different port.`);
    } else {
        console.error(`Server error: ${err.message}`);
    }
    process.exit(1);
});

// Handle graceful shutdown
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

function gracefulShutdown() {
    console.log('Shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });

    // Force close if not closed within 10 seconds
    setTimeout(() => {
        console.error('Forcing shutdown after timeout');
        process.exit(1);
    }, 10000);
}
