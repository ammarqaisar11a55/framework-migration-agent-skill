#!/usr/bin/env node
// Runs `ng update` for one Angular major on the current directory. Not a jscodeshift codemod
// module: pack.yaml calls it as a stage command, once per major.
//
//   node ng-update.mjs <major> [--dry-run]
//
// The update guide (angular.dev/update-guide) has one step per major:
// `ng update @angular/core@<major> @angular/cli@<major>`. ng update rewrites package.json, installs,
// and runs the migrations shipped with the new packages; it has no dry-run that runs migrations, and
// it refuses a dirty repository. So it runs on a scratch copy (committed, with its own install), and
// this script prints the diff and, without --dry-run, copies the changes back. Versions come from
// pack.yaml: the Angular CLI runs at the pinned version (NG_DISABLE_VERSION_CHECK stops it from
// fetching the newest CLI of the major instead) and the update targets the pinned core and CLI.
//
// Beyond the guide's command:
//   - A project already on <major> or later is left alone, so a project can start at any stage.
//   - The Node.js version must satisfy the target's engines (Angular 22 needs 22.22.3+ or 24.15+);
//     otherwise the script stops before changing anything.
//   - vitest and typescript are passed with pinned versions when the project has them and the
//     target's peer ranges exclude the installed ones, instead of the newest matching version
//     ng update would pick. (npm 10 cannot install vitest 4.1 with Angular 21: its arborist crashes
//     on the vite 8 / @vitejs/devtools peer set; vitest 4.0 installs.)
//   - @angular/material and @angular/cdk are updated in the same command when present, as the
//     guide's "update @angular/material" step requires.
import { execFileSync } from "node:child_process";
import { appendFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import semver from "semver";
import { parse } from "yaml";

const SKIPPED = new Set(["node_modules", ".git", ".fm", ".angular", "dist", "coverage", "out-tsc"]);
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const major = Number(args.find((a) => /^\d+$/.test(a)));
const project = process.cwd();
if (!Number.isInteger(major)) {
  console.error("usage: ng-update.mjs <major> [--dry-run]");
  process.exit(2);
}

const packDir = dirname(dirname(fileURLToPath(import.meta.url)));
const tools = parse(readFileSync(join(packDir, "pack.yaml"), "utf8")).tools;
const pin = (name) => tools.find((t) => t.name === name && semver.major(t.version) === major)?.version;
const pinAny = (name) => tools.find((t) => t.name === name)?.version;
const core = pin("@angular/core");
const cli = pin("@angular/cli");
if (core === undefined || cli === undefined) {
  console.error(`pack.yaml must pin @angular/core and @angular/cli ${major}.x`);
  process.exit(2);
}

const pkg = JSON.parse(readFileSync(join(project, "package.json"), "utf8"));
const range = (name) => pkg.dependencies?.[name] ?? pkg.devDependencies?.[name];
const installedMajor = semver.validRange(range("@angular/core") ?? "") ? semver.minVersion(range("@angular/core")).major : null;
if (installedMajor === null) {
  console.error("package.json has no @angular/core dependency with a version range");
  process.exit(1);
}
if (installedMajor >= major) {
  console.log(`@angular/core ${range("@angular/core")} is already on Angular ${major} or later; nothing to do.`);
  process.exit(0);
}
if (installedMajor < major - 1) {
  console.error(`@angular/core ${range("@angular/core")}: update one major at a time (Angular ${major - 1} first)`);
  process.exit(1);
}

const npmView = (spec, field) => {
  const out = execFileSync("npm", ["view", spec, field, "--json"], { encoding: "utf8" }).trim();
  return out === "" ? undefined : JSON.parse(out);
};
const engines = npmView(`@angular/core@${core}`, "engines");
if (engines?.node && !semver.satisfies(process.version, engines.node)) {
  console.error(`Angular ${core} needs Node.js ${engines.node}; this is ${process.version}. Upgrade Node.js first.`);
  process.exit(1);
}

const packages = [`@angular/core@${core}`, `@angular/cli@${cli}`];
for (const name of ["@angular/material", "@angular/cdk"]) {
  if (range(name) !== undefined) packages.push(`${name}@${pin(name) ?? major}`);
}
const buildPeers = npmView(`@angular/build@${cli}`, "peerDependencies") ?? {};
for (const name of ["vitest", "typescript"]) {
  const installed = range(name);
  const peer = buildPeers[name];
  const wanted = pin(name) ?? pinAny(name);
  if (installed === undefined || peer === undefined || wanted === undefined) continue;
  const current = semver.validRange(installed) ? semver.minVersion(installed) : null;
  if (current !== null && semver.satisfies(current, peer)) continue;
  if (!semver.satisfies(wanted, peer)) {
    console.error(`pack.yaml pins ${name} ${wanted}, outside @angular/build ${cli}'s peer range ${peer}`);
    process.exit(2);
  }
  packages.push(`${name}@${wanted}`);
}

const scratch = mkdtempSync(join(tmpdir(), "fm-ng-"));
try {
  cpSync(project, scratch, { recursive: true, filter: (path) => !relative(project, path).split(sep).some((part) => SKIPPED.has(part)) });
  const git = (...a) => execFileSync("git", ["-C", scratch, "-c", "user.name=fm", "-c", "user.email=fm@localhost", ...a], { encoding: "utf8" });
  git("init", "-q");
  appendFileSync(join(scratch, ".git", "info", "exclude"), "node_modules\n.angular\n");
  git("add", "-A");
  git("commit", "-q", "--allow-empty", "--no-verify", "-m", "before");

  // npm settings meant for the project (npm_config_package_lock=false) must not change the scratch.
  const env = { ...Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^npm_config_package_lock$/i.test(key))), NG_DISABLE_VERSION_CHECK: "1", NG_CLI_ANALYTICS: "false" };
  const hadLockfile = existsSync(join(scratch, "package-lock.json"));
  const run = (cmd, a) => execFileSync(cmd, a, { cwd: scratch, env, stdio: ["ignore", "inherit", "inherit"] });
  run("npm", [hadLockfile ? "ci" : "install", "--no-audit", "--no-fund", "--loglevel=error"]);
  // ng update refuses a dirty repository; a lockfile the install created must be committed first.
  const before = git("rev-parse", "HEAD").trim();
  git("add", "-A");
  git("commit", "-q", "--allow-empty", "--no-verify", "-m", "installed");
  console.log(`ng update ${packages.join(" ")}`);
  run("npx", ["--yes", `@angular/cli@${cli}`, "update", ...packages]);
  if (!hadLockfile) rmSync(join(scratch, "package-lock.json"), { force: true });

  git("add", "-A");
  const diff = git("diff", "--cached", "--no-color", "--no-ext-diff", before);
  process.stdout.write(diff === "" ? "No changes.\n" : diff);
  if (!dryRun) {
    for (const line of git("diff", "--cached", "--name-status", "--no-renames", before).split("\n").filter(Boolean)) {
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
