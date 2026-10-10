// Unit tests for react-major-upgrade's own codemods. The fixtures and
// `npm run evals -- react-major-upgrade` run the official codemods end to end.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { findPack } from "../../skills/framework-migration/engine/pack.ts";
import { runStage } from "../../skills/framework-migration/engine/run-codemod.ts";

const pack = findPack("react-major-upgrade");

describe("react-major-upgrade", () => {
  let root: string;
  const write = (files: Record<string, string>): void => {
    for (const [path, text] of Object.entries(files)) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), text);
    }
  };
  const read = (path: string): string => readFileSync(join(root, path), "utf8");
  const stage = async (id: string): Promise<string[]> => {
    const result = await runStage(root, pack, id, { apply: true, skipCommands: true });
    expect(result.ok).toBe(true);
    return result.codemods.flatMap((c) => c.notes);
  };

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "fm-react-"));
    write({ "package.json": "{}\n" });
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it("function-default-props leaves what it cannot convert exactly, and says why", async () => {
    const cases = [
      "function A({ items }) { return items; }\nA.defaultProps = { items: [] };\n",
      "function B(props) { return props.x; }\nB.defaultProps = { x: 1 };\n",
      "function C({ x, ...rest }) { return [x, rest]; }\nC.defaultProps = { y: 1 };\n",
      "function D({ x: { y } }) { return y; }\nD.defaultProps = { x: 1 };\n",
      "const E = function ({ x }) { return x; };\nE.defaultProps = { ...base };\n",
    ];
    write({ "src/c.jsx": cases.join("") });
    const notes = (await stage("codemods")).join("\n");
    expect(read("src/c.jsx")).toBe(cases.join(""));
    expect(notes).toContain('the default for "items" is not a literal or identifier');
    expect(notes).toContain("props are not destructured");
    expect(notes).toContain("a default is not destructured and the pattern has ...rest");
    expect(notes).toContain('"x" is destructured into a nested pattern');
    expect(notes).toContain("it uses spreads or computed keys");
  });

  it("function-default-props keeps an existing default name and replaces its value", async () => {
    write({ "src/c.jsx": "export const F = ({ size: s = 1, ...rest }) => [s, rest];\nF.defaultProps = { size: 2 };\n" });
    await stage("codemods");
    expect(read("src/c.jsx")).toBe("export const F = ({ size: s = 2, ...rest }) => [s, rest];\n");
  });

  it("bumps only the React packages the project has: 18.3.1 first, then the pinned 19", async () => {
    write({ "package.json": JSON.stringify({ dependencies: { react: "^17.0.2", "react-dom": "^17.0.2", lodash: "4.17.21" }, devDependencies: { "@types/react": "17.0.2" }, peerDependencies: { react: ">=16" } }) });
    const notes = await stage("react-18-3");
    expect(JSON.parse(read("package.json"))).toEqual({
      dependencies: { react: "18.3.1", "react-dom": "18.3.1", lodash: "4.17.21" },
      devDependencies: { "@types/react": "18.3.31" },
      peerDependencies: { react: ">=16" },
    });
    expect(notes.join("\n")).toContain("peerDependencies.react");
    await stage("react-19");
    expect(JSON.parse(read("package.json"))).toMatchObject({ dependencies: { react: "19.3.0", "react-dom": "19.3.0" }, devDependencies: { "@types/react": "19.3.0" } });
  });
});
