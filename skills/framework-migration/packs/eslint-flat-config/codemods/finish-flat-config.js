// Stage "flat-config", after @eslint/migrate-config: the parts of the migration guide the migrator
// leaves to the user.
//
//   package.json   eslint → the pinned 9.x release; the packages eslint.config.* imports
//                  (@eslint/js, globals, @eslint/eslintrc, @eslint/compat) added at pinned versions;
//                  the `eslintConfig` key removed; scripts: `--ext` removed (non-default extensions
//                  become `files` entries in the config), `--ignore-path` removed (its file was
//                  migrated), `--no-eslintrc` → `--no-config-lookup`.
//   eslint.config.*  a `{ files: ["**/*.jsx"] }` entry for each extension `--ext` named beyond
//                  .js/.mjs/.cjs, which flat config lints by default.
//   *.js           `/* eslint-env mocha */` comments, which flat config reports as errors, become
//                  `/* global describe, it -- eslint-env mocha */` listing the environment's globals
//                  the file uses (the migration guide's first alternative), or are removed when it
//                  uses none.
//
// `--env`, `--rulesdir` and `--resolve-plugins-relative-to` have no mechanical replacement; rules
// cli-env and cli-rulesdir report them.
import globals from "globals";

const DEFAULT_EXTENSIONS = new Set([".js", ".mjs", ".cjs"]);
const SOURCE = /\.(?:[cm]?js|jsx)$/;
const CONFIG = /^eslint\.config\.[cm]?js$/;
const configName = (options) => ["eslint.config.mjs", "eslint.config.js", "eslint.config.cjs"].find((name) => options.read(name) !== undefined);
export const include = (path) => path === "package.json" || CONFIG.test(path) || (SOURCE.test(path) && !path.startsWith("node_modules/"));

/** Extensions passed to `eslint --ext` in any script. */
function extOptions(scripts) {
  const exts = new Set();
  for (const script of Object.values(scripts ?? {})) {
    for (const match of script.matchAll(/\beslint\b[^&|;]*?--ext[ =]([^\s&|;]+)/g)) {
      for (const ext of match[1].split(",")) exts.add(ext.startsWith(".") ? ext : `.${ext}`);
    }
  }
  return exts;
}

function rewriteScript(script) {
  return script.replace(/(\beslint\b)([^&|;]*)/g, (_m, eslint, args) => {
    const next = args
      .replace(/\s--ext[ =][^\s&|;]+/g, "")
      .replace(/\s--ignore-path[ =][^\s&|;]+/g, "")
      .replace(/\s--no-eslintrc\b/g, " --no-config-lookup");
    return `${eslint}${next}`;
  });
}

function packageJson(file, options) {
  const pkg = JSON.parse(file.source);
  const name = configName(options);
  const imports = name === undefined ? "" : (options.read(name) ?? "");
  const tools = Object.fromEntries(options.pack.tools.filter((t) => t.role === "devDependency").map((t) => [t.name, t.version]));
  const wanted = { eslint: tools.eslint };
  for (const name of ["@eslint/js", "globals", "@eslint/eslintrc", "@eslint/compat"]) {
    const quoted = `["']${name.replace("/", "\\/")}["']`;
    if (new RegExp(`from ${quoted}|require\\(${quoted}\\)`).test(imports) && tools[name] !== undefined) wanted[name] = tools[name];
  }
  for (const [name, version] of Object.entries(wanted)) {
    if (version === undefined) continue;
    if (pkg.dependencies?.[name] !== undefined) pkg.dependencies[name] = version;
    else pkg.devDependencies = { ...pkg.devDependencies, [name]: version };
  }
  if (pkg.devDependencies) pkg.devDependencies = Object.fromEntries(Object.entries(pkg.devDependencies).sort(([a], [b]) => a.localeCompare(b)));
  delete pkg.eslintConfig;
  for (const [name, script] of Object.entries(pkg.scripts ?? {})) pkg.scripts[name] = rewriteScript(script);
  const indent = /^([ \t]+)"/m.exec(file.source)?.[1] ?? "  ";
  return `${JSON.stringify(pkg, null, indent)}\n`;
}

