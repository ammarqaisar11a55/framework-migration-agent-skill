---
kind: positive
findings:
  - { rule: cjs-require, file: src/app.js, line: 1 }
  - { rule: cjs-require, file: src/app.js, line: 2 }
  - { rule: untyped-express-handler, file: src/app.js, line: 8 }
  - { rule: cjs-exports, file: src/app.js, line: 32 }
  - { rule: cjs-require, file: src/server.js, line: 1 }
  - { rule: cjs-exports, file: src/store.js, line: 10 }
  - { rule: cjs-require, file: test/app.test.js, line: 1 }
  - { rule: cjs-require, file: test/app.test.js, line: 2 }
  - { rule: cjs-require, file: test/app.test.js, line: 3 }
  - { rule: cjs-require, file: test/helpers.js, line: 1 }
  - { rule: cjs-exports, file: test/helpers.js, line: 11 }
manual_items: 0
---
# Expected report — 01-basic-routes

A single Express app with inline route handlers, one named handler and a small in-memory store.

What the migration must do:

- Add `tsconfig.json`, the pinned TypeScript and `@types` packages, and `build` / `typecheck` scripts;
  point `main`, `start` and `test` at the build output.
- Convert every top-level `require` to an import and every `module.exports` to an export.
  `module.exports = app` becomes `export default app`, because both importers (`src/server.js` and
  `test/helpers.js`) are rewritten to default imports in the same pass. `module.exports = { users, nextId }`
  becomes named exports.
- Rename every source and test file to `.ts`.
- Annotate the named handler `health(req, res)`. The inline handlers passed to `app.get` / `app.post`
  are typed by Express from context and must not be touched.
- Turn on `strict` and remove `allowJs`.

Manual follow-ups: none.
