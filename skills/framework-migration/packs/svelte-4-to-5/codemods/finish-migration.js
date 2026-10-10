// Stage "svelte-5", after the official migration: what it leaves undone or gets wrong.
//
//   package.json     The migration writes caret ranges (svelte ^5.0.0, svelte-check ^4.0.0, ...). Each
//                    range it wrote becomes the exact version pinned in pack.yaml, so every project
//                    lands on the versions the pack was verified with. A peerDependencies entry for
//                    svelte that excludes 5 (the migration does not touch peers) is reported.
//   .svelte files    svelte 5.57's migrate() removes `accessors` from <svelte:options> with a regular
//                    expression that leaves the value behind: `<svelte:options accessors={true} />`
//                    becomes `<svelte:options ={true} />`, which does not compile. The orphan value
//                    is removed, and so is a <svelte:options /> left with no attribute. Tags whose
//                    attributes the migration moved out (`<p slot="x" let:y>` → `<p  >`) lose the
//                    leftover spaces after the tag name.

export const include = (path) => path === "package.json" || path.endsWith(".svelte");

// The ranges svelte-migrate 1.10.3 writes (migrations/svelte-5/migrate.js, update_pkg_json_content).
const TOOL_RANGES = {
  svelte: "^5.0.0",
  "svelte-check": "^4.0.0",
  "svelte-preprocess": "^6.0.0",
  "@sveltejs/enhanced-img": "^0.3.9",
  "@sveltejs/kit": "^2.5.27",
  "@sveltejs/package": "^2.3.7",
  "@sveltejs/vite-plugin-svelte": "^4.0.0",
  "svelte-loader": "^3.2.3",
  "rollup-plugin-svelte": "^7.2.2",
  prettier: "^3.1.0",
  "prettier-plugin-svelte": "^3.2.6",
  "eslint-plugin-svelte": "^2.45.1",
  "svelte-eslint-parser": "^0.42.0",
  "eslint-plugin-svelte3": "^4.0.0",
  typescript: "^5.5.0",
  vite: "^5.4.4",
};

function pinVersions(file, options) {
  const pins = new Map(options.pack.tools.filter((t) => t.role !== "engine").map((t) => [t.name, t.version]));
  const pkg = JSON.parse(file.source);
  let changed = false;
  for (const field of ["dependencies", "devDependencies"]) {
    for (const [name, range] of Object.entries(pkg[field] ?? {})) {
      if (TOOL_RANGES[name] !== range || !pins.has(name)) continue;
      pkg[field][name] = pins.get(name);
      changed = true;
    }
  }
  const peer = pkg.peerDependencies?.svelte;
  if (peer !== undefined && !/(^|[\s|^~>=])5(\.|$)|\*|>=\s*[34]/.test(peer)) {
    options.note(`package.json: peerDependencies.svelte is "${peer}"; add "|| ^5.0.0" once the components are tested on Svelte 5`);
  }
  if (!changed) return undefined;
  const indent = /^([ \t]+)"/m.exec(file.source)?.[1] ?? "  ";
  return `${JSON.stringify(pkg, null, indent)}\n`;
}

function fixMarkup(source) {
  let out = source.replace(/<svelte:options\b[^>]*>/g, (tag) =>
    tag.replace(/(\s)=(?:\{[^}]*\}|"[^"]*"|'[^']*')/g, "$1").replace(/\s+(\/?>)$/, (_m, end) => (end === "/>" ? " />" : ">")),
  );
  // An empty tag goes, and so do the blank lines it leaves at the start of the file.
  const emptied = out.replace(/^[ \t]*<svelte:options\s*\/?>[ \t]*(?:<\/svelte:options>)?(?:\r?\n)?/m, "");
  if (emptied !== out) out = /^\s/.test(source) ? emptied : emptied.replace(/^(?:[ \t]*\r?\n)+/, "");
  out = out.replace(/<([a-zA-Z][\w.:-]*)[ \t]{2,}(\/?>)?/g, (_m, tag, end) => (end === undefined ? `<${tag} ` : `<${tag}${end === "/>" ? " />" : ">"}`));
  return out === source ? undefined : out;
}

export default function transform(file, _api, options) {
  return file.path === "package.json" ? pinVersions(file, options) : fixMarkup(file.source);
}
