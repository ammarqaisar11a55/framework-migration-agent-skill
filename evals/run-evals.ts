// Runs every shipped pack's fixtures through the real pipeline and writes evals/scorecard.md.
//
//   npm run evals                    all packs
//   npm run evals -- <pack-id>       one pack, whatever its status (prints the scorecard only)
//   npm run evals -- --keep          keep the work directory for inspection
//
// For each fixture: copy before/ to a work directory, record the baseline, run detection, apply
// every stage with its gate, then score the result against PLAN.md §9.
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runChecks, type StageCheck } from "../skills/framework-migration/engine/check.ts";
import { detect } from "../skills/framework-migration/engine/detect.ts";
import { exec } from "../skills/framework-migration/engine/exec.ts";
import { listPacks, loadFixtures, validatePack, type Fixture } from "../skills/framework-migration/engine/pack.ts";
import { IGNORED_DIRS, walk } from "../skills/framework-migration/engine/paths.ts";
import { runStage } from "../skills/framework-migration/engine/run-codemod.ts";
import type { Finding, Pack } from "../skills/framework-migration/engine/types.ts";

interface FixtureScore {
  fixture: string;
  kind: "positive" | "negative";
  compiles: boolean;
  testParity: boolean;
  tests: string;
  truePositives: number;
  falsePositives: string[];
  falseNegatives: string[];
  /** Negative fixtures: every must_remain snippet survived and was flagged. */
  preserved: boolean;
  /** Migrated tree is identical to after/. */
  matchesAfter: boolean;
  /** No auto_fixable finding is left after the migration. */
  autoFixed: boolean;
  manualItems: number;
  problems: string[];
}

interface PackScore {
  pack: Pack;
  fixtures: FixtureScore[];
}

const key = (f: { rule: string; file: string; line: number }): string => `${f.rule} ${f.file}:${f.line}`;

// Build output (.next, dist, ...) is what the checks produce, not what the migration wrote.
const IGNORED = new Set([...IGNORED_DIRS, "package-lock.json"]);
const tree = (root: string): Map<string, string> => new Map(walk(root, IGNORED).map((path) => [path, readFileSync(join(root, path), "utf8")]));

type Manifest = { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };

/** Every dependency the fixtures declare, before and after, with each version that occurs. */
function declaredVersions(fixtures: Fixture[]): Map<string, Set<string>> {
  const versions = new Map<string, Set<string>>();
  for (const fixture of fixtures) {
    for (const state of ["before", "after"]) {
      const path = join(fixture.dir, state, "package.json");
      if (!existsSync(path)) continue;
      const pkg = JSON.parse(readFileSync(path, "utf8")) as Manifest;
      for (const [name, version] of Object.entries({ ...pkg.dependencies, ...pkg.devDependencies })) {
        versions.set(name, (versions.get(name) ?? new Set()).add(version));
      }
    }
  }
  return versions;
}

/**
 * A pack whose stages run official tools, or that changes a dependency's version (express 4 → 5),
 * cannot share one install: each fixture then gets its own, and the stages' commands (official
 * tools, `npm install`) run for real.
 */
const needsIsolation = (pack: Pack, fixtures: Fixture[]): boolean =>
  pack.stages.some((stage) => (stage.commands ?? []).length > 0) || [...declaredVersions(fixtures).values()].some((v) => v.size > 1);

/** Dependencies of every fixture plus the pack's tools, installed once and shared via Node's upward lookup. */
function installDependencies(pack: Pack, fixtures: Fixture[], workRoot: string): string {
  const dependencies: Record<string, string> = {};
  // The tooling stage adds these to the project; here they come from the shared install instead.
  for (const tool of pack.tools) if (tool.role === "dependency" || tool.role === "devDependency") dependencies[tool.name] = tool.version;
  for (const [name, versions] of declaredVersions(fixtures)) dependencies[name] = [...versions][0] as string;
  const manifest = JSON.stringify({ name: `fm-evals-${pack.id}`, private: true, dependencies }, null, 2);
  const dir = join(workRoot, `${pack.id}-${createHash("sha256").update(manifest).digest("hex").slice(0, 12)}`);
  if (!existsSync(join(dir, "node_modules", ".installed"))) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "package.json"), manifest);
    console.log(`  installing fixture dependencies in ${dir}`);
    const install = exec(process.env["FM_EVALS_INSTALL"] ?? "npm install --no-audit --no-fund", { cwd: dir });
    if (install.exitCode !== 0) throw new Error(`Installing fixture dependencies failed:\n${install.output}`);
    // A pack whose fixtures need no packages gets no node_modules from npm.
    mkdirSync(join(dir, "node_modules"), { recursive: true });
    writeFileSync(join(dir, "node_modules", ".installed"), "");
  }
  return dir;
}

