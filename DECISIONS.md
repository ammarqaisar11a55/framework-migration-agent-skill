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

## M9 — `eslint-flat-config`

### D31. The pack also upgrades ESLint to 9
PLAN §7 names the config-format migration. ESLint 9 is the release that drops eslintrc as the
default, and `@eslint/migrate-config` targets 9 or 10, so the pack moves the project to ESLint 9.39.5
(the `maintenance` line) in the same stage. ESLint 10 is not the target: it removes the remaining
eslintrc support entirely, which belongs in its own pack.

### D32. The migrator's runner refuses cases it cannot migrate equivalently
`@eslint/migrate-config` keeps only the evaluated result of a JavaScript configuration and ignores
nested `.eslintrc` files. Running it anyway would change which rules apply without any error, so
`official-migrate.mjs` fails the stage in both cases with instructions (PLAN §6: never change
behaviour; never proceed past a failed gate). Static JavaScript configurations are migrated.

### D33. The `globals` package is an engine dependency
`finish-flat-config.js` turns `eslint-env` comments into `/* global */` comments, which needs the
environment → globals table at codemod time, before the project has installed `globals`. It moved
from `devDependencies` to `dependencies` so the published package can run the codemod (D4).

### D34. Lint packs are gated by tests that lint known-bad samples
A lint gate passes for a configuration that lints nothing. The pack declares both `lint` and `test`
checks, and every fixture's test suite lints deliberately bad samples through the ESLint API and
asserts the rule ids, ignores and file coverage. The same tests run on ESLint 8 and 9.

## Cross-client use (Claude Code, Codex, Cursor)

### D35. One skill folder in the Agent Skills format, installed per client by `fm install-skill`
Requested by the repo owner. Claude Code, Codex and Cursor all load the open Agent Skills format
(a folder named after the skill with a `SKILL.md`; spec at agentskills.io, source in
`agentskills/agentskills`), so the skill needs no per-client variant. They differ in where they
look, verified from each source: Claude Code docs (`.claude/skills/`, `~/.claude/skills/`), the Codex
source (`$CODEX_HOME/skills`, default `~/.codex/skills`; repository `.codex/skills/` and
`.agents/skills/`), and Cursor's docs as found through search, since cursor.com was blocked
(`.cursor/skills/`, `.agents/skills/`, user-level equivalents; it also reads `.claude/skills/` and
`.codex/skills/`). `fm install-skill --client claude|codex|cursor|agents|all [--user]` copies the skill
there; `all` writes `.claude/skills/` and `.agents/skills/`, which covers all three. It only replaces a
folder it installed itself (marker file `.fm-install.json`).

### D36. The installed skill runs the engine from npm at a pinned version
An installed copy contains `SKILL.md` and each pack's `pack.yaml`, `rules/` and `references/` — what
the agent reads. The engine runs with `npx -y -p framework-migration-agent-skill@<version> fm`,
pinned in `SKILL.md`; a unit test fails when that version differs from package.json, so a release
bumps both. Another test checks the frontmatter against the spec's constraints. `SKILL.md` gained
the optional `license` and `compatibility` fields, and its wording names no client-specific tools.

## M9 — `react-major-upgrade`

### D37. React 17/18 → 19 through 18.3, codemods gated on 18.3
The upgrade guide recommends React 18.3 first. The pack upgrades to 18.3.1, applies the codemods
while still on 18.3 (all their targets — `createRoot`, `React.act`, callback refs — exist there), and
upgrades to 19.3.0 last, so the final gate isolates React 19 itself.

### D38. The React 19 codemods run from react-codemod's source at a pinned commit
The guide runs them through the Codemod registry, which resolves them at run time and was not
reachable. They are TypeScript jscodeshift transforms in `reactjs/react-codemod`, absent from the
npm package (5.4.4). `official-codemods.mjs` fetches the repository at a pinned commit and runs
`replace-reactdom-render`, `replace-string-ref`, `replace-act-import` and `replace-use-form-state`
with jscodeshift 17.4.0, on a scratch copy with a diff (same pattern as D17/D18).
`prop-types-typescript` (TypeScript sources only) and `types-react-codemod` are not run: there is
no TypeScript fixture to verify them, so rule `types-react` reports the step with the exact command.

### D39. Function-component `defaultProps` are converted only when exact
React 19 silently ignores them. The guide's replacement (default parameters) is applied by
`function-default-props.js` for literal and identifier defaults on destructured props; object,
array and function defaults would become a new value per render and are reported instead.

### D40. React fixtures run JSX through tsx with jsdom
`node --test` with `--import tsx` and `"jsx": "react-jsx"` (`allowJs` so tsx applies it to `.jsx`),
`jsdom` 29.1.1 for DOM tests (30.x needs Node 22.22.2), and `--test-force-exit` because React 17's
scheduler keeps a `MessageChannel` open under a `window`.

## M9 — `tailwind-3-to-4`

### D41. The official upgrade tool runs on a scratch copy with its own install
`@tailwindcss/upgrade` (4.3.3) has no dry-run, needs the project's v3 dependencies installed to
read the config, and installs v4 packages itself. `official-upgrade.mjs` copies the project, runs
`npm ci` (or `npm install` without a lockfile), runs the tool with `--force`, prints the diff and
copies changes back only on `--apply`. npm's `package_lock` environment variables are removed for
the tool's own installs, and a lockfile the scratch install created is dropped when the project had
none.

