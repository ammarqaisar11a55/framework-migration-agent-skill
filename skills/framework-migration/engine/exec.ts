import { spawnSync } from "node:child_process";

export interface ExecResult {
  command: string;
  exitCode: number;
  output: string;
  durationMs: number;
}

export interface ExecOptions {
  cwd: string;
  /** Run inside this container image (the project is mounted at /work) instead of on the host. */
  image?: string;
  timeoutMs?: number;
  env?: NodeJS.ProcessEnv;
}

/** Runs a shell command, capturing stdout and stderr together. Never throws on a non-zero exit. */
export function exec(command: string, options: ExecOptions): ExecResult {
  const started = Date.now();
  const [file, args] =
    options.image === undefined
      ? ["sh", ["-c", command]]
      : ["docker", ["run", "--rm", "-v", `${options.cwd}:/work`, "-w", "/work", options.image, "sh", "-c", command]];
  const result = spawnSync(file, args as string[], {
    cwd: options.cwd,
    encoding: "utf8",
    env: options.env ?? process.env,
    timeout: options.timeoutMs ?? 10 * 60 * 1000,
    maxBuffer: 64 * 1024 * 1024,
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  const failure = result.error === undefined ? "" : `\n${result.error.message}`;
  return { command, exitCode: result.status ?? 1, output: output + failure, durationMs: Date.now() - started };
}
