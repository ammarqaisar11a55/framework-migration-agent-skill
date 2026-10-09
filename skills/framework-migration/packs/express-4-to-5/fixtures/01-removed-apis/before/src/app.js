const path = require('path');
const express = require('express');
const cache = require('./cache');

const app = express();
const notes = new Map([['1', 'first note']]);

app.get('/', (req, res) => {
  res.send('notes service');
});

app.get('/notes/:id', (req, res) => {
  const note = notes.get(req.param('id'));
  if (!note) {
    return res.send(404);
  }
  res.json({ id: req.param('id'), text: note });
});

app.post('/notes', express.json(), (req, res) => {
  const id = String(notes.size + 1);
  notes.set(id, req.body.text);
  cache.del('note-count');
  res.json({ id }, 201);
});

app.get('/note-count', (req, res) => {
  if (cache.get('note-count') === undefined) cache.set('note-count', notes.size);
  res.json({ count: cache.get('note-count') });
});

app.del('/notes/:id', (req, res) => {
  notes.delete(req.param('id'));
  cache.del('note-count');
  res.send(204);
});

app.get('/old-notes', (req, res) => {
  res.redirect('/notes/1', 301);
});

app.get('/go-back', (req, res) => {
  res.redirect('back');
});

app.get('/readme', (req, res) => {
  res.sendfile(path.join(__dirname, '..', 'files', 'readme.txt'));
});

app.get('/language', (req, res) => {
  res.send(req.acceptsLanguage('en', 'fr') || 'none');
});

module.exports = app;
