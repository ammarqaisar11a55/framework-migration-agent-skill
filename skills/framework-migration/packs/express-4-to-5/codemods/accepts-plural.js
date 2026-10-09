// Stage "api-codemods": req.acceptsCharset / acceptsEncoding / acceptsLanguage → the plural forms,
// which Express 4 already had and which take the same arguments. Express 5 removed the singular
// ones.
//
// The official pluralize-method-names codemod only rewrites calls with zero or one argument, so
// `req.acceptsLanguage('en', 'fr')` would survive it and throw on Express 5. This covers any arity.
const PLURAL = { acceptsCharset: "acceptsCharsets", acceptsEncoding: "acceptsEncodings", acceptsLanguage: "acceptsLanguages" };

export default function transform(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);
  let changed = false;
  root.find(j.CallExpression, { callee: { type: "MemberExpression", computed: false } }).forEach((call) => {
    const property = call.node.callee.property;
    if (property.type !== "Identifier" || !Object.hasOwn(PLURAL, property.name)) return;
    call.node.callee.property = j.identifier(PLURAL[property.name]);
    changed = true;
  });
  return changed ? root.toSource() : undefined;
}
