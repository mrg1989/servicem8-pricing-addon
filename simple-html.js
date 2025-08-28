require('./config');
const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.text()); // For JWT tokens from ServiceM8

// Get App Secret - this is CRITICAL for authentication
const APP_SECRET = process.env.SERVICEM8_APP_SECRET;

console.log('=== AUTHENTICATION SETUP ===');
console.log('App Secret configured:', APP_SECRET ? 'YES ✅' : 'NO ❌');
console.log('App ID configured:', process.env.SERVICEM8_APP_ID ? 'YES ✅' : 'NO ❌');

// MAIN ADDON ENDPOINT - ServiceM8 calls this with JWT token
app.post('/addon/event', (req, res) => {
    console.log('=== ServiceM8 Request Received ===');
    console.log('Method:', req.method);
    console.log('Headers:', req.headers);
    console.log('Body type:', typeof req.body);
    console.log('Body length:', req.body ? req.body.length : 0);
    
    // CRITICAL: Remove iframe restrictions
    res.removeHeader('X-Frame-Options');
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    let authStatus = 'No authentication';
    let eventData = null;
    
    try {
        // Handle JWT token from ServiceM8
        if (typeof req.body === 'string' && req.body.includes('.')) {
            console.log('JWT token detected, attempting verification...');
            
            if (APP_SECRET) {
                try {
                    // Verify JWT with App Secret
                    eventData = jwt.verify(req.body, APP_SECRET, { algorithms: ['HS256'] });
                    authStatus = 'JWT verified successfully ✅';
                    console.log('JWT verification SUCCESS:', eventData);
                } catch (jwtError) {
                    console.log('JWT verification FAILED:', jwtError.message);
                    authStatus = `JWT verification failed: ${jwtError.message}`;
                    // Try to decode without verification for debugging
                    try {
                        const decoded = jwt.decode(req.body, { complete: true });
                        eventData = decoded ? decoded.payload : null;
                    } catch (e) {
                        eventData = { error: 'Cannot decode JWT' };
                    }
                }
            } else {
                console.log('App Secret missing - decoding without verification');
                authStatus = 'App Secret missing - decoded without verification ⚠️';
                try {
                    const decoded = jwt.decode(req.body, { complete: true });
                    eventData = decoded ? decoded.payload : null;
                } catch (e) {
                    eventData = { error: 'Cannot decode JWT' };
                }
            }
        } else {
            console.log('No JWT token detected');
            authStatus = 'No JWT token received';
            eventData = req.body || {};
        }
        
        // Extract key data from JWT payload
        const jobUUID = eventData?.eventArgs?.jobUUID || 'N/A';
        const staffUUID = eventData?.auth?.staffUUID || 'N/A';
        const accountUUID = eventData?.auth?.accountUUID || 'N/A';
        
        console.log('Extracted data:', { jobUUID, staffUUID, accountUUID });
        
        // Return SIMPLE HTML - this is what ServiceM8 expects
        const simpleHTML = `<!DOCTYPE html>
<html>
<head>
    <title>ServiceM8 Pricing</title>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; background: white; }
        h1 { color: green; }
        .status { background: #f0f8ff; padding: 15px; border-radius: 5px; margin: 10px 0; }
        .success { background: #d4edda; padding: 10px; border-radius: 3px; color: #155724; }
    </style>
</head>
<body>
    <h1>✅ ServiceM8 Addon Working!</h1>
    
    <div class="success">
        Authentication: ${authStatus}
    </div>
    
    <div class="status">
        <strong>Job UUID:</strong> ${jobUUID}<br>
        <strong>Staff UUID:</strong> ${staffUUID}<br>
        <strong>Account UUID:</strong> ${accountUUID}<br>
        <strong>Timestamp:</strong> ${new Date().toISOString()}
    </div>
    
    <p>This addon is working correctly and receiving data from ServiceM8.</p>
</body>
</html>`;
        
        console.log('Sending HTML response...');
        res.send(simpleHTML);
        
    } catch (error) {
        console.error('ERROR in addon:', error);
        
        // Even on error, return HTML
        res.removeHeader('X-Frame-Options');
        res.set('Content-Type', 'text/html; charset=utf-8');
        res.send(`<!DOCTYPE html>
<html>
<head><title>Error</title></head>
<body>
    <h1>Error</h1>
    <p>Something went wrong: ${error.message}</p>
    <p>But HTML is still being returned!</p>
</body>
</html>`);
    }
});

// Handle GET requests to addon endpoint
app.get('/addon/event', (req, res) => {
    res.removeHeader('X-Frame-Options');
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!DOCTYPE html>
<html>
<head><title>GET Request</title></head>
<body>
    <h1>⚠️ GET Request Detected</h1>
    <p>ServiceM8 should send POST requests with JWT tokens to this endpoint.</p>
    <p>App Secret: ${APP_SECRET ? 'Configured ✅' : 'Missing ❌'}</p>
</body>
</html>`);
});

// Serve icon
app.get('/icon.png', (req, res) => {
    const path = require('path');
    res.sendFile(path.join(__dirname, 'icon.png'));
});

// Home page
app.get('/', (req, res) => {
    res.removeHeader('X-Frame-Options');
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!DOCTYPE html>
<html>
<head><title>ServiceM8 Addon Status</title></head>
<body>
    <h1>ServiceM8 Pricing Addon</h1>
    <p><strong>Status:</strong> Running ✅</p>
    <p><strong>App Secret:</strong> ${APP_SECRET ? 'Configured ✅' : 'Missing ❌'}</p>
    <p><strong>Callback URL:</strong> /addon/event</p>
</body>
</html>`);
});

// Catch all other routes
app.all('*', (req, res) => {
    res.removeHeader('X-Frame-Options');
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!DOCTYPE html>
<html>
<head><title>Unknown Endpoint</title></head>
<body>
    <h1>Unknown Endpoint</h1>
    <p>Path: ${req.path}</p>
    <p>Method: ${req.method}</p>
    <p><a href="/">Go Home</a></p>
</body>
</html>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`=== ServiceM8 Simple HTML Addon ===`);
    console.log(`Port: ${PORT}`);
    console.log(`App Secret: ${APP_SECRET ? 'Configured' : 'MISSING'}`);
    console.log(`Callback URL: https://servicem8-pricing-addon.onrender.com/addon/event`);
    console.log('Ready for ServiceM8 JWT tokens');
});
