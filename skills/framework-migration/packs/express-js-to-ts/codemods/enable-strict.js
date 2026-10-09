// Stage "strictness": turns on TypeScript's strict family of checks.
import { formatJson, parseJsonFile } from "./shared.js";

export const include = (path) => path === "tsconfig.json";

export default function transform(file) {
  const tsconfig = parseJsonFile(file);
  if (tsconfig.compilerOptions?.strict === true) return undefined;
  tsconfig.compilerOptions = { ...tsconfig.compilerOptions, strict: true };
  return formatJson(tsconfig, file.source);
}
