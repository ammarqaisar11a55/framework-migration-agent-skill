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

## M7 — SKILL.md, evals and CI

### D13. CI pins actions by commit SHA
`.github/workflows/evals.yml` uses `actions/checkout` v7.0.1 and `actions/setup-node` v7.1.0, the
newest tags on 2026-10-09 (both run on `node24`), pinned to their commit SHAs with the tag in a
comment. Lint, typecheck, unit tests and the build run on Node 20 and 22; the evals run once on
Node 22, and the job fails if the regenerated `evals/scorecard.md` differs from the committed one.

### D14. The skill calls the engine through npx
An installed skill directory contains the engine's TypeScript source but no dependencies, so
SKILL.md runs the published CLI with `npx -p framework-migration-agent-skill fm`, or
`npm run fm --` from a checkout of this repository.

## M8 — Real-repo trial

### D15. Trial: `w3cj/express-api-starter` at commit `1660e47`
The current head of that repository has moved to Express 5 and ES modules, outside the pilot's
`from`; `1660e47` (2024-10-10) is its last Express 4 / CommonJS version: 8 source files,
helmet, morgan, cors, dotenv, Jest + supertest, 4 tests. It was cloned into a temporary directory
and not committed. The skill was run as SKILL.md describes, with dry-runs before every apply and a
commit per stage.

Outcome: all five stages passed their gates (type-check, 4/4 tests, smoke boot) and
`MIGRATION_REPORT.md` was complete, with rollback commits for every stage and one manual item
(`require('dotenv').config()`, left in place). No unhandled engine error. The first run stopped at
the stage 2 gate, as it should have; the fixes below came from it.

Agent work the codemods did not do, as SKILL.md allows: `@types/jest` (prompted by a tooling-stage
note), and `@types/morgan`, `@types/cors` and `@types/supertest` when the strictness gate failed
with TS7016, each at the major version of the installed package.

### D16. Lessons and fixes from the trial
1. **Tool config files were reported as auto-fixable.** `detect` flagged `module.exports` in
   `.eslintrc.js`, which the codemods deliberately skip, so the finding could never be fixed.
   Rule files now take an `exclude` list of path regexes (top level, or per rule), validated by
   `fm validate-pack`; the pilot excludes dotfiles and `*.config.*`, matching `codemods/shared.js`.
2. **Packages with their own ES-style types broke the type-check.** `cjs-to-esm.js` imported every
   package except `express` with `import x = require()`. helmet 8 declares `export { helmet as
   default }`, so the result was "not callable". The codemod now reads the declaration file
   TypeScript would use (own types, else `@types/*`, looked up through `node_modules` like Node)
   and follows it; untyped packages keep `import x = require()`. To allow this, codemods receive
   the absolute project `root` in their context.
3. **A bare `jest` test script cannot run TypeScript tests.** The tooling stage now points a bare
   `jest` / `mocha` (no runner config) at the build output, as it already did for scripts that
   name files, and notes which `@types` package the runner's globals need. A configured runner is
   left to the agent, with a note.
4. **Type-only dependencies.** SKILL.md said not to add dependencies; a strict type-check of a
   real project cannot pass without `@types/*` for untyped packages. The rule now allows exact
   `@types/*` devDependencies at the described package's major version, listed in the report.
5. **Smaller:** the `nested-require` hint now covers a call on a top-level `require()`, and the
   tooling stage notes scripts such as `dev` that now run the build output.

Unit tests for 1–3 and the `dotenv` case are in `engine/detect.test.ts`, `engine/pack.test.ts` and
`evals/packs/express-js-to-ts.test.ts`. The pilot's evals are unchanged at 100%.

## M9 — `express-4-to-5`

### D17. The official codemods run from source at a pinned commit
The migration guide runs `npx codemod@latest @expressjs/v5-migration-recipe`. Through the registry,
the recipe resolves each codemod it references to its latest version at run time, so nothing is
pinned, and the registry (`app.codemod.com`) was not reachable from the build environment.
`codemods/official-recipe.mjs` uses the repository README's "from source" route instead: it fetches
`expressjs/codemod` at the commit pinned in `pack.yaml` into a cache, expands the recipe's registry
references into the local codemods they name, and runs the result with the pinned `codemod` CLI
(1.18.3). It splits the recipe in two: the API codemods (stage `api-codemods`) and the recipe's
`package.json` step (stage `upgrade`).

Engine changes this needed: stage commands may use `{pack_dir}`, and a tool may carry `source` (a
repository URL) and `ref` (a full commit SHA) for tools run from source.

### D18. The runner diffs a scratch copy, because the CLI's dry run prints no diff
`codemod workflow run --dry-run` reports which steps ran but no changes. PLAN §6 requires a diff
before apply, so the runner always runs the codemods on a committed scratch copy of the project,
prints `git diff`, and copies changed files back only without `--dry-run`. The engine stores that
output in `.fm/diffs/stage-N/`.

### D19. Three official codemods are not run; one official step runs only when needed
Deviations from the official tool, each because it would change behaviour (PLAN §0.5, §6):

