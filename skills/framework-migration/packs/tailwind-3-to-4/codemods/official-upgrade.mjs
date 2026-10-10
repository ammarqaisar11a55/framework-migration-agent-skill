#!/usr/bin/env node
// Runs the official upgrade tool, @tailwindcss/upgrade (version pinned in pack.yaml), on the current
// directory. Not a jscodeshift codemod: pack.yaml calls it as a stage command.
//
//   node official-upgrade.mjs [--dry-run]
//
// The tool has no dry-run mode, and it installs packages itself. So it always runs on a scratch copy
// of the project with its own fresh install (the project's node_modules is never touched); the
// script prints the resulting diff and, without --dry-run, copies the changed files back. The
// stage's `npm install` then brings node_modules in line with the new package.json.
import { execFileSync } from "node:child_process";
import { appendFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const TOOL = "@tailwindcss/upgrade";
const SKIPPED = new Set(["node_modules", ".git", ".fm", "dist", "build", "coverage"]);
const dryRun = process.argv.includes("--dry-run");
const project = process.cwd();

const packDir = dirname(dirname(fileURLToPath(import.meta.url)));
const tool = parse(readFileSync(join(packDir, "pack.yaml"), "utf8")).tools.find((t) => t.name === TOOL);
if (tool === undefined) {
  console.error(`pack.yaml must pin ${TOOL}`);
  process.exit(2);
}

const scratch = mkdtempSync(join(tmpdir(), "fm-tailwind-"));
try {
  cpSync(project, scratch, { recursive: true, filter: (path) => !relative(project, path).split(sep).some((part) => SKIPPED.has(part)) });
  const git = (...args) => execFileSync("git", ["-C", scratch, "-c", "user.name=fm", "-c", "user.email=fm@localhost", ...args], { encoding: "utf8" });
  git("init", "-q");
  appendFileSync(join(scratch, ".git", "info", "exclude"), "node_modules\n");
  git("add", "-A");
  git("commit", "-q", "--allow-empty", "--no-verify", "-m", "before");

  // The tool loads the v3 configuration (and its plugins), so the scratch copy needs the project's
  // dependencies.
  // The scratch copy is throw-away: npm settings meant for the project (such as
  // npm_config_package_lock=false) must not change how the tool installs there.
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^npm_config_package_lock$/i.test(key)));
  const hadLockfile = existsSync(join(scratch, "package-lock.json"));
  execFileSync("npm", [hadLockfile ? "ci" : "install", "--no-audit", "--no-fund"], { cwd: scratch, env, stdio: ["ignore", "ignore", "inherit"] });
  // --force: the scratch repository is committed, but the fresh install leaves it "dirty" for the tool.
  execFileSync("npx", ["--yes", `${TOOL}@${tool.version}`, "--force"], { cwd: scratch, env, stdio: ["ignore", "inherit", "inherit"] });
  // A project without a lockfile does not get one.
  if (!hadLockfile) rmSync(join(scratch, "package-lock.json"), { force: true });

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
