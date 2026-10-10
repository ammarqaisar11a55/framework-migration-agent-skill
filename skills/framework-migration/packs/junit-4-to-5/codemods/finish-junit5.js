// Stage "junit-5", after OpenRewrite: test dependencies the migration leaves out.
//
//   Hamcrest       JUnit 4 depended on hamcrest-core, so Hamcrest matchers were on the test classpath
//                  without being declared; junit-jupiter does not bring them, and the migration itself
//                  rewrites ExpectedException.expectMessage(...) into Hamcrest's assertThat. When test
//                  code imports org.hamcrest and pom.xml declares no Hamcrest artifact,
//                  org.hamcrest:hamcrest is added (test scope).
//   JUnit Vintage  Test classes junit5.mjs kept on JUnit 4 (custom rules) need junit:junit, which the
//                  recipe removes, and the Vintage engine to run on the JUnit Platform. When Java
//                  files still import JUnit 4, both are added (test scope).
// Versions are pinned in pack.yaml.

export const include = (path) => path === "pom.xml";

/** Index of the </dependencies> closing the project's own list (not dependencyManagement, build or profiles). */
function projectDependenciesEnd(pom) {
  const skipped = [...pom.matchAll(/<(dependencyManagement|build|profiles)>[\s\S]*?<\/\1>/g)].map((m) => [m.index, m.index + m[0].length]);
  for (const m of pom.matchAll(/<\/dependencies>/g)) {
    if (!skipped.some(([from, to]) => m.index >= from && m.index < to)) return m.index;
  }
  return -1;
}

const dependencyXml = (inner, group, artifact, version) =>
  ["<dependency>", `  <groupId>${group}</groupId>`, `  <artifactId>${artifact}</artifactId>`, `  <version>${version}</version>`, "  <scope>test</scope>", "</dependency>"]
    .map((line) => `${inner}${line}\n`)
    .join("");

const javaImports = (options, pattern) =>
  options.inventory.files.some((f) => f.path.endsWith(".java") && pattern.test(options.read(f.path) ?? ""));

export default function transform(file, _api, options) {
  const pin = (name) => options.pack.tools.find((t) => t.name === name)?.version;
  const wanted = [];
  if (!/<groupId>\s*org\.hamcrest\s*<\/groupId>/.test(file.source) && javaImports(options, /^\s*import\s+(static\s+)?org\.hamcrest\./m)) {
    wanted.push(["org.hamcrest", "hamcrest", pin("org.hamcrest:hamcrest"), "JUnit 4 provided Hamcrest transitively"]);
  }
  if (javaImports(options, /^\s*import\s+(static\s+)?org\.junit\.(?!jupiter|platform)/m)) {
    if (!/<artifactId>\s*junit\s*<\/artifactId>/.test(file.source)) wanted.push(["junit", "junit", pin("junit:junit"), "test classes with custom rules stay JUnit 4"]);
    if (!/<artifactId>\s*junit-vintage-engine\s*<\/artifactId>/.test(file.source)) {
      wanted.push(["org.junit.vintage", "junit-vintage-engine", pin("org.junit.vintage:junit-vintage-engine"), "runs the JUnit 4 tests on the JUnit Platform"]);
    }
  }
  if (wanted.length === 0) return undefined;
  for (const [group, artifact, version, why] of wanted) options.note(`pom.xml: added ${group}:${artifact} ${version} (test): ${why}`);
  const end = projectDependenciesEnd(file.source);
  if (end !== -1) {
    const lineStart = file.source.lastIndexOf("\n", end) + 1;
    const indent = /^[ \t]*/.exec(file.source.slice(lineStart))[0];
    const inner = `${indent}${indent.length > 0 ? indent.slice(0, Math.max(2, indent.length / 2)) : "  "}`;
    return file.source.slice(0, lineStart) + wanted.map(([g, a, v]) => dependencyXml(inner, g, a, v)).join("") + file.source.slice(lineStart);
  }
  // The recipe removes <dependencies> when junit was the only one: add the block back before <build>
  // (or </project>), at the indentation of the project's other top-level elements.
  const anchor = /^([ \t]*)<build>/m.exec(file.source) ?? /^([ \t]*)<\/project>/m.exec(file.source);
  const indent = anchor[0].startsWith("<") && !anchor[0].startsWith("</project") ? anchor[1] : (/^([ \t]+)<modelVersion>/m.exec(file.source)?.[1] ?? "  ");
  const block = `${indent}<dependencies>\n${wanted.map(([g, a, v]) => dependencyXml(`${indent}${indent}`, g, a, v)).join("")}${indent}</dependencies>\n\n`;
  const at = file.source.lastIndexOf("\n", anchor.index) + 1;
  return file.source.slice(0, at) + block + file.source.slice(at);
}
