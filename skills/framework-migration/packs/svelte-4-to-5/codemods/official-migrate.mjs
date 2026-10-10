#!/usr/bin/env node
// Runs the official Svelte 5 migration (`npx sv migrate svelte-5`) on the current directory.
// Not a jscodeshift codemod module: pack.yaml calls it as a stage command.
//
//   node official-migrate.mjs [--dry-run]
//
// `sv migrate svelte-5` hands over to svelte-migrate@1, whose svelte-5 migration asks which folders
// to migrate and whether to convert components, with interactive prompts only. This script runs the
// same steps with the answers the migration defaults to (every top-level folder except node_modules
// and dot folders; convert components), using the functions the migration itself calls:
//
//   1. update_pkg_json_content: dependency ranges (svelte ^5.0.0, svelte-check ^4.0.0, ...);
//   2. for each .svelte file: transform_module_code on each <script> (new Component() → mount()),
//      then `migrate` from svelte/compiler (props, state, slots, event attributes);
//   3. for each .js/.ts file: transform_module_code.
//
// svelte-migrate and the Svelte 5 compiler are installed at the versions pinned in pack.yaml, in a
// cache directory. The script works on a scratch copy, prints the diff, and copies changes back
// unless --dry-run is given. Files the compiler cannot migrate are left unchanged and listed.
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir, tmpdir } from "node:os";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parse } from "yaml";

const SKIPPED = new Set(["node_modules", ".git", ".fm", "dist", "build", "coverage", ".svelte-kit"]);
const dryRun = process.argv.includes("--dry-run");
const project = process.cwd();

const packDir = dirname(dirname(fileURLToPath(import.meta.url)));
const tools = parse(readFileSync(join(packDir, "pack.yaml"), "utf8")).tools;
const migrateTool = tools.find((t) => t.name === "svelte-migrate");
const svelteTool = tools.find((t) => t.name === "svelte");
if (migrateTool === undefined || svelteTool === undefined) {
  console.error("pack.yaml must pin svelte-migrate and svelte");
  process.exit(2);
}

/** Installs svelte-migrate and the Svelte 5 compiler once per version pair. */
function toolDir() {
  const cacheRoot = process.env.FM_CACHE_DIR ?? join(process.env.XDG_CACHE_HOME ?? join(homedir(), ".cache"), "framework-migration");
  const dir = join(cacheRoot, `svelte-migrate-${migrateTool.version}-svelte-${svelteTool.version}`);
  if (existsSync(join(dir, ".fm-complete"))) return dir;
  const temp = mkdtempSync(join(tmpdir(), "fm-svelte-migrate-"));
  writeFileSync(join(temp, "package.json"), '{ "private": true }\n');
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^npm_config_package_lock/i.test(key)));
  execFileSync("npm", ["install", "--no-audit", "--no-fund", "--loglevel=error", `svelte-migrate@${migrateTool.version}`, `svelte@${svelteTool.version}`], {
    cwd: temp,
    env,
    stdio: ["ignore", "ignore", "inherit"],
  });
  writeFileSync(join(temp, ".fm-complete"), `${migrateTool.version} ${svelteTool.version}\n`);
  mkdirSync(dirname(dir), { recursive: true });
  rmSync(dir, { recursive: true, force: true });
  renameSync(temp, dir);
  return dir;
}

/** Files under the folders the migration selects by default, as paths relative to `root`. */
function filesToMigrate(root) {
  const out = [];
  const walk = (dir) => {
    for (const name of readdirSync(join(root, dir)).sort()) {
      const path = dir === "" ? name : `${dir}/${name}`;
      if (statSync(join(root, path)).isDirectory()) {
        if (name !== "node_modules" && !(dir === "" && name.startsWith("."))) walk(path);
      } else if (dir !== "") out.push(path);
    }
  };
  walk("");
  return out;
}

const tool = toolDir();
const load = (path) => import(pathToFileURL(join(tool, "node_modules", path)).href);
const { transform_module_code, update_pkg_json_content } = await load("svelte-migrate/migrations/svelte-5/migrate.js");
const { migrate } = createRequire(join(tool, "package.json"))("svelte/compiler");

// The migration's own prerequisites: Svelte 3 must go to 4 first (`sv migrate svelte-4`) and
// SvelteKit 1 to 2 (`sv migrate sveltekit-2`). The official script offers to run those; this one stops.
const semver = createRequire(join(tool, "node_modules", "svelte-migrate", "package.json"))("semver");
const pkg = JSON.parse(readFileSync(join(project, "package.json"), "utf8"));
for (const [name, minimum, migration] of [["svelte", "4.0.0", "svelte-4"], ["@sveltejs/kit", "2.0.0", "sveltekit-2"]]) {
  const range = pkg.devDependencies?.[name] ?? pkg.dependencies?.[name];
  if (range && semver.validRange(range) && semver.gtr(minimum, range)) {
    console.error(`${name} ${range} is older than ${minimum}: run \`npx sv migrate ${migration}\` and commit that first`);
    process.exit(1);
  }
}

const scratch = mkdtempSync(join(tmpdir(), "fm-svelte-"));
const failed = [];
try {
  cpSync(project, scratch, { recursive: true, filter: (path) => !relative(project, path).split(sep).some((part) => SKIPPED.has(part)) });
  const git = (...args) => execFileSync("git", ["-C", scratch, "-c", "user.name=fm", "-c", "user.email=fm@localhost", ...args], { encoding: "utf8" });
  git("init", "-q");
  git("add", "-A");
  git("commit", "-q", "--allow-empty", "--no-verify", "-m", "before");

  const pkgPath = join(scratch, "package.json");
  writeFileSync(pkgPath, update_pkg_json_content(readFileSync(pkgPath, "utf8")));
  const useTs = existsSync(join(scratch, "tsconfig.json"));
  for (const path of filesToMigrate(scratch)) {
    const file = join(scratch, path);
    try {
      if (path.endsWith(".svelte")) {
        const scripts = readFileSync(file, "utf8").replace(/<script([^]*?)>([^]+?)<\/script>(\n*)/g, (_m, attrs, contents, ws) => `<script${attrs}>${transform_module_code(contents)}</script>${ws}`);
        writeFileSync(file, migrate(scripts, { filename: path, use_ts: useTs }).code);
      } else if (/\.(?:js|ts)$/.test(path)) {
        writeFileSync(file, transform_module_code(readFileSync(file, "utf8")));
      }
    } catch (error) {
      failed.push(`${path}: ${error.message.split("\n")[0]}`);
    }
  }

  git("add", "-A");
  const diff = git("diff", "--cached", "--no-color", "--no-ext-diff");
  process.stdout.write(diff === "" ? "No changes.\n" : diff);
  if (failed.length > 0) console.log(`\nNot migrated (left unchanged; migrate by hand):\n${failed.map((f) => `  ${f}`).join("\n")}`);
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
