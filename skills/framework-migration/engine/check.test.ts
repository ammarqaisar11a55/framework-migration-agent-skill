import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { evaluateGate, parseTestCounts, readCheck, runChecks, type CheckOutcome, type StageCheck } from "./check.ts";
import type { Pack, PackChecks } from "./types.ts";

describe("parseTestCounts", () => {
  it.each([
    ["node:test (spec reporter)", "ℹ tests 4\nℹ pass 3\nℹ fail 1\n", { passed: 3, failed: 1 }],
    ["node:test (TAP)", "# tests 2\n# pass 2\n# fail 0\n", { passed: 2, failed: 0 }],
    ["jest", "Tests:       1 failed, 2 skipped, 7 passed, 10 total\n", { passed: 7, failed: 1 }],
    ["vitest", " Test Files  2 passed (2)\n      Tests  1 failed | 20 passed (21)\n", { passed: 20, failed: 1 }],
    ["vitest with colours", "\u001b[2m      Tests \u001b[22m \u001b[1m\u001b[32m5 passed\u001b[39m\u001b[22m (5)\n", { passed: 5, failed: 0 }],
    ["mocha", "  12 passing (40ms)\n  2 failing\n", { passed: 12, failed: 2 }],
    ["pytest", "===== 2 failed, 8 passed, 1 error in 0.52s =====\n", { passed: 8, failed: 3 }],
    ["maven surefire", "Tests run: 3, Failures: 0, Errors: 0, Skipped: 0\nTests run: 10, Failures: 1, Errors: 1, Skipped: 2\n", { passed: 6, failed: 2 }],
    ["pytest -q", "......                                                  [100%]\n7 passed, 1 warning in 0.10s\n", { passed: 7, failed: 0 }],
    ["phpunit ok", "..... 5 / 5 (100%)\n\nOK (5 tests, 9 assertions)\n", { passed: 5, failed: 0 }],
    ["phpunit failures", "Tests: 7, Assertions: 12, Failures: 1, Errors: 1, Skipped: 2.\n", { passed: 3, failed: 2 }],
    ["unittest ok", "......\n----------------------------------------------------------------------\nRan 6 tests in 0.015s\n\nOK\n", { passed: 6, failed: 0 }],
    ["unittest failed", "Ran 10 tests in 1.2s\n\nFAILED (failures=1, errors=2, skipped=3)\n", { passed: 4, failed: 3 }],
    ["unittest skipped", "Ran 1 test in 0.001s\n\nOK (skipped=1)\n", { passed: 0, failed: 0 }],
  ])("%s", (_name, output, expected) => {
    expect(parseTestCounts(output)).toEqual(expected);
  });

  it("returns undefined for output it does not recognise", () => {
    expect(parseTestCounts("ok\n")).toBeUndefined();
  });
});

const outcome = (name: CheckOutcome["name"], status: "pass" | "fail", tests?: { passed: number; failed: number }): CheckOutcome => ({
  name, status, command: name, exitCode: status === "pass" ? 0 : 1, durationMs: 1, output: "", ...(tests === undefined ? {} : { tests }),
});
const baseline = (passed: number, gatePassed = true): StageCheck => ({
  pack: "p", stage: 0, stageId: "baseline", checks: [outcome("test", "pass", { passed, failed: 0 })], gate: { passed: gatePassed, reasons: [] }, warnings: [],
});

