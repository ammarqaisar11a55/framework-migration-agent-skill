# Route path syntax: Express 4 → 5

Express 5 uses path-to-regexp 8. `path-syntax.js` rewrites the Express 4 forms below; the migration
guide's "Path route matching syntax" section is the source. Each rewrite was checked by registering
the old path on Express 4.22.3 and the new one on Express 5.3.0 and requesting the same URLs:
`/`, `/users`, `/users/`, `/users/7`, `/files`, `/files/`, `/files/a/b.txt`, `/report`,
`/report.csv`, `/x/y`. The set of matching URLs was identical for every pair.

| Express 4 | Express 5 | Matches | Parameter values |
|---|---|---|---|
| `/users/:id?` | `/users{/:id}` | same | unmatched `id` is absent instead of `undefined` |
| `/:file.:ext?` | `/:file{.:ext}` | same | unmatched `ext` is absent |
| `*` | `/{*splat}` | same | `req.params[0]` (`'/a/b'`) → `req.params.splat` (`['a', 'b']`) |
| `/*` | `/{*splat}` | same | `req.params[0]` (`'a/b'`) → `req.params.splat` (`['a', 'b']`) |
| `/files/*` | `/files/{*splat}` | same | as above; empty match → `splat` absent |

A wildcard becomes `{*splat}` rather than `*splat` because Express 4's `*` compiled to `(.*)`, which
also matches the empty string: `/*` matched `/`. `*splat` alone needs at least one character.

## What is not rewritten

- **Regular-expression syntax in strings** — `(`, `)`, `[`, `]`, `+`, `!`, and `?` anywhere but after
  a parameter. Includes custom parameter patterns such as `/:id(\\d+)`, which Express 5 no longer
  supports. Rule `route-reserved-chars`. Rewrite as an array of paths, a `RegExp` object, or
  validate the value in the handler.
- **Wildcards when the project reads `req.params` by index** — renaming the wildcard changes where
  its value is, and the value becomes an array. Rule `req-params-index`. Change the reads to
  `req.params.splat` (`.join('/')` gives the old string) and the wildcard to `{*splat}` together.
- **Paths that are not string literals** — variables, template literals with expressions, paths built
  at runtime. Rule `dynamic-route-path`.
- **Calls through a computed method** — `app[method](path, ...)`. Rule `computed-route-method`.
