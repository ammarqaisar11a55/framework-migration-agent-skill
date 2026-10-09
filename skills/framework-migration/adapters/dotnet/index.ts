import type { Adapter, ProjectView } from "../../engine/adapter.ts";
import type { Framework, Stack } from "../../engine/types.ts";

const PACKAGES: [prefix: string, name: string][] = [
  ["Microsoft.AspNetCore", "aspnet-core"],
  ["Microsoft.AspNet.Mvc", "aspnet-mvc"],
  ["Microsoft.AspNet.WebApi", "aspnet-webapi"],
  ["Xamarin.Forms", "xamarin-forms"],
  ["Microsoft.Maui", "maui"],
  ["EntityFramework", "entity-framework"],
  ["Microsoft.EntityFrameworkCore", "ef-core"],
];

/**
 * Target framework moniker → [framework name, version].
 * net48 / v4.8 are .NET Framework; netcoreappX.Y and netX.0 are modern .NET.
 */
export function parseTargetFramework(tfm: string): Framework {
  const legacy = /^v(\d+(?:\.\d+)+)$/.exec(tfm) ?? /^net(\d)(\d)(\d)?$/.exec(tfm);
  if (legacy !== null) {
    const version = legacy.length === 2 ? (legacy[1] ?? "") : [legacy[1], legacy[2], legacy[3]].filter((p) => p !== undefined).join(".");
    return { name: "dotnet-framework", version };
  }
  const modern = /^net(?:coreapp)?(\d+\.\d+)/.exec(tfm);
  if (modern !== null) return { name: "dotnet", version: modern[1] ?? "*" };
  const standard = /^netstandard(\d+\.\d+)/.exec(tfm);
  if (standard !== null) return { name: "netstandard", version: standard[1] ?? "*" };
  return { name: "dotnet", version: tfm };
}

export function parseCsproj(xml: string, manifest: string): Stack {
  const frameworks = new Map<string, string>();
  const tfms = (/<TargetFrameworks?>\s*([^<]+?)\s*<\/TargetFrameworks?>/.exec(xml)?.[1] ?? /<TargetFrameworkVersion>\s*([^<]+?)\s*<\/TargetFrameworkVersion>/.exec(xml)?.[1] ?? "")
    .split(";")
    .filter((t) => t !== "");
  const targets = tfms.map(parseTargetFramework);
  for (const target of targets) if (!frameworks.has(target.name)) frameworks.set(target.name, target.version);
  for (const m of xml.matchAll(/<(?:PackageReference|Reference)\s+Include="([^",]+)[^>]*?(?:Version="([^"]+)"[^>]*)?\/?>(?:\s*<Version>([^<]+)<\/Version>)?/g)) {
    const pkg = m[1] ?? "";
    const match = PACKAGES.filter(([prefix]) => pkg.startsWith(prefix)).sort((a, b) => b[0].length - a[0].length)[0];
    if (match !== undefined && !frameworks.has(match[1])) frameworks.set(match[1], m[2] ?? m[3] ?? "*");
  }
  if (/<Project\s+Sdk="Microsoft\.NET\.Sdk\.Web"/.test(xml) && !frameworks.has("aspnet-core")) {
    frameworks.set("aspnet-core", frameworks.get("dotnet") ?? "*");
  }
  const stack: Stack = {
    ecosystem: "dotnet",
    manifest,
    language: "csharp",
    frameworks: [...frameworks].map(([name, version]) => ({ name, version })).sort((a, b) => a.name.localeCompare(b.name)),
  };
  if (tfms.length > 0) stack.runtime = tfms.join(";");
  return stack;
}

function detect(project: ProjectView): Stack[] {
  return project.files
    .filter((f) => f.endsWith(".csproj"))
    .map((f) => parseCsproj(project.read(f) ?? "", f));
}

export const dotnetAdapter: Adapter = { ecosystem: "dotnet", languages: { ".cs": "csharp", ".cshtml": "razor", ".xaml": "xaml" }, detect };
