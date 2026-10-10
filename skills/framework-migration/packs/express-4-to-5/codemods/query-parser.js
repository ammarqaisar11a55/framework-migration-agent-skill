// Stage "preserve-defaults": Express 5 changed the default query parser from "extended" (qs:
// ?a[b]=1 → { a: { b: '1' } }) to "simple" (node:querystring: { 'a[b]': '1' }). Each app created
// with express() gets `app.set('query parser', 'extended')` on the line after it, which is what it
// did on Express 4 and is valid on both. Files that already set a query parser are left alone.
//
// Dropping the setting later, if nothing reads nested query parameters, is a behaviour decision for
// the project, not part of the migration.
const SETTING = "query parser";

export default function transform(file, api) {
  const j = api.jscodeshift;
  const source = file.source;
  const root = j(source);
  if (root.find(j.CallExpression, { callee: { property: { name: "set" } }, arguments: [{ value: SETTING }] }).size() > 0) return undefined;

  // Local names bound to the express package: require('express') or import express from 'express'.
  const names = new Set();
  root.find(j.VariableDeclarator, { init: { type: "CallExpression", callee: { name: "require" } } }).forEach((path) => {
    const [arg] = path.node.init.arguments;
    if (arg?.value === "express" && path.node.id.type === "Identifier") names.add(path.node.id.name);
  });
  root.find(j.ImportDeclaration, { source: { value: "express" } }).forEach((path) => {
    for (const s of path.node.specifiers ?? []) if (s.type === "ImportDefaultSpecifier") names.add(s.local.name);
  });
  if (names.size === 0) return undefined;

  const single = (source.match(/'/g) ?? []).length >= (source.match(/"/g) ?? []).length;
  const quote = (text) => (single ? `'${text}'` : `"${text}"`);
  // Follow the file's semicolon style, judged by the line that creates the app.
  const appLine = source.split("\n").find((line) => /\(\s*\)\s*;?\s*$/.test(line) && [...names].some((name) => line.includes(`${name}(`)));
  const semicolon = appLine === undefined || /;\s*$/.test(appLine) ? ";" : "";
  const edits = [];
  root.find(j.VariableDeclaration).forEach((path) => {
    const parent = path.parent.node.type;
    if (parent !== "Program" && parent !== "BlockStatement") return;
    const declarator = path.node.declarations.find(
      (d) => d.id.type === "Identifier" && d.init?.type === "CallExpression" && d.init.callee.type === "Identifier" && names.has(d.init.callee.name) && d.init.arguments.length === 0,
    );
    if (declarator === undefined) return;
    const lineStart = source.lastIndexOf("\n", path.node.start) + 1;
    const indent = /^\s*/.exec(source.slice(lineStart, path.node.start))[0];
    edits.push({ at: path.node.end, text: `\n${indent}${declarator.id.name}.set(${quote(SETTING)}, ${quote("extended")})${semicolon}` });
  });
  if (edits.length === 0) return undefined;
  let out = source;
  for (const edit of edits.sort((a, b) => b.at - a.at)) out = out.slice(0, edit.at) + edit.text + out.slice(edit.at);
  return out;
}
