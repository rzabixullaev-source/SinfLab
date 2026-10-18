const towns = [
  { id: "math", name: "Matematika", icon: "π", theme: "math", aliases: ["matematika", "mathematics", "math", "algebra", "geometriya"] },
  { id: "physics", name: "Fizika", icon: "⚛", theme: "physics", aliases: ["fizika", "physics"] },
  { id: "chemistry", name: "Kimyo", icon: "⚗", theme: "chemistry", aliases: ["kimyo", "chemistry"] },
  { id: "biology", name: "Biologiya", icon: "✿", theme: "biology", aliases: ["biologiya", "biology"] },
  { id: "language", name: "Tillar", icon: "文", theme: "language", aliases: ["ingliz", "english", "til", "language", "rus", "nemis", "fransuz"] },
  { id: "coding", name: "Informatika", icon: "{ }", theme: "coding", aliases: ["informatika", "dasturlash", "coding", "programming", "it"] },
];

export function townForSubject(subject = "") {
  const normalized = subject.toLocaleLowerCase("uz");
  return towns.find((town) => town.aliases.some((alias) => normalized.includes(alias)))?.id ?? "other";
}

export function mapTowns(rooms) {
  const result = towns.map((town) => ({ ...town, rooms: rooms.filter((room) => townForSubject(room.subject || room.name) === town.id) }));
  const remaining = rooms.filter((room) => townForSubject(room.subject || room.name) === "other");
  if (remaining.length) result.push({ id: "other", name: "Boshqa fanlar", icon: "✦", theme: "other", rooms: remaining });
  return result;
}
