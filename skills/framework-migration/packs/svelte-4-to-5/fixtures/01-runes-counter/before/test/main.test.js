import { test } from "node:test";
import assert from "node:assert/strict";
import { settle, text } from "./render.js";

test("the entry point mounts the app into #app and tears it down", async () => {
  const root = document.createElement("div");
  root.id = "app";
  document.body.append(root);
  const { teardown } = await import("../src/main.js");
  await settle();
  assert.match(text(root), /Clicks: 2/);
  teardown();
  await settle();
  assert.equal(text(root), "");
});
