import type { Adapter, ProjectView } from "../../engine/adapter.ts";
import type { Framework, Stack } from "../../engine/types.ts";

/** Maven/Gradle coordinates ("group:artifact") → framework name. Checked by prefix. */
const COORDINATES: [prefix: string, name: string][] = [
  ["org.springframework.boot:", "spring-boot"],
  ["org.springframework:", "spring"],
  ["org.junit.jupiter:", "junit"],
  ["junit:junit", "junit"],
  ["jakarta.", "jakarta"],
  ["javax.", "javax"],
  ["org.apache.struts:", "struts"],
  ["org.hibernate", "hibernate"],
];

function classify(coordinate: string, version: string, into: Map<string, string>): void {
  for (const [prefix, name] of COORDINATES) {
    if (coordinate.startsWith(prefix)) {
      // Keep the first version seen that is a literal; "*" means declared without a usable version.
      if (!into.has(name) || into.get(name) === "*") into.set(name, version);
      return;
    }
  }
}

const tag = (xml: string, name: string): string | undefined =>
  new RegExp(`<${name}>\\s*([^<]+?)\\s*</${name}>`).exec(xml)?.[1];

function build(manifest: string, language: string, found: Map<string, string>, java: string | undefined): Stack {
  if (java !== undefined) found.set("java", java);
  const frameworks: Framework[] = [...found].map(([name, version]) => ({ name, version })).sort((a, b) => a.name.localeCompare(b.name));
  const stack: Stack = { ecosystem: "jvm", manifest, language, frameworks };
  if (java !== undefined) stack.runtime = `java ${java}`;
  return stack;
}

export function parsePom(xml: string): Stack {
  const found = new Map<string, string>();
  const properties = new Map<string, string>();
  const props = /<properties>([\s\S]*?)<\/properties>/.exec(xml)?.[1] ?? "";
  for (const m of props.matchAll(/<([\w.-]+)>\s*([^<]*?)\s*<\/\1>/g)) properties.set(m[1] ?? "", m[2] ?? "");
  const resolve = (value: string | undefined): string => {
    if (value === undefined) return "*";
    const ref = /^\$\{(.+)\}$/.exec(value)?.[1];
    return ref === undefined ? value : (properties.get(ref) ?? "*");
  };
  for (const block of xml.matchAll(/<(parent|dependency|plugin)>([\s\S]*?)<\/\1>/g)) {
    const body = block[2] ?? "";
    const group = tag(body, "groupId");
    const artifact = tag(body, "artifactId");
    if (group !== undefined && artifact !== undefined) classify(`${group}:${artifact}`, resolve(tag(body, "version")), found);
  }
  const java = properties.get("java.version") ?? properties.get("maven.compiler.release") ?? properties.get("maven.compiler.source");
  return build("pom.xml", "java", found, java);
}

export function parseGradle(text: string, manifest: string): Stack {
  const found = new Map<string, string>();
  for (const m of text.matchAll(/id\s*\(?\s*["']([\w.-]+)["']\s*\)?\s*version\s*\(?\s*["']([^"']+)["']/g)) {
    if (m[1] === "org.springframework.boot") found.set("spring-boot", m[2] ?? "*");
  }
  for (const m of text.matchAll(/["']([\w.-]+:[\w.-]+)(?::([^"':@]+))?["']/g)) classify(m[1] ?? "", m[2] ?? "*", found);
  const java =
    /JavaLanguageVersion\.of\(\s*(\d+)\s*\)/.exec(text)?.[1] ??
    /sourceCompatibility\s*=?\s*(?:JavaVersion\.VERSION_)?["']?([\d._]+)/.exec(text)?.[1]?.replace(/_/g, ".");
  return build(manifest, manifest.endsWith(".kts") || /kotlin\(|org\.jetbrains\.kotlin/.test(text) ? "kotlin" : "java", found, java);
}

function detect(project: ProjectView): Stack[] {
  const stacks: Stack[] = [];
  const pom = project.read("pom.xml");
  if (pom !== undefined) stacks.push(parsePom(pom));
  for (const manifest of ["build.gradle", "build.gradle.kts"]) {
    const text = project.read(manifest);
    if (text !== undefined) stacks.push(parseGradle(text, manifest));
  }
  return stacks;
}

export const jvmAdapter: Adapter = {
  ecosystem: "jvm",
  languages: { ".java": "java", ".kt": "kotlin", ".jsp": "jsp" },
  detect,
  // Maven and Gradle resolve dependencies when the checks build the project: nothing to install first.
  install: "true",
};
