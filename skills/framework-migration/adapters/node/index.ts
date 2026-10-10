import { posix } from "node:path";
import { rootFiles, type Adapter, type FileAnalysis, type ProjectView } from "../../engine/adapter.ts";
import { JS_EXTENSIONS, parseSource, walkAst, type Node } from "../../engine/ast.ts";
import type { FileImport, Framework, Stack } from "../../engine/types.ts";

/** npm package → framework name used in pack.yaml `from.framework`. */
const FRAMEWORKS: Record<string, string> = {
  express: "express",
  fastify: "fastify",
  "@nestjs/core": "nest",
  react: "react",
  "react-dom": "react-dom",
  "react-scripts": "create-react-app",
  "react-native": "react-native",
  next: "next",
  "@angular/core": "angular",
  angular: "angularjs",
  vue: "vue",
  nuxt: "nuxt",
  svelte: "svelte",
  tailwindcss: "tailwind",
  redux: "redux",
  "@reduxjs/toolkit": "redux-toolkit",
  jest: "jest",
  vitest: "vitest",
  eslint: "eslint",
  webpack: "webpack",
  vite: "vite",
  moment: "moment",
  jquery: "jquery",
  backbone: "backbone",
  "ember-source": "ember",
  gatsby: "gatsby",
  typescript: "typescript",
};

