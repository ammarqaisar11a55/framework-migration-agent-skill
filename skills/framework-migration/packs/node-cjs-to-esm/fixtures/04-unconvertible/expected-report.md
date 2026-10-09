---
kind: negative
findings:
  - { rule: import-hoisting, file: src/boot.js, line: 2 }
  - { rule: cjs-require, file: src/boot.js, line: 3 }
  - { rule: cjs-require, file: src/boot.js, line: 4 }
  - { rule: require-main, file: src/boot.js, line: 10 }
  - { rule: nested-require, file: src/boot.js, line: 11 }
  - { rule: cjs-exports, file: src/boot.js, line: 14 }
  - { rule: cjs-exports, file: src/mode.js, line: 1 }
  - { rule: cjs-require, file: src/plugins/index.js, line: 1 }
  - { rule: cjs-require, file: src/plugins/index.js, line: 2 }
  - { rule: dirname-filename, file: src/plugins/index.js, line: 7 }
  - { rule: dynamic-require, file: src/plugins/index.js, line: 10 }
  - { rule: dirname-filename, file: src/plugins/index.js, line: 10 }
  - { rule: cjs-exports, file: src/plugins/index.js, line: 13 }
  - { rule: cjs-exports, file: src/plugins/reverse.js, line: 1 }
  - { rule: cjs-exports, file: src/plugins/shout.js, line: 1 }
  - { rule: cjs-exports, file: src/words.js, line: 1 }
  - { rule: cjs-require, file: test/boot.test.js, line: 1 }
  - { rule: cjs-require, file: test/boot.test.js, line: 2 }
  - { rule: cjs-require, file: test/boot.test.js, line: 3 }
  - { rule: cjs-require, file: test/boot.test.js, line: 4 }
manual_items: 4
must_remain:
  - { file: src/boot.cjs, contains: "process.env.APP_MODE = process.env.APP_MODE || 'test';" }
  - { file: src/boot.cjs, contains: "delete require.cache[require.resolve('./mode.cjs')];" }
  - { file: src/plugins/index.js, contains: ".map((file) => require(path.join(__dirname, file)));" }
---
# Expected report — 04-unconvertible (negative)

Code that cannot become an ES module without changing behaviour. It must be flagged and kept
CommonJS, and the package must still work as `"type": "module"`.

- `src/boot.js` sets `process.env.APP_MODE` before requiring `./mode`, which reads it on load. ES
  modules evaluate imports first, so converting would change the mode (`import-hoisting`). It also
  clears `require.cache` to reload a module (`require-main`). It stays CommonJS as `src/boot.cjs`;
  `require('./mode')` and `require.resolve('./mode')` are retargeted to `./mode.cjs`, because
  CommonJS resolution does not try the `.cjs` extension.
- `src/mode.js` exports a single value required by `boot.cjs`: it stays CommonJS as `src/mode.cjs`.
- `src/plugins/` is loaded with `require(path.join(__dirname, file))` (`dynamic-require`). Its files
  keep their names and syntax, and the directory gets a `package.json` with `"type": "commonjs"`.
- `src/words.js` and the test convert as usual.

Manual follow-ups: 4 — `import-hoisting`, `require-main`, the lazy `nested-require` in `reloadMode`, and `dynamic-require`.
