---
name: framework-migration
description: Use when migrating an application between frameworks or languages, upgrading to a new major version, replacing deprecated APIs, or producing a staged migration report. Runs a gated, commit-per-stage workflow driven by pluggable migration packs.
---

# Framework migration

A generic engine (`fm`) plus one **pack** per `source → target` path. The pack says what to change;
the engine detects, runs codemods with a diff first, checks every stage against the baseline, and
writes the report. You drive the stages, fix what the codemods cannot, and keep every gate.

## Running the engine

| Where the skill lives | Command |
|---|---|
| Installed from npm | `npx -p framework-migration-agent-skill fm <command>` |
| A checkout of this repository | `npm run fm -- <command>` (from the repository root) |

Below, `fm` means whichever of these applies. Run every command against the project directory
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
dependency graph), then rule-driven fixes, then hardening (remove shims, enable strict modes).

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
  user asks.

## Pack layout

```
packs/<id>/
  pack.yaml                  stages, pinned tools, checks (schema: schemas/pack.schema.json)
  rules/deprecated-apis.yaml detection rules (schema: schemas/rules.schema.json)
  codemods/                  jscodeshift transforms and file-level codemods run by the stages
  references/                official sources, patterns, pitfalls: read before migrating
  fixtures/<case>/           before/, after/, expected-report.md: what the evals check
```

`packs/_template/` is the starting point for a new pack; `fm validate-pack packs/<id>` checks it.
