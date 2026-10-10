import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { adapterFor } from "./adapters.ts";
import { artifactPath, readJson, writeJson } from "./artifacts.ts";
import { exec } from "./exec.ts";
import type { CheckName, Pack, SmokeProbe } from "./types.ts";

export interface TestCounts {
  passed: number;
  failed: number;
}

export interface CheckOutcome {
  name: CheckName;
  command: string;
  status: "pass" | "fail";
  exitCode: number;
  durationMs: number;
  tests?: TestCounts;
  /** Last lines of the command's output. */
  output: string;
}

export interface StageCheck {
  pack: string;
  /** 0 = baseline, otherwise the 1-based position of the stage in pack.yaml. */
  stage: number;
  stageId: string;
  /** HEAD when the check ran; absent outside a git repository. */
  commit?: string;
  checks: CheckOutcome[];
  gate: { passed: boolean; reasons: string[] };
  warnings: string[];
}

const last = (matches: IterableIterator<RegExpMatchArray>): RegExpMatchArray | undefined => [...matches].pop();
const int = (value: string | undefined): number => (value === undefined ? 0 : Number.parseInt(value, 10));

/**
 * Pass/fail counts from a test runner's output. Understands node:test, Jest, Vitest, Mocha, pytest
 * and Maven Surefire / Gradle summaries; returns undefined for anything else.
 */
