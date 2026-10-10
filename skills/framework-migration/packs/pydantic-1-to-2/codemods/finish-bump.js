// Stage "pydantic-2", after bump-pydantic: what it leaves that Pydantic 2 rejects at import time,
// where the migration guide gives a direct replacement.
//
//   allow_mutation=False   bump-pydantic drops the key into a TODO comment ("The following keys were
//                          removed: `allow_mutation`"). The guide's config table maps it to
//                          frozen=True, which is set in the ConfigDict and the TODO removed.
//   @root_validator        Pydantic 2 raises at class creation for a bare @root_validator (pre=False
//                          without skip_on_failure=True). It becomes @root_validator(skip_on_failure=True):
//                          the validator still receives and returns the values dict; it no longer
//                          runs when a field already failed validation (the error raised is the
//                          same). Each one is noted; rewriting it as @model_validator is left to people.
//   requirements           pydantic is pinned to the version in pack.yaml; pydantic-settings is added
//                          when the code imports it (BaseSettings moved there).

export const include = (path) => path.endsWith(".py") || /(^|\/)requirements([\w.-]*|\/[\w.-]+)\.(txt|in)$/.test(path) || path === "pyproject.toml";

const TODO = /^([ \t]*)# TODO\[pydantic\]: The following keys were removed: `allow_mutation`\.\r?\n\1# Check https:\/\/docs\.pydantic\.dev\/[^\n]*\r?\n/m;

function fixPython(file, options) {
  let out = file.source;
  if (TODO.test(out) && /\ballow_mutation\s*=\s*False\b/.test(out)) {
    out = out.replace(TODO, "").replace(/\ballow_mutation\s*=\s*False\b/, "frozen=True");
  }
  out = out.replace(/^([ \t]*)@root_validator[ \t]*(\(\s*\))?[ \t]*$/gm, (_m, indent) => {
    options.note(`${file.path}: @root_validator → @root_validator(skip_on_failure=True); it no longer runs after a field fails. Consider @model_validator(mode="after").`);
    return `${indent}@root_validator(skip_on_failure=True)`;
  });
  return out;
}

function importsSettings(options) {
  return options.inventory.files.some((f) => f.path.endsWith(".py") && /\bpydantic_settings\b/.test(options.read(f.path) ?? ""));
}

function fixRequirements(file, options) {
  const pin = (name) => options.pack.tools.find((t) => t.name === name)?.version;
  const lines = file.source.split("\n");
  let changed = false;
  let hasSettings = false;
  const out = lines.map((line) => {
    const m = /^(\s*)(pydantic(?:-settings)?)(\[[^\]]*\])?\s*([<>=!~][^;#]*)?(.*)$/i.exec(line);
    if (m === null) return line;
    const name = m[2].toLowerCase();
    if (name === "pydantic-settings") hasSettings = true;
    const version = pin(name);
    if (version === undefined) return line;
    const next = `${m[1]}${m[2]}${m[3] ?? ""}==${version}${m[5]}`;
    if (next !== line) changed = true;
    return next;
  });
  if (!hasSettings && file.source.match(/^\s*pydantic\b/im) && importsSettings(options)) {
    const i = out.findIndex((line) => /^\s*pydantic\b/i.test(line));
    out.splice(i + 1, 0, `pydantic-settings==${pin("pydantic-settings")}`);
    changed = true;
  }
  return changed ? out.join("\n") : undefined;
}

/** PEP 621 dependency strings ("pydantic>=1.10,<2") and Poetry (pydantic = "^1.10"). */
function fixPyproject(file, options) {
  const version = options.pack.tools.find((t) => t.name === "pydantic")?.version;
  let out = file.source
    .replace(/(["'])(pydantic(?:\[[^\]]*\])?)\s*((?:[<>=!~]=?|===)[^"';]*)?(;[^"']*)?\1/gi, (_m, q, name, _spec, marker = "") => `${q}${name}==${version}${marker}${q}`)
    .replace(/^(\s*pydantic\s*=\s*)(["'])[^"']*\2/gim, `$1$2${version}$2`);
  if (importsSettings(options) && !/pydantic-settings/.test(out)) {
    options.note(`${file.path}: the code imports pydantic_settings; add pydantic-settings==${options.pack.tools.find((t) => t.name === "pydantic-settings")?.version} to the dependencies`);
  }
  return out === file.source ? undefined : out;
}

export default function transform(file, _api, options) {
  if (file.path.endsWith(".py")) {
    const out = fixPython(file, options);
    return out === file.source ? undefined : out;
  }
  if (file.path === "pyproject.toml") return fixPyproject(file, options);
  return fixRequirements(file, options);
}
