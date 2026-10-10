#!/usr/bin/env node
// Installs the project's dependencies after the Pydantic version changed. Not a jscodeshift codemod
// module: pack.yaml calls it as a post-command. Runs in the project's environment (the `python`,
// `uv` or `poetry` on PATH):
//
//   uv.lock          uv sync
//   poetry.lock      poetry install
//   requirements.txt python -m pip install -r requirements.txt
//
// Anything else: the script says what changed and stops, so the gate does not run against the old
// version.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const run = (cmd, args) => spawnSync(cmd, args, { stdio: "inherit" }).status ?? 1;
let status;
if (existsSync("uv.lock")) status = run("uv", ["sync"]);
else if (existsSync("poetry.lock")) status = run("poetry", ["install"]);
else if (existsSync("requirements.txt")) status = run("python", ["-m", "pip", "install", "--quiet", "--disable-pip-version-check", "-r", "requirements.txt"]);
else {
  console.error("No uv.lock, poetry.lock or requirements.txt: install the updated dependencies with the project's tool, then run fm check.");
  status = 1;
}
process.exitCode = status;
