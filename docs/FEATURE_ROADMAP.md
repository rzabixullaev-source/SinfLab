# SinfLab: yangi funksiyalar ketma-ketligi

Har bosqich kodlanganidan keyin tegishli API testi va veb ilova buildi bajariladi. Keyingi bosqichga shu tekshiruvlar o'tgach o'tiladi.

| Bosqich | Holat | Hozirgi imkoniyat | Keyingi chuqurlashtirish |
| --- | --- | --- | --- |
| 1. Ota-ona va ustoz nazorati | Mahalliy 1-bosqich tayyor | Farzand va sinf boshqaruv panellari, 7 kunlik faoliyat grafigi, bo'limlar kesimi, vazifa/test/laboratoriya/dars ishlari tarixi, AI maslahat, ustozga tekshiriladigan ishlar soni va o'quvchiga berilgan onlayn vazifa | Qurilmalararo vaqt deduplikatsiyasi, katta sinflar uchun serverdagi agregatsiya, batafsil hodisalar jurnali |
| 2. Gemini yordamchisi | Mahalliy 2-bosqich tayyor | Ustoz qo'llanmasi, har dars uchun tasdiqlanadigan AI matni, o'quvchi savoli va bahosi, ustozga javob sifati ko'rinishi, har foydalanuvchiga bazada saqlanadigan kunlik so'rov limiti va javob tokeni chegarasi | Fayl/PDF matnini ustoz tasdig'i bilan qo'shish, sarflangan tokenlarni Gemini javobidan qayd etish, uzoq muddatli pedagogik sifat tahlili |
| 3. Fanlar xaritasi | 3-bosqich tayyor | Har fanga xos interaktiv shaharcha, sinf tanlash, dars/vazifa/test/laboratoriyadan tuzilgan o'quv yo'li, ish holati va bo'limga o'tish | Darslarning o'zlashtirilishini o'lchash, mavzulararo bog'lanish va kengaytirilgan xarita |
| 4. Lug'at va kitoblar | 4-bosqich tayyor | Shaxsiy/qiyin so'zlar, Gemini tushuntirishi, sanasi bazada saqlanadigan takrorlash kartalari, muallifning kitobni tahrirlashi, ochiq kitob, TXT va Unicode shriftli PDF yuklab olish | So'zlarni import qilish, takrorlash natijalarining batafsil tahlili va kitob muqovasi |
| 5. Ta'limiy o'yinlar | 5-bosqich tayyor | E'lon qilingan testlardan 5 xil mashq: tezkor tanlov, yozma javob, til fanida so'z tuzish, hisob fanlarida sonli javob va fikrni tekshirish; ustoz yozgan izoh faqat javobdan keyin ko'rinadi, sinfdoshlar reytingi saqlanadi | Mavzuga xos yangi savol shablonlari, qayta mashq qilish va ko'proq progress tahlili |
| 6. Jonli dars | Kod va API sinovlari tayyor | O'quvchi va bog'langan ota-onaga xabar, ota-onaning kuzatuvchi huquqi, o'quvchining qo'l ko'tarishi, ustozning mikrofon ruxsati, jonli doska, faqat qatnashchilarga TURN sozlamasini berish | Zoom Video SDK kalitlari va ishlaydigan TURN serveri bilan haqiqiy media hamda ko'p qurilmali sinov |

## Ishga tushirish

- `apps/api/.env` ichida Atlas uchun `MONGODB_URI` va Gemini uchun `GEMINI_API_KEY` bo'lishi kerak. Maxfiy kalitlar gitga qo'shilmaydi.
- Atlas ulanmagan bo'lsa, `scripts/start-lan.ps1 -Mode Demo` funksiyalarni vaqtinchalik xotira bazasida ko'rsatadi. Demo qayta ishga tushganda ma'lumotlar o'chadi.
- Zoom Video SDK sessiyasi uchun `ZOOM_VIDEO_SDK_KEY` va `ZOOM_VIDEO_SDK_SECRET` kerak. Brauzerning WebRTC darsi lokal sinov uchun mavjud.
- Turli internet tarmoqlarida brauzer darsi ishlashi uchun `LIVE_TURN_URL`, `LIVE_TURN_USERNAME`, `LIVE_TURN_CREDENTIAL` ni API muhitida sozlang. TURN URL berilmasa STUN ishlatiladi; tarmoq cheklovlari tufayli ba'zi ulanishlar muvaffaqiyatsiz bo'lishi mumkin. TURN ma'lumoti faqat ruxsatli jonli dars qatnashchilariga beriladi.

## Amaliy cheklovlar

- Faol vaqt ilovaning ko'rinib turgan va yaqinda o'zaro aloqa qilingan vaqtini taxmin qiladi; bu bolaning diqqatini yoki samaradorligini isbotlamaydi. AI maslahatlari ham mavjud yozuvlarga tayangan taxmindir.
- Ota-ona kuzatuvi faqat bog'langan farzand faol a'zo bo'lgan sinfga beriladi. Brauzer darsida ota-onaga audio yuborish kanali ochilmaydi; Zoom interfeysida mikrofon boshqaruvi ko'rsatilmaydi.
- Fanlar xaritasi mavjud sinf xonalarini tartiblaydi. Sinf bo'lmasa, taklif kodi bilan qo'shilish taklif qilinadi.
- O'yin savollari ustoz e'lon qilgan testlardan olinadi; test e'lon qilinmaguncha o'yin savoli bo'lmaydi.
