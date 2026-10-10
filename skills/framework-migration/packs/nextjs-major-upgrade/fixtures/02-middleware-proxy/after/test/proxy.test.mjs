import { test } from "node:test";
import assert from "node:assert/strict";
import { textOf, startServer } from "./server.mjs";

const url = startServer();

test("/old redirects to /new", async () => {
  const response = await fetch(url("/old"), { redirect: "manual" });
  assert.equal(response.status, 307);
  assert.equal(new URL(response.headers.get("location"), url("/")).pathname, "/new");
});

test("matched pages pass through with the header the interceptor adds", async () => {
  const response = await fetch(url("/new"));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-proxied"), "1");
  assert.match(textOf(await response.text()), /New page/);
});

test("the account page needs a session cookie", async () => {
  const anonymous = await fetch(url("/account"), { redirect: "manual" });
  assert.equal(anonymous.status, 307);
  assert.equal(new URL(anonymous.headers.get("location"), url("/")).search, "?login=1");
  const signedIn = await fetch(url("/account"), { headers: { cookie: "session=abc" } });
  assert.match(textOf(await signedIn.text()), /Your account/);
});
