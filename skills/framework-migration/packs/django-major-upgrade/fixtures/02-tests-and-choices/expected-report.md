---
kind: positive
findings:
  - { rule: assert-form-error-response, file: shop/tests.py, line: 15 }
  - { rule: test-client-http-headers, file: shop/tests.py, line: 23 }
  - { rule: assert-form-error-response, file: shop/tests.py, line: 40 }
  - { rule: staticfiles-find-all, file: shop/views.py, line: 25 }
manual_items: 0
---
# Expected report — 02-tests-and-choices

A shop app with formsets, a module-level `TextChoices` enumeration and a staticfiles lookup.

What the migration must do:

- Stage `deprecations-4-2`: `assertQuerysetEqual` → `assertQuerySetEqual`; `assertFormsetError(response, "formset", ...)`
  → `assertFormSetError(response.context["formset"], ...)`; `HTTP_ACCEPT=` → `headers={"accept": ...}`.
- Stage `django-5-2`: `choices=Size.choices` → `choices=Size`; `finders.find(..., all=True)` →
  `find_all=True`; Django 5.2.17.

Tests pass without deprecation warnings on 5.2.