interface PackageJson {
  type?: string;
  main?: string;
  bin?: string | Record<string, string>;
  scripts?: Record<string, string>;
  engines?: { node?: string };
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

function readPackageJson(project: ProjectView): PackageJson | undefined {
  const text = project.read("package.json");
  if (text === undefined) return undefined;
  try {
    return JSON.parse(text) as PackageJson;
  } catch {
    return undefined;
  }
}

function detect(project: ProjectView): Stack[] {
  const pkg = readPackageJson(project);
  if (pkg === undefined) return [];
  const deps = { ...pkg.peerDependencies, ...pkg.devDependencies, ...pkg.dependencies };
  const frameworks: Framework[] = [];
  for (const [name, version] of Object.entries(deps)) {
    const framework = FRAMEWORKS[name];
    if (framework !== undefined) frameworks.push({ name: framework, version });
  }
  // The runtime itself, for packs that migrate a Node project rather than a framework (CommonJS → ESM).
  frameworks.push({ name: "node", version: pkg.engines?.node ?? "*" });
  frameworks.sort((a, b) => a.name.localeCompare(b.name));
  const hasTsconfig = rootFiles(project, (f) => f === "tsconfig.json").length > 0;
  const stack: Stack = {
    ecosystem: "node",
    manifest: "package.json",
    language: hasTsconfig ? "typescript" : "javascript",
    moduleType: pkg.type === "module" ? "module" : "commonjs",
    frameworks,
  };
  if (pkg.engines?.node !== undefined) stack.runtime = `node ${pkg.engines.node}`;
  return [stack];
}

const BUILTIN_PROTOTYPES = new Set(["Object", "Array", "String", "Number", "Function", "Promise", "Date", "RegExp", "Error"]);

const literalString = (node: unknown): string | undefined => {
  const n = node as Node | undefined;
  return n?.type === "Literal" && typeof n["value"] === "string" ? n["value"] : undefined;
};

function memberChain(node: Node): string[] {
  const parts: string[] = [];
  let current: Node | undefined = node;
  while (current?.type === "MemberExpression") {
    const property = current["property"] as Node;
    parts.unshift(property.type === "Identifier" ? String(property["name"]) : "?");
    current = current["object"] as Node;
  }
  if (current?.type === "Identifier") parts.unshift(String(current["name"]));
  return parts;
}

function analyze(path: string, source: string): FileAnalysis {
  const ext = posix.extname(path);
  const imports: FileImport[] = [];
  const risks: [number, string][] = [];
  let program: Node;
  try {
    program = parseSource(source, path);
  } catch (error) {
    return { imports, risks: [[5, `does not parse (${(error as Error).message})`]] };
  }
  let esm = false;
  let cjs = false;
  const reasons = new Set<string>();
  const risk = (points: number, reason: string): void => {
    if (!reasons.has(reason)) risks.push([points, reason]);
    reasons.add(reason);
  };
  walkAst(program, (node) => {
    switch (node.type) {
      case "ImportDeclaration": {
        esm = true;
        const specifier = literalString(node["source"]);
        if (specifier !== undefined) imports.push({ specifier, kind: "import" });
        break;
      }
      case "ExportNamedDeclaration":
      case "ExportAllDeclaration":
      case "ExportDefaultDeclaration": {
        esm = true;
        const specifier = literalString(node["source"]);
        if (specifier !== undefined) imports.push({ specifier, kind: "export-from" });
        break;
      }
      case "ImportExpression": {
        const specifier = literalString(node["source"]);
        if (specifier !== undefined) imports.push({ specifier, kind: "dynamic-import" });
        else risk(5, "dynamic import() with a computed specifier");
        break;
      }
      case "CallExpression": {
        const callee = node["callee"] as Node;
        const args = node["arguments"] as Node[];
        if (callee.type === "Identifier" && callee["name"] === "require") {
          cjs = true;
          const specifier = literalString(args[0]);
          if (specifier !== undefined) imports.push({ specifier, kind: "require" });
          else risk(5, "dynamic require() with a computed specifier");
        } else if (callee.type === "Identifier" && callee["name"] === "eval") {
          risk(5, "eval()");
        }
        break;
      }
      case "NewExpression": {
        const callee = node["callee"] as Node;
        if (callee.type === "Identifier" && callee["name"] === "Function") risk(5, "new Function()");
        break;
      }
      case "AssignmentExpression": {
        const left = node["left"] as Node;
        if (left.type !== "MemberExpression") break;
        const chain = memberChain(left);
        if (chain[0] === "module" && chain[1] === "exports") cjs = true;
        if (chain[0] === "exports" && chain.length === 2) cjs = true;
        if (chain.length >= 3 && chain[1] === "prototype" && BUILTIN_PROTOTYPES.has(chain[0] ?? "")) {
          risk(5, `patches ${chain[0]}.prototype`);
        }
        if ((chain[0] === "global" || chain[0] === "globalThis") && chain.length === 2) risk(2, "assigns a global");
        break;
      }
    }
  });
  const analysis: FileAnalysis = { imports, risks };
  if (ext === ".mjs" || ext === ".mts") analysis.format = "esm";
  else if (ext === ".cjs" || ext === ".cts") analysis.format = "cjs";
  else if (esm) analysis.format = "esm";
  else if (cjs) analysis.format = "cjs";
  return analysis;
}

const RESOLVE_EXTENSIONS = [...JS_EXTENSIONS, ".json"];
/** TypeScript convention: a specifier names the emitted file, the source has the TS extension. */
const TS_SOURCE: Record<string, string[]> = { ".js": [".ts", ".tsx"], ".mjs": [".mts"], ".cjs": [".cts"] };

function resolve(importer: string, specifier: string, files: ReadonlySet<string>): string | undefined {
  if (!specifier.startsWith(".")) return undefined;
  const base = posix.normalize(posix.join(posix.dirname(importer), specifier));
  const candidates = [base];
  const ext = posix.extname(base);
  for (const tsExt of TS_SOURCE[ext] ?? []) candidates.push(base.slice(0, -ext.length) + tsExt);
  for (const e of RESOLVE_EXTENSIONS) candidates.push(base + e);
  for (const e of RESOLVE_EXTENSIONS) candidates.push(`${base}/index${e}`);
  return candidates.find((c) => files.has(c));
}

const SCRIPT_ENTRY = /\b(?:node|nodemon|ts-node|tsx)\s+(?:--?[\w-]+(?:=\S+)?\s+)*([\w./-]+\.[cm]?[jt]s)\b/;

function entryPoints(project: ProjectView): string[] {
  const pkg = readPackageJson(project);
  if (pkg === undefined) return [];
  const files = new Set(project.files);
  const found = new Set<string>();
  const add = (candidate: string | undefined): void => {
    if (candidate === undefined) return;
    const resolved = resolve("package.json", candidate.startsWith(".") ? candidate : `./${candidate}`, files);
    if (resolved !== undefined) found.add(resolved);
  };
  add(pkg.main);
  for (const bin of typeof pkg.bin === "string" ? [pkg.bin] : Object.values(pkg.bin ?? {})) add(bin);
  for (const name of ["start", "dev", "serve"]) add(SCRIPT_ENTRY.exec(pkg.scripts?.[name] ?? "")?.[1]);
  return [...found].sort();
}

export const nodeAdapter: Adapter = {
  ecosystem: "node",
  languages: {
    ".js": "javascript", ".jsx": "javascript", ".mjs": "javascript", ".cjs": "javascript",
    ".ts": "typescript", ".tsx": "typescript", ".mts": "typescript", ".cts": "typescript",
    ".vue": "vue", ".svelte": "svelte",
  },
  detect,
  analyze,
  resolve,
  entryPoints,
};
