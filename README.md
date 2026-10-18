# SinfLab

## Production manzillari

Vercel frontend: `https://sinf-lab.vercel.app`. Railway API: `https://sinflabapi-production.up.railway.app` (public URL uchun `:8080` yozilmaydi). Frontend production build shu API manzilidan foydalanadi; boshqa API ishlatilsa, Vercel build muhitida `VITE_API_ORIGIN` ni uning HTTPS origin manziliga sozlang va qayta deploy qiling. Mahalliy Vite rejimi esa `/api` proxy orqali `127.0.0.1:4000` ga ulanadi.

Railway production muhiti `CORS_ORIGIN=https://sinf-lab.vercel.app` ni qabul qiladi. U berilmaganida shu manzil production default sifatida ishlatiladi; boshqa frontend domeni ishlatilsa, `CORS_ORIGIN` ni uning aniq origin manziliga sozlang. `MONGODB_URI` va `JWT_SECRET` Railway Variables ichida saqlanadi, `.env` GitHubga yuborilmaydi. API holatini `/api/v1/health` va Atlas ulanishini `/api/v1/ready` orqali tekshiring.

Ustoz boshqaradigan o‘quv xonasi: dars, chat, material, jonli uchrashuv, vazifa, test va laboratoriya bitta joyda. React interfeysi va backend MVP mavjud.

## Texnologiya

JavaScript (ESM), ReactJS, Vite, Node.js 22+, Express 5, MongoDB Atlas va GridFS. So‘rovlar Zod bilan tekshiriladi. Kirish bcryptjs va JWT orqali.

## Ishga tushirish

1. Node.js 22+ o‘rnating va loyiha ildizida npm install bajaring.
2. `apps/api/.env.example` faylini `apps/api/.env` ga nusxalang. Atlas `MONGODB_URI` qiymatini kiriting, `MONGODB_DB=sinflab` ni tanlang va kamida 32 belgili `JWT_SECRET` o‘rnating. `.env` Git tomonidan e’tiborga olinmaydi.
3. Atlas loyihasida ulanish IP manziliga ruxsat va database foydalanuvchisini sozlang.
4. Bir terminalda `npm run dev:api`, ikkinchisida `npm run dev:web` ni bajaring. Brauzerda http://localhost:5173 ni oching.
5. `npm run test:api` va `npm run build:web` bilan tekshiring.

### Atlas sozlamasisiz mahalliy demo

Bir terminalda `npm run dev:demo-api`, ikkinchisida `npm run dev:web` ni bajaring. http://localhost:5173 da demo hisobni tanlab, yagona login shakli orqali kiring. Demo API xotiradagi test adapteridan foydalanadi; server qayta ishga tushsa ma’lumotlar yo‘qoladi. Demo hisoblar faqat ushbu mahalliy rejimda ishlaydi.

Bir Wi-Fi tarmog‘idagi qurilmalardan Atlasga ulangan lokal saytni ochish uchun loyiha ildizida
`powershell -ExecutionPolicy Bypass -File scripts/start-lan.ps1` ni bajaring.
Skript `apps/api/.env` dagi Atlas URI mavjudligini tekshiradi, API va frontendni ishga tushiradi va `/api/v1/ready` orqali Atlas ulanishini tasdiqlaydi. Wi-Fi IP manzilini avtomatik topadi; backend 127.0.0.1 da qoladi, frontend `/api` orqali unga ulanadi. Xotiradagi demoni alohida ishlatish uchun `powershell -ExecutionPolicy Bypass -File scripts/start-lan.ps1 -Mode Demo` ni bajaring. Telefon brauzerida kamera darsi uchun HTTPS kerak bo‘ladi.

MongoDB Atlas URI ushbu repoda saqlanmaydi. Lokal Atlas ulanishi uchun internetga chiqadigan tashqi IP manzil Atlas Network Access ro‘yxatida ruxsat etilgan bo‘lishi kerak; Wi-Fi dagi `192.168.*` manzil buning o‘rnini bosmaydi. `MONGODB_DB=sinflab` tanlangani uchun lokal amallar ham shu bazadagi ma’lumotlarni o‘zgartiradi.

## Ota-ona kabineti

Barcha foydalanuvchilar bitta login sahifasidan email va parol bilan kiradi. Sinf yaratgan foydalanuvchi o‘sha sinf egasi va ustozi bo‘ladi; kod bilan qo‘shilgan foydalanuvchining sinfdagi rolini ustoz taklif orqali belgilaydi. Bir foydalanuvchi turli sinflarda turli rolga ega bo‘lishi mumkin. Sinfda o‘quvchi bo‘lgan foydalanuvchi bosh sahifada ota-ona uchun bir martalik kod yaratadi; ota-ona umumiy hisobidan ota-ona kabinetiga o‘tib shu kodni kiritadi. Shundan keyin faqat bog‘langan farzandning dars, vazifa, test, laboratoriya, davomat va rivojlanish natijalari ko‘rinadi. Mahalliy demoda `otaona@sinflab.uz` / `Demo2026!` hisobi demo o‘quvchiga oldindan bog‘langan.

