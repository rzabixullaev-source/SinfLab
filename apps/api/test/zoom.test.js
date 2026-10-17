import assert from "node:assert/strict";
import test from "node:test";
import jwt from "jsonwebtoken";
import { createApp } from "../src/app.js";
import { memoryDb, requestJson } from "./helpers.js";

test("Zoom classroom alert and hand approval stay inside the selected group", async () => {
  const db = memoryDb();
  const config = {
    CORS_ORIGIN: "http://localhost:5173",
    JWT_SECRET: "a-long-secret-for-local-tests-only-0123456789",
    ZOOM_VIDEO_SDK_KEY: "test-video-sdk-key",
    ZOOM_VIDEO_SDK_SECRET: "test-video-sdk-secret",
  };
  const server = createApp({ db, config }).listen(0);
  const base = "http://127.0.0.1:" + server.address().port;
  try {
    async function register(name) {
      const result = await requestJson(base, "/auth/register", {
        method: "POST", body: { displayName: name, email: name.toLowerCase() + "@example.com", password: "strong-pass-123" },
      });
      return result.body;
    }
    const teacher = await register("Teacher");
    const student = await register("Student");
    const outsider = await register("Outsider");
    const room = await requestJson(base, "/classrooms", {
      method: "POST", token: teacher.token, body: { name: "Fizika guruhi", mode: "course" },
    });
    const roomId = room.body.classroom.id;
    const invite = await requestJson(base, "/classrooms/" + roomId + "/invites", {
      method: "POST", token: teacher.token, body: {},
    });
    await requestJson(base, "/classrooms/join", {
      method: "POST", token: student.token, body: { code: invite.body.invite.code },
    });
    const route = "/classrooms/" + roomId + "/live-sessions";
    assert.equal((await requestJson(base, route + "/zoom", {
      method: "POST", token: student.token, body: { title: "Bugungi fizika darsi" },
    })).status, 403);
    const created = await requestJson(base, route + "/zoom", {
      method: "POST", token: teacher.token, body: { title: "Bugungi fizika darsi" },
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.session.provider, "zoom_video_sdk");
    assert.equal(created.body.session.status, "preparing");
    assert.equal(created.body.session.classroomId, roomId);
    const sessionId = created.body.session.id;
    const path = route + "/" + sessionId;
    assert.deepEqual((await requestJson(base, "/classrooms/live-alerts", { token: student.token })).body.alerts, []);
    assert.equal((await requestJson(base, path + "/hand", { token: outsider.token })).status, 404);
    assert.equal((await requestJson(base, path + "/zoom-token", {
      method: "POST", token: outsider.token,
    })).status, 404);

    assert.equal((await requestJson(base, path + "/zoom-token", {
      method: "POST", token: student.token,
    })).status, 409);
    const hostToken = await requestJson(base, path + "/zoom-token", { method: "POST", token: teacher.token });
    assert.equal(jwt.verify(hostToken.body.token, config.ZOOM_VIDEO_SDK_SECRET).role_type, 1);
    assert.equal(jwt.verify(hostToken.body.token, config.ZOOM_VIDEO_SDK_SECRET).video_webrtc_mode, 1);
    assert.equal((await requestJson(base, path + "/activate", { method: "POST", token: student.token })).status, 403);
    assert.equal((await requestJson(base, path + "/activate", { method: "POST", token: teacher.token })).body.session.status, "live");
    const alerts = await requestJson(base, "/classrooms/live-alerts", { token: student.token });
    assert.equal(alerts.body.alerts.length, 1);
    assert.equal(alerts.body.alerts[0].classroomName, "Fizika guruhi");
    assert.deepEqual((await requestJson(base, "/classrooms/live-alerts", { token: outsider.token })).body.alerts, []);
    const studentToken = await requestJson(base, path + "/zoom-token", { method: "POST", token: student.token });
    assert.equal(studentToken.status, 200);
    assert.equal(jwt.verify(studentToken.body.token, config.ZOOM_VIDEO_SDK_SECRET).role_type, 0);
    assert.equal(hostToken.body.sessionName, studentToken.body.sessionName);

    const raised = await requestJson(base, path + "/hand/raise", { method: "POST", token: student.token });
    assert.equal(raised.status, 201);
    assert.equal(raised.body.hand.status, "raised");
    assert.equal((await requestJson(base, path + "/hand", { token: teacher.token })).body.hands[0].displayName, "Student");
    assert.equal((await requestJson(base, path + "/hand/decision", {
      method: "POST", token: student.token, body: { studentId: student.user.id, decision: "approve" },
    })).status, 403);
    const approve = await requestJson(base, path + "/hand/decision", {
      method: "POST", token: teacher.token, body: { studentId: student.user.id, decision: "approve" },
    });
    assert.equal(approve.body.hand.status, "approved");
    assert.equal((await requestJson(base, path + "/hand", { token: student.token })).body.hand.status, "approved");
    const revoke = await requestJson(base, path + "/hand/decision", {
      method: "POST", token: teacher.token, body: { studentId: student.user.id, decision: "revoke" },
    });
    assert.equal(revoke.body.hand.status, "revoked");
    assert.equal((await requestJson(base, path + "/hand/raise", {
      method: "POST", token: student.token,
    })).body.hand.status, "raised");
    assert.equal((await requestJson(base, path + "/hand/decision", {
      method: "POST", token: teacher.token, body: { studentId: student.user.id, decision: "deny" },
    })).body.hand.status, "denied");
    await requestJson(base, path + "/end", { method: "POST", token: teacher.token });
    assert.deepEqual((await requestJson(base, "/classrooms/live-alerts", { token: student.token })).body.alerts, []);
    assert.equal((await requestJson(base, path + "/hand/raise", { method: "POST", token: student.token })).status, 409);
    assert.equal((await requestJson(base, path + "/zoom-token", { method: "POST", token: student.token })).status, 409);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
