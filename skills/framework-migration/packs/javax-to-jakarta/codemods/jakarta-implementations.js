// Stage "jakarta-ee-10", after OpenRewrite: artifacts the recipe leaves on javax.
//
// JakartaEE10 moves the javax.* imports and the API artifacts (validation-api → jakarta.validation-api
// 3.0, ...) to Jakarta EE 10, but not the implementations that read those APIs at run time. A
// javax-era Hibernate Validator finds no jakarta.validation API; the old EL, JSON-P and JAXB
// implementations do the same. Each implementation below, when the pom declares it at an older
// version, is replaced by its Jakarta EE 10 counterpart at the version pinned in pack.yaml:
//
//   org.hibernate.validator:hibernate-validator  < 8     → 8.0.x (Jakarta Validation 3.0)
//   org.glassfish:jakarta.el / javax.el (EL 3.0)         → org.glassfish.expressly:expressly 5.0 (EL 5.0)
//   org.glassfish:javax.json / jakarta.json (JSON-P ≤ 2.0) → org.eclipse.parsson:parsson 1.1 (JSON-P 2.1)
//   org.glassfish.jaxb:jaxb-runtime < 4, com.sun.xml.bind:jaxb-impl < 3 → org.glassfish.jaxb:jaxb-runtime 4.0
//                                                (the recipe leaves jaxb-runtime at 3.0 next to the 4.0 API)
//   com.google.inject:guice < 7 (reads javax.inject)     → 7.0 (reads jakarta.inject)
//
// and two API artifacts the recipe does not rename although it moves their packages:
//
//   javax.json:javax.json-api      → jakarta.json:jakarta.json-api 2.1
//   javax.inject:javax.inject      → jakarta.inject:jakarta.inject-api 2.0
//
// The recipe picks Jakarta API versions as "newest 3.0.x / 2.1.x / ..." at run time; each API artifact
// pinned in pack.yaml is set to that version, so the result does not depend on the day it runs.
// Artifacts not in the table are reported when their coordinates still name javax.

export const include = (path) => /(^|\/)pom\.xml$/.test(path);

const REPLACEMENTS = [
  { group: "org.hibernate.validator", artifact: "hibernate-validator", javax: (v) => Number.parseInt(v, 10) < 8, to: "org.hibernate.validator:hibernate-validator" },
  { group: "org.glassfish", artifact: "jakarta.el", javax: (v) => Number.parseInt(v, 10) < 4, to: "org.glassfish.expressly:expressly" },
  { group: "org.glassfish", artifact: "javax.el", javax: () => true, to: "org.glassfish.expressly:expressly" },
  { group: "org.glassfish", artifact: "javax.json", javax: () => true, to: "org.eclipse.parsson:parsson" },
  // GlassFish's JSON-P implementation stops at 2.0 (Jakarta EE 9); the recipe moves javax.json to it,
  // but the 2.1 API it pairs with looks for Parsson.
  { group: "org.glassfish", artifact: "jakarta.json", javax: () => true, to: "org.eclipse.parsson:parsson" },
  // The recipe itself moves jaxb-runtime to 3.0 (Jakarta EE 9) while the API goes to 4.0 (EE 10).
  { group: "org.glassfish.jaxb", artifact: "jaxb-runtime", javax: (v) => Number.parseInt(v, 10) < 4, to: "org.glassfish.jaxb:jaxb-runtime" },
  { group: "com.sun.xml.bind", artifact: "jaxb-impl", javax: (v) => Number.parseInt(v, 10) < 3, to: "org.glassfish.jaxb:jaxb-runtime" },
  { group: "com.google.inject", artifact: "guice", javax: (v) => Number.parseInt(v, 10) < 7, to: "com.google.inject:guice" },
  { group: "javax.json", artifact: "javax.json-api", javax: () => true, to: "jakarta.json:jakarta.json-api" },
  { group: "javax.inject", artifact: "javax.inject", javax: () => true, to: "jakarta.inject:jakarta.inject-api" },
];

const DEPENDENCY = /<dependency>([\s\S]*?)<\/dependency>/g;
const tag = (xml, name) => new RegExp(`<${name}>\\s*([^<]*?)\\s*</${name}>`).exec(xml)?.[1];

export default function transform(file, _api, options) {
  const pin = (coordinates) => options.pack.tools.find((t) => t.name === coordinates)?.version;
  const out = file.source.replace(DEPENDENCY, (block, body) => {
    const group = tag(body, "groupId");
    const artifact = tag(body, "artifactId");
    const version = tag(body, "version");
    const match = REPLACEMENTS.find((r) => r.group === group && r.artifact === artifact);
    const apiPin = /^jakarta\./.test(group ?? "") ? pin(`${group}:${artifact}`) : undefined;
    if (match === undefined && apiPin !== undefined && version !== undefined && !/\$\{/.test(version) && version !== apiPin) {
      return block.replace(/<version>[^<]*<\/version>/, `<version>${apiPin}</version>`);
    }
    if (match === undefined) {
      if (/javax/.test(`${group}:${artifact}`) && !/^javax\.(cache|money|measure)\b/.test(group ?? "")) {
        options.note(`${file.path}: ${group}:${artifact} still names javax; check for a Jakarta EE 10 artifact`);
      }
      return block;
    }
    // A version from a property or the parent cannot be judged here.
    if (version !== undefined && (/\$\{/.test(version) || !match.javax(version))) return block;
    const [newGroup, newArtifact] = match.to.split(":");
    const newVersion = pin(match.to);
    options.note(`${file.path}: ${group}:${artifact}${version ? ` ${version}` : ""} → ${match.to} ${newVersion} (Jakarta EE 10)`);
    let next = block
      .replace(/<groupId>[^<]*<\/groupId>/, `<groupId>${newGroup}</groupId>`)
      .replace(/<artifactId>[^<]*<\/artifactId>/, `<artifactId>${newArtifact}</artifactId>`);
    next = version === undefined ? next : next.replace(/<version>[^<]*<\/version>/, `<version>${newVersion}</version>`);
    return next;
  });
  return out === file.source ? undefined : out;
}
