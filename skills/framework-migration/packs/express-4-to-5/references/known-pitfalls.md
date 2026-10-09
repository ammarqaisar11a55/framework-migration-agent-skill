# Known pitfalls

What the pack deliberately does differently from the official codemods, and what it reports instead
of changing. Each entry names the rule that puts it in the migration report.

## Official codemods the pack does not run

`codemods/official-recipe.mjs` runs `@expressjs/v5-migration-recipe` from source, except for:

- **`static-dotfiles` and `sendfile-options`.** They add `dotfiles: 'allow'` to every
  `express.static()` and `res.sendFile()` call "to preserve v4 behavior". Express 4's default was
  neither `allow` nor `ignore`: it served files *inside* dot-directories (`/.well-known/x`) but not
  dotfiles themselves (`/.env`). Measured on Express 4.22.3: `GET /.env` is 404 by default and 200
  with `dotfiles: 'allow'`. Running these codemods would start serving `.env`, `.git/config` and
  similar files. Rules `static-dotfiles` and `sendfile-dotfiles` report each call instead. If a
  dot-directory must stay public, mount it on its own, as the migration guide shows:
  `app.use('/.well-known', express.static('public/.well-known', { dotfiles: 'allow' }))`.
- **`route-del-to-delete`.** It renames every `.del(<string>, ...)` to `.delete(...)`, including
  cache and Redis clients (`cache.del('key')`), which would break them. `route-del.js` renames only
  calls that look like route registrations: a path starting with `/` or `*`, a RegExp or an array,
  followed by a handler. Rule `app-del` uses the same test.
- **The `package.json` step of `static-mime`** when the project does not use `express.static.mime`:
  it adds `mime-types` to every Express project otherwise.

## Gaps the pack fills

- **`req.acceptsLanguage('en', 'fr')`** — the official `pluralize-method-names` codemod only
  rewrites calls with zero or one argument. `accepts-plural.js` covers any arity.
- **Route path syntax** — no official codemod rewrites paths. `path-syntax.js` does; see
  `path-syntax.md` for what it rewrites and what it reports.
- **Changed defaults** — `query-parser.js` and `urlencoded-extended.js` pin Express 4's defaults
  (`app.set('query parser', 'extended')`, `urlencoded({ extended: true })`). Both settings are valid
  on Express 4, so stage `preserve-defaults` runs before the upgrade and its gate still runs on
  Express 4. Whether to drop them later is a product decision; the report lists them.

## Official codemods whose output needs a look

- **`explicit-request-params`** rewrites `req.param('id')` to `req.params.id`. Express 4's
  `req.param()` also looked in `req.body` and `req.query`. If a value arrived in the body or query
  string, the rewritten code no longer sees it. Rule `req-param` keeps this in the report's
  findings table; check each call whose name is not a route parameter.
- **`status-send-order`** rewrites `x.send(200)` to `x.sendStatus(200)` for any object it can
  resolve in the file, so a WebSocket's `ws.send(1)` can be rewritten too (read from its source,
  not observed); read the stage diff.
- **`back-redirect-deprecated`** writes `req.get("Referrer") || "/"` with double quotes, whatever
  the file uses. Run the project's formatter afterwards if that matters.

## Behaviour changes reported, not changed

| Change | Rule | What to check |
|---|---|---|
| `req.query` is a getter; writes are lost or throw | `req-query-write` | Copy values to a local or `res.locals` |
| `req.params` has a null prototype (string paths) | `req-params-prototype` | `Object.hasOwn(req.params, name)` |
| `req.host` keeps the port | `req-host` | Use `req.hostname` for the name alone |
| `res.clearCookie` ignores `maxAge` / `expires` | `clear-cookie-options` | Usually nothing; the cookie is still cleared |
| `app.param(fn)` / `router.param(fn)` removed | `param-function` | Move the logic into `param(name, fn)` or a middleware |
| `app.param(':id', fn)` no longer strips the colon | `param-leading-colon` | Remove the colon |
| `router.param([...])` throws | `router-param-array` | One `router.param(name, fn)` per name |
| Route paths the codemods cannot see | `dynamic-route-path`, `computed-route-method` | Check the values against `path-syntax.md` |

Not detected by any rule, listed for the agent's own review (all from the migration guide):

- `req.body` is `undefined` when no body parser ran; Express 4 gave `{}`. Code such as
  `Object.keys(req.body)` in a route without a parser throws.
- `res.status()` accepts only integers from 100 to 999; `res.vary()` without a field throws.
- `app.listen(port, cb)` passes server errors (e.g. `EADDRINUSE`) to `cb` instead of throwing.
- Rejected promises from handlers now reach the error handler. Code that relied on them being
  unhandled (a process-level `unhandledRejection` handler) behaves differently.
- `.js` files are served as `text/javascript` instead of `application/javascript` (mime-db update).
- Router debug logs moved from `express:router` to `router` / `router:*` (`DEBUG=...`).
- Express 5 requires Node.js 18 or newer.

## Evals

The fixtures pin `express` 4.22.3; the upgrade writes `^5.0.0`, so the evals install the newest
Express 5 at the time they run (5.3.0 when the pack was written). Because the pack runs official
tools and changes a dependency's version, the evals install each fixture on its own and run the
stage commands for real (network access to npm and GitHub is needed).
