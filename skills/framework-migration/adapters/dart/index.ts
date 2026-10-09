import { parse as parseYaml } from "yaml";
import type { Adapter, ProjectView } from "../../engine/adapter.ts";
import type { Framework, Stack } from "../../engine/types.ts";

interface Pubspec {
  environment?: { sdk?: string; flutter?: string };
  dependencies?: Record<string, unknown>;
  dev_dependencies?: Record<string, unknown>;
}

const PACKAGES = new Set(["provider", "flutter_bloc", "riverpod", "flutter_riverpod", "get"]);

function detect(project: ProjectView): Stack[] {
  const text = project.read("pubspec.yaml");
  if (text === undefined) return [];
  let pubspec: Pubspec;
  try {
    pubspec = (parseYaml(text) ?? {}) as Pubspec;
  } catch {
    return [{ ecosystem: "dart", manifest: "pubspec.yaml", language: "dart", frameworks: [] }];
  }
  const frameworks: Framework[] = [];
  const sdk = pubspec.environment?.sdk;
  if (sdk !== undefined) frameworks.push({ name: "dart", version: sdk });
  const deps = { ...pubspec.dev_dependencies, ...pubspec.dependencies };
  // `flutter: { sdk: flutter }` marks a Flutter app; its version is constrained under environment.
  if ("flutter" in deps) frameworks.push({ name: "flutter", version: pubspec.environment?.flutter ?? "*" });
  for (const [name, spec] of Object.entries(deps)) {
    if (PACKAGES.has(name)) frameworks.push({ name, version: typeof spec === "string" ? spec : "*" });
  }
  frameworks.sort((a, b) => a.name.localeCompare(b.name));
  const stack: Stack = { ecosystem: "dart", manifest: "pubspec.yaml", language: "dart", frameworks };
  if (sdk !== undefined) stack.runtime = `dart ${sdk}`;
  return [stack];
}

export const dartAdapter: Adapter = { ecosystem: "dart", languages: { ".dart": "dart" }, detect };
