import assert from "node:assert/strict";
import test from "node:test";
import { mapTowns, townForSubject } from "../src/features/subject-map.js";

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
