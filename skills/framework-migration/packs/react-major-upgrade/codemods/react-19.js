// Stage "react-19": React and its lockstep packages to the React 19 release pinned in pack.yaml.
import { bump } from "./versions.js";

export const include = (path) => path === "package.json";

export default function transform(file, _api, options) {
  const pinned = Object.fromEntries(options.pack.tools.filter((t) => t.role === "dependency" || t.role === "devDependency").map((t) => [t.name, t.version]));
  return bump(file, (name) => pinned[name], (m) => options.note(m));
}
