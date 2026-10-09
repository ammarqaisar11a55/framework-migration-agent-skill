const express = require('express');

const router = express.Router();
const items = new Map([
  ['1', { id: '1', name: 'kettle' }],
  ['2', { id: '2', name: 'teapot' }],
]);

// Loads the item for every route with an :id parameter.
router.param('id', (req, res, next, id) => {
  req.item = items.get(id);
  next();
});

router.get('/items/:id?', (req, res) => {
  if (req.param('id') === undefined) return res.json([...items.values()]);
  if (!req.item) return res.send(404);
  res.json(req.item, 200);
});

router.post('/items', (req, res) => {
  const id = String(items.size + 1);
  items.set(id, { id, name: req.body.name });
  res.json(items.get(id), 201);
});

router.delete('/items/:id', (req, res) => {
  if (!req.item) return res.send(404);
  items.delete(req.item.id);
  res.send(204);
});

module.exports = router;
