import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildInventory } from "./inventory.ts";
import { validate } from "./schema.ts";
import type { Inventory, InventoryFile } from "./types.ts";

const FILES: Record<string, string> = {
  "package.json": JSON.stringify({ main: "src/server.js", scripts: { start: "node src/server.js" }, dependencies: { express: "^4.18.2" } }),
  "src/server.js": "const app = require('./app');\napp.listen(3000);\n",
  "src/app.js": "const express = require('express');\nconst users = require('./routes/users');\nconst app = express();\napp.use(users);\nmodule.exports = app;\n",
  "src/routes/users.js": "const { find } = require('../db');\nmodule.exports = (req, res) => res.json(find());\n",
  "src/db/index.js": "exports.find = () => [];\n",
  "src/plugins.js": "module.exports = (name) => require('./plugins/' + name);\nString.prototype.shout = function () { return this.toUpperCase(); };\n",
  "src/format.mjs": "import path from 'node:path';\nexport const base = (p) => path.basename(p);\nexport const lazy = () => import('./db/index.js');\n",
  "test/app.test.js": "const app = require('../src/app');\n",
  "node_modules/express/index.js": "module.exports = {};\n",
  "README.md": "# sample\n",
};

describe("buildInventory", () => {
  let root: string;
  let inventory: Inventory;
  const file = (path: string): InventoryFile => {
    const found = inventory.files.find((f) => f.path === path);
    if (found === undefined) throw new Error(`${path} not in inventory`);
    return found;
  };

  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), "fm-inventory-"));
    for (const [path, content] of Object.entries(FILES)) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), content);
    }
    inventory = buildInventory(root);
  });
  afterAll(() => rmSync(root, { recursive: true, force: true }));

  it("validates against the inventory schema", () => {
    expect(validate("inventory", inventory)).toEqual([]);
  });

  it("lists source files only, skipping node_modules and non-source files", () => {
    expect(inventory.files.map((f) => f.path)).toEqual([
      "src/app.js", "src/db/index.js", "src/format.mjs", "src/plugins.js", "src/routes/users.js", "src/server.js", "test/app.test.js",
    ]);
  });

  it("detects the stack", () => {
    expect(inventory.stacks).toMatchObject([{ ecosystem: "node", frameworks: [{ name: "express", version: "^4.18.2" }, { name: "node", version: "*" }] }]);
  });

  it("resolves local imports, including directory indexes, and records importers", () => {
    expect(file("src/routes/users.js").imports).toEqual([{ specifier: "../db", kind: "require", resolved: "src/db/index.js" }]);
    expect(file("src/app.js").imports).toContainEqual({ specifier: "express", kind: "require" });
    expect(file("src/app.js").importedBy).toEqual(["src/server.js", "test/app.test.js"]);
    expect(file("src/format.mjs").imports).toContainEqual({ specifier: "./db/index.js", kind: "dynamic-import", resolved: "src/db/index.js" });
  });

  it("records the module format", () => {
    expect(file("src/app.js").format).toBe("cjs");
    expect(file("src/format.mjs").format).toBe("esm");
  });

  it("finds entry points from package.json", () => {
    expect(inventory.entryPoints).toEqual(["src/server.js"]);
  });

  it("orders files leaf to root", () => {
    const at = (path: string): number => inventory.order.indexOf(path);
    expect(inventory.order).toHaveLength(inventory.files.length);
    expect(at("src/db/index.js")).toBeLessThan(at("src/routes/users.js"));
    expect(at("src/routes/users.js")).toBeLessThan(at("src/app.js"));
    expect(at("src/app.js")).toBeLessThan(at("src/server.js"));
  });

  it("scores dynamic require and prototype patching as high risk", () => {
    const risk = file("src/plugins.js").risk;
    expect(risk.level).toBe("high");
    expect(risk.reasons).toEqual(["dynamic require() with a computed specifier", "patches String.prototype"]);
    expect(file("src/db/index.js").risk).toEqual({ score: 0, level: "low", reasons: [] });
  });
});
