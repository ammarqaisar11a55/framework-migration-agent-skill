#!/usr/bin/env node
// Runs the official Next.js upgrade (`npx @next/codemod upgrade`) on the current directory, then the
// async Request APIs codemod the upgrade guide asks for separately. Not a jscodeshift codemod module:
// pack.yaml calls it as a stage command.
//
//   node official-upgrade.mjs [--dry-run]
//
// `@next/codemod upgrade <version> --yes` updates next, react, react-dom, @types/react(-dom),
// eslint-config-next and eslint, installs them, and runs every codemod registered between the
// installed and the target version (turbopack config, next lint → ESLint CLI, middleware → proxy,
// unstable_ prefixes, ...). It installs packages itself and has no dry-run mode, so it runs on a
// scratch copy with its own install; this script prints the diff and, without --dry-run, copies the
// changes back. Versions come from pack.yaml.
//
// Three deviations from running the tool by hand, each from the upgrade guide:
//   - React must already be 19. With React 18 the tool upgrades it and runs the React 19 codemods
//     from the Codemod registry at `latest` (unpinned); the react-major-upgrade pack does that step
//     with pinned tools, so this script stops and points there.
//   - The upgrade runs only the codemods registered after the installed version, so an app on a
//     late 15.x skips those for deprecations that Next.js 16 turns into removals: synchronous
//     Request APIs, `experimental.turbo`, `next lint`, `runtime: 'experimental-edge'`. The guide
//     says to run next-async-request-api separately and lists the turbopack and ESLint CLI changes
//     as part of the upgrade, so each of these codemods the upgrade skipped runs afterwards.
//   - "The edge runtime is NOT supported in proxy ... If you want to continue using the edge runtime,
//     keep using middleware." The middleware-to-proxy codemod renames the file and drops the runtime
//     anyway, so a middleware file that sets the edge runtime explicitly is restored.
import { execFileSync } from "node:child_process";
import { appendFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import semver from "semver";
import { parse } from "yaml";

const SKIPPED = new Set(["node_modules", ".git", ".fm", ".next", "dist", "build", "coverage", "out"]);
const MIDDLEWARE = ["middleware.ts", "middleware.js", "src/middleware.ts", "src/middleware.js"];
const EDGE = /\bruntime\s*[:=]\s*["'](?:experimental-)?edge["']/;
// Codemods for 15.x deprecations that 16 removes, with the version @next/codemod registers them for
// (lib/utils.js, TRANSFORMER_INQUIRER_CHOICES). The upgrade runs those newer than the installed version.
const REMOVAL_CODEMODS = [
  ["next-async-request-api", "15.0.0-canary.171"],
  ["app-dir-runtime-config-experimental-edge", "15.0.0-canary.179"],
  ["next-experimental-turbo-to-turbopack", "15.4.2-canary.21"],
  ["next-lint-to-eslint-cli", "15.4.2-canary.55"],
];
const dryRun = process.argv.includes("--dry-run");
const project = process.cwd();

const packDir = dirname(dirname(fileURLToPath(import.meta.url)));
const tools = parse(readFileSync(join(packDir, "pack.yaml"), "utf8")).tools;
const codemod = tools.find((t) => t.name === "@next/codemod");
const next = tools.find((t) => t.name === "next");
if (codemod === undefined || next === undefined) {
  console.error("pack.yaml must pin @next/codemod and next");
  process.exit(2);
}

const pkg = JSON.parse(readFileSync(join(project, "package.json"), "utf8"));
const range = (name) => pkg.dependencies?.[name] ?? pkg.devDependencies?.[name];
const minimum = (name) => (semver.validRange(range(name) ?? "") ? semver.minVersion(range(name)) : null);
const fromNext = minimum("next");
const fromReact = minimum("react");
if (fromNext === null) {
  console.error("package.json has no next dependency with a version range");
  process.exit(1);
}
if (fromReact !== null && fromReact.major < 19) {
  console.error(`react ${range("react")}: upgrade React to 19 first (the react-major-upgrade pack), commit, then run this stage`);
  process.exit(1);
}

const scratch = mkdtempSync(join(tmpdir(), "fm-next-"));
try {
  cpSync(project, scratch, { recursive: true, filter: (path) => !relative(project, path).split(sep).some((part) => SKIPPED.has(part)) });
  const git = (...args) => execFileSync("git", ["-C", scratch, "-c", "user.name=fm", "-c", "user.email=fm@localhost", ...args], { encoding: "utf8" });
  git("init", "-q");
  appendFileSync(join(scratch, ".git", "info", "exclude"), "node_modules\n.next\n");
  git("add", "-A");
  git("commit", "-q", "--allow-empty", "--no-verify", "-m", "before");

  // The tool reads the installed versions, so the scratch copy needs the project's dependencies.
  // npm settings meant for the project (npm_config_package_lock=false) must not change the scratch.
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^npm_config_package_lock$/i.test(key)));
  const hadLockfile = existsSync(join(scratch, "package-lock.json"));
  const run = (cmd, args) => execFileSync(cmd, args, { cwd: scratch, env, stdio: ["ignore", "inherit", "inherit"] });
  run("npm", [hadLockfile ? "ci" : "install", "--no-audit", "--no-fund", "--loglevel=error"]);
  run("npx", ["--yes", `@next/codemod@${codemod.version}`, "upgrade", next.version, "--yes"]);
  for (const [name, version] of REMOVAL_CODEMODS) {
    if (semver.lt(fromNext, version)) continue; // the upgrade ran it
    // Run on its own, the lint codemod sets up ESLint even in a project that never used `next lint`.
    if (name === "next-lint-to-eslint-cli" && !Object.values(pkg.scripts ?? {}).some((script) => /\bnext\s+lint\b/.test(script))) continue;
    console.log(`running ${name} (registered for ${version}, which the upgrade from ${fromNext} skips)`);
    run("npx", ["--yes", `@next/codemod@${codemod.version}`, name, ".", "--force"]);
  }
  if (!hadLockfile) rmSync(join(scratch, "package-lock.json"), { force: true });

  for (const path of MIDDLEWARE) {
    const before = join(project, path);
    if (!existsSync(before) || !EDGE.test(readFileSync(before, "utf8"))) continue;
    for (const ext of [".ts", ".js"]) rmSync(join(scratch, dirname(path), `proxy${ext}`), { force: true });
    writeFileSync(join(scratch, path), readFileSync(before));
    console.log(`kept ${path}: it sets the edge runtime, which proxy does not support`);
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
