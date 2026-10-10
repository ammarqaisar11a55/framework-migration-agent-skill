---
kind: positive
findings:
  - { rule: default-change-detection, file: src/app/app.ts, line: 4 }
  - { rule: default-change-detection, file: src/app/greeting/greeting.ts, line: 4 }
  - { rule: structural-directives, file: src/app/greeting/greeting.ts, line: 8 }
  - { rule: structural-directives, file: src/app/greeting/greeting.ts, line: 11 }
  - { rule: structural-directives, file: src/app/greeting/greeting.ts, line: 13 }
  - { rule: structural-directives, file: src/app/greeting/greeting.ts, line: 14 }
  - { rule: structural-directives, file: src/app/greeting/greeting.ts, line: 15 }
  - { rule: structural-directives, file: src/app/greeting/greeting.ts, line: 16 }
manual_items: 0
---
# Expected report — 01-control-flow

An Angular 20 app (zone change detection, Vitest unit-test builder) whose component uses `*ngIf`
with `else`, `*ngFor` with `index` and `trackBy`, and `[ngSwitch]`.

What the migration must do:

- Stage `angular-21`: `ng update @angular/core@21.2.24 @angular/cli@21.2.24 vitest@4.0.18`
  (Vitest 3 is outside @angular/build 21's peer range). `control-flow-migration` rewrites the
  template to `@if` / `@else`, `@for (...; track byValue(i, item); let i = $index)` and `@switch`, and
  drops the NgIf/NgFor/NgSwitch imports.
- Stage `angular-22`: `ng update @angular/core@22.2.0 @angular/cli@22.2.0` (TypeScript 5.9.3 →
  6.0.3, the target's peer range). `change-detection-eager` adds
  `changeDetection: ChangeDetectionStrategy.Eager` to both components (22 defaults to OnPush);
  `strict-safe-navigation-narrow` adds an `extendedDiagnostics` block to the app and spec tsconfigs.
- The migrations reformat the files they touch (double quotes).

Tests (TestBed, Vitest) and `ng build` pass after each stage.
