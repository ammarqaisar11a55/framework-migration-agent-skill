---
kind: positive
findings:
  - { rule: query-parser-default, file: src/app.js, line: 5 }
  - { rule: route-optional-param, file: src/routes/items.js, line: 15 }
  - { rule: req-param, file: src/routes/items.js, line: 16 }
  - { rule: status-in-send, file: src/routes/items.js, line: 17 }
  - { rule: status-in-send, file: src/routes/items.js, line: 18 }
  - { rule: status-in-send, file: src/routes/items.js, line: 24 }
  - { rule: status-in-send, file: src/routes/items.js, line: 28 }
  - { rule: status-in-send, file: src/routes/items.js, line: 30 }
  - { rule: redirect-arg-order, file: src/routes/legacy.js, line: 7 }
  - { rule: redirect-back, file: src/routes/legacy.js, line: 11 }
manual_items: 0
---
# Expected report — 04-router-modules

Express APIs used inside router modules mounted under prefixes, including `router.param()` and a
template-literal redirect target.

What the migration must do:

- Official codemods in `src/routes/items.js`: `req.param('id')` → `req.params.id`,
  `res.send(404)` / `res.send(204)` → `res.sendStatus(...)`, `res.json(x, 200)` /
  `res.json(x, 201)` → `res.status(...).json(x)`; in `src/routes/legacy.js`: the redirect with a
  status second becomes `res.redirect(301, url)`, and `'back'` is replaced.
- `path-syntax.js`: `router.get('/items/:id?', ...)` → `'/items{/:id}'`.
- `router.param('id', fn)` is still valid and stays.
- `app.set('query parser', 'extended')` is added in `src/app.js` only: routers have no settings.

Manual follow-ups: none.
