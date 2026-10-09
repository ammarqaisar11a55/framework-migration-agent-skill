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

## M6 — Pilot pack `express-js-to-ts`

### D7. Pack schema additions: stage `commands` / `post_commands`, `fix_rules`, and `status`
PLAN §4.1 lists stages as bare ids. A stage also needs to say what runs in it, so each stage may
carry `codemods` (files in `codemods/`, run in order), `commands` (run before the codemods: the
official migration tool goes here, per PLAN §5 "official tool first"), `post_commands` (run after
the codemods are applied, e.g. `npm install` after `package.json` changes) and `fix_rules` (the stage
addresses `auto_fixable` findings, PLAN §5 stage 3). A top-level `status` field
(`planned | in progress | shipped`) drives the README pack list (PLAN §11) and selects which packs
the evals run. The evals run stages with commands skipped and install the pack's pinned tools once
in a shared directory instead, so they do not hit the network per fixture.

### D8. The pilot pack has no `lint` check
PLAN §4.1's example lists `lint: "npx eslint ."`. Most Express JavaScript projects have either no
ESLint config or one that cannot parse TypeScript, so a lint gate would fail for reasons unrelated
to the migration, and fixing it is its own migration (`eslint-flat-config`). The check runner
supports `lint`; the pilot just does not declare it. `references/known-pitfalls.md` tells the agent
to run the project's linter by hand and record new warnings in the report.

### D9. The smoke probe passes on any HTTP status below 500
PLAN §4.1 says "plus a health-route probe", but there is no route every app has. The smoke check
starts the app (`checks.smoke.start`, with `PORT` set to a free port), then polls
`checks.smoke.url` until it answers. Any status below 500 counts as booted: a 404 on `/` still
proves the server is up and routing, whereas a crash, a hang or a 5xx does not. A pack or project
can point `url` at a real health route for a stricter probe.

### D10. The strictness stage needs agent help outside Express handlers
`add-handler-types.js` types functions it can recognise as Express middleware (by parameter names
and position) and leaves inline handlers to Express's contextual typing. `strict` turns on
`noImplicitAny`, so any other untyped parameter (`function format(user)`) fails the strictness gate.
Guessing those types mechanically would mean `any` everywhere or wrong types, so the pack does not
try: the gate fails, and SKILL.md tells the agent to type those parameters from their call sites
and re-run the gate. The fixtures only contain code the codemods can type, so the evals measure the
automated part; the real-repo trial (M8) measures the rest.

### D11. Fixture expectations live in YAML frontmatter in `expected-report.md`
PLAN §9 compares `findings.json` against `expected-report.md` but does not say how. Each
`expected-report.md` starts with YAML frontmatter that the evals read, followed by prose for
humans:

```yaml
kind: positive | negative
findings:                 # exact set expected from `fm detect` on before/; 1-based lines
  - { rule: cjs-require, file: src/app.js, line: 1 }
must_remain:              # negative fixtures: verbatim snippets that must survive the migration
  - { file: src/app.ts, contains: "require(`./plugins/${name}`)" }
manual_items: 5           # optional: count of findings with auto_fixable: false
```

Precision and recall are computed over `(rule, file, line)` triples. A fixture passes only when all
stage gates pass, tests match the baseline, findings match exactly, `must_remain` snippets survive
and are still flagged, no `auto_fixable` finding is left, and the migrated tree equals `after/`
byte for byte (ignoring `node_modules`, `.fm` and `dist`).

### D12. Some official docs were verified through their source repositories
`typescriptlang.org`, `expressjs.com` and `devblogs.microsoft.com` were blocked by the network
policy of the build environment. Those pages were checked against their source files in
`microsoft/TypeScript-Website` and `expressjs/expressjs.com`, which the sites are built from.
`official-sources.md` records which path was used for each page.
