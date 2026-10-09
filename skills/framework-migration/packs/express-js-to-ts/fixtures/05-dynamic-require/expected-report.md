---
kind: negative
findings:
  - { rule: cjs-require, file: src/app.js, line: 1 }
  - { rule: cjs-require, file: src/app.js, line: 2 }
  - { rule: dynamic-require, file: src/app.js, line: 20 }
  - { rule: nested-require, file: src/app.js, line: 26 }
  - { rule: cjs-exports, file: src/app.js, line: 30 }
  - { rule: cjs-require, file: src/plugins/index.js, line: 1 }
  - { rule: cjs-require, file: src/plugins/index.js, line: 2 }
  - { rule: dirname-usage, file: src/plugins/index.js, line: 7 }
  - { rule: dynamic-require, file: src/plugins/index.js, line: 10 }
  - { rule: dirname-usage, file: src/plugins/index.js, line: 10 }
  - { rule: cjs-exports, file: src/plugins/index.js, line: 13 }
  - { rule: cjs-exports, file: src/plugins/reverse.js, line: 1 }
  - { rule: cjs-exports, file: src/plugins/shout.js, line: 1 }
  - { rule: cjs-require, file: src/server.js, line: 1 }
  - { rule: cjs-require, file: test/app.test.js, line: 1 }
  - { rule: cjs-require, file: test/app.test.js, line: 2 }
  - { rule: cjs-require, file: test/app.test.js, line: 3 }
  - { rule: cjs-require, file: test/helpers.js, line: 1 }
  - { rule: cjs-exports, file: test/helpers.js, line: 11 }
must_remain:
  - { file: src/plugins/index.ts, contains: "require(path.join(__dirname, file))" }
  - { file: src/app.ts, contains: "require(`./plugins/${req.params.plugin}`)" }
  - { file: src/app.ts, contains: "const util = require('util');" }
manual_items: 5
---
# Expected report — 05-dynamic-require (negative)

A plugin directory whose modules are loaded with computed `require()` calls, plus a lazy `require`
inside a request handler. None of these can be converted safely; all must be flagged and left alone.

What the migration must leave unchanged:

- `require(path.join(__dirname, file))` in `src/plugins/index.js` — flagged `dynamic-require`.
- ``require(`./plugins/${req.params.plugin}`)`` in `src/app.js` — flagged `dynamic-require`.
- `const util = require('util')` inside the `/debug` handler — flagged `nested-require`. Hoisting it
  to an import would change when the module is loaded.
- The export shape of `src/plugins/reverse.js` and `src/plugins/shout.js`. Nothing imports them
  statically, so they are converted to `export =` rather than `export default`: the dynamic loader
  reads `.name` and `.apply` straight off `module.exports`.

Both uses of `__dirname` are flagged `dirname-usage` for review, because after the build the code
runs from `dist/`. Here they keep working: the plugins are compiled into the same output directory.

Everything else (top-level requires, the named exports of `src/plugins/index.js`, the rename to `.ts`,
strict mode) is migrated as usual, and all tests must still pass.

Manual follow-ups: 5 (2 × `dynamic-require`, 1 × `nested-require`, 2 × `dirname-usage`).
