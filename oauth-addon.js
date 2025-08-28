require('./config');
const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Environment variables
const APP_ID = process.env.SERVICEM8_APP_ID;
const APP_SECRET = process.env.SERVICEM8_APP_SECRET;
const REDIRECT_URI = `https://servicem8-pricing-addon.onrender.com/oauth/callback`;

// OAuth URLs
const AUTHORIZE_URL = 'https://go.servicem8.com/oauth/authorize';
const TOKEN_URL = 'https://go.servicem8.com/oauth/access_token';

// Simple HTML helper
const createHTML = (title, content) => `
<!DOCTYPE html>
<html>
<head>
    <title>${title}</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; }
        .container { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #28a745; }
        .btn { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; text-decoration: none; display: inline-block; }
        .error { background: #f8d7da; color: #721c24; padding: 15px; border-radius: 4px; margin: 10px 0; }
        .success { background: #d4edda; color: #155724; padding: 15px; border-radius: 4px; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="container">
        ${content}
    </div>
</body>
</html>`;

// 1. Initial addon endpoint - starts OAuth flow
app.get('/addon/event', (req, res) => {
    res.removeHeader('X-Frame-Options');
    res.set('Content-Type', 'text/html; charset=utf-8');
    
    if (!APP_ID || !APP_SECRET) {
        return res.send(createHTML('Configuration Error', `
            <h1>⚠️ Configuration Error</h1>
            <div class="error">
                <strong>Missing environment variables:</strong><br>
                APP_ID: ${APP_ID ? 'Set' : 'Missing'}<br>
                APP_SECRET: ${APP_SECRET ? 'Set' : 'Missing'}
            </div>
            <p>Please configure SERVICEM8_APP_ID and SERVICEM8_APP_SECRET in Render.</p>
        `));
    }
    
    // Required scopes for job pricing
    const scopes = [
        'read_jobs',
        'manage_jobs', 
        'read_customers',
        'vendor'
    ].join(' ');
    
    const authURL = `${AUTHORIZE_URL}?` + new URLSearchParams({
        response_type: 'code',
        client_id: APP_ID,
        scope: scopes,
        redirect_uri: REDIRECT_URI
    });
    
    res.send(createHTML('ServiceM8 Authorization Required', `
        <h1>🔐 Authorization Required</h1>
        <p>This addon needs access to your ServiceM8 account to calculate job pricing.</p>
        <div class="success">
            <strong>Requested permissions:</strong><br>
            • Read and manage jobs<br>
            • Read customer information<br>
            • Basic account access
        </div>
        <p>Click the button below to authorize this addon:</p>
        <a href="${authURL}" class="btn">Authorize ServiceM8 Access</a>
        <br><br>
        <p><small>You'll be redirected to ServiceM8 to grant permissions, then back to this addon.</small></p>
    `));
});

// 2. OAuth callback - exchanges code for token
app.get('/oauth/callback', async (req, res) => {
    const { code, error } = req.query;
    
    res.removeHeader('X-Frame-Options');
    res.set('Content-Type', 'text/html; charset=utf-8');
    
    if (error) {
        return res.send(createHTML('Authorization Failed', `
            <h1>❌ Authorization Failed</h1>
            <div class="error">
                <strong>Error:</strong> ${error}<br>
                User denied access or authorization failed.
            </div>
            <p>Please try again or contact support.</p>
        `));
    }
    
    if (!code) {
        return res.send(createHTML('Missing Authorization Code', `
            <h1>❌ Missing Code</h1>
            <div class="error">No authorization code received from ServiceM8.</div>
        `));
    }
    
    try {
        // Exchange code for access token
        const tokenResponse = await axios.post(TOKEN_URL, {
            grant_type: 'authorization_code',
            client_id: APP_ID,
            client_secret: APP_SECRET,
            code: code,
            redirect_uri: REDIRECT_URI
        });
        
        const { access_token, refresh_token, expires_in, scope } = tokenResponse.data;
        
        // In a real app, you'd store these tokens in a database
        // For now, we'll just show the success page
        
        res.send(createHTML('✅ Authorization Successful!', `
            <h1>✅ Authorization Successful!</h1>
            <div class="success">
                <strong>ServiceM8 addon is now connected!</strong><br>
                Granted scopes: ${scope}<br>
                Token expires in: ${expires_in} seconds
            </div>
            
            <h2>Job Pricing Calculator</h2>
            <p>Your addon is now ready to calculate job pricing!</p>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 4px; margin: 20px 0;">
                <strong>Next Steps:</strong><br>
                • Access token received and can be used for API calls<br>
                • Addon can now read jobs and customer data<br>
                • Ready for job pricing calculations
            </div>
            
            <p><small>Access Token (first 20 chars): ${access_token.substring(0, 20)}...</small></p>
        `));
        
    } catch (error) {
        console.error('Token exchange error:', error.response?.data || error.message);
        res.send(createHTML('Token Exchange Failed', `
            <h1>❌ Token Exchange Failed</h1>
            <div class="error">
                <strong>Error:</strong> ${error.response?.data?.error || error.message}<br>
                Failed to exchange authorization code for access token.
            </div>
        `));
    }
});

// Handle icon
app.get('/icon.png', (req, res) => {
    res.sendFile(require('path').join(__dirname, 'icon.png'));
});

// Default route
app.get('/', (req, res) => {
    res.removeHeader('X-Frame-Options');
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(createHTML('ServiceM8 Pricing Addon', `
        <h1>🏠 ServiceM8 Pricing Addon</h1>
        <p>This addon helps calculate job pricing for ServiceM8.</p>
        <p><strong>Status:</strong> Ready for OAuth authentication</p>
        <p><strong>Callback URL:</strong> <code>/addon/event</code></p>
        <p><strong>OAuth Redirect:</strong> <code>/oauth/callback</code></p>
    `));
});

// Catch all
app.all('*', (req, res) => {
    res.removeHeader('X-Frame-Options');
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(createHTML('Page Not Found', `
        <h1>📍 ${req.method} ${req.path}</h1>
        <p>This endpoint is not configured.</p>
        <p><strong>Available endpoints:</strong></p>
        <ul>
            <li><code>GET /</code> - Home page</li>
            <li><code>GET /addon/event</code> - Main addon endpoint</li>
            <li><code>GET /oauth/callback</code> - OAuth callback</li>
        </ul>
    `));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`OAuth-enabled ServiceM8 addon running on port ${PORT}`);
    console.log(`App ID: ${APP_ID || 'Not set'}`);
    console.log(`App Secret: ${APP_SECRET ? 'Set' : 'Not set'}`);
    console.log(`Redirect URI: ${REDIRECT_URI}`);
});
