---
kind: positive
findings:
  - { rule: cjs-require, file: src/app.js, line: 1 }
  - { rule: cjs-require, file: src/app.js, line: 2 }
  - { rule: cjs-require, file: src/app.js, line: 3 }
  - { rule: cjs-exports, file: src/app.js, line: 15 }
  - { rule: cjs-exports, file: src/middleware/auth.js, line: 3 }
  - { rule: untyped-express-handler, file: src/middleware/auth.js, line: 3 }
  - { rule: cjs-exports, file: src/middleware/auth.js, line: 12 }
  - { rule: untyped-express-handler, file: src/middleware/auth.js, line: 12 }
  - { rule: untyped-express-handler, file: src/middleware/logger.js, line: 3 }
  - { rule: cjs-exports, file: src/middleware/logger.js, line: 9 }
  - { rule: cjs-require, file: src/routes/profile.js, line: 1 }
  - { rule: cjs-require, file: src/routes/profile.js, line: 2 }
  - { rule: cjs-exports, file: src/routes/profile.js, line: 10 }
  - { rule: cjs-require, file: src/server.js, line: 1 }
  - { rule: cjs-require, file: test/app.test.js, line: 1 }
  - { rule: cjs-require, file: test/app.test.js, line: 2 }
  - { rule: cjs-require, file: test/app.test.js, line: 3 }
  - { rule: cjs-require, file: test/helpers.js, line: 1 }
  - { rule: cjs-exports, file: test/helpers.js, line: 11 }
manual_items: 0
---
# Expected report — 02-middleware-chain

Middleware defined in separate modules and chained on a router: a counting logger, an API-key check
and a user loader that pass data along with `res.locals`.

What the migration must do:

- Annotate all three middleware functions, in each of the forms they are written in: a function
  declaration (`logger`), an arrow function assigned to `exports.requireApiKey`, and a function
  expression assigned to `exports.loadUser`.
- Convert `exports.name = ...` to `export const name = ...`, and import that module as a namespace
  (`import * as auth`) because its consumer uses it as `auth.requireApiKey`.
- Convert `const { Router } = require('express')` to a named import.
- Leave the inline final handler in `router.get(...)` untouched.

Manual follow-ups: none.
