import { describe, expect, it } from "vitest";
import type { CheckOutcome, StageCheck } from "./check.ts";
import { renderReport, type ReportData } from "./report.ts";
import type { Finding } from "./types.ts";

const check = (name: CheckOutcome["name"], status: "pass" | "fail", extra: Partial<CheckOutcome> = {}): CheckOutcome => ({
  name, status, command: `run ${name}`, exitCode: status === "pass" ? 0 : 2, durationMs: 10, output: "", ...extra,
});
const stage = (number: number, id: string, checks: CheckOutcome[], reasons: string[] = [], warnings: string[] = []): StageCheck => ({
  pack: "express-js-to-ts", stage: number, stageId: id, commit: `${number}`.repeat(40), checks, gate: { passed: reasons.length === 0, reasons }, warnings,
});
const finding = (rule: string, file: string, line: number, auto_fixable: boolean): Finding => ({
  rule, file, line, auto_fixable, column: 1, severity: auto_fixable ? "warn" : "error", excerpt: "", fix_hint: `Fix ${rule} | by hand`, docs_url: "https://docs.test/x",
});
const tests = (passed: number, failed = 0): Partial<CheckOutcome> => ({ tests: { passed, failed } });

const DATA: ReportData = {
  pack: {
    id: "express-js-to-ts", title: "Express (JavaScript) → Express (TypeScript)", tier: 1,
    from: { framework: "express", language: "javascript", versions: "4.x" },
    to: { framework: "express", language: "typescript", versions: "4.x" },
  },
  baseline: stage(0, "baseline", [check("test", "pass", tests(6))], [], ["the test suite is small (6 tests)"]),
  stages: [
    {
      number: 1, id: "tooling", title: "Add TypeScript tooling", commit: "a".repeat(40),
      summary: { mode: "apply", patches: [], commands: [{ command: "npm install", phase: "after", status: "ok" }], codemods: [{ codemod: "add-ts-tooling.js", files: ["+ tsconfig.json", "package.json"], notes: [], errors: [] }] },
      check: stage(1, "tooling", [check("typecheck", "pass"), check("test", "pass", tests(6)), check("smoke", "pass")]),
    },
    {
      number: 2, id: "rename-and-modules", commit: "b".repeat(40),
      summary: { mode: "apply", patches: [], commands: [], codemods: [
        { codemod: "cjs-to-esm.js", files: ["src/app.js", "src/server.js"], notes: ["src/plugins.js: kept `export =`"], errors: [] },
        { codemod: "rename-to-ts.js", files: ["src/app.js → src/app.ts", "src/server.js → src/server.ts"], notes: [], errors: [] },
      ] },
      check: stage(2, "rename-and-modules", [check("typecheck", "fail", { output: "src/app.ts(3,7): error TS2339: Property 'user' does not exist" }), check("test", "pass", tests(5))], ["typecheck failed (exit code 2)", "test parity lost: 5 tests passed, the baseline had 6"]),
    },
    { number: 3, id: "express-typing", summary: { mode: "dry-run", patches: [], commands: [], codemods: [{ codemod: "add-handler-types.js", files: ["src/app.ts"], notes: [], errors: [] }] } },
    { number: 4, id: "strictness" },
  ],
  baselineFindings: [finding("cjs-require", "src/app.js", 1, true), finding("cjs-require", "src/server.js", 1, true), finding("dynamic-require", "src/plugins.js", 4, false)],
  remainingFindings: [finding("dynamic-require", "src/plugins.ts", 4, false), finding("cjs-require", "src/legacy.ts", 9, true)],
  risks: [{ path: "src/plugins.ts", risk: { score: 5, level: "high", reasons: ["dynamic require() with a computed specifier"] } }],
};

describe("renderReport", () => {
  it("renders a stopped migration", async () => {
    await expect(renderReport(DATA)).toMatchFileSnapshot("./__snapshots__/report-stopped.md");
  });

  it("renders a completed migration with nothing left to do", async () => {
    const done: ReportData = {
      ...DATA,
      stages: DATA.stages.slice(0, 1),
      baselineFindings: [finding("cjs-require", "src/app.js", 1, true)],
      remainingFindings: [],
      risks: [],
    };
    await expect(renderReport(done)).toMatchFileSnapshot("./__snapshots__/report-complete.md");
  });

  it("says so when nothing was run or committed", () => {
    const report = renderReport({ ...DATA, baseline: undefined as never, stages: [{ number: 1, id: "tooling" }], baselineFindings: [], remainingFindings: [], risks: [] });
    expect(report).toContain("| 0 | baseline | not run |");
    expect(report).toContain("No commits were recorded, so there are no rollback points.");
    expect(report).toContain("No rule matched.");
  });
});
