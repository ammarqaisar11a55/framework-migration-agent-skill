import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createTwoFilesPatch } from "diff";
import jscodeshift from "jscodeshift";
import { adapterFor } from "./adapters.ts";
import { artifactPath, writeText } from "./artifacts.ts";
import { JS_EXTENSIONS } from "./ast.ts";
import { exec, type ExecResult } from "./exec.ts";
import { buildInventory } from "./inventory.ts";
import { walk } from "./paths.ts";
import type { Inventory, Pack, PackStage, StageCommand } from "./types.ts";

/** What a codemod receives as its third argument, in addition to anything jscodeshift defines. */
export interface CodemodContext {
  pack: Pack;
  inventory: Inventory;
  /** The file's path when the stage started (codemods earlier in the stage may have renamed it). */
  originalPath: string;
  /** Current content of a project file as this stage sees it, or undefined. */
  read(path: string): string | undefined;
  /** Record a note for the stage summary and the migration report. */
  note(message: string): void;
}

export interface CodemodApi {
  jscodeshift: jscodeshift.JSCodeshift;
  j: jscodeshift.JSCodeshift;
  stats(name: string, quantity?: number): void;
  report(message: string): void;
}

type MaybePromise<T> = T | Promise<T>;

/** The module shape of a file in a pack's codemods/ directory. */
export interface CodemodModule {
  default?: (file: { path: string; source: string }, api: CodemodApi, options: CodemodContext) => MaybePromise<string | null | undefined>;
  parser?: string;
  include?: (path: string) => boolean;
  rename?: (path: string, context: CodemodContext) => string | undefined;
  createFiles?: (context: Omit<CodemodContext, "originalPath">) => Record<string, string>;
}

export interface FileChange {
  /** Path before the codemod; null for a created file. */
  from: string | null;
  to: string;
  before: string;
  after: string;
}

export interface CodemodResult {
  codemod: string;
  changes: FileChange[];
  notes: string[];
  errors: { path: string; message: string }[];
  patch: string;
}

export interface CommandResult {
  command: string;
  phase: "before" | "after";
  /** "skipped" = a command with no preview mode during --dry-run, or --skip-commands. */
  status: "ok" | "failed" | "skipped";
  output: string;
}

export interface StageResult {
  pack: string;
  stage: string;
  /** 1-based position of the stage in pack.yaml; stage 0 is the baseline. */
  number: number;
  mode: "dry-run" | "apply";
  codemods: CodemodResult[];
  commands: CommandResult[];
  patches: string[];
  ok: boolean;
}

const PARSER_BY_EXTENSION: Record<string, string> = { ".ts": "ts", ".mts": "ts", ".cts": "ts", ".tsx": "tsx" };

const defaultInclude = (path: string): boolean => JS_EXTENSIONS.includes(extname(path));

/** A git-style unified diff for one file change, including renames and new files. */
export function formatPatch(change: FileChange): string {
  const from = change.from ?? change.to;
  const lines = [`diff --git a/${from} b/${change.to}`];
  if (change.from === null) lines.push("new file mode 100644");
  else if (change.from !== change.to) lines.push(`rename from ${change.from}`, `rename to ${change.to}`);
  if (change.before !== change.after) {
    const body = createTwoFilesPatch(change.from === null ? "/dev/null" : `a/${from}`, `b/${change.to}`, change.before, change.after);
    // Drop the "Index:" / "====" preamble; git wants the file headers straight after its own.
    lines.push(body.slice(body.indexOf("--- ")).trimEnd());
  }
  return `${lines.join("\n")}\n`;
}

/** In-memory overlay over the project, so a multi-codemod stage can be previewed without writing. */
class Overlay {
  private readonly content = new Map<string, string | null>();
  /** current path → path at stage start */
  readonly origin = new Map<string, string>();

  constructor(private readonly root: string, readonly paths: Set<string>) {
    for (const path of paths) this.origin.set(path, path);
  }

  read(path: string): string | undefined {
    const cached = this.content.get(path);
    if (cached !== undefined) return cached ?? undefined;
    if (!this.paths.has(path) || !existsSync(join(this.root, path))) return undefined;
    const text = readFileSync(join(this.root, path), "utf8");
    this.content.set(path, text);
    return text;
  }

  write(path: string, text: string): void {
    this.content.set(path, text);
    this.paths.add(path);
    if (!this.origin.has(path)) this.origin.set(path, path);
  }

  rename(from: string, to: string): void {
    const text = this.read(from) ?? "";
    this.content.set(to, text);
    this.content.set(from, null);
    this.paths.delete(from);
    this.paths.add(to);
    this.origin.set(to, this.origin.get(from) ?? from);
    this.origin.delete(from);
  }

  /** Writes every pending change to disk. */
  flush(): void {
    for (const [path, text] of this.content) {
      const full = join(this.root, path);
      if (text === null) {
        rmSync(full, { force: true });
      } else if (!existsSync(full) || readFileSync(full, "utf8") !== text) {
        mkdirSync(dirname(full), { recursive: true });
        writeFileSync(full, text);
      }
    }
  }
}

