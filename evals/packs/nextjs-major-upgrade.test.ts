// Unit tests for nextjs-major-upgrade's finish-upgrade.js. The fixtures and
// `npm run evals -- nextjs-major-upgrade` run @next/codemod end to end.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { findPack } from "../../skills/framework-migration/engine/pack.ts";
import { runStage } from "../../skills/framework-migration/engine/run-codemod.ts";

const INSTANT = [
  "// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.",
  "// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components",
  "export const instant = false;",
  "",
].join("\n");

describe("nextjs-major-upgrade finish-upgrade.js", () => {
  let root: string;
  const write = (files: Record<string, string>): void => {
    for (const [path, text] of Object.entries(files)) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), text);
    }
  };
  const read = (path: string): string => readFileSync(join(root, path), "utf8");
  const run = () => runStage(root, findPack("nextjs-major-upgrade"), "upgrade", { apply: true, skipCommands: true });

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "fm-next-"));
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it("pins the versions the tool chose, in dependencies and overrides", async () => {
    write({
      "package.json": `${JSON.stringify(
        {
          dependencies: { next: "16.3.6", react: "19.4.1", "react-dom": "19.4.1", zod: "^4.0.0" },
          devDependencies: { "@types/react": "19.4.0", eslint: "^9.40.0", "eslint-config-next": "16.3.6" },
          overrides: { "@types/react": "19.4.0" },
        },
        null,
        2,
      )}\n`,
    });
    expect((await run()).ok).toBe(true);
    const pkg = JSON.parse(read("package.json"));
    expect(pkg.dependencies).toEqual({ next: "16.3.6", react: "19.3.0", "react-dom": "19.3.0", zod: "^4.0.0" });
    expect(pkg.devDependencies).toEqual({ "@types/react": "19.3.0", eslint: "9.39.5", "eslint-config-next": "16.3.6" });
    expect(pkg.overrides).toEqual({ "@types/react": "19.3.0" });
  });

  it("removes the instant = false blocks from route files unless cacheComponents is on", async () => {
    write({
      "package.json": "{}\n",
      "app/layout.tsx": `${INSTANT}\nexport const metadata = {};\n`,
      "src/app/blog/page.jsx": `import x from 'x';\n\n${INSTANT}\nexport default function Page() {}\n`,
      "app/api/route.ts": `${INSTANT}\nexport function GET() {}\n`,
    });
    expect((await run()).ok).toBe(true);
    expect(read("app/layout.tsx")).toBe("export const metadata = {};\n");
    expect(read("src/app/blog/page.jsx")).toBe("import x from 'x';\n\nexport default function Page() {}\n");
    // Not a page, layout or default file: left alone.
    expect(read("app/api/route.ts")).toBe(`${INSTANT}\nexport function GET() {}\n`);
  });

  it("keeps the blocks when next.config enables cacheComponents", async () => {
    write({
      "package.json": "{}\n",
      "next.config.ts": "export default { cacheComponents: true };\n",
      "app/page.tsx": `${INSTANT}\nexport default function Page() {}\n`,
    });
    expect((await run()).ok).toBe(true);
    expect(read("app/page.tsx")).toBe(`${INSTANT}\nexport default function Page() {}\n`);
  });
});
