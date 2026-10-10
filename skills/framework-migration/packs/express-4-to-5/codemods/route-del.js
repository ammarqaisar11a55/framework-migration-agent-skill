// Stage "api-codemods": app.del() / router.del() → .delete(). Express 4 deprecated .del() and
// Express 5 removed it.
//
// Replaces the official route-del-to-delete codemod, which renames every `.del(<string>, ...)` and
// so also breaks cache and Redis clients (`cache.del('key')`). This one renames only calls that look
// like route registrations: a path that starts with '/' or '*', a RegExp, or an array, followed by
// at least one handler. Rule app-del uses the same test.
const isRoutePath = (node) =>
  node !== undefined &&
  (node.type === "ArrayExpression" ||
    node.type === "RegExpLiteral" ||
    ((node.type === "StringLiteral" || node.type === "Literal") && (node.regex !== undefined || (typeof node.value === "string" && /^[/*]/.test(node.value)))));

export default function transform(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);
  let changed = false;
  root.find(j.CallExpression, { callee: { type: "MemberExpression", computed: false, property: { name: "del" } } }).forEach((call) => {
    const args = call.node.arguments;
    if (args.length < 2 || !isRoutePath(args[0])) return;
    call.node.callee.property = j.identifier("delete");
    changed = true;
  });
  return changed ? root.toSource() : undefined;
}
