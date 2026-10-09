---
kind: positive
findings:
  - { rule: query-parser-default, file: src/app.js, line: 4 }
  - { rule: route-optional-param, file: src/app.js, line: 12 }
  - { rule: route-optional-param, file: src/app.js, line: 18 }
  - { rule: route-unnamed-wildcard, file: src/app.js, line: 24 }
  - { rule: route-unnamed-wildcard, file: src/routes/assets.js, line: 11 }
manual_items: 0
---
# Expected report — 02-path-syntax

Routes that use Express 4 path syntax Express 5 rejects, across the app and a router module.

What the migration must do (stage `upgrade`, `path-syntax.js`):

- `'/users/:id?'` → `'/users{/:id}'`: `/users`, `/users/` and `/users/2` still match.
- `'/reports/:name.:format?'` → `'/reports/:name{.:format}'`.
- `router.get('/*', ...)` → `'/{*splat}'` and `app.all('*', ...)` → `'/{*splat}'`. No file reads
  `req.params` by index, so renaming the wildcard is safe; the handlers use `req.path`.
- `router.get('/', ...)` and the other literal paths stay as they are.

Matching was checked against Express 4.22.3 and 5.3.0 for each rewrite (see
`references/path-syntax.md`). Manual follow-ups: none.
