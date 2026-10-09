import { readFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import esquery from "esquery";
import { adapterFor } from "./adapters.ts";
import { JS_EXTENSIONS, parseSource, visitorKeys, type Node } from "./ast.ts";
import { loadRules } from "./pack.ts";
import { walk } from "./paths.ts";
import type { Finding, FindingsFile, Pack, Rule } from "./types.ts";

// @types/esquery lags the library (no options argument) and is typed against @types/estree;
// our Node is the same shape, parsed by Babel's estree plugin.
const query = esquery as unknown as (ast: Node, selector: string, options: { visitorKeys: Record<string, string[]> }) => Node[];

type Hit = { line: number; column: number };

function regexHits(rule: Extract<Rule["matcher"], { type: "regex" }>, lines: string[]): Hit[] {
  const regex = new RegExp(rule.pattern, `g${(rule.flags ?? "").replace("g", "")}`);
  const hits: Hit[] = [];
  lines.forEach((text, index) => {
    for (const match of text.matchAll(regex)) hits.push({ line: index + 1, column: match.index + 1 });
  });
  return hits;
}

function astHits(selector: string, program: Node): Hit[] {
  const nodes = query(program, selector, { visitorKeys: visitorKeys(program) });
  return nodes.flatMap((node) => (node.loc ? [{ line: node.loc.start.line, column: node.loc.start.column + 1 }] : []));
}

/** Runs rules over one file's source. Exported for unit tests and for codemods that need a rule's hits. */
export function matchRules(rules: readonly Rule[], path: string, source: string, defaultExtensions: readonly string[]): Finding[] {
  const ext = extname(path);
  const lines = source.split(/\r?\n/);
  const findings: Finding[] = [];
  let program: Node | undefined | null;
  for (const rule of rules) {
    if (!(rule.extensions ?? defaultExtensions).includes(ext)) continue;
    if (rule.exclude?.some((pattern) => new RegExp(pattern).test(path))) continue;
    let hits: Hit[];
    if (rule.matcher.type === "regex") {
      hits = regexHits(rule.matcher, lines);
    } else {
      if (!JS_EXTENSIONS.includes(ext)) continue;
      if (program === undefined) {
        try {
          program = parseSource(source, path);
        } catch {
          program = null;
        }
      }
      if (program === null) continue;
      hits = astHits(rule.matcher.selector, program);
    }
    for (const hit of hits) {
      findings.push({
        rule: rule.id,
        severity: rule.severity,
        auto_fixable: rule.auto_fixable,
        file: path,
        line: hit.line,
        column: hit.column,
        excerpt: (lines[hit.line - 1] ?? "").trim().slice(0, 200),
        fix_hint: rule.fix_hint,
        docs_url: rule.docs_url,
      });
    }
  }
  return findings;
}

/** Runs a pack's rule file over every source file of the project. */
export function detect(rootDir: string, pack: Pack, rules: readonly Rule[] = loadRules(pack)): FindingsFile {
  const root = resolve(rootDir);
  const defaults = Object.keys(adapterFor(pack.ecosystem).languages);
  const wanted = new Set([...defaults, ...rules.flatMap((r) => r.extensions ?? [])]);
  const findings = walk(root)
    .filter((path) => wanted.has(extname(path)))
    .flatMap((path) => matchRules(rules, path, readFileSync(join(root, path), "utf8"), defaults));
  findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.column - b.column || a.rule.localeCompare(b.rule));
  return { pack: pack.id, findings };
}
