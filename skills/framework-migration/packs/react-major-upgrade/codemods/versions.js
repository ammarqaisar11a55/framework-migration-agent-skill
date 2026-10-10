// Helpers shared by this pack's version-bump codemods. Not a codemod itself (no stage lists it).

/** Packages released in lockstep with React, and their @types. Only those the project has change. */
export const REACT_PACKAGES = ["react", "react-dom", "react-test-renderer", "react-is", "@types/react", "@types/react-dom", "@types/react-test-renderer", "@types/react-is"];

/** Sets each React package the project depends on to `versionOf(name)`. Returns undefined if nothing changed. */
export function bump(file, versionOf, note) {
  const pkg = JSON.parse(file.source);
  let changed = false;
  for (const field of ["dependencies", "devDependencies", "peerDependencies"]) {
    for (const name of REACT_PACKAGES) {
      const current = pkg[field]?.[name];
      const next = versionOf(name);
      if (current === undefined || next === undefined || current === next) continue;
      if (field === "peerDependencies") {
        note(`package.json: peerDependencies.${name} is "${current}"; widen it by hand if the package supports React ${next}`);
        continue;
      }
      pkg[field][name] = next;
      changed = true;
    }
  }
  if (!changed) return undefined;
  const indent = /^([ \t]+)"/m.exec(file.source)?.[1] ?? "  ";
  return `${JSON.stringify(pkg, null, indent)}\n`;
}
