// Stage "rename-and-modules", second step: renames JavaScript sources to their TypeScript
// extensions. Relative import specifiers are left alone: extensionless ones still resolve, and
// TypeScript maps "./x.js" / "./x.mjs" specifiers to x.ts / x.mts.
import { isJsSource } from "./shared.js";

const EXTENSIONS = { ".js": ".ts", ".jsx": ".tsx", ".mjs": ".mts", ".cjs": ".cts" };

export const include = isJsSource;

export function rename(path) {
  const ext = path.slice(path.lastIndexOf("."));
  return path.slice(0, -ext.length) + EXTENSIONS[ext];
}