- `static-dotfiles` and `sendfile-options` add `dotfiles: 'allow'`. Measured on Express 4.22.3:
  the default served `/.well-known/x` but not `/.env`; with `allow`, `/.env` is served. The guide
  itself recommends mounting only the dot-directory that must be public. The calls are reported
  (rules `static-dotfiles`, `sendfile-dotfiles`).
- `route-del-to-delete` renames every `.del(<string>, ...)`, including `cache.del('key')`. Replaced
  by `route-del.js`, which renames only route registrations.
- `static-mime`'s `package.json` step adds `mime-types` to every Express project; it runs only when
  a source file uses `express.static.mime`.

`accepts-plural.js` fills a gap: `pluralize-method-names` only handles zero or one argument.

### D20. Stage order: API codemods and pinned defaults run on Express 4, then the upgrade
PLAN §5 puts dependencies first. Here every API rewrite and both pinned defaults
(`app.set('query parser', 'extended')`, `urlencoded({ extended: true })`) are valid on Express 4,
so they run first and their gates run on Express 4, where the baseline was measured. The upgrade
stage then changes only the dependency and the route paths (which are not valid on Express 4), and
its gate is the first on Express 5. A failure there points at the version change, not at a codemod.

### D21. Pinning Express 4 defaults is the pack's choice, reported as such
Express 5 changed the default query parser and `urlencoded` `extended`. Keeping Express 4's values
is the only choice that cannot change behaviour, so the pack makes it; the findings table in the
report lists every place, and dropping the settings is left to the project.

### D22. Evals install each fixture on its own when a pack runs official tools
A pack that changes a dependency's version cannot share one `node_modules`, and official-tool
commands must run to be evaluated. When any stage has `commands`, or the fixtures declare
different versions of a dependency, the evals install each fixture in its own directory (without a
lockfile) and run every stage command, including `npm install`. This needs network access to npm
and GitHub. `express-js-to-ts` keeps the shared install. `package-lock.json` is ignored when
comparing with `after/`.

### D23. "Compiles" for JavaScript packs is the smoke boot
PLAN §9's first criterion is "compiles / type-checks". A pack without a `typecheck` check (a
JavaScript-to-JavaScript migration) has nothing to compile, so the evals count the smoke probe
instead: the migrated app starts and answers HTTP. The scorecard says so.

### D24. `npm run evals -- <pack>` runs any pack and does not rewrite the scorecard
So a pack can be developed before it is `shipped`, and so a partial run cannot replace the
committed scorecard, which CI checks is current.

## M9 — `node-cjs-to-esm`

### D25. A Node project matches through a `node` entry and `from.module_type`
The CommonJS → ESM migration has no framework to match on. The node adapter now reports the
runtime as a framework entry (`node`, version from `engines.node` or `*`), and a pack's `from` may
set `module_type` (`commonjs` / `module`), compared with the package.json `"type"`.

### D26. Convert only what converts exactly; keep the rest CommonJS, visibly
PLAN §6 forbids behaviour changes, and several CommonJS constructs have no exact ES module form
(import hoisting, `require.main`, `require.cache`, `module.*`, top-level `this`, computed `require()`
of an unknown directory). Rather than stop the migration, `to-esm.js` keeps those files CommonJS by
renaming them `.cjs`, keeps directories loaded by computed `require()` CommonJS in place with a
nested `package.json {"type":"commonjs"}` (Node's nearest-package.json rule), and lists every such
file with its reason in the stage notes. Modules that export a single value and are still loaded
with `require()` stay CommonJS too, because `require(esm)` returns a namespace.

### D27. `engines.node` becomes `>=20.19.0`
The output uses `import.meta.dirname` (20.11), JSON modules without a warning (20.18.3), and relies
on `require()` of ES modules without a flag (20.19.0) for files kept CommonJS. The first stage
raises `engines.node` on its own, so its gate still runs on the CommonJS code.

### D28. Rules skip code that is explicitly CommonJS after the migration
`cjs-require`, `cjs-exports`, `dirname-filename` and `use-strict` would otherwise report every file
the pack deliberately kept CommonJS as "auto-fixable and not fixed". A rule may set
`skip_explicit_commonjs: true`: `.cjs` files and files below a nested package.json with
`"type": "commonjs"` are skipped (the root package.json does not count, so the whole project is
still scanned before the migration). The manual rules that explain why a file stayed CommonJS keep
reporting it.

### D29. `bin/` is scanned
The project walker skipped every `bin/` directory, meant for .NET build output. Node packages keep
their CLI sources there, so the first node-cjs-to-esm fixture's CLI was invisible to the inventory.
`bin` is no longer ignored; .NET build output in `bin/` has no source files the inventory would pick
up. (`obj/` is still ignored.)

### D30. "Compiles" falls back to the test run
A library pack has neither a type-check nor a smoke probe. For it, the evals count the test run:
an ES module graph links (syntax, specifiers, imported names) before any test runs, so passing tests
prove the migrated modules load. The order is typecheck, then smoke, then test.
