// Unit tests for php-7-to-8's require-php8.js. The fixtures and `npm run evals -- php-7-to-8` run
// Rector end to end.
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { findPack } from "../../skills/framework-migration/engine/pack.ts";
import { runStage } from "../../skills/framework-migration/engine/run-codemod.ts";

describe("php-7-to-8 require-php8.js", () => {
  let root: string;
  const composer = (value: object, indent = 4): void =>
    writeFileSync(join(root, "composer.json"), `${JSON.stringify(value, null, indent)}\n`);
  const read = (): string => readFileSync(join(root, "composer.json"), "utf8");
  const run = () => runStage(root, findPack("php-7-to-8"), "php-8", { apply: true, skipCommands: true });

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "fm-php-"));
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it.each([">=7.4", "^7.4 || ^8.0", "^8.0 || ^7.4", "~7.2", ">=5.6"])("requires ^8.0 instead of %s", async (php) => {
    composer({ name: "a/b", require: { php, "ext-json": "*" } });
    expect((await run()).ok).toBe(true);
    const text = read();
    expect(JSON.parse(text).require).toEqual({ php: "^8.0", "ext-json": "*" });
    expect(text).toMatch(/^ {4}"name"/m);
  });

  it.each(["^8.1", ">=8.0.7", "8.2.*"])("leaves %s alone", async (php) => {
    composer({ require: { php } }, 2);
    const before = read();
    expect((await run()).ok).toBe(true);
    expect(read()).toBe(before);
  });

  it("keeps the file's indentation and reports a PHP 7 platform pin", async () => {
    composer({ require: { php: "^7.3" }, config: { platform: { php: "7.3.33" } } }, 2);
    const result = await run();
    expect(result.ok).toBe(true);
    expect(read()).toBe(`${JSON.stringify({ require: { php: "^8.0" }, config: { platform: { php: "7.3.33" } } }, null, 2)}\n`);
    expect(JSON.stringify(result)).toContain("config.platform.php is \\\"7.3.33\\\"");
  });
});
