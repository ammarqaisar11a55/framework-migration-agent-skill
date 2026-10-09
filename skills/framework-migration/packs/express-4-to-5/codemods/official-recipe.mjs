#!/usr/bin/env node
// Runs the official Express 5 codemods (github.com/expressjs/codemod) on the current directory.
// Not a jscodeshift codemod: pack.yaml calls it as a stage command.
//
//   node official-recipe.mjs --part api [--dry-run]           API migrations (still valid on Express 4)
//   node official-recipe.mjs --part dependencies [--dry-run]  package.json: express and its packages to v5
//
// The registry route (`npx codemod @expressjs/v5-migration-recipe`) resolves each sub-codemod to
// its latest version at run time. To pin them, this script runs the recipe "from source", as the
// repository README describes: it fetches the repository at the commit pinned in pack.yaml,
// expands the recipe's registry references into the local codemods they name, and runs the result
// with the `codemod` CLI version pinned in pack.yaml.
//
// The CLI's own --dry-run prints no diff, so the codemods always run on a scratch copy of the
// project; the script prints the resulting `git diff` and, unless --dry-run is given, copies the
// changed files back.
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parse, stringify } from "yaml";

const RECIPE = "@expressjs/v5-migration-recipe";
const CLI = "codemod";
// Official codemods the pack does not run (see references/known-pitfalls.md):
const SKIPPED = new Map([
  // Set `dotfiles: 'allow'` on every express.static() / res.sendFile() call. Express 4 did not
  // serve dotfiles themselves (only files inside dot-directories), so 'allow' would start serving
  // files such as .env. Reported for review instead (rules static-dotfiles, sendfile-dotfiles).
  ["@expressjs/static-dotfiles", "would serve dotfiles such as .env that Express 4 did not serve"],
  ["@expressjs/sendfile-options", "would send dotfiles that Express 4 did not send"],
  // Renames every `.del(<string>, ...)`, including cache and Redis clients. Replaced by the stage's
  // own route-del.js, which renames only route registrations.
  ["@expressjs/route-del-to-delete", "renames .del() on any object; replaced by route-del.js"],
]);

const args = process.argv.slice(2);
const part = args[args.indexOf("--part") + 1];
const dryRun = args.includes("--dry-run");
if (!["api", "dependencies"].includes(part) || args.indexOf("--part") === -1) {
  console.error("usage: official-recipe.mjs --part api|dependencies [--dry-run]");
  process.exit(2);
}

const packDir = dirname(dirname(fileURLToPath(import.meta.url)));
const tools = parse(readFileSync(join(packDir, "pack.yaml"), "utf8")).tools;
const recipe = tools.find((t) => t.name === RECIPE);
const cli = tools.find((t) => t.name === CLI);
if (recipe?.source === undefined || recipe.ref === undefined || cli === undefined) {
  console.error(`pack.yaml must pin ${RECIPE} (source and ref) and ${CLI}`);
  process.exit(2);
}

const run = (command, commandArgs, options = {}) => execFileSync(command, commandArgs, { stdio: "inherit", ...options });

/** The repository at the pinned commit, fetched once into a cache directory. */
function checkout() {
  const cacheRoot = process.env.FM_CACHE_DIR ?? join(process.env.XDG_CACHE_HOME ?? join(homedir(), ".cache"), "framework-migration");
  const dir = join(cacheRoot, `expressjs-codemod-${recipe.ref}`);
  if (existsSync(join(dir, ".fm-complete"))) return dir;
  const temp = join(tmpdir(), `fm-expressjs-codemod-${process.pid}`);
  rmSync(temp, { recursive: true, force: true });
  mkdirSync(temp, { recursive: true });
  const git = (...gitArgs) => run("git", ["-C", temp, ...gitArgs], { stdio: ["ignore", "ignore", "inherit"] });
  git("init", "-q");
  git("fetch", "-q", "--depth", "1", recipe.source, recipe.ref);
  git("-c", "advice.detachedHead=false", "checkout", "-q", "FETCH_HEAD");
  writeFileSync(join(temp, ".fm-complete"), `${recipe.ref}\n`);
  mkdirSync(dirname(dir), { recursive: true });
  rmSync(dir, { recursive: true, force: true });
  renameSync(temp, dir);
  return dir;
}

