# Decisions log

Deviations from `PLAN.md` and design decisions, newest last.

## M1 — Repo scaffold

### D1. Minimum Node is 20.19.0, not just "Node 20+"
ESLint 10.12.0 declares `engines.node: ^20.19.0 || ^22.13.0 || >=24`, so `package.json` sets
`engines.node` to `>=20.19.0`.

### D2. TypeScript pinned to 6.0.3, not the latest (7.0.2)
`typescript-eslint` 8.71.1 declares a peer range of `typescript >=4.8.4 <6.1.0`. 6.0.3 is the newest
release inside that range. Revisit when typescript-eslint supports TypeScript 7.

### D3. Vitest pinned to 4.1.11, not the latest (5.0.3)
Vitest 5 requires Node `^22.12.0 || ^24 || >=26`, which would drop the Node 20 support the plan
asks for. Vitest 4.1.11 supports `^20 || ^22 || >=24`.

### D4. The package is publishable to npm, so the `fm` binary is compiled JavaScript
Requested by the repo owner during M1. Node does not strip types from files under `node_modules`,
so a published `bin` cannot point at `cli.ts`. Consequences:

- `npm run build` compiles `engine/` and `adapters/` to `dist/` (`tsconfig.build.json`); `bin.fm`
  points at `dist/engine/cli.js`. `prepack` runs the build, so `npm pack` / `npm publish` always
  ship a fresh `dist/`. `dist/` is not committed.
- During development the CLI runs from source with `npm run fm -- <command>` (via `tsx`).
- Source imports use `.ts` extensions; the build rewrites them to `.js`
  (`rewriteRelativeImportExtensions`).
- `files` whitelists `dist/`, `SKILL.md`, `schemas/` and `packs/`. Engine code that loads schemas
  or packs at runtime must resolve them from the package root, not relative to the source file,
  because the compiled file lives in `dist/engine/` rather than `skills/framework-migration/engine/`.
- Anything the engine imports at runtime must be in `dependencies`, not `devDependencies`.

### D5. CI workflow deferred to M7
`.github/workflows/evals.yml` is listed in the target layout but is a M7 deliverable; it is not
scaffolded in M1 so that action versions are verified when it is written.

### D6. Install with npm 10 or newer
npm 9.2.0 fails to resolve this dependency tree with an internal error
(`Cannot read properties of null (reading 'edgesOut')`). `package-lock.json` was generated with
npm 11 (`npx npm@11 install`). Lint, typecheck, tests, build and `npm pack` all run fine under
npm 9 once `node_modules` exists.
