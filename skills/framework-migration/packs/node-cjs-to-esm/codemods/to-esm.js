// Stage "esm": turns a CommonJS package into an ES module package ("type": "module") without
// changing what any module evaluates to.
//
// The whole project is analysed once, then every file gets one of three outcomes:
//
//   esm     — converted: require → import, module.exports → export, __dirname →
//             import.meta.dirname, "use strict" dropped. Lazy or computed require() calls stay and
//             get a `createRequire(import.meta.url)` shim, so they still load what they did.
//   cjs     — kept CommonJS and renamed .js → .cjs: the file uses something ESM has no equivalent
//             for (require.main, module.*, top-level `this`, conditional exports), or a top-level
//             side effect that import hoisting would move (rule import-hoisting), or it is tool
//             configuration. A module that exports a single value and is still loaded with
//             require() stays CommonJS too: require() of an ES module returns its namespace, not the
//             value module.exports used to hold (modules with named exports keep their shape).
//   island  — kept CommonJS in place: the directory is loaded with computed require() paths
//             (plugins), so its files keep their names and get a package.json {"type":"commonjs"}.
//
// Importers follow each target's outcome: ES module targets are imported by shape (default,
// namespace or named), CommonJS targets with a default import (= module.exports), JSON with
// `with { type: 'json' }`. Relative specifiers get explicit file names (./lib → ./lib/index.js).
import { existsSync, readFileSync } from "node:fs";
import { builtinModules } from "node:module";
import { join, posix } from "node:path";
import jscodeshift from "jscodeshift";

export const parser = "babel";

const CONFIG_FILE = /(^|\/)(\.[^/]+|[^/]+\.config\.[cm]?js)$/;
const BUILTINS = new Set([...builtinModules, ...builtinModules.map((name) => `node:${name}`)]);
const isJs = (path) => path.endsWith(".js");
export const include = (path) => path === "package.json" || isJs(path);

const isId = (node, name) => node?.type === "Identifier" && (name === undefined || node.name === name);
const isString = (node) => (node?.type === "StringLiteral" || node?.type === "Literal") && typeof node.value === "string";
const isRequireCall = (node) => node?.type === "CallExpression" && isId(node.callee, "require") && node.arguments.length === 1;
const literalRequire = (node) => (isRequireCall(node) && isString(node.arguments[0]) ? node.arguments[0].value : undefined);
const isModuleExports = (node) => node?.type === "MemberExpression" && !node.computed && isId(node.object, "module") && isId(node.property, "exports");
const isDirective = (s) => s.type === "ExpressionStatement" && s.directive !== undefined;
const isUseStrict = (s) => isDirective(s) && s.directive === "use strict";

/** `require('dotenv').config()` with no arguments: becomes `import 'dotenv/config'`, in place. */
const isDotenvConfig = (s) =>
  s.type === "ExpressionStatement" &&
  s.expression.type === "CallExpression" &&
  s.expression.arguments.length === 0 &&
  s.expression.callee.type === "MemberExpression" &&
  isId(s.expression.callee.property, "config") &&
  literalRequire(s.expression.callee.object) === "dotenv";

/** A top-level statement `require('x')` or `const <pattern> = require('x')`. */
function topLevelRequire(statement) {
  if (statement.type === "ExpressionStatement") {
    const specifier = literalRequire(statement.expression);
    return specifier === undefined ? undefined : { specifier, id: null };
  }
  if (statement.type !== "VariableDeclaration" || statement.declarations.length !== 1) return undefined;
  const [declarator] = statement.declarations;
  const specifier = literalRequire(declarator.init);
  return specifier === undefined ? undefined : { specifier, id: declarator.id };
}
const isRequireStatement = (s) => topLevelRequire(s) !== undefined || isDotenvConfig(s);

/**
 * A top-level side effect that a later-required module may depend on (rule import-hoisting).
 * ES modules evaluate every import before the importing module's body, so moving such a statement
 * after the imports could change what those modules see when they load.
 */
export function isHoistingHazard(s) {
  if (s.type !== "ExpressionStatement" || isDirective(s) || isDotenvConfig(s)) return false;
  const e = s.expression;
  if (e.type === "AssignmentExpression" && e.left.type === "MemberExpression") {
    const target = e.left.object;
    if (isId(target, "global") || isId(target, "globalThis")) return true;
    if (target.type === "MemberExpression" && isId(target.object, "process") && isId(target.property, "env")) return true;
  }
  if (e.type === "CallExpression" && e.callee.type === "MemberExpression") {
    if (isId(e.callee.property, "config")) return true;
    if (isRequireCall(e.callee.object)) return true;
  }
  return false;
}

