import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

/** Everything the engine writes into a target project lives here, except MIGRATION_REPORT.md. */
export const ARTIFACT_DIR = ".fm";

export const artifactPath = (root: string, ...parts: string[]): string => join(root, ARTIFACT_DIR, ...parts);

export function writeText(path: string, text: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
}

export const writeJson = (path: string, value: unknown): void => writeText(path, `${JSON.stringify(value, null, 2)}\n`);

export function readJson<T>(path: string): T | undefined {
  return existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as T) : undefined;
}
