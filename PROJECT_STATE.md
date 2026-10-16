# PROJECT_STATE — yangi ishni shu fayldan boshlang

Sana: 2026-10-16
Mahsulot: SinfLab — ustoz boshqaradigan o‘quv xonasi.
Hozirgi bosqich: ishlaydigan backend MVP; React frontend hali boshlanmagan.

## Qabul qilingan stack
JavaScript ESM, Node.js 22+, Express 5, MongoDB Atlas (rasmiy driver), GridFS, Zod, bcryptjs, JWT. Frontend ReactJS/JavaScript bo‘ladi. docs/decisions/0002-js-mongo.md 0001 qarorini almashtirgan.

## Tayyor modullar
- Auth: register/login/me, rate limit.
- Xona: course/club, owner/teacher/assistant/student, taklif kodi, a’zolik.
- Dars, chat, reply va soft delete.
- Papka va 10 MB gacha material upload/download; fayl GridFS da.
- Vazifa draft/publish, o‘quvchi submission revisionlari, feedback.
- Quiz draft/publish, savol kaliti maxfiy, bir urinish, avtomatik baho.
- Zoom/Meet HTTPS havolali live sessiya va check-in/out davomat.
- Ohm qonuni lab mashqi, hisob va shaxsiy urinishlar.
- O‘quvchi progress: qoldirilgan live dars, vazifa, quiz va takrorlash.

## Tekshiruv
npm run test:api: 19/19 HTTP test o‘tdi. Testlar xotira DB adapteriga ulanadi va asosiy rol/maxfiylik oqimlarini tekshiradi. MongoDB Atlas bilan haqiqiy ulanish, GridFS va transactionlar hali smoke testdan o‘tmagan — URI yo‘q. Video xona yaratish faqat tayyor tashqi havola orqali; AI va cyber sandbox ulanmagan.

## Muhim fayllar
docs/BACKEND_PLAN.md — reja/holat; docs/API.md — marshrutlar; docs/ARCHITECTURE.md — kod tuzilishi; docs/DATA_MODEL.md — MongoDB collectionlari; README.md — ishga tushirish. apps/api/.env.example konfiguratsiya namunasi. .env Gitga kirmaydi.

## Keyingi aniq ish
1. Atlas URI mavjud bo‘lganda haqiqiy DB smoke testini bajarish; ayniqsa GridFS va transaction.
2. ReactJS/Vite frontendni API ga ulab demo oqimini qurish.
3. Keyin AI savol qoralamasi, video provayder integratsiyasi va kengroq progress modullari.

Har ishning boshida shu faylni o‘qing; tugaganda oxirgi o‘zgarish va test natijasini yangilang.
