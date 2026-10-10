---
kind: positive
findings:
  - { rule: default-change-detection, file: src/app/app.ts, line: 4 }
  - { rule: default-change-detection, file: src/app/profile/profile.ts, line: 8 }
  - { rule: optional-chaining-null-check, file: src/app/profile/profile.ts, line: 12 }
manual_items: 0
---
# Expected report — 03-template-semantics

A project without `strictTemplates`, whose template compares an optional chain with `null` and reads
`$event.target.value` (a strict-template type error).

What the migration must do:

- Stage `angular-22`:
  - `safe-optional-chaining` wraps the comparison: `$safeNavigationMigration(user?.address) === null`.
    Without it, `user?.address` is `undefined` for a null user in 22, and the test fails.
  - `strict-templates-default` writes `"strictTemplates": false`, keeping the project compiling.
  - `strict-safe-navigation-narrow` also adds an `extendedDiagnostics` block; with
    `strictTemplates: false` the compiler rejects it (NG4003). finish-update.js removes that block
    from `tsconfig.app.json` and `tsconfig.spec.json` (it has no effect without strict templates).
  - Eager change detection on both components.

Tests and `ng build` pass after each stage.
