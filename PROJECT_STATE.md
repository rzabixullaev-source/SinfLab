# PROJECT_STATE — yangi ishni shu fayldan boshlang

## Oxirgi o'zgarish — 2026-10-18 (40 ishli amaliy studiya)

Kimyo, fizika, biologiya va kiberxavfsizlik uchun 10 tadan, jami 40 ta ssenariy `packages/contracts/src/studio.js` da. Ustoz katalogdan guruhga ish qo'shadi; o'quvchi 3D sahnada buyumni/reagentni ushlab ish joyiga olib keladi yoki asbob tugmasidan foydalanadi, miqdor va qiymatlarni o'zgartiradi, kuzatuvni jurnalga saqlaydi. Kimyoda 17 reagentli umumiy ombor, 10 tanilgan reaksiya, pH/rang/gaz/cho'kma modeli bor. 3D sahnada protsedurali stol va yorliq teksturalari, shisha/metall materiallar, modelga mos animatsiya bor. Kiberxavfsizlikda interaktiv tarmoq paneli, hodisa ko'rinishi va `help/inspect/status/test/clear` buyruqli lokal terminal bor; haqiqiy tarmoqqa ulanmaydi. Server harakatlarni katalog qoidalari bilan qayta hisoblaydi va urinishlarni rol bo'yicha ajratadi. Oldingi laboratoriyalar `LegacyLabsTab.jsx` orqali turibdi. Demo server har fandan bittadan ish yaratadi. `npm run test:api`: 24/24 o'tdi; `npm run build:web` o'tdi (katta chunk ogohlantirishi bor). Desktop va 390 px mobil brauzer ko'rinishi, 3D buyumni sudrab qo'shish, kimyoviy reaksiya va jurnalga yozish, kiber terminal amalda tekshirildi. Moddiy tajribalar o'quv modeli, ilmiy yoki xavfsizlik sertifikatsiyasidan o'tgan real muhit emas.

## Oxirgi o'zgarish — 2026-10-18 (mobil, doska, laboratoriya)

Mobil va desktop auth ekraniga ustoz/o'quvchi kirish yo'nalishi qo'shildi; bu guruhdagi real huquqni o'zgartirmaydi. Jonli WebRTC darsga ustoz tahrirlaydigan, o'quvchilar ko'radigan SVG doska qo'shildi: qalam, chiziq, doira, to'rtburchak, matn, o'chirish, katakka yopish, tanlash, surish, tekislash, teng masofa, ortga qaytarish. Doska WebSocket orqali sinxronlashadi va live_sessions hujjatida saqlanadi. Laboratoriya studiyasiga Ohmga qo'shimcha fizikadagi mayatnik, kimyodagi kislota-asos titrlashi, biologiyadagi osmos va matematikadagi chiziqli funksiya qo'shildi. Fizika mayatnigi va kimyo titrlashi Three.js WebGL sahnasida ko'rinadi; natijalar serverda hisoblanadi. Lab bo'limi alohida chunkda yuklanadi. Bir xonadagi ma'lumotlar yangilanganda lab tanlovi saqlanadi. `npm run test:api`: 22/22 o'tdi; `npm run build:web` o'tdi. Demo brauzerda ustoz kirishi, tajriba yaratish, mayatnik/kimyo 3D ko'rinishi va jonli dars doskasi ko'rildi. Kamera ruxsati, haqiqiy ikki qurilmali doska va mobil viewport qo'lda tekshirilmagan.

## Oxirgi o'zgarish — 2026-10-18

Vercel frontend login/register so'rovlarini o'zining `/api` manziliga yuborib 404 olayotgani aniqlandi. Railway API `/health` va `/ready` 200 qaytardi, noto'g'ri login 401 JSON qaytardi; ammo CORS `localhost`ga ruxsat bergan. Frontend production HTTP va WebSocket manzillari Railway API originiga yo'naltirildi (`VITE_API_ORIGIN` bilan almashtirish mumkin). Backend production CORS defaulti Vercel originiga moslandi. `npm run test:api`: 21/21 o'tdi; `npm run build:web` o'tdi va build faylida Railway origin hamda WebSocket yo'li borligi tekshirildi. `.env` Git tomonidan ignore qilinadi.

## Oxirgi holat — 2026-10-17

