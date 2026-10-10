---
kind: negative
findings:
  - { rule: urlfield-assume-scheme, file: links/forms.py, line: 6 }
  - { rule: format-html-no-args, file: links/models.py, line: 12 }
  - { rule: save-positional-arguments, file: links/models.py, line: 16 }
manual_items: 3
must_remain:
  - { file: links/forms.py, contains: "url = forms.URLField()" }
  - { file: links/models.py, contains: "return format_html('<a href=\"%s\">%s</a>' % (self.url, self.title))" }
  - { file: links/models.py, contains: "self.save(False, False, None, [\"clicks\"])" }
---
# Expected report — 04-deprecated-until-6 (negative)

Code that Django 5.2 still runs, with a `RemovedInDjango60Warning`, and that no django-upgrade fixer
rewrites:

- `forms.URLField()` without `assume_scheme` (the default for scheme-less input becomes https in 6.0;
  choosing is a product decision);
- `format_html()` with a `%`-formatted template (only `"...".format(...)` is rewritten; passing the
  values as arguments also starts escaping them);
- `Model.save()` with positional arguments.

The migration upgrades Django and leaves all three as they are; the tests pass on 5.2.

Manual follow-ups (3): one per construct, before upgrading to Django 6.0.