function topLevelBindings(program) {
  const names = new Set();
  for (const statement of program.body) {
    if (statement.type === "VariableDeclaration") {
      for (const d of statement.declarations) {
        if (isId(d.id)) names.add(d.id.name);
        else if (d.id.type === "ObjectPattern") for (const p of d.id.properties) if (isId(p.value)) names.add(p.value.name);
      }
    } else if ((statement.type === "FunctionDeclaration" || statement.type === "ClassDeclaration") && statement.id) {
      names.add(statement.id.name);
    }
  }
  return names;
}

/**
 * How a CommonJS file exports:
 *   none  — nothing
 *   named — individual names: { statements: [{ statement, specifiers } | { statement, declare, value }] }
 *   value — one value:        { statement, value }
 *   bail  — anything else (conditional, repeated or read-back exports)
 */
function analyzeExports(j, root) {
  const program = root.get().node.program;
  const bindings = topLevelBindings(program);
  const whole = [];
  const props = [];
  for (const statement of program.body) {
    if (statement.type !== "ExpressionStatement" || statement.expression.type !== "AssignmentExpression" || statement.expression.operator !== "=") continue;
    const { left, right } = statement.expression;
    if (isModuleExports(left)) whole.push({ statement, right });
    else if (left.type === "MemberExpression" && !left.computed && isId(left.property) && (isModuleExports(left.object) || isId(left.object, "exports"))) {
      props.push({ statement, right, name: left.property.name });
    }
  }
  const moduleExportsUses = root.find(j.MemberExpression).filter((p) => isModuleExports(p.node)).size();
  const bareExportsUses = root
    .find(j.Identifier, { name: "exports" })
    .filter((p) => !(p.parent.node.type === "MemberExpression" && p.parent.node.property === p.node && !p.parent.node.computed))
    .filter((p) => !(p.parent.node.type === "ObjectProperty" && p.parent.node.key === p.node && !p.parent.node.computed))
    .size();
  if (whole.length === 0 && props.length === 0) return { kind: moduleExportsUses + bareExportsUses > 0 ? "bail" : "none" };
  const accountedModule = whole.length + props.filter((p) => isModuleExports(p.statement.expression.left.object)).length;
  if (moduleExportsUses !== accountedModule || bareExportsUses !== props.length - (accountedModule - whole.length)) return { kind: "bail" };
  if (whole.length > 1 || (whole.length === 1 && props.length > 0)) return { kind: "bail" };

  if (whole.length === 1) {
    const { statement, right } = whole[0];
    const asNames =
      right.type === "ObjectExpression" &&
      right.properties.length > 0 &&
      right.properties.every((p) => (p.type === "ObjectProperty" || p.type === "Property") && !p.computed && isId(p.key) && isId(p.value) && bindings.has(p.value.name));
    if (!asNames) return { kind: "value", statement, value: right };
    return { kind: "named", statements: [{ statement, specifiers: right.properties.map((p) => ({ local: p.value.name, exported: p.key.name })) }] };
  }
  const seen = new Set();
  const statements = [];
  for (const { statement, right, name } of props) {
    if (seen.has(name)) return { kind: "bail" };
    seen.add(name);
    if (isId(right) && bindings.has(right.name)) statements.push({ statement, specifiers: [{ local: right.name, exported: name }] });
    else if (bindings.has(name)) return { kind: "bail" };
    else statements.push({ statement, declare: name, value: right });
  }
  return { kind: "named", statements };
}

/** The directory a computed require() loads from, when its path starts from a known place. */
function dynamicBase(arg, fileDir) {
  // path.join(__dirname, ...) / path.resolve(__dirname, ...)
  if (arg.type === "CallExpression" && arg.callee.type === "MemberExpression" && /^(join|resolve)$/.test(arg.callee.property.name ?? "")) {
    const [first, second] = arg.arguments;
    if (isId(first, "__dirname")) {
      return isString(second) && second.value.includes("/") ? posix.normalize(posix.join(fileDir, posix.dirname(second.value))) : fileDir;
    }
  }
  // `./plugins/${name}` or './plugins/' + name
  let prefix;
  if (arg.type === "TemplateLiteral") prefix = arg.quasis[0].value.cooked;
  else if (arg.type === "BinaryExpression" && arg.operator === "+" && isString(arg.left)) prefix = arg.left.value;
  if (prefix !== undefined && /^\.\.?\//.test(prefix) && prefix.includes("/")) {
    return posix.normalize(posix.join(fileDir, prefix.slice(0, prefix.lastIndexOf("/") + 1)));
  }
  return undefined;
}

