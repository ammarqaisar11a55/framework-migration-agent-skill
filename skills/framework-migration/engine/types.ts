export const ECOSYSTEMS = ["node", "python", "jvm", "dotnet", "php", "ruby", "dart", "go"] as const;
export type Ecosystem = (typeof ECOSYSTEMS)[number];

export type Severity = "info" | "warn" | "error";

export interface StackRef {
  framework: string;
  language?: string;
  versions: string;
  /** Node packs: the package.json "type" the project must have. */
  module_type?: "commonjs" | "module";
}

export interface PackTool {
  name: string;
  version: string;
  role?: "dependency" | "devDependency" | "engine";
  /** Repository a tool run from source is fetched from. */
  source?: string;
  /** Commit of `source` the pack was verified with. */
  ref?: string;
}

export type StageCommand = string | { run: string; dry_run: string };

export interface PackStage {
  id: string;
  title?: string;
  codemods?: string[];
  commands?: StageCommand[];
  post_commands?: StageCommand[];
  fix_rules?: boolean;
}

export type CheckName = "typecheck" | "test" | "lint" | "smoke";

export interface SmokeProbe {
  start: string;
  url: string;
  timeout_ms?: number;
}

export interface PackChecks {
  typecheck?: string;
  test?: string;
  lint?: string;
  smoke?: string | SmokeProbe;
}

export interface PackManifest {
  id: string;
  title: string;
  ecosystem: Ecosystem;
  tier: 1 | 2 | 3;
  status: "planned" | "in progress" | "shipped";
  from: StackRef;
  to: StackRef;
  tools: PackTool[];
  stages: PackStage[];
  checks: PackChecks;
}

export interface Pack extends PackManifest {
  /** Absolute path of the pack directory. */
  dir: string;
}

export type Matcher = { type: "regex"; pattern: string; flags?: string } | { type: "ast"; selector: string };

export interface Rule {
  id: string;
  description: string;
  matcher: Matcher;
  extensions?: string[];
  /** Regular expressions over the project-relative path; matching files are skipped. */
  exclude?: string[];
  /** Node: skip .cjs files and files under a nested package.json with "type": "commonjs". */
  skip_explicit_commonjs?: boolean;
  severity: Severity;
  auto_fixable: boolean;
  fix_hint: string;
  docs_url: string;
}

export interface Finding {
  rule: string;
  severity: Severity;
  auto_fixable: boolean;
  file: string;
  line: number;
  column: number;
  excerpt: string;
  fix_hint: string;
  docs_url: string;
}

export interface FindingsFile {
  pack: string;
  findings: Finding[];
}

export interface Framework {
  name: string;
  version: string;
}

export interface Stack {
  ecosystem: Ecosystem;
  manifest: string;
  language: string;
  runtime?: string;
  moduleType?: "commonjs" | "module";
  frameworks: Framework[];
}

export type ImportKind = "require" | "import" | "dynamic-import" | "export-from";

export interface FileImport {
  specifier: string;
  kind: ImportKind;
  resolved?: string;
}

export interface Risk {
  score: number;
  level: "low" | "medium" | "high";
  reasons: string[];
}

export interface InventoryFile {
  path: string;
  language: string;
  format?: "cjs" | "esm";
  loc: number;
  imports: FileImport[];
  importedBy: string[];
  risk: Risk;
}

export interface Inventory {
  root: string;
  stacks: Stack[];
  files: InventoryFile[];
  entryPoints: string[];
  order: string[];
}
