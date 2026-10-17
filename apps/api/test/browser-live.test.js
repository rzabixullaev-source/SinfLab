import assert from "node:assert/strict";
import test from "node:test";
import { WebSocket } from "ws";
import { createApp } from "../src/app.js";
import { attachLiveSignaling } from "../src/modules/live/signaling.js";
import { memoryDb, requestJson } from "./helpers.js";

function messageFrom(socket) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("WebSocket message timed out")), 3000);
    socket.once("message", (raw) => { clearTimeout(timer); resolve(JSON.parse(raw.toString())); });
  });
}

async function openSocket(port, origin = "http://localhost:5173") {
  const socket = new WebSocket(`ws://127.0.0.1:${port}/api/v1/live-signal`, { origin });
  await new Promise((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
  return socket;
}

test("browser camera class signals only between its host and students", async () => {
  const db = memoryDb();
  const config = { CORS_ORIGIN: "http://localhost:5173", JWT_SECRET: "browser-live-test-secret-0123456789" };
  const server = createApp({ db, config }).listen(0);
  const signaling = attachLiveSignaling(server, { db, config });
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;
  const sockets = [];
  try {
    const register = async (name) => (await requestJson(base, "/auth/register", {
      method: "POST", body: { displayName: name, email: `${name.toLowerCase()}@example.com`, password: "strong-pass-123" },
    })).body;
    const host = await register("BrowserTeacher");
    const student = await register("BrowserStudent");
    const outsider = await register("BrowserOutsider");
    const classroom = await requestJson(base, "/classrooms", { method: "POST", token: host.token, body: { name: "Kamera guruhi", mode: "course" } });
    const classroomId = classroom.body.classroom.id;
    const invite = await requestJson(base, `/classrooms/${classroomId}/invites`, { method: "POST", token: host.token, body: {} });
    await requestJson(base, "/classrooms/join", { method: "POST", token: student.token, body: { code: invite.body.invite.code } });
    const path = `/classrooms/${classroomId}/live-sessions`;
    const created = await requestJson(base, path + "/browser", { method: "POST", token: host.token, body: { title: "Kamera darsi" } });
    assert.equal(created.status, 201);
    assert.equal(created.body.session.status, "preparing");
    const sessionId = created.body.session.id;
    const hostSocket = await openSocket(port); sockets.push(hostSocket);
    const hostJoined = messageFrom(hostSocket);
    hostSocket.send(JSON.stringify({ type: "join", token: host.token, classroomId, sessionId }));
    assert.equal((await hostJoined).host, true);
    const outsiderSocket = await openSocket(port); sockets.push(outsiderSocket);
    const denied = new Promise((resolve) => outsiderSocket.once("close", (code) => resolve(code)));
    outsiderSocket.send(JSON.stringify({ type: "join", token: outsider.token, classroomId, sessionId }));
    assert.equal(await denied, 1008);
    await requestJson(base, path + `/${sessionId}/activate`, { method: "POST", token: host.token });
    const alerts = await requestJson(base, "/classrooms/live-alerts", { token: student.token });
    assert.equal(alerts.body.alerts[0].session.provider, "browser_webrtc");
    const studentSocket = await openSocket(port); sockets.push(studentSocket);
    const studentJoined = messageFrom(studentSocket);
    const hostNotified = messageFrom(hostSocket);
    studentSocket.send(JSON.stringify({ type: "join", token: student.token, classroomId, sessionId }));
    assert.equal((await studentJoined).host, false);
    assert.equal((await hostNotified).userId, student.user.id);
    const offerReceived = messageFrom(studentSocket);
    hostSocket.send(JSON.stringify({ type: "offer", targetId: student.user.id, description: { type: "offer", sdp: "test-sdp" } }));
    assert.equal((await offerReceived).fromId, host.user.id);
    const answerReceived = messageFrom(hostSocket);
    studentSocket.send(JSON.stringify({ type: "answer", targetId: host.user.id, description: { type: "answer", sdp: "test-answer" } }));
    assert.equal((await answerReceived).description.sdp, "test-answer");
    const raised = await requestJson(base, path + `/${sessionId}/hand/raise`, { method: "POST", token: student.token });
    assert.equal(raised.body.hand.status, "raised");
  } finally {
    sockets.forEach((socket) => socket.terminate());
    signaling.close();
    await new Promise((resolve) => server.close(resolve));
  }
});
