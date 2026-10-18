import assert from "node:assert/strict";
import test from "node:test";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
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
      body: { email: " AZIZA@example.com ", password: "strong-pass-123" },
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

test("legacy account with stored role signs in with email and password only", async () => {
  const db = memoryDb();
  await db.collection("users").insertOne({
    _id: new ObjectId(), displayName: "Old Teacher", emailLower: "old@example.com",
    accountRole: "teacher", passwordHash: await bcrypt.hash("strong-pass-123", 4),
    createdAt: new Date(), updatedAt: new Date(),
  });
  await withServer(db, async (base) => {
    const login = await requestJson(base, "/auth/login", {
      method: "POST", body: { email: "old@example.com", password: "strong-pass-123" },
    });
    assert.equal(login.status, 200);
    assert.equal(login.body.user.displayName, "Old Teacher");
    assert.equal((await requestJson(base, "/auth/me", { token: login.body.token })).status, 200);
  });
});

test("login limits repeated attempts per account without blocking classmates", async () => {
  await withServer(memoryDb(), async (base) => {
    const registered = await requestJson(base, "/auth/register", {
      method: "POST", body: { displayName: "Real Student", email: "real@example.com", password: "strong-pass-123" },
    });
    assert.equal(registered.status, 201);
    for (let index = 0; index < 40; index += 1) {
      const result = await requestJson(base, "/auth/login", {
        method: "POST", body: { email: `student${index}@example.com`, password: "incorrect" },
      });
      assert.equal(result.status, 401);
    }
    assert.equal((await requestJson(base, "/auth/login", {
      method: "POST", body: { email: "real@example.com", password: "strong-pass-123" },
    })).status, 200);
    for (let index = 0; index < 15; index += 1) {
      const result = await requestJson(base, "/auth/login", {
        method: "POST", body: { email: index % 2 ? " BLOCKED@EXAMPLE.COM " : "blocked@example.com", password: "incorrect" },
      });
      assert.equal(result.status, 401);
    }
    const blocked = await requestJson(base, "/auth/login", {
      method: "POST", body: { email: "blocked@example.com", password: "incorrect" },
    });
    assert.equal(blocked.status, 429);
    assert.equal(blocked.body.error.code, "AUTH_RATE_LIMIT");
    assert.equal((await requestJson(base, "/auth/login", {
      method: "POST", body: { email: "another@example.com", password: "incorrect" },
    })).status, 401);
  });
});

test("account with missing password hash returns invalid credentials", async () => {
  const db = memoryDb();
  await db.collection("users").insertOne({ _id: new ObjectId(), emailLower: "broken@example.com", displayName: "Broken" });
  await withServer(db, async (base) => {
    const result = await requestJson(base, "/auth/login", {
      method: "POST", body: { email: "broken@example.com", password: "any-password" },
    });
    assert.equal(result.status, 401);
    assert.equal(result.body.error.code, "INVALID_CREDENTIALS");
  });
});

test("simultaneous registration uses the same email error as an ordinary duplicate", async () => {
  await withServer(memoryDb(), async (base) => {
    const body = { displayName: "New Student", email: "new@example.com", password: "strong-pass-123" };
    const attempts = await Promise.all(Array.from({ length: 2 }, () => requestJson(base, "/auth/register", { method: "POST", body })));
    assert.deepEqual(attempts.map((item) => item.status).sort(), [201, 409]);
    assert.equal(attempts.find((item) => item.status === 409).body.error.code, "EMAIL_TAKEN");
  });
});
