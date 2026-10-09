// Stage "cleanup": removes the allowJs shim added by the tooling stage, once every source is TypeScript.
import { formatJson, jsSources, parseJsonFile } from "./shared.js";

export const include = (path) => path === "tsconfig.json";

export default function transform(file, _api, options) {
  const tsconfig = parseJsonFile(file);
  if (tsconfig.compilerOptions?.allowJs === undefined) return undefined;
  const remaining = jsSources(options.inventory);
  if (remaining.length > 0) {
    options.note(`allowJs kept: ${remaining.length} JavaScript source file(s) remain (${remaining.slice(0, 5).join(", ")}${remaining.length > 5 ? ", ..." : ""})`);
    return undefined;
  }
  delete tsconfig.compilerOptions.allowJs;
  return formatJson(tsconfig, file.source);
}
