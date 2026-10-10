import { test } from "node:test";
import assert from "node:assert/strict";
import { startServer } from "./server.mjs";

const url = startServer();

test("the edge middleware tags API responses", async () => {
  const response = await fetch(url("/api/geo"), { headers: { "x-country": "NZ" } });
  assert.equal(response.headers.get("x-edge-country"), "NZ");
  assert.deepEqual(await response.json(), { country: "NZ" });
});