function scanFile(j, path, source) {
  const root = j(source);
  const program = root.get().node.program;
  const fileDir = posix.dirname(path);
  const reasons = [];
  if (CONFIG_FILE.test(path) && /\b(require|module\.exports|exports)\b/.test(source)) reasons.push("tool configuration, loaded by the tool with require()");
  const exportsInfo = analyzeExports(j, root);
  if (exportsInfo.kind === "bail") reasons.push("module.exports/exports is assigned conditionally, more than once, or read back");

  const topLevel = new Set(program.body.filter((s) => topLevelRequire(s) !== undefined));
  const lastRequire = program.body.findLastIndex((s) => isRequireStatement(s));
  if (program.body.slice(0, Math.max(lastRequire, 0)).some(isHoistingHazard)) reasons.push("a top-level side effect runs before a later require() (import hoisting would reorder them)");

  const shimmed = []; // literal specifiers of requires that stay require() calls
  const islands = [];
  let unknownDynamic = false;
  let needsShim = false;
  root.find(j.CallExpression, { callee: { name: "require" } }).forEach((p) => {
    const statement = p.parent.node.type === "ExpressionStatement" ? p.parent.node : p.parent.parent?.node;
    const isTop = topLevel.has(p.parent.node) || (statement && topLevel.has(statement) && statement.declarations?.[0]?.init === p.node);
    if (isTop) return;
    if (p.parent.node.type === "MemberExpression" && isDotenvConfig(p.parent.parent.parent?.node ?? {})) return;
    needsShim = true;
    const specifier = literalRequire(p.node);
    if (specifier !== undefined) shimmed.push(specifier);
    else {
      const base = p.node.arguments[0] ? dynamicBase(p.node.arguments[0], fileDir) : undefined;
      if (base === undefined) unknownDynamic = true;
      else islands.push(base);
    }
  });
  if (unknownDynamic) reasons.push("require() with a computed path whose directory cannot be determined");
  if (root.find(j.MemberExpression, { object: { name: "require" } }).filter((p) => /^(main|cache|extensions)$/.test(p.node.property.name ?? "")).size() > 0) {
    reasons.push("uses require.main, require.cache or require.extensions");
  }
  if (root.find(j.MemberExpression, { object: { name: "module" } }).filter((p) => !isModuleExports(p.node)).size() > 0) reasons.push("uses the module object");
  if (root.find(j.Identifier, { name: "module" }).filter((p) => p.parent.node.type !== "MemberExpression" || p.parent.node.object !== p.node).filter((p) => !(p.parent.node.type === "ObjectProperty" && p.parent.node.key === p.node)).size() > 0) {
    reasons.push("uses the module object");
  }
  // `this` at the top level is module.exports in CommonJS and undefined in ES modules.
  const topThis = root.find(j.ThisExpression).filter((p) => {
    for (let q = p.parent; q; q = q.parent) {
      if (["FunctionDeclaration", "FunctionExpression", "ClassBody", "ObjectMethod", "ClassMethod"].includes(q.node.type)) return false;
    }
    return true;
  });
  if (topThis.size() > 0) reasons.push("uses `this` at the top level");
  return { exportsInfo, reasons: [...new Set(reasons)], shimmed, islands, needsShim };
}

const analyses = new WeakMap();

