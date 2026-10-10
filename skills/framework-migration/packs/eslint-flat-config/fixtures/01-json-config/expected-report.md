---
kind: positive
findings:
  - { rule: eslintrc-file, file: .eslintrc.json, line: 3 }
  - { rule: eslintrc-file, file: .eslintrc.json, line: 4 }
  - { rule: eslintrc-file, file: .eslintrc.json, line: 5 }
  - { rule: eslintrc-file, file: .eslintrc.json, line: 9 }
  - { rule: eslintrc-file, file: .eslintrc.json, line: 12 }
  - { rule: cli-ext, file: package.json, line: 6 }
manual_items: 0
---
# Expected report — 01-json-config

`.eslintrc.json` with an override for test files, and `.eslintignore`.

What the migration must do:

- `@eslint/migrate-config` writes `eslint.config.mjs`: `eslint:recommended` through FlatCompat, the
  `node` environment as `globals.node`, the override as a config object with
  `files: ["test/**/*.js"]`, and the `.eslintignore` patterns as `globalIgnores([...])`.
- `.eslintrc.json` and `.eslintignore` are removed.
- package.json: `eslint` 8.57.1 → 9.39.5, and `@eslint/js`, `@eslint/eslintrc`, `globals` added at
  the pinned versions; `eslint --ext .js .` → `eslint .` (`.js` is linted by default).

The fixture's own test lints known-bad samples through the ESLint API and checks the reported rule
ids, the test-only override and the ignores, on ESLint 8 before and ESLint 9 after.
Manual follow-ups: none.
