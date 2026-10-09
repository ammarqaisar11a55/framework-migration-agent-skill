# Official sources

Every rule, codemod and reference in this pack is based on the documents and tools below.
`expressjs.com` and `app.codemod.com` (the Codemod registry) were not reachable from the
environment the pack was written in. The migration guide was checked against its source in the
site's repository (`expressjs/expressjs.com`), which the published page is built from, and the
official codemods were run from their source repository, as its README documents.

| Source | URL | Used for | Verified via | Verified |
|---|---|---|---|---|
| Express: Migrating to Express 5 | https://expressjs.com/en/guide/migrating-5.html | Every rule: removed APIs, path syntax, changed defaults (`query parser`, `urlencoded` `extended`, `express.static` `dotfiles`), changed behaviour (`req.query` getter, `req.params` null prototype, `req.host`, `res.clearCookie`, `router.param` arrays); Node.js 18 or newer | `expressjs/expressjs.com` `src/content/pages/en/guide/migrating-5.mdx` | 2026-10-09 |
| Express codemods (`@expressjs/v5-migration-recipe` 1.1.0 and the codemods it references) | https://github.com/expressjs/codemod | Stage `api-codemods` and the `package.json` part of stage `upgrade`; run from source at commit `2f7f1e5f31ebab6e840957b0cf171a014ad7a3b9` (pinned in `pack.yaml`) by `codemods/official-recipe.mjs` | Repository README ("From source"), each codemod's `workflow.yaml`, `src/` and tests at that commit | 2026-10-09 |
| `codemod` CLI 1.18.3 | https://www.npmjs.com/package/codemod | `codemod workflow run -w <workflow> -t <dir> --allow-dirty --no-interactive --disable-analytics`; its `--dry-run` prints no diff, so the runner diffs a scratch copy itself | `codemod workflow run --help` of the installed version | 2026-10-09 |
| Express 5.3.0 (npm) | https://www.npmjs.com/package/express | Target version the evals ran against (`latest` dist-tag); the recipe writes `^5.0.0` | `npm view express dist-tags` | 2026-10-09 |
| Express guide: Error handling | https://expressjs.com/en/guide/error-handling.html | Express 5 forwards rejected promises from handlers to the error handler; existing `try`/`catch` + `next(err)` keeps working | `src/content/docs/en/5x/guide/error-handling.mdx` | 2026-10-09 |
| serve-static 1.16.3 (Express 4.22.3) and Express 5.3.0, run locally | https://github.com/expressjs/serve-static | Why the pack does not run `static-dotfiles` / `sendfile-options`: on Express 4 the default served `/.well-known/x` but not `/.env`; `dotfiles: 'allow'` serves both | Measured: `GET /.env` 404 by default, 200 with `allow` (Express 4.22.3) | 2026-10-09 |
| Route matching, Express 4.22.3 vs 5.3.0, run locally | https://expressjs.com/en/guide/migrating-5.html | The path rewrites in `path-syntax.js`; see `path-syntax.md` for the table | Measured with the same URLs on both versions | 2026-10-09 |
