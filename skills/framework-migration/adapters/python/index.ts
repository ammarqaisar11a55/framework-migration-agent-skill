import { parse as parseToml } from "smol-toml";
import type { Adapter, ProjectView } from "../../engine/adapter.ts";
import type { Framework, Stack } from "../../engine/types.ts";

const FRAMEWORKS = new Set(["django", "flask", "fastapi", "pydantic", "sqlalchemy", "pandas", "celery", "numpy"]);

/** PEP 508 requirement ("Django>=3.2,<4 ; python_version > '3'") → [normalised name, version spec]. */
export function parseRequirement(line: string): [string, string] | undefined {
  const cleaned = (line.split(/\s+#/)[0] ?? "").split(";")[0]?.trim() ?? "";
  if (cleaned === "" || cleaned.startsWith("#") || cleaned.startsWith("-")) return undefined;
  const match = /^([A-Za-z0-9][A-Za-z0-9._-]*)\s*(?:\[[^\]]*\])?\s*(.*)$/.exec(cleaned);
  if (match?.[1] === undefined) return undefined;
  return [match[1].toLowerCase().replace(/[._]+/g, "-"), (match[2] ?? "").replace(/\s+/g, "") || "*"];
}

function fromRequirements(lines: string[]): Framework[] {
  const frameworks: Framework[] = [];
  for (const line of lines) {
    const parsed = parseRequirement(line);
    if (parsed !== undefined && FRAMEWORKS.has(parsed[0])) frameworks.push({ name: parsed[0], version: parsed[1] });
  }
  return frameworks;
}

function stack(manifest: string, frameworks: Framework[], python: string | undefined): Stack {
  const all = python === undefined ? frameworks : [...frameworks, { name: "python", version: python }];
  const result: Stack = { ecosystem: "python", manifest, language: "python", frameworks: all.sort((a, b) => a.name.localeCompare(b.name)) };
  if (python !== undefined) result.runtime = `python ${python}`;
  return result;
}

function detect(project: ProjectView): Stack[] {
  const stacks: Stack[] = [];
  const pyproject = project.read("pyproject.toml");
  if (pyproject !== undefined) {
    try {
      const doc = parseToml(pyproject) as {
        project?: { dependencies?: string[]; "requires-python"?: string };
        tool?: { poetry?: { dependencies?: Record<string, unknown> } };
      };
      const frameworks = fromRequirements(doc.project?.dependencies ?? []);
      let python = doc.project?.["requires-python"];
      for (const [name, spec] of Object.entries(doc.tool?.poetry?.dependencies ?? {})) {
        const version = typeof spec === "string" ? spec : String((spec as { version?: unknown }).version ?? "*");
        const normalised = name.toLowerCase().replace(/[._]+/g, "-");
        if (normalised === "python") python ??= version;
        else if (FRAMEWORKS.has(normalised)) frameworks.push({ name: normalised, version });
      }
      stacks.push(stack("pyproject.toml", frameworks, python));
    } catch {
      stacks.push(stack("pyproject.toml", [], undefined));
    }
  }
  const requirements = project.read("requirements.txt");
  if (requirements !== undefined) stacks.push(stack("requirements.txt", fromRequirements(requirements.split(/\r?\n/)), undefined));
  return stacks;
}

export const pythonAdapter: Adapter = { ecosystem: "python", languages: { ".py": "python" }, detect };
