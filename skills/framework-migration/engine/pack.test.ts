import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { run } from "./cli.ts";
import { loadPack, loadRules, parseExpectation, validatePack } from "./pack.ts";
import { packsDir } from "./paths.ts";

const template = join(packsDir(), "_template");

describe("validate-pack", () => {
  let dir: string;
  beforeEach(() => {
    dir = join(mkdtempSync(join(tmpdir(), "fm-pack-")), "template-pack");
    cpSync(template, dir, { recursive: true });
  });
  afterEach(() => rmSync(join(dir, ".."), { recursive: true, force: true }));

  const edit = (file: string, fn: (text: string) => string): void => {
    writeFileSync(join(dir, file), fn(readFileSync(join(dir, file), "utf8")));
  };

  it("accepts the template", () => {
    expect(validatePack(template).errors).toEqual([]);
  });

  it("warns, but does not fail, when an unshipped pack has too few fixtures", () => {
    expect(validatePack(template).warnings).toHaveLength(1);
  });

  it("reports the template as valid through the CLI", async () => {
    const result = await run(["validate-pack", template]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("is valid");
  });

  it("rejects a tool version that is not pinned", async () => {
    edit("pack.yaml", (t) => t.replace('version: "1.0.0"', 'version: "^1.0.0"'));
    const result = await run(["validate-pack", dir]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("pack.yaml: /tools/0/version");
  });

  it.each(["4.x", "<pin>", "latest", ">=1.2.3"])("rejects tool version %s", (version) => {
    edit("pack.yaml", (t) => t.replace('version: "1.0.0"', `version: "${version}"`));
    expect(validatePack(dir).errors.join("\n")).toContain("/tools/0/version");
  });

  it("names the missing property and the bad enum value", () => {
    edit("pack.yaml", (t) => t.replace(/^title:.*\n/m, "").replace("tier: 1", "tier: 4"));
    const errors = validatePack(dir).errors.join("\n");
    expect(errors).toContain('missing required property "title"');
    expect(errors).toContain("/tier: must be one of [1,2,3]");
  });

  it("applies the file-level exclude list to every rule and rejects an invalid pattern", () => {
    edit("rules/deprecated-apis.yaml", (t) => `exclude: ["\\\\.config\\\\.js$"]\n${t}`);
    expect(validatePack(dir).errors.filter((e) => e.includes("exclude"))).toEqual([]);
    for (const rule of loadRules(loadPack(dir))) expect(rule.exclude).toContain("\\.config\\.js$");
    edit("rules/deprecated-apis.yaml", (t) => t.replace('exclude: ["\\\\.config\\\\.js$"]', 'exclude: ["("]'));
    expect(validatePack(dir).errors.join("\n")).toContain('exclude pattern "(" is not a valid regex');
  });

  it("rejects an id that differs from the directory name", () => {
    edit("pack.yaml", (t) => t.replace("id: template-pack", "id: other-pack"));
    expect(validatePack(dir).errors.join("\n")).toContain('id "other-pack" must equal the directory name');
  });

  it("rejects a stage that references a missing codemod", () => {
    edit("pack.yaml", (t) => t.replace("example-codemod.js", "missing.js"));
    expect(validatePack(dir).errors.join("\n")).toContain("codemods/missing.js, which does not exist");
  });

  it("rejects an invalid rule and a missing sources file", () => {
    edit("rules/deprecated-apis.yaml", (t) => t.replace("severity: error", "severity: fatal"));
    rmSync(join(dir, "references", "official-sources.md"));
    const errors = validatePack(dir).errors.join("\n");
    expect(errors).toContain("rules/deprecated-apis.yaml: /rules/0/severity");
    expect(errors).toContain("references/official-sources.md: required file is missing");
  });

  it("rejects placeholder URLs outside the template", () => {
    const errors = validatePack(dir).errors.join("\n");
    expect(errors).toContain("placeholder docs_url");
    expect(errors).toContain("lists no source URL");
  });

  it("requires 3 positive and 1 negative fixture once a pack is shipped", () => {
    edit("pack.yaml", (t) => t.replace("status: planned", "status: shipped"));
    expect(validatePack(dir).errors.join("\n")).toContain("found 1 positive and 0 negative fixture(s)");
  });

  it("rejects a fixture without a before directory", () => {
    rmSync(join(dir, "fixtures", "01-example", "before"), { recursive: true });
    expect(validatePack(dir).errors.join("\n")).toContain("fixtures/01-example/before/: required directory is missing");
  });
});

describe("parseExpectation", () => {
  it("reads kind and findings from the frontmatter", () => {
    const parsed = parseExpectation("---\nkind: negative\nfindings:\n  - { rule: r, file: a.js, line: 2 }\n---\n# x\n");
    expect(parsed).toEqual({ kind: "negative", findings: [{ rule: "r", file: "a.js", line: 2 }] });
  });

  it("rejects a report without frontmatter", () => {
    expect(() => parseExpectation("# just prose\n")).toThrow("no YAML frontmatter");
  });
});
