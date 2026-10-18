import { HttpError } from "../../shared/errors.js";

export async function generateGemini(config, systemText, userText, fetchImpl = fetch) {
  if (!config.GEMINI_API_KEY) throw new HttpError(503, "AI_NOT_CONFIGURED", "Gemini API key is not configured");
  const model = config.GEMINI_MODEL || "gemini-3.5-flash-lite";
  const response = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": config.GEMINI_API_KEY },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: systemText }] }, contents: [{ role: "user", parts: [{ text: userText }] }], generationConfig: { maxOutputTokens: 700 } }),
    signal: AbortSignal.timeout(20000),
  }).catch(() => { throw new HttpError(502, "AI_UNAVAILABLE", "Gemini service is unavailable"); });
  if (!response.ok) throw new HttpError(502, "AI_UNAVAILABLE", "Gemini service returned an error");
  const body = await response.json();
  const text = body.candidates?.[0]?.content?.parts?.filter((part) => typeof part.text === "string").map((part) => part.text).join("\n").trim();
  if (!text) throw new HttpError(502, "AI_EMPTY_RESPONSE", "Gemini returned no text");
  return text;
}
