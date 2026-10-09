import { describe, expect, it } from "vitest";
import { COMMANDS, run, usage } from "./cli.ts";

describe("fm cli", () => {
  it("prints usage listing every command when called with no arguments", () => {
    const result = run([]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe(usage());
    for (const command of COMMANDS) {
      expect(result.stdout).toContain(command.name);
    }
  });

  it("rejects unknown commands with exit code 2", () => {
    const result = run(["nope"]);
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('unknown command "nope"');
  });

  it("reports unimplemented commands as failures, never as success", () => {
    for (const command of COMMANDS) {
      const result = run([command.name]);
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain(command.milestone);
    }
  });
});
