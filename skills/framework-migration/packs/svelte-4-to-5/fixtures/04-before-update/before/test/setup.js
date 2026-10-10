// Loaded with --import: a jsdom window as the global DOM, and the .svelte compile hook.
import { register } from "node:module";
import { JSDOM } from "jsdom";

const { window } = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/", pretendToBeVisual: true });
// Node has its own Event classes; the DOM needs jsdom's.
const OVERRIDE = new Set(["Event", "EventTarget", "CustomEvent"]);
for (const key of Object.getOwnPropertyNames(window)) {
  if (!(key in globalThis) || OVERRIDE.has(key)) globalThis[key] = window[key];
}
globalThis.window = window;
register("./svelte-hooks.js", import.meta.url);
