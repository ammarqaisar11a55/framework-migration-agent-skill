# Migration report

**Pack:** `express-js-to-ts` — Express (JavaScript) → Express (TypeScript) (tier 1)

**Path:** express 4.x (javascript) → express 4.x (typescript)

**Result:** Stopped at stage 2 (rename-and-modules): its gate failed. 1 manual follow-up remains.

## Stages

| # | Stage | Gate | Files changed | Type-check | Tests | Smoke | Commit |
|---|---|---|---|---|---|---|---|
| 0 | baseline | passed | — | — | pass (6 passed, 0 failed) | — | `0000000000` |
| 1 | tooling | passed | 2 | pass | pass (6 passed, 0 failed) | pass | `aaaaaaaaaa` |
| 2 | rename-and-modules | FAILED | 4 | fail | pass (5 passed, 0 failed) | — | `bbbbbbbbbb` |
| 3 | express-typing | not run | 1 | — | — | — | — |
| 4 | strictness | not run | — | — | — | — | — |

### Stage 0 (baseline) notes

- Warning: the test suite is small (6 tests)

### Stage 2 (rename-and-modules) notes

- **Gate failed:** typecheck failed (exit code 2)
- **Gate failed:** test parity lost: 5 tests passed, the baseline had 6

`run typecheck` (exit code 2):

```
src/app.ts(3,7): error TS2339: Property 'user' does not exist
```

## What each stage changed

### Stage 1 — tooling: Add TypeScript tooling

- Command (ok): `npm install`
- `add-ts-tooling.js` — 2 files: + tsconfig.json, package.json
- Diff: `.fm/diffs/stage-1/`

### Stage 2 — rename-and-modules

- `cjs-to-esm.js` — 2 files: src/app.js, src/server.js
  - Note: src/plugins.js: kept `export =`
- `rename-to-ts.js` — 2 files: src/app.js → src/app.ts, src/server.js → src/server.ts
- Diff: `.fm/diffs/stage-2/`

### Stage 3 — express-typing

Previewed only (dry run); nothing was applied.

- `add-handler-types.js` — 1 file: src/app.ts
- Diff: `.fm/diffs/stage-3/`

### Stage 4 — strictness

Not run.

## Manual follow-ups

| Location | Rule | Severity | What to do | Docs |
|---|---|---|---|---|
| src/plugins.ts:4 | dynamic-require | error | Fix dynamic-require \| by hand | https://docs.test/x |

### Auto-fixable findings still present

These should have been fixed by a codemod. Check the stage that owns them before fixing by hand.

| Location | Rule | What to do |
|---|---|---|
| src/legacy.ts:9 | cjs-require | Fix cjs-require \| by hand |

## Findings

| Rule | At baseline | Now |
|---|---|---|
| cjs-require | 2 | 1 |
| dynamic-require | 1 | 1 |

## Risks

| File | Risk | Why |
|---|---|---|
| src/plugins.ts | high (5) | dynamic require() with a computed specifier |

## Rollback

Each stage is one commit. To undo a stage and everything after it, reset to the commit before it:

- Before the migration: `git reset --hard 0000000000000000000000000000000000000000`
- After stage 1 (tooling): `git reset --hard aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`
- After stage 2 (rename-and-modules): `git reset --hard bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb`
