# Official sources

Every rule, codemod and reference in this pack is based on the documents below. Tool versions are
pinned in `pack.yaml` and were installed and run by the evals on the date shown.

`typescriptlang.org`, `expressjs.com` and `devblogs.microsoft.com` were not reachable from the
environment the pack was written in. Where the "Verified via" column names a GitHub path, the page was
checked against its source in the site's official repository (`microsoft/TypeScript-Website`,
`expressjs/expressjs.com`), which is what the published page is built from.

| Source | URL | Used for | Verified via | Verified |
|---|---|---|---|---|
| TypeScript handbook: Migrating from JavaScript | https://www.typescriptlang.org/docs/handbook/migrating-from-javascript.html | Overall approach: `allowJs` first, rename to `.ts`, `import x = require()` / top-level exports, `@types` packages, turning on `noImplicitAny` / `strictNullChecks` last | `TypeScript-Website` `packages/documentation/copy/en/tutorials/Migrating from JavaScript.md` | 2026-10-09 |
| TypeScript Modules Reference | https://www.typescriptlang.org/docs/handbook/modules/reference.html | `export =` and `import = require()` (section "`export =` and `import = require()`"); `module: node16` keeps `import()` untransformed and implies `esModuleInterop` | `packages/documentation/copy/en/modules-reference/Reference.md` | 2026-10-09 |
| tsconfig reference: `module` | https://www.typescriptlang.org/tsconfig/module.html | Why the pack uses `node16`: output format per file follows the extension and the nearest `package.json` `type` | `packages/tsconfig-reference/copy/en/options/module.md` | 2026-10-09 |
| tsconfig reference: `outDir` | https://www.typescriptlang.org/tsconfig/outDir.html | Build output layout (`dist/`, source structure preserved); `dirname-usage` rule | `packages/tsconfig-reference/copy/en/options/outDir.md` | 2026-10-09 |
| TypeScript handbook: Declaration Merging | https://www.typescriptlang.org/docs/handbook/declaration-merging.html | Fix hints for `req-custom-property` and `prototype-extension` (interface merging, module and global augmentation) | `packages/documentation/copy/en/reference/Declaration Merging.md` | 2026-10-09 |
| TypeScript 6.0 release notes | https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html (also announced at https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/) | `strict` now defaults to `true` and `types` now defaults to `[]`, so the generated `tsconfig.json` sets `strict: false` and `types: ["node"]` explicitly | `packages/documentation/copy/en/release-notes/TypeScript 6.0.md` | 2026-10-09 |
| Express guide: Writing middleware | https://expressjs.com/en/guide/writing-middleware.html | Middleware signature `(req, res, next)`; the guide's own example sets `req.requestTime`, the pattern `req-custom-property` flags | `expressjs.com` `src/content/docs/en/4x/guide/writing-middleware.mdx` | 2026-10-09 |
| Express guide: Error handling | https://expressjs.com/en/guide/error-handling.html | Error handlers are recognised by their four arguments `(err, req, res, next)`; Express 4 does not forward rejected promises to `next` | `src/content/docs/en/4x/guide/error-handling.mdx` | 2026-10-09 |
| `@types/express` 4.17.25 (`@types/express-serve-static-core`) | https://www.npmjs.com/package/@types/express | `Request`, `Response`, `NextFunction`; `ErrorRequestHandler` types `err` as `any`; the global `Express.Request` interface exists for augmentation | Installed package's `index.d.ts` | 2026-10-09 |
| jscodeshift README | https://github.com/facebook/jscodeshift | Transform signature `(fileInfo, api, options)`; returning nothing means "no change"; `export const parser` with `babel`, `babylon`, `flow`, `ts` or `tsx` | Fetched directly | 2026-10-09 |
