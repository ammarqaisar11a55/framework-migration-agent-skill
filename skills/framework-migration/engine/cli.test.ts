import { describe, expect, it } from "vitest";
import { COMMANDS, run, usage } from "./cli.ts";

describe("fm cli", () => {
  it("prints usage listing every command when called with no arguments", async () => {
    const result = await run([]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe(usage());
    for (const command of COMMANDS) {
      expect(result.stdout).toContain(command.name);
    }
  });

  it("rejects unknown commands with exit code 2", async () => {
    const result = await run(["nope"]);
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('unknown command "nope"');
  });

  it("rejects unknown options with exit code 2", async () => {
    const result = await run(["validate-pack", "--bogus"]);
    expect(result.exitCode).toBe(2);
  });
});
