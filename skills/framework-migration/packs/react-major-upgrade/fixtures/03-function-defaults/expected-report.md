---
kind: positive
findings:
  - { rule: prop-types, file: src/components.jsx, line: 8 }
  - { rule: function-default-props, file: src/components.jsx, line: 13 }
  - { rule: function-default-props, file: src/components.jsx, line: 25 }
  - { rule: function-default-props, file: src/components.jsx, line: 34 }
manual_items: 4
---
# Expected report — 03-function-defaults

Function components with `defaultProps`, which React 19 ignores, next to a class component whose
`defaultProps` React 19 keeps.

What the migration must do (`function-default-props.js`, stage `codemods`):

- `Badge.defaultProps = { label: 'New', tone: 'info' }` → `function Badge({ label = 'New', tone = 'info' })`.
- `Price.defaultProps = { currency: '$', precision: 2 }` → `({ amount, currency = '$' })`; `precision`
  is dropped, because `Price` never reads it and has no `...rest` through which it could.
- `Notice.defaultProps` (a class) stays.
- `Badge.propTypes` stays: React 19 ignores it without breaking anything (manual item).

Manual follow-ups: 4 — the three `defaultProps` assignments and `propTypes` are reported before the
migration; after it, `Notice.defaultProps` (correctly kept) and `Badge.propTypes` remain.
