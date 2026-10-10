// Stage "codemods": React 19 ignores `defaultProps` on function components (class components keep
// them). The upgrade guide replaces them with ES default parameters:
//
//   function Badge({ label, tone }) {...}            function Badge({ label = 'New', tone = 'info' }) {...}
//   Badge.defaultProps = { label: 'New', tone: 'info' };   →   (assignment removed)
//
// Converted only when the result behaves the same:
//   - the component is a function in the same file whose first parameter destructures props;
//   - every default is a literal or an identifier — an object, array or function literal would
//     become a new value on every render instead of one shared value, which changes memoisation;
//   - the pattern has no `...rest`, or every default is already destructured (adding a key would
//     remove it from `rest`).
// A default the component never destructures (and cannot see without `...rest`) is dropped.
// Anything else is left as it is, with a note; rule function-default-props reports it.
const SIMPLE = new Set(["StringLiteral", "NumericLiteral", "BooleanLiteral", "NullLiteral", "Literal", "Identifier"]);
const isSimple = (node) =>
  SIMPLE.has(node.type) ||
  (node.type === "TemplateLiteral" && node.expressions.length === 0) ||
  (node.type === "UnaryExpression" && node.operator === "-" && (node.argument.type === "NumericLiteral" || node.argument.type === "Literal"));
const keyName = (key) => (key.type === "Identifier" ? key.name : typeof key.value === "string" ? key.value : undefined);

export default function transform(file, api, options) {
  const j = api.jscodeshift;
  const root = j(file.source);
  const program = root.get().node.program;
  const functions = new Map();
  for (const s of program.body) {
    const decl = s.type === "ExportNamedDeclaration" || s.type === "ExportDefaultDeclaration" ? s.declaration : s;
    if (decl?.type === "FunctionDeclaration" && decl.id) functions.set(decl.id.name, decl);
    if (decl?.type === "VariableDeclaration") {
      for (const d of decl.declarations) {
        if (d.id.type === "Identifier" && (d.init?.type === "ArrowFunctionExpression" || d.init?.type === "FunctionExpression")) functions.set(d.id.name, d.init);
      }
    }
  }
  let changed = false;
  program.body = program.body.filter((s) => {
    const e = s.type === "ExpressionStatement" ? s.expression : undefined;
    if (e?.type !== "AssignmentExpression" || e.left.type !== "MemberExpression" || e.left.computed || e.left.property.name !== "defaultProps" || e.left.object.type !== "Identifier") return true;
    const name = e.left.object.name;
    const fn = functions.get(name);
    if (fn === undefined) return true; // a class, or defined elsewhere: React 19 still honours class defaultProps
    const why = (reason) => {
      options.note(`${file.path}: ${name}.defaultProps left unchanged (${reason}); React 19 ignores it on function components`);
      return true;
    };
    const pattern = fn.params[0];
    if (pattern?.type !== "ObjectPattern") return why("props are not destructured in the parameter list");
    if (e.right.type !== "ObjectExpression") return why("defaultProps is not an object literal");
    const entries = [];
    for (const p of e.right.properties) {
      if ((p.type !== "ObjectProperty" && p.type !== "Property") || p.computed || keyName(p.key) === undefined) return why("it uses spreads or computed keys");
      if (!isSimple(p.value)) return why(`the default for "${keyName(p.key)}" is not a literal or identifier and would be re-created on every render`);
      entries.push([keyName(p.key), p.value]);
    }
    const props = new Map();
    let rest = false;
    for (const p of pattern.properties) {
      if (p.type === "RestElement") rest = true;
      else if ((p.type === "ObjectProperty" || p.type === "Property") && !p.computed && keyName(p.key) !== undefined) props.set(keyName(p.key), p);
      else return why("the parameter pattern is not a plain list of names");
    }
    if (rest && entries.some(([key]) => !props.has(key))) return why("a default is not destructured and the pattern has ...rest");
    const targetOf = (prop) => (prop.value.type === "AssignmentPattern" ? prop.value.left : prop.value);
    const nested = entries.find(([key]) => props.has(key) && targetOf(props.get(key)).type !== "Identifier");
    if (nested !== undefined) return why(`"${nested[0]}" is destructured into a nested pattern`);
    for (const [key, value] of entries) {
      const prop = props.get(key);
      if (prop === undefined) continue; // invisible to the component
      const target = targetOf(prop);
      prop.value = j.assignmentPattern(target, value);
      prop.shorthand = target.name === key;
    }
    changed = true;
    return false;
  });
  if (!changed) return undefined;
  const single = (file.source.match(/'/g) ?? []).length >= (file.source.match(/"/g) ?? []).length;
  return root.toSource({ quote: single ? "single" : "double" });
}
