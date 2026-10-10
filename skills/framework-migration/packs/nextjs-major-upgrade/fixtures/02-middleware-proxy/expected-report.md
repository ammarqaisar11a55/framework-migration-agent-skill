---
kind: positive
findings:
  - { rule: middleware-convention, file: middleware.ts, line: 4 }
  - { rule: middleware-config-flags, file: next.config.ts, line: 4 }
  - { rule: experimental-turbo, file: next.config.ts, line: 6 }
manual_items: 0
---
# Expected report — 02-middleware-proxy

A TypeScript app whose middleware redirects and guards a page, with a Turbopack setting still under
`experimental.turbo` and `skipMiddlewareUrlNormalize`.

What the migration must do:

- `middleware.ts` → `proxy.ts`, `export function middleware` → `export function proxy`
  (`middleware-to-proxy`, run by the upgrade); `skipMiddlewareUrlNormalize` → `skipProxyUrlNormalize`.
- `experimental.turbo` → top-level `turbopack`: `next-experimental-turbo-to-turbopack` is registered
  for 15.4.2, so the upgrade from 15.5 skips it and the stage runs it.
- next → 16.3.6; the upgrade adds `overrides` for `@types/react` / `@types/react-dom` (19.3.0).
- The app never ran `next lint`, so the stage does not run `next-lint-to-eslint-cli` (run on its own,
  it would set up ESLint).
- `next build` on 16 rewrites `tsconfig.json` (`"jsx": "react-jsx"`, `.next/dev/types` include) and
  `next-env.d.ts`; after/ holds those files as the build leaves them.

The tests check the redirect, the header the interceptor adds, and the session guard.