## Til kitoblari va PDF kutubxonasi

`Til kitoblarim` sahifasida avval biladigan til va o‘rganiladigan til tanlanadi. Har bir til juftligi alohida kitob bo‘ladi. Har bir kitobda Toshkent vaqti bo‘yicha kuniga bitta mavzu ochiladi; mavzuga cheklanmagan miqdorda so‘z kartalari qo‘shish mumkin. `GEMINI_API_KEY` sozlangan bo‘lsa, faqat so‘zni yozish kifoya: Gemini tarjima, talaffuz, so‘z shakllari va ikki misol gap tayyorlaydi. Kalit yoki AI xizmati mavjud bo‘lmasa, kartani qo‘lda to‘ldirish mumkin. Eski lug‘atdagi so‘zlar alohida saqlanadi va avvalgi lug‘at sahifasidan ochiladi.

`Kitoblar` sahifasida mavzularni birlashtirib PDF kitob yaratish, uni yuklab olish va ommaga ulashish mumkin. Muallif kitobni e’lon qilmaguncha u shaxsiy bo‘ladi. Boshqa PDF kitoblar ham yuklanadi (20 MB gacha), ular ham dastlab shaxsiy saqlanadi. Ulashilgan kitoblarni tizimga kirgan foydalanuvchilar ko‘radi va yuklab oladi. Sayt tepasidagi sozlamalarda oq/qora ko‘rinish hamda o‘zbek, rus, ingliz tili tanlanadi; avtomatik rejim brauzer tili va tizim ko‘rinishiga moslashadi. Hozir tarjima asosiy sahifalar, kirish, lug‘at va kitoblarda qo‘llanadi; sinf ichidagi ayrim eski modullar hali o‘zbekcha.

## Amalga oshgan oqim

Ro‘yxatdan o‘tish → xona ochish → taklif bilan qo‘shilish → dars va material → Zoom/Meet havolali jonli sessiya va davomat → vazifa, topshirish, izoh, qayta topshirish → quiz → Ohm qonuni lab urinishlari → o‘quvchi progressi.

Asosiy jonli dars brauzer kamerasi va WebRTC orqali ishlaydi; Zoom kalitlari kerak emas. Ustoz guruhda kamera darsini boshlab, o‘quvchilarga platforma ichida xabar yuboradi. O‘quvchi qo‘l ko‘taradi; ustoz ruxsat bergach o‘quvchi mikrofonini yoqadi. Ustoz jonli doskada qalam, shakl va matndan foydalanadi, shakllarni katakka yopishtirib tekislaydi; o‘quvchilar doskani ko‘radi. Interaktiv studiyada kimyo, fizika, biologiya va kiberxavfsizlik uchun 10 tadan, jami 40 ta ssenariy bor: o‘quvchi 3D sahnadagi asbob yoki reagentni olib ish maydoniga qo‘yadi, parametrlarni o‘zgartiradi va kuzatuvni jurnalga saqlaydi. 3D sahna protsedurali tekstura, shisha va metall materiallardan foydalanadi; kiberxavfsizlik yopiq simulyatsion muhitda ishlaydi. Natija serverda hisoblanadi. Oldingi sodda laboratoriyalar ham alohida bo‘limda saqlangan. Bular o‘quv simulyatsiyalari, haqiqiy laboratoriya yoki tarmoqni almashtirmaydi. Tayyor tashqi Zoom/Meet havolasi ham saqlangan, Zoom Video SDK esa keyingi bosqich uchun kodda qoladi. AI test yaratish keyingi bosqichda; ota-ona kabineti ishlaydi.

Zoom kalitlarini olish va demo cheklovlari: docs/ZOOM_CLASSROOM.md.

Turli tarmoqlardagi brauzer jonli darsi uchun API muhitiga `LIVE_TURN_URL`, `LIVE_TURN_USERNAME`, `LIVE_TURN_CREDENTIAL` qo'shiladi. Bu qiymatlar bo'lmasa WebRTC STUN orqali ulanadi va ayrim tarmoqlarda video aloqa o'rnatilmasligi mumkin.
Brauzer kamera darsi va uning tarmoq talablari: docs/CAMERA_CLASSROOM.md.

## Hujjatlar

- docs/BACKEND_PLAN.md — backend bosqichlari va holati.
- docs/API.md — mavjud API yo‘llari va ishlatish qoidalari.
- docs/ARCHITECTURE.md — arxitektura va papkalar.
- docs/DATA_MODEL.md — MongoDB collectionlari va ruxsatlar.
- docs/ROADMAP.md — qolgan ishlar ketma-ketligi.
- docs/UI_UX.md — to‘q rangli frontend yo‘nalishi va ekranlar.
- docs/FRONTEND_PLAN.md — frontend bosqichlari va tekshiruvlar.
- docs/ZOOM_CLASSROOM.md — ichki Zoom darsi va demo sozlamalari.
- docs/CAMERA_CLASSROOM.md — kalitlarsiz kamera darsi va WebRTC cheklovlari.
- PROJECT_STATE.md — qisqa joriy holat; keyingi ishni shu fayldan boshlang.
