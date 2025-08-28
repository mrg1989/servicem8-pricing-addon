// Simple debug version to see what ServiceM8 sends
require('./config');
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.text()); // Also accept raw text for JWT tokens

// Debug endpoint - shows exactly what ServiceM8 sends
app.post('/addon/event', (req, res) => {
    const debugInfo = {
        timestamp: new Date().toISOString(),
        headers: req.headers,
        bodyType: typeof req.body,
        bodyContent: req.body,
        rawBody: req.body?.toString ? req.body.toString() : 'not convertible'
    };
    
    // Return debug info as HTML so you can see it in the ServiceM8 window
    res.set('Content-Type', 'text/html');
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>ServiceM8 Debug Info</title>
            <style>
                body { font-family: monospace; padding: 20px; background: #f5f5f5; }
                .debug { background: #fff; padding: 20px; border-radius: 5px; margin: 10px 0; }
                pre { background: #eee; padding: 15px; overflow: auto; border-radius: 3px; }
            </style>
        </head>
        <body>
            <h1>🔍 ServiceM8 Debug Info</h1>
            
            <div class="debug">
                <h3>Request Headers:</h3>
                <pre>${JSON.stringify(debugInfo.headers, null, 2)}</pre>
            </div>
            
            <div class="debug">
                <h3>Body Type:</h3>
                <pre>${debugInfo.bodyType}</pre>
            </div>
            
            <div class="debug">
                <h3>Body Content:</h3>
                <pre>${JSON.stringify(debugInfo.bodyContent, null, 2)}</pre>
            </div>
            
            <div class="debug">
                <h3>Raw Body:</h3>
                <pre>${debugInfo.rawBody}</pre>
            </div>
            
            <div class="debug">
                <h3>Timestamp:</h3>
                <pre>${debugInfo.timestamp}</pre>
            </div>
        </body>
        </html>
    `);
});

// Serve icon
app.get('/icon.png', (req, res) => {
    res.sendFile(require('path').join(__dirname, 'icon.png'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Debug server running on port ${PORT}`);
});
