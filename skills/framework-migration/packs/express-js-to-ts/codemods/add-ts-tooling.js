// Stage "tooling": adds a tsconfig.json that still accepts JavaScript, the TypeScript and type
// packages pinned in pack.yaml, and build/typecheck scripts. Scripts that run source files are
// pointed at the build output, so the app and its tests run the compiled code from here on.
import { OUT_DIR, formatJson, jsSources, parseJsonFile, sourceRoots } from "./shared.js";

export const include = (path) => path === "package.json" || path === ".gitignore";

export function createFiles({ inventory }) {
  const tsconfig = {
    compilerOptions: {
      target: "es2022",
      // Each file's output format follows Node's own rules (package.json "type", .mts/.cts).
      module: "node16",
      rootDir: ".",
      outDir: OUT_DIR,
      types: ["node"],
      allowJs: true,
      strict: false,
      resolveJsonModule: true,
      skipLibCheck: true,
    },
    include: sourceRoots(jsSources(inventory)),
  };
  return { "tsconfig.json": `${JSON.stringify(tsconfig, null, 2)}\n` };
}

const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Rewrites paths to source files inside a script so they point into the build output. */
function retarget(script, roots) {
  const dirs = roots.filter((r) => !/\.[cm]?jsx?$/.test(r)).map(escape);
  const files = roots.filter((r) => /\.[cm]?jsx?$/.test(r)).map(escape);
  const alternatives = [];
  if (dirs.length > 0) alternatives.push(`(?:${dirs.join("|")})/[^\\s'"]*?\\.[cm]?js`);
  if (files.length > 0) alternatives.push(`(?:${files.join("|")})`);
  if (alternatives.length === 0) return script;
  const pattern = new RegExp(`(^|[\\s=])(?:\\./)?(${alternatives.join("|")})(?=$|[\\s'"])`, "g");
  return script.replace(pattern, (_match, lead, path) => `${lead}${OUT_DIR}/${path}`);
}

export default function transform(file, _api, options) {
  if (file.path === ".gitignore") {
    const lines = file.source.split(/\r?\n/).map((line) => line.trim());
    if (lines.includes(OUT_DIR) || lines.includes(`${OUT_DIR}/`) || lines.includes(`/${OUT_DIR}`)) return undefined;
    return `${file.source}${file.source.endsWith("\n") ? "" : "\n"}${OUT_DIR}/\n`;
  }

  const pkg = parseJsonFile(file);
  const roots = sourceRoots(jsSources(options.inventory));

  for (const tool of options.pack.tools) {
    if (tool.role !== "devDependency" && tool.role !== "dependency") continue;
    const existing = pkg.dependencies?.[tool.name] ?? pkg.devDependencies?.[tool.name];
    if (existing !== undefined) {
      if (existing !== tool.version) options.note(`package.json already depends on ${tool.name}@${existing}; the pack was verified with ${tool.version}`);
      continue;
    }
    const field = tool.role === "dependency" ? "dependencies" : "devDependencies";
    pkg[field] = { ...pkg[field], [tool.name]: tool.version };
    pkg[field] = Object.fromEntries(Object.entries(pkg[field]).sort(([a], [b]) => a.localeCompare(b)));
  }

  const scripts = { ...pkg.scripts };
  for (const [name, script] of Object.entries(scripts)) {
    const retargeted = retarget(script, roots);
    if (retargeted === script) {
      if (name === "test") options.note(`the "test" script (${script}) names no source file, so it was not changed: make sure the test runner picks up TypeScript tests`);
      continue;
    }
    const isTest = name === "test" || name.startsWith("test:");
    scripts[name] = isTest && !/\b(tsc|npm run build)\b/.test(retargeted) ? `npm run build && ${retargeted}` : retargeted;
  }
  scripts.build ??= "tsc";
  scripts.typecheck ??= "tsc --noEmit";
  pkg.scripts = scripts;

  if (typeof pkg.main === "string") pkg.main = retarget(pkg.main, roots);
  if (options.read(".gitignore") === undefined) options.note(`there is no .gitignore: add ${OUT_DIR}/ to one so build output is not committed`);
  return formatJson(pkg, file.source);
}
