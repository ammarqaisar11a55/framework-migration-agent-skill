import express from 'express';
import { loadPlugins } from './plugins';

const app = express();
const plugins = loadPlugins();

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/plugins', (req, res) => {
  res.json(plugins.map((plugin) => plugin.name));
});

app.get('/apply/:plugin/:text', (req, res) => {
  if (!plugins.some((plugin) => plugin.name === req.params.plugin)) {
    return res.status(404).json({ error: 'Unknown plugin' });
  }
  // The plugin is chosen by the request, so its path is only known at runtime.
  const plugin = require(`./plugins/${req.params.plugin}`);
  res.json({ result: plugin.apply(req.params.text) });
});

app.get('/debug', (req, res) => {
  // Loaded lazily so the inspector is only paid for when it is asked for.
  const util = require('util');
  res.type('text').send(util.inspect(plugins.map((plugin) => plugin.name)));
});

export default app;
