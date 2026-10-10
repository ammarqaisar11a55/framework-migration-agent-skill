const path = require('path');
const express = require('express');
const cache = require('./cache');

const app = express();
app.set('query parser', 'extended');
const notes = new Map([['1', 'first note']]);

app.get('/', (req, res) => {
  res.send('notes service');
});

app.get('/notes/:id', (req, res) => {
  const note = notes.get(req.params.id);
  if (!note) {
    return res.sendStatus(404);
  }
  res.json({ id: req.params.id, text: note });
});

app.post('/notes', express.json(), (req, res) => {
  const id = String(notes.size + 1);
  notes.set(id, req.body.text);
  cache.del('note-count');
  res.status(201).json({ id });
});

app.get('/note-count', (req, res) => {
  if (cache.get('note-count') === undefined) cache.set('note-count', notes.size);
  res.json({ count: cache.get('note-count') });
});

app.delete('/notes/:id', (req, res) => {
  notes.delete(req.params.id);
  cache.del('note-count');
  res.sendStatus(204);
});

app.get('/old-notes', (req, res) => {
  res.redirect(301, '/notes/1');
});

app.get('/go-back', (req, res) => {
  res.redirect(req.get("Referrer") || "/");
});

app.get('/readme', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'files', 'readme.txt'));
});

app.get('/language', (req, res) => {
  res.send(req.acceptsLanguages('en', 'fr') || 'none');
});

module.exports = app;
