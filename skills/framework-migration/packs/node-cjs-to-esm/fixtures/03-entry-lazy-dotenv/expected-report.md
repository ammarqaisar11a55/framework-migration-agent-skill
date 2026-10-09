---
kind: positive
findings:
  - { rule: cjs-require, file: bin/greet.js, line: 2 }
  - { rule: cjs-require, file: bin/greet.js, line: 3 }
  - { rule: require-main, file: bin/greet.js, line: 10 }
  - { rule: cjs-exports, file: bin/greet.js, line: 14 }
  - { rule: cjs-exports, file: src/decorate.js, line: 1 }
  - { rule: cjs-exports, file: src/format.js, line: 1 }
  - { rule: cjs-require, file: src/greeter.js, line: 1 }
  - { rule: cjs-require, file: src/greeter.js, line: 2 }
  - { rule: nested-require, file: src/greeter.js, line: 10 }
  - { rule: cjs-exports, file: src/greeter.js, line: 14 }
  - { rule: cjs-exports, file: src/settings.js, line: 2 }
  - { rule: cjs-require, file: test/greet.test.js, line: 1 }
  - { rule: cjs-require, file: test/greet.test.js, line: 2 }
  - { rule: cjs-require, file: test/greet.test.js, line: 3 }
  - { rule: cjs-require, file: test/greet.test.js, line: 4 }
  - { rule: cjs-require, file: test/greet.test.js, line: 5 }
  - { rule: cjs-require, file: test/greet.test.js, line: 6 }
  - { rule: nested-require, file: test/greet.test.js, line: 21 }
  - { rule: dirname-filename, file: test/greet.test.js, line: 22 }
manual_items: 3
---
# Expected report — 03-entry-lazy-dotenv

A CLI entry point that checks `require.main === module`, a lazily required module, and a dotenv set-up
that must run before the settings module reads the environment.

What the migration must do:

- `bin/greet.js` uses `require.main`, which ES modules do not have on Node.js 20: it stays CommonJS
  as `bin/greet.cjs`, and `bin` and `scripts.start` in package.json follow the rename.
- `src/format.js` exports a single value and is still required by `bin/greet.cjs`: it stays CommonJS
  as `src/format.cjs`. `src/greeter.js` has named exports, so `require()` of it as an ES module gives
  the same shape: it converts.
- `require('dotenv').config()` → `import 'dotenv/config'`, in place, so the environment is loaded
  before `./settings.js` evaluates.
- The lazy `require('./decorate')` inside `greetLong` stays a `require()` call, backed by
  `createRequire(import.meta.url)`, so it still loads on demand. `decorate` has named exports and
  converts.
- In the test, `require('../package.json')` inside a test stays lazy the same way, and reads the
  renamed `bin` entry.

Manual follow-ups: 3 — `require-main` (kept CommonJS) and the two lazy `nested-require` calls.
