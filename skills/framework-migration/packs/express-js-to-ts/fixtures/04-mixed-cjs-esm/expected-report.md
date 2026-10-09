---
kind: positive
findings:
  - { rule: cjs-require, file: src/app.js, line: 1 }
  - { rule: cjs-require, file: src/app.js, line: 2 }
  - { rule: cjs-exports, file: src/app.js, line: 25 }
  - { rule: cjs-exports, file: src/config.js, line: 1 }
  - { rule: cjs-require, file: src/server.js, line: 1 }
  - { rule: cjs-require, file: test/app.test.js, line: 1 }
  - { rule: cjs-require, file: test/app.test.js, line: 2 }
  - { rule: cjs-require, file: test/app.test.js, line: 3 }
  - { rule: cjs-require, file: test/helpers.js, line: 1 }
  - { rule: cjs-exports, file: test/helpers.js, line: 11 }
manual_items: 0
---
# Expected report — 04-mixed-cjs-esm

A CommonJS app that loads ES modules (`.mjs`) with `import()`, where one of those ES modules imports
a CommonJS module back.

What the migration must do:

- Rename `.mjs` files to `.mts` and leave their import specifiers alone (`./version.mjs` keeps
  resolving, because TypeScript maps it to `version.mts`).
- Keep the `import('./lib/greet.mjs')` calls as real dynamic imports (`module: node16`).
- Convert `src/config.js` to `export =`, **not** `export default`: `greet.mjs` imports it as an ES
  module default import, which receives `module.exports`. A default export would hand it
  `{ default: ... }` instead and change behaviour. Its CommonJS consumer therefore becomes
  `import config = require('./config')`.
- Convert `src/app.js` to `export default`, since its importers are all rewritten CommonJS files.

Manual follow-ups: none.
