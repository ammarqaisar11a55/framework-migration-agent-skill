// Stage "rename-and-modules", first step: converts CommonJS module syntax to TypeScript module
// syntax without changing what any module exports at runtime.
//
//   const x = require("./x")        → import x from "./x"          (x has a safe default export)
//                                   → import * as x from "./x"     (x has named exports)
//                                   → import x = require("./x")    (x's export shape is preserved)
//   const { a } = require("./x")    → import { a } from "./x"
//   module.exports = { a, b }       → export { a, b }
//   exports.a = ...                 → export const a = ...
//   module.exports = value          → export default value         (only when every importer is
//                                                                    rewritten in the same pass)
//                                   → export = value               (otherwise: same runtime shape)
//
// `export default` compiles to `exports.default`, so it is used only for modules whose every
// importer is a CommonJS file with a plain top-level require that this codemod rewrites too.
// A module imported by an ES module, required dynamically, or required lazily keeps its shape.
import { builtinModules } from "node:module";
import { isJsSource } from "./shared.js";

export const parser = "babel";
export const include = (path) => isJsSource(path) && !path.endsWith(".mjs");

const BUILTINS = new Set([...builtinModules, ...builtinModules.map((name) => `node:${name}`)]);
/** Packages verified to be plain `module.exports = value` CommonJS, so a default import is exact. */
const DEFAULT_IMPORT_SAFE = new Set(["express"]);

const isId = (node, name) => node?.type === "Identifier" && (name === undefined || node.name === name);
const isModuleExports = (node) => node?.type === "MemberExpression" && !node.computed && isId(node.object, "module") && isId(node.property, "exports");

/** The literal module name of a `require("name")` call, or undefined. */
function requireSpecifier(node) {
  if (node?.type !== "CallExpression" || !isId(node.callee, "require") || node.arguments.length !== 1) return undefined;
  const [arg] = node.arguments;
  return arg.type === "StringLiteral" || (arg.type === "Literal" && typeof arg.value === "string") ? arg.value : undefined;
}

/** `const <id> = require("name")` as a top-level statement → { id, specifier }. */
function topLevelRequire(statement) {
  if (statement.type !== "VariableDeclaration" || statement.declarations.length !== 1) return undefined;
  const [declarator] = statement.declarations;
  const specifier = requireSpecifier(declarator.init);
  return specifier === undefined ? undefined : { id: declarator.id, specifier };
}

function topLevelBindings(program) {
  const names = new Set();
  for (const statement of program.body) {
    if (statement.type === "VariableDeclaration") {
      for (const d of statement.declarations) if (isId(d.id)) names.add(d.id.name);
    } else if ((statement.type === "FunctionDeclaration" || statement.type === "ClassDeclaration") && statement.id) {
      names.add(statement.id.name);
    }
  }
  return names;
}

/**
 * How a CommonJS file exports:
 *   none  — it exports nothing
 *   named — individual names:  { kind, statements: [{ statement, exported, local? , value? }] }
 *   value — one value:         { kind, statement, value }
 *   bail  — anything the codemod will not rewrite (conditional, repeated or read-back exports)
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
  if (whole.length === 0 && props.length === 0) {
    const used = root.find(j.Identifier, { name: "exports" }).size() > 0;
    return { kind: used ? "bail" : "none" };
  }

  // Every mention of module.exports / exports must be one of the statements found above.
  const moduleExportsUses = root.find(j.MemberExpression).filter((p) => isModuleExports(p.node)).size();
  const bareExportsUses = root
    .find(j.Identifier, { name: "exports" })
    .filter((p) => !(p.parent.node.type === "MemberExpression" && p.parent.node.property === p.node && !p.parent.node.computed))
    .size();
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

const decisions = new WeakMap();

/** inventory → Map(path → "default" | "assign"), so every file sees the same decision for a module. */
function decisionCache(inventory) {
  let cache = decisions.get(inventory);
  if (cache === undefined) decisions.set(inventory, (cache = new Map()));
  return cache;
}

/**
 * May `module.exports = value` in `target` become `export default value`?
 * Only if every importer will be rewritten to a default import by this codemod.
 */
function defaultExportIsSafe(j, target, options) {
  const cache = decisionCache(options.inventory);
  if (cache.has(target)) return cache.get(target);
  const importers = options.inventory.files.filter((f) => f.imports.some((i) => i.resolved === target));
  let safe = importers.length > 0;
  for (const importer of importers) {
    if (!safe) break;
    const uses = importer.imports.filter((i) => i.resolved === target);
    if (importer.format === "esm" || !include(importer.path) || uses.some((i) => i.kind !== "require")) {
      safe = false;
      break;
    }
    try {
      const root = j(options.read(importer.path) ?? "");
      const specifiers = new Set(uses.map((i) => i.specifier));
      const all = root.find(j.CallExpression).filter((p) => specifiers.has(requireSpecifier(p.node))).size();
      const plain = root.get().node.program.body.filter((s) => {
        const found = topLevelRequire(s);
        return found !== undefined && specifiers.has(found.specifier) && isId(found.id);
      }).length;
      // An importer that is itself left as CommonJS keeps its require() calls.
      if (all !== plain || (all > 0 && analyzeExports(j, root).kind === "bail")) safe = false;
    } catch {
      safe = false;
    }
  }
  cache.set(target, safe);
  return safe;
}

