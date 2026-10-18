import express from "express";
import { fileURLToPath } from "node:url";
import { config as loadDotEnv } from "dotenv";
import { createApp } from "./app.js";
import { memoryDb } from "../test/helpers.js";
import { attachLiveSignaling } from "./modules/live/signaling.js";

loadDotEnv({ path: fileURLToPath(new URL("../.env", import.meta.url)) });
const db = memoryDb();
const config = {
  CORS_ORIGIN: [
    "http://127.0.0.1:5173",
    "http://localhost:5173",
    ...(process.env.DEMO_WEB_ORIGIN ? [process.env.DEMO_WEB_ORIGIN] : []),
  ],
  JWT_SECRET: "sinflab-demo-only-secret-not-for-production-2026",
  ZOOM_VIDEO_SDK_KEY: process.env.ZOOM_VIDEO_SDK_KEY || "",
  ZOOM_VIDEO_SDK_SECRET: process.env.ZOOM_VIDEO_SDK_SECRET || "",
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
  GEMINI_MODEL: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
};
let finishSeed;
const seeded = new Promise((resolve) => { finishSeed = resolve; });
const app = express();
app.get("/api/v1/demo-status", async (_request, response) => {
  await seeded;
  response.json({ demo: true });
});
app.use(createApp({ db, config }));

const server = app.listen(4000, "127.0.0.1", async () => {
  const base = "http://127.0.0.1:4000/api/v1";
  async function call(path, body, token) {
    const response = await fetch(base + path, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: "Bearer " + token } : {}),
      },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(path + ": " + JSON.stringify(data));
    return data;
  }

  try {
    const teacher = await call("/auth/register", {
      displayName: "Dilshod Karimov", email: "ustoz@sinflab.uz", password: "Demo2026!",
    });
    const student = await call("/auth/register", {
      displayName: "Madina Aliyeva", email: "oquvchi@sinflab.uz", password: "Demo2026!",
    });
    const parent = await call("/auth/register", {
      displayName: "Madina ota-onasi", email: "otaona@sinflab.uz", password: "Demo2026!",
    });
    const room = await call("/classrooms", {
      name: "Fizika 9-sinf", subject: "Fizika", mode: "course",
      description: "Nazariya, tajriba va mustaqil mashqlar bir joyda.",
    }, teacher.token);
    const root = "/classrooms/" + room.classroom.id;
    const invite = await call(root + "/invites", { role: "student" }, teacher.token);
    await call("/classrooms/join", { code: invite.invite.code }, student.token);
    const parentInvite = await call("/parents/invites", {}, student.token);
    await call("/parents/link", { code: parentInvite.code }, parent.token);
    const lesson = await call(root + "/lessons", {
      title: "Elektr zanjiri va Om qonuni",
      description: "Tok kuchi, kuchlanish va qarshilik orasidagi bog‘lanishni tajribada ko‘ramiz.",
      startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }, teacher.token);
    await call(root + "/messages", { body: "Assalomu alaykum! Ertangi dars uchun 1-bobni o‘qib keling." }, teacher.token);
    await call(root + "/messages", { body: "Laboratoriya mashqini ham bajaramizmi?" }, student.token);
    const assignment = await call(root + "/assignments", {
      title: "Om qonuni: 5 ta masala", instructions: "Kuchlanish va qarshilikdan tok kuchini toping. Yechim bosqichlarini yozing.",
      lessonId: lesson.lesson.id,
    }, teacher.token);
    await call(root + "/assignments/" + assignment.assignment.id + "/publish", {}, teacher.token);
    const quiz = await call(root + "/quizzes", {
      title: "Elektr zanjiri: tezkor test", lessonId: lesson.lesson.id,
      questions: [
        { prompt: "Tok kuchining o‘lchov birligi qaysi?", choices: ["Volt", "Amper", "Om"], correctIndex: 1 },
        { prompt: "Om qonunining formulasi qaysi?", choices: ["I = U / R", "I = U × R", "R = U × I"], correctIndex: 0 },
      ],
    }, teacher.token);
    await call(root + "/quizzes/" + quiz.quiz.id + "/publish", {}, teacher.token);
    await call(root + "/labs", { title: "Virtual elektr zanjiri", lessonId: lesson.lesson.id }, teacher.token);
    for (const [scenarioId, title] of [
      ["chem-carbon-dioxide", "Sirka va soda reaksiyasi"],
      ["phys-ramp", "Qiya tekislik sinovi"],
      ["bio-osmosis", "Hujayra osmosi"],
      ["cyber-firewall", "Tarmoq qoidasi sinovi"],
    ]) {
      await call(root + "/labs", { kind: "studio", scenarioId, title, lessonId: lesson.lesson.id }, teacher.token);
    }
    console.log("SinfLab demo API: http://127.0.0.1:4000");
    console.log("Teacher: ustoz@sinflab.uz / Demo2026!");
    console.log("Student: oquvchi@sinflab.uz / Demo2026!");
    console.log("Parent: otaona@sinflab.uz / Demo2026!");
    finishSeed();
  } catch (error) {
    console.error("Demo seed failed:", error);
    server.close();
    process.exitCode = 1;
  }
});
attachLiveSignaling(server, { db, config });
