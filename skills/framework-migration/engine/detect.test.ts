import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { detect, matchRules } from "./detect.ts";
import { validate } from "./schema.ts";
import type { Pack, Rule } from "./types.ts";

const rule = (id: string, matcher: Rule["matcher"], extra: Partial<Rule> = {}): Rule => ({
  id, matcher, description: id, severity: "warn", auto_fixable: false, fix_hint: `fix ${id}`, docs_url: "https://docs.test/x", ...extra,
});

const JS = [".js", ".ts"];
const where = (rules: Rule[], path: string, source: string): string[] =>
  matchRules(rules, path, source, JS).map((f) => `${f.rule}@${f.line}:${f.column}`);

describe("matchRules", () => {
  it("regex: reports every match with 1-based line and column", () => {
    const source = "const a = moment();\n// nothing\nmoment().add(1); moment()\n";
    expect(where([rule("moment", { type: "regex", pattern: "moment\\(" })], "a.js", source)).toEqual(["moment@1:11", "moment@3:1", "moment@3:18"]);
  });

  it("regex: honours flags", () => {
    const r = (flags?: string): Rule => rule("todo", flags === undefined ? { type: "regex", pattern: "todo" } : { type: "regex", pattern: "todo", flags });
    expect(where([r()], "a.js", "// TODO\n")).toEqual([]);
    expect(where([r("i")], "a.js", "// TODO\n")).toEqual(["todo@1:4"]);
  });

  it("ast: matches structure, not text", () => {
    const dynamicRequire = rule("dynamic-require", { type: "ast", selector: 'CallExpression[callee.name="require"]:not([arguments.0.type="Literal"])' });
    const source = "const a = require('a');\n// require(name)\nconst s = 'require(name)';\nconst b = require(name);\n";
    expect(where([dynamicRequire], "a.js", source)).toEqual(["dynamic-require@4:11"]);
  });

  it("ast: parses TypeScript", () => {
    const anyRule = rule("explicit-any", { type: "ast", selector: "TSAnyKeyword" });
    expect(where([anyRule], "a.ts", "export function f(x: any): number {\n  return x as number;\n}\n")).toEqual(["explicit-any@1:22"]);
  });

  it("applies a rule only to its extensions", () => {
    const tsOnly = rule("r", { type: "regex", pattern: "x" }, { extensions: [".ts"] });
    expect(where([tsOnly], "a.js", "x\n")).toEqual([]);
    expect(where([tsOnly], "a.ts", "x\n")).toEqual(["r@1:1"]);
    expect(where([rule("r", { type: "regex", pattern: "x" })], "a.py", "x\n")).toEqual([]);
  });

  it("skips AST rules on a file that does not parse, but still runs regex rules", () => {
    const rules = [rule("ast", { type: "ast", selector: "Identifier" }), rule("re", { type: "regex", pattern: "\\(" })];
    expect(where(rules, "a.py", "def f(:\n")).toEqual([]);
    expect(where(rules.map((r) => ({ ...r, extensions: [".py"] })), "a.py", "def f(:\n")).toEqual(["re@1:6"]);
  });

  it("carries the rule's metadata and the source line into the finding", () => {
    const [finding] = matchRules([rule("r", { type: "regex", pattern: "old" }, { severity: "error", auto_fixable: true })], "a.js", "  call(old);  \n", JS);
    expect(finding).toEqual({
      rule: "r", severity: "error", auto_fixable: true, file: "a.js", line: 1, column: 8,
      excerpt: "call(old);", fix_hint: "fix r", docs_url: "https://docs.test/x",
    });
  });
});

describe("detect", () => {
  it("skips files matched by a rule's exclude patterns", () => {
    const excluded = rule("cjs", { type: "regex", pattern: "module\\.exports" }, { exclude: ["(^|/)\\.[^/]+$", "\\.config\\.js$"] });
    expect(where([excluded], ".eslintrc.js", "module.exports = {};")).toEqual([]);
    expect(where([excluded], "jest.config.js", "module.exports = {};")).toEqual([]);
    expect(where([excluded], "src/app.js", "module.exports = app;")).toEqual(["cjs@1:1"]);
  });

  it("scans the project, ignores node_modules, sorts findings and matches the schema", () => {
    const root = mkdtempSync(join(tmpdir(), "fm-detect-"));
    try {
      mkdirSync(join(root, "src"));
      mkdirSync(join(root, "node_modules/dep"), { recursive: true });
      writeFileSync(join(root, "src/b.js"), "require(x);\n");
      writeFileSync(join(root, "src/a.js"), "ok();\nrequire(y);\n");
      writeFileSync(join(root, "node_modules/dep/index.js"), "require(z);\n");
      const pack = { id: "p", ecosystem: "node" } as Pack;
      const result = detect(root, pack, [rule("dyn", { type: "regex", pattern: "require\\(\\w\\)" })]);
      expect(result.findings.map((f) => `${f.file}:${f.line}`)).toEqual(["src/a.js:2", "src/b.js:1"]);
      expect(validate("findings", result)).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
