import type { Adapter, ProjectView } from "../../engine/adapter.ts";
import type { Framework, Stack } from "../../engine/types.ts";

const MODULES: [prefix: string, name: string][] = [
  ["github.com/gin-gonic/gin", "gin"],
  ["github.com/labstack/echo", "echo"],
  ["github.com/gofiber/fiber", "fiber"],
  ["github.com/gorilla/mux", "gorilla-mux"],
  ["github.com/go-chi/chi", "chi"],
  ["gorm.io/gorm", "gorm"],
];

export function parseGoMod(text: string): Stack {
  const frameworks: Framework[] = [];
  const go = /^go\s+(\d+(?:\.\d+)*)/m.exec(text)?.[1];
  if (go !== undefined) frameworks.push({ name: "go", version: go });
  // Matches both `require mod v1` and lines inside a `require ( ... )` block.
  for (const m of text.matchAll(/^\s*(?:require\s+)?([\w.-]+\.[\w.-]+\/[^\s]+)\s+(v[^\s]+)/gm)) {
    const match = MODULES.find(([prefix]) => (m[1] ?? "").startsWith(prefix));
    if (match !== undefined) frameworks.push({ name: match[1], version: m[2] ?? "*" });
  }
  frameworks.sort((a, b) => a.name.localeCompare(b.name));
  const stack: Stack = { ecosystem: "go", manifest: "go.mod", language: "go", frameworks };
  if (go !== undefined) stack.runtime = `go ${go}`;
  return stack;
}

function detect(project: ProjectView): Stack[] {
  const text = project.read("go.mod");
  return text === undefined ? [] : [parseGoMod(text)];
}

export const goAdapter: Adapter = { ecosystem: "go", languages: { ".go": "go" }, detect };
