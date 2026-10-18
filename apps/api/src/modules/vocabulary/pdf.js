import { PDFDocument } from "pdfkit";
import { fileURLToPath } from "node:url";

const fontPath = fileURLToPath(new URL("../../../assets/fonts/NotoSans.ttf", import.meta.url));

export function createBookPdf(book) {
  const pdf = new PDFDocument({ size: "A4", margins: { top: 56, bottom: 56, left: 58, right: 58 }, info: { Title: book.title, Author: book.authorName, Creator: "SinfLab" } });
  pdf.registerFont("NotoSans", fontPath).font("NotoSans");
  pdf.fontSize(27);
  const titleHeight = pdf.heightOfString(book.title, { width: 470 });
  const authorY = 83 + titleHeight + 9;
  const headerHeight = Math.max(175, authorY + 27);
  pdf.rect(0, 0, 595, headerHeight).fill("#163647");
  pdf.fillColor("#a8e1d4").fontSize(11).text("SINF LAB  /  LUG‘AT KITOBI", 58, 55);
  pdf.fillColor("#ffffff").fontSize(27).text(book.title, 58, 83, { width: 470 });
  pdf.fillColor("#d1e6e8").fontSize(10).text(`Muallif: ${book.authorName}   ·   ${book.words.length} ta so‘z`, 58, authorY);
  pdf.y = headerHeight + 30;
  book.words.forEach((word, index) => {
    const start = pdf.y;
    const body = [`${word.language}  ·  ${word.meaning}`, word.forms ? `Shakllari: ${word.forms}` : "", word.example ? `Misol: ${word.example}` : ""].filter(Boolean);
    const height = 29 + body.reduce((sum, line) => sum + pdf.heightOfString(line, { width: 460, lineGap: 3 }) + 6, 0);
    if (start + height > pdf.page.height - 65) pdf.addPage();
    pdf.fillColor("#1b5d68").fontSize(14).text(`${index + 1}. ${word.term}`, { width: 470 });
    pdf.fillColor("#263c45").fontSize(10);
    body.forEach((line) => pdf.text(line, { width: 470, lineGap: 3 }));
    pdf.moveDown(0.8);
    pdf.moveTo(58, pdf.y).lineTo(537, pdf.y).strokeColor("#d5e1e2").stroke();
    pdf.moveDown(0.8);
  });
  pdf.end();
  return pdf;
}
