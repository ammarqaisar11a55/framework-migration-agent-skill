import { readFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { ADAPTERS } from "./adapters.ts";
import { detectStack, projectView } from "./detect-stack.ts";
import { walk } from "./paths.ts";
import type { Inventory, InventoryFile, Risk } from "./types.ts";

const TEST_FILE = /(^|\/)(tests?|__tests__|spec)\/|\.(test|spec)\.[cm]?[jt]sx?$/;

export const isTestFile = (path: string): boolean => TEST_FILE.test(path);

function riskOf(points: [number, string][]): Risk {
  const score = points.reduce((sum, [p]) => sum + p, 0);
  return { score, level: score >= 5 ? "high" : score >= 2 ? "medium" : "low", reasons: points.map(([, reason]) => reason) };
}

/** Builds the migration inventory: stacks, source files, dependency graph, entry points, risk. */
export function buildInventory(rootDir: string): Inventory {
  const root = resolve(rootDir);
  const allFiles = walk(root);
  const project = projectView(root, allFiles);
  const stacks = detectStack(root, project);
  const active = ADAPTERS.filter((a) => stacks.some((s) => s.ecosystem === a.ecosystem));
  const adapters = active.length > 0 ? active : ADAPTERS;
  const fileSet = new Set(allFiles);

  const files = new Map<string, InventoryFile>();
  const points = new Map<string, [number, string][]>();
  for (const path of allFiles) {
    const adapter = adapters.find((a) => a.languages[extname(path)] !== undefined);
    if (adapter === undefined) continue;
    const source = readFileSync(join(root, path), "utf8");
    const analysis = adapter.analyze?.(path, source) ?? { imports: [], risks: [] };
    const loc = source.split("\n").filter((line) => line.trim() !== "").length;
    const risks = [...analysis.risks];
    if (loc > 800) risks.push([2, `large file (${loc} lines)`]);
    else if (loc > 300) risks.push([1, `long file (${loc} lines)`]);
    const file: InventoryFile = {
      path,
      language: adapter.languages[extname(path)] ?? "unknown",
      loc,
      imports: analysis.imports.map((imp) => {
        const resolved = adapter.resolve?.(path, imp.specifier, fileSet);
        return resolved === undefined ? imp : { ...imp, resolved };
      }),
      importedBy: [],
      risk: riskOf([]),
    };
    if (analysis.format !== undefined) file.format = analysis.format;
    files.set(path, file);
    points.set(path, risks);
  }

  for (const file of files.values()) {
    for (const imp of file.imports) {
      const target = imp.resolved === undefined ? undefined : files.get(imp.resolved);
      if (target !== undefined && !target.importedBy.includes(file.path)) target.importedBy.push(file.path);
    }
  }
  for (const file of files.values()) {
    file.importedBy.sort();
    const risks = points.get(file.path) ?? [];
    const fanIn = file.importedBy.length;
    if (fanIn >= 10) risks.push([2, `imported by ${fanIn} files`]);
    else if (fanIn >= 5) risks.push([1, `imported by ${fanIn} files`]);
    file.risk = riskOf(risks);
  }

  // Leaf → root: depth-first post-order, so every file comes after the local files it imports.
  const order: string[] = [];
  const seen = new Set<string>();
  const visit = (path: string): void => {
    if (seen.has(path)) return;
    seen.add(path);
    for (const imp of files.get(path)?.imports ?? []) {
      if (imp.resolved !== undefined && files.has(imp.resolved)) visit(imp.resolved);
    }
    order.push(path);
  };
  for (const path of files.keys()) visit(path);

  const entryPoints = [...new Set(adapters.flatMap((a) => a.entryPoints?.(project) ?? []))].sort();
  return { root, stacks, files: [...files.values()], entryPoints, order };
}
