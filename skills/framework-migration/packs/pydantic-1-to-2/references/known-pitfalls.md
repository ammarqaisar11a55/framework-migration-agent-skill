# Known pitfalls

**bump-pydantic is the start, not the end.** It rewrites config classes, simple validators, `Field`
arguments, imports and `Optional` defaults, and leaves `# TODO[pydantic]` comments where it cannot.
The stage then fixes what v2 rejects at import time (`allow_mutation`, bare `@root_validator`), and
everything else is reported: search for `TODO[pydantic]` after the stage.

**Bare `@root_validator`.** v2 refuses it unless `skip_on_failure=True`. The stage adds that, which
keeps the validator's signature (values dict in, values dict out) but stops it running when a field
already failed; the ValidationError raised is the same. Port it to `@model_validator(mode="after")`
(it receives the model instance) when convenient.

**Validators bump-pydantic cannot convert** (`each_item=True`, `always=True`, a `values` argument)
stay `@validator`, which v2 still runs with a deprecation warning. Port them before Pydantic 3.

**Deprecated methods keep working, with one output change.** `parse_obj`, `from_orm`, `construct`,
`.dict()`, `.json()`, `.copy(update=...)` still work in v2 and warn. `.json()` / `model_dump_json()`
now produce compact JSON (`{"a":1}` instead of `{"a": 1}`): code or tests that compare JSON strings
change; compare parsed values.

**Settings.** `BaseSettings` is in the `pydantic-settings` package; the stage adds it to
`requirements.txt` when the code imports it (or notes it for `pyproject.toml`). Lists and dicts from
environment variables are parsed as JSON in both versions.

**`__root__` models are not converted.** v2 raises at class creation for `__root__`; rewrite them as
`RootModel[...]` and change `.__root__` accesses to `.root` before the stage gate can pass.

**Pinned tool environment.** bump-pydantic 0.8.0 (its last release) does not bound typer or click;
current typer releases parse its arguments differently and older typer fails with click 8.3. The
pack installs it with libcst, typer, click, rich and typing-extensions pinned, in its own virtualenv
under `~/.cache/framework-migration`.

**Dependencies.** Only pydantic (and pydantic-settings) change. Libraries that require Pydantic 1
(older FastAPI, SQLModel, ...) make the install fail; upgrade them in the same change. The install
step supports `uv.lock`, `poetry.lock` and `requirements.txt`.