async function scoreFixture(pack: Pack, fixture: Fixture, depsDir: string, isolated: boolean): Promise<FixtureScore> {
  const work = join(depsDir, fixture.name);
  rmSync(work, { recursive: true, force: true });
  cpSync(join(fixture.dir, "before"), work, { recursive: true });
  // Isolated: no lockfile, so the migrated tree compares against after/ without one.
  const env = isolated
    ? { ...process.env, npm_config_package_lock: "false" }
    : { ...process.env, PATH: `${join(depsDir, "node_modules", ".bin")}${delimiter}${process.env["PATH"] ?? ""}` };
  const problems: string[] = [];
  if (isolated) {
    const install = exec(process.env["FM_EVALS_INSTALL"] ?? "npm install --no-audit --no-fund", { cwd: work, env });
    if (install.exitCode !== 0) throw new Error(`Installing ${fixture.name} failed:\n${install.output}`);
  }
  const expectation = fixture.expectation;

  const baseline = await runChecks(work, pack, 0, { env, allowDirty: true });
  if (!baseline.gate.passed) problems.push(`baseline gate failed: ${baseline.gate.reasons.join("; ")}`);

  // Criterion 3: findings on before/ against expected-report.md.
  const found = detect(work, pack).findings;
  const expected = new Set(expectation.findings.map(key));
  const actual = new Set(found.map(key));
  const falsePositives = [...actual].filter((k) => !expected.has(k));
  const falseNegatives = [...expected].filter((k) => !actual.has(k));
  const manualItems = found.filter((f) => !f.auto_fixable).length;
  if (expectation.manual_items !== undefined && expectation.manual_items !== manualItems) {
    problems.push(`expected ${expectation.manual_items} manual item(s), found ${manualItems}`);
  }

  let last: StageCheck = baseline;
  for (const stage of pack.stages) {
    if (!last.gate.passed) break;
    const result = await runStage(work, pack, stage.id, { apply: true, skipCommands: !isolated, env });
    if (!result.ok) {
      const failed = result.commands.filter((c) => c.status === "failed").map((c) => `${c.command}:\n${c.output}`);
      problems.push(`stage ${stage.id}: ${[...failed, ...result.codemods.flatMap((c) => c.errors.map((e) => `${e.path}: ${e.message}`))].join("; ")}`);
      break;
    }
    last = await runChecks(work, pack, result.number, { env });
    if (!last.gate.passed) {
      problems.push(`stage ${stage.id} gate failed: ${last.gate.reasons.join("; ")}`);
      for (const check of last.checks.filter((c) => c.status === "fail")) problems.push(`${check.name} output:\n${check.output}`);
    }
  }
  const finished = last.stage === pack.stages.length;

  // Criteria 1 and 2: the migrated output type-checks, and the tests match the baseline.
  // JavaScript packs have no type-check; for them "compiles" means the app loads and serves (smoke),
  // or, without a smoke probe, that the test run loaded the migrated modules (ES module syntax and
  // missing exports fail when the module graph links, before any test runs).
  const typecheck = ["typecheck", "smoke", "test"].map((name) => last.checks.find((c) => c.name === name)).find((c) => c !== undefined);
  const before = baseline.checks.find((c) => c.name === "test")?.tests;
  const after = last.checks.find((c) => c.name === "test");
  const compiles = finished && typecheck?.status === "pass";
  const testParity = finished && after?.status === "pass" && before !== undefined && after.tests?.passed === before.passed && after.tests.failed === 0;

  // Criterion 4: negative patterns are flagged and left unchanged.
  let preserved = true;
  const remaining: Finding[] = detect(work, pack).findings;
  for (const { file, contains } of expectation.must_remain ?? []) {
    const path = join(work, file);
    if (!existsSync(path) || !readFileSync(path, "utf8").includes(contains)) {
      preserved = false;
      problems.push(`must_remain: ${file} no longer contains ${JSON.stringify(contains)}`);
    } else if (!remaining.some((f) => f.file === file && !f.auto_fixable)) {
      preserved = false;
      problems.push(`must_remain: nothing in ${file} is flagged for manual review after the migration`);
    }
  }
  const unfixed = remaining.filter((f) => f.auto_fixable);
  if (unfixed.length > 0) problems.push(`auto-fixable findings remain: ${unfixed.map(key).join(", ")}`);

  const want = tree(join(fixture.dir, "after"));
  const got = tree(work);
  const differing = [...new Set([...want.keys(), ...got.keys()])].filter((path) => want.get(path) !== got.get(path)).sort();
  if (differing.length > 0) problems.push(`differs from after/: ${differing.join(", ")}`);
  if (falsePositives.length > 0) problems.push(`unexpected findings: ${falsePositives.join(", ")}`);
  if (falseNegatives.length > 0) problems.push(`missing findings: ${falseNegatives.join(", ")}`);

  return {
    fixture: fixture.name,
    kind: expectation.kind,
    compiles,
    testParity,
    tests: `${after?.tests?.passed ?? "?"}/${before?.passed ?? "?"}`,
    truePositives: [...actual].filter((k) => expected.has(k)).length,
    falsePositives,
    falseNegatives,
    preserved,
    matchesAfter: differing.length === 0,
    autoFixed: unfixed.length === 0,
    manualItems,
    problems,
  };
}