### D42. Opacity utilities the tool leaves are merged into their colour
The tool rewrites `bg-opacity-50` only next to a colour it can resolve. `finish-upgrade.js` merges a
leftover `*-opacity-N` into the one colour utility of the same kind and variant in the same class
list (`bg-blue-500 bg-opacity-50` → `bg-blue-500/50`); with zero or several candidates it is left
for rule `opacity-utilities`. Colours are the default palette plus `--color-*` names declared in the
project's CSS.

### D43. CLI builds get `@tailwindcss/cli`
v4 moved the `tailwindcss` binary to `@tailwindcss/cli`, which the tool does not add. When a
package.json script runs `tailwindcss`, the codemod adds `@tailwindcss/cli` at the same version as
`tailwindcss`.

### D44. No rules for renamed utilities
The tool renames `shadow-sm`, `rounded`, `outline-none` and the rest from its own tables; a
regex rule would also flag the v4 names after the upgrade (`shadow-sm` exists in both with
different meanings). The rules cover what the tool reports but does not change: JS config with
plugins, `theme()` calls, `@layer` utilities and removed config options.

## M9 — `svelte-4-to-5`

### D45. The official migration runs without its prompts, through its own functions
`npx sv migrate svelte-5` hands over to `svelte-migrate@1`, whose svelte-5 migration asks for
confirmation, folders and whether to convert components, interactively only. `official-migrate.mjs`
installs `svelte-migrate` 1.10.3 and the Svelte 5 compiler in a cache directory and calls the same
functions the migration calls (`update_pkg_json_content`, `transform_module_code`, the compiler's
`migrate`), with the migration's default answers, on a scratch copy with a diff. It stops on Svelte 3
or SvelteKit 1 like the official script.

### D46. The migration's caret ranges are pinned; its markup slips are repaired
`finish-migration.js` replaces each range the migration wrote with an exact version from pack.yaml
(the newest release inside that range when verified, so the majors stay the migration's choice). It
also removes the `={true}` that svelte 5.57's `migrate()` leaves when it strips `accessors` from
`<svelte:options>` (the file does not compile otherwise) and the double spaces left where moved
attributes were.

### D47. Dependencies are installed by a script that re-resolves only what the upgrade invalidates
On a project with Svelte 4 installed, `npm install` fails with ERESOLVE: the lockfile keeps
`@sveltejs/vite-plugin-svelte-inspector` 2.x, whose peer range needs plugin 3. The migration suggests
`--force`, which installs broken peers. `install-upgraded.mjs` runs `npm install` and, only if it
fails, drops from the lockfile and node_modules the packages whose installed version no longer
satisfies package.json plus everything that depends on them, then installs again. Remaining
conflicts still fail the stage.

### D48. Svelte fixtures compile components with a Node load hook and run under jsdom
The fixture tests import `.svelte` files through a module hook that compiles them with whichever
Svelte is installed (`dom` output on 4, `client` on 5), run with `--conditions=browser` and a jsdom
global DOM, and mount through a helper that uses `new Component()` or `mount()`. The same tests
therefore run unchanged before and after the migration and check behaviour, not syntax.

## M9 — `nextjs-major-upgrade`

### D49. Scope: Next.js 15 → 16; Pages → App Router is not part of the pack
PLAN §8 lists "Next.js majors; Pages → App Router". The pack covers the current major step, 15 → 16,
with the official upgrade codemod. Earlier majors are reached by the same tool one step at a time but
were not verified with fixtures. Moving from the Pages Router to the App Router is a rewrite of data
fetching and routing that no official codemod performs; it would be a tier 3 (assist-mode) pack and is
not shipped.

### D50. The upgrade runs on a scratch copy and the skipped removal codemods run after it
`@next/codemod upgrade` installs packages and has no dry-run, so it runs like D41's tools on a scratch
install with `--yes`. It runs only codemods registered after the installed version, so an app on a
late 15.x skips those for 15.x deprecations that 16 removes (synchronous Request APIs,
`experimental.turbo`, `next lint`, `experimental-edge`). The guide asks for `next-async-request-api`
explicitly and counts the others as part of the upgrade, so the runner runs each one the upgrade
skipped; the lint codemod only when a script uses `next lint` (on its own it sets up ESLint
everywhere).

### D51. React 19 is a prerequisite, not part of this pack
In 16.3 the upgrade moves React 18 to 19 without asking and runs the React 19 codemods from the
Codemod registry at `latest`. The runner stops on React 18 and points to `react-major-upgrade`, which
does that step with pinned tools; the opt-out flag (`--skip-react-upgrade`) exists only from 16.4.

### D52. Edge middleware is restored; adoption-only `instant = false` blocks are removed
The guide says to keep middleware that uses the edge runtime, since proxy runs only on Node.js;
`middleware-to-proxy` renames it regardless, so the runner restores a middleware file that sets the
edge runtime explicitly. The 16.3 upgrade also runs the `cache-components-instant-false` adoption
codemod; `instant` has no effect without `cacheComponents`, so finish-upgrade.js removes the exact
blocks it inserts unless the config enables `cacheComponents`. Rules gained `skip_if_file_matches` (a
regex over the file) so `middleware-convention` does not count the kept edge middleware as
auto-fixable.

### D53. Next.js fixtures are tested through `next build` and `next start`
Each fixture's test script builds the app and runs `node --test` against `next start` on a free port,
fetching pages, redirects, headers and route handlers. The same tests run on 15 and 16. The evals
compare after/ without build output (`.next/` and the engine's other ignored directories).
