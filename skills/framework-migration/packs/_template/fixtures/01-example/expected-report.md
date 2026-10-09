---
# Machine-checked expectations for this fixture.
kind: positive            # positive | negative (negative = patterns that must be flagged but not changed)
findings:                 # every finding `fm detect` must report on before/, nothing more
  - { rule: example-deprecated-call, file: index.js, line: 1 }
# must_remain:            # negative fixtures: code that must survive the migration verbatim
#   - { file: index.js, contains: "require(name)" }
manual_items: 0           # findings that are not auto_fixable
---

# Expected report — 01-example

Describe in prose what the migration should do to this fixture and what it must leave alone.
