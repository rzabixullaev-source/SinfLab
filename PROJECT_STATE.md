# PROJECT_STATE — yangi ishni shu fayldan boshlang

Sana: 2026-10-16
Mahsulot: SinfLab — ustoz boshqaradigan o‘quv xonasi.
Hozirgi bosqich: backend va React frontend MVP ishlaydi; Atlas bilan real ulanish hali tekshirilmagan.

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

Frontend: React/Vite, dark responsiv UI. Login/ro‘yxatdan o‘tish, dashboard, xona/dars/chat/material/a’zolar, vazifa, quiz, live havola va davomat, Ohm laboratoriya, o‘quvchi rejasi API ga ulangan. Demo server `npm run dev:demo-api` orqali xotiradagi ma’lumot bilan ishlaydi. `npm run dev:web` bilan localhost:5173 da ko‘riladi. Browserda teacher login, xona/dars/chat/papka/fayl, vazifa va quiz draft/publish, lab yaratish; student login, vazifa topshirish, quiz 2/2 va lab 2 A tajribasi; ustoz 100 ball feedback va o‘quvchida accepted holati tekshirildi. Jonli tashqi havola, revision UI, mobil klaviatura sinovi va real Atlas smoke testi qolgan. Batafsil docs/FRONTEND_PLAN.md.

## Muhim fayllar
docs/BACKEND_PLAN.md — backend; docs/FRONTEND_PLAN.md — frontend; docs/API.md — marshrutlar; docs/ARCHITECTURE.md — kod tuzilishi; docs/DATA_MODEL.md — MongoDB collectionlari; docs/UI_UX.md — rang va xarakter; README.md — ishga tushirish. apps/api/.env.example konfiguratsiya namunasi. .env Gitga kirmaydi.

## Frontend dizayn qarori
Jiddiy, ta’limga mos dark UI. Asosiy ranglar: #172B3A, #0F766E, #E9AE43. O‘quvchi va ustoz uchun vazifaga yo‘naltirilgan bosh sahifalar; xonadagi dars markaziy kontekst. Tafsilot docs/UI_UX.md da. Rang juftliklari kontrasti hisob bilan tekshirildi; komponent maketlarida qayta tekshiriladi.

## Keyingi aniq ish
1. Frontenddagi qolgan qo‘lda sinovlar: revision, live havola va davomat, mobil/klaviatura.
2. Atlas URI mavjud bo‘lganda haqiqiy DB smoke testi: GridFS va transaction ham.
3. AI test qoralamasi, video provayder integratsiyasi va kengroq progress modullari.

Har ishning boshida shu faylni o‘qing; tugaganda oxirgi o‘zgarish va test natijasini yangilang.
