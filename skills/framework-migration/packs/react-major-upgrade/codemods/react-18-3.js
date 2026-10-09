// Stage "react-18-3": React 18.3 is React 18.2 plus warnings for every API React 19 removes, and it
// already has the APIs the React 19 codemods move to (createRoot, React.act, callback refs). The
// upgrade guide recommends upgrading to it first. React 17 and 18 projects move to 18.3.1 here.
import { bump } from "./versions.js";

export const STEPPING_STONE = "18.3.1";
export const include = (path) => path === "package.json";

const TYPES_18 = { "@types/react": "18.3.31", "@types/react-dom": "18.3.7" };

export default function transform(file, _api, options) {
  return bump(file, (name) => TYPES_18[name] ?? (name.startsWith("@types/") ? undefined : STEPPING_STONE), (m) => options.note(m));
}
