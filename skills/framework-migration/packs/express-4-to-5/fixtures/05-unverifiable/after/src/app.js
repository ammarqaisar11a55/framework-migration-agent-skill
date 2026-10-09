const path = require('path');
const express = require('express');
const config = require('./config');

const app = express();
app.set('query parser', 'extended');

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/', (req, res) => {
  res.send('unverifiable fixture');
});

// The path comes from configuration, so its syntax cannot be checked statically.
app.get(config.healthPath, (req, res) => {
  res.json({ ok: true });
});

// Routes registered through a computed method name.
for (const method of config.echoMethods) {
  app[method]('/echo', (req, res) => {
    res.json({ method: req.method });
  });
}

app.post('/logout', (req, res) => {
  res.clearCookie('session', { path: '/', maxAge: 0 });
  res.json({ ok: true });
});

module.exports = app;
