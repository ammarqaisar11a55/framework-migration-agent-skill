import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { packsDir } from "./paths.ts";
import { validate } from "./schema.ts";
import type { Pack, PackManifest, Rule } from "./types.ts";

export const TEMPLATE_ID = "_template";

function readYaml(path: string): unknown {
  return parseYaml(readFileSync(path, "utf8"));
}

/** Loads and schema-validates pack.yaml. Throws with every schema error on an invalid manifest. */
export function loadPack(dir: string): Pack {
  const abs = resolve(dir);
  const manifest = readYaml(join(abs, "pack.yaml"));
  const errors = validate("pack", manifest);
  if (errors.length > 0) throw new Error(`Invalid pack.yaml in ${abs}:\n  ${errors.join("\n  ")}`);
  return { ...(manifest as PackManifest), dir: abs };
}

export function loadRules(pack: Pack): Rule[] {
  const file = readYaml(join(pack.dir, "rules", "deprecated-apis.yaml"));
  const errors = validate("rules", file);
  if (errors.length > 0) throw new Error(`Invalid rules file in ${pack.dir}:\n  ${errors.join("\n  ")}`);
  const { rules, exclude = [] } = file as { rules: Rule[]; exclude?: string[] };
  // The file-level exclude list applies to every rule.
  return exclude.length === 0 ? rules : rules.map((rule) => ({ ...rule, exclude: [...exclude, ...(rule.exclude ?? [])] }));
}

/** Every pack shipped with the skill, excluding the template and directories without a pack.yaml. */
export function listPacks(root: string = packsDir()): Pack[] {
  return readdirSync(root)
    .filter((name) => name !== TEMPLATE_ID && existsSync(join(root, name, "pack.yaml")))
    .sort()
    .map((name) => loadPack(join(root, name)));
}

export function findPack(idOrPath: string): Pack {
  if (existsSync(join(idOrPath, "pack.yaml"))) return loadPack(idOrPath);
  const dir = join(packsDir(), idOrPath);
  if (!existsSync(join(dir, "pack.yaml"))) throw new Error(`Unknown pack "${idOrPath}"`);
  return loadPack(dir);
}

export interface ExpectedFinding {
  rule: string;
  file: string;
  line: number;
}

export interface FixtureExpectation {
  kind: "positive" | "negative";
  findings: ExpectedFinding[];
  /** Negative fixtures: code that must still be present, verbatim, after the migration. */
  must_remain?: { file: string; contains: string }[];
  manual_items?: number;
}

export interface Fixture {
  name: string;
  dir: string;
  expectation: FixtureExpectation;
}

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/;

/** expected-report.md carries the machine-checked expectations as YAML frontmatter. */
export function parseExpectation(markdown: string): FixtureExpectation {
  const match = FRONTMATTER.exec(markdown);
  if (match?.[1] === undefined) throw new Error("expected-report.md has no YAML frontmatter");
  const data = parseYaml(match[1]) as Partial<FixtureExpectation> | null;
  if (data?.kind !== "positive" && data?.kind !== "negative") {
    throw new Error('expected-report.md frontmatter needs kind: "positive" or "negative"');
  }
  if (!Array.isArray(data.findings)) throw new Error("expected-report.md frontmatter needs a findings list");
  for (const f of data.findings) {
    if (typeof f?.rule !== "string" || typeof f.file !== "string" || typeof f.line !== "number") {
      throw new Error("each expected finding needs rule, file and line");
    }
  }
  return data as FixtureExpectation;
}

const isDir = (path: string): boolean => existsSync(path) && statSync(path).isDirectory();

export function listFixtureDirs(packDir: string): string[] {
  const root = join(packDir, "fixtures");
  if (!isDir(root)) return [];
  return readdirSync(root)
    .sort()
    .map((name) => join(root, name))
    .filter(isDir);
}

export function loadFixtures(pack: Pack): Fixture[] {
  return listFixtureDirs(pack.dir).map((dir) => ({
    name: basename(dir),
    dir,
    expectation: parseExpectation(readFileSync(join(dir, "expected-report.md"), "utf8")),
  }));
}

export interface ValidationResult {
  errors: string[];
  warnings: string[];
}

const PLACEHOLDER_URL = /example\.(com|org)/;

