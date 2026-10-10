// Unit tests for angular-major-upgrade's finish-update.js. The fixtures and
// `npm run evals -- angular-major-upgrade` run ng update end to end.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { findPack } from "../../skills/framework-migration/engine/pack.ts";
import { runStage } from "../../skills/framework-migration/engine/run-codemod.ts";

const DIAGNOSTICS = `"extendedDiagnostics": {
      "checks": {
        "nullishCoalescingNotNullable": "suppress",
        "optionalChainNotNullable": "suppress"
      }
    }`;

describe("angular-major-upgrade finish-update.js", () => {
  let root: string;
  const write = (files: Record<string, string>): void => {
    for (const [path, text] of Object.entries(files)) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), text);
    }
  };
  const read = (path: string): string => readFileSync(join(root, path), "utf8");
  const run = () => runStage(root, findPack("angular-major-upgrade"), "angular-22", { apply: true, skipCommands: true });

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "fm-ng-"));
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it("removes the extendedDiagnostics block where strictTemplates is false", async () => {
    write({
      "tsconfig.json": '{\n  "angularCompilerOptions": {\n    "strictInjectionParameters": true\n  }\n}\n',
      "tsconfig.app.json": `{\n  "extends": "./tsconfig.json",\n  "angularCompilerOptions": {\n    ${DIAGNOSTICS},\n    "strictTemplates": false\n  }\n}\n`,
      "tsconfig.spec.json": `{\n  "angularCompilerOptions": {\n    "strictTemplates": false,\n    ${DIAGNOSTICS}\n  }\n}\n`,
    });
    const result = await run();
    expect(result.ok).toBe(true);
    expect(read("tsconfig.app.json")).toBe('{\n  "extends": "./tsconfig.json",\n  "angularCompilerOptions": {\n    "strictTemplates": false\n  }\n}\n');
    expect(read("tsconfig.spec.json")).toBe('{\n  "angularCompilerOptions": {\n    "strictTemplates": false\n  }\n}\n');
    expect(result.codemods.flatMap((c) => c.notes).join("\n")).toContain("NG4003");
  });

  it("follows strictTemplates: false from tsconfig.json and keeps the block when templates are strict", async () => {
    write({
      "tsconfig.json": '{\n  "angularCompilerOptions": {\n    "strictTemplates": false\n  }\n}\n',
      "tsconfig.app.json": `{\n  "angularCompilerOptions": {\n    ${DIAGNOSTICS}\n  }\n}\n`,
      "projects/lib/tsconfig.lib.json": `{\n  "angularCompilerOptions": {\n    "strictTemplates": true,\n    ${DIAGNOSTICS}\n  }\n}\n`,
    });
    expect((await run()).ok).toBe(true);
    expect(read("tsconfig.app.json")).toBe('{\n  "angularCompilerOptions": {\n  }\n}\n');
    expect(read("projects/lib/tsconfig.lib.json")).toContain('"nullishCoalescingNotNullable": "suppress"');
  });
});
