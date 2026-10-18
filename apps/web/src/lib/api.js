const configuredOrigin = import.meta.env.VITE_API_ORIGIN?.trim().replace(/\/+$/, "");
const apiOrigin = configuredOrigin || (import.meta.env.PROD ? "https://sinflabapi-production.up.railway.app" : "");
const base = `${apiOrigin}/api/v1`;

export function liveSignalUrl() {
  const url = new URL(`${base}/live-signal`, window.location.origin);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function readSession() {
  try {
    return JSON.parse(localStorage.getItem("sinflab.session") || "null");
  } catch {
    return null;
  }
}

export function saveSession(session) {
  if (session) localStorage.setItem("sinflab.session", JSON.stringify(session));
  else localStorage.removeItem("sinflab.session");
}

export async function api(path, { method = "GET", body, token, headers = {} } = {}) {
  const isBinary = body instanceof Blob || body instanceof ArrayBuffer;
  const response = await fetch(base + path, {
    method,
    headers: {
      ...(body !== undefined && !isBinary ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: "Bearer " + token } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : isBinary ? body : JSON.stringify(body),
  });
  if (response.status === 204) return null;
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : null;
  if (!response.ok) {
    throw new ApiError(data?.error?.message || "So‘rov bajarilmadi", response.status, data?.error?.code);
  }
  return data;
}

export async function downloadAsset(classroomId, asset, token) {
  const response = await fetch(base + "/classrooms/" + classroomId + "/assets/" + asset.id + "/download", {
    headers: { authorization: "Bearer " + token },
  });
  if (!response.ok) throw new ApiError("Faylni yuklab bo‘lmadi", response.status);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = asset.filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadVocabularyPdf(book, token) {
  const response = await fetch(base + "/vocabulary/books/" + book.id + "/pdf", {
    headers: { authorization: "Bearer " + token },
  });
  if (!response.ok) throw new ApiError("PDF faylni yuklab bo‘lmadi", response.status);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = (book.title.replace(/[^\p{L}\p{N}-]+/gu, "-") || "lugat") + ".pdf";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadLibraryPdf(book, token) {
  const response = await fetch(base + "/vocabulary/pdf-books/" + book.id + "/download", {
    headers: { authorization: "Bearer " + token },
  });
  if (!response.ok) throw new ApiError("PDF faylni yuklab bo‘lmadi", response.status);
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = book.filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const messages = {
  INVALID_CREDENTIALS: "Email yoki parol xato.",
  AUTH_RATE_LIMIT: "Kirishga urinishlar ko‘paydi. 15 daqiqadan keyin qayta urinib ko‘ring.",
  EMAIL_TAKEN: "Bu email allaqachon ro‘yxatdan o‘tgan.",
  INVALID_INVITE: "Taklif kodi xato yoki muddati tugagan.",
  VALIDATION_ERROR: "Ma’lumotlarni tekshirib qayta urinib ko‘ring.",
  UNAUTHORIZED: "Sessiya tugagan. Qayta kiring.",
  INVALID_TOKEN: "Sessiya tugagan. Qayta kiring.",
  FORBIDDEN: "Bu amal uchun ruxsatingiz yo‘q.",
  PAYLOAD_TOO_LARGE: "Fayl belgilangan hajm chegarasidan oshdi.",
  AI_DAILY_LIMIT: "Bugungi AI so‘rovlari limiti tugadi. Ertaga qayta urinib ko‘ring.",
  AI_RATE_LIMIT: "AI so‘rovlari juda tez yuborildi. Birozdan keyin qayta urinib ko‘ring.",
  AI_MATERIAL_NOT_FOUND: "Tanlangan dars matni tasdiqlanmagan yoki topilmadi.",
  AI_NOT_CONFIGURED: "AI xizmati hozir sozlanmagan.",
  AI_UNAVAILABLE: "AI xizmati hozir javob bermayapti. Keyinroq urinib ko‘ring.",
  AI_INVALID_RESPONSE: "AI so‘z kartasini to‘liq tayyorlay olmadi. Qo‘lda kiritib ko‘ring.",
  COURSE_EXISTS: "Bu til juftligi uchun kitob allaqachon bor.",
  TODAY_TOPIC_EXISTS: "Bu kitobda bugungi mavzu allaqachon ochilgan.",
  WORD_EXISTS: "Bu so‘z mavzuda allaqachon bor.",
  EMPTY_BOOK: "Kitob yig‘ish uchun kamida bitta so‘z qo‘shing.",
  INVALID_PDF: "Fayl haqiqiy PDF emas.",
};

const translatedErrors = {
  en: {
    INVALID_CREDENTIALS: "Incorrect email or password.", AUTH_RATE_LIMIT: "Too many sign-in attempts. Try again in 15 minutes.",
    EMAIL_TAKEN: "This email is already registered.", INVALID_INVITE: "The invitation code is invalid or expired.",
    VALIDATION_ERROR: "Check the information and try again.", UNAUTHORIZED: "Your session has ended. Sign in again.",
    INVALID_TOKEN: "Your session has ended. Sign in again.", FORBIDDEN: "You do not have permission to do that.",
    PAYLOAD_TOO_LARGE: "The file is too large.", AI_DAILY_LIMIT: "You have reached today's AI limit. Try again tomorrow.",
    AI_RATE_LIMIT: "AI requests are too frequent. Try again shortly.", AI_NOT_CONFIGURED: "AI is not configured.",
    AI_UNAVAILABLE: "AI is unavailable. Try again later.", AI_INVALID_RESPONSE: "AI could not prepare this card. Try entering it manually.",
    COURSE_EXISTS: "This language book already exists.", TODAY_TOPIC_EXISTS: "Today's topic is already open.",
    WORD_EXISTS: "This word is already in the topic.", EMPTY_BOOK: "Add a word before making a book.", INVALID_PDF: "This is not a valid PDF.",
  },
  ru: {
    INVALID_CREDENTIALS: "Неверный email или пароль.", AUTH_RATE_LIMIT: "Слишком много попыток входа. Повторите через 15 минут.",
    EMAIL_TAKEN: "Этот email уже зарегистрирован.", INVALID_INVITE: "Код приглашения неверен или истёк.",
    VALIDATION_ERROR: "Проверьте данные и повторите попытку.", UNAUTHORIZED: "Сеанс завершён. Войдите снова.",
    INVALID_TOKEN: "Сеанс завершён. Войдите снова.", FORBIDDEN: "У вас нет прав для этого действия.",
    PAYLOAD_TOO_LARGE: "Файл слишком большой.", AI_DAILY_LIMIT: "Дневной лимит ИИ исчерпан. Повторите завтра.",
    AI_RATE_LIMIT: "Слишком частые запросы к ИИ. Повторите позже.", AI_NOT_CONFIGURED: "ИИ сейчас не настроен.",
    AI_UNAVAILABLE: "ИИ сейчас недоступен. Повторите позже.", AI_INVALID_RESPONSE: "ИИ не смог создать карточку. Заполните её вручную.",
    COURSE_EXISTS: "Книга для этой пары языков уже существует.", TODAY_TOPIC_EXISTS: "Тема на сегодня уже открыта.",
    WORD_EXISTS: "Это слово уже есть в теме.", EMPTY_BOOK: "Добавьте слово перед созданием книги.", INVALID_PDF: "Это не PDF-файл.",
  },
};

export function errorText(error) {
  const language = typeof document === "undefined" ? "uz" : document.documentElement.lang;
  if (error instanceof TypeError) return language === "en" ? "Cannot connect to the server." : language === "ru" ? "Не удалось подключиться к серверу." : "Serverga ulanib bo‘lmadi. API ishga tushganini tekshiring.";
  return translatedErrors[language]?.[error?.code] || messages[error?.code] || error?.message || (language === "en" ? "An unknown error occurred." : language === "ru" ? "Произошла неизвестная ошибка." : "Noma’lum xato yuz berdi.");
}
