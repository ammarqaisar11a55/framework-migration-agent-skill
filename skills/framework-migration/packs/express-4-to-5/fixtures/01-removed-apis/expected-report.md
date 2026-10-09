---
kind: positive
findings:
  - { rule: query-parser-default, file: src/app.js, line: 5 }
  - { rule: req-param, file: src/app.js, line: 13 }
  - { rule: status-in-send, file: src/app.js, line: 15 }
  - { rule: req-param, file: src/app.js, line: 17 }
  - { rule: status-in-send, file: src/app.js, line: 24 }
  - { rule: app-del, file: src/app.js, line: 32 }
  - { rule: req-param, file: src/app.js, line: 33 }
  - { rule: status-in-send, file: src/app.js, line: 35 }
  - { rule: redirect-arg-order, file: src/app.js, line: 39 }
  - { rule: redirect-back, file: src/app.js, line: 43 }
  - { rule: res-sendfile, file: src/app.js, line: 47 }
  - { rule: sendfile-dotfiles, file: src/app.js, line: 47 }
  - { rule: singular-accepts, file: src/app.js, line: 51 }
manual_items: 1
---
# Expected report — 01-removed-apis

A notes service that uses most of the APIs Express 5 removes, plus a cache module whose `del()`
is not Express's.

What the migration must do:

- Stage `api-codemods` (official codemods, still on Express 4): `req.param('id')` →
  `req.params.id`; `res.send(404)` / `res.send(204)` → `res.sendStatus(...)`;
  `res.json(obj, 201)` → `res.status(201).json(obj)`; `res.redirect(url, 301)` →
  `res.redirect(301, url)`; `res.redirect('back')` → `res.redirect(req.get("Referrer") || "/")`;
  `res.sendfile` → `res.sendFile`; `req.acceptsLanguage` → `req.acceptsLanguages`.
  `route-del.js` renames `app.del('/notes/:id', ...)` to `app.delete`.
- Leave `cache.del('note-count')` alone: it is not a route. (The official route-del-to-delete
  codemod would rename it, which is why the pack does not run it.)
- Stage `preserve-defaults`: add `app.set('query parser', 'extended')` after `express()`.
- Stage `upgrade`: `express` becomes `^5.0.0`; no route path needs rewriting.

Manual follow-ups: 1 — `sendfile-dotfiles` (info) on the `res.sendfile` call: the path is fixed and
contains no dot-directory, so nothing changes here, but the agent cannot know that statically.
