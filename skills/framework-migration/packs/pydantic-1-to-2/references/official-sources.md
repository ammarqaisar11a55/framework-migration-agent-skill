# Official sources

`docs.pydantic.dev` was not reachable from the environment the pack was written in. The migration
guide was read from its source in `pydantic/pydantic` (tag `v2.13.5`, `docs/migration.md`) and
bump-pydantic's rules from its README (tag `0.8.0`, commit `e97380c3`).

| Source | URL | Used for | Verified via | Verified |
|---|---|---|---|---|
| Pydantic V2 migration guide | https://docs.pydantic.dev/latest/migration/ | bump-pydantic as the starting point; config changes (`allow_mutation` → `frozen`, `orm_mode` → `from_attributes`, ...); validators (`@field_validator`, no `each_item`, `always` → `validate_default`, `@root_validator` requires `skip_on_failure=True` when not `pre`); `Field` renames (`regex` → `pattern`, `min_items`/`max_items`); `Optional[T]` is required without a default; `GenericModel` removed; `__root__` → `RootModel`; `BaseSettings` moved to `pydantic-settings`; deprecated `BaseModel` methods; `model_dump_json()` is compact | `pydantic/pydantic` `docs/migration.md` | 2026-10-10 |
| bump-pydantic 0.8.0 | https://github.com/pydantic/bump-pydantic | Rules BP001–BP009 (Optional defaults, Config → model_config, Field parameters, imports, GenericModel, `__root__`, decorators, `con*` types, TODOs); `--diff`; behaviour on the fixtures (TODO comments for `allow_mutation` and for validators it cannot convert; `@root_validator` and `__root__` left as they are) | README at tag 0.8.0; runs on the fixtures | 2026-10-10 |
| bump-pydantic's dependencies | https://pypi.org/project/bump-pydantic/0.8.0/ | `libcst>=0.4.2`, `rich`, `typer>=0.7.0`, `typing-extensions`: unbounded; typer 0.27 changes argument parsing and typer 0.12 fails with click 8.3, so the tool's environment pins all of them | PyPI metadata; runs | 2026-10-10 |
| pydantic 2.13.5, pydantic-settings 2.15.0 | https://pypi.org/project/pydantic/ | Target versions (newest before the verification cut-off); Python 3.9+ | PyPI | 2026-10-10 |
