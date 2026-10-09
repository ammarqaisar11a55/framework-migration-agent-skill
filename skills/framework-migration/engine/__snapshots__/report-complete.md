# Migration report

**Pack:** `express-js-to-ts` — Express (JavaScript) → Express (TypeScript) (tier 1)

**Path:** express 4.x (javascript) → express 4.x (typescript)

**Result:** All 1 stages passed their gates. 0 manual follow-ups remain.

## Stages

| # | Stage | Gate | Files changed | Type-check | Tests | Smoke | Commit |
|---|---|---|---|---|---|---|---|
| 0 | baseline | passed | — | — | pass (6 passed, 0 failed) | — | `0000000000` |
| 1 | tooling | passed | 2 | pass | pass (6 passed, 0 failed) | pass | `aaaaaaaaaa` |

### Stage 0 (baseline) notes

- Warning: the test suite is small (6 tests)

## What each stage changed

### Stage 1 — tooling: Add TypeScript tooling

- Command (ok): `npm install`
- `add-ts-tooling.js` — 2 files: + tsconfig.json, package.json
- Diff: `.fm/diffs/stage-1/`

## Manual follow-ups

None.

## Findings

| Rule | At baseline | Now |
|---|---|---|
| cjs-require | 1 | 0 |

## Risks

No file was scored medium or high risk.

## Rollback

Each stage is one commit. To undo a stage and everything after it, reset to the commit before it:

- Before the migration: `git reset --hard 0000000000000000000000000000000000000000`
- After stage 1 (tooling): `git reset --hard aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`
