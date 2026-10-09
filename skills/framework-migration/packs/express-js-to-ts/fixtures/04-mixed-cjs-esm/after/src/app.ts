import express from 'express';
import config = require('./config');

const app = express();

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/greeting', (req, res) => {
  res.json({ greeting: config.greeting });
});

// greet.mjs is an ES module, so this CommonJS file has to load it with import().
app.get('/greet/:name', async (req, res) => {
  const { greet, version } = await import('./lib/greet.mjs');
  res.json({ message: greet(req.params.name), version });
});

app.get('/greet', async (req, res) => {
  const { greet } = await import('./lib/greet.mjs');
  res.json({ message: greet() });
});

export default app;
