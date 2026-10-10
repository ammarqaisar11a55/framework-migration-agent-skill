// Starts the built app with `next start` on a free port for the tests, and stops it afterwards.
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { after, before } from "node:test";

const freePort = () =>
  new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });

/** Registers before/after hooks that run `next start`; returns a function building URLs on it. */
export function startServer() {
  let child;
  let base;
  before(async () => {
    const port = await freePort();
    base = `http://127.0.0.1:${port}`;
    child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port), "-H", "127.0.0.1"], { stdio: ["ignore", "pipe", "pipe"] });
    let log = "";
    child.stdout.on("data", (chunk) => (log += chunk));
    child.stderr.on("data", (chunk) => (log += chunk));
    for (let attempt = 0; ; attempt += 1) {
      try {
        await fetch(base, { redirect: "manual" });
        return;
      } catch {
        if (attempt > 150 || child.exitCode !== null) throw new Error(`next start did not answer:\n${log}`);
        await new Promise((r) => setTimeout(r, 200));
      }
    }
  });
  after(() => child?.kill());
  return (path) => `${base}${path}`;
}

/** The text content of an HTML response, without tags, React's text separators and extra spaces. */
export const textOf = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/g, "")
    .replace(/<!-- -->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