/** Whole-project decisions, computed once per stage run. */
function analyze(j, options) {
  let result = analyses.get(options.inventory);
  if (result !== undefined) return result;
  const files = options.inventory.files.map((f) => f.path).filter((p) => isJs(p));
  const resolvedOf = (path, specifier) => options.inventory.files.find((f) => f.path === path)?.imports.find((i) => i.specifier === specifier)?.resolved;
  const scans = new Map();
  for (const path of files) {
    try {
      scans.set(path, scanFile(j, path, options.read(path) ?? ""));
    } catch (error) {
      scans.set(path, { exportsInfo: { kind: "bail" }, reasons: [`could not be parsed (${error.message})`], shimmed: [], islands: [], needsShim: false });
    }
  }
  const islandDirs = new Set([...scans.values()].flatMap((s) => s.islands));
  const inIsland = (path) => [...islandDirs].some((dir) => path === dir || path.startsWith(`${dir}/`));
  const format = new Map();
  const why = new Map();
  for (const [path, scan] of scans) {
    if (inIsland(path)) {
      format.set(path, "island");
      why.set(path, "its directory is loaded with computed require() paths");
    } else if (scan.reasons.length > 0) {
      format.set(path, "cjs");
      why.set(path, scan.reasons.join("; "));
    } else {
      format.set(path, "esm");
    }
  }
  // A module that is still loaded with require() — by a CommonJS file, or lazily by an ES module —
  // must give require() what it gave before. require() of an ES module returns its namespace
  // (Node.js 20.19+), which is the same shape for named exports but not for a single exported
  // value: those modules stay CommonJS, and so, in turn, does everything they require.
  const queue = [...scans.keys()];
  while (queue.length > 0) {
    const path = queue.pop();
    const scan = scans.get(path);
    const specifiers = format.get(path) === "esm" ? scan.shimmed : (options.inventory.files.find((f) => f.path === path)?.imports ?? []).filter((i) => i.kind === "require").map((i) => i.specifier);
    for (const specifier of specifiers) {
      const target = resolvedOf(path, specifier);
      if (target === undefined || format.get(target) !== "esm") continue;
      if (scans.get(target)?.exportsInfo.kind !== "value") continue;
      format.set(target, "cjs");
      why.set(target, `${path} loads it with require()`);
      queue.push(target);
    }
  }
  const finalPath = (path) => (format.get(path) === "cjs" && isJs(path) ? path.replace(/\.js$/, ".cjs") : path);
  result = { scans, format, why, islandDirs, finalPath, resolvedOf };
  analyses.set(options.inventory, result);
  return result;
}

/** A relative specifier from one project file to another, with the explicit file name ESM needs. */
function relativeSpecifier(from, to) {
  let rel = posix.relative(posix.dirname(from), to);
  if (!rel.startsWith(".")) rel = `./${rel}`;
  return rel;
}

/** Whether an installed package is an ES module package (its require() returns the namespace). */
function packageIsEsm(root, specifier) {
  const parts = specifier.split("/");
  const name = specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
  for (let dir = root; ; dir = posix.dirname(dir)) {
    const pkg = join(dir, "node_modules", name, "package.json");
    if (existsSync(pkg)) {
      try {
        return JSON.parse(readFileSync(pkg, "utf8")).type === "module";
      } catch {
        return false;
      }
    }
    if (posix.dirname(dir) === dir) return false;
  }
}

/** package.json {"type":"commonjs"} for each directory that must stay CommonJS in place. */
export function createFiles(options) {
  const decided = analyze(jscodeshift.withParser(parser), options);
  return Object.fromEntries([...decided.islandDirs].map((dir) => [dir === "." ? "package.json" : `${dir}/package.json`, `${JSON.stringify({ type: "commonjs" }, null, 2)}\n`]));
}

export function rename(path, options) {
  const decided = analyses.get(options.inventory);
  return decided?.format.get(options.originalPath) === "cjs" ? decided.finalPath(options.originalPath) : undefined;
}

function transformPackageJson(file, decided, options) {
  const pkg = JSON.parse(file.source);
  let changed = false;
  if (pkg.type !== "module") {
    pkg.type = "module";
    changed = true;
  }
  const renamed = [...decided.format].filter(([, f]) => f === "cjs").map(([path]) => path);
  const retarget = (text) => {
    let out = text;
    for (const path of renamed) out = out.replace(new RegExp(`(^|[\\s"'=])(\\./)?${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=$|[\\s"'])`, "g"), (_m, lead, dot) => `${lead}${dot ?? ""}${decided.finalPath(path)}`);
    return out;
  };
  for (const field of ["main", "bin", "scripts", "exports"]) {
    if (pkg[field] === undefined) continue;
    const next = JSON.parse(retarget(JSON.stringify(pkg[field])));
    if (JSON.stringify(next) !== JSON.stringify(pkg[field])) {
      pkg[field] = next;
      changed = true;
    }
  }
  for (const [path, format] of decided.format) {
    if (format === "cjs") options.note(`${path} stays CommonJS as ${decided.finalPath(path)}: ${decided.why.get(path)}`);
  }
  for (const dir of decided.islandDirs) options.note(`${dir}/ stays CommonJS (package.json {"type":"commonjs"}): it is loaded with computed require() paths`);
  if (!changed) return undefined;
  const indent = /^([ \t]+)"/m.exec(file.source)?.[1] ?? "  ";
  return `${JSON.stringify(pkg, null, indent)}\n`;
}

