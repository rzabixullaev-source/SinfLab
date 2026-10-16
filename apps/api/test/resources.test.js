import assert from "node:assert/strict";
import test from "node:test";
import { memoryDb, requestJson, withServer } from "./helpers.js";

test("folders stay within their room and only staff can create them", async () => {
  await withServer(memoryDb(), async (base) => {
    async function register(name) {
      const result = await requestJson(base, "/auth/register", {
        method: "POST", body: { displayName: name, email: name + "@example.com", password: "strong-pass-123" },
      });
      return result.body;
    }
    const teacher = await register("Teacher");
    const student = await register("Student");
    const room = await requestJson(base, "/classrooms", {
      method: "POST", token: teacher.token, body: { name: "Chemistry room", mode: "course" },
    });
    const other = await requestJson(base, "/classrooms", {
      method: "POST", token: teacher.token, body: { name: "Other room", mode: "course" },
    });
    const roomId = room.body.classroom.id;
    const route = "/classrooms/" + roomId + "/folders";
    const invite = await requestJson(base, "/classrooms/" + roomId + "/invites", {
      method: "POST", token: teacher.token, body: {},
    });
    await requestJson(base, "/classrooms/join", {
      method: "POST", token: student.token, body: { code: invite.body.invite.code },
    });
    assert.equal((await requestJson(base, route, {
      method: "POST", token: student.token, body: { name: "Illegal" },
    })).status, 403);
    const parent = await requestJson(base, route, {
      method: "POST", token: teacher.token, body: { name: "Week 1" },
    });
    assert.equal(parent.status, 201);
    const child = await requestJson(base, route, {
      method: "POST", token: teacher.token,
      body: { name: "Lab notes", parentId: parent.body.folder.id },
    });
    assert.equal(child.status, 201);
    assert.equal((await requestJson(base, route, { token: student.token })).body.folders.length, 2);
    assert.equal((await requestJson(base, "/classrooms/" + other.body.classroom.id + "/folders", {
      method: "POST", token: teacher.token,
      body: { name: "Cross room", parentId: parent.body.folder.id },
    })).status, 404);
  });
});

test("staff uploads a file and only room members can download it", async () => {
  await withServer(memoryDb(), async (base) => {
    async function register(name) {
      const result = await requestJson(base, "/auth/register", {
        method: "POST", body: { displayName: name, email: name + "@example.com", password: "strong-pass-123" },
      });
      return result.body;
    }
    const teacher = await register("Owner");
    const student = await register("Pupil");
    const outsider = await register("Stranger");
    const room = await requestJson(base, "/classrooms", {
      method: "POST", token: teacher.token, body: { name: "Physics room", mode: "course" },
    });
    const roomId = room.body.classroom.id;
    const route = "/api/v1/classrooms/" + roomId + "/assets";
    const invite = await requestJson(base, "/classrooms/" + roomId + "/invites", {
      method: "POST", token: teacher.token, body: {},
    });
    await requestJson(base, "/classrooms/join", {
      method: "POST", token: student.token, body: { code: invite.body.invite.code },
    });
    const headers = {
      authorization: "Bearer " + teacher.token, "content-type": "application/octet-stream",
      "x-file-name": encodeURIComponent("O‘zbek darsi.txt"), "x-file-mime": "text/plain",
    };
    const uploaded = await fetch(base + route, {
      method: "POST", headers, body: Buffer.from("Ohm qonuni"),
    });
    assert.equal(uploaded.status, 201);
    const { asset } = await uploaded.json();
    assert.equal(asset.byteSize, Buffer.byteLength("Ohm qonuni"));
    assert.equal(asset.filename, "O‘zbek darsi.txt");
    const listed = await requestJson(base, "/classrooms/" + roomId + "/assets", { token: student.token });
    assert.equal(listed.body.assets.length, 1);
    const downloadPath = route + "/" + asset.id + "/download";
    const studentDownload = await fetch(base + downloadPath, {
      headers: { authorization: "Bearer " + student.token },
    });
    assert.equal(studentDownload.status, 200);
    assert.equal(await studentDownload.text(), "Ohm qonuni");
    const outsiderDownload = await fetch(base + downloadPath, {
      headers: { authorization: "Bearer " + outsider.token },
    });
    assert.equal(outsiderDownload.status, 404);
    const studentUpload = await fetch(base + route, {
      method: "POST", headers: { ...headers, authorization: "Bearer " + student.token }, body: "not allowed",
    });
    assert.equal(studentUpload.status, 403);
    const oversized = await fetch(base + route, {
      method: "POST", headers, body: Buffer.alloc(10 * 1024 * 1024 + 1),
    });
    assert.equal(oversized.status, 413);
  });
});
