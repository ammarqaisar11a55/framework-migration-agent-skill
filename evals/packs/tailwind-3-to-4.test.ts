// Unit tests for tailwind-3-to-4's finish-upgrade.js. The fixtures and
// `npm run evals -- tailwind-3-to-4` run @tailwindcss/upgrade end to end.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { findPack } from "../../skills/framework-migration/engine/pack.ts";
import { runStage } from "../../skills/framework-migration/engine/run-codemod.ts";

describe("tailwind-3-to-4 finish-upgrade.js", () => {
  let root: string;
  const write = (files: Record<string, string>): void => {
    for (const [path, text] of Object.entries(files)) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), text);
    }
  };
  const read = (path: string): string => readFileSync(join(root, path), "utf8");

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "fm-tw-"));
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it("merges opacity utilities into the one matching colour, adds the CLI package, and reports the rest", async () => {
    write({
      "package.json": JSON.stringify({ scripts: { css: "npx tailwindcss -i a.css -o b.css" }, devDependencies: { tailwindcss: "^4.3.3" } }),
      "src/app.css": "@import 'tailwindcss';\n@theme { --color-brand-dark: #111; }\n",
      "src/page.html": [
        '<a class="bg-brand-dark bg-opacity-50">',
        '<b class="hover:text-red-500 hover:text-opacity-25 text-lg">',
        '<i class="border-[#ccc] border-opacity-10">',
        '<s class="bg-opacity-50">',
        '<u class="bg-white bg-black bg-opacity-50">',
        "",
      ].join("\n"),
    });
    const result = await runStage(root, findPack("tailwind-3-to-4"), "upgrade", { apply: true, skipCommands: true });
    expect(result.ok).toBe(true);
    expect(read("src/page.html")).toBe(
      ['<a class="bg-brand-dark/50">', '<b class="hover:text-red-500/25 text-lg">', '<i class="border-[#ccc]/10">', '<s class="bg-opacity-50">', '<u class="bg-white bg-black bg-opacity-50">', ""].join("\n"),
    );
    expect(JSON.parse(read("package.json")).devDependencies).toEqual({ "@tailwindcss/cli": "4.3.3", tailwindcss: "^4.3.3" });
    const notes = result.codemods.flatMap((c) => c.notes).join("\n");
    expect(notes).toContain('"bg-opacity-50" has no matching bg-<colour> class');
    expect(notes).toContain('"bg-opacity-50" has more than one matching bg-<colour> class');
  });
});
