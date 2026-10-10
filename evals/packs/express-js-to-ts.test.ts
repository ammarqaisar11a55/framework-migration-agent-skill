// Unit tests for express-js-to-ts codemods, on cases the fixtures do not cover (they would need
// third-party packages installed). The fixtures and `npm run evals` remain the end-to-end check.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { detect } from "../../skills/framework-migration/engine/detect.ts";
import { findPack } from "../../skills/framework-migration/engine/pack.ts";
import { runStage } from "../../skills/framework-migration/engine/run-codemod.ts";

describe("express-js-to-ts cjs-to-esm: third-party packages", () => {
  let root: string;
  const write = (files: Record<string, string>): void => {
    for (const [path, text] of Object.entries(files)) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), text);
    }
  };

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "fm-pack-ts-"));
    write({
      "package.json": '{ "name": "app" }\n',
      "src/app.js": [
        "const helmet = require('helmet');",
        "const morgan = require('morgan');",
        "const cors = require('cors');",
        "const kit = require('named-kit');",
        "const sub = require('named-kit/sub');",
        "",
        "module.exports = [helmet, morgan, cors, kit, sub];",
        "",
      ].join("\n"),
      // Own types, CommonJS entry via exports.require, ES-style default export (like helmet 8).
      "node_modules/helmet/package.json": '{ "name": "helmet", "exports": { "import": "./index.mjs", "require": "./index.cjs" }, "types": "./index.d.cts" }\n',
      "node_modules/helmet/index.cjs": "module.exports = function helmet() {};\n",
      "node_modules/helmet/index.d.cts": "declare function helmet(): void;\nexport { helmet as default };\n",
      // Untyped package with DefinitelyTyped types using `export =`.
      "node_modules/morgan/package.json": '{ "name": "morgan" }\n',
      "node_modules/morgan/index.js": "module.exports = function morgan() {};\n",
      "node_modules/@types/morgan/index.d.ts": "declare function morgan(): void;\nexport = morgan;\n",
      // No types at all.
      "node_modules/cors/package.json": '{ "name": "cors", "main": "./lib/index.js" }\n',
      "node_modules/cors/lib/index.js": "module.exports = function cors() {};\n",
      // Named exports only.
      "node_modules/named-kit/package.json": '{ "name": "named-kit", "main": "lib/index.js" }\n',
      "node_modules/named-kit/lib/index.js": "exports.a = 1;\n",
      "node_modules/named-kit/lib/index.d.ts": "export declare const a: number;\n",
    });
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it("follows each package's type declarations, and keeps import = require() when there are none", async () => {
    const result = await runStage(root, findPack("express-js-to-ts"), "rename-and-modules", { apply: true });
    expect(result.ok).toBe(true);
    // Blank lines are recast's business; the statements are what matter.
    const lines = readFileSync(join(root, "src/app.ts"), "utf8").split("\n").filter((line) => line !== "");
    expect(lines).toEqual(
      [
        "import helmet from 'helmet';",
        "import morgan = require('morgan');",
        "import cors = require('cors');",
        "import * as kit from 'named-kit';",
        "import sub = require('named-kit/sub');",
        "export = [helmet, morgan, cors, kit, sub];",
      ],
    );
  });
});

describe("express-js-to-ts add-ts-tooling: test runners", () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "fm-pack-ts-"));
    mkdirSync(join(root, "test"));
    mkdirSync(join(root, "src"));
    writeFileSync(join(root, "src/app.js"), "module.exports = 1;\n");
    writeFileSync(join(root, "test/app.test.js"), "require('../src/app');\n");
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  const testScript = async (scripts: Record<string, string>, extra: Record<string, string> = {}): Promise<{ script: string; notes: string[] }> => {
    writeFileSync(join(root, "package.json"), `${JSON.stringify({ name: "app", scripts }, null, 2)}\n`);
    for (const [path, text] of Object.entries(extra)) writeFileSync(join(root, path), text);
    const result = await runStage(root, findPack("express-js-to-ts"), "tooling", { apply: true, skipCommands: true });
    expect(result.ok).toBe(true);
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { scripts: Record<string, string> };
    return { script: pkg.scripts["test"] ?? "", notes: result.codemods.flatMap((c) => c.notes) };
  };

  it("points a bare jest at the build output and asks for the runner's types", async () => {
    const { script, notes } = await testScript({ test: "jest --runInBand" });
    expect(script).toBe("npm run build && jest --roots dist --runInBand");
    expect(notes.join("\n")).toContain("add @types/jest");
  });

  it("points a bare mocha at the compiled test directory", async () => {
    expect((await testScript({ test: "mocha" })).script).toBe("npm run build && mocha dist/test");
  });

  it("leaves a configured runner alone and says so", async () => {
    const { script, notes } = await testScript({ test: "jest" }, { "jest.config.js": "module.exports = {};\n" });
    expect(script).toBe("jest");
    expect(notes.join("\n")).toContain('the "test" script (jest) names no source file');
  });
});

describe("express-js-to-ts rules: patterns from the real-repo trial", () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "fm-pack-ts-"));
    mkdirSync(join(root, "src"));
    writeFileSync(join(root, ".eslintrc.js"), "module.exports = { root: true };\n");
    writeFileSync(join(root, "jest.config.js"), "module.exports = {};\n");
    writeFileSync(join(root, "src/app.js"), "const express = require('express');\n\nrequire('dotenv').config();\n");
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it("skips tool configuration and flags a call on a top-level require for review", () => {
    const found = detect(root, findPack("express-js-to-ts")).findings.map((f) => `${f.rule} ${f.file}:${f.line}`);
    expect(found).toEqual(["cjs-require src/app.js:1", "nested-require src/app.js:3"]);
  });
});
