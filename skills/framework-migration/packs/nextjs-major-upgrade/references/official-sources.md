# Official sources

`nextjs.org` was not reachable from the environment the pack was written in. The guides were checked
against their source in `vercel/next.js` (commit `5b370524`, branch `canary`), which the published
pages are built from; the tools against their npm packages.

| Source | URL | Used for | Verified via | Verified |
|---|---|---|---|---|
| Next.js 16 upgrade guide | https://nextjs.org/docs/app/guides/upgrading/version-16 | `npx @next/codemod upgrade`; what it migrates (turbopack config, `next lint` → ESLint CLI, middleware → proxy, `unstable_` prefixes, `experimental_ppr`); "does not run every migration codemod" — run `next-async-request-api` for apps on 15; Node.js 20.9+, TypeScript 5.1+; synchronous Request APIs removed; edge runtime not supported in proxy, keep middleware for edge; `revalidateTag` second argument; `next/image` defaults; `images.domains` deprecated; parallel routes need `default.js`; removals (AMP, `next lint`, `eslint` config option, runtime config, `devIndicators` options); migration checklist | `vercel/next.js` `docs/01-app/02-guides/upgrading/version-16.mdx` | 2026-10-10 |
| `instant` route segment config | https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config/instant | "The `instant` export only works when `cacheComponents` is enabled" (why finish-upgrade.js removes the blocks the adoption codemod inserts) | `docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/instant.mdx` | 2026-10-10 |
| `@next/codemod` 16.3.6 | https://www.npmjs.com/package/@next/codemod | `upgrade [revision] --yes` (non-interactive defaults: upgrade React, run all codemods); codemods registered per version (`lib/utils.js`); `middleware-to-proxy` drops the runtime config; React 18 → 19 runs `codemod@latest` and `types-react-codemod@latest`; `--skip-react-upgrade` / `--skip-adoption` exist only from 16.4 | `bin/upgrade.js`, `bin/next-codemod.js`, `lib/utils.js`, `transforms/*.js` of the npm package; runs on the fixtures | 2026-10-10 |
| `next` 16.3.6 | https://www.npmjs.com/package/next | Peer ranges (`react ^18.2.0 \|\| ^19.0.0`), `engines.node >=20.9.0`; build warnings for `eslint` and `images.domains`; `next build` rewriting `tsconfig.json` and `next-env.d.ts` | `npm view`; builds of the fixtures | 2026-10-10 |
