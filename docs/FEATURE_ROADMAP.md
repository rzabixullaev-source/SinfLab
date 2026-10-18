# SinfLab: yangi funksiyalar ketma-ketligi

Har bosqich kodlanganidan keyin tegishli API testi va veb ilova buildi bajariladi. Keyingi bosqichga shu tekshiruvlar o'tgach o'tiladi.

| Bosqich | Holat | Hozirgi imkoniyat | Keyingi chuqurlashtirish |
| --- | --- | --- | --- |
| 1. Ota-ona va ustoz nazorati | Mahalliy 1-bosqich tayyor | Farzand va sinf boshqaruv panellari, 7 kunlik faoliyat grafigi, bo'limlar kesimi, vazifa/test/laboratoriya/dars ishlari tarixi, AI maslahat, ustozga tekshiriladigan ishlar soni va o'quvchiga berilgan onlayn vazifa | Qurilmalararo vaqt deduplikatsiyasi, katta sinflar uchun serverdagi agregatsiya, batafsil hodisalar jurnali |
| 2. Gemini yordamchisi | Mahalliy MVP tayyor | Ustozning yozma o'qitish qo'llanmasi, o'quvchi savoli, natijalar asosida maslahat | Ustoz tasdiqlagan dars materiallarini kontekstga qo'shish, javob sifati bahosi va xarajat limiti |
| 3. Fanlar xaritasi | Mahalliy MVP tayyor | Fan shaharchalari, fan mavzusi dizayni va mavjud sinflarga o'tish | Har fan uchun alohida interaktiv manzara va o'quv yo'li |
| 4. Lug'at va kitoblar | Mahalliy MVP tayyor | Shaxsiy/qiyin so'zlar, shakl va misollar, Gemini tushuntirishi, kitob nusxasi, ochiq kitob, TXT yuklab olish va PDFga chop etish | Takrorlash kartalari, kitob tahriri, bevosita PDF eksport |
| 5. Ta'limiy o'yinlar | Mahalliy MVP tayyor | E'lon qilingan testlardan 2 xil mashq, serverda tekshirish, sinfdoshlar reytingi | Fanlarga xos qo'shimcha o'yin mexanikalari, mavzu tushuntirishlari |
| 6. Jonli dars | Mahalliy MVP tayyor | O'quvchi va bog'langan ota-onaga xabar, ota-onaning kuzatuvchi huquqi, o'quvchining qo'l ko'tarishi | Zoom Video SDK kalitlari bilan haqiqiy media sinovi, internetdagi TURN serveri va ko'p qurilmali sinov |

## Ishga tushirish

- `apps/api/.env` ichida Atlas uchun `MONGODB_URI` va Gemini uchun `GEMINI_API_KEY` bo'lishi kerak. Maxfiy kalitlar gitga qo'shilmaydi.
- Atlas ulanmagan bo'lsa, `scripts/start-lan.ps1 -Mode Demo` funksiyalarni vaqtinchalik xotira bazasida ko'rsatadi. Demo qayta ishga tushganda ma'lumotlar o'chadi.
- Zoom Video SDK sessiyasi uchun `ZOOM_VIDEO_SDK_KEY` va `ZOOM_VIDEO_SDK_SECRET` kerak. Brauzerning WebRTC darsi lokal sinov uchun mavjud.

## Amaliy cheklovlar

- Faol vaqt ilovaning ko'rinib turgan va yaqinda o'zaro aloqa qilingan vaqtini taxmin qiladi; bu bolaning diqqatini yoki samaradorligini isbotlamaydi. AI maslahatlari ham mavjud yozuvlarga tayangan taxmindir.
- Ota-ona kuzatuvi faqat bog'langan farzand faol a'zo bo'lgan sinfga beriladi. Brauzer darsida ota-onaga audio yuborish kanali ochilmaydi; Zoom interfeysida mikrofon boshqaruvi ko'rsatilmaydi.
- Fanlar xaritasi mavjud sinf xonalarini tartiblaydi. Sinf bo'lmasa, taklif kodi bilan qo'shilish taklif qilinadi.
- O'yin savollari ustoz e'lon qilgan testlardan olinadi; test e'lon qilinmaguncha o'yin savoli bo'lmaydi.
