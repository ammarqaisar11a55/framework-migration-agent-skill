import { test } from "node:test";
import assert from "node:assert/strict";
import { render, settle, text } from "./render.js";
import App from "../src/App.svelte";
import Field from "../src/Field.svelte";

test("the submit handler runs and the default action is prevented", async () => {
  const { target, destroy } = render(App);
  const notCancelled = target.querySelector("form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  await settle();
  assert.equal(notCancelled, false);
  assert.equal(text(target.querySelector(".submitted")), "Submitted 1");
  destroy();
});

test("the reactive block keeps document.title in step with the name", async () => {
  const { target, destroy } = render(App);
  assert.equal(document.title, "Hello Ada");
  target.querySelector(".rename").dispatchEvent(new MouseEvent("click", { bubbles: true }));
  await settle();
  assert.equal(text(target.querySelector("h1")), "Hello Grace");
  assert.equal(document.title, "Hello Grace");
  destroy();
});

test("input events reach the parent through the child", async () => {
  const { target, destroy } = render(App);
  const input = target.querySelector("input");
  input.value = "typed";
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await settle();
  assert.equal(text(target.querySelector(".inputs")), "Inputs 1");
  destroy();
});

test("the field's value is readable on the component instance", async () => {
  const { target, component, destroy } = render(Field, { value: "first" });
  assert.equal(component.value, "first");
  const input = target.querySelector("input");
  input.value = "second";
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await settle();
  assert.equal(component.value, "second");
  destroy();
});
