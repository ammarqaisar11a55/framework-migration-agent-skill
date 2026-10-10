import { test } from "node:test";
import assert from "node:assert/strict";
import { textOf, startServer } from "./server.mjs";

const url = startServer();

test("the gallery renders optimised images from the allowed host", async () => {
  const html = await (await fetch(url("/gallery"))).text();
  assert.match(textOf(html), /Harbour Ridge/);
  const sources = [...html.matchAll(/<img[^>]*\ssrc="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, "&"));
  assert.equal(sources.length, 2);
  for (const src of sources) assert.match(src, /^\/_next\/image\?url=https%3A%2F%2Fimages\.example\.com%2F/);
});

test("the image optimiser accepts the allowed host and rejects others", async () => {
  const allowed = await fetch(url("/_next/image?url=https%3A%2F%2Fimages.example.com%2Fharbour.jpg&w=640&q=75"));
  assert.notEqual(allowed.status, 400);
  const other = await fetch(url("/_next/image?url=https%3A%2F%2Fevil.example.org%2Fx.jpg&w=640&q=75"));
  assert.equal(other.status, 400);
});
