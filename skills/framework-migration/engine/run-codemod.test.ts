import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { formatPatch, runStage, type CodemodModule } from "./run-codemod.ts";
import type { Pack, PackStage } from "./types.ts";

const FILES: Record<string, string> = {
  "package.json": '{\n  "name": "sample"\n}\n',
  "src/server.js": "const app = require('./app');\napp.listen(3000);\n",
  "src/app.js": "const db = require('./db');\nmodule.exports = { db };\n",
  "src/db.js": "var legacy = 1;\nmodule.exports = legacy;\n",
};

const pack = (stage: Omit<PackStage, "id">): Pack => ({
  id: "test-pack", title: "t", ecosystem: "node", tier: 1, status: "planned", dir: "/nowhere",
  from: { framework: "express", versions: "4.x" }, to: { framework: "express", versions: "4.x" },
  tools: [], stages: [{ id: "first" }, { id: "main", ...stage }], checks: { test: "true" },
});

/** var → const, via the jscodeshift API the engine hands to codemods. */
const varToConst: CodemodModule = {
  default(file, api) {
    const root = api.jscodeshift(file.source);
    const declarations = root.find(api.jscodeshift.VariableDeclaration, { kind: "var" });
    if (declarations.size() === 0) return undefined;
    declarations.forEach((path) => {
      path.node.kind = "const";
    });
    return root.toSource();
  },
};

const renameToTs: CodemodModule = {
  rename: (path) => path.replace(/\.js$/, ".ts"),
};

