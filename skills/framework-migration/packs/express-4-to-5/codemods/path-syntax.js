// Stage "upgrade": rewrites route path strings to the Express 5 syntax (path-to-regexp 8).
//
//   '/users/:id?'      → '/users{/:id}'       optional parameter: the separator before it is optional too
//   '/:file.:ext?'     → '/:file{.:ext}'
//   '*', '/*'          → '/{*splat}'          unnamed wildcard: named, and optional like Express 4's (.*)
//   '/files/*'         → '/files/{*splat}'
//
// Only string literals passed as the path to app/router routing methods are rewritten. A path is
// left as it is, with a note, when:
//   - it uses regular-expression syntax Express 5 rejects ( ( ) [ ] + ! or a ? that is not an
//     optional parameter); rule route-reserved-chars reports it;
//   - it has an unnamed wildcard and any source file reads req.params by index (req.params[0]):
//     Express 5 names the wildcard and makes its value an array, so those reads must be changed by
//     hand (rule req-params-index). Handlers often live in other modules, so the check covers the
//     whole project.
const ROUTE_METHODS = new Set(["get", "post", "put", "patch", "delete", "del", "all", "options", "head", "use", "route"]);
const RESERVED = /[()[\]+!]/;
const OPTIONAL = /([/.]?):([A-Za-z_$][\w$]*)\?/g;
const WILDCARD = /\*(?![A-Za-z_$])/g;
const READS_PARAMS_BY_INDEX = /\bparams\s*\[\s*['"]?\d/;

const isString = (node) => (node.type === "StringLiteral" || node.type === "Literal") && typeof node.value === "string";

/** The Express 5 form of an Express 4 path, or a reason it cannot be converted. */
export function convertPath(path, { readsParamsByIndex = false } = {}) {
  if (RESERVED.test(path)) return { reason: "uses regular-expression characters Express 5 rejects" };
  let next = path.replace(OPTIONAL, (_m, prefix, name) => `{${prefix}:${name}}`);
  if (next.includes("?")) return { reason: "uses ? outside an optional parameter" };
  if (WILDCARD.test(next)) {
    if (readsParamsByIndex) return { reason: "has an unnamed wildcard, and the project reads req.params by index" };
    let count = 0;
    next = next.replace(WILDCARD, () => `{*splat${++count === 1 ? "" : count}}`);
    if (next.startsWith("{")) next = `/${next}`;
  }
  return { path: next };
}

const SOURCE = /\.(?:[cm]?[jt]s|[jt]sx)$/;

export default function transform(file, api, options) {
  const j = api.jscodeshift;
  const root = j(file.source);
  const readsParamsByIndex = options.inventory.files.some((f) => SOURCE.test(f.path) && READS_PARAMS_BY_INDEX.test(options.read(f.path) ?? ""));
  let changed = false;

  root.find(j.CallExpression).forEach((call) => {
    const { callee, arguments: args } = call.node;
    if (callee.type !== "MemberExpression" || callee.computed || callee.property.type !== "Identifier") return;
    const method = callee.property.name;
    if (!ROUTE_METHODS.has(method)) return;
    // app.get('setting') reads a setting; a route needs a handler. route() and use() differ.
    if (method === "route" ? args.length !== 1 : method !== "use" && args.length < 2) return;
    const first = args[0];
    if (first === undefined) return;
    const strings = first.type === "ArrayExpression" ? first.elements.filter((e) => e && isString(e)) : isString(first) ? [first] : [];
    for (const node of strings) {
      const result = convertPath(node.value, { readsParamsByIndex });
      if (result.path === undefined) {
        const line = node.loc?.start.line ?? "?";
        options.note(`${file.path}:${line}: route path ${JSON.stringify(node.value)} left unchanged: it ${result.reason}`);
        continue;
      }
      if (result.path === node.value) continue;
      node.value = result.path;
      if (node.extra) node.extra = undefined;
      changed = true;
    }
  });
  if (!changed) return undefined;
  const single = (file.source.match(/'/g) ?? []).length >= (file.source.match(/"/g) ?? []).length;
  return root.toSource({ quote: single ? "single" : "double" });
}
