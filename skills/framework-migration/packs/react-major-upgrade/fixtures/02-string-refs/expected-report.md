---
kind: positive
findings:
  - { rule: string-ref, file: src/SearchBox.jsx, line: 14 }
  - { rule: test-utils-act, file: test/SearchBox.test.jsx, line: 5 }
  - { rule: reactdom-render, file: test/SearchBox.test.jsx, line: 12 }
manual_items: 0
---
# Expected report — 02-string-refs

A React 17 class component that uses a string ref, mounted in its test with `ReactDOM.render`.

What the migration must do:

- Go through React 18.3.1 to 19.3.0.
- `ref="input"` → a callback ref that stores the node in `this.refs.input` (official
  replace-string-ref codemod), so `this.refs.input.focus()` keeps working.
- The test's `ReactDOM.render` and `act` import are migrated as in 01.

Manual follow-ups: none.
