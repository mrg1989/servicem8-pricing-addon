require('./config');
const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.text()); // For JWT tokens from ServiceM8

// Get App Secret for authentication
const APP_SECRET = process.env.SERVICEM8_APP_SECRET;

console.log('=== HELLO WORLD ADDON ===');
console.log('App Secret:', APP_SECRET ? 'YES ✅' : 'NO ❌');

// MAIN ADDON ENDPOINT - exactly like ServiceM8 example
app.post('/addon/event', (req, res) => {
    console.log('=== ServiceM8 Request ===');
    console.log('Body:', req.body);
    
    let jobUUID = 'Unknown';
    let authStatus = 'No JWT';
    
    try {
        // Try to get job UUID from JWT (with auth)
        if (typeof req.body === 'string' && req.body.includes('.')) {
            console.log('JWT detected...');
            
            let eventData = null;
            if (APP_SECRET) {
                try {
                    eventData = jwt.verify(req.body, APP_SECRET, { algorithms: ['HS256'] });
                    authStatus = 'JWT Verified ✅';
                    console.log('JWT verified:', eventData);
                } catch (err) {
                    console.log('JWT verify failed:', err.message);
                    authStatus = 'JWT Failed ❌';
                    // Try decode anyway
                    try {
                        const decoded = jwt.decode(req.body, { complete: true });
                        eventData = decoded?.payload;
                    } catch (e) {}
                }
            } else {
                // No secret - just decode
                try {
                    const decoded = jwt.decode(req.body, { complete: true });
                    eventData = decoded?.payload;
                    authStatus = 'No Secret - Decoded';
                } catch (e) {}
            }
            
            // Extract job UUID
            if (eventData?.eventArgs?.jobUUID) {
                jobUUID = eventData.eventArgs.jobUUID;
            }
        }
    } catch (error) {
        console.log('Error processing request:', error);
        authStatus = 'Error';
    }
    
    // Create simple HTML exactly like ServiceM8 example
    const htmlResponse = `
<html>
    <head>
        <link rel="stylesheet" href="https://platform.servicem8.com/sdk/1.0/sdk.css">
        <script src="https://platform.servicem8.com/sdk/1.0/sdk.js"></script>
        <script>
            var client = SMClient.init();
            client.resizeWindow(500, 300);
        </script>
    </head>
    <body>
        <h1>Hello World ServiceM8 Addon</h1>
        
        <p>You have opened job <b>${jobUUID}</b></p>
        <p>Auth Status: <b>${authStatus}</b></p>
        <p>Timestamp: ${new Date().toISOString()}</p>
        
        <button onClick="client.closeWindow();">Close Window</button>
    </body>
</html>`;
    
    // Return exactly like ServiceM8 example
    console.log('Sending ServiceM8 response...');
    res.json({ 
        eventResponse: htmlResponse
    });
});

// Handle GET requests
app.get('/addon/event', (req, res) => {
    res.json({
        eventResponse: `
<html>
    <head>
        <link rel="stylesheet" href="https://platform.servicem8.com/sdk/1.0/sdk.css">
        <script src="https://platform.servicem8.com/sdk/1.0/sdk.js"></script>
    </head>
    <body>
        <h1>GET Request</h1>
        <p>ServiceM8 should send POST requests</p>
        <p>App Secret: ${APP_SECRET ? 'Set' : 'Missing'}</p>
    </body>
</html>`
    });
});

// Icon
app.get('/icon.png', (req, res) => {
    const path = require('path');
    res.sendFile(path.join(__dirname, 'icon.png'));
});

// Home
app.get('/', (req, res) => {
    res.send(`
        <h1>Hello World ServiceM8 Addon</h1>
        <p>Status: Running</p>
        <p>App Secret: ${APP_SECRET ? 'Configured' : 'Missing'}</p>
        <p>Endpoint: /addon/event</p>
    `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Hello World Addon running on port ${PORT}`);
    console.log(`App Secret: ${APP_SECRET ? 'Configured' : 'Missing'}`);
    console.log('Ready for ServiceM8');
});
