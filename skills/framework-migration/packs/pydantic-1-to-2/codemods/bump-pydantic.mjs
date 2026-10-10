#!/usr/bin/env node
// Runs bump-pydantic (github.com/pydantic/bump-pydantic, version pinned in pack.yaml) on the
// project's Python packages. Not a jscodeshift codemod module: pack.yaml calls it as a stage command.
//
//   node bump-pydantic.mjs [--dry-run]
//
// bump-pydantic is installed in its own virtualenv in the cache directory with every dependency
// pinned (pack.yaml `tools`): its last release (0.8.0, 2023) does not bound typer or click, and
// current typer/click releases change its command line. It runs on a scratch copy of the project;
// the script prints the diff and, without --dry-run, copies the changes back. bump-pydantic's own
// error log (log.txt) is printed and not copied.
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const SKIPPED = new Set([".git", ".fm", ".venv", "venv", "__pycache__", "node_modules", ".tox", ".mypy_cache", ".pytest_cache"]);
const dryRun = process.argv.includes("--dry-run");
const project = process.cwd();

const packDir = dirname(dirname(fileURLToPath(import.meta.url)));
const tools = parse(readFileSync(join(packDir, "pack.yaml"), "utf8")).tools;
const engine = tools.filter((t) => t.role === "engine");
const bump = engine.find((t) => t.name === "bump-pydantic");
if (bump === undefined) {
  console.error("pack.yaml must pin bump-pydantic");
  process.exit(2);
}

function toolBin() {
  const cacheRoot = process.env.FM_CACHE_DIR ?? join(process.env.XDG_CACHE_HOME ?? join(homedir(), ".cache"), "framework-migration");
  const key = engine.map((t) => `${t.name}-${t.version}`).join("_");
  const dir = join(cacheRoot, `bump-pydantic-${bump.version}-${key.length}`);
  const bin = join(dir, "bin", "bump-pydantic");
  if (existsSync(join(dir, ".fm-complete")) && readFileSync(join(dir, ".fm-complete"), "utf8") === `${key}\n`) return bin;
  // A virtualenv's scripts hard-code its path: create it where it stays, mark it complete last.
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dirname(dir), { recursive: true });
  execFileSync("python3", ["-m", "venv", dir], { stdio: ["ignore", "ignore", "inherit"] });
  const specs = engine.map((t) => `${t.name}==${t.version}`);
  execFileSync(join(dir, "bin", "python"), ["-m", "pip", "install", "--quiet", "--disable-pip-version-check", ...specs], { stdio: ["ignore", "ignore", "inherit"] });
  writeFileSync(join(dir, ".fm-complete"), `${key}\n`);
  return bin;
}

/** The top-level directories holding Python files, or "." when there are Python files at the root. */
function targets(root) {
  const files = execFileSync("git", ["-C", root, "ls-files", "*.py"], { encoding: "utf8" }).split("\n").filter(Boolean);
  if (files.some((path) => !path.includes("/"))) return ["."];
  return [...new Set(files.map((path) => path.slice(0, path.indexOf("/"))))].sort();
}

const bin = toolBin();
const scratch = mkdtempSync(join(tmpdir(), "fm-pydantic-"));
try {
  cpSync(project, scratch, { recursive: true, filter: (path) => !relative(project, path).split(sep).some((part) => SKIPPED.has(part)) });
  const git = (...a) => execFileSync("git", ["-C", scratch, "-c", "user.name=fm", "-c", "user.email=fm@localhost", ...a], { encoding: "utf8" });
  git("init", "-q");
  git("add", "-A");
  git("commit", "-q", "--allow-empty", "--no-verify", "-m", "before");

  const log = join(tmpdir(), `fm-bump-pydantic-${process.pid}.log`);
  for (const target of targets(scratch)) {
    const run = spawnSync(bin, ["--log-file", log, target], { cwd: scratch, encoding: "utf8", env: { ...process.env, COLUMNS: "200", NO_COLOR: "1" } });
    process.stdout.write(run.stdout + run.stderr);
    if (run.status !== 0) process.exit(run.status ?? 1);
  }
  if (existsSync(log)) {
    const errors = readFileSync(log, "utf8").trim();
    if (errors !== "") console.log(`bump-pydantic reported:\n${errors}`);
    rmSync(log, { force: true });
  }

  git("add", "-A");
  const diff = git("diff", "--cached", "--no-color", "--no-ext-diff");
  process.stdout.write(diff === "" ? "No changes.\n" : diff);
  if (!dryRun) {
    for (const line of git("diff", "--cached", "--name-status", "--no-renames").split("\n").filter(Boolean)) {
      const [status, path] = line.split("\t");
      if (status === "D") rmSync(join(project, path), { force: true });
      else {
        mkdirSync(dirname(join(project, path)), { recursive: true });
        cpSync(join(scratch, path), join(project, path));
      }
    }
  }
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
