---
kind: positive
findings:
  - { rule: strpos-false-check, file: src/Strings.php, line: 9 }
  - { rule: substr-prefix-suffix, file: src/Strings.php, line: 14 }
  - { rule: substr-prefix-suffix, file: src/Strings.php, line: 19 }
  - { rule: get-class-object, file: src/Strings.php, line: 41 }
manual_items: 0
---
# Expected report — 01-string-helpers

A PHP 7.4 library: `strpos(...) !== false`, `substr()` prefix / suffix checks, `switch (true)` and
`get_class($value)`.

What the migration must do (Rector's PHP sets up to 8.0): `str_contains()`, `str_starts_with()`,
`str_ends_with()`, a `match (true)` expression and `$value::class`; require-php8.js sets
`require.php` to `^8.0`. The same 3 tests pass.
