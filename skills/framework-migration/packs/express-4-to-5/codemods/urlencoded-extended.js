// Stage "preserve-defaults": Express 5's urlencoded parser (body-parser 2) defaults `extended` to
// false; Express 4's defaulted it to true, parsing `a[b]=1` into { a: { b: '1' } }. Calls that do
// not set it get `extended: true`, which is what they did on Express 4 and is valid on both.
//
//   express.urlencoded()                 → express.urlencoded({ extended: true })
//   bodyParser.urlencoded({ limit })     → bodyParser.urlencoded({ limit, extended: true })
//
// An options argument that is not an object literal, or that uses a spread, is left alone with a
// note. Edits are made to the source text, so nothing else in the file is reprinted.
export default function transform(file, api, options) {
  const j = api.jscodeshift;
  const source = file.source;
  const edits = [];
  j(source)
    .find(j.CallExpression, { callee: { type: "MemberExpression", property: { name: "urlencoded" } } })
    .forEach((call) => {
      const [first] = call.node.arguments;
      const where = `${file.path}:${call.node.loc?.start.line ?? "?"}`;
      if (first === undefined) {
        // Before the closing parenthesis.
        edits.push({ at: call.node.end - 1, text: "{ extended: true }" });
      } else if (first.type === "ObjectExpression") {
        const props = first.properties;
        if (props.some((p) => p.type === "SpreadElement" || p.type === "SpreadProperty")) {
          options.note(`${where}: urlencoded() options use a spread; check that they set \`extended\``);
          return;
        }
        if (props.some((p) => (p.key?.name ?? p.key?.value) === "extended")) return;
        const last = props.at(-1);
        if (last === undefined) {
          edits.push({ at: first.start, end: first.end, text: "{ extended: true }" });
          return;
        }
        const between = source.slice(last.end, first.end - 1);
        const trailingComma = between.trimStart().startsWith(",");
        const after = trailingComma ? last.end + between.indexOf(",") + 1 : last.end;
        if (source.slice(first.start, first.end).includes("\n")) {
          const lineStart = source.lastIndexOf("\n", last.start) + 1;
          const indent = /^\s*/.exec(source.slice(lineStart, last.start))[0];
          edits.push({ at: after, text: trailingComma ? `\n${indent}extended: true,` : `,\n${indent}extended: true` });
        } else {
          edits.push({ at: after, text: trailingComma ? " extended: true," : ", extended: true" });
        }
      } else {
        options.note(`${where}: urlencoded() options are not an object literal; check that they set \`extended\``);
      }
    });
  if (edits.length === 0) return undefined;
  let out = source;
  for (const edit of edits.sort((a, b) => b.at - a.at)) out = out.slice(0, edit.at) + edit.text + out.slice(edit.end ?? edit.at);
  return out;
}