const percent = (part: number, whole: number): string => (whole === 0 ? "n/a" : `${Math.round((part / whole) * 100)}%`);
const mark = (ok: boolean): string => (ok ? "yes" : "NO");

export function renderScorecard(scores: PackScore[]): string {
  const out = [
    "# Eval scorecard",
    "",
    "Generated by `npm run evals`. Criteria are defined in PLAN.md §9. For packs without a",
    "`typecheck` check, \"compiles\" means the migrated app boots and answers the smoke probe, or,",
    "without a smoke probe either, that the test run loaded the migrated modules.",
    "",
    "| Pack | Fixtures | Compile pass % | Test parity % | Finding precision | Finding recall | Manual items |",
    "|---|---|---|---|---|---|---|",
  ];
  for (const { pack, fixtures } of scores) {
    const tp = fixtures.reduce((n, f) => n + f.truePositives, 0);
    const fp = fixtures.reduce((n, f) => n + f.falsePositives.length, 0);
    const fn = fixtures.reduce((n, f) => n + f.falseNegatives.length, 0);
    out.push(
      `| \`${pack.id}\` | ${fixtures.length} | ${percent(fixtures.filter((f) => f.compiles).length, fixtures.length)} | ${percent(fixtures.filter((f) => f.testParity).length, fixtures.length)} | ${percent(tp, tp + fp)} | ${percent(tp, tp + fn)} | ${fixtures.reduce((n, f) => n + f.manualItems, 0)} |`,
    );
  }
  for (const { pack, fixtures } of scores) {
    out.push("", `## ${pack.id}`, "", "| Fixture | Kind | Compiles | Tests (after/baseline) | Findings TP / FP / FN | Negative patterns kept | Matches after/ | Manual items |", "|---|---|---|---|---|---|---|---|");
    for (const f of fixtures) {
      out.push(`| ${f.fixture} | ${f.kind} | ${mark(f.compiles)} | ${f.tests} ${mark(f.testParity)} | ${f.truePositives} / ${f.falsePositives.length} / ${f.falseNegatives.length} | ${f.kind === "negative" ? mark(f.preserved) : "—"} | ${mark(f.matchesAfter)} | ${f.manualItems} |`);
    }
    for (const f of fixtures.filter((f) => f.problems.length > 0)) {
      out.push("", `### ${f.fixture} — problems`, "", ...f.problems.map((p) => (p.includes("\n") ? `\`\`\`\n${p}\n\`\`\`` : `- ${p}`)));
    }
  }
  return `${out.join("\n")}\n`;
}

const passed = (f: FixtureScore): boolean =>
  f.compiles && f.testParity && f.falsePositives.length === 0 && f.falseNegatives.length === 0 && f.preserved && f.matchesAfter && f.autoFixed && f.problems.length === 0;

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const only = args.find((a) => !a.startsWith("--"));
  const workRoot = join(tmpdir(), "fm-evals");
  const scores: PackScore[] = [];
  for (const pack of listPacks()) {
    // A pack named on the command line runs whatever its status; otherwise only shipped packs do.
    if (only !== undefined ? pack.id !== only : pack.status !== "shipped") continue;
    console.log(`Pack ${pack.id}`);
    const { errors } = validatePack(pack.dir);
    if (errors.length > 0) throw new Error(`Pack ${pack.id} is invalid:\n  ${errors.join("\n  ")}`);
    const fixtures = loadFixtures(pack);
    const isolated = needsIsolation(pack, fixtures);
    // Isolated work directories must not sit below a shared node_modules.
    const depsDir = isolated ? join(workRoot, `${pack.id}-isolated`) : installDependencies(pack, fixtures, workRoot);
    if (isolated) console.log(`  the pack runs official tools or changes dependency versions: installing each fixture in ${depsDir}`);
    const results: FixtureScore[] = [];
    for (const fixture of fixtures) {
      const score = await scoreFixture(pack, fixture, depsDir, isolated);
      console.log(`  ${passed(score) ? "pass" : "FAIL"}  ${fixture.name}`);
      for (const problem of score.problems) console.log(`        ${problem.replace(/\n/g, "\n        ")}`);
      results.push(score);
      if (!args.includes("--keep")) rmSync(join(depsDir, fixture.name), { recursive: true, force: true });
    }
    scores.push({ pack, fixtures: results });
  }
  // The committed scorecard covers every shipped pack, so a single-pack run only prints its part.
  if (only === undefined) {
    const scorecard = join(dirname(fileURLToPath(import.meta.url)), "scorecard.md");
    writeFileSync(scorecard, renderScorecard(scores));
    console.log(`Wrote ${scorecard}`);
  } else {
    console.log(`\n${renderScorecard(scores)}`);
  }
  const all = scores.flatMap((s) => s.fixtures);
  if (all.length === 0) throw new Error("No shipped pack with fixtures was found");
  if (!all.every(passed)) process.exitCode = 1;
}

await main();
