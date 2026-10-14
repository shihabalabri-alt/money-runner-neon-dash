const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.static(__dirname, {
  maxAge: 0,
  etag: false,
  setHeaders: (res, p) => {
    if (p.endsWith('.html') || p.endsWith('.js') || p.endsWith('.css')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    }
  }
}));
app.get('/health', (req, res) => res.send('ok'));
app.use((req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.sendFile(path.join(__dirname, 'index.html'));
});
app.listen(PORT, () => console.log(`Money Runner Neon Dash on ${PORT}`));
