const months = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"];
const weekdays = ["yakshanba", "dushanba", "seshanba", "chorshanba", "payshanba", "juma", "shanba"];
const pad = (value) => String(value).padStart(2, "0");

export function todayLabel() {
  const date = new Date();
  return date.getDate() + "-" + months[date.getMonth()] + ", " + weekdays[date.getDay()];
}

export function dateTimeLabel(value) {
  if (!value) return "Vaqt belgilanmagan";
  const date = new Date(value);
  return date.getDate() + "-" + months[date.getMonth()] + " · " + pad(date.getHours()) + ":" + pad(date.getMinutes());
}
