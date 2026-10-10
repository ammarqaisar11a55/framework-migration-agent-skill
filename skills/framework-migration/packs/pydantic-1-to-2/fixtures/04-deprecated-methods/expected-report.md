---
kind: negative
findings:
  - { rule: deprecated-model-instance-methods, file: inventory/stock.py, line: 13 }
  - { rule: deprecated-model-class-methods, file: inventory/stock.py, line: 17 }
  - { rule: deprecated-model-class-methods, file: inventory/stock.py, line: 22 }
  - { rule: deprecated-model-instance-methods, file: inventory/stock.py, line: 26 }
manual_items: 4
must_remain:
  - { file: inventory/stock.py, contains: "return item.copy(update={\"quantity\": item.quantity + amount})" }
  - { file: inventory/stock.py, contains: "return Item.parse_raw(raw)" }
  - { file: inventory/stock.py, contains: "return Item.construct(**data)" }
  - { file: inventory/stock.py, contains: "return item.dict(exclude_defaults=True)" }
---
# Expected report — 04-deprecated-methods (negative)

A plain model used through v1 methods that v2 keeps as deprecated aliases: `.copy(update=...)`,
`parse_raw`, `construct` (no validation, on purpose) and `.dict(exclude_defaults=True)`.

bump-pydantic does not rename them and the pack does not either: `.dict()` and `.copy()` cannot be
told apart from dict and list methods by pattern, and renaming is not needed for v2. Only the
pydantic pin changes; the tests pass on v2 with deprecation warnings.

Manual follow-ups (4): model_copy, model_validate_json, model_construct, model_dump.
