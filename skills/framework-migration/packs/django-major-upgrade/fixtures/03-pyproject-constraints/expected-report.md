---
kind: positive
findings:
  - { rule: check-constraint-check, file: events/migrations/0001_initial.py, line: 60 }
  - { rule: index-together, file: events/models.py, line: 11 }
  - { rule: check-constraint-check, file: events/models.py, line: 23 }
  - { rule: format-html-str-format, file: events/models.py, line: 27 }
  - { rule: timezone-utc, file: events/models.py, line: 30 }
manual_items: 0
---
# Expected report — 03-pyproject-constraints

A project that declares Django in `pyproject.toml` (`Django>=4.2,<5.0`) and installs from a
`pip-compile`d `requirements.txt` (`django==4.2.30`).

What the migration must do:

- Stage `deprecations-4-2`: `index_together` → `Meta.indexes` with a `RenameIndex` migration
  (`0002_...`, app with existing migrations); `timezone.utc` → `dt.timezone.utc`.
- Stage `django-5-2`: Django pinned to 5.2.17 in both files; `CheckConstraint(check=)` →
  `condition=`; `format_html("...".format(...))` → `format_html("...", ...)`.
