---
kind: positive
findings:
  - { rule: eslintrc-file, file: .eslintrc.yml, line: 2 }
  - { rule: eslintrc-file, file: .eslintrc.yml, line: 5 }
  - { rule: eslintrc-file, file: .eslintrc.yml, line: 6 }
  - { rule: eslintrc-file, file: .eslintrc.yml, line: 8 }
  - { rule: cli-ignore-path, file: package.json, line: 6 }
  - { rule: eslint-env-comment, file: src/client.js, line: 1 }
manual_items: 0
---
# Expected report — 02-yaml-gitignore-env

`.eslintrc.yml`, a lint script with `--ignore-path .gitignore`, and a browser file marked with
`/* eslint-env browser */`.

What the migration must do:

- Run the migrator with `--gitignore`, so `eslint.config.mjs` includes `.gitignore` through
  `includeIgnoreFile` (`@eslint/compat`), and drop `--ignore-path .gitignore` from the script.
- `/* eslint-env browser */` → `/* global document -- eslint-env browser */`: flat config reports
  eslint-env comments as errors, and `document` is the only browser global the file reads
  (`addEventListener` there is a property, not a global).
- The migrator sets `sourceType: "commonjs"` for every file; flat config also lints `.mjs` files
  (eslintrc did not by default), so an entry parses `**/*.mjs` as modules — otherwise the new
  `eslint.config.mjs` would not parse.

Manual follow-ups: none.