/**
 * Rewrites the literal local specifiers of require() and require.resolve() calls that remain, for
 * targets renamed to .cjs: CommonJS resolution does not try the .cjs extension. Returns true when
 * something changed.
 */
function retargetRequires(j, root, decided, options) {
  let changed = false;
  const from = decided.finalPath(options.originalPath);
  const retarget = (args) => {
    const specifier = isString(args[0]) ? args[0].value : undefined;
    if (specifier === undefined || !specifier.startsWith(".")) return;
    const target = decided.resolvedOf(options.originalPath, specifier) ?? resolveLocal(options, specifier);
    if (target === undefined || decided.finalPath(target) === target) return;
    args[0] = j.stringLiteral(relativeSpecifier(from, decided.finalPath(target)));
    changed = true;
  };
  root.find(j.CallExpression, { callee: { name: "require" } }).forEach((p) => retarget(p.node.arguments));
  root.find(j.CallExpression, { callee: { type: "MemberExpression", object: { name: "require" }, property: { name: "resolve" } } }).forEach((p) => retarget(p.node.arguments));
  return changed;
}

/** A relative specifier resolved the way require() would, against the project's file list. */
function resolveLocal(options, specifier) {
  const base = posix.normalize(posix.join(posix.dirname(options.originalPath), specifier));
  return [base, `${base}.js`, `${base}/index.js`].find((candidate) => options.inventory.files.some((f) => f.path === candidate));
}

