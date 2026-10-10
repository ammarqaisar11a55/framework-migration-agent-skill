---
kind: positive
findings:
  - { rule: tostring-without-stringable, file: src/Customer.php, line: 24 }
manual_items: 0
---
# Expected report — 02-classes-and-types

Value classes written for PHP 7: properties assigned in the constructor, `__toString()`, a
`switch` returning values and a `catch` whose variable is unused.

What the migration must do (Rector's PHP sets up to 8.0): constructor property promotion,
`implements \Stringable`, a `match` expression and a catch without a variable; `require.php` becomes
`^8.0`. The same tests pass.
