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

test("pendulum, titration, osmosis and linear labs calculate and protect student runs", async () => {
  await withServer(memoryDb(), async (base) => {
    const register = async (name) => (await requestJson(base, "/auth/register", {
      method: "POST", body: { displayName: name, email: `${name.toLowerCase()}@example.com`, password: "strong-pass-123" },
    })).body;
    const teacher = await register("LabTeacher");
    const student = await register("LabStudent");
    const outsider = await register("LabOutsider");
    const room = await requestJson(base, "/classrooms", { method: "POST", token: teacher.token, body: { name: "Science studio", mode: "course" } });
    const classroomId = room.body.classroom.id;
    const invite = await requestJson(base, `/classrooms/${classroomId}/invites`, { method: "POST", token: teacher.token, body: {} });
    await requestJson(base, "/classrooms/join", { method: "POST", token: student.token, body: { code: invite.body.invite.code } });
    const path = `/classrooms/${classroomId}/labs`;
    const cases = [
      { kind: "physics-pendulum", config: { gravity: 9.81, minLength: 0.3, maxLength: 2 }, run: { length: 1, amplitudeDegrees: 10, predictedPeriod: 2.01 }, result: "actualPeriod" },
      { kind: "chemistry-titration", config: { acidMolarity: 0.1, acidVolumeMl: 25, baseMolarity: 0.1, maxBaseVolumeMl: 50 }, run: { baseVolumeMl: 25, predictedPh: 7 }, result: "actualPh", expected: 7 },
      { kind: "biology-osmosis", config: { insideSolutePercent: 5 }, run: { outsideSolutePercent: 2, predictedDirection: "in" }, result: "actualDirection", expected: "in" },
      { kind: "mathematics-linear", config: { slope: 2, intercept: 1 }, run: { x: 4, predictedY: 9 }, result: "actualY", expected: 9 },
    ];
    for (const [index, item] of cases.entries()) {
      const created = await requestJson(base, path, { method: "POST", token: teacher.token, body: { kind: item.kind, title: `Experiment ${index}`, ...item.config } });
      assert.equal(created.status, 201);
      assert.equal(created.body.lab.kind, item.kind);
      const runsPath = `${path}/${created.body.lab.id}/runs`;
      assert.equal((await requestJson(base, runsPath, { method: "POST", token: teacher.token, body: item.run })).status, 403);
      const run = await requestJson(base, runsPath, { method: "POST", token: student.token, body: item.run });
      assert.equal(run.status, 201);
      assert.equal(run.body.run.correct, true);
      if (item.expected !== undefined) assert.equal(run.body.run[item.result], item.expected);
      else assert.ok(Math.abs(run.body.run[item.result] - 2.01) < 0.03);
      assert.equal((await requestJson(base, runsPath, { token: outsider.token })).status, 404);
      assert.equal((await requestJson(base, runsPath, { token: student.token })).body.runs.length, 1);
    }
  });
});
