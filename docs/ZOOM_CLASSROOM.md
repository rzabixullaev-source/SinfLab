# Zoom ichki darsi

Bu funksiya Zoom Video SDK orqali SinfLab ichida jonli xona ochadi. Oddiy Zoom Meeting kalitlari yoki mavjud Zoom meeting havolasi ichki media boshqaruvi uchun yetmaydi. Tayyor Zoom/Meet HTTPS havolasini qo‘shish alohida variant sifatida qolgan.

## Sozlash

1. Zoom Marketplace’da **Video SDK** ilovasini yarating va SDK Key/Secret oling.
2. `apps/api/.env.example` dan `apps/api/.env` yarating. `ZOOM_VIDEO_SDK_KEY` va `ZOOM_VIDEO_SDK_SECRET` qiymatlarini shu yerga kiriting. Secretni frontendga yoki Gitga qo‘shmang.
3. API va web ilovalarini qayta ishga tushiring. Brauzerda mikrofon/kamera ruxsati uchun `localhost` yoki HTTPS ishlating.

Demo API ham `apps/api/.env` dagi Zoom kalitlarini o‘qiydi. Shu sababli Atlas URI bo‘lmasa ham ikki demo hisobda haqiqiy Zoom media oqimini sinash mumkin. Kalitlarsiz esa faqat platformadagi xabar va qo‘l ko‘tarish ishlaydi.

## Oqim

- Ustoz guruh ichida “Jonli dars ochish”ni bosadi. Xona avval `preparing` holatida turadi.
- Ustoz SDK xonasiga ulangach, dars `live` holatiga o‘tadi. Faqat shu guruhning faol o‘quvchilariga qo‘ng‘iroq belgisi orqali xabar keladi; ro‘yxat 8 soniyada yangilanadi.
- O‘quvchi darsga tinglovchi sifatida kiradi. Kamerani yoqish tugmasi yo‘q. U gapirmoqchi bo‘lsa qo‘l ko‘taradi. Ustoz ruxsat berishi, rad qilishi yoki keyin ruxsatni qaytarishi mumkin. Ruxsat berilgach o‘quvchi mikrofonni o‘zi yoqadi. Ustoz boshlanishda umumiy mikrofonni o‘chiradi va o‘zboshimchalik bilan yoqishni cheklaydi.
- Ustoz darsni yakunlaydi. Xona boshqa guruhlarga ko‘rinmaydi. API rol va guruh a’zoligini tekshiradi.
- Ustoz ulanishdan oldin kamerani mahalliy ko‘rishda sinaydi, dars ichida kamerani yoqadi/o‘chiradi. Video Zoom SDK talab qilgan `video-player-container` ichida ko‘rsatiladi. Xonani to‘liq ekranga chiqarish va undan chiqish tugmasi bor.

## Kalitlarsiz demo

`npm run dev:demo-api` va `npm run dev:web` ni ishga tushiring. Ustoz demo hisobida guruh ichida Zoom xonasini yarating va “Demo xabarni yuborish”ni bosing. O‘quvchi demo hisobida xabar, qo‘l ko‘tarish va ustozning qarorini ko‘rsatish mumkin. Bu rejimda haqiqiy audio/video ishlamaydi. Video SDK kalitlari bo‘lmagani uchun media va Zoom xizmatidagi mikrofon ruxsatlari hali amalda sinovdan o‘tmagan.

API testlari guruh chegarasi, host tokeni, xabar, qo‘l ko‘tarish va qarorlarni xotira DB bilan tekshiradi. Haqiqiy Zoom SDK va MongoDB Atlas ulanishi alohida smoke testni talab qiladi.
