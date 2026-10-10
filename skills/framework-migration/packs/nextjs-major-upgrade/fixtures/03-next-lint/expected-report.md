---
kind: positive
findings:
  - { rule: next-config-eslint, file: next.config.mjs, line: 3 }
  - { rule: images-domains, file: next.config.mjs, line: 7 }
  - { rule: next-lint, file: package.json, line: 10 }
manual_items: 2
---
# Expected report — 03-next-lint

An app linted with `next lint` (create-next-app 15's `FlatCompat` config), with `eslint.dirs` and
`images.domains` in `next.config.mjs`.

What the migration must do:

- `"lint": "next lint"` → `"lint": "eslint ."`, and the config imports
  `eslint-config-next/core-web-vitals` directly instead of going through `FlatCompat`
  (`next-lint-to-eslint-cli`, run by the stage because the upgrade from 15.5 skips it);
  `@eslint/eslintrc` is removed; eslint-config-next → 16.3.6.
- next → 16.3.6. `npm run lint` passes after.

Manual follow-ups (2):

- `next-config-eslint`: Next.js 16 ignores the `eslint` key and warns. `next lint` linted only
  `eslint.dirs` (app, lib); `eslint .` lints the whole project (the tests too), so decide the scope
  and remove the key.
- `images-domains`: deprecated (a build warning); replace it with `images.remotePatterns`. The tests
  check that the optimiser still accepts the listed host and rejects others.