async function runOne(name: string, mod: CodemodModule, overlay: Overlay, pack: Pack, inventory: Inventory): Promise<CodemodResult> {
  const result: CodemodResult = { codemod: name, changes: [], notes: [], errors: [], patch: "" };
  const base = {
    pack,
    inventory,
    read: (path: string) => overlay.read(path),
    note: (message: string) => {
      if (!result.notes.includes(message)) result.notes.push(message);
    },
  };

  for (const [path, content] of Object.entries(mod.createFiles?.(base) ?? {})) {
    if (overlay.read(path) !== undefined) {
      base.note(`${path} already exists; left as is`);
      continue;
    }
    overlay.write(path, content);
    result.changes.push({ from: null, to: path, before: "", after: content });
  }

  const include = mod.include ?? defaultInclude;
  // Leaf → root: inventory order first, then files the inventory does not track (configs, manifests).
  const rank = new Map(inventory.order.map((path, index) => [path, index]));
  const targets = [...overlay.paths]
    .filter((path) => include(path))
    .sort((a, b) => {
      const ra = rank.get(overlay.origin.get(a) ?? a) ?? Number.MAX_SAFE_INTEGER;
      const rb = rank.get(overlay.origin.get(b) ?? b) ?? Number.MAX_SAFE_INTEGER;
      return ra - rb || a.localeCompare(b);
    });

  for (const path of targets) {
    const before = overlay.read(path);
    if (before === undefined) continue;
    const context: CodemodContext = { ...base, originalPath: overlay.origin.get(path) ?? path };
    let after = before;
    let to: string;
    try {
      if (mod.default !== undefined) {
        const j = jscodeshift.withParser(mod.parser ?? PARSER_BY_EXTENSION[extname(path)] ?? "babel");
        const api: CodemodApi = { jscodeshift: j, j, stats: () => undefined, report: base.note };
        const output = await mod.default({ path, source: before }, api, context);
        if (typeof output === "string") after = output;
      }
      to = mod.rename?.(path, context) ?? path;
    } catch (error) {
      result.errors.push({ path, message: (error as Error).message });
      continue;
    }
    if (after === before && to === path) continue;
    if (to !== path && overlay.read(to) !== undefined) {
      result.errors.push({ path, message: `cannot rename to ${to}: the file already exists` });
      continue;
    }
    if (after !== before) overlay.write(path, after);
    if (to !== path) overlay.rename(path, to);
    result.changes.push({ from: path, to, before, after });
  }

  result.patch = result.changes.map(formatPatch).join("");
  return result;
}

const commandText = (command: StageCommand, dryRun: boolean): string | undefined =>
  typeof command === "string" ? (dryRun ? undefined : command) : dryRun ? command.dry_run : command.run;

export interface RunStageOptions {
  apply?: boolean;
  /** Do not run the stage's commands / post_commands (the caller handles them). */
  skipCommands?: boolean;
  env?: NodeJS.ProcessEnv;
  /** Codemod modules to use instead of importing them from the pack (unit tests). */
  modules?: Record<string, CodemodModule>;
}

export function stageNumber(pack: Pack, stageId: string): number {
  const index = pack.stages.findIndex((s) => s.id === stageId);
  if (index === -1) throw new Error(`Pack "${pack.id}" has no stage "${stageId}" (stages: ${pack.stages.map((s) => s.id).join(", ")})`);
  return index + 1;
}

/**
 * Runs one stage of a pack: official-tool commands, then the pack's codemods leaf → root.
 * The patch for every codemod is always written to .fm/diffs/stage-N/ first; files are only
 * modified when `apply` is set.
 */
export async function runStage(rootDir: string, pack: Pack, stageId: string, options: RunStageOptions = {}): Promise<StageResult> {
  const root = resolve(rootDir);
  const number = stageNumber(pack, stageId);
  const stage = pack.stages[number - 1] as PackStage;
  const apply = options.apply === true;
  const image = adapterFor(pack.ecosystem).image;
  const result: StageResult = { pack: pack.id, stage: stage.id, number, mode: apply ? "apply" : "dry-run", codemods: [], commands: [], patches: [], ok: true };
  const diffDir = artifactPath(root, "diffs", `stage-${number}`);
  rmSync(diffDir, { recursive: true, force: true });

  const runCommands = (commands: readonly StageCommand[], phase: "before" | "after"): boolean => {
    for (const [index, command] of commands.entries()) {
      const text = commandText(command, !apply);
      const label = typeof command === "string" ? command : command.run;
      if (text === undefined || options.skipCommands === true) {
        result.commands.push({ command: label, phase, status: "skipped", output: "" });
        continue;
      }
      const execOptions = { cwd: root, ...(image === undefined ? {} : { image }), ...(options.env === undefined ? {} : { env: options.env }) };
      const run: ExecResult = exec(text, execOptions);
      const status = run.exitCode === 0 ? "ok" : "failed";
      result.commands.push({ command: text, phase, status, output: run.output });
      const log = join(diffDir, `command-${phase}-${index + 1}.txt`);
      writeText(log, `$ ${text}\n${run.output}`);
      result.patches.push(log);
      if (status === "failed") return false;
    }
    return true;
  };

  if (!runCommands(stage.commands ?? [], "before")) return { ...result, ok: false };

  const inventory = buildInventory(root);
  const overlay = new Overlay(root, new Set(walk(root)));
  for (const name of stage.codemods ?? []) {
    const mod = options.modules?.[name] ?? ((await import(pathToFileURL(join(pack.dir, "codemods", name)).href)) as CodemodModule);
    const codemod = await runOne(name, mod, overlay, pack, inventory);
    result.codemods.push(codemod);
    const patch = join(diffDir, `${name.replace(/\.[cm]?js$/, "")}.patch`);
    writeText(patch, codemod.patch);
    result.patches.push(patch);
    if (codemod.errors.length > 0) result.ok = false;
  }
  if (!result.ok) return result;

  if (apply) overlay.flush();
  if (!runCommands(stage.post_commands ?? [], "after")) result.ok = false;
  return result;
}
