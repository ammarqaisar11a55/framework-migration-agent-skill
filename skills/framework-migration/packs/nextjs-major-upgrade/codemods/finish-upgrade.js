// Stage "upgrade", after @next/codemod: what the tool leaves undone or adds beyond the upgrade.
//
//   package.json     The tool picks React, its types and ESLint as the newest versions matching the
//                    target's peer ranges on the day it runs. Each one the project has (dependencies,
//                    devDependencies, overrides) is set to the version pinned in pack.yaml, so every
//                    project lands on the versions the pack was verified with.
//   App Router       @next/codemod 16.3 runs the cache-components-instant-false adoption codemod with
//   pages/layouts    the upgrade: it inserts `export const instant = false` and a TODO into every
//                    page, layout and default file. `instant` only has an effect when cacheComponents
//                    is enabled (route segment config reference), and the upgrade guide's checklist
//                    says Cache Components are not enabled merely to complete the upgrade; later
//                    releases make the codemod opt-out (--skip-adoption). Unless next.config enables
//                    cacheComponents, the inserted block is removed again.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROUTE_FILE = /(^|\/)app\/(.*\/)?(page|layout|default)\.[jt]sx?$/;
export const include = (path) => path === "package.json" || ROUTE_FILE.test(path);

const PINNED = ["react", "react-dom", "react-is", "@types/react", "@types/react-dom", "eslint", "eslint-config-next", "@next/eslint-plugin-next", "next"];
const INSTANT_BLOCK =
  /^\/\/ TODO: Cache Components adoption\. Refactor this route so this opt-out can be removed\.\r?\n\/\/ See: https:\/\/nextjs\.org\/docs\/app\/guides\/migrating-to-cache-components\r?\nexport const instant = false;?\r?\n(\r?\n)?/m;
const CONFIGS = ["next.config.js", "next.config.mjs", "next.config.ts", "next.config.cjs", "next.config.mts"];

function pinVersions(file, options) {
  const pins = new Map(options.pack.tools.filter((t) => t.role !== "engine").map((t) => [t.name, t.version]));
  const pkg = JSON.parse(file.source);
  let changed = false;
  for (const field of ["dependencies", "devDependencies", "overrides"]) {
    for (const name of PINNED) {
      const current = pkg[field]?.[name];
      if (typeof current !== "string" || !pins.has(name) || current === pins.get(name)) continue;
      pkg[field][name] = pins.get(name);
      changed = true;
    }
  }
  if (!changed) return undefined;
  const indent = /^([ \t]+)"/m.exec(file.source)?.[1] ?? "  ";
  return `${JSON.stringify(pkg, null, indent)}\n`;
}

function usesCacheComponents(options) {
  return CONFIGS.some((name) => {
    const text = options.read(name) ?? (existsSync(join(options.root, name)) ? readFileSync(join(options.root, name), "utf8") : "");
    return /\bcacheComponents\s*:\s*true\b/.test(text);
  });
}

export default function transform(file, _api, options) {
  if (file.path === "package.json") return pinVersions(file, options);
  if (!INSTANT_BLOCK.test(file.source) || usesCacheComponents(options)) return undefined;
  return file.source.replace(INSTANT_BLOCK, "");
}
