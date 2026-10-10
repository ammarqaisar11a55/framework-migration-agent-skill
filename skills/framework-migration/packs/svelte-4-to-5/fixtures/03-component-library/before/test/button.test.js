import { test } from "node:test";
import assert from "node:assert/strict";
import { render, settle, text } from "./render.js";
import ButtonHost from "./ButtonHost.svelte";

test("the button forwards attributes, renders the icon slot only when given, and forwards clicks", async () => {
  const { target, destroy } = render(ButtonHost);
  const [danger, plain] = target.querySelectorAll("button");
  assert.equal(danger.getAttribute("type"), "submit");
  assert.equal(danger.getAttribute("aria-label"), "Delete item");
  assert.equal(danger.className, "btn btn-danger");
  assert.ok(danger.querySelector(".icon svg.trash"));
  assert.equal(text(danger), "Delete");
  assert.equal(plain.className, "btn btn-primary");
  assert.equal(plain.querySelector(".icon"), null);
  assert.equal(text(plain), "Plain");
  danger.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  await settle();
  assert.equal(text(target.querySelector(".clicks")), "Clicks 1");
  destroy();
});
