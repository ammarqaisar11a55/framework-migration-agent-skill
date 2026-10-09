import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import semver from "semver";
import type { ProjectView } from "./adapter.ts";
import { ADAPTERS } from "./adapters.ts";
import { walk } from "./paths.ts";
import type { Pack, Stack } from "./types.ts";

export function projectView(root: string, files: readonly string[] = walk(root)): ProjectView {
  return {
    files,
    read: (path) => (existsSync(join(root, path)) ? readFileSync(join(root, path), "utf8") : undefined),
  };
}

/** Detects every stack declared by the manifests in `root`. A polyglot repo yields several. */
export function detectStack(root: string, project: ProjectView = projectView(resolve(root))): Stack[] {
  return ADAPTERS.flatMap((adapter) => adapter.detect(project));
}

/**
 * Does a declared version ("^4.18.2", "~> 6.1", "==1.10.2", "net48") fall inside a pack's semver
 * range ("4.x")? Version specs that cannot be interpreted do not rule a pack out: "unknown".
 */
export function versionMatches(declared: string, range: string): boolean | "unknown" {
  if (semver.validRange(range) === null) return "unknown";
  const lowest = semver.validRange(declared) !== null ? semver.minVersion(declared) : semver.coerce(declared);
  if (lowest === null || (lowest.version === "0.0.0" && !/0/.test(declared))) return "unknown";
  return semver.satisfies(lowest, range);
}

export interface PackMatch {
  pack: Pack;
  stack: Stack;
  /** False when the project's version spec could not be compared with the pack's range. */
  versionVerified: boolean;
}

/** Packs whose `from` matches a detected stack. No match = inventory + detection only. */
export function matchPacks(stacks: readonly Stack[], packs: readonly Pack[]): PackMatch[] {
  const matches: PackMatch[] = [];
  for (const pack of packs) {
    for (const stack of stacks) {
      if (stack.ecosystem !== pack.ecosystem) continue;
      if (pack.from.language !== undefined && pack.from.language !== stack.language) continue;
      if (pack.from.module_type !== undefined && pack.from.module_type !== stack.moduleType) continue;
      const framework = stack.frameworks.find((f) => f.name === pack.from.framework);
      if (framework === undefined) continue;
      const verdict = versionMatches(framework.version, pack.from.versions);
      if (verdict === false) continue;
      matches.push({ pack, stack, versionVerified: verdict === true });
      break;
    }
  }
  return matches;
}
