# Known pitfalls

**Two stages, as the Django guide suggests.** Stage `deprecations-4-2` applies django-upgrade's fixers
up to 4.2 while the project still runs 4.2, so the gate tests those changes alone. Stage
`django-5-2` upgrades Django and applies the 5.0–5.2 fixers. Run the tests with warnings enabled
(`python -Wa manage.py test`) before starting: anything the fixers do not cover shows up there.

**`index_together` needs a migration.** The fixer rewrites the model to `Meta.indexes`; Django then
expects a `RenameIndex` migration. The stage runs `python manage.py makemigrations <app> --noinput
--no-header` for each app whose models changed this way, in the project's environment. If the app
already had unrelated model changes without migrations, they end up in the same migration: check the
stage diff. Historical `AlterIndexTogether` operations in old migrations keep working.

**`format_html()` starts escaping.** Calls like `format_html("<b>{}</b>".format(value))` are rewritten
to `format_html("<b>{}</b>", value)`. That is the fix Django asks for, and it escapes `value`:
values that contained HTML on purpose now show as text. `%`-formatted and f-string templates are not
rewritten (rule `format-html-no-args`) and stay unescaped until fixed by hand.

**Migrations are rewritten too.** `CheckConstraint(check=...)` becomes `condition=` in existing
migration files as well as in models. That is safe (the migration's effect is unchanged) and
required before Django 6.0.

**Dependencies.** Only Django's own pin changes (`requirements*.txt`, `pyproject.toml` PEP 621 or
Poetry). Third-party packages pinned to versions without Django 5.2 support make the install fail;
upgrade them first. The install step supports `uv.lock` (`uv sync`), `poetry.lock`
(`poetry install`) and `requirements.txt` (`pip install -r`), in the active environment.

**Python versions.** Django 4.2 supports Python 3.8–3.12, Django 5.2 3.10–3.14. Projects on Python
3.8 or 3.9 must move to 3.10+ before the second stage.

**Behaviour changes the fixers do not cover.** Logging out with a GET request no longer works (use a
POST form); `USE_L10N = False` is gone, so dates and numbers follow the active locale; a
`forms.URLField` without `assume_scheme` keeps `http` until 6.0, then `https`. Rules flag these.

**Generated migrations follow `black` if it is on PATH.** `makemigrations` formats new migration
files with `black` when it finds it; otherwise they are written in Django's own style. The content
(the operations) is the same either way.
