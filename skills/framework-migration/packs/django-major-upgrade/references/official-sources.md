# Official sources

`docs.djangoproject.com` and `django-upgrade.readthedocs.io` were not reachable from the environment
the pack was written in. Both are built from their repositories, which were read instead: Django's
docs at tag `5.2.17` and `4.2.30`, django-upgrade's at tag `1.32.0` (commit `e668ea85`).

| Source | URL | Used for | Verified via | Verified |
|---|---|---|---|---|
| How to upgrade Django | https://docs.djangoproject.com/en/5.2/howto/upgrade-version/ | Resolve deprecation warnings on the current version before upgrading (`python -Wa manage.py test`); read the release notes and deprecation timeline; third-party packages | `django/django` `docs/howto/upgrade-version.txt` | 2026-10-10 |
| Django 5.0 / 5.1 / 5.2 release notes | https://docs.djangoproject.com/en/5.2/releases/ | Removals in 5.0 (`USE_L10N`, `timezone.utc`, `SERIALIZE`, `CSRF_COOKIE_MASKED`, `assertFormError(response, ...)`, LogoutView GET) and 5.1 (`DEFAULT_FILE_STORAGE` / `STATICFILES_STORAGE`, `index_together`, `length_is`, `get_storage_class()`, `make_random_password()`, `assertQuerysetEqual()`); deprecations in 5.0 (`format_html()` without args, `URLField` default scheme), 5.1 (`CheckConstraint(check=)`, positional `save()` arguments) and 5.2 (`find(all=)`); Python support (5.2: 3.10–3.14) | `docs/releases/5.0.txt`, `5.1.txt`, `5.2.txt` | 2026-10-10 |
| Django 4.2 release notes | https://docs.djangoproject.com/en/5.2/releases/4.2/ | Python 3.8–3.12 for 4.2; `STORAGES`, test client `headers=` | `docs/releases/4.2.txt` (tag 4.2.30) | 2026-10-10 |
| django-upgrade fixers | https://django-upgrade.readthedocs.io/en/latest/fixers.html | Which fixer runs for which `--target-version` (4.2: `settings_storages`, `test_http_headers`, `index_together`, `assert_set_methods`; 4.1: `utils_timezone`, `assert_form_error`; 4.0: `use_l10n`; 5.0: `format_html` (only `"...".format(...)`), `model_field_choices`; 5.1: `check_constraint_condition`; 5.2: `staticfiles_find_all`); no dry-run mode; exit status 1 when files change | `adamchainz/django-upgrade` `docs/fixers.rst`, `src/django_upgrade/fixers/format_html.py`; runs on the fixtures | 2026-10-10 |
| `makemigrations --no-header` | https://docs.djangoproject.com/en/5.2/ref/django-admin/#makemigrations | The RenameIndex migration for converted `index_together`, without a timestamped header | `docs/ref/django-admin.txt`; runs on the fixtures | 2026-10-10 |