describe("evaluateGate", () => {
  const clean = { commit: "abc", dirty: [] };

  it("baseline: passes on a clean tree with passing tests", () => {
    expect(evaluateGate(0, [outcome("test", "pass", { passed: 12, failed: 0 })], undefined, clean, false)).toEqual({ passed: true, reasons: [], warnings: [] });
  });

  it("baseline: fails when tests fail or the tree is dirty", () => {
    const gate = evaluateGate(0, [outcome("test", "fail", { passed: 1, failed: 1 })], undefined, { dirty: ["src/a.js"] }, false);
    expect(gate.passed).toBe(false);
    expect(gate.reasons).toEqual(["the git tree is not clean (src/a.js)", "baseline tests fail: fix them before migrating"]);
  });

  it("baseline: --allow-dirty accepts a dirty tree", () => {
    expect(evaluateGate(0, [outcome("test", "pass", { passed: 9, failed: 0 })], undefined, { dirty: ["a"] }, true).passed).toBe(true);
  });

  it("baseline: warns about weak test suites and missing git", () => {
    expect(evaluateGate(0, [outcome("test", "pass", { passed: 2, failed: 0 })], undefined, {}, false).warnings).toEqual([
      "not a git repository: stages cannot be committed as rollback points",
      "the test suite is small (2 tests): passing gates give weak assurance",
    ]);
    expect(evaluateGate(0, [outcome("test", "pass", { passed: 0, failed: 0 })], undefined, clean, false).warnings).toEqual([
      "the test suite ran 0 tests: a passing gate proves nothing",
    ]);
  });

  it("stage: passes at baseline parity", () => {
    const checks = [outcome("typecheck", "pass"), outcome("test", "pass", { passed: 6, failed: 0 })];
    expect(evaluateGate(2, checks, baseline(6), clean, false)).toEqual({ passed: true, reasons: [], warnings: [] });
  });

  it("stage: fails when fewer tests pass than at baseline, even with exit code 0", () => {
    const gate = evaluateGate(2, [outcome("test", "pass", { passed: 4, failed: 0 })], baseline(6), clean, false);
    expect(gate.reasons).toEqual(["test parity lost: 4 tests passed, the baseline had 6"]);
  });

  it("stage: fails on a failed type-check or smoke test; lint only warns", () => {
    const gate = evaluateGate(1, [outcome("typecheck", "fail"), outcome("lint", "fail"), outcome("smoke", "fail")], baseline(6), clean, false);
    expect(gate.reasons).toEqual(["typecheck failed (exit code 1)", "smoke failed (exit code 1)"]);
    expect(gate.warnings).toEqual(["lint fails (advisory, does not block the stage)"]);
  });

  it("stage: fails without a passing baseline", () => {
    expect(evaluateGate(1, [], undefined, clean, false).reasons).toEqual(["no baseline recorded: run `fm check --stage 0` before migrating"]);
    expect(evaluateGate(1, [], baseline(6, false), clean, false).reasons).toEqual(["the baseline gate did not pass"]);
  });
});

describe("runChecks", () => {
  let root: string;
  const pack = (checks: PackChecks): Pack => ({
    id: "p", title: "p", ecosystem: "node", tier: 1, status: "planned", dir: "/nowhere",
    from: { framework: "x", versions: "1.x" }, to: { framework: "x", versions: "2.x" },
    tools: [], stages: [{ id: "one" }], checks,
  });
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "fm-check-"));
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it("baseline runs only the tests; later stages run every check and compare", async () => {
    const checks = { typecheck: "test -f typed", test: "echo '# pass 6'; echo '# fail 0'" };
    const zero = await runChecks(root, pack(checks), 0);
    expect(zero.checks.map((c) => c.name)).toEqual(["test"]);
    expect(zero.checks[0]?.tests).toEqual({ passed: 6, failed: 0 });
    expect(zero.gate.passed).toBe(true);
    expect(readCheck(root, 0)).toEqual(zero);

    const failing = await runChecks(root, pack(checks), 1);
    expect(failing.stageId).toBe("one");
    expect(failing.gate).toEqual({ passed: false, reasons: ["typecheck failed (exit code 1)"] });

    writeFileSync(join(root, "typed"), "");
    expect((await runChecks(root, pack(checks), 1)).gate.passed).toBe(true);
    expect((await runChecks(root, pack({ ...checks, test: "echo '# pass 5'" }), 1)).gate.reasons).toEqual(["test parity lost: 5 tests passed, the baseline had 6"]);
  });

  it("smoke probe starts the app on a free port, waits for an answer, and stops it", async () => {
    writeFileSync(join(root, "server.js"), "require('http').createServer((q, s) => { s.statusCode = q.url === '/health' ? 200 : 404; s.end('ok'); }).listen(process.env.PORT);\n");
    const smoke = { start: "node server.js", url: "http://127.0.0.1:{port}/health", timeout_ms: 15000 };
    await runChecks(root, pack({ test: "echo '# pass 1'", smoke }), 0);
    const result = await runChecks(root, pack({ test: "echo '# pass 1'", smoke }), 1);
    expect(result.checks.find((c) => c.name === "smoke")).toMatchObject({ status: "pass" });
    expect(result.gate.passed).toBe(true);

    const notRouted = await runChecks(root, pack({ smoke: { ...smoke, url: "http://127.0.0.1:{port}/nope" } }), 1);
    expect(notRouted.checks[0]).toMatchObject({ status: "pass" });
    expect(notRouted.checks[0]?.output).toContain("answered 404");
  });

  it("smoke probe fails when the app exits before answering", async () => {
    await runChecks(root, pack({ test: "true" }), 0);
    const result = await runChecks(root, pack({ smoke: { start: "echo crashed; exit 7", url: "http://127.0.0.1:{port}/", timeout_ms: 5000 } }), 1);
    const smoke = result.checks[0];
    expect(smoke?.status).toBe("fail");
    expect(smoke?.output).toContain("crashed\nthe app exited with code 7 before answering");
  });

  it("rejects a stage outside the pack", async () => {
    await expect(runChecks(root, pack({ test: "true" }), 5)).rejects.toThrow("out of range");
  });
});
