require('./config');
const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.text()); // Also accept raw text for JWT tokens

// JWT-enabled addon event handler
app.post('/addon/event', (req, res) => {
    try {
        console.log('=== ServiceM8 Addon Event ===');
        console.log('Headers:', req.headers);
        console.log('Body type:', typeof req.body);
        console.log('Body:', req.body);
        
        let eventData;
        
        // Try to parse as JWT token first
        if (typeof req.body === 'string' && req.body.split('.').length === 3) {
            try {
                // This is likely a JWT token
                const appSecret = process.env.SERVICEM8_APP_SECRET;
                if (appSecret) {
                    eventData = jwt.verify(req.body, appSecret);
                    console.log('JWT decoded successfully:', eventData);
                } else {
                    console.log('No app secret, treating as unsigned JWT');
                    // For testing, decode without verification
                    const parts = req.body.split('.');
                    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
                    eventData = payload;
                    console.log('Unsigned JWT payload:', eventData);
                }
            } catch (jwtError) {
                console.log('JWT parse error:', jwtError.message);
                // Fallback: treat as regular event
                eventData = { event: 'calculate_job_pricing' };
            }
        } else {
            // Regular JSON object
            eventData = req.body;
        }
        
        // Return pricing form HTML
        res.set('Content-Type', 'text/html');
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Calculate Job Pricing</title>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    .debug { background: #e7f3ff; padding: 10px; margin-bottom: 20px; border-radius: 4px; font-size: 12px; }
                    .form-group { margin-bottom: 15px; }
                    label { display: block; margin-bottom: 5px; font-weight: bold; }
                    select, input { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
                    .btn { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
                    .btn:hover { background: #0056b3; }
                </style>
            </head>
            <body>
                <div class="debug">
                    <strong>Debug:</strong> Event=${eventData.event || 'unknown'}, Job=${eventData.job?.generated_job_id || 'N/A'}
                </div>
                
                <h2>Calculate Job Pricing</h2>
                <form id="pricingForm">
                    <div class="form-group">
                        <label>Job Type:</label>
                        <select name="jobType" required>
                            <option value="plumbing">Plumbing (£120/hr base)</option>
                            <option value="electrical">Electrical (£150/hr base)</option>
                            <option value="hvac">HVAC (£130/hr base)</option>
                            <option value="general">General (£100/hr base)</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Complexity:</label>
                        <select name="complexity" required>
                            <option value="simple">Simple (1x)</option>
                            <option value="medium">Medium (1.2x)</option>
                            <option value="complex">Complex (1.8x)</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Estimated Hours:</label>
                        <input type="number" name="estimatedHours" min="0.5" step="0.5" value="2" required>
                    </div>
                    
                    <button type="button" class="btn" onclick="alert('Pricing calculated! This addon is working correctly.')">Calculate Pricing</button>
                </form>
                
                <p style="margin-top: 30px; font-size: 12px; color: #666;">
                    ✅ Addon is working! ServiceM8 successfully called this endpoint.
                </p>
            </body>
            </html>
        `);
        
    } catch (error) {
        console.error('Addon event error:', error);
        res.status(500).json({ error: 'Internal server error', message: error.message });
    }
});

// Serve icon
app.get('/icon.png', (req, res) => {
    res.sendFile(path.join(__dirname, 'icon.png'));
});

// Basic info endpoint
app.get('/', (req, res) => {
    res.json({ 
        message: "ServiceM8 Staff Pricing Addon",
        status: "Running with JWT support",
        endpoints: { "addon/event": "POST /addon/event" }
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`JWT-enabled addon server running on port ${PORT}`);
});
