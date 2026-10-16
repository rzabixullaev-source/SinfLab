# SinfLab

Ustoz boshqaradigan o‘quv xonasi: dars, chat, material, jonli uchrashuv, vazifa, test va laboratoriya bitta joyda. Hozir backend ishlaydi; React interfeysi keyingi bosqich.

## Texnologiya

JavaScript (ESM), Node.js 22+, Express 5, MongoDB Atlas va GridFS. So‘rovlar Zod bilan tekshiriladi. Kirish bcryptjs va JWT orqali.

## Ishga tushirish

1. Node.js 22+ o‘rnating va loyiha ildizida npm install bajaring.
2. apps/api/.env.example faylini apps/api/.env ga nusxalang. MONGODB_URI, MONGODB_DB, JWT_SECRET va CORS_ORIGIN ni to‘ldiring.
3. Atlas loyihasida ulanish IP manziliga ruxsat va database foydalanuvchisini sozlang.
4. npm run dev:api bilan API ni oching. GET /api/v1/health va GET /api/v1/ready ni tekshiring.
5. npm run test:api bilan API testlarini bajaring.

MongoDB Atlas URI ushbu repoda saqlanmaydi. Atlas bilan haqiqiy ulanish hali sinovdan o‘tmagan; testlar xotiradagi DB adapter bilan bajarilgan.

## Amalga oshgan oqim

Ro‘yxatdan o‘tish → xona ochish → taklif bilan qo‘shilish → dars va material → Zoom/Meet havolali jonli sessiya va davomat → vazifa, topshirish, izoh, qayta topshirish → quiz → Ohm qonuni lab urinishlari → o‘quvchi progressi.

Video xona provayderda avtomatik yaratilmaydi: ustoz tayyor HTTPS havola kiritadi. AI test yaratish, kiber sandbox, ota-ona kabineti va React interfeysi keyingi bosqichlarda.

## Hujjatlar

- docs/BACKEND_PLAN.md — backend bosqichlari va holati.
- docs/API.md — mavjud API yo‘llari va ishlatish qoidalari.
- docs/ARCHITECTURE.md — arxitektura va papkalar.
- docs/DATA_MODEL.md — MongoDB collectionlari va ruxsatlar.
- docs/ROADMAP.md — qolgan ishlar ketma-ketligi.
- PROJECT_STATE.md — qisqa joriy holat; keyingi ishni shu fayldan boshlang.
