# Backend ish rejasi va holati

Texnologiya: JavaScript ESM, Node.js 22+, Express 5, MongoDB Atlas rasmiy driver, GridFS, Zod. Barcha API yo‘llari /api/v1 ostida.

Ish tartibi: kichik funksiya yozildi → shu oqim HTTP testida tekshirildi → butun API test to‘plami ishga tushirildi → keyingi funksiya. Xotira adapteri bilan o‘tgan test haqiqiy Atlas integratsiyasi o‘tdi degani emas.

## B1. Asos — bajarildi
Workspace, konfiguratsiya, Atlas ulanishi va indekslar, Express, health/ready, yagona xato formati.

## B2. Auth — bajarildi
Ro‘yxatdan o‘tish, kirish, bcrypt, JWT, /me, rate limit.

## B3. Xona va huquqlar — bajarildi
Xona, faol a’zolik, taklif muddati/limiti, rol boshqaruvi va xona chegarasi.

## B4. Dars, chat, material — bajarildi
Dars, chat/reply/moderatsiya, papkalar, GridFS upload/download (10 MB). Fayl xavfsizligi va Atlas bilan amaliy smoke test qolgan.

## B5. Vazifa va quiz — bajarildi
Vazifa draft/publish, topshirish revisionlari, feedback, quiz draft/publish, bir urinish va avtomatik baholash. AI savol qoralamasi keyingi integratsiya.

## B6. Jonli dars va lab — qisman bajarildi
Zoom/Meet havolasi orqali jonli sessiya, check-in/out va davomat. Video provayderda avtomatik xona yaratish yo‘q. Fizikadan Ohm qonuni simulyatsiyasi va urinish tarixi ishlaydi. Cyber sandbox keyingi alohida xizmat.

## B7. Shaxsiy davom — qisman bajarildi
Qoldirilgan jonli dars, tugallanmagan vazifa/quiz, qayta ko‘rish uchun quiz/lab ro‘yxati. Bildirishnoma, AI yordamchi va ota-ona kabineti hali yo‘q.

## B8. Haqiqiy muhit tekshiruvi — ochiq
MongoDB Atlas URI berilgach ulanish, indeks, transaction va GridFS bilan smoke test. API hujjati docs/API.md da. React frontend keyingi bosqich.

Oxirgi test natijasi va keyingi aniq ish PROJECT_STATE.md da.
