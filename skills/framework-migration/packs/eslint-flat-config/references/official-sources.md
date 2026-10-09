# Official sources

`eslint.org` was not reachable from the environment the pack was written in. The migration guide was
checked against its source in the `eslint/eslint` repository, which the published page is built from.

| Source | URL | Used for | Verified via | Verified |
|---|---|---|---|---|
| ESLint: Configuration Migration Guide | https://eslint.org/docs/latest/use/configure/migration-guide | The whole pack: run `@eslint/migrate-config`; limits for JavaScript configs; ignore files (`.eslintignore` not read, `**/` prefixes, dotfiles no longer ignored); `eslint-env` comments reported as errors (replace with `/* global */` or config globals); CLI flags removed (`--ext`, `--env`, `--ignore-path`, `--no-eslintrc` → `--no-config-lookup`, `--rulesdir`, `--resolve-plugins-relative-to`); `package.json` `eslintConfig` not supported; FlatCompat for eslintrc shareable configs | `eslint/eslint` `docs/src/use/configure/migration-guide.md` | 2026-10-09 |
| `@eslint/migrate-config` README (3.0.3) | https://github.com/eslint/rewrite/tree/main/packages/migrate-config | Command line: `npx @eslint/migrate-config <file>`, `--commonjs`, `--gitignore`, `--target-version`; reads `.eslintignore`; "only capable of migrating the evaluated configuration" for JavaScript files; `--ext` follow-up (`files` entries) | `eslint/rewrite` `packages/migrate-config/README.md`, and running 3.0.3 on each fixture | 2026-10-09 |
| npm registry: `eslint`, `@eslint/js`, `globals`, `@eslint/eslintrc`, `@eslint/compat` | https://www.npmjs.com/package/eslint | Pinned versions: ESLint 9.39.5 (the `maintenance` dist-tag, last 9.x), `@eslint/js` 9.39.5, `globals` 17.13.0, `@eslint/eslintrc` 3.3.7, `@eslint/compat` 2.1.1; ESLint 9 needs Node.js `^18.18.0 \|\| ^20.9.0 \|\| >=21.1.0`, `@eslint/compat` 2 needs `^20.19.0 \|\| ^22.13.0 \|\| >=24` | `npm view` | 2026-10-09 |
| `globals` package | https://github.com/sindresorhus/globals | The environment → global names table used to turn `eslint-env` comments into `/* global */` comments | Installed 17.13.0 | 2026-10-09 |
