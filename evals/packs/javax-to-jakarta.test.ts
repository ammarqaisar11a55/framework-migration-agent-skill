// Unit tests for javax-to-jakarta's jakarta-implementations.js. The fixtures and
// `npm run evals -- javax-to-jakarta` run OpenRewrite end to end.
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { findPack } from "../../skills/framework-migration/engine/pack.ts";
import { runStage } from "../../skills/framework-migration/engine/run-codemod.ts";

const dependency = (group: string, artifact: string, version?: string): string =>
  `    <dependency>\n      <groupId>${group}</groupId>\n      <artifactId>${artifact}</artifactId>\n${version === undefined ? "" : `      <version>${version}</version>\n`}    </dependency>\n`;

describe("javax-to-jakarta jakarta-implementations.js", () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "fm-jakarta-"));
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it("moves javax-era implementations to Jakarta EE 10 and pins recipe-chosen API versions", async () => {
    const before = [
      dependency("jakarta.validation", "jakarta.validation-api", "3.0.9"),
      dependency("org.hibernate.validator", "hibernate-validator", "6.2.5.Final"),
      dependency("org.glassfish", "jakarta.el", "3.0.4"),
      dependency("org.glassfish", "jakarta.json", "2.0.1"),
      dependency("org.glassfish.jaxb", "jaxb-runtime", "3.0.2"),
      dependency("com.google.inject", "guice", "5.1.0"),
      dependency("javax.inject", "javax.inject", "1"),
      dependency("org.hibernate.validator", "hibernate-validator-cdi", "${hv.version}"),
      dependency("javax.cache", "cache-api", "1.1.1"),
    ].join("");
    writeFileSync(join(root, "pom.xml"), `<project>\n  <dependencies>\n${before}  </dependencies>\n</project>\n`);
    const result = await runStage(root, findPack("javax-to-jakarta"), "jakarta-ee-10", { apply: true, skipCommands: true });
    expect(result.ok).toBe(true);
    const after = readFileSync(join(root, "pom.xml"), "utf8");
    for (const expected of [
      dependency("jakarta.validation", "jakarta.validation-api", "3.0.2"),
      dependency("org.hibernate.validator", "hibernate-validator", "8.0.5.Final"),
      dependency("org.glassfish.expressly", "expressly", "5.0.0"),
      dependency("org.eclipse.parsson", "parsson", "1.1.7"),
      dependency("org.glassfish.jaxb", "jaxb-runtime", "4.0.5"),
      dependency("com.google.inject", "guice", "7.0.0"),
      dependency("jakarta.inject", "jakarta.inject-api", "2.0.1"),
      // Unknown artifacts and property-based versions are left alone; JCache is not Java EE.
      dependency("org.hibernate.validator", "hibernate-validator-cdi", "${hv.version}"),
      dependency("javax.cache", "cache-api", "1.1.1"),
    ]) {
      expect(after).toContain(expected);
    }
  });

  it("leaves current Jakarta implementations unchanged", async () => {
    const pom = `<project>\n  <dependencies>\n${dependency("org.hibernate.validator", "hibernate-validator", "8.0.1.Final")}${dependency("org.eclipse.parsson", "parsson", "1.1.5")}  </dependencies>\n</project>\n`;
    writeFileSync(join(root, "pom.xml"), pom);
    expect((await runStage(root, findPack("javax-to-jakarta"), "jakarta-ee-10", { apply: true, skipCommands: true })).ok).toBe(true);
    expect(readFileSync(join(root, "pom.xml"), "utf8")).toBe(pom);
  });
});
