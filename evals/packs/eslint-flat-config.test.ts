// Unit tests for eslint-flat-config: the runner's refusals and finish-flat-config.js on inputs the
// fixtures do not cover. The fixtures and `npm run evals -- eslint-flat-config` are the end-to-end
// check (they run @eslint/migrate-config itself).
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { detect } from "../../skills/framework-migration/engine/detect.ts";
import { findPack } from "../../skills/framework-migration/engine/pack.ts";
import { runStage } from "../../skills/framework-migration/engine/run-codemod.ts";

const pack = findPack("eslint-flat-config");
const runner = join(pack.dir, "codemods", "official-migrate.mjs");

describe("eslint-flat-config", () => {
  let root: string;
  const write = (files: Record<string, string>): void => {
    for (const [path, text] of Object.entries(files)) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), text);
    }
  };
  const read = (path: string): string => readFileSync(join(root, path), "utf8");
  const refusal = (): string => {
    const run = spawnSync(process.execPath, [runner, "--dry-run"], { cwd: root, encoding: "utf8" });
    expect(run.status).toBe(1);
    return run.stderr;
  };

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "fm-eslint-"));
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it("refuses nested eslintrc files, which cascade", () => {
    write({ "package.json": "{}", ".eslintrc.json": "{}", "test/.eslintrc.json": '{ "env": { "mocha": true } }' });
    expect(refusal()).toContain("nested eslintrc files (test/.eslintrc.json)");
  });

  it("refuses a JavaScript configuration with logic, which the migrator would evaluate away", () => {
    write({ "package.json": "{}", ".eslintrc.js": "module.exports = { rules: { 'no-console': process.env.CI ? 'error' : 'off' } };\n" });
    expect(refusal()).toContain(".eslintrc.js contains logic");
  });

  it("finishes the migration: dependencies, scripts, eslint-env comments", async () => {
    write({
      "package.json": JSON.stringify({
        scripts: { lint: "eslint --ext .ts,.js --ignore-path .eslintignore --no-eslintrc -c x.json src && tsc", other: "echo eslint" },
        eslintConfig: { root: true },
        devDependencies: { eslint: "8.57.1" },
      }),
      "eslint.config.mjs": 'import js from "@eslint/js";\nimport globals from "globals";\nexport default defineConfig([{ rules: {} }]);\n',
      "src/a.js": "/* eslint-env mocha, jquery */\ndescribe('x', () => { const it = 1; $(it); window.foo; });\n",
      "src/b.js": "/* eslint-env browser */\nconst x = 1;\n",
      "src/c.js": "/* eslint-env nosuchenv */\nfoo();\n",
    });
    const result = await runStage(root, pack, "flat-config", { apply: true, skipCommands: true });
    expect(result.ok).toBe(true);
    const pkg = JSON.parse(read("package.json")) as Record<string, Record<string, string>>;
    expect(pkg["scripts"]).toEqual({ lint: "eslint --no-config-lookup -c x.json src && tsc", other: "echo eslint" });
    expect(pkg["devDependencies"]).toEqual({ "@eslint/js": "9.39.5", eslint: "9.39.5", globals: "17.13.0" });
    expect(pkg["eslintConfig"]).toBeUndefined();
    expect(read("eslint.config.mjs")).toContain('files: ["**/*.ts"]');
    expect(read("src/a.js")).toBe("/* global $, describe -- eslint-env mocha, jquery */\ndescribe('x', () => { const it = 1; $(it); window.foo; });\n");
    expect(read("src/b.js")).toBe("const x = 1;\n");
    expect(result.codemods.flatMap((c) => c.notes).join("\n")).toContain('unknown eslint-env "nosuchenv"');
  });

  it("reports the CLI flags it cannot migrate", () => {
    write({ "package.json": '{\n  "scripts": {\n    "lint": "eslint --env browser --rulesdir rules ."\n  }\n}\n' });
    expect(detect(root, pack).findings.map((f) => f.rule)).toEqual(["cli-env", "cli-rulesdir"]);
  });
});
