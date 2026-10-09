# Known pitfalls

Things the codemods deliberately do not touch, and why. Each entry says how the case is recognised
and what goes into the migration report as a manual item.

## Dynamic `require()` — rule `dynamic-require` (error, manual)

`require(path.join(__dirname, file))` and ``require(`./plugins/${name}`)`` load a module chosen at
runtime. There is no static import to convert them to, so the call stays as it is and is typed `any`.

Check by hand:

- Every module the loader can reach keeps its CommonJS shape. `cjs-to-esm.js` converts a module
  that nothing imports statically to `export =`, so `module.exports` stays what the loader reads.
  A module that is both imported statically and loaded dynamically needs a decision: the static
  importers must use `import x = require()` and the module must stay `export =`.
- The path still resolves after the build. Directory scans filter on file extensions: in `dist/`
  the files are `.js` again, but any filter written against `.ts` or source paths will break.

## Lazy or conditional `require()` — rule `nested-require` (warn, manual)

A `require('x')` inside a function or `if` loads `x` only when that code runs. Hoisting it to a
top-level import changes load order and start-up cost, and can create import cycles that did not
exist before. It is left unchanged and typed `any`. Convert it by hand to a top-level import if
eager loading is acceptable, or to `await import('x')` if the function can become `async`.

## `__dirname` and `__filename` — rule `dirname-usage` (info, manual)

After the build the code runs from `dist/`. `tsc` emits `.js` files only; views, static assets,
SQL files and JSON that is not imported are not copied. Paths such as
`path.join(__dirname, 'views')` then point at a directory that does not exist under `dist/`. Fix
by copying the assets as part of `build`, or by resolving them from the project root instead.

Under `module: node16` both names remain available, because files without `"type": "module"` still
compile to CommonJS. They are not available in `.mts` files.

## Custom properties on `req` — rule `req-custom-property` (error, manual)

`req.user = ...` and similar fail type-checking. See `type-patterns.md` for the two fixes. Do not
cast `req` to `any` to silence it: that drops the typing for the whole handler.

## Prototype extension — rule `prototype-extension` (error, manual)

`String.prototype.titleCase = ...` or `Foo.prototype.bar = ...` on a type that does not declare the
member. Declare the member with interface merging (global augmentation for built-ins), or move the
helper to a plain function. Never change what the code does at runtime.

## Async handlers in Express 4

Express 4 does not pass rejected promises to `next`. Adding types does not change that, and the
codemods must not add `try`/`catch` or a wrapper, because that would change behaviour. If the app
relies on an `async` handler throwing, record it in the report; the fix belongs to the
`express-4-to-5` migration or to the app's own error handling.

## Files the pack treats specially

- `.mjs` files are renamed to `.mts` but their syntax is left alone; they are already ES modules.
- `.cjs` files are converted like `.js` files and renamed to `.cts`, so they still compile to
  CommonJS.
- JSON files are imported with `resolveJsonModule`; they are not converted.
- Tool configuration stays JavaScript: dotfiles (`.eslintrc.js`) and `*.config.js` / `.cjs` / `.mjs`
  are loaded by tools, not by the app. Every other JavaScript file, including `scripts/`, is
  converted, and its top-level directory is added to the `tsconfig.json` `include` list. Check that
  scripts run from `package.json` still point at the right files after the build.

## Lint is not part of the gate

The pack does not run a linter in its checks: a JavaScript ESLint config usually does not parse
TypeScript, and fixing that is a separate migration (`eslint-flat-config` plus `typescript-eslint`).
Run the project's linter by hand after the migration and record new warnings in the report.
