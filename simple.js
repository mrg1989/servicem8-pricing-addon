const express = require('express');
const app = express();

// Ultra simple HTML
const html = `<!DOCTYPE html>
<html>
<head><title>ServiceM8 Test</title></head>
<body>
<h1>✅ Hello ServiceM8!</h1>
<p>This addon is working!</p>
</body>
</html>`;

// Return HTML for everything
app.all('*', (req, res) => {
    res.removeHeader('X-Frame-Options');
    res.set('Content-Type', 'text/html');
    res.send(html);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Ultra-simple addon running on port ${PORT}`);
});
