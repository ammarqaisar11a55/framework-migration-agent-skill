---
kind: positive
findings:
  - { rule: field-renamed-arguments, file: app/models.py, line: 10 }
  - { rule: optional-without-default, file: app/models.py, line: 17 }
  - { rule: field-renamed-arguments, file: app/models.py, line: 19 }
  - { rule: config-class, file: app/models.py, line: 22 }
  - { rule: validator, file: app/models.py, line: 27 }
  - { rule: root-validator, file: app/models.py, line: 33 }
  - { rule: deprecated-model-class-methods, file: app/service.py, line: 10 }
  - { rule: deprecated-model-class-methods, file: app/service.py, line: 14 }
  - { rule: deprecated-model-instance-methods, file: app/service.py, line: 18 }
  - { rule: deprecated-model-instance-methods, file: app/service.py, line: 22 }
manual_items: 4
---
# Expected report — 01-models-and-validators

Pydantic 1.10 models with a config class, a field validator, a root validator, constrained fields
and an `Optional` field without a default, used through `parse_obj` / `from_orm` / `.dict()` /
`.json()`.

What the migration must do:

- bump-pydantic: `class Config` → `model_config = ConfigDict(...)` (`orm_mode` → `from_attributes`,
  `anystr_strip_whitespace` → `str_strip_whitespace`); `@validator` → `@field_validator` +
  `@classmethod`; `regex=` → `pattern=`, `max_items=` → `max_length=`; `nickname: Optional[str]` →
  `= None`.
- finish-bump.js: `allow_mutation=False` → `frozen=True` (and the TODO removed); `@root_validator` →
  `@root_validator(skip_on_failure=True)`; pydantic 1.10.26 → 2.13.5.

The tests pass on v2 (the JSON test compares parsed values: v2's JSON is compact).

Manual follow-ups (4): the deprecated `parse_obj`, `from_orm`, `.dict()` and `.json()` calls.
