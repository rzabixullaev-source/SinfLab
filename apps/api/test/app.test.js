import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/app.js";

async function withServer(db, run) {
  const server = createApp({ db, config: { CORS_ORIGIN: "http://localhost:5173" } }).listen(0);
  try {
    const address = server.address();
    await run("http://127.0.0.1:" + address.port);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("health and readiness respond", async () => {
  let pings = 0;
  await withServer({ command: async () => { pings += 1; } }, async (base) => {
    const health = await fetch(base + "/api/v1/health");
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { status: "ok", service: "sinflab-api" });
    const ready = await fetch(base + "/api/v1/ready");
    assert.equal(ready.status, 200);
    assert.equal(pings, 1);
  });
});

test("unknown route and malformed JSON use one error shape", async () => {
  await withServer({ command: async () => {} }, async (base) => {
    const missing = await fetch(base + "/api/v1/missing");
    assert.equal(missing.status, 404);
    assert.equal((await missing.json()).error.code, "NOT_FOUND");
    const invalid = await fetch(base + "/api/v1/ready", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{",
    });
    assert.equal(invalid.status, 400);
    assert.equal((await invalid.json()).error.code, "BAD_JSON");
  });
});
