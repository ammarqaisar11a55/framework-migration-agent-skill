# Known pitfalls

**React 19 first.** `@next/codemod upgrade` 16.3 moves React 18 to 19 on its own and then runs the React
19 codemods from the Codemod registry at `latest` (unpinned, and they need network access to the
registry). The stage stops on React 18: run the `react-major-upgrade` pack, commit, then this one.
(Next.js 16 itself still accepts React 18.2 for the Pages Router.)

**The upgrade skips codemods for versions you already passed.** It runs only the codemods registered
after the installed version, so an app on 15.5 would keep synchronous Request APIs,
`experimental.turbo` and `next lint`, all of which 16 removes. The stage runs those codemods itself
(`next-lint-to-eslint-cli` only when a script uses `next lint`).

**Synchronous access the codemod cannot rewrite.** `next-async-request-api` leaves
`@next-codemod-error` comments, or `UnsafeUnwrapped` casts, where it cannot make a call site async
(a synchronous Client Component, a helper called from many places). Rule `codemod-error-comment`
lists them; use `await` or React's `use()` by hand.

**Edge middleware stays middleware.** Proxy runs on Node.js only. A middleware file that sets the edge
runtime is restored after the codemod renames it; it keeps working with a deprecation warning.
Middleware without an explicit runtime ran on the edge by default in 15 and becomes a Node.js proxy;
that is the guide's intended path, but check code that depends on edge-only behaviour.

**The adoption codemod's `instant = false` blocks are removed.** The 16.3 upgrade inserts
`export const instant = false` and a TODO into every page, layout and default file to prepare Cache
Components. `instant` does nothing without `cacheComponents`, and the guide says not to enable Cache
Components just to upgrade, so finish-upgrade.js removes those exact blocks unless next.config enables
`cacheComponents`.

**`eslint .` lints more than `next lint` did.** `next lint` covered `eslint.dirs` (default `app`,
`pages`, `components`, `lib`, `src`); the ESLint CLI script the codemod writes covers the whole
project. Tests, scripts and generated files may start failing lint. The `eslint` key in next.config is
no longer read.

**`next build` rewrites TypeScript config.** Next.js 16 sets `"jsx": "react-jsx"` and adds
`.next/dev/types/**/*.ts` to `tsconfig.json`, and changes `next-env.d.ts`. Commit those with the stage.

**Not detected statically.** Parallel route slots without `default.js` (builds fail), local images
with query strings (`images.localPatterns`), the new `next/image` defaults (`minimumCacheTTL`,
`imageSizes`, `qualities: [75]`), local IP image restriction, and `revalidateTag` call sites with a
computed single argument. Read the image section of the guide if the app relies on `next/image`
quality or caching behaviour.

**Pinned versions.** The tool picks React, its types and ESLint as the newest versions matching the
peer ranges on the day it runs; finish-upgrade.js pins each to the version in `pack.yaml`.
