// Unit tests for pydantic-1-to-2's finish-bump.js. The fixtures and
// `npm run evals -- pydantic-1-to-2` run bump-pydantic end to end.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { findPack } from "../../skills/framework-migration/engine/pack.ts";
import { runStage } from "../../skills/framework-migration/engine/run-codemod.ts";

const TODO = [
  "    # TODO[pydantic]: The following keys were removed: `allow_mutation`.",
  "    # Check https://docs.pydantic.dev/dev-v2/migration/#changes-to-config for more information.",
].join("\n");

describe("pydantic-1-to-2 finish-bump.js", () => {
  let root: string;
  const write = (files: Record<string, string>): void => {
    for (const [path, text] of Object.entries(files)) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), text);
    }
  };
  const read = (path: string): string => readFileSync(join(root, path), "utf8");
  const run = () => runStage(root, findPack("pydantic-1-to-2"), "pydantic-2", { apply: true, skipCommands: true });

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "fm-pydantic-"));
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it("maps allow_mutation to frozen, makes bare root validators valid in v2, and notes them", async () => {
    write({
      "app/models.py": [
        "from pydantic import ConfigDict, BaseModel, root_validator",
        "",
        "class User(BaseModel):",
        TODO,
        "    model_config = ConfigDict(allow_mutation=False, from_attributes=True)",
        "",
        "    @root_validator",
        "    def a(cls, values):",
        "        return values",
        "",
        "    @root_validator(pre=True)",
        "    def b(cls, values):",
        "        return values",
        "",
      ].join("\n"),
    });
    const result = await run();
    expect(result.ok).toBe(true);
    expect(read("app/models.py")).toBe(
      [
        "from pydantic import ConfigDict, BaseModel, root_validator",
        "",
        "class User(BaseModel):",
        "    model_config = ConfigDict(frozen=True, from_attributes=True)",
        "",
        "    @root_validator(skip_on_failure=True)",
        "    def a(cls, values):",
        "        return values",
        "",
        "    @root_validator(pre=True)",
        "    def b(cls, values):",
        "        return values",
        "",
      ].join("\n"),
    );
    expect(result.codemods.flatMap((c) => c.notes).join("\n")).toContain("app/models.py: @root_validator → @root_validator(skip_on_failure=True)");
  });

  it("pins pydantic and adds pydantic-settings when the code imports it", async () => {
    write({
      "requirements.txt": "fastapi==0.99.1\npydantic==1.10.26\npytest==9.1.1\n",
      "svc/config.py": "from pydantic_settings import BaseSettings\n",
      "pyproject.toml": '[project]\ndependencies = ["pydantic>=1.10,<2"]\n',
    });
    const result = await run();
    expect(result.ok).toBe(true);
    expect(read("requirements.txt")).toBe("fastapi==0.99.1\npydantic==2.13.5\npydantic-settings==2.15.0\npytest==9.1.1\n");
    expect(read("pyproject.toml")).toBe('[project]\ndependencies = ["pydantic==2.13.5"]\n');
    expect(result.codemods.flatMap((c) => c.notes).join("\n")).toContain("pyproject.toml: the code imports pydantic_settings");
  });
});
