import type { Adapter, ProjectView } from "../../engine/adapter.ts";
import type { Framework, Stack } from "../../engine/types.ts";

const GEMS = new Set(["rails", "sinatra", "rspec", "rspec-rails", "sidekiq", "devise"]);

export function parseGemfile(text: string): Stack {
  const frameworks: Framework[] = [];
  for (const m of text.matchAll(/^\s*gem\s+["']([\w-]+)["']((?:\s*,\s*["'][^"']+["'])*)/gm)) {
    const name = m[1] ?? "";
    if (!GEMS.has(name)) continue;
    const constraints = [...(m[2] ?? "").matchAll(/["']([^"']+)["']/g)].map((c) => c[1] ?? "");
    frameworks.push({ name, version: constraints.join(", ") || "*" });
  }
  const ruby = /^\s*ruby\s+["']([^"']+)["']/m.exec(text)?.[1];
  if (ruby !== undefined) frameworks.push({ name: "ruby", version: ruby });
  frameworks.sort((a, b) => a.name.localeCompare(b.name));
  const stack: Stack = { ecosystem: "ruby", manifest: "Gemfile", language: "ruby", frameworks };
  if (ruby !== undefined) stack.runtime = `ruby ${ruby}`;
  return stack;
}

function detect(project: ProjectView): Stack[] {
  const text = project.read("Gemfile");
  return text === undefined ? [] : [parseGemfile(text)];
}

export const rubyAdapter: Adapter = { ecosystem: "ruby", languages: { ".rb": "ruby", ".erb": "erb" }, detect };
