---
kind: positive
findings:
  - { rule: generic-model, file: catalog/models.py, line: 7 }
  - { rule: generic-model, file: catalog/models.py, line: 17 }
  - { rule: validator-unconvertible, file: catalog/models.py, line: 22 }
  - { rule: config-class, file: catalog/models.py, line: 35 }
  - { rule: validator, file: catalog/models.py, line: 38 }
  - { rule: validator-unconvertible, file: catalog/models.py, line: 42 }
  - { rule: deprecated-model-class-methods, file: catalog/models.py, line: 47 }
manual_items: 3
---
# Expected report — 03-generics-and-validators

A generic page model with an `always=True` validator that reads `values`, and a self-referencing
product with an `each_item=True` validator.

What the migration must do:

- bump-pydantic: `GenericModel` → `BaseModel` (with `Generic[T]`); `Config` → `ConfigDict(use_enum_values=True)`;
  `@validator("sku")` → `@field_validator`.
- The `always=True` and `each_item=True` validators stay `@validator` with `TODO[pydantic]` comments;
  v2 runs them (deprecated). Tests pass.

Manual follow-ups (3): port the two validators (`validate_default=True` / `info.data`; an item-level
`AfterValidator`), and `update_forward_refs()` → `model_rebuild()`.
