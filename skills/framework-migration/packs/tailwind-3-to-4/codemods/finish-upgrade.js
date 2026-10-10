// Stage "upgrade", after @tailwindcss/upgrade: what the tool leaves undone.
//
//   package.json   A script that runs the Tailwind CLI needs @tailwindcss/cli in v4 (the CLI moved
//                  out of the tailwindcss package; its binary is still `tailwindcss`). It is added at
//                  the version pinned in pack.yaml.
//   templates      v4 removes bg-opacity-*, text-opacity-*, border-opacity-*, divide-opacity-*,
//                  ring-opacity-* and placeholder-opacity-* (upgrade guide: "Removed deprecated
//                  utilities"). When the same class list has exactly one colour utility of the same
//                  kind and variant, they merge into the opacity modifier the guide gives:
//                    class="bg-brand bg-opacity-50"  →  class="bg-brand/50"
//                  Anything else is left; rule opacity-utilities reports it.
//
// Colours are the default palette plus every `--color-*` theme variable in the project's CSS (the
// upgrade tool writes the v3 theme there).
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const TEMPLATE = /\.(html?|jsx|tsx|vue|svelte|astro|php|erb|hbs|njk|liquid|mdx?)$/;
export const include = (path) => path === "package.json" || TEMPLATE.test(path);

const PALETTE = [
  "inherit", "current", "transparent", "black", "white",
  "slate", "gray", "zinc", "neutral", "stone", "red", "orange", "amber", "yellow", "lime", "green", "emerald",
  "teal", "cyan", "sky", "blue", "indigo", "violet", "purple", "fuchsia", "pink", "rose",
];
const KINDS = ["bg", "text", "border", "divide", "ring", "placeholder"];
const CLASS_ATTR = /(\b(?:class|className)\s*=\s*)(["'])([^"']*)\2/g;
const OPACITY = new RegExp(`^((?:[\\w-]+:)*)(${KINDS.join("|")})-opacity-(\\d+)$`);

const SKIPPED = new Set(["node_modules", ".git", ".fm", "dist", "build"]);

/** Project-relative paths of the CSS files (the inventory lists only script sources). */
function cssFiles(root, dir = "") {
  return readdirSync(join(root, dir), { withFileTypes: true }).flatMap((entry) => {
    if (SKIPPED.has(entry.name)) return [];
    const path = dir === "" ? entry.name : `${dir}/${entry.name}`;
    return entry.isDirectory() ? cssFiles(root, path) : /\.(css|pcss|scss)$/.test(entry.name) ? [path] : [];
  });
}

function themeColors(options) {
  const names = new Set();
  for (const path of cssFiles(options.root)) {
    for (const match of (options.read(path) ?? readFileSync(join(options.root, path), "utf8")).matchAll(/--color-([\w-]+)\s*:/g)) names.add(match[1]);
  }
  return names;
}

/** True when `rest` (what follows "bg-") names a colour: palette, palette-shade, theme colour, or [arbitrary]. */
function isColor(rest, theme) {
  if (/^\[.+\]$/.test(rest) && !/^\[(length|size|position|url):/.test(rest)) return /^\[(#|rgb|hsl|oklch|color:|var\(--color)/.test(rest);
  if (rest.includes("/")) return false; // already has an opacity modifier
  if (theme.has(rest)) return true;
  const [name, shade] = [rest.replace(/-\d{2,3}$/, ""), /-(\d{2,3})$/.exec(rest)?.[1]];
  return PALETTE.includes(name) && (shade === undefined ? !/\d/.test(rest) : true);
}

function mergeOpacity(classes, theme, report) {
  const tokens = classes.split(/(\s+)/);
  const words = tokens.filter((t, i) => i % 2 === 0);
  let changed = false;
  for (const word of [...words]) {
    const m = OPACITY.exec(word);
    if (m === null) continue;
    const [, variant, kind, amount] = m;
    const colors = words.filter((w) => w.startsWith(`${variant}${kind}-`) && isColor(w.slice(`${variant}${kind}-`.length), theme));
    if (colors.length !== 1) {
      report(`"${word}" has ${colors.length === 0 ? "no" : "more than one"} matching ${variant}${kind}-<colour> class to merge into`);
      continue;
    }
    const at = tokens.indexOf(colors[0]);
    tokens[at] = `${colors[0]}/${amount}`;
    words[words.indexOf(colors[0])] = tokens[at];
    const drop = tokens.indexOf(word);
    // Remove the token and one adjacent whitespace run.
    tokens.splice(drop > 0 ? drop - 1 : drop, drop > 0 ? 2 : Math.min(2, tokens.length - drop));
    words.splice(words.indexOf(word), 1);
    changed = true;
  }
  return changed ? tokens.join("") : undefined;
}

function packageJson(file, options) {
  const pkg = JSON.parse(file.source);
  const usesCli = Object.values(pkg.scripts ?? {}).some((s) => /(^|[\s;&|(])(npx\s+)?tailwindcss(\s|$)/.test(s));
  const has = (name) => pkg.dependencies?.[name] !== undefined || pkg.devDependencies?.[name] !== undefined;
  if (!usesCli || has("@tailwindcss/cli")) return undefined;
  const version = options.pack.tools.find((t) => t.name === "@tailwindcss/cli")?.version;
  pkg.devDependencies = Object.fromEntries(Object.entries({ ...pkg.devDependencies, "@tailwindcss/cli": version }).sort(([a], [b]) => a.localeCompare(b)));
  options.note("package.json: added @tailwindcss/cli, which provides the `tailwindcss` command in v4");
  const indent = /^([ \t]+)"/m.exec(file.source)?.[1] ?? "  ";
  return `${JSON.stringify(pkg, null, indent)}\n`;
}

export default function transform(file, _api, options) {
  if (file.path === "package.json") return packageJson(file, options);
  if (!/opacity-\d/.test(file.source)) return undefined;
  const theme = themeColors(options);
  let changed = false;
  const output = file.source.replace(CLASS_ATTR, (whole, lead, quote, classes) => {
    const next = mergeOpacity(classes, theme, (message) => options.note(`${file.path}: ${message}; left as it is`));
    if (next === undefined) return whole;
    changed = true;
    return `${lead}${quote}${next}${quote}`;
  });
  return changed ? output : undefined;
}