/** Validates a whole pack directory: manifest, rules, required files, codemod references, fixtures. */
export function validatePack(dir: string): ValidationResult {
  const abs = resolve(dir);
  const errors: string[] = [];
  const warnings: string[] = [];
  const manifestPath = join(abs, "pack.yaml");
  if (!existsSync(manifestPath)) return { errors: [`pack.yaml: file not found in ${abs}`], warnings };

  let manifest: unknown;
  try {
    manifest = readYaml(manifestPath);
  } catch (error) {
    return { errors: [`pack.yaml: not valid YAML (${(error as Error).message})`], warnings };
  }
  const manifestErrors = validate("pack", manifest);
  errors.push(...manifestErrors.map((e) => `pack.yaml: ${e}`));
  const pack = manifestErrors.length === 0 ? (manifest as PackManifest) : undefined;

  const isTemplate = basename(abs) === TEMPLATE_ID;
  if (pack !== undefined && !isTemplate && pack.id !== basename(abs)) {
    errors.push(`pack.yaml: id "${pack.id}" must equal the directory name "${basename(abs)}"`);
  }

  for (const required of ["references/official-sources.md", "rules/deprecated-apis.yaml"]) {
    if (!existsSync(join(abs, required))) errors.push(`${required}: required file is missing`);
  }
  for (const required of ["codemods", "fixtures"]) {
    if (!isDir(join(abs, required))) errors.push(`${required}/: required directory is missing`);
  }

  const rulesPath = join(abs, "rules", "deprecated-apis.yaml");
  if (existsSync(rulesPath)) {
    try {
      const rules = readYaml(rulesPath);
      const ruleErrors = validate("rules", rules);
      errors.push(...ruleErrors.map((e) => `rules/deprecated-apis.yaml: ${e}`));
      if (ruleErrors.length === 0) {
        const seen = new Set<string>();
        const invalidPattern = (pattern: string): string | undefined => {
          try {
            new RegExp(pattern);
            return undefined;
          } catch (error) {
            return (error as Error).message;
          }
        };
        for (const pattern of (rules as { exclude?: string[] }).exclude ?? []) {
          const problem = invalidPattern(pattern);
          if (problem !== undefined) errors.push(`rules/deprecated-apis.yaml: exclude pattern ${JSON.stringify(pattern)} is not a valid regex (${problem})`);
        }
        for (const rule of (rules as { rules: Rule[] }).rules) {
          for (const pattern of rule.exclude ?? []) {
            const problem = invalidPattern(pattern);
            if (problem !== undefined) errors.push(`rules/deprecated-apis.yaml: rule "${rule.id}" has an exclude pattern that is not a valid regex (${problem})`);
          }
          if (seen.has(rule.id)) errors.push(`rules/deprecated-apis.yaml: duplicate rule id "${rule.id}"`);
          seen.add(rule.id);
          if (rule.matcher.type === "regex") {
            try {
              new RegExp(rule.matcher.pattern, rule.matcher.flags ?? "");
            } catch (error) {
              errors.push(`rules/deprecated-apis.yaml: rule "${rule.id}" has an invalid regex (${(error as Error).message})`);
            }
          }
          if (!isTemplate && PLACEHOLDER_URL.test(rule.docs_url)) {
            errors.push(`rules/deprecated-apis.yaml: rule "${rule.id}" has a placeholder docs_url`);
          }
        }
      }
    } catch (error) {
      errors.push(`rules/deprecated-apis.yaml: not valid YAML (${(error as Error).message})`);
    }
  }

  const sources = join(abs, "references", "official-sources.md");
  if (!isTemplate && existsSync(sources) && !/https:\/\/(?!example\.)/.test(readFileSync(sources, "utf8"))) {
    errors.push("references/official-sources.md: lists no source URL");
  }

  if (pack !== undefined) {
    const stageIds = new Set<string>();
    for (const stage of pack.stages) {
      if (stageIds.has(stage.id)) errors.push(`pack.yaml: duplicate stage id "${stage.id}"`);
      stageIds.add(stage.id);
      for (const codemod of stage.codemods ?? []) {
        if (!existsSync(join(abs, "codemods", codemod))) {
          errors.push(`pack.yaml: stage "${stage.id}" references codemods/${codemod}, which does not exist`);
        }
      }
    }
  }

  let positive = 0;
  let negative = 0;
  for (const fixture of listFixtureDirs(abs)) {
    const name = `fixtures/${basename(fixture)}`;
    for (const part of ["before", "after"]) {
      if (!isDir(join(fixture, part))) errors.push(`${name}/${part}/: required directory is missing`);
    }
    const report = join(fixture, "expected-report.md");
    if (!existsSync(report)) {
      errors.push(`${name}/expected-report.md: required file is missing`);
      continue;
    }
    try {
      const expectation = parseExpectation(readFileSync(report, "utf8"));
      if (expectation.kind === "positive") positive++;
      else negative++;
    } catch (error) {
      errors.push(`${name}/expected-report.md: ${(error as Error).message}`);
    }
  }
  if (pack !== undefined) {
    const short = positive < 3 || negative < 1;
    const message = `fixtures/: found ${positive} positive and ${negative} negative fixture(s); a shipped pack needs at least 3 positive and 1 negative`;
    if (short && pack.status === "shipped") errors.push(message);
    else if (short) warnings.push(message);
  }

  return { errors, warnings };
}