export function parseTestCounts(output: string): TestCounts | undefined {
  // eslint-disable-next-line no-control-regex -- strips ANSI colour codes
  const text = output.replace(/\u001b\[[0-9;]*m/g, "");
  const nodePass = last(text.matchAll(/^(?:# |ℹ )pass (\d+)\s*$/gm));
  if (nodePass !== undefined) return { passed: int(nodePass[1]), failed: int(last(text.matchAll(/^(?:# |ℹ )fail (\d+)\s*$/gm))?.[1]) };
  const jest = last(text.matchAll(/^Tests:\s+(.*\d+ total)\s*$/gm));
  if (jest?.[1] !== undefined) return { passed: int(/(\d+) passed/.exec(jest[1])?.[1]), failed: int(/(\d+) failed/.exec(jest[1])?.[1]) };
  const vitest = last(text.matchAll(/^\s*Tests\s+(.*\(\d+\))\s*$/gm));
  if (vitest?.[1] !== undefined) return { passed: int(/(\d+) passed/.exec(vitest[1])?.[1]), failed: int(/(\d+) failed/.exec(vitest[1])?.[1]) };
  const mocha = last(text.matchAll(/^\s*(\d+) passing\b/gm));
  if (mocha !== undefined) return { passed: int(mocha[1]), failed: int(last(text.matchAll(/^\s*(\d+) failing\b/gm))?.[1]) };
  // pytest's summary line, with "=" borders or (with -q) without: "2 failed, 8 passed, 1 error in 0.52s".
  const pytest = last(text.matchAll(/^(?:=+ )?(\d+ (?:passed|failed|errors?|skipped|warnings?|deselected|xfailed|xpassed)\b.*) in [\d.]+s\b.*$/gm));
  if (pytest?.[1] !== undefined) {
    return { passed: int(/(\d+) passed/.exec(pytest[1])?.[1]), failed: int(/(\d+) failed/.exec(pytest[1])?.[1]) + int(/(\d+) errors?/.exec(pytest[1])?.[1]) };
  }
  // unittest (Django's test runner): "Ran 6 tests in 0.01s" then "OK" or "FAILED (failures=1, errors=2, skipped=1)".
  const unittest = last(text.matchAll(/^Ran (\d+) tests? in [\d.]+s\s*\n+\s*(OK|FAILED)\b([^\n]*)$/gm));
  if (unittest !== undefined) {
    const detail = unittest[3] ?? "";
    const failed = int(/failures=(\d+)/.exec(detail)?.[1]) + int(/errors=(\d+)/.exec(detail)?.[1]);
    return { passed: int(unittest[1]) - failed - int(/skipped=(\d+)/.exec(detail)?.[1]) - int(/expected failures=(\d+)/.exec(detail)?.[1]), failed };
  }
  const surefire = last(text.matchAll(/Tests run: (\d+), Failures: (\d+), Errors: (\d+)(?:, Skipped: (\d+))?/g));
  if (surefire !== undefined) {
    const failed = int(surefire[2]) + int(surefire[3]);
    return { passed: int(surefire[1]) - failed - int(surefire[4]), failed };
  }
  return undefined;
}

const tail = (output: string, lines = 40): string => output.trimEnd().split("\n").slice(-lines).join("\n");

function freePort(): Promise<number> {
  return new Promise((done, reject) => {
    const server = createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => (typeof address === "object" && address !== null ? done(address.port) : reject(new Error("no port"))));
    });
  });
}

/**
 * Starts the app, polls the URL until it answers, then stops the app. Any status below 500 counts:
 * a 404 on a URL the app does not route still proves that it booted and serves requests.
 */
async function probe(smoke: SmokeProbe, cwd: string, env: NodeJS.ProcessEnv): Promise<Omit<CheckOutcome, "name">> {
  const started = Date.now();
  const port = await freePort();
  const url = smoke.url.replaceAll("{port}", String(port));
  let output = "";
  let exited: number | undefined;
  // Own process group, so the whole tree (npm → node) can be stopped.
  const child = spawn("sh", ["-c", smoke.start], { cwd, env: { ...env, PORT: String(port) }, detached: true, stdio: ["ignore", "pipe", "pipe"] });
  child.stdout.on("data", (chunk: Buffer) => (output += chunk.toString()));
  child.stderr.on("data", (chunk: Buffer) => (output += chunk.toString()));
  child.on("exit", (code) => (exited = code ?? 1));
  child.on("error", (error) => {
    output += `\n${error.message}`;
    exited = 1;
  });

  const deadline = started + (smoke.timeout_ms ?? 60_000);
  let verdict = `no response from ${url} before the timeout`;
  let passed = false;
  while (Date.now() < deadline && exited === undefined) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (response.status < 500) {
        passed = true;
        verdict = `${url} answered ${response.status}`;
        break;
      }
      verdict = `${url} answered ${response.status}`;
    } catch {
      // not listening yet
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  if (exited !== undefined && !passed) verdict = `the app exited with code ${exited} before answering`;
  if (exited === undefined && child.pid !== undefined) {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {
      // already gone
    }
  }
  return {
    command: `${smoke.start}  →  GET ${smoke.url}`,
    status: passed ? "pass" : "fail",
    exitCode: passed ? 0 : 1,
    durationMs: Date.now() - started,
    output: tail(`${output.trimEnd()}\n${verdict}`),
  };
}

export interface GitState {
  commit?: string;
  /** Paths with uncommitted changes, engine artifacts excluded. Undefined outside a repository. */
  dirty?: string[];
}

export function gitState(root: string): GitState {
  const head = exec("git rev-parse HEAD", { cwd: root });
  const status = exec("git status --porcelain", { cwd: root });
  if (status.exitCode !== 0) return {};
  const dirty = status.output
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => line.slice(3))
    .filter((path) => !path.startsWith(".fm/") && path !== ".fm" && path !== "MIGRATION_REPORT.md");
  return head.exitCode === 0 ? { commit: head.output.trim(), dirty } : { dirty };
}

/** Decides whether a stage may proceed. Lint is advisory; everything else gates. */
export function evaluateGate(stage: number, checks: readonly CheckOutcome[], baseline: StageCheck | undefined, git: GitState, allowDirty: boolean): StageCheck["gate"] & { warnings: string[] } {
  const reasons: string[] = [];
  const warnings: string[] = [];
  const test = checks.find((c) => c.name === "test");

  if (stage === 0) {
    if (git.dirty === undefined) warnings.push("not a git repository: stages cannot be committed as rollback points");
    else if (git.dirty.length > 0 && !allowDirty) reasons.push(`the git tree is not clean (${git.dirty.slice(0, 5).join(", ")}${git.dirty.length > 5 ? ", ..." : ""})`);
    if (test === undefined) warnings.push("the pack defines no test check: test parity cannot be verified");
    else if (test.status === "fail") reasons.push("baseline tests fail: fix them before migrating");
    else if (test.tests === undefined) warnings.push("could not read pass/fail counts from the test output: parity is judged by exit code only");
    else if (test.tests.passed === 0) warnings.push("the test suite ran 0 tests: a passing gate proves nothing");
    else if (test.tests.passed < 5) warnings.push(`the test suite is small (${test.tests.passed} tests): passing gates give weak assurance`);
    return { passed: reasons.length === 0, reasons, warnings };
  }

  if (baseline === undefined) reasons.push("no baseline recorded: run `fm check --stage 0` before migrating");
  else if (!baseline.gate.passed) reasons.push("the baseline gate did not pass");
  for (const check of checks) {
    if (check.status === "pass") continue;
    if (check.name === "lint") warnings.push("lint fails (advisory, does not block the stage)");
    else reasons.push(`${check.name} failed (exit code ${check.exitCode})`);
  }
  const before = baseline?.checks.find((c) => c.name === "test")?.tests;
  if (test?.status === "pass" && before !== undefined) {
    if (test.tests === undefined) warnings.push("could not read pass/fail counts from the test output: parity is judged by exit code only");
    else if (test.tests.passed < before.passed) reasons.push(`test parity lost: ${test.tests.passed} tests passed, the baseline had ${before.passed}`);
  }
  return { passed: reasons.length === 0, reasons, warnings };
}

export interface RunChecksOptions {
  env?: NodeJS.ProcessEnv;
  allowDirty?: boolean;
}

export const checkPath = (root: string, stage: number): string => artifactPath(root, "checks", `stage-${stage}.json`);
export const readCheck = (root: string, stage: number): StageCheck | undefined => readJson<StageCheck>(checkPath(root, stage));

/**
 * Runs the pack's checks for a stage and writes .fm/checks/stage-N.json.
 * Stage 0 (baseline) runs only the existing test suite; later stages run every check.
 */
export async function runChecks(rootDir: string, pack: Pack, stage: number, options: RunChecksOptions = {}): Promise<StageCheck> {
  const root = resolve(rootDir);
  if (stage < 0 || stage > pack.stages.length) throw new Error(`Stage ${stage} is out of range (0–${pack.stages.length})`);
  const env = options.env ?? process.env;
  const image = adapterFor(pack.ecosystem).image;
  const names: CheckName[] = stage === 0 ? ["test"] : ["typecheck", "test", "lint", "smoke"];
  const checks: CheckOutcome[] = [];
  for (const name of names) {
    const definition = pack.checks[name];
    if (definition === undefined) continue;
    if (typeof definition === "object") {
      checks.push({ name, ...(await probe(definition, root, env)) });
      continue;
    }
    const run = exec(definition, { cwd: root, env, ...(image === undefined ? {} : { image }) });
    const outcome: CheckOutcome = { name, command: definition, status: run.exitCode === 0 ? "pass" : "fail", exitCode: run.exitCode, durationMs: run.durationMs, output: tail(run.output) };
    const tests = name === "test" ? parseTestCounts(run.output) : undefined;
    if (tests !== undefined) outcome.tests = tests;
    checks.push(outcome);
  }
  const git = gitState(root);
  const { warnings, ...gate } = evaluateGate(stage, checks, stage === 0 ? undefined : readCheck(root, 0), git, options.allowDirty === true);
  const result: StageCheck = { pack: pack.id, stage, stageId: stage === 0 ? "baseline" : (pack.stages[stage - 1]?.id ?? ""), checks, gate, warnings };
  if (git.commit !== undefined) result.commit = git.commit;
  writeJson(checkPath(root, stage), result);
  return result;
}
