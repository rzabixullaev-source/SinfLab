import assert from "node:assert/strict";
import test from "node:test";
import { memoryDb, requestJson, withServer } from "./helpers.js";

test("Ohm lab calculates current and isolates each student's run history", async () => {
  await withServer(memoryDb(), async (base) => {
    async function register(name) {
      const result = await requestJson(base, "/auth/register", {
        method: "POST", body: { displayName: name, email: name + "@example.com", password: "strong-pass-123" },
      });
      return result.body;
    }
    const teacher = await register("Teacher");
    const student = await register("Student");
    const peer = await register("Peer");
    const room = await requestJson(base, "/classrooms", {
      method: "POST", token: teacher.token, body: { name: "Physics room", mode: "course" },
    });
    const roomId = room.body.classroom.id;
    const invite = await requestJson(base, "/classrooms/" + roomId + "/invites", {
      method: "POST", token: teacher.token, body: {},
    });
    for (const learner of [student, peer]) {
      await requestJson(base, "/classrooms/join", {
        method: "POST", token: learner.token, body: { code: invite.body.invite.code },
      });
    }
    const route = "/classrooms/" + roomId + "/labs";
    const created = await requestJson(base, route, {
      method: "POST", token: teacher.token,
      body: { title: "Ohm simulation", maxVoltage: 12, minResistance: 2, maxResistance: 20 },
    });
    assert.equal(created.status, 201);
    const runRoute = route + "/" + created.body.lab.id + "/runs";
    assert.equal((await requestJson(base, runRoute, {
      method: "POST", token: student.token,
      body: { voltage: 20, resistance: 4, predictedCurrent: 5 },
    })).status, 400);
    const run = await requestJson(base, runRoute, {
      method: "POST", token: student.token,
      body: { voltage: 12, resistance: 4, predictedCurrent: 3 },
    });
    assert.equal(run.status, 201);
    assert.equal(run.body.run.actualCurrent, 3);
    assert.equal(run.body.run.power, 36);
    assert.equal(run.body.run.correct, true);
    assert.equal((await requestJson(base, runRoute, { token: peer.token })).body.runs.length, 0);
    assert.equal((await requestJson(base, runRoute, { token: teacher.token })).body.runs.length, 1);
    assert.equal((await requestJson(base, runRoute, {
      method: "POST", token: teacher.token,
      body: { voltage: 12, resistance: 4, predictedCurrent: 3 },
    })).status, 403);
  });
});
