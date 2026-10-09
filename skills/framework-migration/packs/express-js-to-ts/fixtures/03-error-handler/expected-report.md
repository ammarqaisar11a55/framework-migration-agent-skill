---
kind: positive
findings:
  - { rule: cjs-require, file: src/app.js, line: 1 }
  - { rule: cjs-require, file: src/app.js, line: 2 }
  - { rule: cjs-exports, file: src/app.js, line: 29 }
  - { rule: untyped-express-handler, file: src/errors.js, line: 1 }
  - { rule: untyped-express-handler, file: src/errors.js, line: 6 }
  - { rule: cjs-exports, file: src/errors.js, line: 11 }
  - { rule: cjs-require, file: src/server.js, line: 1 }
  - { rule: cjs-require, file: test/app.test.js, line: 1 }
  - { rule: cjs-require, file: test/app.test.js, line: 2 }
  - { rule: cjs-require, file: test/app.test.js, line: 3 }
  - { rule: cjs-require, file: test/helpers.js, line: 1 }
  - { rule: cjs-exports, file: test/helpers.js, line: 11 }
manual_items: 0
---
# Expected report — 03-error-handler

A 404 handler and a four-argument error handler, with errors raised synchronously, passed to
`next()`, and passed to `next()` from an async handler.

What the migration must do:

- Annotate `notFound(req, res, next)` and `errorHandler(err, req, res, next)`. `err` becomes `any`,
  which is its type in Express's own `ErrorRequestHandler`.
- Keep all four parameters of the error handler, including the unused `next`: Express recognises
  error handlers by their arity.
- Leave the inline handlers, including the zero-argument and async ones, untouched.

Manual follow-ups: none.
