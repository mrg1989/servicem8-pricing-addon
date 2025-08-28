# ServiceM8 Authentication Documentation

## Working Authentication Setup

Based on our current working configuration, here's exactly how ServiceM8 authentication works:

### Environment Variables (CRITICAL)
```
SERVICEM8_APP_SECRET=your_app_secret_here
SERVICEM8_APP_ID=your_app_id_here (optional for JWT verification)
```

### JWT Token Verification Process

1. **ServiceM8 sends POST request** to `/addon/event` with JWT token as request body
2. **Token is a string** (not JSON object) 
3. **Verify with App Secret** using HMAC-SHA-256 algorithm
4. **Extract event data** from JWT payload

### Code Pattern That Works
```javascript
const jwt = require('jsonwebtoken');
const APP_SECRET = process.env.SERVICEM8_APP_SECRET;

app.post('/addon/event', (req, res) => {
    // CRITICAL: Set headers for iframe display
    res.removeHeader('X-Frame-Options');
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    let eventData = null;
    let authStatus = 'No authentication';
    
    // Check if body contains JWT token (string with dots)
    if (typeof req.body === 'string' && req.body.includes('.')) {
        try {
            if (APP_SECRET) {
                // Verify JWT with App Secret using HS256
                eventData = jwt.verify(req.body, APP_SECRET, { algorithms: ['HS256'] });
                authStatus = 'JWT verified successfully ✅';
            } else {
                // Fallback: decode without verification
                const decoded = jwt.decode(req.body, { complete: true });
                eventData = decoded ? decoded.payload : null;
                authStatus = 'App Secret missing - decoded without verification ⚠️';
            }
        } catch (jwtError) {
            authStatus = `JWT verification failed: ${jwtError.message}`;
            // Try to decode anyway for debugging
            try {
                const decoded = jwt.decode(req.body, { complete: true });
                eventData = decoded ? decoded.payload : null;
            } catch (e) {
                eventData = { error: 'Cannot decode JWT' };
            }
        }
    }
    
    // Extract data from JWT payload
    const jobUUID = eventData?.eventArgs?.jobUUID || 'N/A';
    const staffUUID = eventData?.auth?.staffUUID || 'N/A';
    const accountUUID = eventData?.auth?.accountUUID || 'N/A';
    const accessToken = eventData?.auth?.accessToken || 'N/A';
    
    // MUST return HTML (never JSON)
    res.send(`<!DOCTYPE html>
<html>
<head><title>ServiceM8 Addon</title></head>
<body>
    <h1>Working!</h1>
    <p>Auth: ${authStatus}</p>
    <p>Job: ${jobUUID}</p>
</body>
</html>`);
});
```

### JWT Payload Structure (from ServiceM8)
```json
{
    "eventVersion": "1.0",
    "eventName": "addon.event",
    "auth": {
        "accountUUID": "abc123...",
        "staffUUID": "def456...",
        "accessToken": "token123...",
        "accessTokenExpiry": "2024-01-01T00:00:00Z"
    },
    "eventArgs": {
        "jobUUID": "job789...",
        "companyUUID": "company012..."
    }
}
```

### Critical Requirements
1. **Always return HTML** (never JSON responses)
2. **Remove X-Frame-Options** header for iframe display
3. **Use SERVICEM8_APP_SECRET** for JWT verification with HS256
4. **Handle both verified and unverified JWT** for debugging
5. **Set proper Content-Type** to 'text/html; charset=utf-8'

### Common Issues
- "Invalid JSON Response Received" = returning JSON instead of HTML
- Blank page = iframe restrictions or content type issues
- JWT verification fails = wrong App Secret or algorithm

### Environment Setup in Render
```
SERVICEM8_APP_SECRET=your_secret_from_servicem8_developer_portal
SERVICEM8_APP_ID=your_app_id_from_servicem8_developer_portal
NODE_ENV=production
```

### Testing
- Direct URL test: https://servicem8-pricing-addon.onrender.com/addon/event (should show GET warning)
- ServiceM8 integration: Should show HTML content in iframe
- Auth verification: Check server logs for JWT verification status
