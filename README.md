# SinfLab

## Production manzillari

Vercel frontend: `https://sinf-lab.vercel.app`. Railway API: `https://sinflabapi-production.up.railway.app` (public URL uchun `:8080` yozilmaydi). Frontend production build shu API manzilidan foydalanadi; boshqa API ishlatilsa, Vercel build muhitida `VITE_API_ORIGIN` ni uning HTTPS origin manziliga sozlang va qayta deploy qiling. Mahalliy Vite rejimi esa `/api` proxy orqali `127.0.0.1:4000` ga ulanadi.

Railway production muhiti `CORS_ORIGIN=https://sinf-lab.vercel.app` ni qabul qiladi. U berilmaganida shu manzil production default sifatida ishlatiladi; boshqa frontend domeni ishlatilsa, `CORS_ORIGIN` ni uning aniq origin manziliga sozlang. `MONGODB_URI` va `JWT_SECRET` Railway Variables ichida saqlanadi, `.env` GitHubga yuborilmaydi. API holatini `/api/v1/health` va Atlas ulanishini `/api/v1/ready` orqali tekshiring.

Ustoz boshqaradigan o‘quv xonasi: dars, chat, material, jonli uchrashuv, vazifa, test va laboratoriya bitta joyda. React interfeysi va backend MVP mavjud.

## Texnologiya

JavaScript (ESM), ReactJS, Vite, Node.js 22+, Express 5, MongoDB Atlas va GridFS. So‘rovlar Zod bilan tekshiriladi. Kirish bcryptjs va JWT orqali.

## Ishga tushirish

1. Node.js 22+ o‘rnating va loyiha ildizida npm install bajaring.
2. apps/api/.env.example faylini apps/api/.env ga nusxalang. MONGODB_URI, MONGODB_DB, JWT_SECRET va CORS_ORIGIN ni to‘ldiring.
3. Atlas loyihasida ulanish IP manziliga ruxsat va database foydalanuvchisini sozlang.
4. Bir terminalda `npm run dev:api`, ikkinchisida `npm run dev:web` ni bajaring. Brauzerda http://localhost:5173 ni oching.
5. `npm run test:api` va `npm run build:web` bilan tekshiring.

### Atlas sozlamasisiz mahalliy demo

Bir terminalda `npm run dev:demo-api`, ikkinchisida `npm run dev:web` ni bajaring. http://localhost:5173 da “Ustoz sifatida ko‘rish” yoki “O‘quvchi sifatida ko‘rish” tugmasini bosing. Demo API xotiradagi test adapteridan foydalanadi; server qayta ishga tushsa ma’lumotlar yo‘qoladi. Demo hisoblar faqat ushbu mahalliy rejimda ishlaydi.

MongoDB Atlas URI ushbu repoda saqlanmaydi. Atlas bilan haqiqiy ulanish hali sinovdan o‘tmagan; testlar xotiradagi DB adapter bilan bajarilgan.

## Amalga oshgan oqim

Ro‘yxatdan o‘tish → xona ochish → taklif bilan qo‘shilish → dars va material → Zoom/Meet havolali jonli sessiya va davomat → vazifa, topshirish, izoh, qayta topshirish → quiz → Ohm qonuni lab urinishlari → o‘quvchi progressi.

Asosiy jonli dars brauzer kamerasi va WebRTC orqali ishlaydi; Zoom kalitlari kerak emas. Ustoz guruhda kamera darsini boshlab, o‘quvchilarga platforma ichida xabar yuboradi. O‘quvchi qo‘l ko‘taradi; ustoz ruxsat bergach o‘quvchi mikrofonini yoqadi. Tayyor tashqi Zoom/Meet havolasi ham saqlangan, Zoom Video SDK esa keyingi bosqich uchun kodda qoladi. AI test yaratish, kiber sandbox va ota-ona kabineti keyingi bosqichlarda.

Zoom kalitlarini olish va demo cheklovlari: docs/ZOOM_CLASSROOM.md.
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
