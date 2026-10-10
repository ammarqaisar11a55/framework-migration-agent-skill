import { test } from "node:test";
import assert from "node:assert/strict";
import { textOf, startServer } from "./server.mjs";

const url = startServer();

test("the post page reads params, searchParams, cookies and headers", async () => {
  const response = await fetch(url("/blog/hello?ref=news"), { headers: { cookie: "theme=dark", "x-client": "test-suite" } });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>Post hello<\/title>/);
  assert.match(textOf(html), /Post hello Referrer news Theme dark Client test-suite/);
});

test("defaults apply without the query, cookie and header", async () => {
  const html = await (await fetch(url("/blog/other"))).text();
  assert.match(textOf(html), /Post other Referrer none Theme light Client unknown/);
});

test("the route handler reads params and headers", async () => {
  const response = await fetch(url("/api/greet/ada"), { headers: { "accept-language": "fr,en;q=0.5" } });
  assert.deepEqual(await response.json(), { greeting: "Hello ada", language: "fr" });
});

test("the home page links to a post", async () => {
  const html = await (await fetch(url("/"))).text();
  assert.match(html, /href="\/blog\/hello"/);
});
