import assert from "node:assert/strict";
import test from "node:test";
import { loadConfig } from "../src/config.js";

test("local Atlas config accepts Wi-Fi and localhost origins", () => {
  const config = loadConfig({
    MONGODB_URI: "mongodb+srv://example.invalid/",
    MONGODB_DB: "sinflab",
    JWT_SECRET: "local-test-secret-0123456789-abcdef",
    CORS_ORIGIN: "http://192.168.96.99:5173, http://localhost:5173",
  });
  assert.deepEqual(config.CORS_ORIGIN, ["http://192.168.96.99:5173", "http://localhost:5173"]);
  assert.equal(config.MONGODB_DB, "sinflab");
  assert.equal(config.BIND_HOST, "127.0.0.1");
  assert.equal(config.TRUST_PROXY_HOPS, 0);
});

test("Railway listens on the public container interface", () => {
  const config = loadConfig({
    MONGODB_URI: "mongodb+srv://example.invalid/",
    JWT_SECRET: "local-test-secret-0123456789-abcdef",
    RAILWAY_PROJECT_ID: "test-project",
  });
  assert.equal(config.BIND_HOST, "0.0.0.0");
  assert.equal(config.TRUST_PROXY_HOPS, 1);
});
