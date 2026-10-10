const express = require('express');
const assets = require('./routes/assets');

const app = express();
const users = { 1: 'Ada', 2: 'Grace' };

app.get('/', (req, res) => {
  res.send('path syntax fixture');
});

// One route for the list and for a single user.
app.get('/users/:id?', (req, res) => {
  if (req.params.id === undefined) return res.json(Object.values(users));
  res.json({ name: users[req.params.id] });
});

// The format suffix is optional: /reports/q1 and /reports/q1.csv.
app.get('/reports/:name.:format?', (req, res) => {
  res.json({ name: req.params.name, format: req.params.format || 'html' });
});

app.use('/assets', assets);

app.all('*', (req, res) => {
  res.status(404).json({ error: `No route for ${req.method} ${req.path}` });
});

module.exports = app;
