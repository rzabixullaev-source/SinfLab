# PROJECT_STATE — yangi ishni shu fayldan boshlang

## Oxirgi holat — 2026-10-17

Zoom darsi kamerasi va to‘liq ekran: SDK videosi `video-player-container` ichida ko‘rsatiladi; ustoz uchun ulanishdan oldin mahalliy kamera sinovi, darsda kamera yoqish/o‘chirish va xonani to‘liq ekranga chiqarish qo‘shildi. Audio boshlanganda mikrofon jim turadi. JWT WebRTC audio/video rejimini so‘raydi. Demo server `apps/api/.env` dagi Zoom kalitlarini o‘qiydi. Kalitlar hozircha yo‘q, shuning uchun haqiqiy Zoom media ulanib sinovdan o‘tmagan. `node --test apps/api/test/zoom.test.js` va yakuniy `npm run build:web` o‘tdi. Mahalliy demo API qayta ishga tushirildi; frontend va API HTTP javobi tekshirildi.

Ichki Zoom Video SDK darsi qo‘shildi. Ustoz tanlangan guruhda xona yaratadi, ulanishi bilan faqat shu guruhning faol o‘quvchilariga ilova ichida xabar boradi. O‘quvchi qo‘l ko‘taradi; xona yaratuvchisi ruxsat beradi, rad etadi yoki qaytaradi. Ustozning kamera va mikrofon boshqaruvi, o‘quvchining ruxsatdan keyingi mikrofoni va darsdan chiqishi UI da bor. SDK tokeni serverda imzolanadi; guruh/rol API da tekshiriladi. Kalitlarsiz demo xabar va qo‘l ko‘tarishni ko‘rsatadi, haqiqiy audio/video ishlamaydi. Sozlash: docs/ZOOM_CLASSROOM.md.

`npm run test:api`: 20/20 o‘tdi. Yakuniy `npm run build:web` o‘tdi. Zoom Video SDK kalitlari va Atlas URI yo‘q; haqiqiy media/DB smoke testi qolgan.

Keyingi ish: kalitlar mavjud bo‘lganda ikki brauzerda host va o‘quvchi audio/video sinovi, so‘ng Atlas ulanishi. Frontend qolgan funksional va mobil sinovlarini ham davom ettirish.

Sana: 2026-10-17
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
- Ichki Zoom Video SDK darsi va Zoom/Meet HTTPS havolali sessiya, check-in/out davomat.
- Ohm qonuni lab mashqi, hisob va shaxsiy urinishlar.
- O‘quvchi progress: qoldirilgan live dars, vazifa, quiz va takrorlash.

## Tekshiruv
npm run test:api: 20/20 HTTP test o‘tdi. Testlar xotira DB adapteriga ulanadi va asosiy rol/maxfiylik oqimlarini tekshiradi. MongoDB Atlas bilan haqiqiy ulanish, GridFS va transactionlar hali smoke testdan o‘tmagan — URI yo‘q. Ichki Zoom audio/video kalitlar yo‘qligi sababli amalda tekshirilmagan; AI va cyber sandbox ulanmagan.

Frontend: React/Vite, dark responsiv UI. Login/ro‘yxatdan o‘tish, dashboard, xona/dars/chat/material/a’zolar, vazifa, quiz, live havola va davomat, Ohm laboratoriya, o‘quvchi rejasi API ga ulangan. Demo server `npm run dev:demo-api` orqali xotiradagi ma’lumot bilan ishlaydi. `npm run dev:web` bilan localhost:5173 da ko‘riladi. Browserda teacher login, xona/dars/chat/papka/fayl, vazifa va quiz draft/publish, lab yaratish; student login, vazifa topshirish, quiz 2/2 va lab 2 A tajribasi; ustoz 100 ball feedback va o‘quvchida accepted holati tekshirildi. Jonli tashqi havola, revision UI, mobil klaviatura sinovi va real Atlas smoke testi qolgan. Batafsil docs/FRONTEND_PLAN.md.

## Muhim fayllar
docs/BACKEND_PLAN.md — backend; docs/FRONTEND_PLAN.md — frontend; docs/API.md — marshrutlar; docs/ARCHITECTURE.md — kod tuzilishi; docs/DATA_MODEL.md — MongoDB collectionlari; docs/UI_UX.md — rang va xarakter; README.md — ishga tushirish. apps/api/.env.example konfiguratsiya namunasi. .env Gitga kirmaydi.

## Frontend dizayn qarori
Jiddiy, ta’limga mos dark UI. Asosiy ranglar: #172B3A, #0F766E, #E9AE43. O‘quvchi va ustoz uchun vazifaga yo‘naltirilgan bosh sahifalar; xonadagi dars markaziy kontekst. Tafsilot docs/UI_UX.md da. Rang juftliklari kontrasti hisob bilan tekshirildi; komponent maketlarida qayta tekshiriladi.

## Keyingi aniq ish
1. Frontenddagi qolgan qo‘lda sinovlar: revision, live havola va davomat, mobil/klaviatura.
2. Atlas URI mavjud bo‘lganda haqiqiy DB smoke testi: GridFS va transaction ham.
3. Zoom Video SDK kalitlari mavjud bo‘lganda real media sinovi; AI test qoralamasi va kengroq progress modullari.

Har ishning boshida shu faylni o‘qing; tugaganda oxirgi o‘zgarish va test natijasini yangilang.
