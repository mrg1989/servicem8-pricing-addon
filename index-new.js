require('./config'); // Load environment variables
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

// Import the PROTECTED ServiceM8 core (DO NOT MODIFY THE CORE!)
const ServiceM8Core = require('./core');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.text());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Initialize the protected ServiceM8 core
const serviceM8Core = new ServiceM8Core();

// ========================================
// PROTECTED SERVICEM8 ENDPOINTS
// These use the core - DO NOT MODIFY!
// ========================================

// Main ServiceM8 addon endpoint (POST) - PROTECTED!
app.post('/addon/event', (req, res) => {
    serviceM8Core.handleAddonEvent(req, res);
});

// ServiceM8 addon endpoint (GET) for testing - PROTECTED!
app.get('/addon/event', (req, res) => {
    serviceM8Core.handleAddonGet(req, res);
});

// ========================================
// SAFE TO MODIFY - Additional endpoints
// ========================================

// Home page - you can modify this safely
app.get('/', (req, res) => {
    res.removeHeader('X-Frame-Options');
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>ServiceM8 Staff Pricing Addon</title>
            <meta charset="utf-8">
            <style>
                body { font-family: Arial, sans-serif; padding: 40px; background: #f8f9fa; }
                .container { background: white; padding: 40px; border-radius: 8px; max-width: 600px; margin: 0 auto; }
                h1 { color: #28a745; }
                .status { background: #e7f3ff; padding: 20px; border-radius: 5px; margin: 20px 0; }
                .btn { background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 5px; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🏠 ServiceM8 Staff Pricing Addon</h1>
                
                <div class="status">
                    <h3>📊 Status</h3>
                    <p><strong>Version:</strong> 2.0.0 (Protected Core)</p>
                    <p><strong>Status:</strong> ✅ Running</p>
                    <p><strong>Core:</strong> ✅ Protected</p>
                    <p><strong>App Secret:</strong> ${process.env.SERVICEM8_APP_SECRET ? 'Configured ✅' : 'Missing ❌'}</p>
                </div>
                
                <h3>🔗 Test Endpoints</h3>
                <p><a href="/addon/event" class="btn">Test ServiceM8 Addon</a></p>
                <p><a href="/config" class="btn">View Configuration</a></p>
                
                <h3>🛡️ Protected Core</h3>
                <p>The ServiceM8 authentication and response handling is now in protected core files:</p>
                <ul>
                    <li><code>/core/auth.js</code> - Authentication handler</li>
                    <li><code>/core/templates.js</code> - HTML templates</li>
                    <li><code>/core/index.js</code> - Core handler</li>
                </ul>
                <p><strong>These core files should NOT be modified!</strong></p>
            </div>
        </body>
        </html>
    `);
});

// Configuration endpoint - you can modify this safely
app.get('/config', (req, res) => {
    res.json({
        name: 'ServiceM8 Staff Pricing Addon',
        version: '2.0.0',
        description: 'Protected core with modular architecture',
        status: 'running',
        core_protected: true,
        app_secret_configured: !!process.env.SERVICEM8_APP_SECRET,
        endpoints: {
            main: '/addon/event',
            config: '/config',
            home: '/'
        }
    });
});

// Add any additional endpoints here - they won't affect the core!
// For example:
// app.get('/custom-endpoint', (req, res) => {
//     res.json({ message: 'This is safe to modify!' });
// });

// Serve manifest file
app.get('/manifest.json', (req, res) => {
    res.sendFile(path.join(__dirname, 'manifest.json'));
});

// Serve addon icon
app.get('/icon.png', (req, res) => {
    res.sendFile(path.join(__dirname, 'icon.png'));
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ ServiceM8 Staff Pricing Addon v2.0 running on port ${PORT}`);
    console.log(`🛡️ Protected core initialized`);
    console.log(`🔗 Main endpoint: http://localhost:${PORT}/addon/event`);
    console.log(`📊 Config: http://localhost:${PORT}/config`);
    console.log(`🏠 Home: http://localhost:${PORT}/`);
});
