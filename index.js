require('./config');
const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.text());

const APP_SECRET = process.env.SERVICEM8_APP_SECRET;

console.log('=== MINIMAL SERVICEM8 ADDON ===');
console.log('App Secret:', APP_SECRET ? 'SET' : 'MISSING');

// ServiceM8 calls this endpoint
app.post('/addon/event', (req, res) => {
    console.log('ServiceM8 request received');
    console.log('Body:', req.body);
    
    let jobUUID = 'Unknown';
    let authStatus = 'No Auth';
    
    // Handle JWT from ServiceM8
    if (typeof req.body === 'string' && req.body.includes('.')) {
        try {
            if (APP_SECRET) {
                const eventData = jwt.verify(req.body, APP_SECRET, { algorithms: ['HS256'] });
                authStatus = 'JWT Verified';
                jobUUID = eventData?.eventArgs?.jobUUID || 'No Job UUID';
                console.log('JWT verified:', eventData);
            } else {
                const decoded = jwt.decode(req.body, { complete: true });
                authStatus = 'JWT Decoded (No Secret)';
                jobUUID = decoded?.payload?.eventArgs?.jobUUID || 'No Job UUID';
            }
        } catch (error) {
            authStatus = 'JWT Error: ' + error.message;
            console.log('JWT error:', error);
        }
    }
    
    // Return ServiceM8 format
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
        <h1>✅ MINIMAL ADDON WORKING!</h1>
        <p><strong>Job:</strong> ${jobUUID}</p>
        <p><strong>Auth:</strong> ${authStatus}</p>
        <p><strong>Time:</strong> ${new Date().toISOString()}</p>
        <button onClick="client.closeWindow();">Close</button>
    </body>
</html>`;
    
    res.json({ eventResponse: htmlResponse });
});

// GET endpoint
app.get('/addon/event', (req, res) => {
    res.json({
        eventResponse: `
<html>
    <body>
        <h1>GET Request to Minimal Addon</h1>
        <p>App Secret: ${APP_SECRET ? 'SET' : 'MISSING'}</p>
    </body>
</html>`
    });
});

app.get('/', (req, res) => {
    res.send(`
        <h1>MINIMAL ServiceM8 Addon</h1>
        <p>Status: Running</p>
        <p>App Secret: ${APP_SECRET ? 'SET' : 'MISSING'}</p>
    `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Minimal addon running on port ${PORT}`);
});
