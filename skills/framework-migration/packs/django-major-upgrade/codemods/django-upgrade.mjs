#!/usr/bin/env node
// Runs django-upgrade (github.com/adamchainz/django-upgrade, version pinned in pack.yaml) on the
// project's Python files. Not a jscodeshift codemod module: pack.yaml calls it as a stage command.
//
//   node django-upgrade.mjs <target-version> [--dry-run]
//
// django-upgrade rewrites files in place and has no dry-run mode, so it runs on a scratch copy; the
// script prints the diff and, without --dry-run, copies the changes back. The tool is installed in
// its own virtualenv in the cache directory, so it never touches the project's environment.
//
// One step beyond the tool: its index_together fixer turns `Meta.index_together` into
// `Meta.indexes`, which needs a migration (Django's deprecation note: "generate a migration", a
// RenameIndex). For each app whose models lost index_together, the script runs
// `python manage.py makemigrations <app>` with the project's Python (the `python` on PATH, i.e. the
// project's activated virtualenv) in the scratch copy, so the migration is part of the diff.
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { basename, dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const SKIPPED = new Set([".git", ".fm", ".venv", "venv", "__pycache__", "node_modules", ".tox", ".mypy_cache", ".pytest_cache"]);
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const target = args.find((a) => /^\d+\.\d+$/.test(a));
const project = process.cwd();
if (target === undefined) {
  console.error("usage: django-upgrade.mjs <target-version> [--dry-run]");
  process.exit(2);
}

const packDir = dirname(dirname(fileURLToPath(import.meta.url)));
const tool = parse(readFileSync(join(packDir, "pack.yaml"), "utf8")).tools.find((t) => t.name === "django-upgrade");
if (tool === undefined) {
  console.error("pack.yaml must pin django-upgrade");
  process.exit(2);
}

/** A virtualenv with the pinned django-upgrade, created once per version. */
function toolBin() {
  const cacheRoot = process.env.FM_CACHE_DIR ?? join(process.env.XDG_CACHE_HOME ?? join(homedir(), ".cache"), "framework-migration");
  const dir = join(cacheRoot, `django-upgrade-${tool.version}`);
  const bin = join(dir, "bin", "django-upgrade");
  if (existsSync(join(dir, ".fm-complete"))) return bin;
  // A virtualenv's scripts hard-code its path, so it is created where it will stay; the marker is
  // written last, so an interrupted install is redone.
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dirname(dir), { recursive: true });
  execFileSync("python3", ["-m", "venv", dir], { stdio: ["ignore", "ignore", "inherit"] });
  execFileSync(join(dir, "bin", "python"), ["-m", "pip", "install", "--quiet", "--disable-pip-version-check", `django-upgrade==${tool.version}`], { stdio: ["ignore", "ignore", "inherit"] });
  writeFileSync(join(dir, ".fm-complete"), `${tool.version}\n`);
  return bin;
}

const bin = toolBin();
const scratch = mkdtempSync(join(tmpdir(), "fm-django-"));
try {
  cpSync(project, scratch, { recursive: true, filter: (path) => !relative(project, path).split(sep).some((part) => SKIPPED.has(part)) });
  const git = (...a) => execFileSync("git", ["-C", scratch, "-c", "user.name=fm", "-c", "user.email=fm@localhost", ...a], { encoding: "utf8" });
  git("init", "-q");
  git("add", "-A");
  git("commit", "-q", "--allow-empty", "--no-verify", "-m", "before");

  const files = git("ls-files", "*.py").split("\n").filter(Boolean);
  if (files.length > 0) {
    // Exit status 1 means "files were rewritten".
    const run = spawnSync(bin, ["--target-version", target, ...files], { cwd: scratch, encoding: "utf8" });
    process.stdout.write(run.stdout + run.stderr);
    if (run.status !== 0 && run.status !== 1) process.exit(run.status ?? 1);
  }

  const changedModels = git("diff", "--name-only").split("\n").filter((path) => /(^|\/)models\.py$/.test(path));
  const lostIndexTogether = changedModels.filter((path) => /\bindex_together\b/.test(git("show", `HEAD:${path}`)) && !/\bindex_together\b/.test(readFileSync(join(scratch, path), "utf8")));
  for (const path of lostIndexTogether) {
    const app = basename(dirname(path));
    if (!existsSync(join(scratch, "manage.py"))) {
      console.log(`${path}: index_together became Meta.indexes; run makemigrations ${app} (no manage.py found)`);
      continue;
    }
    console.log(`makemigrations ${app} (index_together became Meta.indexes)`);
    const make = spawnSync("python", ["manage.py", "makemigrations", app, "--noinput", "--no-header"], { cwd: scratch, encoding: "utf8" });
    process.stdout.write(make.stdout + make.stderr);
    if (make.status !== 0) process.exit(make.status ?? 1);
  }
  rmSync(join(scratch, "db.sqlite3"), { force: true });
  for (const dir of git("ls-files", "--others", "--directory").split("\n").filter((p) => p.endsWith("__pycache__/"))) rmSync(join(scratch, dir), { recursive: true, force: true });

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
