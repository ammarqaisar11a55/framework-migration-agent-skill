// Helpers shared by this pack's codemods. Not a codemod itself (no stage lists it).

export const OUT_DIR = "dist";

/** Tool configuration files stay JavaScript: they are loaded by tools, not by the app. */
const CONFIG_FILE = /(^|\/)(\.[^/]+|[^/]+\.config\.[cm]?js)$/;
const JS_SOURCE = /\.(?:[cm]?js|jsx)$/;

export const isJsSource = (path) => JS_SOURCE.test(path) && !CONFIG_FILE.test(path);

/** JavaScript sources of the project, as recorded by the inventory. */
export const jsSources = (inventory) => inventory.files.map((f) => f.path).filter(isJsSource);

/** Top-level directories and root-level files that hold sources: the tsconfig `include` list. */
export function sourceRoots(paths) {
  const dirs = new Set();
  const files = new Set();
  for (const path of paths) {
    const slash = path.indexOf("/");
    if (slash === -1) files.add(path);
    else dirs.add(path.slice(0, slash));
  }
  return [...[...dirs].sort(), ...[...files].sort()];
}

/** Parses a JSON config file, failing with a message the migration report can show. */
export function parseJsonFile(file) {
  try {
    return JSON.parse(file.source);
  } catch (error) {
    throw new Error(`${file.path} is not plain JSON (${error.message}); edit it by hand`, { cause: error });
  }
}

export const formatJson = (value, source) => {
  const indent = /^([ \t]+)"/m.exec(source)?.[1] ?? "  ";
  return `${JSON.stringify(value, null, indent)}\n`;
};
