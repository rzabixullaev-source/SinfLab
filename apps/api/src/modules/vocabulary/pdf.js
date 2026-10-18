import { PDFDocument } from "pdfkit";
import { fileURLToPath } from "node:url";

const fontPath = fileURLToPath(new URL("../../../assets/fonts/NotoSans.ttf", import.meta.url));

export function createBookPdf(book) {
  const pdf = new PDFDocument({ size: "A4", margins: { top: 56, bottom: 56, left: 58, right: 58 },
    info: { Title: book.title, Author: book.authorName, Creator: "SinfLab" } });
  pdf.registerFont("NotoSans", fontPath).font("NotoSans");
  pdf.fontSize(25);
  const titleHeight = pdf.heightOfString(book.title, { width: 475 });
  const authorY = 79 + titleHeight + 15;
  const coverHeight = Math.max(206, authorY + 43);
  pdf.rect(0, 0, 595, coverHeight).fill("#163647");
  pdf.fillColor("#a8e1d4").fontSize(10).text("SINFLAB  /  TIL KITOBI", 58, 52);
  pdf.fillColor("#ffffff").fontSize(25).text(book.title, 58, 79, { width: 475 });
  pdf.fillColor("#d1e6e8").fontSize(10).text(`Muallif: ${book.authorName}  ·  ${book.words.length} ta so‘z`, 58, authorY);
  pdf.y = coverHeight + 32;

  function roomFor(height) {
    if (pdf.y + height > pdf.page.height - 58) pdf.addPage();
  }

  function printWord(word, index) {
    const lines = [
      word.pronunciation ? `O‘qilishi: ${word.pronunciation}` : "",
      `Tarjima: ${word.meaning}`,
      word.forms ? `Shakllari: ${word.forms}` : "",
      ...(word.examples?.length ? word.examples.flatMap((example) => [example.target, example.native])
        : [word.example ? `Misol: ${word.example}` : "", word.exampleTranslation || ""]),
    ].filter(Boolean);
    pdf.fontSize(10);
    const height = 42 + lines.reduce((sum, line) => sum + pdf.heightOfString(line, { width: 470, lineGap: 2 }) + 5, 0);
    roomFor(height);
    pdf.fillColor("#1b5d68").fontSize(14).text(`${index + 1}. ${word.term}`, { width: 470 });
    pdf.fillColor("#263c45").fontSize(10);
    lines.forEach((line) => pdf.text(line, { width: 470, lineGap: 2 }));
    pdf.moveDown(0.6);
    pdf.moveTo(58, pdf.y).lineTo(537, pdf.y).strokeColor("#d5e1e2").stroke();
    pdf.moveDown(0.7);
  }

  if (book.lessons?.length) {
    const words = new Map(book.words.map((word) => [word.id, word]));
    let index = 0;
    for (const lesson of book.lessons) {
      roomFor(75);
      pdf.fillColor("#0f766e").fontSize(11).text(`${lesson.day}  /  ${lesson.topic}`, { width: 470 });
      pdf.moveDown(0.7);
      for (const id of lesson.wordIds) {
        const word = words.get(id);
        if (word) printWord(word, index++);
      }
    }
  } else {
    book.words.forEach(printWord);
  }
  pdf.end();
  return pdf;
}
