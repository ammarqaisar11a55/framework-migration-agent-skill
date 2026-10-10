// Node module hook: compiles .svelte files with the installed Svelte compiler (client output), so
// the tests run the same way on Svelte 4 and Svelte 5.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { compile, VERSION } from "svelte/compiler";

const generate = Number(VERSION.split(".")[0]) >= 5 ? "client" : "dom";

export async function load(url, context, nextLoad) {
  if (!url.endsWith(".svelte")) return nextLoad(url, context);
  const filename = fileURLToPath(url);
  const { js } = compile(await readFile(filename, "utf8"), { filename, generate, css: "injected" });
  return { format: "module", source: js.code, shortCircuit: true };
}
