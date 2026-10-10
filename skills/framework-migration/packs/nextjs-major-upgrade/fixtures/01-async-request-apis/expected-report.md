---
kind: positive
findings:
  - { rule: sync-route-params, file: "app/api/greet/[name]/route.js", line: 3 }
  - { rule: sync-request-api, file: "app/api/greet/[name]/route.js", line: 4 }
  - { rule: sync-route-params, file: "app/blog/[slug]/page.jsx", line: 3 }
  - { rule: sync-route-params, file: "app/blog/[slug]/page.jsx", line: 7 }
  - { rule: sync-request-api, file: "app/blog/[slug]/page.jsx", line: 8 }
  - { rule: sync-request-api, file: "app/blog/[slug]/page.jsx", line: 9 }
manual_items: 0
---
# Expected report — 01-async-request-apis

A JavaScript App Router app on Next.js 15.5 that still reads `params`, `searchParams`, `cookies()` and
`headers()` synchronously, which Next.js 15 allowed temporarily and Next.js 16 removes (in
TypeScript, Next.js 15's own type check already rejects synchronous `params` types).

What the migration must do:

- next 15.5.26 → 16.3.6 (`@next/codemod upgrade`); React is already 19.3.0.
- `@next/codemod upgrade` from 15.5 does not run `next-async-request-api`; the stage runs it, as the
  upgrade guide says: the page, `generateMetadata` and the route handler become `async` and await
  `props.params` / `props.searchParams`, and `cookies()` / `headers()` become `(await cookies())`.
- The `export const instant = false` blocks the 16.3 upgrade inserts into every page and layout are
  removed again by finish-upgrade.js (no `cacheComponents`).

The same tests pass on both versions: the page renders the slug, query, cookie and header, the
metadata title uses the slug, and the route handler answers with params and a header.
