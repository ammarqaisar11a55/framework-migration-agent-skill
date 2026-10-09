---
kind: negative
findings:
  - { rule: element-ref, file: src/List.jsx, line: 9 }
  - { rule: prop-types, file: src/List.jsx, line: 15 }
  - { rule: shallow-renderer, file: test/List.test.jsx, line: 4 }
manual_items: 3
must_remain:
  - { file: test/List.test.jsx, contains: "import TestRenderer from 'react-test-renderer';" }
  - { file: src/List.jsx, contains: "<li data-has-ref={String(child.ref != null)}>{child}</li>" }
  - { file: src/List.jsx, contains: "List.propTypes = {" }
---
# Expected report — 04-deprecated-but-working (negative)

APIs React 19 deprecates or ignores without breaking: `react-test-renderer`, reading `element.ref`,
and `propTypes`. They must be flagged and left as they are.

- `react-test-renderer` is upgraded to 19.3.0 with React; it logs a deprecation warning. Moving the
  tests to Testing Library is a rewrite, not a migration step (`shallow-renderer`).
- `child.ref` still returns the ref in React 19 but warns (`element-ref`); `child.props.ref` is the
  replacement.
- `List.propTypes` is ignored by React 19 (`prop-types`).

The test wraps `TestRenderer.create` in `TestRenderer.act`, which both React 18 and 19 need for a
committed tree. Manual follow-ups: 3.
