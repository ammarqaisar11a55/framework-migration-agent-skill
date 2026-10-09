---
kind: positive
findings:
  - { rule: use-strict, file: src/index.js, line: 1 }
  - { rule: cjs-require, file: src/index.js, line: 3 }
  - { rule: cjs-require, file: src/index.js, line: 4 }
  - { rule: cjs-require, file: src/index.js, line: 5 }
  - { rule: cjs-require, file: src/index.js, line: 6 }
  - { rule: cjs-exports, file: src/index.js, line: 8 }
  - { rule: use-strict, file: src/slugify.js, line: 1 }
  - { rule: cjs-require, file: src/slugify.js, line: 3 }
  - { rule: cjs-exports, file: src/slugify.js, line: 6 }
  - { rule: cjs-require, file: src/templates.js, line: 1 }
  - { rule: cjs-require, file: src/templates.js, line: 2 }
  - { rule: dirname-filename, file: src/templates.js, line: 4 }
  - { rule: cjs-exports, file: src/templates.js, line: 12 }
  - { rule: use-strict, file: src/text.js, line: 1 }
  - { rule: cjs-exports, file: src/text.js, line: 3 }
  - { rule: cjs-exports, file: src/text.js, line: 5 }
  - { rule: cjs-require, file: test/lib.test.js, line: 1 }
  - { rule: cjs-require, file: test/lib.test.js, line: 2 }
  - { rule: cjs-require, file: test/lib.test.js, line: 3 }
  - { rule: cjs-require, file: test/lib.test.js, line: 4 }
manual_items: 0
---
# Expected report — 01-library

A small library: a default-exported function, named `exports.x` helpers, a JSON file, and a module
that reads templates next to itself with `__dirname`.

What the migration must do:

- Stage `engines`: add `engines.node: ">=20.19.0"`.
- Stage `esm`: add `"type": "module"`; drop `'use strict'`; `module.exports = function slugify`
  → `export default function slugify`; `exports.titleCase = ...` → `export const titleCase`;
  `module.exports = { ... }` of local names → `export { ... }`.
- Importers follow each module's shape: `const { titleCase } = require('./text')` →
  `import { titleCase } from './text.js'`; `require('../src')` → `import * as lib from
  '../src/index.js'` (explicit file name); JSON → `import defaults from './defaults.json' with
  { type: 'json' }`; destructuring JSON keeps a separate `const { separator } = ...`.
- `__dirname` → `import.meta.dirname`.

Every file converts. Manual follow-ups: none.
