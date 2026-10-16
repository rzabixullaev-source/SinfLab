# Arxitektura va papkalar

Brauzer (React, keyingi bosqich) → Express API → MongoDB Atlas. API barcha rollar, o‘quv oqimi va xona chegaralarini tekshiradi. Fayl matni Atlas GridFS da, metadata assets collectionida saqlanadi.

## Hozirgi papkalar

- apps/api/src/app.js — Express marshrutlari va middleware.
- apps/api/src/config.js, mongo.js, server.js — muhit, Atlas ulanishi, indekslar, server.
- apps/api/src/modules/auth — foydalanuvchi, parol, JWT.
- apps/api/src/modules/classrooms — xona, a’zolik, taklif va chat.
- apps/api/src/modules/lessons — dars jadvali.
- apps/api/src/modules/resources — papkalar va GridFS fayllar.
- apps/api/src/modules/assignments — vazifa, revision, feedback.
- apps/api/src/modules/quizzes — savollar, urinish, avtomatik baholash.
- apps/api/src/modules/live — tashqi uchrashuv havolasi, sessiya, davomat.
- apps/api/src/modules/labs — Ohm qonuni tajriba urinishlari.
- apps/api/src/modules/progress — o‘quvchi davom etish ro‘yxati.
- apps/api/test — HTTP oqimi testlari va xotira DB adapteri.
- packages/contracts/src — umumiy Zod so‘rov sxemalari.
- apps/web — React interfeysi uchun papka, hali boshlanmagan.
- packages/lab-kits, infra/video, infra/sandbox — keyingi kengaytirish joylari.

## Qoidalar

Har bir xona marshruti avval faol a’zolik va xona holatini tekshiradi. Teacher, assistant, owner dars/vazifa/test/material yaratadi. Student faqat e’lon qilingan vazifa va quizni ko‘radi; shaxsiy natijalari boshqa o‘quvchiga ko‘rinmaydi. Taklif kodi SHA-256 hash shaklida saqlanadi. Xona/dars/topshirish bog‘lanishlarida ID bir xonaga tegishliligi tekshiriladi.

MongoDB Atlas transactionlari xona yaratish, taklif bilan qo‘shilish va submission/feedback oqimida ishlatiladi. Fayl yuklashda GridFS va metadata orasida xato bo‘lsa, GridFS fayli tozalanadi. Fayllar faqat API orqali xona a’zolariga uzatiladi.

## Hozirgi chegaralar

Video API tayyor Zoom yoki Meet HTTPS havolasini saqlaydi, provayder sessiyasini avtomatik yaratmaydi. Davomat check-in/check-out bosilishiga tayanadi. Quiz hozir bitta urinishli va faqat multiple choice. Lab hozir Ohm qonuni bilan cheklangan. AI va kiber sandbox ulanmagan.
