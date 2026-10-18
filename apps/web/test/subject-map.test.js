import assert from "node:assert/strict";
import test from "node:test";
import { buildLearningPath, mapTowns, townForSubject } from "../src/features/subject-map.js";

test("subject towns group classrooms by their subject and keep unfamiliar subjects", () => {
  assert.equal(townForSubject("Fizika 9-sinf"), "physics");
  assert.equal(townForSubject("Ingliz tili"), "language");
  const towns = mapTowns([
    { id: "a", subject: "Fizika" },
    { id: "b", subject: "Biologiya" },
    { id: "c", subject: "Tarix" },
  ]);
  assert.deepEqual(towns.find((item) => item.id === "physics").rooms.map((item) => item.id), ["a"]);
  assert.deepEqual(towns.find((item) => item.id === "biology").rooms.map((item) => item.id), ["b"]);
  assert.deepEqual(towns.find((item) => item.id === "other").rooms.map((item) => item.id), ["c"]);
});

test("learning path groups published work under its lesson and preserves source data", () => {
  const lessons = [
    { id: "later", title: "Ikkinchi dars", createdAt: "2026-01-02T00:00:00Z" },
    { id: "first", title: "Birinchi dars", createdAt: "2026-01-01T00:00:00Z" },
  ];
  const path = buildLearningPath({
    lessons,
    assignments: [
      { id: "a", title: "Uy vazifasi", lessonId: "first", status: "published", createdAt: "2026-01-01T01:00:00Z" },
      { id: "draft", lessonId: "first", status: "draft" },
    ],
    quizzes: [{ id: "q", title: "Test", lessonId: "first", status: "published", createdAt: "2026-01-01T02:00:00Z" }],
    labs: [{ id: "lab", title: "Tajriba", lessonId: "later", createdAt: "2026-01-02T01:00:00Z" }],
    progress: { assignmentsToDo: [{ id: "a" }], reviewQueue: [{ id: "q", kind: "quiz" }, { id: "lab", kind: "lab" }] },
  });
  assert.deepEqual(path.map((item) => item.id), ["first", "a", "q", "later", "lab"]);
  assert.deepEqual(path.map((item) => item.state), ["available", "todo", "review", "available", "review"]);
  assert.deepEqual(path.map((item) => item.tab), ["lessons", "assignments", "quizzes", "lessons", "labs"]);
  assert.deepEqual(lessons.map((item) => item.id), ["later", "first"]);
});

test("unlinked work follows lessons and future lessons remain upcoming", () => {
  const path = buildLearningPath({
    lessons: [{ id: "future", startsAt: "2099-01-01T00:00:00Z" }],
    quizzes: [{ id: "q", status: "published", createdAt: "2026-01-01T00:00:00Z" }],
    progress: { quizzesToDo: [{ id: "q" }] },
  });
  assert.deepEqual(path.map((item) => [item.id, item.state]), [["future", "upcoming"], ["q", "todo"]]);
});
