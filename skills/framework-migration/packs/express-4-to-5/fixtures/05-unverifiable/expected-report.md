---
kind: negative
findings:
  - { rule: query-parser-default, file: src/app.js, line: 5 }
  - { rule: static-dotfiles, file: src/app.js, line: 8 }
  - { rule: dynamic-route-path, file: src/app.js, line: 15 }
  - { rule: computed-route-method, file: src/app.js, line: 21 }
  - { rule: clear-cookie-options, file: src/app.js, line: 27 }
manual_items: 4
must_remain:
  - { file: src/app.js, contains: "app.use(express.static(path.join(__dirname, '..', 'public')));" }
  - { file: src/app.js, contains: "app.get(config.healthPath, (req, res) => {" }
  - { file: src/app.js, contains: "app[method]('/echo', (req, res) => {" }
  - { file: src/app.js, contains: "res.clearCookie('session', { path: '/', maxAge: 0 });" }
---
# Expected report — 05-unverifiable (negative)

Code whose Express 5 behaviour cannot be checked statically. All of it must be flagged and left as
it is; the tests still pass on Express 5 because the values happen to be compatible.

- `express.static(...)` without `dotfiles` — flagged `static-dotfiles`. The official
  static-dotfiles codemod would add `dotfiles: 'allow'`, which serves dotfiles such as `.env` that
  Express 4 did not serve; the pack does not run it.
- `app.get(config.healthPath, ...)` — flagged `dynamic-route-path`: the path's syntax depends on
  configuration.
- `app[method]('/echo', ...)` — flagged `computed-route-method`: no codemod sees these calls.
- `res.clearCookie('session', { path: '/', maxAge: 0 })` — flagged `clear-cookie-options`:
  Express 5 ignores `maxAge`; the cookie is still cleared.

`app.set('query parser', 'extended')` is still added and `express` is still upgraded.
Manual follow-ups: 4.
