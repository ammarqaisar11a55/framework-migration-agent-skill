const express = require('express');
const items = require('./routes/items');
const legacy = require('./routes/legacy');

const app = express();
app.set('query parser', 'extended');

app.use(express.json());

app.get('/', (req, res) => {
  res.send('router modules fixture');
});

app.use('/api/v1', items);
app.use('/legacy', legacy);

module.exports = app;
