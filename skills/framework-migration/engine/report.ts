import { resolve } from "node:path";
import { artifactPath, readJson } from "./artifacts.ts";
import { readCheck, type CheckOutcome, type StageCheck } from "./check.ts";
import { detect } from "./detect.ts";
import { exec } from "./exec.ts";
import { buildInventory } from "./inventory.ts";
import type { Finding, FindingsFile, Pack, Risk } from "./types.ts";

export interface StageSummary {
  codemods: { codemod: string; files: string[]; notes: string[]; errors: { path: string; message: string }[] }[];
  commands: { command: string; phase: string; status: string }[];
  mode: "dry-run" | "apply";
  patches: string[];
}

export interface ReportStage {
  number: number;
  id: string;
  title?: string;
  /** Absent = the stage was never run. */
  summary?: StageSummary;
  check?: StageCheck;
  /** Commit that recorded this stage, if one was found. */
  commit?: string;
}

export interface ReportData {
  pack: Pick<Pack, "id" | "title" | "tier" | "from" | "to">;
  baseline?: StageCheck;
  stages: ReportStage[];
  /** Findings when the migration started. */
  baselineFindings: Finding[];
  /** Findings in the tree as it is now. */
  remainingFindings: Finding[];
  risks: { path: string; risk: Risk }[];
}

const cell = (text: string): string => text.replace(/\|/g, "\\|").replace(/\n/g, " ");
const table = (head: string[], rows: string[][]): string[] => [
  `| ${head.join(" | ")} |`,
  `|${head.map(() => "---").join("|")}|`,
  ...rows.map((row) => `| ${row.map(cell).join(" | ")} |`),
];

const describeStack = (s: Pack["from"]): string => `${s.framework} ${s.versions}${s.language === undefined ? "" : ` (${s.language})`}`;
const short = (commit: string | undefined): string => (commit === undefined ? "—" : `\`${commit.slice(0, 10)}\``);

function outcome(check: StageCheck | undefined, name: CheckOutcome["name"]): string {
  const found = check?.checks.find((c) => c.name === name);
  if (found === undefined) return "—";
  const counts = found.tests === undefined ? "" : ` (${found.tests.passed} passed, ${found.tests.failed} failed)`;
  return `${found.status}${counts}`;
}

function stageStatus(stage: ReportStage): string {
  if (stage.summary === undefined || stage.summary.mode !== "apply") return "not run";
  if (stage.check === undefined) return "applied, not checked";
  return stage.check.gate.passed ? "passed" : "FAILED";
}

