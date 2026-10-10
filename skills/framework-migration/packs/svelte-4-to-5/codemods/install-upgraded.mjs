#!/usr/bin/env node
// Installs the dependencies the stage changed. Not a jscodeshift codemod module: pack.yaml calls it
// as a post-command.
//
//   node install-upgraded.mjs
//
// A plain `npm install` fails with ERESOLVE on a project that already has Svelte 4 installed: the
// lockfile and node_modules keep @sveltejs/vite-plugin-svelte-inspector 2.x (and svelte-hmr), whose
// peer ranges require vite-plugin-svelte 3 and Svelte 4, so npm cannot place the new versions next to
// them. (The migration's own advice is `npm install --force`, which installs a tree with broken peers.)
//
// This script runs `npm install`. Only if that fails, it removes from package-lock.json
// and node_modules the packages whose installed version no longer satisfies package.json, and every
// installed package that depends on one of them (transitively), then runs `npm install` again so npm
// resolves exactly those afresh. Other packages keep their locked versions. A conflict that remains (a
// library whose peer range excludes Svelte 5) fails the command with npm's report. (npm's output is
// not parsed for ERESOLVE: under `npm run -s` it inherits loglevel=silent and prints nothing.)
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import semver from "semver";

const project = process.cwd();

function npmInstall() {
  const run = spawnSync("npm", ["install", "--no-audit", "--no-fund"], { cwd: project, encoding: "utf8" });
  process.stdout.write(run.stdout ?? "");
  process.stderr.write(run.stderr ?? "");
  return { ok: run.status === 0 };
}

process.exitCode = main() ? 0 : 1;

function main() {
const first = npmInstall();
if (first.ok) return true;

const readJson = (path) => (existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : undefined);
const pkg = readJson(join(project, "package.json"));
const specs = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.optionalDependencies };

// The installed tree, from the lockfile or, without one, from npm's hidden lockfile in node_modules.
const lockPath = join(project, "package-lock.json");
const lock = readJson(lockPath) ?? readJson(join(project, "node_modules", ".package-lock.json"));
const entries = Object.entries(lock?.packages ?? {}).filter(([path]) => path.startsWith("node_modules/"));
const nameOf = (path) => path.slice(path.lastIndexOf("node_modules/") + "node_modules/".length);

const stale = new Set(
  Object.entries(specs)
    .filter(([name, spec]) => {
      const installed = lock?.packages?.[`node_modules/${name}`]?.version;
      return installed !== undefined && semver.validRange(spec) !== null && !semver.satisfies(installed, spec);
    })
    .map(([name]) => name),
);
// Everything installed that depends on a stale package must be resolved again with it.
for (let grew = true; grew; ) {
  grew = false;
  for (const [path, entry] of entries) {
    const name = nameOf(path);
    if (stale.has(name)) continue;
    const deps = { ...entry.dependencies, ...entry.peerDependencies, ...entry.optionalDependencies };
    if (Object.keys(deps).some((dep) => stale.has(dep))) {
      stale.add(name);
      grew = true;
    }
  }
}
if (stale.size === 0) return false;

console.log(`\nResolving again: ${[...stale].sort().join(", ")}`);
for (const [path] of entries) {
  if (!stale.has(nameOf(path))) continue;
  rmSync(join(project, path), { recursive: true, force: true });
  if (lock.packages) delete lock.packages[path];
}
if (existsSync(lockPath)) writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
rmSync(join(project, "node_modules", ".package-lock.json"), { force: true });

return npmInstall().ok;
}
