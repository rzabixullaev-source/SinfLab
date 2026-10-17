import assert from "node:assert/strict";
import test from "node:test";
import { memoryDb, requestJson, withServer } from "./helpers.js";
import { simulateStudio, studioScenarios, studioTools } from "@sinflab/contracts";

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

test("studio catalog contains ten runnable experiments per requested subject", () => {
  for (const subject of ["chemistry", "physics", "biology", "cybersecurity"]) {
    const group = studioScenarios.filter((item) => item.subject === subject);
    assert.equal(group.length, 10);
    for (const scenario of group) {
      assert.ok(scenario.tools.every((tool) => Boolean(studioTools[tool])));
      assert.ok(scenario.target.every((tool) => scenario.tools.includes(tool)));
      const actions = scenario.target.map((itemId) => ({ type: "add", itemId, amount: 10 }));
      assert.equal(simulateStudio(scenario, actions).correct, true, scenario.id);
      assert.equal(simulateStudio(scenario, [{ type: "add", itemId: scenario.tools.find((item) => !scenario.target.includes(item)), amount: 10 }]).correct, false, scenario.id);
    }
  }
  const neutralization = studioScenarios.find((item) => item.id === "chem-neutralization");
  assert.equal(simulateStudio(neutralization, [
    { type: "add", itemId: "hcl", amount: 10 },
    { type: "add", itemId: "naoh", amount: 10 },
  ]).measurement.value, 7);
  assert.ok(simulateStudio(neutralization, [
    { type: "add", itemId: "hcl", amount: 20 },
    { type: "add", itemId: "naoh", amount: 10 },
  ]).measurement.value < 7);
  const freeMix = simulateStudio(neutralization, [
    { type: "add", itemId: "vinegar", amount: 10 },
    { type: "add", itemId: "bicarbonate", amount: 10 },
  ]);
  assert.equal(freeMix.reaction.effect, "gas");
  assert.equal(freeMix.correct, false);
});

test("teacher assigns studio labs; students manipulate and their journals stay private", async () => {
  await withServer(memoryDb(), async (base) => {
    const register = async (name) => (await requestJson(base, "/auth/register", {
      method: "POST", body: { displayName: name, email: `${name.toLowerCase()}@example.com`, password: "strong-pass-123" },
    })).body;
    const teacher = await register("StudioTeacher");
    const student = await register("StudioStudent");
    const other = await register("StudioOther");
    const room = await requestJson(base, "/classrooms", { method: "POST", token: teacher.token, body: { name: "Studio room", mode: "course" } });
    const roomId = room.body.classroom.id;
    const invite = await requestJson(base, `/classrooms/${roomId}/invites`, { method: "POST", token: teacher.token, body: {} });
    for (const learner of [student, other]) {
      await requestJson(base, "/classrooms/join", { method: "POST", token: learner.token, body: { code: invite.body.invite.code } });
    }
    const path = `/classrooms/${roomId}/labs`;
    for (const scenarioId of ["chem-neutralization", "phys-ramp", "bio-osmosis", "cyber-firewall"]) {
      const scenario = studioScenarios.find((item) => item.id === scenarioId);
      const created = await requestJson(base, path, {
        method: "POST", token: teacher.token, body: { kind: "studio", scenarioId, title: scenario.title },
      });
      assert.equal(created.status, 201);
      assert.equal(created.body.lab.scenarioId, scenarioId);
      const runPath = `${path}/${created.body.lab.id}/runs`;
      const actions = scenario.target.map((itemId) => ({ type: "add", itemId, amount: 10 }));
      const result = await requestJson(base, runPath, { method: "POST", token: student.token, body: { actions } });
      assert.equal(result.status, 201);
      assert.equal(result.body.run.correct, true);
      assert.equal(result.body.run.score, 100);
      assert.ok(result.body.run.observation.length > 5);
      assert.equal((await requestJson(base, runPath, { token: other.token })).body.runs.length, 0);
      assert.equal((await requestJson(base, runPath, { token: teacher.token })).body.runs.length, 1);
      assert.equal((await requestJson(base, runPath, {
        method: "POST", token: student.token,
        body: { actions: [{ type: "add", itemId: "unknown-tool", amount: 10 }] },
      })).status, 400);
    }
    assert.equal((await requestJson(base, path, {
      method: "POST", token: student.token,
      body: { kind: "studio", scenarioId: "chem-neutralization", title: "Unauthorized" },
    })).status, 403);
  });
});
