#!/usr/bin/env node
// Runs the official configuration migrator, @eslint/migrate-config (version pinned in pack.yaml),
// on the project's eslintrc configuration. Not a jscodeshift codemod: pack.yaml calls it as a stage
// command.
//
//   node official-migrate.mjs [--dry-run]
//
// - Finds the configuration ESLint would use: .eslintrc.js, .eslintrc.cjs, .eslintrc.yaml,
//   .eslintrc.yml, .eslintrc.json, .eslintrc, or the package.json `eslintConfig` key.
// - Refuses (exit 1) when the migrator cannot produce an equivalent configuration:
//   * nested .eslintrc files below the root (eslintrc cascades; flat config does not);
//   * a JavaScript configuration with logic (the migrator keeps only its evaluated result).
// - Passes --gitignore when a script lints with `--ignore-path .gitignore`.
// - Removes the files the new eslint.config.* replaces (.eslintrc*, .eslintignore).
//
// It works on a scratch copy and prints the resulting diff; without --dry-run it copies the changes
// back.
import { execFileSync } from "node:child_process";
import { appendFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const TOOL = "@eslint/migrate-config";
const LEGACY = [".eslintrc.js", ".eslintrc.cjs", ".eslintrc.yaml", ".eslintrc.yml", ".eslintrc.json", ".eslintrc"];
const SKIPPED = new Set(["node_modules", ".git", ".fm", "dist", "coverage"]);
const dryRun = process.argv.includes("--dry-run");
const project = process.cwd();
const fail = (message) => {
  console.error(`official-migrate: ${message}`);
  process.exit(1);
};

const packDir = dirname(dirname(fileURLToPath(import.meta.url)));
const tool = parse(readFileSync(join(packDir, "pack.yaml"), "utf8")).tools.find((t) => t.name === TOOL);
if (tool === undefined) fail(`pack.yaml must pin ${TOOL}`);
const targetVersion = String(parse(readFileSync(join(packDir, "pack.yaml"), "utf8")).to.versions).match(/\d+/)?.[0] ?? "9";

/** Every file below the project, skipping dependency and output directories. */
function files(dir = project) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (SKIPPED.has(entry.name)) return [];
    const path = join(dir, entry.name);
    return entry.isDirectory() ? files(path) : [relative(project, path).split(sep).join("/")];
  });
}

const all = files();
const nested = all.filter((path) => path.includes("/") && LEGACY.includes(path.slice(path.lastIndexOf("/") + 1)));
if (nested.length > 0) fail(`nested eslintrc files (${nested.join(", ")}) cascade into their directories; flat config has one root file. Merge them into the root configuration as \`overrides\` first.`);

const pkg = existsSync(join(project, "package.json")) ? JSON.parse(readFileSync(join(project, "package.json"), "utf8")) : {};
let config = LEGACY.find((name) => all.includes(name));
if (config === undefined && pkg.eslintConfig === undefined) fail("no eslintrc configuration found (.eslintrc* or package.json eslintConfig)");

if (config !== undefined && /\.c?js$/.test(config)) {
  // Only `module.exports = <literal data>` survives the migrator unchanged.
  const source = readFileSync(join(project, config), "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
  const body = source.replace(/^\s*(['"])use strict\1;?/, "").trim();
  const literal = /^module\.exports\s*=\s*\{[\s\S]*\};?$/.test(body) && !/\brequire\s*\(|\bprocess\.|\?|=>|\bfunction\b|\$\{|\.\.\./.test(body.slice(body.indexOf("{")));
  if (!literal) fail(`${config} contains logic (require, process.env, conditions, functions or spreads). ${TOOL} keeps only its evaluated result; rewrite it as eslint.config.mjs by hand.`);
}

const gitignore = Object.values(pkg.scripts ?? {}).some((script) => /\beslint\b[^&|;]*--ignore-path[ =]\.gitignore\b/.test(script));

const scratch = mkdtempSync(join(tmpdir(), "fm-eslint-"));
try {
  cpSync(project, scratch, { recursive: true, filter: (path) => !relative(project, path).split(sep).some((part) => SKIPPED.has(part)) });
  const git = (...args) => execFileSync("git", ["-C", scratch, "-c", "user.name=fm", "-c", "user.email=fm@localhost", ...args], { encoding: "utf8" });
  git("init", "-q");
  // A JavaScript configuration is evaluated, so its shareable configs and plugins must resolve.
  if (existsSync(join(project, "node_modules"))) {
    symlinkSync(join(project, "node_modules"), join(scratch, "node_modules"), "dir");
    appendFileSync(join(scratch, ".git", "info", "exclude"), "node_modules\n");
  }
  git("add", "-A");
  git("commit", "-q", "--allow-empty", "--no-verify", "-m", "before");

  if (config === undefined) {
    // The migrator reads files; give it the package.json configuration as one.
    config = ".eslintrc.json";
    writeFileSync(join(scratch, config), `${JSON.stringify(pkg.eslintConfig, null, 2)}\n`);
  }
  const args = ["--yes", `${TOOL}@${tool.version}`, config, "--target-version", targetVersion, ...(gitignore ? ["--gitignore"] : [])];
  execFileSync("npx", args, { cwd: scratch, stdio: "inherit" });
  // eslint.config.mjs by default; eslint.config.js (CommonJS) for a .eslintrc.js source.
  if (!["eslint.config.mjs", "eslint.config.js", "eslint.config.cjs"].some((name) => existsSync(join(scratch, name)))) {
    fail(`${TOOL} did not write an eslint.config file (see its output above)`);
  }
  for (const name of [...LEGACY, ".eslintignore"]) rmSync(join(scratch, name), { force: true });

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
