---
kind: positive
findings:
  - { rule: cjs-exports, file: .eslintrc.js, line: 1 }
  - { rule: cjs-exports, file: src/cache.js, line: 2 }
  - { rule: cjs-exports, file: src/config.js, line: 1 }
  - { rule: cjs-require, file: src/schedule.js, line: 1 }
  - { rule: cjs-require, file: src/schedule.js, line: 2 }
  - { rule: cjs-require, file: src/schedule.js, line: 3 }
  - { rule: cjs-require, file: src/schedule.js, line: 4 }
  - { rule: cjs-require, file: src/schedule.js, line: 5 }
  - { rule: cjs-exports, file: src/schedule.js, line: 35 }
  - { rule: cjs-require, file: test/schedule.test.js, line: 1 }
  - { rule: cjs-require, file: test/schedule.test.js, line: 2 }
  - { rule: cjs-require, file: test/schedule.test.js, line: 3 }
  - { rule: cjs-require, file: test/schedule.test.js, line: 4 }
manual_items: 0
---
# Expected report — 02-shapes-and-packages

Exported values of different shapes (an object literal, a class), npm packages, a built-in, and an
ESLint configuration file.

What the migration must do:

- `engines.node` `>=18` → `>=20.19.0`.
- `module.exports = class Cache` → `export default class Cache`; the config object → `export default`.
- `const { timeout, ... } = require('./config')` destructures a single exported value, so it becomes
  a default import plus the same destructuring.
- Packages: `require('ms')` → `import ms from 'ms'` (CommonJS: the default is `module.exports`);
  `const { satisfies } = require('semver')` → default import + destructuring, which does not rely on
  Node's static detection of CommonJS named exports; the built-in `util` gets a named import.
- `.eslintrc.js` is tool configuration loaded with `require()`: it stays CommonJS as
  `.eslintrc.cjs`, which ESLint also reads.

Manual follow-ups: none.