/** Renders MIGRATION_REPORT.md. Pure: the same data always gives the same text. */
export function renderReport(data: ReportData): string {
  const { pack, baseline, stages } = data;
  const failed = stages.find((s) => s.check !== undefined && !s.check.gate.passed);
  const pending = stages.filter((s) => stageStatus(s) === "not run" || stageStatus(s) === "applied, not checked");
  const manual = data.remainingFindings.filter((f) => !f.auto_fixable);
  const unfixed = data.remainingFindings.filter((f) => f.auto_fixable);
  const verdict =
    baseline !== undefined && !baseline.gate.passed
      ? "Stopped at the baseline: the gate did not pass, nothing was migrated."
      : failed !== undefined
        ? `Stopped at stage ${failed.number} (${failed.id}): its gate failed.`
        : pending.length > 0
          ? `Incomplete: ${pending.length} of ${stages.length} stages have not passed their gate yet.`
          : `All ${stages.length} stages passed their gates.`;

  const out: string[] = [
    "# Migration report",
    "",
    `**Pack:** \`${pack.id}\` — ${pack.title} (tier ${pack.tier})`,
    "",
    `**Path:** ${describeStack(pack.from)} → ${describeStack(pack.to)}`,
    "",
    `**Result:** ${verdict} ${manual.length} manual follow-up${manual.length === 1 ? "" : "s"} remain${manual.length === 1 ? "s" : ""}.`,
    "",
    "## Stages",
    "",
    ...table(
      ["#", "Stage", "Gate", "Files changed", "Type-check", "Tests", "Smoke", "Commit"],
      [
        ["0", "baseline", baseline === undefined ? "not run" : baseline.gate.passed ? "passed" : "FAILED", "—", "—", outcome(baseline, "test"), "—", short(baseline?.commit)],
        ...stages.map((s) => [
          String(s.number),
          s.id,
          stageStatus(s),
          s.summary === undefined ? "—" : String(new Set(s.summary.codemods.flatMap((c) => c.files)).size),
          outcome(s.check, "typecheck"),
          outcome(s.check, "test"),
          outcome(s.check, "smoke"),
          short(s.commit),
        ]),
      ],
    ),
    "",
  ];

  for (const check of [baseline, ...stages.map((s) => s.check)]) {
    if (check === undefined || (check.gate.reasons.length === 0 && check.warnings.length === 0)) continue;
    out.push(`### Stage ${check.stage} (${check.stageId}) notes`, "");
    for (const reason of check.gate.reasons) out.push(`- **Gate failed:** ${reason}`);
    for (const warning of check.warnings) out.push(`- Warning: ${warning}`);
    for (const c of check.checks.filter((c) => c.status === "fail")) out.push("", `\`${c.command}\` (exit code ${c.exitCode}):`, "", "```", c.output, "```");
    out.push("");
  }

  out.push("## What each stage changed", "");
  for (const stage of stages) {
    out.push(`### Stage ${stage.number} — ${stage.id}${stage.title === undefined ? "" : `: ${stage.title}`}`, "");
    if (stage.summary === undefined) {
      out.push("Not run.", "");
      continue;
    }
    if (stage.summary.mode === "dry-run") out.push("Previewed only (dry run); nothing was applied.", "");
    for (const command of stage.summary.commands) out.push(`- Command (${command.status}): \`${command.command}\``);
    for (const codemod of stage.summary.codemods) {
      out.push(`- \`${codemod.codemod}\` — ${codemod.files.length} file${codemod.files.length === 1 ? "" : "s"}${codemod.files.length === 0 ? "" : `: ${codemod.files.join(", ")}`}`);
      for (const note of codemod.notes) out.push(`  - Note: ${note}`);
      for (const error of codemod.errors) out.push(`  - **Error:** ${error.path}: ${error.message}`);
    }
    if (stage.summary.codemods.length === 0 && stage.summary.commands.length === 0) out.push("- Nothing to do.");
    out.push(`- Diff: \`.fm/diffs/stage-${stage.number}/\``, "");
  }

  out.push("## Manual follow-ups", "");
  if (manual.length === 0) out.push("None.", "");
  else out.push(...table(["Location", "Rule", "Severity", "What to do", "Docs"], manual.map((f) => [`${f.file}:${f.line}`, f.rule, f.severity, f.fix_hint, f.docs_url])), "");
  if (unfixed.length > 0) {
    out.push("### Auto-fixable findings still present", "", "These should have been fixed by a codemod. Check the stage that owns them before fixing by hand.", "");
    out.push(...table(["Location", "Rule", "What to do"], unfixed.map((f) => [`${f.file}:${f.line}`, f.rule, f.fix_hint])), "");
  }

  out.push("## Findings", "");
  const byRule = new Map<string, [before: number, after: number]>();
  for (const f of data.baselineFindings) byRule.set(f.rule, [(byRule.get(f.rule)?.[0] ?? 0) + 1, 0]);
  for (const f of data.remainingFindings) byRule.set(f.rule, [byRule.get(f.rule)?.[0] ?? 0, (byRule.get(f.rule)?.[1] ?? 0) + 1]);
  if (byRule.size === 0) out.push("No rule matched.", "");
  else out.push(...table(["Rule", "At baseline", "Now"], [...byRule].sort(([a], [b]) => a.localeCompare(b)).map(([rule, [before, after]]) => [rule, String(before), String(after)])), "");

  out.push("## Risks", "");
  if (data.risks.length === 0) out.push("No file was scored medium or high risk.", "");
  else out.push(...table(["File", "Risk", "Why"], data.risks.map((r) => [r.path, `${r.risk.level} (${r.risk.score})`, r.risk.reasons.join("; ")])), "");

  out.push("## Rollback", "");
  const points = stages.filter((s) => s.commit !== undefined);
  if (baseline?.commit === undefined && points.length === 0) {
    out.push("No commits were recorded, so there are no rollback points.", "");
  } else {
    out.push("Each stage is one commit. To undo a stage and everything after it, reset to the commit before it:", "");
    if (baseline?.commit !== undefined) out.push(`- Before the migration: \`git reset --hard ${baseline.commit}\``);
    for (const s of points) out.push(`- After stage ${s.number} (${s.id}): \`git reset --hard ${s.commit ?? ""}\``);
    out.push("");
  }
  return out.join("\n");
}

/** Stage commits are recognised by the subject SKILL.md prescribes: `migrate(<pack>): stage <n> ...`. */
export function stageCommits(root: string, packId: string): Map<number, string> {
  const log = exec("git log --format=%H%x09%s", { cwd: root });
  const commits = new Map<number, string>();
  if (log.exitCode !== 0) return commits;
  for (const line of log.output.split("\n")) {
    const [hash, subject = ""] = line.split("\t");
    const match = /^migrate\(([^)]+)\): stage (\d+)\b/.exec(subject);
    const number = Number(match?.[2]);
    // git log is newest first: keep the newest commit per stage.
    if (hash !== undefined && match?.[1] === packId && !commits.has(number)) commits.set(number, hash);
  }
  return commits;
}

/** Gathers everything the report needs from .fm/, git and the current tree. */
export function collectReportData(rootDir: string, pack: Pack): ReportData {
  const root = resolve(rootDir);
  const commits = stageCommits(root, pack.id);
  const stages: ReportStage[] = pack.stages.map((stage, index) => {
    const number = index + 1;
    const entry: ReportStage = { number, id: stage.id };
    if (stage.title !== undefined) entry.title = stage.title;
    const summary = readJson<StageSummary>(artifactPath(root, "diffs", `stage-${number}`, "summary.json"));
    if (summary !== undefined) entry.summary = summary;
    const check = readCheck(root, number);
    if (check !== undefined) entry.check = check;
    const commit = commits.get(number);
    if (commit !== undefined) entry.commit = commit;
    return entry;
  });
  const data: ReportData = {
    pack,
    stages,
    baselineFindings: readJson<FindingsFile>(artifactPath(root, "findings.json"))?.findings ?? [],
    remainingFindings: detect(root, pack).findings,
    risks: buildInventory(root)
      .files.filter((f) => f.risk.level !== "low")
      .map((f) => ({ path: f.path, risk: f.risk }))
      .sort((a, b) => b.risk.score - a.risk.score || a.path.localeCompare(b.path)),
  };
  const baseline = readCheck(root, 0);
  if (baseline !== undefined) data.baseline = baseline;
  return data;
}
