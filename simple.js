const express = require('express');
const app = express();

// Return HTML for everything
app.all('*', (req, res) => {
    res.removeHeader('X-Frame-Options');
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
    // Dynamic HTML with timestamp
    const dynamicHtml = `<!DOCTYPE html>
<html>
<head>
    <title>ServiceM8 Test v2</title>
    <meta charset="utf-8">
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="0">
</head>
<body>
<h1>✅ Hello ServiceM8! v2</h1>
<p>This addon is working! Version 2</p>
<p>Time: ${new Date().toISOString()}</p>
<p>Request: ${req.method} ${req.path}</p>
</body>
</html>`;
    
    res.send(dynamicHtml);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Ultra-simple addon running on port ${PORT}`);
});
