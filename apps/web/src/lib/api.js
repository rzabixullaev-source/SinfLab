const base = "/api/v1";

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

const messages = {
  INVALID_CREDENTIALS: "Email yoki parol xato.",
  EMAIL_TAKEN: "Bu email allaqachon ro‘yxatdan o‘tgan.",
  INVALID_INVITE: "Taklif kodi xato yoki muddati tugagan.",
  VALIDATION_ERROR: "Ma’lumotlarni tekshirib qayta urinib ko‘ring.",
  UNAUTHORIZED: "Sessiya tugagan. Qayta kiring.",
  INVALID_TOKEN: "Sessiya tugagan. Qayta kiring.",
  FORBIDDEN: "Bu amal uchun ruxsatingiz yo‘q.",
  PAYLOAD_TOO_LARGE: "Fayl hajmi 10 MB dan oshmasligi kerak.",
};

export function errorText(error) {
  if (error instanceof TypeError) return "Serverga ulanib bo‘lmadi. API ishga tushganini tekshiring.";
  return messages[error?.code] || error?.message || "Noma’lum xato yuz berdi.";
}
