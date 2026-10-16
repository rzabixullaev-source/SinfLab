# MongoDB ma’lumot modeli

Har hujjat _id sifatida ObjectId oladi. Xona ichidagi har obyekt classroomId bilan saqlanadi. Sana maydonlari Date/UTC. API foydalanuvchi a’zoligini har so‘rovda tekshiradi; ObjectId borligi o‘zi ruxsat bermaydi.

## Collectionlar

- users: displayName, emailLower, passwordHash, createdAt.
- classrooms: ownerId, name, subject, description, mode, status, createdAt.
- classroom_members: classroomId, userId, role, status, joinedAt.
- classroom_invites: classroomId, codeHash, intendedRole, expiresAt, maxUses, usedCount, revokedAt.
- lessons: classroomId, createdBy, title, description, startsAt, endsAt, status.
- messages: classroomId, senderId, replyToId, body, createdAt, deletedAt.
- resource_folders: classroomId, parentId, name, createdBy.
- assets: classroomId, folderId, uploadedBy, filename, mimeType, byteSize. Fayl matni material_files GridFS bucketida shu _id bilan.
- assignments: classroomId, lessonId, title, instructions, dueAt, status, publishedAt.
- submissions: classroomId, assignmentId, studentId, status, currentVersion, submittedAt.
- submission_revisions: submissionId, version, body, submittedAt.
- feedback: submissionId, version, authorId, body, score, needsRevision.
- quizzes: classroomId, lessonId, title, status, questions (prompt, choices, correctIndex, points), publishedAt.
- quiz_attempts: classroomId, quizId, studentId, answers, score, maxScore, submittedAt.
- live_sessions: classroomId, lessonId, provider, joinUrl, status, startedAt, endedAt.
- attendance: classroomId, sessionId, userId, joinedAt, leftAt.
- lab_activities: classroomId, lessonId, kind, title, voltage/resistance chegaralari, tolerancePercent.
- lab_runs: classroomId, labId, studentId, parametrlar, hisoblangan natija, correct, createdAt.

## Yagonalik va indekslar

users.emailLower; classroom_members(classroomId,userId); classroom_invites.codeHash; submissions(assignmentId,studentId); submission_revisions(submissionId,version); feedback(submissionId,version); quiz_attempts(quizId,studentId) yagona indeksga ega. Xona bo‘yicha dars, chat, material, vazifa, test, sessiya va lablarni tez qidirish indekslari apps/api/src/mongo.js da yaratiladi.

## Maxfiylik

O‘quvchi draft vazifa/quizni ko‘rmaydi; quiz javob kaliti o‘quvchi API javobidan olib tashlanadi. O‘quvchi faqat o‘z submission, quiz attempt va lab runlarini ko‘radi. Xona tashqarisidagi foydalanuvchiga obyektning mavjudligi ham oshkor qilinmaydi (404). Fayl yuklash staffga, yuklab olish barcha faol a’zolarga ochiq.

## Keyingi model

AI manbali savol qoralamasi va manba sahifasi, shaxsiy bilim xaritasi, ota-ona ruxsatlari, eslatmalar, tashkilotlar va cyber sandbox instance alohida bosqichda collection sifatida qo‘shiladi. Ular hozir implementatsiya qilingan deb hisoblanmaydi.
