#!/usr/bin/env node
// Runs OpenRewrite's JUnit4to5Migration (through openrewrite.mjs), leaving out the test classes it
// cannot migrate. Not a jscodeshift codemod module: pack.yaml calls it as a stage command.
//
//   node junit5.mjs [--dry-run]
//
// The recipe converts the JUnit 4 rules it knows (TemporaryFolder, ExpectedException, Timeout,
// TestName, MockitoRule). A custom rule (a class implementing TestRule or MethodRule, or a @Rule /
// @ClassRule field of any other type) is left in place while the test's annotations move to
// Jupiter, where @Rule is ignored: the test then runs without its rule, or does not compile. So
// those classes, and the rule classes themselves, are excluded from the recipe and stay JUnit 4;
// finish-junit5.js keeps junit:junit and adds the JUnit Vintage engine so they still run on the
// JUnit Platform, next to the migrated tests (the JUnit 5 user guide's mixed setup).
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RECIPE = "org.openrewrite.java.testing.junit5.JUnit4to5Migration";
const SUPPORTED_RULES = new Set(["TemporaryFolder", "ExpectedException", "Timeout", "TestName", "MockitoRule"]);
const SKIPPED = new Set(["target", "build", ".git", ".fm", "node_modules"]);

function javaFiles(dir, prefix = "") {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (SKIPPED.has(entry.name)) return [];
    const path = prefix === "" ? entry.name : `${prefix}/${entry.name}`;
    if (entry.isDirectory()) return javaFiles(join(dir, entry.name), path);
    return entry.name.endsWith(".java") ? [path] : [];
  });
}

/** Why a JUnit 4 file must stay JUnit 4, or undefined. */
function customRule(source) {
  if (/\bimplements\s+[^{]*\b(TestRule|MethodRule)\b/.test(source)) return "implements a JUnit 4 rule";
  for (const m of source.matchAll(/@(?:Rule|ClassRule)\b[\s\S]*?(?:public|protected|private)?\s*(?:static\s+)?(?:final\s+)?([A-Z][\w.]*)(?:<[^>]*>)?\s+\w+\s*[=;]/g)) {
    const type = m[1].split(".").pop();
    if (!SUPPORTED_RULES.has(type)) return `uses the custom rule ${type}`;
  }
  return undefined;
}

const excluded = [];
for (const path of javaFiles(process.cwd())) {
  const source = readFileSync(path, "utf8");
  if (!/^\s*import\s+(static\s+)?org\.junit\.(?!jupiter|platform)/m.test(source)) continue;
  const reason = customRule(source);
  if (reason !== undefined) {
    excluded.push(path);
    console.log(`left as JUnit 4 (runs on JUnit Vintage): ${path} ${reason}`);
  }
}

const runner = join(dirname(fileURLToPath(import.meta.url)), "openrewrite.mjs");
const args = [runner, RECIPE, ...(excluded.length > 0 ? [`--exclusions=${excluded.join(",")}`] : []), ...process.argv.slice(2)];
const run = spawnSync(process.execPath, args, { stdio: "inherit" });
process.exitCode = run.status ?? 1;
