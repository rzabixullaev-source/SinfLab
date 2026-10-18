# SinfLab API (v1)

Base URL: /api/v1. JSON so‘rovlar application/json; material yuklash application/octet-stream. Himoyalangan yo‘llarga Authorization: Bearer TOKEN kerak. Xatolar error.code va error.message bilan qaytadi.

## Kirish

- POST /auth/register — displayName, email, password. Avvalgi mijozlar yuboradigan role maydoni qabul qilinadi, lekin hisob huquqini belgilamaydi.
- POST /auth/login — email, password. Sinfdagi rol login paytida tanlanmaydi.
- GET /auth/me — joriy foydalanuvchi.
- GET /health, GET /ready — server va baza tayyorligi.

## Ota-ona

- POST /parents/invites — kamida bitta sinfda o‘quvchi bo‘lgan foydalanuvchi ota-onasi uchun 48 soatlik bir martalik kod yaratadi.
- POST /parents/link — ota-ona `{ "code": "..." }` yuborib farzand hisobiga bog‘lanadi.
- GET /parents/children — ota-onaga bog‘langan farzandlar.
- GET /parents/children/:studentId — faqat bog‘langan farzandning xonalari, darslari, vazifalari, topshirgan ishlari, ustoz izohlari, test va laboratoriya natijalari, davomat va yig‘ma statistika. Test javob kaliti berilmaydi.
- GET /parents/my-parents — o‘quvchiga bog‘langan ota-onalar.
- DELETE /parents/children/:studentId — ota-ona o‘z bog‘lanishini o‘chiradi; o‘quvchi o‘chirsa bodyda `parentId` yuboradi.

## Xona

- POST /classrooms — name, subject?, description?, mode: course yoki club. Yaratgan foydalanuvchi shu sinf egasi va ustozi bo‘ladi.
- GET /classrooms; GET /classrooms/:classroomId.
- GET /classrooms/:classroomId/members.
- POST /classrooms/:classroomId/invites — role?, expiresInHours?, maxUses?. Kod faqat yaratishda qaytadi.
- POST /classrooms/join — code. Sinfdagi rol taklif kodida ustoz belgilagan rolga teng bo‘ladi.
- DELETE /classrooms/:classroomId/invites/:inviteId.
- PATCH /classrooms/:classroomId/members/:userId — role? yoki status?.

## Dars, chat, material

- POST /classrooms/:id/lessons — title, description?, startsAt?, endsAt?.
- GET /classrooms/:id/lessons; GET /classrooms/:id/lessons/:lessonId.
- POST /classrooms/:id/messages — body, replyToId?.
- GET /classrooms/:id/messages?limit=50&before=ISO_DATE.
- DELETE /classrooms/:id/messages/:messageId — soft delete.
- POST /classrooms/:id/folders — name, parentId?.
- GET /classrooms/:id/folders.
- POST /classrooms/:id/assets — binary body; x-file-name (UTF-8 nom uchun encodeURIComponent), x-file-mime va ixtiyoriy x-folder-id headerlari. Maksimum 10 MB. Ustoz/yordamchi yuklaydi.
- GET /classrooms/:id/assets?folderId=ID.
- GET /classrooms/:id/assets/:assetId/download — faqat xona a’zosi.

## AI yordamchisi

- GET/PUT /classrooms/:id/teaching-guide — ustoz qo'llanmasini o'qish va yangilash; faqat sinf egasi/ustoz yangilaydi.
- GET /classrooms/:id/ai-materials — o'quvchiga faqat tasdiqlangan dars matnlari, ustozga qoralamalar ham ko'rinadi.
- PUT /classrooms/:id/ai-materials/:lessonId — dars uchun AI matnini qoralama sifatida saqlash; tahrir tasdiqni bekor qiladi.
- PATCH /classrooms/:id/ai-materials/:lessonId/approval — `{ "approved": true|false }`; faqat sinf egasi/ustoz.
- POST /classrooms/:id/assistant — `{ "question": "...", "lessonId": "..."? }`; o'quvchiga javob, responseId va qolgan kunlik limit qaytadi.
- POST /classrooms/:id/assistant-responses/:responseId/feedback — `{ "rating": "helpful"|"unhelpful", "comment": "..."? }`; faqat o'z javobiga baho beriladi.
- GET /classrooms/:id/assistant-quality — ustozga so'nggi 20 ta baholangan javob va izohlar.
- Kunlik limit `AI_DAILY_REQUEST_LIMIT` (standart 20), javob uzunligi `AI_MAX_OUTPUT_TOKENS` (standart 500). Limit savol, progress maslahati va lug'at tushuntirishiga umumiy qo'llanadi; UTC sana bo'yicha yangilanadi.

## Vazifa

- POST /classrooms/:id/assignments — title, instructions, lessonId?, dueAt?. Qoralama yaratiladi.
- GET /classrooms/:id/assignments; GET /classrooms/:id/assignments/:assignmentId.
- POST /classrooms/:id/assignments/:assignmentId/publish.
- POST /classrooms/:id/assignments/:assignmentId/submissions — body. Birinchi va ustoz tuzatish so‘ragandan keyingi versiyalar.
- GET /classrooms/:id/assignments/:assignmentId/submissions/me — o‘quvchining o‘z ishi.
- GET /classrooms/:id/assignments/:assignmentId/submissions — ustoz ko‘rinishi.
- POST /classrooms/:id/assignments/:assignmentId/submissions/:submissionId/feedback — body, score?, needsRevision?.

