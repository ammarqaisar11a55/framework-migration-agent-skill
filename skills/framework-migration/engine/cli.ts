#!/usr/bin/env node
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

export interface Command {
  name: string;
  summary: string;
  /** Milestone in PLAN.md that implements the command. */
  milestone: string;
}

export const COMMANDS: readonly Command[] = [
  { name: "validate-pack", summary: "Validate a pack directory against the schemas", milestone: "M2" },
  { name: "detect-stack", summary: "Detect language, framework and version from manifests", milestone: "M3" },
  { name: "inventory", summary: "Build inventory.json (files, dependency graph, entry points, risk)", milestone: "M3" },
  { name: "detect", summary: "Run a pack's rules and write findings.json", milestone: "M4" },
  { name: "run-codemod", summary: "Run codemods with --dry-run (patch) or --apply", milestone: "M4" },
  { name: "check", summary: "Run a pack's compatibility checks against the baseline", milestone: "M5" },
  { name: "report", summary: "Generate MIGRATION_REPORT.md", milestone: "M5" },
];

export function usage(): string {
  const width = Math.max(...COMMANDS.map((c) => c.name.length));
  const lines = COMMANDS.map((c) => `  ${c.name.padEnd(width)}  ${c.summary}`);
  return ["Usage: fm <command> [options]", "", "Commands:", ...lines].join("\n");
}

export interface CliResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export function run(argv: readonly string[]): CliResult {
  const [name] = argv;
  if (name === undefined || name === "help" || name === "--help" || name === "-h") {
    return { exitCode: 0, stdout: usage(), stderr: "" };
  }
  const command = COMMANDS.find((c) => c.name === name);
  if (command === undefined) {
    return { exitCode: 2, stdout: "", stderr: `fm: unknown command "${name}"\n\n${usage()}` };
  }
  return {
    exitCode: 1,
    stdout: "",
    stderr: `fm: "${command.name}" is not implemented yet (planned for ${command.milestone})`,
  };
}

// npm installs the bin as a symlink, so compare real paths.
if (process.argv[1] !== undefined && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = run(process.argv.slice(2));
  if (result.stdout) console.log(result.stdout);
  if (result.stderr) console.error(result.stderr);
  process.exitCode = result.exitCode;
}
