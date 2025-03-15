const express = require('express');
const serveIndex = require('serve-index');
const path = require('path');
const fs = require('fs');
const app = express();

// Configuration (can be overridden by environment variables)
const PORT = process.env.PORT || 42069;
const FOLDER_PATH = process.env.FOLDER_PATH || path.resolve(__dirname, "sharedfolder");
const HOST = process.env.HOST || "0.0.0.0";
const HIDE_DOTFILES = process.env.HIDE_DOTFILES === 'true' || true;

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

// Logger middleware
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.url} ${res.statusCode} - ${duration}ms`);
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

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).send('Something went wrong!');
});

// Start the server
const server = app.listen(PORT, HOST, () => {
    console.log(`File sharing server is up and listening at http://localhost:${PORT}`);
    console.log(`Serving files from: ${FOLDER_PATH}`);
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
