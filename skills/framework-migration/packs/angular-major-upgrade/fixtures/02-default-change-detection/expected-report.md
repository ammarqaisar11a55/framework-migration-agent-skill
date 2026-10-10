---
kind: positive
findings:
  - { rule: default-change-detection, file: src/app/app.ts, line: 4 }
  - { rule: default-change-detection, file: src/app/inbox/inbox.ts, line: 5 }
manual_items: 0
---
# Expected report — 02-default-change-detection

A component that mutates plain fields from an RxJS subscription, outside any template event. It
renders only because Angular 20's default change detection checks every component.

What the migration must do:

- Stage `angular-21`: package updates only (the template already uses `@for`).
- Stage `angular-22`: `ChangeDetectionStrategy.Eager` on both components. Without it, Angular 22's
  OnPush default leaves the inbox at "0 message(s)" after messages arrive: the test fails when the
  line is removed.
