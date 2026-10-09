const express = require('express');

const app = express();

app.use(express.urlencoded());
app.use(express.json());

const accounts = new Map([['ada', { name: 'Ada', role: 'admin' }]]);

// Resolves on the next tick, like a database call.
const lookup = (key) =>
  new Promise((resolve, reject) => {
    setImmediate(() => (accounts.has(key) ? resolve(accounts.get(key)) : reject(new Error(`No account ${key}`))));
  });

app.get('/', (req, res) => {
  res.send('defaults fixture');
});

// ?filter[role]=admin&filter[name]=Ada arrives as a nested object.
app.get('/accounts', (req, res) => {
  const filter = req.query.filter || {};
  const matches = [...accounts.values()].filter((a) => Object.entries(filter).every(([k, v]) => a[k] === v));
  res.json({ filter, matches });
});

// A form with user[name]=...&user[role]=... arrives as a nested object.
app.post('/accounts', (req, res) => {
  const { name, role } = req.body.user;
  accounts.set(name.toLowerCase(), { name, role });
  res.status(201).json({ name, role });
});

app.get('/accounts/:key', async (req, res, next) => {
  try {
    res.json(await lookup(req.params.key));
  } catch (err) {
    next(err);
  }
});

app.use((err, req, res, next) => {
  res.status(404).json({ error: err.message });
});

module.exports = app;
