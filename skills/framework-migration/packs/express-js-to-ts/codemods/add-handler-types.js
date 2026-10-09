// Stage "express-typing": annotates Express middleware and handlers that TypeScript cannot type
// from context. Functions passed directly to app.get(...), router.use(...) and friends are typed
// by Express's own declarations and are left alone.
//
//   function logger(req, res, next) {}        → (req: Request, res: Response, next: NextFunction)
//   function onError(err, req, res, next) {}  → (err: any, req: Request, ...)
//
// `err` is `any` because that is its type in Express's ErrorRequestHandler.

export const include = (path) => /\.(ts|tsx|mts|cts)$/.test(path) && !path.endsWith(".d.ts");

const REQ = /^_?(req|request)$/;
const RES = /^_?(res|response)$/;
const NEXT = /^_?next$/;
const ERR = /^_?(err|error|e)$/;
const SHAPES = [
  [[REQ, "Request"], [RES, "Response"]],
  [[REQ, "Request"], [RES, "Response"], [NEXT, "NextFunction"]],
  [[ERR, null], [REQ, "Request"], [RES, "Response"], [NEXT, "NextFunction"]],
];
const ROUTING_METHODS = new Set(["use", "all", "get", "post", "put", "patch", "delete", "options", "head", "param"]);

function shapeOf(params) {
  if (!params.every((p) => p.type === "Identifier" && !p.typeAnnotation)) return undefined;
  return SHAPES.find((shape) => shape.length === params.length && shape.every(([pattern], i) => pattern.test(params[i].name)));
}

/** True when the function is an argument of app.get(...)/router.use(...): typed from context. */
function typedByExpress(path) {
  const parent = path.parent.node;
  return (
    parent.type === "CallExpression" &&
    parent.arguments.includes(path.node) &&
    parent.callee.type === "MemberExpression" &&
    parent.callee.property.type === "Identifier" &&
    ROUTING_METHODS.has(parent.callee.property.name)
  );
}

export default function transform(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);
  const needed = new Set();

  root.find(j.Function).forEach((path) => {
    const shape = shapeOf(path.node.params);
    if (shape === undefined || typedByExpress(path)) return;
    path.node.params.forEach((param, i) => {
      const type = shape[i][1];
      param.typeAnnotation = j.tsTypeAnnotation(type === null ? j.tsAnyKeyword() : j.tsTypeReference(j.identifier(type)));
      if (type !== null) needed.add(type);
    });
  });
  if (needed.size === 0 && root.toSource() === file.source) return undefined;

  const typeImports = root.find(j.ImportDeclaration, { importKind: "type", source: { value: "express" } });
  const present = new Set();
  root.find(j.ImportDeclaration, { source: { value: "express" } }).forEach((path) => {
    for (const s of path.node.specifiers ?? []) if (s.type === "ImportSpecifier") present.add(s.local?.name ?? s.imported.name);
  });
  const missing = ["Request", "Response", "NextFunction"].filter((name) => needed.has(name) && !present.has(name));
  let atTop = false;
  if (missing.length > 0) {
    const specifiers = missing.map((name) => j.importSpecifier(j.identifier(name)));
    if (typeImports.size() > 0) {
      typeImports.get().node.specifiers.push(...specifiers);
    } else {
      const declaration = j.importDeclaration(specifiers, j.stringLiteral("express"), "type");
      const body = root.get().node.program.body;
      let index = 0;
      while (index < body.length && (body[index].type === "ImportDeclaration" || body[index].type === "TSImportEqualsDeclaration")) index++;
      if (index === 0 && body.length > 0) {
        // Keep a leading file comment at the top of the file.
        declaration.comments = body[0].comments;
        body[0].comments = null;
      }
      atTop = index === 0 && body.length > 0;
      body.splice(index, 0, declaration);
    }
  }
  const single = (file.source.match(/'/g) ?? []).length >= (file.source.match(/"/g) ?? []).length;
  const output = root.toSource({ quote: single ? "single" : "double" });
  // recast prints a new first statement flush against the code below it; separate them.
  return atTop ? output.replace(/^(import type \{[^}]*\} from ['"]express['"];)\n(?!\n)/m, "$1\n\n") : output;
}
