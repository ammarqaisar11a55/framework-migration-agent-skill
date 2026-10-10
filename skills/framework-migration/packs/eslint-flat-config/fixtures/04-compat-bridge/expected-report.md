---
kind: negative
findings:
  - { rule: eslintrc-file, file: .eslintrc.js, line: 3 }
  - { rule: eslintrc-file, file: .eslintrc.js, line: 4 }
  - { rule: eslintrc-file, file: .eslintrc.js, line: 5 }
  - { rule: eslintrc-file, file: .eslintrc.js, line: 6 }
manual_items: 0
must_remain:
  - { file: eslint.config.js, contains: 'extends: compat.extends("eslint:recommended", "prettier"),' }
---
# Expected report — 04-compat-bridge (negative)

A static `.eslintrc.js` that extends the shareable config `prettier` (eslint-config-prettier).

- The migrator evaluates the JavaScript configuration (it is literal data, so nothing is lost) and,
  because the source is CommonJS, writes a CommonJS `eslint.config.js`.
- `prettier` is loaded through FlatCompat: `compat.extends("eslint:recommended", "prettier")`. That
  works, and the fixture's test proves the prettier config still turns off
  `no-unexpected-multiline`. It is flagged `compat-bridge` for review and left as it is: replacing
  it with `eslint-config-prettier/flat` is a dependency decision, not a mechanical one.

Manual follow-ups after the migration: 1 (`compat-bridge`).
