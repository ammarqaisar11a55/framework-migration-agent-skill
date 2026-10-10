// Unit tests for node-cjs-to-esm decisions the fixtures do not cover. The fixtures and
// `npm run evals -- node-cjs-to-esm` are the end-to-end check.
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { matchPacks } from "../../skills/framework-migration/engine/detect-stack.ts";
import { findPack } from "../../skills/framework-migration/engine/pack.ts";
import { runStage } from "../../skills/framework-migration/engine/run-codemod.ts";

describe("node-cjs-to-esm to-esm.js", () => {
  let root: string;
  const write = (files: Record<string, string>): void => {
    for (const [path, text] of Object.entries(files)) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), text);
    }
  };
  const read = (path: string): string => readFileSync(join(root, path), "utf8");
  const esm = async (): Promise<string[]> => {
    const result = await runStage(root, findPack("node-cjs-to-esm"), "esm", { apply: true });
    expect(result.ok).toBe(true);
    return result.codemods.flatMap((c) => c.notes);
  };

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "fm-esm-"));
    write({ "package.json": '{ "name": "app" }\n' });
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it("keeps files CommonJS for module.id, top-level this and unknown computed paths, and says why", async () => {
    write({
      "src/id.js": "exports.id = module.id;\n",
      "src/self.js": "this.ready = true;\n",
      "src/load.js": "exports.load = (name) => require(name);\n",
      "src/main.js": "const { id } = require('./id');\nconst { load } = require('./load');\nrequire('./self');\nmodule.exports = { id, load };\n",
    });
    const notes = (await esm()).join("\n");
    expect(existsSync(join(root, "src/id.cjs"))).toBe(true);
    expect(existsSync(join(root, "src/self.cjs"))).toBe(true);
    expect(existsSync(join(root, "src/load.cjs"))).toBe(true);
    expect(notes).toContain("uses the module object");
    expect(notes).toContain("uses `this` at the top level");
    expect(notes).toContain("computed path whose directory cannot be determined");
    expect(read("src/main.js")).toBe(
      ["import idModule from './id.cjs';", "const { id } = idModule;", "import loadModule from './load.cjs';", "const { load } = loadModule;", "import './self.cjs';", "export { id, load };", ""].join("\n"),
    );
    expect(JSON.parse(read("package.json"))).toEqual({ name: "app", type: "module" });
  });

  it("imports an ES module package as a namespace, as require() returned it", async () => {
    write({
      "node_modules/esm-only/package.json": '{ "name": "esm-only", "type": "module", "exports": "./index.js" }\n',
      "node_modules/esm-only/index.js": "export const answer = 42;\n",
      "node_modules/cjs-pkg/package.json": '{ "name": "cjs-pkg" }\n',
      "src/main.js": "const lib = require('esm-only');\nconst cjs = require('cjs-pkg');\nmodule.exports = lib.answer + cjs;\n",
    });
    await esm();
    expect(read("src/main.js")).toBe("import * as lib from 'esm-only';\nimport cjs from 'cjs-pkg';\nexport default lib.answer + cjs;\n");
  });

  it("matches only CommonJS packages", () => {
    const pack = findPack("node-cjs-to-esm");
    const stack = (moduleType: "commonjs" | "module") => ({ ecosystem: "node" as const, manifest: "package.json", language: "javascript", moduleType, frameworks: [{ name: "node", version: "*" }] });
    expect(matchPacks([stack("commonjs")], [pack])).toHaveLength(1);
    expect(matchPacks([stack("module")], [pack])).toHaveLength(0);
  });
});
