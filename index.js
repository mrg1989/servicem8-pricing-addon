require('./config');
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.text());

// Simple HTML response for EVERYTHING
const createTestPage = (title, message, details = '') => `
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
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            max-width: 600px;
            margin: 0 auto;
        }
        .success { background: #d4edda; color: #155724; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .info { background: #e7f3ff; color: #0c5460; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .form-group { margin-bottom: 15px; }
        label { display: block; margin-bottom: 5px; font-weight: bold; }
        select, input { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
        .btn { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
    </style>
</head>
<body>
    <div class="container">
        <h1>${title}</h1>
        <div class="success">${message}</div>
        ${details}
        
        <h2>Job Pricing Calculator</h2>
        <form>
            <div class="form-group">
                <label>Job Type:</label>
                <select name="jobType">
                    <option value="plumbing">Plumbing - £120/hour</option>
                    <option value="electrical">Electrical - £150/hour</option>
                    <option value="hvac">HVAC - £130/hour</option>
                    <option value="general">General - £100/hour</option>
                </select>
            </div>
            
            <div class="form-group">
                <label>Estimated Hours:</label>
                <input type="number" name="hours" value="2" min="0.5" step="0.5">
            </div>
            
            <button type="button" class="btn" onclick="alert('✅ Addon is working! ServiceM8 successfully loaded this page.')">
                Calculate Price
            </button>
        </form>
        
        <div class="info">
            <strong>✅ SUCCESS!</strong> If you can see this page, your ServiceM8 addon is working correctly!
        </div>
    </div>
</body>
</html>
`;

// Return HTML for ALL requests - no JSON anywhere
app.get('/', (req, res) => {
    // Ensure iframe compatibility
    res.removeHeader('X-Frame-Options');
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.set('Cache-Control', 'no-cache');
    
    res.send(createTestPage(
        '🏠 ServiceM8 Addon Home', 
        'Addon server is running!',
        '<p>This is the main page. ServiceM8 should call <code>/addon/event</code> for button clicks.</p>'
    ));
});

app.post('/addon/event', (req, res) => {
    // Ensure iframe compatibility
    res.removeHeader('X-Frame-Options');
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.set('Cache-Control', 'no-cache');
    
    res.send(createTestPage(
        '🎯 Calculate Job Pricing', 
        'ServiceM8 successfully called the addon!',
        `<div class="info">
            <strong>Debug Info:</strong><br>
            Request method: POST<br>
            Endpoint: /addon/event<br>
            Body type: ${typeof req.body}<br>
            Content: ${JSON.stringify(req.body).substring(0, 100)}...
        </div>`
    ));
});

app.get('/addon/event', (req, res) => {
    // Ensure iframe compatibility
    res.removeHeader('X-Frame-Options');
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.set('Cache-Control', 'no-cache');
    
    res.send(createTestPage(
        '⚠️ GET Request to /addon/event', 
        'ServiceM8 sent a GET request (should be POST)',
        '<p>ServiceM8 should send POST requests to this endpoint for button clicks.</p>'
    ));
});

// Handle icon
app.get('/icon.png', (req, res) => {
    res.sendFile(path.join(__dirname, 'icon.png'));
});

// Catch all other requests with HTML
app.all('*', (req, res) => {
    // Ensure iframe compatibility
    res.removeHeader('X-Frame-Options');
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.set('Cache-Control', 'no-cache');
    
    res.send(createTestPage(
        `📍 ${req.method} ${req.path}`, 
        'ServiceM8 called an unexpected URL',
        `<div class="info">
            <strong>ServiceM8 called:</strong> ${req.method} ${req.path}<br>
            <strong>Expected:</strong> POST /addon/event<br>
            <strong>Your Callback URL should be:</strong> https://servicem8-pricing-addon.onrender.com/addon/event
        </div>`
    ));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`HTML-only addon server running on port ${PORT}`);
});
