import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const SKILL_REL = join("skills", "framework-migration");

/**
 * The skill directory (SKILL.md, schemas/, packs/). Resolved by walking up from this file, because
 * the engine runs both from source (skills/framework-migration/engine) and compiled (dist/engine).
 */
export function skillDir(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (;;) {
    const candidate = join(dir, SKILL_REL);
    if (existsSync(join(candidate, "schemas"))) return candidate;
    const parent = dirname(dir);
    if (parent === dir) throw new Error("fm: cannot locate skills/framework-migration next to the engine");
    dir = parent;
  }
}

export const schemasDir = (): string => join(skillDir(), "schemas");
/** The package root (package.json): two levels above the skill directory. */
export const packageRoot = (): string => join(skillDir(), "..", "..");
export const packsDir = (): string => join(skillDir(), "packs");

/** Directories never scanned in a target project. */
export const IGNORED_DIRS = new Set([
  // Not "bin": Node packages keep CLI sources there. .NET build output in bin/ holds no source files.
  "node_modules", ".git", ".fm", "dist", "build", "built", "out", "coverage", "vendor", "target", "obj",
  ".venv", "venv", "__pycache__", ".pytest_cache", ".mypy_cache", ".tox", ".dart_tool", ".gradle", ".next", ".nuxt", ".svelte-kit", ".angular",
]);

/** Project-relative, forward-slash paths of every file under root, sorted. */
export function walk(root: string, ignored: ReadonlySet<string> = IGNORED_DIRS): string[] {
  const out: string[] = [];
  const visit = (dir: string): void => {
    for (const name of readdirSync(dir).sort()) {
      const full = join(dir, name);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        if (!ignored.has(name)) visit(full);
      } else if (stat.isFile()) {
        out.push(toPosix(relative(root, full)));
      }
    }
  };
  visit(root);
  return out;
}

export const toPosix = (p: string): string => (sep === "/" ? p : p.split(sep).join("/"));
