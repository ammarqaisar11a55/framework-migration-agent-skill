import { test } from "node:test";
import assert from "node:assert/strict";
import { render, settle, text } from "./render.js";
import Chat from "../src/Chat.svelte";

test("new messages render and the log scrolls to the latest one after each update", async () => {
  const { target, destroy } = render(Chat);
  const items = () => [...target.querySelectorAll(".log li")].map(text);
  assert.deepEqual(items(), ["Hello"]);
  const send = target.querySelector("button");
  send.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  await settle();
  send.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  await settle();
  assert.deepEqual(items(), ["Hello", "Message 2", "Message 3"]);
  assert.equal(target.querySelector(".log").dataset.scrolledTo, "3");
  destroy();
});
