---
kind: positive
findings:
  - { rule: check-constraint-check, file: blog/migrations/0001_initial.py, line: 43 }
  - { rule: timezone-utc, file: blog/models.py, line: 5 }
  - { rule: index-together, file: blog/models.py, line: 24 }
  - { rule: check-constraint-check, file: blog/models.py, line: 26 }
  - { rule: format-html-str-format, file: blog/models.py, line: 30 }
  - { rule: test-client-http-headers, file: blog/tests.py, line: 18 }
  - { rule: assert-form-error-response, file: blog/tests.py, line: 23 }
  - { rule: use-l10n, file: blogsite/settings.py, line: 28 }
  - { rule: storage-settings, file: blogsite/settings.py, line: 32 }
  - { rule: storage-settings, file: blogsite/settings.py, line: 33 }
manual_items: 0
---
# Expected report — 01-settings-and-tests

A Django 4.2 blog whose settings, models and tests use what 5.0 and 5.1 remove.

What the migration must do:

- Stage `deprecations-4-2` (django-upgrade --target-version 4.2, still on Django 4.2): `USE_L10N`
  removed; `DEFAULT_FILE_STORAGE` / `STATICFILES_STORAGE` → `STORAGES`; `timezone.utc` →
  `datetime.timezone.utc`; `index_together` → `Meta.indexes`, plus the `RenameIndex` migration
  (`0002_...`) from `makemigrations blog --no-header`; test client `HTTP_X_REQUESTED_WITH=` →
  `headers={...}`; `assertFormError(response, "form", ...)` → `assertFormError(response.context["form"], ...)`.
- Stage `django-5-2`: Django 4.2.30 → 5.2.17; `CheckConstraint(check=)` → `condition=` in the model
  and in `0001_initial.py`; `format_html("...".format(x))` → `format_html("...", x)`.

The same six tests pass on 4.2 and 5.2.
