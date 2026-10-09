# Known pitfalls

## When the stage refuses to run

`official-migrate.mjs` stops (the stage fails, nothing is changed) in two cases where
`@eslint/migrate-config` cannot produce an equivalent configuration:

- **Nested `.eslintrc*` files.** eslintrc cascades: a file in `test/` adds to the root configuration
  for that directory. Flat config has one file at the root. Merge each nested file into the root
  configuration as an `overrides` entry (`files: ["test/**"]`), delete it, and run the stage again.
- **A JavaScript configuration with logic** (rule `js-config-logic`): `require()`, `process.env`,
  conditions, functions or spreads. The migrator loads the file and writes out the evaluated result,
  so the logic would be lost — the configuration would be frozen as it evaluated on this machine.
  Write `eslint.config.mjs` by hand (keeping the logic), or reduce the old file to literal data first.

## What changes on purpose

- **ESLint 8 → 9.** eslintrc stopped being the default in ESLint 9, which is why the migration is
  needed. ESLint 9 needs Node.js 18.18, 20.9 or 21.1 and newer; `@eslint/compat` 2 (used when
  `.gitignore` is included) needs Node.js 20.19+.
- **`.mjs` files are linted.** eslintrc linted only `.js` by default (more with `--ext`); flat config
  lints `.js`, `.mjs` and `.cjs`. When the migrator sets `sourceType: "commonjs"` (it does for the
  `node` environment), the pack adds `{ files: ["**/*.mjs"], languageOptions: { sourceType: "module" } }`
  so that ES module files — including `eslint.config.mjs` itself — parse. They are now linted with the
  same rules; fix or ignore what that reports.
- **`--ext`** is removed from scripts; extensions other than `.js`, `.mjs`, `.cjs` become a `files`
  entry at the start of the configuration, as the migrator's README describes.
- **`eslint-env` comments** become `/* global ... -- eslint-env ... */` with only the globals the file
  reads; a comment whose environment the file does not use is removed.

## What to check after the stage

- **Dotfiles are linted.** Flat config no longer ignores files and directories starting with a dot.
  Add `"**/.*"` to the ignores if the project relied on that.
- **Ignore patterns.** The migrator rewrites `.eslintignore` patterns for flat config's semantics
  (`temp.js` → `**/temp.js`). Read the generated `globalIgnores([...])`.
- **FlatCompat** (rule `compat-bridge`): shareable configs and plugins written for eslintrc are loaded
  through `@eslint/eslintrc`'s `FlatCompat`. That works, but when a plugin or config ships a flat
  config, importing it directly is simpler and removes the dependency. `eslint:recommended` is also
  routed through FlatCompat by the migrator; `js.configs.recommended` from `@eslint/js` is the native
  equivalent.
- **Comments** in a JavaScript configuration are dropped by the migrator.
- **Editor integration** (the VS Code ESLint extension) must be on a version that understands flat
  config.

## Flags with no mechanical replacement

`--env` (rule `cli-env`): add the globals to the configuration. `--rulesdir` /
`--resolve-plugins-relative-to` (rule `cli-rulesdir`): load local rules as an inline plugin; plugins
now resolve relative to the configuration file.

## Tests for a lint configuration

A lint gate alone cannot tell a correct configuration from one that ignores everything. The fixtures
lint known-bad samples through the ESLint API (`new ESLint({ ignore: false }).lintFiles(...)`) and
assert the rule ids reported — the same test runs on ESLint 8 before and ESLint 9 after. Projects
without such tests should run `eslint --print-config <file>` on a few files before and after the
migration and compare.
