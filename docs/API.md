# SinfLab API (v1)

Base URL: /api/v1. JSON so‘rovlar application/json; material yuklash application/octet-stream. Himoyalangan yo‘llarga Authorization: Bearer TOKEN kerak. Xatolar error.code va error.message bilan qaytadi.

## Kirish

- POST /auth/register — displayName, email, password.
- POST /auth/login — email, password.
- GET /auth/me — joriy foydalanuvchi.
- GET /health, GET /ready — server va baza tayyorligi.

## Xona

- POST /classrooms — name, subject?, description?, mode: course yoki club.
- GET /classrooms; GET /classrooms/:classroomId.
- GET /classrooms/:classroomId/members.
- POST /classrooms/:classroomId/invites — role?, expiresInHours?, maxUses?. Kod faqat yaratishda qaytadi.
- POST /classrooms/join — code.
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
- POST /classrooms/:id/labs — title, lessonId?, maxVoltage?, minResistance?, maxResistance?, tolerancePercent?. Ohm qonuni mashqi.
- GET /classrooms/:id/labs.
- POST /classrooms/:id/labs/:labId/runs — voltage, resistance, predictedCurrent.
- GET /classrooms/:id/labs/:labId/runs — o‘quvchi o‘zini, ustoz hammasini ko‘radi.
- GET /classrooms/:id/my-progress — qoldirilgan jonli dars, vazifa, quiz va takrorlash ro‘yxati.

## Chegara

Atlas ulanmagan holda testlar xotira adapterida o‘tgan. Ichki Zoom Video SDK uchun haqiqiy kalitlar va brauzer media sinovi hali kerak; tayyor havola oqimi alohida saqlangan. AI savol yaratish va cyber sandbox hali ulanmagan.
