---
kind: negative
findings:
  - { rule: deprecated-functions-8x, file: src/Legacy.php, line: 9 }
  - { rule: dollar-brace-interpolation, file: src/Legacy.php, line: 14 }
  - { rule: loose-zero-comparison, file: src/Legacy.php, line: 19 }
  - { rule: filter-sanitize-string, file: src/Legacy.php, line: 24 }
manual_items: 4
must_remain:
  - { file: src/Legacy.php, contains: "return utf8_decode($text);" }
  - { file: src/Legacy.php, contains: "return \"Hello ${name}\";" }
  - { file: src/Legacy.php, contains: "return $count == 0;" }
  - { file: src/Legacy.php, contains: "FILTER_SANITIZE_STRING" }
---
# Expected report — 04-later-deprecations (negative)

Code that runs on PHP 8 but relies on things Rector's 8.0 sets do not change: `utf8_decode()`
(deprecated in 8.2), `"${name}"` interpolation (8.2), `FILTER_SANITIZE_STRING` (8.1) and a loose
`== 0` comparison, whose result for non-numeric strings changed in 8.0.

None of them has a safe mechanical rewrite here (the replacement depends on what the code means), so
the stage leaves them and only requires PHP 8.0 in composer.json. The tests still pass, with three
deprecation notices.

Manual follow-ups (4): one per construct, with the fix hint from the rule.
