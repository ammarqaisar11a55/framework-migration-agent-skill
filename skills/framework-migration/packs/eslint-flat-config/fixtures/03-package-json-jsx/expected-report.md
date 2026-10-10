---
kind: positive
findings:
  - { rule: cli-ext, file: package.json, line: 6 }
  - { rule: package-json-config, file: package.json, line: 9 }
manual_items: 0
---
# Expected report — 03-package-json-jsx

The configuration lives in package.json (`eslintConfig`), and the lint script uses
`--ext .js,.jsx`.

What the migration must do:

- Hand the `eslintConfig` object to the migrator as a file, then remove the key from package.json.
- `eslint --ext .js,.jsx src` → `eslint src`, plus `{ files: ["**/*.jsx"] }` at the start of the
  config array, so `.jsx` files are still linted. The fixture's test runs the lint script with
  `--format json` and checks that `src/view.jsx` is in the results.
- Keep `parserOptions.ecmaFeatures.jsx` (under `languageOptions`).

Manual follow-ups: none.