describe("runStage", () => {
  let root: string;
  const read = (path: string): string => readFileSync(join(root, path), "utf8");
  const patchFile = (name: string): string => read(`.fm/diffs/stage-2/${name}.patch`);

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "fm-codemod-"));
    for (const [path, content] of Object.entries(FILES)) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), content);
    }
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it("dry-run writes a patch and leaves the project untouched", async () => {
    const result = await runStage(root, pack({ codemods: ["var-to-const.js"] }), "main", { modules: { "var-to-const.js": varToConst } });
    expect(result).toMatchObject({ ok: true, mode: "dry-run", number: 2, stage: "main" });
    expect(result.codemods[0]?.changes.map((c) => c.to)).toEqual(["src/db.js"]);
    expect(patchFile("var-to-const")).toBe(
      [
        "diff --git a/src/db.js b/src/db.js",
        "--- a/src/db.js",
        "+++ b/src/db.js",
        "@@ -1,2 +1,2 @@",
        "-var legacy = 1;",
        "+const legacy = 1;",
        " module.exports = legacy;",
        "",
      ].join("\n"),
    );
    expect(read("src/db.js")).toBe(FILES["src/db.js"]);
  });

  it("apply writes the same patch, then changes the files", async () => {
    const result = await runStage(root, pack({ codemods: ["var-to-const.js"] }), "main", { apply: true, modules: { "var-to-const.js": varToConst } });
    expect(result.mode).toBe("apply");
    expect(patchFile("var-to-const")).toContain("+const legacy = 1;");
    expect(read("src/db.js")).toBe("const legacy = 1;\nmodule.exports = legacy;\n");
    expect(read("src/app.js")).toBe(FILES["src/app.js"]);
  });

  it("visits files leaf to root", async () => {
    const visited: string[] = [];
    const spy: CodemodModule = { default: (file) => void visited.push(file.path) };
    await runStage(root, pack({ codemods: ["spy.js"] }), "main", { modules: { "spy.js": spy } });
    expect(visited).toEqual(["src/db.js", "src/app.js", "src/server.js"]);
  });

  it("chains codemods within a stage: later ones see earlier output and renames", async () => {
    const seen: [string, string, string][] = [];
    const spy: CodemodModule = {
      include: (path) => path.endsWith("db.ts"),
      default: (file, _api, context) => void seen.push([file.path, context.originalPath, file.source]),
    };
    const modules = { "var-to-const.js": varToConst, "rename.js": renameToTs, "spy.js": spy };
    const result = await runStage(root, pack({ codemods: ["var-to-const.js", "rename.js", "spy.js"] }), "main", { apply: true, modules });
    expect(result.ok).toBe(true);
    expect(seen).toEqual([["src/db.ts", "src/db.js", "const legacy = 1;\nmodule.exports = legacy;\n"]]);
    expect(existsSync(join(root, "src/db.js"))).toBe(false);
    expect(read("src/db.ts")).toBe("const legacy = 1;\nmodule.exports = legacy;\n");
    expect(patchFile("rename")).toContain("diff --git a/src/db.js b/src/db.ts\nrename from src/db.js\nrename to src/db.ts\n");
  });

  it("creates files a codemod asks for, without overwriting existing ones", async () => {
    const mod: CodemodModule = { include: () => false, createFiles: () => ({ "tsconfig.json": "{}\n", "package.json": "overwritten" }) };
    const result = await runStage(root, pack({ codemods: ["config.js"] }), "main", { apply: true, modules: { "config.js": mod } });
    expect(read("tsconfig.json")).toBe("{}\n");
    expect(read("package.json")).toBe(FILES["package.json"]);
    expect(result.codemods[0]?.notes).toEqual(["package.json already exists; left as is"]);
    expect(patchFile("config")).toBe("diff --git a/tsconfig.json b/tsconfig.json\nnew file mode 100644\n--- /dev/null\n+++ b/tsconfig.json\n@@ -0,0 +1,1 @@\n+{}\n");
  });

  it("reports a codemod that throws and applies nothing from the stage", async () => {
    const boom: CodemodModule = {
      default(file) {
        if (file.path === "src/app.js") throw new Error("boom");
        return `${file.source}// touched\n`;
      },
    };
    const result = await runStage(root, pack({ codemods: ["boom.js"] }), "main", { apply: true, modules: { "boom.js": boom } });
    expect(result.ok).toBe(false);
    expect(result.codemods[0]?.errors).toEqual([{ path: "src/app.js", message: "boom" }]);
    expect(read("src/db.js")).toBe(FILES["src/db.js"]);
  });

  it("produces patches that git can apply, including renames and new files", async () => {
    const mod: CodemodModule = { ...varToConst, ...renameToTs, createFiles: () => ({ "tsconfig.json": "{}\n" }) };
    await runStage(root, pack({ codemods: ["all.js"] }), "main", { modules: { "all.js": mod } });
    const git = (...args: string[]): string => execFileSync("git", args, { cwd: root, encoding: "utf8" });
    git("init", "-q");
    git("apply", ".fm/diffs/stage-2/all.patch");
    expect(read("src/db.ts")).toBe("const legacy = 1;\nmodule.exports = legacy;\n");
    expect(existsSync(join(root, "src/db.js"))).toBe(false);
    expect(read("tsconfig.json")).toBe("{}\n");
  });

  it("dry-run previews commands that have a dry_run form and skips the rest", async () => {
    const stage = { commands: [{ run: "echo applied > ran.txt", dry_run: "echo would-change" }], post_commands: ["echo post > post.txt"] };
    const dry = await runStage(root, pack(stage), "main");
    expect(dry.commands).toMatchObject([
      { command: "echo would-change", phase: "before", status: "ok", output: "would-change\n" },
      { command: "echo post > post.txt", phase: "after", status: "skipped" },
    ]);
    expect(existsSync(join(root, "ran.txt"))).toBe(false);
    expect(read(".fm/diffs/stage-2/command-before-1.txt")).toBe("$ echo would-change\nwould-change\n");

    const applied = await runStage(root, pack(stage), "main", { apply: true });
    expect(applied.commands.map((c) => c.status)).toEqual(["ok", "ok"]);
    expect(read("ran.txt")).toBe("applied\n");
    expect(read("post.txt")).toBe("post\n");
  });

  it("stops the stage when an official-tool command fails", async () => {
    const result = await runStage(root, pack({ commands: ["exit 3"], codemods: ["var-to-const.js"] }), "main", { apply: true, modules: { "var-to-const.js": varToConst } });
    expect(result.ok).toBe(false);
    expect(result.codemods).toEqual([]);
    expect(read("src/db.js")).toBe(FILES["src/db.js"]);
  });

  it("rejects an unknown stage", async () => {
    await expect(runStage(root, pack({}), "nope")).rejects.toThrow('has no stage "nope"');
  });
});

describe("formatPatch", () => {
  it("emits only the rename header for a pure rename", () => {
    expect(formatPatch({ from: "a.js", to: "a.ts", before: "x\n", after: "x\n" })).toBe("diff --git a/a.js b/a.ts\nrename from a.js\nrename to a.ts\n");
  });
});
