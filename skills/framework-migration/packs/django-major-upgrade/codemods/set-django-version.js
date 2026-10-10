// Stage "django-5-2": pins Django to the version in pack.yaml wherever the project declares it.
//
//   requirements files  Django==4.2.30 / django>=4.2,<5.0 / Django~=4.2  →  Django==5.2.17
//                       (requirements*.txt / .in, and *.txt / *.in under requirements/)
//   pyproject.toml      [project] dependencies "Django>=4.2,<5"  →  "Django==5.2.17"
//                       [tool.poetry.dependencies] django = "^4.2"  →  django = "5.2.17"
// Extras and environment markers are kept. Other packages are left alone: one that does not
// support the new Django fails the install, and the gate reports it.

export const include = (path) => /(^|\/)requirements([\w.-]*\.(txt|in)|\/[\w.-]+\.(txt|in))$/.test(path) || path === "pyproject.toml";

const REQUIREMENT = /^(\s*)(django)(\[[^\]]*\])?\s*((?:[<>=!~]=?|===)\s*[^;#\s,]+(?:\s*,\s*(?:[<>=!~]=?|===)\s*[^;#\s,]+)*)?(\s*(?:;[^#\n]*)?(?:#.*)?)$/i;

function setRequirement(line, version) {
  const match = REQUIREMENT.exec(line);
  if (match === null) return line;
  const [, indent, name, extras = "", , rest = ""] = match;
  return `${indent}${name}${extras}==${version}${rest}`;
}

export default function transform(file, _api, options) {
  const version = options.pack.tools.find((t) => t.name === "Django")?.version;
  if (version === undefined) throw new Error("pack.yaml must pin Django");
  let out;
  if (file.path === "pyproject.toml") {
    out = file.source
      // PEP 621 dependency strings.
      .replace(/(["'])(django(?:\[[^\]]*\])?)\s*((?:[<>=!~]=?|===)[^"';]*)?(;[^"']*)?\1/gi, (_m, quote, name, _spec, marker = "") => `${quote}${name}==${version}${marker}${quote}`)
      // Poetry: django = "^4.2" or django = { version = "^4.2", ... }.
      .replace(/^(\s*django\s*=\s*)(["'])[^"']*\2/gim, `$1$2${version}$2`)
      .replace(/^(\s*django\s*=\s*\{[^}]*\bversion\s*=\s*)(["'])[^"']*\2/gim, `$1$2${version}$2`);
  } else {
    out = file.source.split("\n").map((line) => setRequirement(line, version)).join("\n");
  }
  if (out !== file.source && !out.includes(version)) options.note(`${file.path}: could not set Django ${version}`);
  return out === file.source ? undefined : out;
}
