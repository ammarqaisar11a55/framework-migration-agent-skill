// Stage "engines": the ES module output relies on Node.js 20.19.0 or newer:
//   - import.meta.dirname / import.meta.filename (added in 20.11.0),
//   - JSON modules without an experimental warning (20.18.3),
//   - require() of ES modules without a flag (20.19.0), which keeps CommonJS consumers of the
//     package working.
// package.json `engines.node` is raised to ">=20.19.0" when it allows anything older.
import semver from "semver";

export const MINIMUM = "20.19.0";
export const include = (path) => path === "package.json";

export default function transform(file, _api, options) {
  const pkg = JSON.parse(file.source);
  const current = pkg.engines?.node;
  const lowest = current === undefined || semver.validRange(current) === null ? null : semver.minVersion(current);
  if (lowest !== null && semver.gte(lowest, MINIMUM)) return undefined;
  if (current !== undefined) options.note(`engines.node was "${current}"; ES module output needs Node.js ${MINIMUM} or newer`);
  pkg.engines = { ...pkg.engines, node: `>=${MINIMUM}` };
  const indent = /^([ \t]+)"/m.exec(file.source)?.[1] ?? "  ";
  return `${JSON.stringify(pkg, null, indent)}\n`;
}
