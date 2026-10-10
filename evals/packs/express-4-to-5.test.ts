// Unit tests for express-4-to-5 codemods. The fixtures and `npm run evals -- express-4-to-5` are the
// end-to-end check; these cover inputs the fixtures do not.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { detect } from "../../skills/framework-migration/engine/detect.ts";
import { findPack } from "../../skills/framework-migration/engine/pack.ts";
import { runStage, type CodemodModule } from "../../skills/framework-migration/engine/run-codemod.ts";
// @ts-expect-error -- plain JavaScript codemod without type declarations
import * as pathSyntax from "../../skills/framework-migration/packs/express-4-to-5/codemods/path-syntax.js";

const convertPath = (pathSyntax as { convertPath: (path: string, options?: { readsParamsByIndex?: boolean }) => { path?: string; reason?: string } }).convertPath;

describe("express-4-to-5 path-syntax: convertPath", () => {
  it.each([
    ["/users/:id?", "/users{/:id}"],
    ["/:file.:ext?", "/:file{.:ext}"],
    ["*", "/{*splat}"],
    ["/*", "/{*splat}"],
    ["/files/*", "/files/{*splat}"],
    ["/a/*/b/*", "/a/{*splat}/b/{*splat2}"],
    ["/plain/:id", "/plain/:id"],
    ["/x/*splat", "/x/*splat"],
  ])("%s → %s", (from, to) => {
    expect(convertPath(from)).toEqual({ path: to });
  });

  it.each(["/:id(\\d+)", "/ab+cd", "/[a|b]", "/what?ever", "/hi!"])("leaves %s for a person", (path) => {
    expect(convertPath(path).path).toBeUndefined();
  });

  it("does not rename a wildcard when req.params is read by index", () => {
    expect(convertPath("/files/*", { readsParamsByIndex: true }).reason).toContain("by index");
    expect(convertPath("/users/:id?", { readsParamsByIndex: true })).toEqual({ path: "/users{/:id}" });
  });
});

describe("express-4-to-5 codemods on source text", () => {
  let root: string;
  const write = (files: Record<string, string>): void => {
    for (const [path, text] of Object.entries(files)) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), text);
    }
  };
  const read = (path: string): string => readFileSync(join(root, path), "utf8");
  const run = async (stage: string, modules?: Record<string, CodemodModule>): Promise<string[]> => {
    const result = await runStage(root, findPack("express-4-to-5"), stage, { apply: true, skipCommands: true, ...(modules ? { modules } : {}) });
    expect(result.ok).toBe(true);
    return result.codemods.flatMap((c) => c.notes);
  };

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "fm-express5-"));
    write({ "package.json": '{ "name": "app" }\n' });
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it("preserve-defaults: pins the query parser and urlencoded extended, as text edits", async () => {
    write({
      "src/app.js": [
        'const express = require("express")',
        "const app = express()",
        "app.use(express.urlencoded())",
        "app.use(express.urlencoded({ limit: 1024 }))",
        "app.use(express.urlencoded({",
        "  limit: 1024,",
        "}))",
        "app.use(express.urlencoded({}))",
        "app.use(express.urlencoded({ extended: false }))",
        "app.use(express.urlencoded(opts))",
        "",
      ].join("\n"),
    });
    const notes = await run("preserve-defaults");
    expect(read("src/app.js")).toBe(
      [
        'const express = require("express")',
        "const app = express()",
        'app.set("query parser", "extended")',
        "app.use(express.urlencoded({ extended: true }))",
        "app.use(express.urlencoded({ limit: 1024, extended: true }))",
        "app.use(express.urlencoded({",
        "  limit: 1024,",
        "  extended: true,",
        "}))",
        "app.use(express.urlencoded({ extended: true }))",
        "app.use(express.urlencoded({ extended: false }))",
        "app.use(express.urlencoded(opts))",
        "",
      ].join("\n"),
    );
    expect(notes.join("\n")).toContain("not an object literal");
  });

  it("preserve-defaults: leaves a file that already sets a query parser", async () => {
    write({ "src/app.js": "const express = require('express');\nconst app = express();\napp.set('query parser', 'simple');\n" });
    await run("preserve-defaults");
    expect(read("src/app.js")).toBe("const express = require('express');\nconst app = express();\napp.set('query parser', 'simple');\n");
  });

  it("api-codemods: renames route .del() and singular accepts* at any arity, not cache .del()", async () => {
    write({
      "src/app.js": [
        "app.del('/a/:id', h);",
        "router.del(/^\\/b/, h);",
        "cache.del('key');",
        "redis.del('key', cb);",
        "req.acceptsLanguage('en', 'fr');",
        "req.acceptsEncoding();",
        "",
      ].join("\n"),
    });
    await run("api-codemods");
    expect(read("src/app.js")).toBe(
      ["app.delete('/a/:id', h);", "router.delete(/^\\/b/, h);", "cache.del('key');", "redis.del('key', cb);", "req.acceptsLanguages('en', 'fr');", "req.acceptsEncodings();", ""].join("\n"),
    );
  });

  it("upgrade: rewrites route paths and notes the ones it leaves", async () => {
    write({
      "src/app.js": ["app.get('/users/:id?', h);", "app.get('/n/:id(\\\\d+)', h);", "app.get('setting');", "app.use('*', h);", ""].join("\n"),
    });
    const notes = await run("upgrade");
    expect(read("src/app.js")).toBe(["app.get('/users{/:id}', h);", "app.get('/n/:id(\\\\d+)', h);", "app.get('setting');", "app.use('/{*splat}', h);", ""].join("\n"));
    expect(notes.join("\n")).toContain("regular-expression characters");
  });
});

describe("express-4-to-5 rules", () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "fm-express5-rules-"));
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  const rulesOn = (lines: string[]): string[] => {
    mkdirSync(join(root, "src"), { recursive: true });
    writeFileSync(join(root, "src/app.js"), `${lines.join("\n")}\n`);
    return detect(root, findPack("express-4-to-5")).findings.map((f) => `${f.line} ${f.rule}`);
  };

  it("flags what the fixtures do not cover, and leaves look-alikes alone", () => {
    expect(
      rulesOn([
        "cache.del('key'); redis.del('key', cb);",
        "app.del(/^\\/old/, h);",
        "app.get('/n/:id(\\d+)', h);",
        "const first = req.params[0];",
        "req.query.page = 1;",
        "if (req.params.hasOwnProperty('id')) next();",
        "app.param((name, fn) => fn);",
        "router.param(['a', 'b'], load);",
        "const host = req.host;",
        "app.use(bodyParser.urlencoded({ limit: 1 }));",
        "app.get('setting');",
        "res.sendFile(file, { dotfiles: 'deny' });",
      ]),
    ).toEqual([
      "2 app-del",
      "3 route-reserved-chars",
      "4 req-params-index",
      "5 req-query-write",
      "6 req-params-prototype",
      "7 param-function",
      "8 router-param-array",
      "9 req-host",
      "10 urlencoded-extended-default",
    ]);
  });
});
