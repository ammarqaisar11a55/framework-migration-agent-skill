#!/usr/bin/env node
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { resolve } from "node:path";
import { artifactPath, writeJson } from "./artifacts.ts";
import { detectStack, matchPacks } from "./detect-stack.ts";
import { buildInventory } from "./inventory.ts";
import { listPacks, validatePack } from "./pack.ts";
import { validate } from "./schema.ts";

export interface CliResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

interface Args {
  positionals: string[];
  values: Record<string, string | boolean | undefined>;
}

type Handler = (args: Args) => CliResult | Promise<CliResult>;

export interface Command {
  name: string;
  usage: string;
  summary: string;
  /** Milestone in PLAN.md that implements the command. */
  milestone: string;
  handler?: Handler;
}

const ok = (stdout: string): CliResult => ({ exitCode: 0, stdout, stderr: "" });
const fail = (stderr: string, exitCode = 1): CliResult => ({ exitCode, stdout: "", stderr });

const validatePackCommand: Handler = ({ positionals }) => {
  const [dir] = positionals;
  if (dir === undefined) return fail("fm validate-pack: missing <path>", 2);
  const { errors, warnings } = validatePack(dir);
  const lines = [...errors.map((e) => `error: ${e}`), ...warnings.map((w) => `warning: ${w}`)];
  if (errors.length > 0) return fail([`Pack at ${dir} is invalid:`, ...lines].join("\n"));
  return ok([`Pack at ${dir} is valid.`, ...lines].join("\n"));
};

const detectStackCommand: Handler = ({ positionals }) => {
  const stacks = detectStack(resolve(positionals[0] ?? "."));
  const packs = matchPacks(stacks, listPacks()).map((m) => ({
    id: m.pack.id,
    title: m.pack.title,
    tier: m.pack.tier,
    status: m.pack.status,
    versionVerified: m.versionVerified,
  }));
  return ok(JSON.stringify({ stacks, packs }, null, 2));
};

const inventoryCommand: Handler = ({ positionals, values }) => {
  const root = resolve(positionals[0] ?? ".");
  const inventory = buildInventory(root);
  const errors = validate("inventory", inventory);
  if (errors.length > 0) return fail(`fm inventory: produced an invalid inventory:\n  ${errors.join("\n  ")}`);
  const out = typeof values["out"] === "string" ? resolve(values["out"]) : artifactPath(root, "inventory.json");
  writeJson(out, inventory);
  const risky = inventory.files.filter((f) => f.risk.level === "high");
  return ok(
    [
      `Wrote ${out}`,
      `Stacks: ${inventory.stacks.map((s) => `${s.ecosystem}/${s.language}`).join(", ") || "none detected"}`,
      `Source files: ${inventory.files.length}`,
      `Entry points: ${inventory.entryPoints.join(", ") || "none found"}`,
      `High-risk files: ${risky.length}`,
      ...risky.map((f) => `  ${f.path} — ${f.risk.reasons.join("; ")}`),
    ].join("\n"),
  );
};

export const COMMANDS: readonly Command[] = [
  { name: "validate-pack", usage: "validate-pack <path>", summary: "Validate a pack directory against the schemas", milestone: "M2", handler: validatePackCommand },
  { name: "detect-stack", usage: "detect-stack [dir]", summary: "Detect language, framework and version from manifests", milestone: "M3", handler: detectStackCommand },
  { name: "inventory", usage: "inventory [dir] [--out <file>]", summary: "Build inventory.json (files, dependency graph, entry points, risk)", milestone: "M3", handler: inventoryCommand },
  { name: "detect", usage: "detect --pack <id> [dir]", summary: "Run a pack's rules and write findings.json", milestone: "M4" },
  { name: "run-codemod", usage: "run-codemod --pack <id> --stage <id> (--dry-run | --apply) [dir]", summary: "Run a stage's codemods; dry-run writes patches", milestone: "M4" },
  { name: "check", usage: "check --pack <id> --stage <n> [dir]", summary: "Run a pack's compatibility checks against the baseline", milestone: "M5" },
  { name: "report", usage: "report --pack <id> [dir]", summary: "Generate MIGRATION_REPORT.md", milestone: "M5" },
];

export function usage(): string {
  const width = Math.max(...COMMANDS.map((c) => c.name.length));
  const lines = COMMANDS.map((c) => `  ${c.name.padEnd(width)}  ${c.summary}`);
  const usages = COMMANDS.map((c) => `  fm ${c.usage}`);
  return ["Usage: fm <command> [options]", "", "Commands:", ...lines, "", "Synopsis:", ...usages].join("\n");
}

const OPTIONS = {
  pack: { type: "string" },
  stage: { type: "string" },
  out: { type: "string" },
  "dry-run": { type: "boolean" },
  apply: { type: "boolean" },
  baseline: { type: "boolean" },
  "skip-commands": { type: "boolean" },
  json: { type: "boolean" },
} as const;

export async function run(argv: readonly string[]): Promise<CliResult> {
  const [name, ...rest] = argv;
  if (name === undefined || name === "help" || name === "--help" || name === "-h") return ok(usage());
  const command = COMMANDS.find((c) => c.name === name);
  if (command === undefined) return fail(`fm: unknown command "${name}"\n\n${usage()}`, 2);
  if (command.handler === undefined) {
    return fail(`fm: "${command.name}" is not implemented yet (planned for ${command.milestone})`);
  }
  let args: Args;
  try {
    args = parseArgs({ args: rest, options: OPTIONS, allowPositionals: true });
  } catch (error) {
    return fail(`fm ${command.name}: ${(error as Error).message}\nUsage: fm ${command.usage}`, 2);
  }
  try {
    return await command.handler(args);
  } catch (error) {
    return fail(`fm ${command.name}: ${(error as Error).message}`);
  }
}

// npm installs the bin as a symlink, so compare real paths.
if (process.argv[1] !== undefined && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await run(process.argv.slice(2));
  if (result.stdout) console.log(result.stdout);
  if (result.stderr) console.error(result.stderr);
  process.exitCode = result.exitCode;
}
