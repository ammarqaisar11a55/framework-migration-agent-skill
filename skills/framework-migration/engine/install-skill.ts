// `fm install-skill`: copies the skill into the directory an agent client loads skills from.
//
// The skill follows the Agent Skills format (agentskills.io): a folder named after the skill with a
// SKILL.md at its root. Clients look in different places:
//
//   client  project scope                user scope
//   claude  <project>/.claude/skills     ~/.claude/skills
//   codex   <project>/.agents/skills     $CODEX_HOME/skills (default ~/.codex/skills)
//   cursor  <project>/.cursor/skills     ~/.cursor/skills
//   agents  <project>/.agents/skills     ~/.agents/skills     (the cross-client convention)
//
// `all` (the default) installs into the claude and agents locations: Claude Code reads .claude/skills,
// Codex reads .agents/skills, and Cursor reads both.
//
// The installed copy holds what the agent reads: SKILL.md and, for each pack, pack.yaml, rules/ and
// references/. The engine itself runs from npm (`npx -p framework-migration-agent-skill@<version>
// fm`), pinned in SKILL.md to the version that installed it.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { packageRoot, skillDir } from "./paths.ts";

export const SKILL_NAME = "framework-migration";
export const CLIENTS = ["claude", "codex", "cursor", "agents", "all"] as const;
export type Client = (typeof CLIENTS)[number];
export type Scope = "project" | "user";

const PACK_PARTS = ["pack.yaml", "rules", "references"];
const MARKER = ".fm-install.json";

/** The skills directories a client loads from, for one scope. */
export function skillsDirs(client: Client, scope: Scope, project: string, env: NodeJS.ProcessEnv = process.env, home: string = homedir()): string[] {
  const user = (dir: string): string => join(home, dir, "skills");
  switch (client) {
    case "claude":
      return [scope === "user" ? user(".claude") : join(project, ".claude", "skills")];
    case "codex":
      return [scope === "user" ? join(env["CODEX_HOME"] ?? join(home, ".codex"), "skills") : join(project, ".agents", "skills")];
    case "cursor":
      return [scope === "user" ? user(".cursor") : join(project, ".cursor", "skills")];
    case "agents":
      return [scope === "user" ? user(".agents") : join(project, ".agents", "skills")];
    case "all":
      return [...skillsDirs("claude", scope, project, env, home), ...skillsDirs("agents", scope, project, env, home)];
  }
}

export function packageVersion(): string {
  return (JSON.parse(readFileSync(join(packageRoot(), "package.json"), "utf8")) as { version: string }).version;
}

/** Copies the skill into `<skillsDir>/framework-migration`, replacing an earlier install. */
export function installSkill(skillsDir: string): { path: string; packs: string[] } {
  const source = skillDir();
  const target = join(skillsDir, SKILL_NAME);
  if (existsSync(target)) {
    // Replace only what this command installed, never a folder someone else put there.
    if (!existsSync(join(target, MARKER))) throw new Error(`${target} exists and was not installed by fm install-skill; remove it first`);
    rmSync(target, { recursive: true, force: true });
  }
  mkdirSync(target, { recursive: true });
  cpSync(join(source, "SKILL.md"), join(target, "SKILL.md"));
  const packs: string[] = [];
  for (const id of readdirSync(join(source, "packs")).sort()) {
    const dir = join(source, "packs", id);
    if (id === "_template" || !existsSync(join(dir, "pack.yaml"))) continue;
    for (const part of PACK_PARTS) {
      if (existsSync(join(dir, part))) cpSync(join(dir, part), join(target, "packs", id, part), { recursive: true });
    }
    packs.push(id);
  }
  writeFileSync(join(target, MARKER), `${JSON.stringify({ package: "framework-migration-agent-skill", version: packageVersion() }, null, 2)}\n`);
  return { path: target, packs };
}

export function installFor(client: Client, scope: Scope, project: string): string[] {
  return skillsDirs(client, scope, resolve(project)).map((dir) => installSkill(dir).path);
}
