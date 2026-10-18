import assert from "node:assert/strict";
import test from "node:test";
import jwt from "jsonwebtoken";
import { WebSocket } from "ws";
import { createApp } from "../src/app.js";
import { attachLiveSignaling } from "../src/modules/live/signaling.js";
import { memoryDb, requestJson } from "./helpers.js";

test("linked parent receives live alert, Zoom observer token, and browser watch access", async () => {
  const db = memoryDb();
  const config = { CORS_ORIGIN: "http://localhost:5173", JWT_SECRET: "a-long-secret-for-local-tests-only-0123456789", ZOOM_VIDEO_SDK_KEY: "test-key", ZOOM_VIDEO_SDK_SECRET: "test-secret", LIVE_TURN_URL: "turns:turn.example.com:5349", LIVE_TURN_USERNAME: "test-user", LIVE_TURN_CREDENTIAL: "test-credential" };
  const server = createApp({ db, config }).listen(0);
  attachLiveSignaling(server, { db, config });
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const register = async (name) => (await requestJson(base, "/auth/register", { method: "POST", body: { displayName: name, email: `${name.toLowerCase()}@example.com`, password: "strong-pass-123" } })).body;
    const teacher = await register("ObserverTeacher");
    const student = await register("ObserverStudent");
    const parent = await register("ObserverParent");
    const outsider = await register("ObserverOutsider");
    const room = (await requestJson(base, "/classrooms", { method: "POST", token: teacher.token, body: { name: "Chemistry", mode: "course" } })).body.classroom;
    const root = `/classrooms/${room.id}`;
    const invite = (await requestJson(base, root + "/invites", { method: "POST", token: teacher.token, body: { role: "student" } })).body.invite;
    await requestJson(base, "/classrooms/join", { method: "POST", token: student.token, body: { code: invite.code } });
    const code = (await requestJson(base, "/parents/invites", { method: "POST", token: student.token, body: {} })).body.code;
    await requestJson(base, "/parents/link", { method: "POST", token: parent.token, body: { code } });
    const zoom = (await requestJson(base, root + "/live-sessions/zoom", { method: "POST", token: teacher.token, body: { title: "Live chemistry" } })).body.session;
    await requestJson(base, `${root}/live-sessions/${zoom.id}/activate`, { method: "POST", token: teacher.token });
    assert.equal((await requestJson(base, "/parents/live-alerts", { token: outsider.token })).body.alerts.length, 0);
    assert.equal((await requestJson(base, "/parents/live-alerts", { token: parent.token })).body.alerts.length, 1);
    assert.equal((await requestJson(base, `/parents/live-sessions/${zoom.id}/zoom-token`, { method: "POST", token: outsider.token })).status, 404);
    const access = await requestJson(base, `/parents/live-sessions/${zoom.id}/zoom-token`, { method: "POST", token: parent.token });
    assert.equal(access.body.observer, true);
    assert.equal(jwt.verify(access.body.token, config.ZOOM_VIDEO_SDK_SECRET).role_type, 0);
    assert.equal((await requestJson(base, `${root}/live-sessions/${zoom.id}/hand/raise`, { method: "POST", token: parent.token })).status, 404);
    const browser = (await requestJson(base, root + "/live-sessions/browser", { method: "POST", token: teacher.token, body: { title: "Browser chemistry" } })).body.session;
    const icePath = `${root}/live-sessions/${browser.id}/ice-servers`;
    assert.equal((await requestJson(base, icePath, { token: student.token })).status, 409);
    assert.equal((await requestJson(base, icePath, { token: teacher.token })).body.iceServers[1].urls, config.LIVE_TURN_URL);
    await requestJson(base, `${root}/live-sessions/${browser.id}/activate`, { method: "POST", token: teacher.token });
    assert.equal((await requestJson(base, icePath, { token: outsider.token })).status, 404);
    assert.equal((await requestJson(base, icePath, { token: student.token })).body.iceServers[1].username, config.LIVE_TURN_USERNAME);
    assert.equal((await requestJson(base, `/parents/live-sessions/${browser.id}/ice-servers`, { token: outsider.token })).status, 404);
    const parentIce = await requestJson(base, `/parents/live-sessions/${browser.id}/ice-servers`, { token: parent.token });
    assert.equal(parentIce.status, 200);
    assert.equal(parentIce.body.iceServers[1].credential, config.LIVE_TURN_CREDENTIAL);
    const observe = (token) => new Promise((resolve, reject) => {
      const socket = new WebSocket(base.replace("http:", "ws:") + "/api/v1/live-signal", { origin: config.CORS_ORIGIN });
      const timer = setTimeout(() => { socket.terminate(); reject(new Error("WebSocket timed out")); }, 3000);
      socket.on("open", () => socket.send(JSON.stringify({ type: "join", token, classroomId: room.id, sessionId: browser.id })));
      socket.on("message", (raw) => { clearTimeout(timer); const message = JSON.parse(raw); socket.close(); resolve(message); });
      socket.on("close", (code) => { if (code === 1008) { clearTimeout(timer); resolve({ denied: true }); } });
      socket.on("error", (cause) => { clearTimeout(timer); reject(cause); });
    });
    assert.equal((await observe(parent.token)).type, "joined");
    assert.equal((await observe(outsider.token)).denied, true);
  } finally { await new Promise((resolve) => server.close(resolve)); }
});
