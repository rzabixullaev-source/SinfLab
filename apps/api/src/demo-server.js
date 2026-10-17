import express from "express";
import { createApp } from "./app.js";
import { memoryDb } from "../test/helpers.js";

const db = memoryDb();
const config = {
  CORS_ORIGIN: "http://127.0.0.1:5173",
  JWT_SECRET: "sinflab-demo-only-secret-not-for-production-2026",
  ZOOM_VIDEO_SDK_KEY: process.env.ZOOM_VIDEO_SDK_KEY || "",
  ZOOM_VIDEO_SDK_SECRET: process.env.ZOOM_VIDEO_SDK_SECRET || "",
};
const app = express();
app.get("/api/v1/demo-status", (_request, response) => response.json({ demo: true }));
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
    const room = await call("/classrooms", {
      name: "Fizika 9-sinf", subject: "Fizika", mode: "course",
      description: "Nazariya, tajriba va mustaqil mashqlar bir joyda.",
    }, teacher.token);
    const root = "/classrooms/" + room.classroom.id;
    const invite = await call(root + "/invites", { role: "student" }, teacher.token);
    await call("/classrooms/join", { code: invite.invite.code }, student.token);
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
    console.log("SinfLab demo API: http://127.0.0.1:4000");
    console.log("Teacher: ustoz@sinflab.uz / Demo2026!");
    console.log("Student: oquvchi@sinflab.uz / Demo2026!");
  } catch (error) {
    console.error("Demo seed failed:", error);
    server.close();
    process.exitCode = 1;
  }
});
