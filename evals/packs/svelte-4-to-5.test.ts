// Unit tests for svelte-4-to-5's finish-migration.js. The fixtures and
// `npm run evals -- svelte-4-to-5` run the official migration end to end.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { findPack } from "../../skills/framework-migration/engine/pack.ts";
import { runStage } from "../../skills/framework-migration/engine/run-codemod.ts";

describe("svelte-4-to-5 finish-migration.js", () => {
  let root: string;
  const write = (files: Record<string, string>): void => {
    for (const [path, text] of Object.entries(files)) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), text);
    }
  };
  const read = (path: string): string => readFileSync(join(root, path), "utf8");
  const run = () => runStage(root, findPack("svelte-4-to-5"), "svelte-5", { apply: true, skipCommands: true });

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "fm-svelte-"));
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it("pins the ranges the migration wrote and leaves other versions alone", async () => {
    write({
      "package.json": `${JSON.stringify(
        {
          peerDependencies: { svelte: "^4.0.0" },
          devDependencies: { svelte: "^5.0.0", "@sveltejs/vite-plugin-svelte": "^4.0.0", vite: "5.4.21", "svelte-loader": "^3.2.0", jsdom: "29.1.1" },
        },
        null,
        2,
      )}\n`,
    });
    const result = await run();
    expect(result.ok).toBe(true);
    expect(JSON.parse(read("package.json")).devDependencies).toEqual({
      svelte: "5.57.1",
      "@sveltejs/vite-plugin-svelte": "4.0.4",
      vite: "5.4.21",
      "svelte-loader": "^3.2.0",
      jsdom: "29.1.1",
    });
    expect(result.codemods.flatMap((c) => c.notes).join("\n")).toContain('peerDependencies.svelte is "^4.0.0"');
  });

  it("does not report a peer range that already allows Svelte 5", async () => {
    write({ "package.json": JSON.stringify({ peerDependencies: { svelte: "^4.0.0 || ^5.0.0" }, devDependencies: { svelte: "5.57.1" } }) });
    const result = await run();
    expect(result.codemods.flatMap((c) => c.notes)).toEqual([]);
  });

  it("repairs what migrate() leaves of svelte:options and of moved attributes", async () => {
    write({
      "package.json": "{}\n",
      "src/A.svelte": "<svelte:options ={true} />\n\n<script>\n  let { value = $bindable('') } = $props();\n</script>\n\n<input bind:value />\n",
      "src/B.svelte": "<svelte:options immutable={true} ={true} />\n<script>\n</script>\n{#snippet icon()}\n  <svg  class=\"trash\"></svg>\n  <p  >x</p>\n{/snippet}\n",
      "src/C.svelte": "<div\n  class=\"kept\">\n  <br />\n</div>\n",
    });
    const result = await run();
    expect(result.ok).toBe(true);
    expect(read("src/A.svelte")).toBe("<script>\n  let { value = $bindable('') } = $props();\n</script>\n\n<input bind:value />\n");
    expect(read("src/B.svelte")).toBe('<svelte:options immutable={true} />\n<script>\n</script>\n{#snippet icon()}\n  <svg class="trash"></svg>\n  <p>x</p>\n{/snippet}\n');
    expect(read("src/C.svelte")).toBe("<div\n  class=\"kept\">\n  <br />\n</div>\n");
  });
});
