---
kind: positive
findings:
  - { rule: isset-ternary, file: src/Totals.php, line: 12 }
  - { rule: isset-ternary, file: src/Totals.php, line: 28 }
manual_items: 0
---
# Expected report — 03-arrays-and-closures

Array code in pre-7.4 style: `array()`, `list()`, `isset($x) ? $x : default` and a closure that only
returns an expression.

What the migration must do (Rector's PHP sets up to 8.0): `[]`, `[$a, $b] = ...`, `??` / `??=` and
an arrow function; `require.php` becomes `^8.0`. The same 3 tests pass.
