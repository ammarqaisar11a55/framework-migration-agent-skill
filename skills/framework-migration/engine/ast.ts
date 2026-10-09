import { parse, type ParserPlugin } from "@babel/parser";
import { extname } from "node:path";

/** Minimal ESTree node shape; the estree plugin makes Babel's output esquery-compatible. */
export interface Node {
  type: string;
  loc?: { start: { line: number; column: number }; end: { line: number; column: number } } | null;
  [key: string]: unknown;
}

export const JS_EXTENSIONS = [".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".mts", ".cts"];

/** Parses JS/TS into an ESTree-shaped Program. Throws SyntaxError on unrecoverable input. */
export function parseSource(source: string, path: string): Node {
  const ext = extname(path);
  const plugins: ParserPlugin[] = ["estree", "decorators"];
  if ([".ts", ".tsx", ".mts", ".cts"].includes(ext)) plugins.push("typescript");
  if ([".js", ".jsx", ".tsx"].includes(ext)) plugins.push("jsx");
  const file = parse(source, {
    sourceType: "unambiguous",
    allowReturnOutsideFunction: true,
    allowAwaitOutsideFunction: true,
    errorRecovery: true,
    plugins,
  });
  return file.program as unknown as Node;
}

const SKIPPED_KEYS = new Set(["loc", "range", "start", "end", "extra", "leadingComments", "trailingComments", "innerComments"]);

export const isNode = (value: unknown): value is Node =>
  typeof value === "object" && value !== null && typeof (value as Node).type === "string";

export function walkAst(node: Node, visit: (node: Node, parent: Node | undefined) => void, parent?: Node): void {
  visit(node, parent);
  for (const [key, value] of Object.entries(node)) {
    if (SKIPPED_KEYS.has(key)) continue;
    if (Array.isArray(value)) {
      for (const child of value) if (isNode(child)) walkAst(child, visit, node);
    } else if (isNode(value)) {
      walkAst(value, visit, node);
    }
  }
}
