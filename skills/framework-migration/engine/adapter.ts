import type { Ecosystem, FileImport, Stack } from "./types.ts";

/** What an adapter sees of the project while detecting the stack. */
export interface ProjectView {
  /** Project-relative paths of every file (ignored directories excluded). */
  files: readonly string[];
  /** File content, or undefined when the file does not exist. */
  read(path: string): string | undefined;
}

export interface FileAnalysis {
  format?: "cjs" | "esm";
  imports: FileImport[];
  /** Risk signals found in the file: [points, reason]. */
  risks: [number, string][];
}

/**
 * One adapter per ecosystem. The engine itself is ecosystem-agnostic: adapters parse manifests,
 * say which files are source code, and optionally analyse imports. Ecosystems whose migration tools
 * are external programs (OpenRewrite, Rector, libcst, dart fix, ...) run them through pack stage
 * `commands`, inside `image` when one is set.
 */
export interface Adapter {
  ecosystem: Ecosystem;
  /** Source file extension → language name. */
  languages: Readonly<Record<string, string>>;
  /** Container image providing the runtime for external tools; undefined runs them on the host. */
  image?: string;
  detect(project: ProjectView): Stack[];
  /** Import/format/risk analysis of one source file. Absent = no dependency graph for this ecosystem. */
  analyze?(path: string, source: string): FileAnalysis;
  /** Resolve an import specifier from `importer` to a project file. */
  resolve?(importer: string, specifier: string, files: ReadonlySet<string>): string | undefined;
  /** Entry points declared by manifests. */
  entryPoints?(project: ProjectView): string[];
  /**
   * Evals: the shell command that installs a fixture's dependencies in its directory with the
   * ecosystem's own tooling (Node fixtures use npm and need none).
   */
  install?: string;
  /** Project-relative directories whose executables checks and stage commands need first on PATH (a virtualenv's bin). */
  binDirs?: readonly string[];
}

/** Root-level manifest lookup helper shared by adapters. */
export const rootFiles = (project: ProjectView, test: (name: string) => boolean): string[] =>
  project.files.filter((f) => !f.includes("/") && test(f));