const COPY_SKIPPED = new Set(["node_modules", ".git", ".fm", "dist"]);
const SOURCE = /\.(?:[cm]?[jt]s|[jt]sx)$/;

/** True when a project source file matches the pattern. */
function projectUses(pattern, dir = process.cwd()) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (COPY_SKIPPED.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory() ? projectUses(pattern, path) : SOURCE.test(entry.name) && pattern.test(readFileSync(path, "utf8"))) return true;
  }
  return false;
}

// static-mime also adds mime-types to every Express project's package.json, whether or not it uses
// express.static.mime. Keep that step only when the project does.
const usesStaticMime = projectUses(/\.static\.mime\b/);

const repo = checkout();
const codemodsDir = join(repo, "codemods");
const readWorkflow = (name) => parse(readFileSync(join(codemodsDir, name, "workflow.yaml"), "utf8"));
const recipeDir = RECIPE.slice("@expressjs/".length);

/** A workflow step with its script path made relative to codemods/, where the combined workflow lives. */
function relocate(step, name) {
  const copy = structuredClone(step);
  if (copy["js-ast-grep"]?.js_file !== undefined) copy["js-ast-grep"].js_file = `${name}/${copy["js-ast-grep"].js_file}`;
  return copy;
}

// Expand the recipe: its own steps belong to the "dependencies" part; the steps of each codemod it
// references, to the "api" part.
const steps = [];
for (const step of readWorkflow(recipeDir).nodes.flatMap((node) => node.steps)) {
  const source = step.codemod?.source;
  if (source === undefined) {
    if (part === "dependencies") steps.push(relocate(step, recipeDir));
    continue;
  }
  if (part !== "api") continue;
  if (SKIPPED.has(source)) {
    console.log(`skipped ${source}: ${SKIPPED.get(source)} (references/known-pitfalls.md)`);
    continue;
  }
  const name = source.slice("@expressjs/".length);
  for (const inner of readWorkflow(name).nodes.flatMap((node) => node.steps)) {
    if (name === "static-mime" && inner["js-ast-grep"]?.language === "json" && !usesStaticMime) {
      console.log("skipped the static-mime package.json step: the project does not use express.static.mime");
      continue;
    }
    steps.push(relocate(inner, name));
  }
}

// The CLI requires script paths inside the workflow's directory.
const workflow = join(codemodsDir, `fm-${part}.workflow.yaml`);
writeFileSync(workflow, stringify({ version: "1", nodes: [{ id: `fm-${part}`, name: `Express 5 ${part}`, type: "automatic", runtime: { type: "direct" }, steps }] }));

// A scratch copy of the project, committed so the codemods' changes show up as a git diff.
const project = process.cwd();
const scratch = mkdtempSync(join(tmpdir(), "fm-express5-"));
try {
  cpSync(project, scratch, { recursive: true, filter: (path) => !relative(project, path).split(sep).some((part) => COPY_SKIPPED.has(part)) });
  const git = (...gitArgs) => execFileSync("git", ["-C", scratch, "-c", "user.name=fm", "-c", "user.email=fm@localhost", ...gitArgs], { encoding: "utf8" });
  git("init", "-q");
  git("add", "-A");
  git("commit", "-q", "--allow-empty", "--no-verify", "-m", "before");

  run("npx", ["--yes", `${CLI}@${cli.version}`, "workflow", "run", "-w", workflow, "-t", scratch, "--allow-dirty", "--no-interactive", "--disable-analytics"]);

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
