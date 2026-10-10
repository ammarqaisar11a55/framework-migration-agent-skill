import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";
import { run } from "./cli.ts";
import { installSkill, packageVersion, SKILL_NAME, skillsDirs } from "./install-skill.ts";
import { listPacks } from "./pack.ts";
import { skillDir } from "./paths.ts";

describe("SKILL.md", () => {
  const text = readFileSync(join(skillDir(), "SKILL.md"), "utf8");
  const frontmatter = parseYaml(/^---\n([\s\S]*?)\n---\n/.exec(text)?.[1] ?? "") as Record<string, unknown>;

  // https://agentskills.io/specification — the format Claude Code, Codex and Cursor load.
  it("meets the Agent Skills specification", () => {
    const name = frontmatter["name"] as string;
    expect(name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(name.length).toBeLessThanOrEqual(64);
    expect(name).toBe(SKILL_NAME);
    expect(skillDir().endsWith(name)).toBe(true);
    const description = frontmatter["description"] as string;
    expect(description.length).toBeGreaterThan(0);
    expect(description.length).toBeLessThanOrEqual(1024);
    expect((frontmatter["compatibility"] as string).length).toBeLessThanOrEqual(500);
    expect(Object.keys(frontmatter).every((k) => ["name", "description", "license", "compatibility", "metadata", "allowed-tools"].includes(k))).toBe(true);
  });

  it("runs the engine version this package ships", () => {
    expect(text).toContain(`npx -y -p framework-migration-agent-skill@${packageVersion()} fm`);
  });
});

describe("install-skill", () => {
  let base: string;
  beforeEach(() => {
    base = mkdtempSync(join(tmpdir(), "fm-install-"));
  });
  afterEach(() => rmSync(base, { recursive: true, force: true }));

  it("knows where each client loads skills from", () => {
    const project = "/p";
    const home = "/h";
    const dirs = (client: Parameters<typeof skillsDirs>[0], scope: "project" | "user", env = {}) => skillsDirs(client, scope, project, env, home);
    expect(dirs("claude", "project")).toEqual(["/p/.claude/skills"]);
    expect(dirs("claude", "user")).toEqual(["/h/.claude/skills"]);
    expect(dirs("codex", "project")).toEqual(["/p/.agents/skills"]);
    expect(dirs("codex", "user")).toEqual(["/h/.codex/skills"]);
    expect(dirs("codex", "user", { CODEX_HOME: "/c" })).toEqual(["/c/skills"]);
    // Set but empty (`CODEX_HOME= fm ...`) is not a directory: use the default, not the current one.
    expect(dirs("codex", "user", { CODEX_HOME: "" })).toEqual(["/h/.codex/skills"]);
    expect(dirs("cursor", "project")).toEqual(["/p/.cursor/skills"]);
    expect(dirs("cursor", "user")).toEqual(["/h/.cursor/skills"]);
    expect(dirs("all", "project")).toEqual(["/p/.claude/skills", "/p/.agents/skills"]);
  });

  it("copies SKILL.md and each pack's pack.yaml, rules and references", () => {
    const { path, packs } = installSkill(join(base, "skills"));
    expect(path).toBe(join(base, "skills", SKILL_NAME));
    expect(readFileSync(join(path, "SKILL.md"), "utf8")).toBe(readFileSync(join(skillDir(), "SKILL.md"), "utf8"));
    expect(packs).toEqual(listPacks().map((p) => p.id));
    for (const id of packs) {
      expect(readdirSync(join(path, "packs", id)).sort()).toEqual(["pack.yaml", "references", "rules"]);
    }
    expect(JSON.parse(readFileSync(join(path, ".fm-install.json"), "utf8"))).toEqual({ package: "framework-migration-agent-skill", version: packageVersion() });
  });

  it("replaces its own earlier install but not a folder it did not create", () => {
    installSkill(join(base, "skills"));
    writeFileSync(join(base, "skills", SKILL_NAME, "stale.txt"), "x");
    installSkill(join(base, "skills"));
    expect(existsSync(join(base, "skills", SKILL_NAME, "stale.txt"))).toBe(false);
    mkdirSync(join(base, "other", SKILL_NAME), { recursive: true });
    expect(() => installSkill(join(base, "other"))).toThrow(/was not installed by fm install-skill/);
  });

  it("installs for every client through the CLI", async () => {
    const result = await run(["install-skill", "--project", base]);
    expect(result.exitCode).toBe(0);
    expect(existsSync(join(base, ".claude", "skills", SKILL_NAME, "SKILL.md"))).toBe(true);
    expect(existsSync(join(base, ".agents", "skills", SKILL_NAME, "SKILL.md"))).toBe(true);
    expect((await run(["install-skill", "--client", "vim"])).exitCode).toBe(2);
  });
});
