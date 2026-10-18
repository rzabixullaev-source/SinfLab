import { createHash } from "node:crypto";

export const gameModes = ["choice", "fill", "scramble", "numeric", "truefalse"];

export function numericAnswer(value) {
  const normalized = String(value).trim().replace(",", ".");
  return /^-?\d+(?:\.\d+)?$/.test(normalized) ? Number(normalized) : null;
}

export function canPlayQuestion(question, mode) {
  const answer = question.choices[question.correctIndex]?.trim() || "";
  if (mode === "scramble") return /^[\p{L}]{4,30}$/u.test(answer) && new Set([...answer.toLocaleLowerCase("uz")]).size > 1;
  if (mode === "numeric") return numericAnswer(answer) !== null;
  return true;
}

function seed(quizId, questionIndex, studentId) {
  return createHash("sha256").update(`${quizId}:${questionIndex}:${studentId}`).digest();
}

export function gamePrompt(question, mode, quizId, questionIndex, studentId) {
  const correct = question.choices[question.correctIndex].trim();
  const bytes = seed(quizId, questionIndex, studentId);
  if (mode === "scramble") {
    const letters = [...correct];
    for (let index = letters.length - 1; index > 0; index--) {
      const other = bytes[index % bytes.length] % (index + 1);
      [letters[index], letters[other]] = [letters[other], letters[index]];
    }
    if (letters.join("").toLocaleLowerCase("uz") === correct.toLocaleLowerCase("uz")) {
      const other = letters.findIndex((letter) => letter.toLocaleLowerCase("uz") !== letters[0].toLocaleLowerCase("uz"));
      [letters[0], letters[other]] = [letters[other], letters[0]];
    }
    return { scrambled: letters.join("") };
  }
  if (mode === "truefalse") {
    const wrong = question.choices.map((_, index) => index).filter((index) => index !== question.correctIndex);
    const candidateIndex = bytes[0] % 2 ? question.correctIndex : wrong[bytes[1] % wrong.length];
    return { statement: question.choices[candidateIndex], expected: candidateIndex === question.correctIndex };
  }
  if (mode === "fill") return { hint: `${correct[0] || "?"}… (${correct.length} belgi)` };
  if (mode === "choice") return { choices: question.choices };
  return {};
}

export function checkGameAnswer(question, mode, answer, quizId, questionIndex, studentId) {
  const correct = question.choices[question.correctIndex].trim();
  if (mode === "choice") return answer === question.correctIndex;
  if (mode === "truefalse") return answer === gamePrompt(question, mode, quizId, questionIndex, studentId).expected;
  if (mode === "numeric") return numericAnswer(answer) !== null && numericAnswer(answer) === numericAnswer(correct);
  return String(answer).trim().toLocaleLowerCase("uz") === correct.toLocaleLowerCase("uz");
}