function transformCommonJs(j, file, decided, options) {
  const root = j(file.source);
  const single = (file.source.match(/'/g) ?? []).length >= (file.source.match(/"/g) ?? []).length;
  return retargetRequires(j, root, decided, options) ? root.toSource({ quote: single ? "single" : "double" }) : undefined;
}

export default function transform(file, api, options) {
  const j = api.jscodeshift;
  const decided = analyze(j, options);
  if (file.path === "package.json") return transformPackageJson(file, decided, options);
  const path = options.originalPath;
  const format = decided.format.get(path);
  if (format === undefined) return undefined;
  if (format !== "esm") return transformCommonJs(j, file, decided, options);

  const root = j(file.source);
  const program = root.get().node.program;
  const scan = decided.scans.get(path);
  const fileFinal = decided.finalPath(path);
  const replacements = new Map();
  const extra = new Map(); // statement → statements inserted after its replacement
  const str = (value) => j.stringLiteral(value);
  // recast does not print import attributes; JSON imports get theirs after printing.
  const jsonSources = new Set();
  const importDecl = (specifiers, source, json) => {
    if (json) jsonSources.add(source);
    return j.importDeclaration(specifiers, str(source));
  };
  const used = new Set(root.find(j.Identifier).nodes().map((n) => n.name));
  const fresh = (base) => {
    let name = base.replace(/[^\w$]/g, "_").replace(/^(\d)/, "_$1");
    while (used.has(name)) name = `_${name}`;
    used.add(name);
    return name;
  };

  for (const statement of program.body) {
    if (isUseStrict(statement)) {
      replacements.set(statement, null);
      continue;
    }
    if (isDotenvConfig(statement)) {
      replacements.set(statement, importDecl([], "dotenv/config"));
      continue;
    }
    const found = topLevelRequire(statement);
    if (found === undefined) continue;
    const { specifier, id } = found;
    const local = specifier.startsWith(".");
    const target = local ? decided.resolvedOf(path, specifier) : undefined;
    if (local && target === undefined) {
      options.note(`${path}: require("${specifier}") does not resolve to a project file; left unchanged`);
      continue;
    }
    const source = local ? relativeSpecifier(fileFinal, decided.finalPath(target)) : specifier;
    const json = specifier.endsWith(".json");
    // What the target is once migrated: "default" (module.exports or export default), "namespace"
    // (named ES exports) or "builtin" (named exports available).
    let shape;
    if (json) shape = "default";
    else if (local) {
      const targetFormat = decided.format.get(target);
      const kind = decided.scans.get(target)?.exportsInfo.kind;
      shape = targetFormat !== "esm" || target === undefined || !decided.scans.has(target) ? "default" : kind === "named" || kind === "none" ? "namespace" : "default";
    } else if (BUILTINS.has(specifier)) shape = "builtin";
    else shape = packageIsEsm(options.root, specifier) ? "namespace" : "default";

    if (id === null) {
      replacements.set(statement, importDecl([], source, json));
    } else if (isId(id)) {
      const spec = shape === "namespace" ? j.importNamespaceSpecifier(j.identifier(id.name)) : j.importDefaultSpecifier(j.identifier(id.name));
      replacements.set(statement, importDecl([spec], source, json));
    } else if (id.type === "ObjectPattern" && (shape === "namespace" || shape === "builtin") && id.properties.every((p) => (p.type === "ObjectProperty" || p.type === "Property") && !p.computed && isId(p.key) && isId(p.value))) {
      replacements.set(statement, importDecl(id.properties.map((p) => j.importSpecifier(j.identifier(p.key.name), j.identifier(p.value.name))), source, json));
    } else {
      // Destructuring a value: import it whole, then destructure exactly as before.
      const name = fresh(`${posix.basename(specifier).replace(/\.\w+$/, "")}Module`);
      replacements.set(statement, importDecl([j.importDefaultSpecifier(j.identifier(name))], source, json));
      extra.set(statement, [j.variableDeclaration(statement.kind, [j.variableDeclarator(id, j.identifier(name))])]);
    }
  }

  // Statement nodes must come from this parse, not the analysis one.
  const exportsInfo = analyzeExports(j, root);
  if (exportsInfo.kind === "value") {
    // `module.exports = function f() {}` → `export default function f() {}` (a declaration, so no
    // stray semicolon); the same for classes.
    const v = exportsInfo.value;
    const declaration =
      v.type === "FunctionExpression"
        ? Object.assign(j.functionDeclaration(v.id ?? null, v.params, v.body, v.generator, v.async), { comments: v.comments })
        : v.type === "ClassExpression"
          ? Object.assign(j.classDeclaration(v.id ?? null, v.body, v.superClass ?? null), { comments: v.comments })
          : v;
    replacements.set(exportsInfo.statement, j.exportDefaultDeclaration(declaration));
  } else if (exportsInfo.kind === "named") {
    for (const { statement, specifiers, declare, value } of exportsInfo.statements) {
      replacements.set(
        statement,
        declare === undefined
          ? j.exportNamedDeclaration(null, specifiers.map((s) => j.exportSpecifier.from({ local: j.identifier(s.local), exported: j.identifier(s.exported) })))
          : j.exportNamedDeclaration(j.variableDeclaration("const", [j.variableDeclarator(j.identifier(declare), value)])),
      );
    }
  }

  // __dirname / __filename → import.meta.dirname / filename, unless the file declares its own.
  const declares = (name) => root.find(j.VariableDeclarator, { id: { name } }).size() > 0;
  for (const [name, property] of [["__dirname", "dirname"], ["__filename", "filename"]]) {
    if (declares(name)) continue;
    root
      .find(j.Identifier, { name })
      .filter((p) => !(p.parent.node.type === "MemberExpression" && p.parent.node.property === p.node && !p.parent.node.computed))
      .replaceWith(() => j.memberExpression(j.metaProperty(j.identifier("import"), j.identifier("meta")), j.identifier(property)));
  }

  const body = [];
  for (const statement of program.body) {
    const replacement = replacements.get(statement);
    if (replacement === null) continue;
    if (replacement === undefined) {
      body.push(statement);
      continue;
    }
    replacement.comments = statement.comments;
    body.push(replacement, ...(extra.get(statement) ?? []));
  }
  retargetRequires(j, root, decided, options);
  if (scan.needsShim) {
    // Lazy and computed require() calls keep working, and keep their timing.
    const shim = [
      importDecl([j.importSpecifier(j.identifier("createRequire"))], "node:module"),
      j.variableDeclaration("const", [j.variableDeclarator(j.identifier("require"), j.callExpression(j.identifier("createRequire"), [j.memberExpression(j.metaProperty(j.identifier("import"), j.identifier("meta")), j.identifier("url"))]))]),
    ];
    const lastImport = body.findLastIndex((s) => s.type === "ImportDeclaration");
    body.splice(lastImport + 1, 0, ...shim);
  }
  program.body = body;
  if (program.directives) program.directives = program.directives.filter((d) => d.value.value !== "use strict");
  const single = (file.source.match(/'/g) ?? []).length >= (file.source.match(/"/g) ?? []).length;
  const q = single ? "'" : '"';
  let output = root.toSource({ quote: single ? "single" : "double" });
  for (const source of jsonSources) {
    output = output.replaceAll(`from ${q}${source}${q};`, `from ${q}${source}${q} with { type: ${q}json${q} };`);
  }
  return output;
}