/** The export style of a local module, whether or not this codemod has already rewritten it. */
function styleOf(j, target, options) {
  if (target.endsWith(".json")) return "default";
  const file = options.inventory.files.find((f) => f.path === target);
  if (file === undefined || !include(target) || file.format === "esm") return "cjs";
  const source = options.read(target) ?? "";
  if (/^export = /m.test(source)) return "assign";
  if (/^export default /m.test(source)) return "default";
  if (/^export /m.test(source)) return "named";
  let exported;
  try {
    exported = analyzeExports(j, j(source));
  } catch {
    return "cjs";
  }
  if (exported.kind === "named") return "named";
  if (exported.kind === "value") return defaultExportIsSafe(j, target, options) ? "default" : "assign";
  return "cjs";
}

const simplePattern = (id) =>
  id.type === "ObjectPattern" && id.properties.every((p) => (p.type === "ObjectProperty" || p.type === "Property") && !p.computed && isId(p.key) && isId(p.value));

export default function transform(file, api, options) {
  const j = api.jscodeshift;
  const root = j(file.source);
  const program = root.get().node.program;
  if (program.body.some((s) => s.type.startsWith("Import") || s.type.startsWith("Export"))) return undefined;

  const exported = analyzeExports(j, root);
  if (exported.kind === "bail") {
    options.note(`${file.path}: module.exports/exports is assigned conditionally, more than once, or read back; the file was left as CommonJS`);
    return undefined;
  }

  const imports = options.inventory.files.find((f) => f.path === options.originalPath)?.imports ?? [];
  const replacements = new Map();
  const string = (value) => j.stringLiteral(value);
  const importOf = (specifiers, specifier) => j.importDeclaration(specifiers, string(specifier));
  const importEquals = (name, specifier) => j.tsImportEqualsDeclaration(j.identifier(name), j.tsExternalModuleReference(string(specifier)));
  const namedImports = (pattern, specifier) =>
    importOf(pattern.properties.map((p) => j.importSpecifier(j.identifier(p.key.name), j.identifier(p.value.name))), specifier);

  for (const statement of program.body) {
    if (statement.type === "ExpressionStatement") {
      const specifier = requireSpecifier(statement.expression);
      if (specifier !== undefined) replacements.set(statement, importOf([], specifier));
      continue;
    }
    const found = topLevelRequire(statement);
    if (found === undefined) continue;
    const { id, specifier } = found;
    const local = specifier.startsWith(".");
    const target = imports.find((i) => i.specifier === specifier && i.kind === "require")?.resolved;
    if (local && target === undefined) {
      options.note(`${file.path}: require("${specifier}") does not resolve to a project file; left unchanged`);
      continue;
    }
    const style = local ? styleOf(j, target, options) : BUILTINS.has(specifier) || DEFAULT_IMPORT_SAFE.has(specifier) ? "default" : "assign";

    if (isId(id)) {
      if (style === "default") replacements.set(statement, importOf([j.importDefaultSpecifier(j.identifier(id.name))], specifier));
      else if (style === "named") replacements.set(statement, importOf([j.importNamespaceSpecifier(j.identifier(id.name))], specifier));
      else if (style === "assign") replacements.set(statement, importEquals(id.name, specifier));
      else options.note(`${file.path}: require("${specifier}") left unchanged because ${target} stays CommonJS`);
    } else if (simplePattern(id) && (!local || style === "named")) {
      replacements.set(statement, namedImports(id, specifier));
    } else {
      options.note(`${file.path}: destructured require("${specifier}") left unchanged (it does not map onto named imports)`);
    }
  }

  if (exported.kind === "value") {
    const useDefault = defaultExportIsSafe(j, options.originalPath, options);
    replacements.set(exported.statement, useDefault ? j.exportDefaultDeclaration(exported.value) : j.tsExportAssignment(exported.value));
    if (!useDefault && options.inventory.files.some((f) => f.risk.reasons.some((r) => r.startsWith("dynamic require")))) {
      const importedStatically = options.inventory.files.some((f) => f.imports.some((i) => i.resolved === options.originalPath));
      if (!importedStatically) options.note(`${file.path}: kept its CommonJS export shape (\`export =\`) because nothing imports it statically and the project uses dynamic require()`);
    }
  } else if (exported.kind === "named") {
    for (const { statement, specifiers, declare, value } of exported.statements) {
      replacements.set(
        statement,
        declare === undefined
          ? j.exportNamedDeclaration(null, specifiers.map((s) => j.exportSpecifier.from({ local: j.identifier(s.local), exported: j.identifier(s.exported) })))
          : j.exportNamedDeclaration(j.variableDeclaration("const", [j.variableDeclarator(j.identifier(declare), value)])),
      );
    }
  }

  if (replacements.size === 0) return undefined;
  program.body = program.body.map((statement) => {
    const replacement = replacements.get(statement);
    if (replacement === undefined) return statement;
    replacement.comments = statement.comments;
    return replacement;
  });
  const single = (file.source.match(/require\('/g) ?? []).length >= (file.source.match(/require\("/g) ?? []).length;
  return root.toSource({ quote: single ? "single" : "double" });
}
