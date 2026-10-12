const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.static(__dirname, { maxAge: '1d' }));
app.get('/health', (req, res) => res.send('ok'));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.listen(PORT, () => console.log(`Money Runner Neon Dash on ${PORT}`));