function flatConfig(file, api, options) {
  const pkg = JSON.parse(options.read("package.json") ?? "{}");
  const extra = [...extOptions(pkg.scripts)].filter((ext) => !DEFAULT_EXTENSIONS.has(ext)).sort();
  const j = api.jscodeshift;
  const root = j(file.source);
  const call = root.find(j.CallExpression, { callee: { name: "defineConfig" } }).filter((p) => p.node.arguments[0]?.type === "ArrayExpression");
  // The migrator turns the `node` environment into sourceType "commonjs" for every file. eslintrc
  // linted only .js files by default; flat config also lints .mjs files (this config among them),
  // which must parse as modules.
  const commonjsEverywhere = /sourceType:\s*["']commonjs["']/.test(file.source);
  if (extra.length === 0 && !commonjsEverywhere) return undefined;
  if (call.size() === 0) {
    options.note(`${file.path}: no defineConfig([...]) call; add the files / sourceType entries by hand`);
    return undefined;
  }
  const entries = call.get().node.arguments[0].elements;
  const prop = (key, value) => j.property("init", j.identifier(key), value);
  if (extra.length > 0) {
    entries.splice(0, 0, j.objectExpression([prop("files", j.arrayExpression(extra.map((e) => j.stringLiteral(`**/*${e}`))))]));
  }
  if (commonjsEverywhere) {
    entries.push(
      j.objectExpression([
        prop("files", j.arrayExpression([j.stringLiteral("**/*.mjs")])),
        prop("languageOptions", j.objectExpression([prop("sourceType", j.stringLiteral("module"))])),
      ]),
    );
    options.note(`${file.path}: .mjs files parse as ES modules; flat config lints them, eslintrc did not by default`);
  }
  return root.toSource({ quote: "double" });
}

/** `/* eslint-env a, b *\/` → `/* global x, y -- eslint-env a, b *\/` with the globals the file uses. */
function eslintEnv(file, api, options) {
  if (!/\/\*\s*eslint-env\s/.test(file.source)) return undefined;
  const j = api.jscodeshift;
  // Names the file reads as free variables: not property names, object keys or local bindings.
  let used;
  try {
    const root = j(file.source);
    const declared = new Set();
    root.find(j.VariableDeclarator).forEach((p) => p.node.id.type === "Identifier" && declared.add(p.node.id.name));
    root.find(j.Function).forEach((p) => {
      if (p.node.id) declared.add(p.node.id.name);
      for (const param of p.node.params) if (param.type === "Identifier") declared.add(param.name);
    });
    used = new Set(
      root
        .find(j.Identifier)
        .filter((p) => {
          const parent = p.parent.node;
          if ((parent.type === "MemberExpression" || parent.type === "OptionalMemberExpression") && parent.property === p.node && !parent.computed) return false;
          if ((parent.type === "Property" || parent.type === "ObjectProperty") && parent.key === p.node && !parent.computed && parent.value !== p.node) return false;
          return !declared.has(p.node.name);
        })
        .nodes()
        .map((n) => n.name),
    );
  } catch {
    options.note(`${file.path}: could not be parsed; convert its eslint-env comment by hand`);
    return undefined;
  }
  return file.source.replace(/\/\*\s*eslint-env\s+([^*]*?)\s*\*\/\n?/g, (whole, list) => {
    const envs = list.split(/[\s,]+/).filter(Boolean);
    const names = new Set();
    for (const env of envs) {
      const table = globals[env];
      if (table === undefined) {
        options.note(`${file.path}: unknown eslint-env "${env}"; converted without it`);
        continue;
      }
      for (const name of Object.keys(table)) if (used.has(name)) names.add(name);
    }
    if (names.size === 0) return "";
    return `/* global ${[...names].sort().join(", ")} -- eslint-env ${envs.join(", ")} */${whole.endsWith("\n") ? "\n" : ""}`;
  });
}

export default function transform(file, api, options) {
  if (file.path === "package.json") return packageJson(file, options);
  if (CONFIG.test(file.path)) return flatConfig(file, api, options);
  return eslintEnv(file, api, options);
}
