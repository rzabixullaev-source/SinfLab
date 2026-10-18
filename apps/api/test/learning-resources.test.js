import assert from "node:assert/strict";
import test from "node:test";
import { memoryDb, requestJson, withServer } from "./helpers.js";

test("lesson and homework resources accept links and documents with classroom permissions", async () => {
  await withServer(memoryDb(), async (base) => {
    const register = async (name) => (await requestJson(base, "/auth/register", { method: "POST", body: {
      displayName: name, email: `${name.toLowerCase()}@example.com`, password: "strong-pass-123",
    } })).body;
    const teacher = await register("ResourceTeacher");
    const student = await register("ResourceStudent");
    const outsider = await register("ResourceOutsider");
    const room = (await requestJson(base, "/classrooms", { method: "POST", token: teacher.token,
      body: { name: "Math resources", mode: "course" } })).body.classroom;
    const root = `/classrooms/${room.id}`;
    const invite = (await requestJson(base, root + "/invites", { method: "POST", token: teacher.token, body: {} })).body.invite;
    await requestJson(base, "/classrooms/join", { method: "POST", token: student.token, body: { code: invite.code } });
    const lesson = (await requestJson(base, root + "/lessons", { method: "POST", token: teacher.token,
      body: { title: "Fractions", description: "Adding fractions" } })).body.lesson;
    const homework = (await requestJson(base, root + "/assignments", { method: "POST", token: teacher.token,
      body: { title: "Practice fractions", instructions: "Solve the worksheet", lessonId: lesson.id } })).body.assignment;
    const lessonPath = `${root}/content/lesson/${lesson.id}`;
    const homeworkPath = `${root}/content/assignment/${homework.id}`;
    assert.equal((await requestJson(base, lessonPath + "/links", { method: "POST", token: student.token,
      body: { title: "Video", url: "https://example.com/video" } })).status, 403);
    assert.equal((await requestJson(base, lessonPath + "/links", { method: "POST", token: teacher.token,
      body: { title: "Bad link", url: "javascript:alert(1)" } })).status, 400);
    const link = await requestJson(base, lessonPath + "/links", { method: "POST", token: teacher.token,
      body: { title: "Video", url: "https://example.com/video" } });
    assert.equal(link.status, 201);
    assert.equal((await requestJson(base, lessonPath, { token: student.token })).body.resources[0].title, "Video");
    assert.equal((await requestJson(base, lessonPath, { token: outsider.token })).status, 404);

    const upload = await fetch(base + "/api/v1" + homeworkPath + "/files", { method: "POST", headers: {
      authorization: `Bearer ${teacher.token}`, "content-type": "application/octet-stream",
      "x-file-name": "worksheet.xlsx", "x-file-mime": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }, body: Buffer.from("test spreadsheet") });
    assert.equal(upload.status, 201);
    const file = (await upload.json()).resource;
    const downloadPath = `${root}/learning-files/${file.id}/download`;
    assert.equal((await requestJson(base, homeworkPath, { token: student.token })).status, 404);
    assert.equal((await fetch(base + "/api/v1" + downloadPath, { headers: { authorization: `Bearer ${student.token}` } })).status, 404);
    await requestJson(base, `${root}/assignments/${homework.id}/publish`, { method: "POST", token: teacher.token });
    assert.equal((await requestJson(base, homeworkPath, { token: student.token })).body.resources.length, 1);
    const download = await fetch(base + "/api/v1" + downloadPath, { headers: { authorization: `Bearer ${student.token}` } });
    assert.equal(download.status, 200);
    assert.equal(await download.text(), "test spreadsheet");
    assert.equal((await requestJson(base, `${root}/learning-resources/${file.id}`, { method: "DELETE", token: student.token })).status, 403);
    assert.equal((await fetch(base + "/api/v1" + `${root}/learning-resources/${file.id}`, { method: "DELETE",
      headers: { authorization: `Bearer ${teacher.token}` } })).status, 204);
  });
});
