#!/usr/bin/env node
// Runs Rector (getrector.com, version pinned in pack.yaml) with its PHP 8.0 upgrade set on the
// project. Not a jscodeshift codemod module: pack.yaml calls it as a stage command.
//
//   node rector.mjs [--dry-run]
//
// Rector is installed with Composer into its own directory in the cache, so the project's
// composer.json is not touched. The configuration is generated for the run:
// `RectorConfig::configure()->withPaths([...])->withPhpSets(php80: true)` (every PHP 5.x/7.x upgrade
// set up to 8.0, as Rector's docs recommend for upgrading), with the target version set to 8.0:
// otherwise Rector takes it from composer.json's `php` constraint (still 7.x) and skips every rule
// that needs PHP 8 syntax (promoted properties, nullsafe, union types, match). The paths are the project's top-level
// directories with PHP files (vendor excluded). The project's own vendor/autoload.php is passed so
// Rector knows its classes. --dry-run prints Rector's diff without changing files.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const SKIPPED = new Set(["vendor", "node_modules", ".git", ".fm", "var", "storage", "bootstrap", "public"]);
const dryRun = process.argv.includes("--dry-run");
const project = resolve(process.cwd());

const packDir = dirname(dirname(fileURLToPath(import.meta.url)));
const rector = parse(readFileSync(join(packDir, "pack.yaml"), "utf8")).tools.find((t) => t.name === "rector/rector");
if (rector === undefined) {
  console.error("pack.yaml must pin rector/rector");
  process.exit(2);
}

function toolBin() {
  const cacheRoot = process.env.FM_CACHE_DIR ?? join(process.env.XDG_CACHE_HOME ?? join(homedir(), ".cache"), "framework-migration");
  const dir = join(cacheRoot, `rector-${rector.version}`);
  const bin = join(dir, "vendor", "bin", "rector");
  if (existsSync(join(dir, ".fm-complete"))) return bin;
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "composer.json"), "{}\n");
  execFileSync("composer", ["require", "--no-interaction", "--no-progress", "--quiet", `rector/rector:${rector.version}`], { cwd: dir, stdio: ["ignore", "ignore", "inherit"] });
  writeFileSync(join(dir, ".fm-complete"), `${rector.version}\n`);
  return bin;
}

/** Top-level directories that contain PHP files, plus PHP files at the root. */
function paths() {
  const hasPhp = (dir) =>
    readdirSync(dir, { withFileTypes: true }).some((entry) =>
      entry.isDirectory() ? !SKIPPED.has(entry.name) && hasPhp(join(dir, entry.name)) : entry.name.endsWith(".php"),
    );
  return readdirSync(project)
    .filter((name) => !SKIPPED.has(name) && !name.startsWith("."))
    .filter((name) => (statSync(join(project, name)).isDirectory() ? hasPhp(join(project, name)) : name.endsWith(".php")))
    .sort()
    .map((name) => join(project, name));
}

/** A single-quoted PHP string literal (no interpolation). */
const phpString = (value) => `'${value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;

if (!existsSync(join(project, "vendor", "autoload.php"))) {
  console.error("vendor/autoload.php is missing: run composer install first");
  process.exit(1);
}
const bin = toolBin();
const configDir = mkdtempSync(join(tmpdir(), "fm-rector-"));
try {
  const config = join(configDir, "rector.php");
  writeFileSync(
    config,
    `<?php\n\nuse Rector\\Config\\RectorConfig;\nuse Rector\\ValueObject\\PhpVersion;\n\nreturn RectorConfig::configure()\n    ->withPaths([${paths().map(phpString).join(", ")}])\n    ->withPhpSets(php80: true)\n    ->withPhpVersion(PhpVersion::PHP_80);\n`,
  );
  const args = ["process", "--config", config, "--autoload-file", join(project, "vendor", "autoload.php"), "--no-progress-bar", "--no-ansi", "--clear-cache"];
  if (dryRun) args.push("--dry-run");
  const run = spawnSync(bin, args, { cwd: project, encoding: "utf8" });
  process.stdout.write(run.stdout + run.stderr);
  // In dry-run mode Rector exits 2 when it would change files.
  if (run.status !== 0 && !(dryRun && run.status === 2)) process.exitCode = run.status ?? 1;
} finally {
  rmSync(configDir, { recursive: true, force: true });
}
