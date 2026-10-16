import assert from "node:assert/strict";
import test from "node:test";
import { memoryDb, requestJson, withServer } from "./helpers.js";

test("register, profile and login work without exposing password hash", async () => {
  const db = memoryDb();
  await withServer(db, async (base) => {
    const registered = await requestJson(base, "/auth/register", {
      method: "POST",
      body: { displayName: "Aziza", email: "Aziza@Example.com", password: "strong-pass-123" },
    });
    assert.equal(registered.status, 201);
    assert.equal(registered.body.user.email, "aziza@example.com");
    assert.ok(registered.body.token);
    assert.equal("passwordHash" in registered.body.user, false);

    const profile = await requestJson(base, "/auth/me", { token: registered.body.token });
    assert.equal(profile.status, 200);
    assert.equal(profile.body.user.id, registered.body.user.id);

    const login = await requestJson(base, "/auth/login", {
      method: "POST",
      body: { email: "AZIZA@example.com", password: "strong-pass-123" },
    });
    assert.equal(login.status, 200);
    assert.equal(login.body.user.id, registered.body.user.id);
  });
});

test("duplicate email, invalid credentials and missing token are rejected", async () => {
  await withServer(memoryDb(), async (base) => {
    const input = { displayName: "Teacher", email: "teacher@example.com", password: "strong-pass-123" };
    assert.equal((await requestJson(base, "/auth/register", { method: "POST", body: input })).status, 201);
    const duplicate = await requestJson(base, "/auth/register", { method: "POST", body: input });
    assert.equal(duplicate.status, 409);
    assert.equal(duplicate.body.error.code, "EMAIL_TAKEN");
    const wrong = await requestJson(base, "/auth/login", {
      method: "POST",
      body: { email: input.email, password: "wrong" },
    });
    assert.equal(wrong.status, 401);
    assert.equal((await requestJson(base, "/auth/me")).status, 401);
    assert.equal((await requestJson(base, "/auth/me", { token: "tampered" })).status, 401);
  });
});

test("registration validates input", async () => {
  await withServer(memoryDb(), async (base) => {
    const invalid = await requestJson(base, "/auth/register", {
      method: "POST",
      body: { displayName: "A", email: "bad", password: "short" },
    });
    assert.equal(invalid.status, 400);
    assert.equal(invalid.body.error.code, "VALIDATION_ERROR");
  });
});
