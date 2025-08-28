require('./config');
const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.text()); // For JWT tokens from ServiceM8

// Get environment variables - ONLY App Secret needed for JWT verification
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
            background: #f8f9fa;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            max-width: 600px;
            margin: 0 auto;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { color: #28a745; margin-bottom: 20px; }
        .success { background: #d4edda; color: #155724; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .info { background: #e7f3ff; color: #0c5460; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .error { background: #f8d7da; color: #721c24; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .debug { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        ${content}
    </div>
</body>
</html>`;

// Handle icon
app.get('/icon.png', (req, res) => {
    res.sendFile(path.join(__dirname, 'icon.png'));
});

// Main addon endpoint - ServiceM8 sends JWT here
app.post('/addon/event', (req, res) => {
    console.log('=== ServiceM8 Addon Called ===');
    console.log('Headers:', req.headers);
    console.log('Body type:', typeof req.body);
    console.log('Body length:', req.body ? req.body.length : 0);
    console.log('App Secret configured:', APP_SECRET ? 'Yes' : 'No');
    
    // Remove iframe restrictions - CRITICAL for ServiceM8
    res.removeHeader('X-Frame-Options');
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    try {
        let eventData = null;
        let authStatus = '';
        
        // ServiceM8 sends JWT token as request body (as per documentation)
        if (typeof req.body === 'string' && req.body.includes('.')) {
            try {
                if (APP_SECRET) {
                    // Verify JWT with App Secret using HMAC-SHA256 (as per docs)
                    eventData = jwt.verify(req.body, APP_SECRET, { algorithms: ['HS256'] });
                    authStatus = '✅ JWT verified with App Secret';
                    console.log('JWT verified successfully:', eventData);
                } else {
                    // Decode without verification (for testing)
                    const decoded = jwt.decode(req.body, { complete: true });
                    eventData = decoded ? decoded.payload : null;
                    authStatus = '⚠️ JWT decoded without verification (App Secret missing)';
                    console.log('JWT decoded without verification:', eventData);
                }
            } catch (jwtError) {
                console.error('JWT verification failed:', jwtError.message);
                authStatus = `❌ JWT verification failed: ${jwtError.message}`;
                // Try to decode anyway for debugging
                try {
                    const decoded = jwt.decode(req.body, { complete: true });
                    eventData = decoded ? decoded.payload : { error: 'Invalid JWT' };
                } catch (decodeError) {
                    eventData = { error: 'Cannot decode JWT' };
                }
            }
        } else {
            // Handle non-JWT requests
            eventData = req.body || { error: 'No data received' };
            authStatus = 'No JWT token received';
        }
        
        // Extract data based on ServiceM8 event structure from documentation
        const jobUUID = eventData?.eventArgs?.jobUUID || 'N/A';
        const companyUUID = eventData?.eventArgs?.companyUUID || 'N/A';
        const staffUUID = eventData?.auth?.staffUUID || 'N/A';
        const accountUUID = eventData?.auth?.accountUUID || 'N/A';
        const eventName = eventData?.eventName || 'N/A';
        const accessToken = eventData?.auth?.accessToken || 'N/A';
        
        const content = `
            <h1>✅ ServiceM8 Addon Working!</h1>
            <div class="success">
                Successfully received and processed ServiceM8 event!
            </div>
            
            <h2>📋 Job Pricing Calculator</h2>
            <p>This addon can now calculate pricing for the selected job.</p>
            
            <div class="info">
                <strong>🔐 Authentication:</strong> ${authStatus}<br>
                <strong>� Event Name:</strong> ${eventName}<br>
                <strong>🏢 Account UUID:</strong> ${accountUUID}<br>
                <strong>👤 Staff UUID:</strong> ${staffUUID}<br>
                <strong>📄 Job UUID:</strong> ${jobUUID}<br>
                <strong>� Company UUID:</strong> ${companyUUID}<br>
                <strong>🔑 Access Token:</strong> ${accessToken !== 'N/A' ? accessToken.substring(0, 20) + '...' : 'N/A'}
            </div>
            
            <div class="debug">
                <strong>🔧 Debug Info:</strong><br>
                Request Method: ${req.method}<br>
                Content-Type: ${req.headers['content-type'] || 'Not set'}<br>
                User-Agent: ${req.headers['user-agent'] || 'Not set'}<br>
                Body Type: ${typeof req.body}<br>
                Timestamp: ${new Date().toISOString()}
            </div>
        `;
        
        res.send(createHTML('ServiceM8 Pricing Addon', content));
        
    } catch (error) {
        console.error('Addon error:', error);
        res.send(createHTML('Error', `
            <h1>❌ Error</h1>
            <div class="error">
                Something went wrong: ${error.message}
            </div>
            <p>But the addon is still responding with HTML!</p>
        `));
    }
});

// Handle GET requests (for testing)
app.get('/addon/event', (req, res) => {
    res.removeHeader('X-Frame-Options');
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(createHTML('GET Request Warning', `
        <h1>⚠️ GET Request Received</h1>
        <div class="info">
            ServiceM8 should send POST requests with JWT tokens to this endpoint.
        </div>
        <p>If you're seeing this, ServiceM8 is sending GET instead of POST requests.</p>
        <div class="debug">
            App Secret configured: ${APP_SECRET ? 'Yes ✅' : 'No ❌'}<br>
            Endpoint: /addon/event<br>
            Expected: POST with JWT token
        </div>
    `));
});

// Default route
app.get('/', (req, res) => {
    res.removeHeader('X-Frame-Options');
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(createHTML('ServiceM8 Addon Status', `
        <h1>🏠 ServiceM8 Pricing Addon</h1>
        <div class="info">
            <strong>Status:</strong> Ready for ServiceM8 events<br>
            <strong>App Secret:</strong> ${APP_SECRET ? 'Configured ✅' : 'Missing ❌'}<br>
            <strong>Callback URL:</strong> /addon/event
        </div>
        <p>This is a Web Service Hosted Add-on that receives JWT tokens from ServiceM8.</p>
    `));
});

// Catch all
app.all('*', (req, res) => {
    res.removeHeader('X-Frame-Options');
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(createHTML('Unknown Endpoint', `
        <h1>📍 ${req.method} ${req.path}</h1>
        <p>This endpoint is not configured for ServiceM8.</p>
        <div class="info">
            <strong>Available endpoints:</strong><br>
            • GET / - Status page<br>
            • POST /addon/event - Main addon endpoint
        </div>
    `));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`ServiceM8 Web Service Hosted Add-on running on port ${PORT}`);
    console.log(`App Secret: ${APP_SECRET ? 'Configured' : 'Missing - set SERVICEM8_APP_SECRET'}`);
    console.log(`Callback URL: https://servicem8-pricing-addon.onrender.com/addon/event`);
    console.log('Ready to receive JWT tokens from ServiceM8');
});
