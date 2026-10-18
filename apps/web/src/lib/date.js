function localeTag() {
  const language = typeof document === "undefined" ? "uz" : document.documentElement.lang;
  return language === "ru" ? "ru-RU" : language === "en" ? "en-US" : "uz-UZ";
}

export function todayLabel() {
  return new Intl.DateTimeFormat(localeTag(), { day: "numeric", month: "long", weekday: "long" }).format(new Date());
}

export function dateTimeLabel(value) {
  if (!value) return { "uz-UZ": "Vaqt belgilanmagan", "en-US": "Time not set", "ru-RU": "Время не указано" }[localeTag()];
  return new Intl.DateTimeFormat(localeTag(), { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
