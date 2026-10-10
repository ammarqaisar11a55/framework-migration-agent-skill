#!/usr/bin/env node
// Runs OpenRewrite recipes on a Maven project with the rewrite-maven-plugin. Not a jscodeshift
// codemod module: pack.yaml calls it as a stage command.
//
//   node openrewrite.mjs <recipe>[,<recipe>...] [--exclusions=<glob>,...] [--dry-run]
//
// Versions come from pack.yaml: `rewrite-maven-plugin` and the recipe module (`role: engine`, with
// `coordinates`-style names such as org.openrewrite.recipe:rewrite-testing-frameworks). Nothing is
// added to the project's pom: the plugin is invoked by its full coordinates, as the OpenRewrite docs
// show for running recipes "without modifying the build". --dry-run runs the plugin's dryRun goal,
// which writes target/rewrite/rewrite.patch instead of changing files; the patch is printed.
// Gradle builds are not supported: the script stops and says how to run the recipe there.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const recipes = args.find((a) => !a.startsWith("--"));
const exclusions = args.find((a) => a.startsWith("--exclusions="))?.slice("--exclusions=".length) ?? "";
if (recipes === undefined) {
  console.error("usage: openrewrite.mjs <recipe>[,<recipe>...] [--dry-run]");
  process.exit(2);
}

const packDir = dirname(dirname(fileURLToPath(import.meta.url)));
const tools = parse(readFileSync(join(packDir, "pack.yaml"), "utf8")).tools;
const plugin = tools.find((t) => t.name === "org.openrewrite.maven:rewrite-maven-plugin");
const modules = tools.filter((t) => t.role === "engine" && t.name.startsWith("org.openrewrite.recipe:"));
if (plugin === undefined || modules.length === 0) {
  console.error("pack.yaml must pin org.openrewrite.maven:rewrite-maven-plugin and the recipe module(s)");
  process.exit(2);
}

if (!existsSync("pom.xml")) {
  console.error(
    existsSync("build.gradle") || existsSync("build.gradle.kts")
      ? `Gradle build: run the recipe with OpenRewrite's Gradle plugin (rewriteRun with activeRecipe("${recipes}") and ${modules.map((m) => `${m.name}:${m.version}`).join(", ")}), then fm check.`
      : "No pom.xml in the project directory.",
  );
  process.exit(1);
}

const goal = dryRun ? "dryRun" : "run";
const run = spawnSync(
  "mvn",
  [
    "-B",
    "-q",
    `${plugin.name}:${plugin.version}:${goal}`,
    `-Drewrite.recipeArtifactCoordinates=${modules.map((m) => `${m.name}:${m.version}`).join(",")}`,
    `-Drewrite.activeRecipes=${recipes}`,
    // Recipes change build files too; OpenRewrite exports its datatables nowhere by default.
    "-Drewrite.exportDatatables=false",
    ...(exclusions === "" ? [] : [`-Drewrite.exclusions=${exclusions}`]),
  ],
  { encoding: "utf8" },
);
process.stdout.write((run.stdout + run.stderr).split("\n").filter((line) => !line.startsWith("Picked up JAVA_TOOL_OPTIONS")).join("\n"));
if (run.status !== 0) process.exit(run.status ?? 1);
if (dryRun) {
  const patch = join("target", "rewrite", "rewrite.patch");
  process.stdout.write(existsSync(patch) ? readFileSync(patch, "utf8") : "No changes.\n");
}
