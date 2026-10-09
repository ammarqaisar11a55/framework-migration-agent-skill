import type { Adapter, ProjectView } from "../../engine/adapter.ts";
import type { Framework, Stack } from "../../engine/types.ts";

const PACKAGES: Record<string, string> = {
  php: "php",
  "laravel/framework": "laravel",
  "codeigniter/framework": "codeigniter",
  "codeigniter4/framework": "codeigniter",
  "symfony/framework-bundle": "symfony",
  "phpunit/phpunit": "phpunit",
};

function detect(project: ProjectView): Stack[] {
  const text = project.read("composer.json");
  if (text === undefined) return [];
  let composer: { require?: Record<string, string>; "require-dev"?: Record<string, string> };
  try {
    composer = JSON.parse(text) as typeof composer;
  } catch {
    return [{ ecosystem: "php", manifest: "composer.json", language: "php", frameworks: [] }];
  }
  const frameworks: Framework[] = [];
  for (const [name, version] of Object.entries({ ...composer["require-dev"], ...composer.require })) {
    const framework = PACKAGES[name];
    if (framework !== undefined) frameworks.push({ name: framework, version });
  }
  frameworks.sort((a, b) => a.name.localeCompare(b.name));
  const stack: Stack = { ecosystem: "php", manifest: "composer.json", language: "php", frameworks };
  const php = composer.require?.["php"];
  if (php !== undefined) stack.runtime = `php ${php}`;
  return [stack];
}

export const phpAdapter: Adapter = { ecosystem: "php", languages: { ".php": "php" }, detect };
