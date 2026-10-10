---
kind: positive
findings:
  - { rule: config-class, file: svc/api.py, line: 11 }
  - { rule: config-extra-enum, file: svc/api.py, line: 13 }
  - { rule: base-settings, file: svc/config.py, line: 3 }
  - { rule: config-class, file: svc/config.py, line: 12 }
  - { rule: validator, file: svc/config.py, line: 15 }
  - { rule: deprecated-model-class-methods, file: tests/test_config.py, line: 48 }
manual_items: 1
---
# Expected report — 02-settings-and-config

Environment settings (`BaseSettings` with `env_prefix`) and an API model with aliases,
`Extra.forbid` and a schema example.

What the migration must do:

- bump-pydantic: `BaseSettings` from `pydantic_settings` with `SettingsConfigDict(env_prefix=...)`;
  `@validator(..., pre=True)` → `@field_validator(..., mode="before")`; the API config →
  `ConfigDict(populate_by_name=True, extra="forbid", json_schema_extra=...)`.
- finish-bump.js: pydantic 2.13.5 and `pydantic-settings==2.15.0` in `requirements.txt`.

Manual follow-up (1): `Order.schema()` → `model_json_schema()`.
