#!/usr/bin/env node
// Runs the official React 19 codemods (github.com/reactjs/react-codemod) on the current directory.
// Not a jscodeshift codemod module: pack.yaml calls it as a stage command.
//
//   node official-codemods.mjs [--dry-run]
//
// The upgrade guide runs them through the Codemod registry (`npx codemod@latest
// react/19/migration-recipe`), which resolves each codemod at run time and was not reachable when the
// pack was written. The same transforms are TypeScript jscodeshift modules in the react-codemod
// repository (the npm package react-codemod 5.4.4 does not contain them), so this script fetches the
// repository at the commit pinned in pack.yaml and runs the recipe's transforms with the pinned
// jscodeshift CLI. It works on a scratch copy, prints the diff, and copies changes back unless
// --dry-run is given.
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { parse } from "yaml";

// The React 19 migration recipe, in the guide's order (react.dev upgrade guide, "Run all React 19
// codemods"). The fifth recipe entry, prop-types-typescript, needs TypeScript sources and is not run.
const TRANSFORMS = ["replace-reactdom-render.ts", "replace-string-ref.ts", "replace-act-import.ts", "replace-use-form-state.ts"];
const SKIPPED = new Set(["node_modules", ".git", ".fm", "dist", "build", "coverage"]);
const dryRun = process.argv.includes("--dry-run");
const project = process.cwd();

const packDir = dirname(dirname(fileURLToPath(import.meta.url)));
const tools = parse(readFileSync(join(packDir, "pack.yaml"), "utf8")).tools;
const repo = tools.find((t) => t.name === "react-codemod");
const jscodeshift = tools.find((t) => t.name === "jscodeshift");
if (repo?.source === undefined || repo.ref === undefined || jscodeshift === undefined) {
  console.error("pack.yaml must pin react-codemod (source and ref) and jscodeshift");
  process.exit(2);
}

function checkout() {
  const cacheRoot = process.env.FM_CACHE_DIR ?? join(process.env.XDG_CACHE_HOME ?? join(homedir(), ".cache"), "framework-migration");
  const dir = join(cacheRoot, `react-codemod-${repo.ref}`);
  if (existsSync(join(dir, ".fm-complete"))) return dir;
  const temp = mkdtempSync(join(tmpdir(), "fm-react-codemod-"));
  const git = (...args) => execFileSync("git", ["-C", temp, ...args], { stdio: ["ignore", "ignore", "inherit"] });
  git("init", "-q");
  git("fetch", "-q", "--depth", "1", repo.source, repo.ref);
  git("-c", "advice.detachedHead=false", "checkout", "-q", "FETCH_HEAD");
  writeFileSync(join(temp, ".fm-complete"), `${repo.ref}\n`);
  mkdirSync(dirname(dir), { recursive: true });
  rmSync(dir, { recursive: true, force: true });
  renameSync(temp, dir);
  return dir;
}

const transforms = join(checkout(), "transforms");
const scratch = mkdtempSync(join(tmpdir(), "fm-react-"));
try {
  cpSync(project, scratch, { recursive: true, filter: (path) => !relative(project, path).split(sep).some((part) => SKIPPED.has(part)) });
  const git = (...args) => execFileSync("git", ["-C", scratch, "-c", "user.name=fm", "-c", "user.email=fm@localhost", ...args], { encoding: "utf8" });
  git("init", "-q");
  git("add", "-A");
  git("commit", "-q", "--allow-empty", "--no-verify", "-m", "before");
  for (const transform of TRANSFORMS) {
    console.log(`running ${transform}`);
    execFileSync(
      "npx",
      ["--yes", `jscodeshift@${jscodeshift.version}`, "--transform", join(transforms, transform), "--parser", "tsx", "--extensions", "tsx,ts,jsx,js", "--ignore-pattern", "**/node_modules/**", "--silent", "."],
      { cwd: scratch, stdio: ["ignore", "inherit", "inherit"] },
    );
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
