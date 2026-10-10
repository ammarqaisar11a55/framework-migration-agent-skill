// Unit tests for junit-4-to-5's finish-junit5.js. The fixtures and `npm run evals -- junit-4-to-5`
// run OpenRewrite end to end.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { findPack } from "../../skills/framework-migration/engine/pack.ts";
import { runStage } from "../../skills/framework-migration/engine/run-codemod.ts";

const pom = (dependencies: string): string =>
  `<project>\n  <modelVersion>4.0.0</modelVersion>\n${dependencies}\n  <build>\n    <plugins>\n      <plugin>\n        <dependencies>\n        </dependencies>\n      </plugin>\n    </plugins>\n  </build>\n</project>\n`;

describe("junit-4-to-5 finish-junit5.js", () => {
  let root: string;
  const write = (files: Record<string, string>): void => {
    for (const [path, text] of Object.entries(files)) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), text);
    }
  };
  const read = (path: string): string => readFileSync(join(root, path), "utf8");
  const run = () => runStage(root, findPack("junit-4-to-5"), "junit-5", { apply: true, skipCommands: true });

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "fm-junit-"));
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it("adds Hamcrest to the project's dependencies when tests import it", async () => {
    write({
      "pom.xml": pom("  <dependencies>\n    <dependency>\n      <groupId>org.junit.jupiter</groupId>\n    </dependency>\n  </dependencies>"),
      "src/test/java/ATest.java": "import static org.hamcrest.MatcherAssert.assertThat;\nimport org.junit.jupiter.api.Test;\n",
    });
    const result = await run();
    expect(result.ok).toBe(true);
    const text = read("pom.xml");
    expect(text).toContain("    </dependency>\n    <dependency>\n      <groupId>org.hamcrest</groupId>\n      <artifactId>hamcrest</artifactId>\n      <version>3.0</version>\n      <scope>test</scope>\n    </dependency>\n  </dependencies>");
    // Not inside the plugin's <dependencies>.
    expect(text).toContain("        <dependencies>\n        </dependencies>");
  });

  it("keeps JUnit 4 and adds the Vintage engine when JUnit 4 tests remain, recreating <dependencies> if needed", async () => {
    write({
      "pom.xml": pom(""),
      "src/test/java/LegacyTest.java": "import org.junit.Rule;\nimport org.junit.Test;\n",
    });
    expect((await run()).ok).toBe(true);
    const text = read("pom.xml");
    expect(text).toContain("  <dependencies>\n    <dependency>\n      <groupId>junit</groupId>\n      <artifactId>junit</artifactId>\n      <version>4.13.2</version>");
    expect(text).toContain("<artifactId>junit-vintage-engine</artifactId>\n      <version>5.14.4</version>");
    expect(text.indexOf("<dependencies>")).toBeLessThan(text.indexOf("<build>"));
  });

  it("changes nothing for a project fully on Jupiter without Hamcrest", async () => {
    const original = pom("  <dependencies>\n  </dependencies>");
    write({ "pom.xml": original, "src/test/java/ATest.java": "import org.junit.jupiter.api.Test;\n" });
    expect((await run()).ok).toBe(true);
    expect(read("pom.xml")).toBe(original);
  });
});
