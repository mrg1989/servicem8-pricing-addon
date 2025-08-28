require('./config');
const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.text()); // For JWT tokens

// Get environment variables
const APP_ID = process.env.SERVICEM8_APP_ID;
const APP_SECRET = process.env.SERVICEM8_APP_SECRET;

// Simple HTML helper
const createHTML = (title, content) => `
<!DOCTYPE html>
<html>
<head>
    <title>${title}</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { 
            font-family: Arial, sans-serif; 
            padding: 20px; 
            text-align: center;
            background: #f8f9fa;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 8px;
            max-width: 500px;
            margin: 0 auto;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { color: #28a745; margin-bottom: 20px; }
        p { color: #666; line-height: 1.6; }
        .auth-info { 
            background: #e7f3ff; 
            padding: 15px; 
            border-radius: 5px; 
            margin-top: 20px; 
            font-size: 12px;
            text-align: left;
        }
        .success { background: #d4edda; color: #155724; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .error { background: #f8d7da; color: #721c24; padding: 15px; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        ${content}
    </div>
</body>
</html>`;

// Handle icon first
app.get('/icon.png', (req, res) => {
    res.sendFile(path.join(__dirname, 'icon.png'));
});

// Main addon endpoint that ServiceM8 calls
app.post('/addon/event', (req, res) => {
    try {
        console.log('=== ServiceM8 Addon Event ===');
        console.log('Headers:', req.headers);
        console.log('Body type:', typeof req.body);
        console.log('Body:', req.body);
        console.log('APP_ID:', APP_ID ? 'Set' : 'Missing');
        console.log('APP_SECRET:', APP_SECRET ? 'Set' : 'Missing');
        
        let eventData = null;
        let authInfo = 'No authentication data';
        
        // Try to parse JWT token from ServiceM8
        if (typeof req.body === 'string' && req.body.split('.').length === 3) {
            try {
                if (APP_SECRET) {
                    // Verify JWT with app secret
                    eventData = jwt.verify(req.body, APP_SECRET);
                    authInfo = `✅ JWT verified with APP_SECRET`;
                    console.log('JWT verified successfully:', eventData);
                } else {
                    // Decode without verification for testing
                    const parts = req.body.split('.');
                    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
                    eventData = payload;
                    authInfo = `⚠️ JWT decoded without verification (missing APP_SECRET)`;
                    console.log('JWT decoded without verification:', eventData);
                }
            } catch (jwtError) {
                console.log('JWT error:', jwtError.message);
                authInfo = `❌ JWT verification failed: ${jwtError.message}`;
                eventData = { error: 'JWT verification failed' };
            }
        } else if (req.body) {
            eventData = req.body;
            authInfo = 'Received non-JWT data';
        }
        
        const content = `
            <h1>✅ Hello ServiceM8!</h1>
            <div class="success">ServiceM8 addon is working correctly!</div>
            <p>This page loaded successfully in the iframe.</p>
            
            <div class="auth-info">
                <strong>🔧 Environment Check:</strong><br>
                APP_ID: ${APP_ID ? 'Set ✅' : 'Missing ❌'}<br>
                APP_SECRET: ${APP_SECRET ? 'Set ✅' : 'Missing ❌'}<br><br>
                
                <strong>🔐 Auth Status:</strong> ${authInfo}<br>
                <strong>📋 Job UUID:</strong> ${eventData?.eventArgs?.jobUUID || eventData?.job?.uuid || 'N/A'}<br>
                <strong>👤 Staff UUID:</strong> ${eventData?.auth?.staffUUID || 'N/A'}<br>
                <strong>🏢 Account UUID:</strong> ${eventData?.auth?.accountUUID || 'N/A'}<br>
                <strong>⏰ Timestamp:</strong> ${new Date().toISOString()}
            </div>
        `;
        
        res.removeHeader('X-Frame-Options');
        res.set('Content-Type', 'text/html; charset=utf-8');
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.send(createHTML('ServiceM8 Addon Working!', content));
        
    } catch (error) {
        console.error('Addon error:', error);
        res.removeHeader('X-Frame-Options');
        res.set('Content-Type', 'text/html; charset=utf-8');
        res.send(createHTML('Error', `
            <h1>❌ Error</h1>
            <div class="error">Something went wrong: ${error.message}</div>
            <p>But the addon is still responding with HTML!</p>
        `));
    }
});

// GET requests for testing
app.get('/addon/event', (req, res) => {
    res.removeHeader('X-Frame-Options');
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(createHTML('GET Request', `
        <h1>⚠️ GET Request</h1>
        <p>ServiceM8 sent a GET request. It should send POST requests to this endpoint.</p>
        <div class="auth-info">
            APP_ID: ${APP_ID ? 'Set ✅' : 'Missing ❌'}<br>
            APP_SECRET: ${APP_SECRET ? 'Set ✅' : 'Missing ❌'}
        </div>
    `));
});

// Return simple HTML for ALL other requests
app.all('*', (req, res) => {
    res.removeHeader('X-Frame-Options');
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(createHTML('ServiceM8 Addon', `
        <h1>🏠 ServiceM8 Addon Home</h1>
        <p>Endpoint: ${req.method} ${req.path}</p>
        <p>Environment variables configured: ${APP_ID && APP_SECRET ? 'Yes ✅' : 'No ❌'}</p>
    `));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`ServiceM8 addon running on port ${PORT}`);
    console.log(`APP_ID: ${APP_ID || 'Not set'}`);
    console.log(`APP_SECRET: ${APP_SECRET ? 'Set' : 'Not set'}`);
    console.log(`Callback URL: https://servicem8-pricing-addon.onrender.com/addon/event`);
});
