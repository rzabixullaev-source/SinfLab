const towns = [
  { id: "math", name: "Matematika", icon: "π", theme: "math", tagline: "Shakllar va mantiq shahri", aliases: ["matematika", "mathematics", "math", "algebra", "geometriya"] },
  { id: "physics", name: "Fizika", icon: "⚛", theme: "physics", tagline: "Harakat va kashfiyot markazi", aliases: ["fizika", "physics"] },
  { id: "chemistry", name: "Kimyo", icon: "⚗", theme: "chemistry", tagline: "Reaksiyalar laboratoriyasi", aliases: ["kimyo", "chemistry"] },
  { id: "biology", name: "Biologiya", icon: "✿", theme: "biology", tagline: "Tirik tabiat bog‘i", aliases: ["biologiya", "biology"] },
  { id: "language", name: "Tillar", icon: "文", theme: "language", tagline: "So‘zlar va hikoyalar ko‘chasi", aliases: ["ingliz", "english", "til", "language", "rus", "nemis", "fransuz"] },
  { id: "coding", name: "Informatika", icon: "{ }", theme: "coding", tagline: "Algoritmlar va raqamlar shahri", aliases: ["informatika", "dasturlash", "coding", "programming", "it", "kiberxavfsizlik", "cybersecurity"] },
];

export function townForSubject(subject = "") {
  const normalized = subject.toLocaleLowerCase("uz");
  return towns.find((town) => town.aliases.some((alias) => normalized.includes(alias)))?.id ?? "other";
}

export function mapTowns(rooms) {
  const result = towns.map((town) => ({ ...town, rooms: rooms.filter((room) => townForSubject(room.subject || room.name) === town.id) }));
  const remaining = rooms.filter((room) => townForSubject(room.subject || room.name) === "other");
  if (remaining.length) result.push({ id: "other", name: "Boshqa fanlar", icon: "✦", theme: "other", tagline: "Yangi yo‘nalishlarni kashf qiling", rooms: remaining });
  return result;
}

const time = (item) => +new Date(item.startsAt || item.createdAt || 0);

export function buildLearningPath({ lessons = [], assignments = [], quizzes = [], labs = [], progress = {} }) {
  const todoAssignments = new Set((progress.assignmentsToDo || []).map((item) => item.id));
  const todoQuizzes = new Set((progress.quizzesToDo || []).map((item) => item.id));
  const reviewQuizzes = new Set((progress.reviewQueue || []).filter((item) => item.kind === "quiz").map((item) => item.id));
  const reviewLabs = new Set((progress.reviewQueue || []).filter((item) => item.kind === "lab").map((item) => item.id));
  const nodes = [
    ...lessons.map((item) => ({ ...item, kind: "lesson", tab: "lessons", state: item.startsAt && +new Date(item.startsAt) > Date.now() ? "upcoming" : "available" })),
    ...assignments.filter((item) => item.status === "published").map((item) => ({ ...item, kind: "assignment", tab: "assignments", state: todoAssignments.has(item.id) ? "todo" : "done" })),
    ...quizzes.filter((item) => item.status === "published").map((item) => ({ ...item, kind: "quiz", tab: "quizzes", state: todoQuizzes.has(item.id) ? "todo" : reviewQuizzes.has(item.id) ? "review" : "done" })),
    ...labs.map((item) => ({ ...item, kind: "lab", tab: "labs", state: reviewLabs.has(item.id) ? "review" : "available" })),
  ];
  const byLesson = new Map(lessons.map((item) => [item.id, []]));
  const unlinked = [];
  for (const node of nodes.filter((item) => item.kind !== "lesson")) {
    const bucket = byLesson.get(node.lessonId);
    (bucket || unlinked).push(node);
  }
  const result = [];
  for (const lesson of [...lessons].sort((a, b) => time(a) - time(b))) {
    result.push(nodes.find((item) => item.kind === "lesson" && item.id === lesson.id));
    result.push(...byLesson.get(lesson.id).sort((a, b) => time(a) - time(b)));
  }
  return [...result, ...unlinked.sort((a, b) => time(a) - time(b))];
}