Asosiy jonli dars Zoom o‘rniga brauzer WebRTC kamerasiga o‘tkazildi. Ustoz guruh uchun `browser_webrtc` xonasini yaratadi va kamera/mikrofon bilan boshlaydi; o‘quvchi video/ovozni oladi, qo‘l ko‘taradi, ruxsatdan keyin mikrofonini ulaydi. To‘liq ekran bor. `apps/api/src/modules/live/signaling.js` WebSocket signal serveri guruh va rol chegarasini tekshiradi; Vite `/api` WebSocket proxy yoqilgan. Zoom eski kod sifatida keyingi bosqich uchun qoldi. `npm run test:api`: 21/21; `npm run build:web` o‘tdi. Ikki headless Chrome oynasida soxta media qurilmalari bilan video, o‘quvchi mikrofoniga ruxsat berish/qaytarish va to‘liq ekran amalda o‘tdi. Batafsil docs/CAMERA_CLASSROOM.md. STUN mavjud, ayrim tashqi tarmoqlar uchun TURN hali qo‘shilmagan.

Zoom Video SDK avvalgi kodda saqlangan, ammo yangi dars ochishda tanlov sifatida ko‘rsatilmaydi. `apps/api/.env` ichidagi kalitlar ixtiyoriy; brauzer kamera darsi ularga bog‘liq emas. Atlas URI mavjud bo‘lganda haqiqiy DB smoke testi, katta guruh uchun SFU/TURN va keyin Zoom integratsiyasi qolgan.

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
- Asosiy brauzer WebRTC kamera darsi; kelajak uchun Zoom Video SDK kodi va tashqi Zoom/Meet havolasi, check-in/out davomat.
- Ohm qonuni lab mashqi, hisob va shaxsiy urinishlar.
- O‘quvchi progress: qoldirilgan live dars, vazifa, quiz va takrorlash.

## Tekshiruv
npm run test:api: 21/21 HTTP/WebSocket test o‘tdi. Testlar xotira DB adapteriga ulanadi va asosiy rol/maxfiylik oqimlarini tekshiradi. MongoDB Atlas bilan haqiqiy ulanish, GridFS va transactionlar hali smoke testdan o‘tmagan — URI yo‘q. AI va cyber sandbox ulanmagan.

Frontend: React/Vite, dark responsiv UI. Login/ro‘yxatdan o‘tish, dashboard, xona/dars/chat/material/a’zolar, vazifa, quiz, live havola va davomat, Ohm laboratoriya, o‘quvchi rejasi API ga ulangan. Demo server `npm run dev:demo-api` orqali xotiradagi ma’lumot bilan ishlaydi. `npm run dev:web` bilan localhost:5173 da ko‘riladi. Browserda teacher login, xona/dars/chat/papka/fayl, vazifa va quiz draft/publish, lab yaratish; student login, vazifa topshirish, quiz 2/2 va lab 2 A tajribasi; ustoz 100 ball feedback va o‘quvchida accepted holati tekshirildi. Jonli tashqi havola, revision UI, mobil klaviatura sinovi va real Atlas smoke testi qolgan. Batafsil docs/FRONTEND_PLAN.md.

## Muhim fayllar
docs/BACKEND_PLAN.md — backend; docs/FRONTEND_PLAN.md — frontend; docs/API.md — marshrutlar; docs/ARCHITECTURE.md — kod tuzilishi; docs/DATA_MODEL.md — MongoDB collectionlari; docs/UI_UX.md — rang va xarakter; README.md — ishga tushirish. apps/api/.env.example konfiguratsiya namunasi. .env Gitga kirmaydi.

## Frontend dizayn qarori
Jiddiy, ta’limga mos dark UI. Asosiy ranglar: #172B3A, #0F766E, #E9AE43. O‘quvchi va ustoz uchun vazifaga yo‘naltirilgan bosh sahifalar; xonadagi dars markaziy kontekst. Tafsilot docs/UI_UX.md da. Rang juftliklari kontrasti hisob bilan tekshirildi; komponent maketlarida qayta tekshiriladi.

## Keyingi aniq ish
1. Frontenddagi qolgan qo‘lda sinovlar: revision, live havola va davomat, mobil/klaviatura.
2. Atlas URI mavjud bo‘lganda haqiqiy DB smoke testi: GridFS va transaction ham.
3. Katta yoki turli tarmoqlardagi guruhlar uchun TURN/SFU; keyin Zoom Video SDK, AI test qoralamasi va kengroq progress modullari.

Har ishning boshida shu faylni o‘qing; tugaganda oxirgi o‘zgarish va test natijasini yangilang.
