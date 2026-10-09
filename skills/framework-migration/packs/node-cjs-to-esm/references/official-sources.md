# Official sources

| Source | URL | Used for | Verified |
|---|---|---|---|
| Node.js: ECMAScript modules | https://nodejs.org/api/esm.html | Mandatory file extensions in specifiers; `import.meta.dirname` / `filename` (added 20.11.0); JSON modules and `with { type: 'json' }` (no longer experimental in 20.18.3 / 22.12.0); importing CommonJS gives `module.exports` as the default export; "Differences between ES modules and CommonJS" (no `require`, `exports`, `__dirname`, `require.main`, `require.cache`, `require.extensions`); `import.meta.main` (22.18 / 24.2, early development) | 2026-10-09 |
| Node.js: Modules (CommonJS) — "Loading ECMAScript modules using require()" | https://nodejs.org/api/modules.html#loading-ecmascript-modules-using-require | `require()` of an ES module returns its namespace; unflagged and without a warning from 20.19.0 / 22.12.0 — why modules that export a single value and are still required stay CommonJS, and why `engines.node` becomes `>=20.19.0` | 2026-10-09 |
| Node.js: Packages — `"type"` | https://nodejs.org/api/packages.html#type | `.js` files follow the nearest parent package.json's `"type"`; a nested package.json with `"type": "commonjs"` keeps a directory CommonJS; `.cjs` is always CommonJS | 2026-10-09 |
| Node.js: `module.createRequire(filename)` | https://nodejs.org/api/module.html#modulecreaterequirefilename | The shim that keeps lazy and computed `require()` calls working inside ES modules | 2026-10-09 |
| jscodeshift README | https://github.com/facebook/jscodeshift | Transform signature, `export const parser` | 2026-10-09 |

All Node.js pages were read from `nodejs.org/api/*.md` (the docs' Markdown sources) for the
current release line.
