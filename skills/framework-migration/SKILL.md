---
name: framework-migration
description: Use when migrating an application between frameworks or languages, upgrading to a new major version, replacing deprecated APIs, or producing a staged migration report. Runs a gated, commit-per-stage workflow driven by pluggable migration packs.
license: MIT
compatibility: Needs a shell with Node.js 20.19+ and npm/npx, git, and network access to the npm registry (and GitHub for packs that run official tools from source). Works in any Agent Skills client, such as Claude Code, Codex and Cursor.
---

# Framework migration

A generic engine (`fm`) plus one **pack** per `source → target` path. The pack says what to change;
the engine detects, runs codemods with a diff first, checks every stage against the baseline, and
writes the report. You drive the stages, fix what the codemods cannot, and keep every gate.

## Running the engine

The engine is a command-line tool published on npm. Run it from a shell with the version this skill
was written for:

```
npx -y -p framework-migration-agent-skill@0.1.0 fm <command>
```

In a checkout of the skill's own repository, `npm run fm -- <command>` (from its root) runs the same
engine from source. If npm cannot find the package (a release that is not published yet), ask the
user for a checkout of the repository and use that. Below, `fm` means one of these. Paths such as `packs/<id>/references/` are
relative to this file's directory. Run every command against the project directory
(`[dir]`, default `.`). Artifacts go to `<dir>/.fm/`; add `.fm/` to `.git/info/exclude` so stage
commits do not pick it up. `fm --help` prints every command and flag.

## 1. Pick a pack

1. `fm detect-stack <dir>` prints the detected stacks and the packs whose `from` matches.
2. Pick the matching pack whose `to` is what the user asked for. Read its `pack.yaml` and everything
   in its `references/` before touching code: `packs/<id>/references/official-sources.md`,
   `known-pitfalls.md` and any other file there.
3. If `versionVerified` is false, the project's version is outside the range the pack was verified
   for: say so and proceed only if the user agrees.
4. **No matching pack, or a pack with `status` other than `shipped`:** do not migrate. Run
   `fm inventory` and, when a pack exists, `fm detect`, then write a roadmap for the user from
   `inventory.json` and `findings.json` (risky files first, manual items with file:line). Packs
   with `tier: 3` run in this assist mode even when shipped: their codemods cover only mechanical
   parts.

## 2. Staged workflow

One commit per stage. Each stage commit's subject must be exactly
`migrate(<pack>): stage <n> <stage-id>` (for example `migrate(express-js-to-ts): stage 2 rename-and-modules`).
`fm report` finds rollback points by this subject; any other wording loses them.

| # | Do | Gate |
|---|---|---|
| 0 | **Baseline.** The git tree must be clean. `fm inventory <dir>`, `fm detect --pack <id> <dir>`, then `fm check --pack <id> --stage 0 <dir>`. | Baseline tests pass. If they do not, stop and report; do not migrate a red project. |
| 1…n | **Each stage in `pack.yaml`, in order.** `fm run-codemod --pack <id> --stage <stage-id> --dry-run <dir>`, read the patches in `.fm/diffs/stage-<n>/`, then the same with `--apply`. For a stage with `fix_rules: true`, also fix by hand any remaining `auto_fixable` finding the codemods missed. Then `fm check --pack <id> --stage <n> <dir>`. | The check's gate: type-check passes, tests at baseline parity, smoke boot. Commit only after it passes. |
| last | **Report.** `fm report --pack <id> <dir>` writes `MIGRATION_REPORT.md`. Add manual items you found along the way, then show it to the user. | — |

Packs map their stages onto the same generic phases: tooling and shims first (the app must still
boot), then official tool and pack codemods (leaf → root, the engine orders files from the
dependency graph), then rule-driven fixes, then hardening (remove shims, enable strict modes). The
exact order is the pack's: `express-4-to-5`, for example, applies every change that still runs on
Express 4 before it upgrades, so the first gate on Express 5 tests only the upgrade.

A stage that runs an official tool lists it under `commands` in `pack.yaml`. Its dry-run output
(the tool's diff) is in `.fm/diffs/stage-<n>/command-before-*.txt`, next to the pack codemods'
`.patch` files; read both. Such stages fetch the pinned tool from npm or GitHub, so they need
network access.

### When a gate fails

Read `.fm/checks/stage-<n>.json`. Fix the cause in the smallest way that keeps behaviour, re-run
`fm check` for the same stage, and commit only when it passes. Typical causes and fixes are in the
pack's `references/` (for `express-js-to-ts`: type parameters the codemods could not type, see
`type-patterns.md`). If you cannot make the gate pass without changing behaviour, stop: run
`fm report`, and tell the user which stage failed and why. To abandon a stage, `git reset --hard`
to the previous stage commit.

## 3. Rules

- One commit per stage, so each stage is a rollback point.
- Never proceed past a failed gate.
- Never change business logic. Types, imports, module syntax and configuration change; what the
  code does does not. When a fix would change behaviour, make it a manual item instead.
- Tier 3 packs run in **assist mode**: inventory, findings, roadmap, and codemods only for
  mechanical parts.
- Always dry-run codemods and read the diff before applying.
- Anything not auto-fixable goes into the report as a manual item with file:line and a fix hint.
- Leave code that a rule flags with `auto_fixable: false` as it is (dynamic `require`, reflection,
  monkey-patching). Report it; do not rewrite it to satisfy a gate.
- Do not upgrade, add or remove dependencies beyond what the pack's tooling stage does, unless the
  user asks. The exception is type-only packages (`@types/*`) a gate needs, such as types for an
  untyped dependency or a test runner's globals: add them as exact-version devDependencies at the
  major version of the installed package they describe, and list them in the report.

## Pack layout

```
packs/<id>/
  pack.yaml                  stages, pinned tools, checks
  rules/deprecated-apis.yaml detection rules
  references/                official sources, patterns, pitfalls: read before migrating
  codemods/, fixtures/       in the npm package and the repository only; the engine runs them
```

A copy installed with `fm install-skill` holds this file and each pack's `pack.yaml`, `rules/` and
`references/`. Authoring a pack happens in the repository: start from `packs/_template/` and check it
with `fm validate-pack packs/<id>`.