## Quiz

- POST /classrooms/:id/quizzes — title, lessonId?, questions: prompt, choices, correctIndex, points?. Qoralama.
- GET /classrooms/:id/quizzes; GET /classrooms/:id/quizzes/:quizId.
- POST /classrooms/:id/quizzes/:quizId/publish.
- POST /classrooms/:id/quizzes/:quizId/attempts — answers massivi. Bir o‘quvchiga bir urinish.
- GET /classrooms/:id/quizzes/:quizId/attempts/me; GET /classrooms/:id/quizzes/:quizId/attempts (ustoz).

O‘quvchi quizni ko‘rganda correctIndex yuborilmaydi.

## Jonli dars, lab, progress

- POST /classrooms/:id/live-sessions — lessonId, provider: zoom/meet/other, joinUrl (HTTPS).
- POST /classrooms/:id/live-sessions/browser — brauzer kamera darsi; title, lessonId?. Zoom kalitlari kerak emas.
- WebSocket /api/v1/live-signal — birinchi xabar `join` (token, classroomId, sessionId), keyin guruh ichidagi host/o‘quvchi WebRTC offer/answer/ICE signallari. `joined` doskaning saqlangan `board` elementlarini ham yuboradi. Faqat host `board-update` (`elements`) yubora oladi; server shakllarni tekshiradi, darsda saqlaydi va o‘quvchilarga uzatadi (120 tagacha element).
- POST /classrooms/:id/live-sessions/zoom — ichki Zoom Video SDK xonasi; title, lessonId?. Ustoz uchun `preparing` holatida yaratiladi.
- POST /classrooms/:id/live-sessions/:sessionId/zoom-token — guruh a’zosiga qisqa muddatli SDK token; xonani yaratgan ustozga host roli. SDK kalitlari bo‘lmasa 503.
- POST /classrooms/:id/live-sessions/:sessionId/activate — xona yaratuvchi ustoz darsni boshlaydi.
- GET /classrooms/live-alerts — o‘quvchining faol guruhlaridagi boshlangan Zoom darslari.
- GET /classrooms/:id/live-sessions/:sessionId/hand — o‘quvchi o‘z so‘rovi, ustoz guruhdagi so‘rovlar ro‘yxati.
- POST /classrooms/:id/live-sessions/:sessionId/hand/raise va /lower — o‘quvchi qo‘l ko‘taradi/tushiradi.
- POST /classrooms/:id/live-sessions/:sessionId/hand/decision — xonani yaratgan ustoz `studentId` va `decision`: approve/deny/revoke yuboradi.
- GET /classrooms/:id/live-sessions.
- POST /classrooms/:id/live-sessions/:sessionId/check-in va /check-out.
- POST /classrooms/:id/live-sessions/:sessionId/end.
- GET /classrooms/:id/live-sessions/:sessionId/attendance — ustoz.
- POST /classrooms/:id/labs — `kind`, `title`, `lessonId?` va turiga mos parametrlar. Turlar: `studio` (`scenarioId`: 40 ish katalogidagi ID), `physics-ohms-law` (maxVoltage, minResistance, maxResistance, tolerancePercent), `physics-pendulum` (minLength, maxLength, gravity, tolerancePercent), `chemistry-titration` (acidMolarity, acidVolumeMl, baseMolarity, maxBaseVolumeMl, tolerancePh), `biology-osmosis` (insideSolutePercent), `mathematics-linear` (slope, intercept, toleranceAbsolute). `kind` berilmasa eski Ohm turi ishlaydi.
- GET /classrooms/:id/labs.
- POST /classrooms/:id/labs/:labId/runs — turiga mos o‘quvchi urinishi: yangi `studio` uchun `actions` (1–80 ta `add {itemId,amount}`, `remove {itemId}`, `set {controlId,value}` yoki `reset`). Server asbob va qiymatlarni ssenariy bo‘yicha qayta tekshiradi, `observation`, `measurement`, `score` va `correct` qaytaradi. Oldingi turlar: Ohm (`voltage`, `resistance`, `predictedCurrent`), mayatnik (`length`, `amplitudeDegrees`, `predictedPeriod`), titrlash (`baseVolumeMl`, `predictedPh`), osmos (`outsideSolutePercent`, `predictedDirection`: in/out/balanced), chiziqli funksiya (`x`, `predictedY`).
- GET /classrooms/:id/labs/:labId/runs — o‘quvchi o‘zini, ustoz hammasini ko‘radi.
- GET /classrooms/:id/my-progress — qoldirilgan jonli dars, vazifa, quiz va takrorlash ro‘yxati.

## Chegara

Atlas ulanmagan holda testlar xotira adapterida o‘tgan. Ichki Zoom Video SDK uchun haqiqiy kalitlar va brauzer media sinovi hali kerak; tayyor havola oqimi alohida saqlangan. AI savol yaratish va cyber sandbox hali ulanmagan.
