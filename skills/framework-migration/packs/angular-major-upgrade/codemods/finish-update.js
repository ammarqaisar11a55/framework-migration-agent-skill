// Stage "angular-22", after ng update: repairs a conflict between two of Angular 22.2's migrations.
//
// For a project that never set strictTemplates, `strict-templates-default` adds
// `"strictTemplates": false` (22 turns it on by default), and `strict-safe-navigation-narrow` adds an
// `extendedDiagnostics` block that suppresses nullishCoalescingNotNullable and
// optionalChainNotNullable. Together they do not compile: "NG4003: Angular compiler option
// "extendedDiagnostics" is configured, however "strictTemplates" is disabled." Extended diagnostics
// only run with strictTemplates, so the block has no effect there; where strictTemplates is false,
// the exact block the migration writes is removed. Anywhere else the file is left alone.

export const include = (path) => /(^|\/)tsconfig[\w.-]*\.json$/.test(path);

const BLOCK =
  /"extendedDiagnostics"\s*:\s*\{\s*"checks"\s*:\s*\{\s*"nullishCoalescingNotNullable"\s*:\s*"suppress"\s*,\s*"optionalChainNotNullable"\s*:\s*"suppress"\s*\}\s*\}/;
const STRICT = /"strictTemplates"\s*:\s*(true|false)\b/;

/** The file's own strictTemplates setting, else the root tsconfig.json's (what `extends` usually reaches). */
const strictTemplates = (source, options) => (STRICT.exec(source) ?? STRICT.exec(options.read("tsconfig.json") ?? ""))?.[1];

export default function transform(file, _api, options) {
  if (!BLOCK.test(file.source) || strictTemplates(file.source, options) !== "false") return undefined;
  // Remove the property with the comma that separates it from its neighbour.
  const out = file.source
    .replace(new RegExp(`${BLOCK.source}\\s*,\\s*`), "")
    .replace(new RegExp(`,\\s*${BLOCK.source}`), "")
    .replace(new RegExp(`\\s*${BLOCK.source}`), "");
  options.note(`${file.path}: removed the extendedDiagnostics block ng update added, which does not compile with strictTemplates: false (NG4003)`);
  return out;
}
