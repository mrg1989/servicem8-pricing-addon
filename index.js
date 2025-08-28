require('./config');
const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.text()); // For JWT tokens

// Simple Hello World HTML
const createSimpleHTML = (title, message) => `
<!DOCTYPE html>
<html>
<head>
    <title>${title}</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { 
            font-family: Arial, sans-serif; 
            padding: 40px; 
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
    </style>
</head>
<body>
    <div class="container">
        <h1>✅ ${title}</h1>
        <p>${message}</p>
        <p>ServiceM8 addon is working correctly!</p>
    </div>
</body>
</html>
`;

// Handle icon first
app.get('/icon.png', (req, res) => {
    res.sendFile(path.join(__dirname, 'icon.png'));
});

// Main addon endpoint that ServiceM8 calls
app.post('/addon/event', (req, res) => {
    try {
        let eventData = null;
        let authInfo = 'No authentication data';
        
        // Try to parse JWT token from ServiceM8
        if (typeof req.body === 'string' && req.body.split('.').length === 3) {
            try {
                const appSecret = process.env.SERVICEM8_APP_SECRET;
                if (appSecret) {
                    eventData = jwt.verify(req.body, appSecret);
                    authInfo = `Authenticated user: ${eventData.auth?.staffUUID || 'Unknown'}`;
                } else {
                    // For testing without secret
                    const parts = req.body.split('.');
                    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
                    eventData = payload;
                    authInfo = `Test mode - Staff: ${eventData.auth?.staffUUID || 'Unknown'}`;
                }
            } catch (jwtError) {
                authInfo = `JWT error: ${jwtError.message}`;
            }
        } else if (req.body) {
            eventData = req.body;
            authInfo = 'Received non-JWT data';
        }
        
        const html = createSimpleHTML(
            'Hello World!',
            'ServiceM8 successfully called this addon!'
        ).replace('</div>', `
            <div class="auth-info">
                <strong>Auth Info:</strong> ${authInfo}<br>
                <strong>Job UUID:</strong> ${eventData?.eventArgs?.jobUUID || eventData?.job?.uuid || 'N/A'}
            </div>
        </div>`);
        
        res.removeHeader('X-Frame-Options');
        res.set('Content-Type', 'text/html; charset=utf-8');
        res.send(html);
        
    } catch (error) {
        console.error('Addon error:', error);
        res.removeHeader('X-Frame-Options');
        res.set('Content-Type', 'text/html; charset=utf-8');
        res.send(createSimpleHTML('Error', 'Something went wrong, but addon is still working!'));
    }
});

// Return simple HTML for ALL other requests
app.all('*', (req, res) => {
    res.removeHeader('X-Frame-Options');
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(createSimpleHTML('Hello World!', 'ServiceM8 addon is running'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Simple ServiceM8 addon running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`App ID: ${process.env.SERVICEM8_APP_ID || 'Not set'}`);
    console.log(`App Secret configured: ${process.env.SERVICEM8_APP_SECRET ? 'Yes' : 'No'}`);
    console.log(`Callback URL should be: https://servicem8-pricing-addon.onrender.com/addon/event`);
});
