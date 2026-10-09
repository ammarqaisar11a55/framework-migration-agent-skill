const express = require('express');
const { logger } = require('./middleware/logger');
const profile = require('./routes/profile');

const app = express();

app.use(logger);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/profile', profile);

module.exports = app;
