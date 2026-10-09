// A codemod is an ES module with the jscodeshift transform signature as its default export.
// Return the new source, or undefined to leave the file unchanged.
//
// Optional named exports the engine understands:
//   parser      — "babel" (default), "ts", "tsx" or "flow"; passed to jscodeshift.withParser()
//   include     — (path) => boolean; which project files the transform runs on
//   rename      — (path, context) => new path, for codemods that move files
//   createFiles — (context) => ({ [path]: content }) for files the migration adds
//
// options.pack is the parsed pack.yaml and options.inventory the project inventory.

export const include = (path) => path.endsWith(".js");

export default function transform(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);
  const calls = root.find(j.CallExpression, { callee: { type: "Identifier", name: "oldApi" } });
  if (calls.size() === 0) return undefined;
  calls.forEach((path) => {
    path.node.callee.name = "newApi";
  });
  return root.toSource();
}
