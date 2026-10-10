# Known pitfalls

`to-esm.js` converts a file only when the result evaluates to exactly what the CommonJS file did.
Everything else stays CommonJS, and the migration report lists each file with its reason (stage
notes). This page explains those reasons and what to do about them by hand.

## Import hoisting — rule `import-hoisting`

ES modules evaluate every `import` before the importing module's body. In CommonJS, a statement
between two `require()` calls runs before the second module loads. Converting a file like this
changes what `./mode` sees:

```js
process.env.APP_MODE = process.env.APP_MODE || 'test';
const mode = require('./mode'); // reads APP_MODE when it loads
```

Such files stay CommonJS (`.cjs`). The codemod recognises assignments to `process.env.*`,
`global.*` / `globalThis.*`, `.config()` calls (dotenv-style loaders), and calls on a `require()`
result. Other top-level statements (for example `app.use(...)`) are assumed not to affect modules
loaded after them; check the stage diff if the project relies on load order in other ways.

`require('dotenv').config()` with no arguments is the one pattern converted in place: it becomes
`import 'dotenv/config'`, which runs at the same point in the import order. To convert a hoisting
file by hand, move the side effect into its own module and import that module first.

## Modules that are still `require()`d

`require()` of an ES module returns its namespace object (Node.js 20.19+). For a module with named
exports that is the same shape as before; for `module.exports = value` it is not (the value moves to
`.default`). So a module that exports a single value stays CommonJS when something still requires
it: a file kept CommonJS, or a lazy `require()` left in an ES module. Those modules in turn keep their
own dependencies' shapes, so the effect can cascade. The stage notes name the requirer for each.

## Lazy and computed `require()` — rules `nested-require`, `dynamic-require`

- A `require()` inside a function stays a `require()` call. The ES module gets
  `const require = createRequire(import.meta.url)`, so it loads at the same moment as before.
- A computed path whose directory is known (`path.join(__dirname, file)`, `` `./plugins/${name}` ``)
  makes that directory a CommonJS island: its files keep their names and syntax, and it gets a
  package.json with `"type": "commonjs"`. Their loader keeps working, including filters on `.js`.
- A computed path whose directory cannot be determined keeps the file CommonJS (`.cjs`). Check what
  it can load: an ES module loaded that way comes back as a namespace.

## No ES module equivalent — rules `require-main`, `module-object`, `top-level-this`

`require.main`, `require.cache`, `require.extensions`, `module.id` / `module.parent` and top-level
`this` keep the file CommonJS. `require.main === module` has an ES module equivalent,
`import.meta.main`, only from Node.js 22.18 / 24.2, and it is still marked early development, so the
pack does not use it.

## Renamed files

A file kept CommonJS is renamed `.js` → `.cjs`. The codemod updates:

- `require()` and `require.resolve()` specifiers that point at it, in CommonJS files and in the
  `createRequire` calls of ES modules — CommonJS resolution does not try the `.cjs` extension;
- imports in converted files;
- `main`, `bin`, `scripts` and `exports` in package.json.

It cannot update paths built at runtime, documentation, or other repositories that deep-import the
file. Search for the old name.

## Tool configuration

`.eslintrc.js`, `jest.config.js` and other `*.config.js` files written in CommonJS are renamed `.cjs`;
the tools that read them accept that extension. Configuration already written as an ES module is
left alone.

## Strict mode

ES modules are always strict. `'use strict'` is removed, and sloppy-mode code — assignments to
undeclared variables, `with`, octal literals, duplicate parameter names — now throws. The test
suite usually catches it; read the stage diff for files without tests.

## Packages

- Built-ins (`fs`, `node:path`) are imported by name when destructured.
- Other packages get a default import (= `module.exports` for a CommonJS package) followed by the
  original destructuring, which does not rely on Node's static detection of CommonJS named
  exports. ES module packages (`"type": "module"`) get a namespace import, which is what
  `require()` returned for them.

## Test runners

`node --test` runs ES modules as they are. Jest needs `--experimental-vm-modules` (rule
`jest-runner`); Mocha and Vitest handle ES modules without flags.
