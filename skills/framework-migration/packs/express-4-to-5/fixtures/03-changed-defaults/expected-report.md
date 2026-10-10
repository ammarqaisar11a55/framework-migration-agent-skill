---
kind: positive
findings:
  - { rule: query-parser-default, file: src/app.js, line: 3 }
  - { rule: urlencoded-extended-default, file: src/app.js, line: 5 }
manual_items: 0
---
# Expected report — 03-changed-defaults

An app that relies on two Express 4 defaults that Express 5 changes: nested query strings
(`?filter[role]=admin`) and nested urlencoded form fields (`user[name]=...`). It also passes errors
from an `async` handler to `next` by hand.

What the migration must do (stage `preserve-defaults`, still on Express 4):

- Add `app.set('query parser', 'extended')` right after `const app = express()`.
- `express.urlencoded()` → `express.urlencoded({ extended: true })`.
- Leave the `try`/`catch` + `next(err)` in the async handler alone: it still works on Express 5,
  and removing it would be a refactor, not a migration.

Without these two settings the nested-object tests fail on Express 5. Manual follow-ups: none.
