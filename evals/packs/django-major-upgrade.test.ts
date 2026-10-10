// Unit tests for django-major-upgrade's set-django-version.js. The fixtures and
// `npm run evals -- django-major-upgrade` run django-upgrade end to end.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { findPack } from "../../skills/framework-migration/engine/pack.ts";
import { runStage } from "../../skills/framework-migration/engine/run-codemod.ts";

describe("django-major-upgrade set-django-version.js", () => {
  let root: string;
  const write = (files: Record<string, string>): void => {
    for (const [path, text] of Object.entries(files)) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), text);
    }
  };
  const read = (path: string): string => readFileSync(join(root, path), "utf8");

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "fm-django-"));
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it("pins Django in requirements files and pyproject.toml, keeping extras, markers and comments", async () => {
    write({
      "requirements.txt": "Django==4.2.30\ndjango-filter==23.5\nrequests>=2\n",
      "requirements/base.in": 'django[argon2]>=4.2,<5.0 ; python_version > "3.9"  # LTS\n',
      "pyproject.toml": '[project]\ndependencies = [\n  "Django>=4.2,<5",\n  "django-environ>=0.11",\n]\n\n[tool.poetry.dependencies]\ndjango = "^4.2"\n',
    });
    const result = await runStage(root, findPack("django-major-upgrade"), "django-5-2", { apply: true, skipCommands: true });
    expect(result.ok).toBe(true);
    expect(read("requirements.txt")).toBe("Django==5.2.17\ndjango-filter==23.5\nrequests>=2\n");
    expect(read("requirements/base.in")).toBe('django[argon2]==5.2.17 ; python_version > "3.9"  # LTS\n');
    expect(read("pyproject.toml")).toBe('[project]\ndependencies = [\n  "Django==5.2.17",\n  "django-environ>=0.11",\n]\n\n[tool.poetry.dependencies]\ndjango = "5.2.17"\n');
  });
});
