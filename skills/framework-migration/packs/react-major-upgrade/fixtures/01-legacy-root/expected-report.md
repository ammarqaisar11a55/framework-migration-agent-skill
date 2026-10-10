---
kind: positive
findings:
  - { rule: reactdom-render, file: src/main.jsx, line: 6 }
  - { rule: test-utils-act, file: test/main.test.jsx, line: 4 }
manual_items: 0
---
# Expected report — 01-legacy-root

A React 18.2 app mounted with `ReactDOM.render`, tested with `act` from `react-dom/test-utils`.

What the migration must do:

- Stage `react-18-3`: react / react-dom 18.2.0 → 18.3.1 (adds deprecation warnings).
- Stage `codemods` (official, still on 18.3): `ReactDOM.render(el, container)` →
  `const root = createRoot(container); root.render(el)` with `createRoot` imported from
  `react-dom/client`; `act` imported from `react` instead of `react-dom/test-utils`. The test
  already wraps rendering in `act`, so the asynchronous root commits before the assertions.
- Stage `react-19`: react / react-dom → 19.3.0.

The official codemod leaves the now-unused `import ReactDOM from 'react-dom'` in place.
Manual follow-ups: none.
