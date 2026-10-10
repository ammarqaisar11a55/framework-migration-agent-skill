import { test } from "node:test";
import assert from "node:assert/strict";
import { render, settle, text } from "./render.js";
import App from "../src/App.svelte";

test("the counter increments, derives, renders both slots and reports changes", async () => {
  const { target, destroy } = render(App);
  assert.match(text(target), /Clicks: 2 Doubled: 4 Footer sees 2 Child content Last change: none/);
  target.querySelector("button").dispatchEvent(new MouseEvent("click", { bubbles: true }));
  await settle();
  assert.match(text(target), /Clicks: 3 Doubled: 6 Footer sees 3 Child content Last change: 3/);
  destroy();
});
