const express = require('express');
const { notFound, errorHandler } = require('./errors');

const app = express();

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/teapot', (req, res, next) => {
  next(Object.assign(new Error("I'm a teapot"), { status: 418 }));
});

app.get('/boom', () => {
  throw new Error('secret details');
});

app.get('/async-boom', async (req, res, next) => {
  try {
    await Promise.reject(new Error('async secret'));
  } catch (err) {
    next(err);
  }
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;
