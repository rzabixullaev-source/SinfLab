# Kamera darsi (brauzer WebRTC)

Hozirgi asosiy jonli dars Zoom kalitlarisiz ishlaydi. Ustoz tanlangan guruhda dars yaratadi va kamerasi bilan boshlaydi. Guruhning faol o‘quvchilariga ilova ichida xabar keladi. O‘quvchilar videoni ko‘radi va ovozni eshitadi. Gapirish uchun qo‘l ko‘taradi; ruxsat berilgach o‘z mikrofonini yoqadi. Ustoz ruxsatni qaytarishi mumkin. Dars oynasida to‘liq ekran bor.

## Mahalliy sinov

`npm run dev:demo-api` va `npm run dev:web` ni ishga tushiring. Saytni `http://127.0.0.1:5173` da oching. Bitta oynada ustoz, boshqa brauzer profili yoki inkognito oynada o‘quvchi demo hisobiga kiring. Guruhning “Jonli dars” bo‘limida ustoz “Kamera darsi”ni yaratib boshlaydi; o‘quvchi xabarni bosib qo‘shiladi. Brauzer kamera va mikrofon ruxsatini so‘raydi.

## Texnik oqim va chegaralar

- API WebSocket orqali faqat shu guruhning hosti va o‘quvchilari orasida WebRTC offer/answer/ICE xabarlarini uzatadi. Video va ovoz brauzerlar orasida WebRTC orqali o‘tadi; server media faylini saqlamaydi.
- Host har o‘quvchiga alohida oqim yuboradi. Kichik guruh demo uchun mos; katta guruhlarda SFU media server kerak bo‘ladi.
- Hozir STUN ishlatiladi. Ayrim internet/NAT tarmoqlarida ulanish uchun TURN server ham talab qilinadi. `localhost`/`127.0.0.1` yoki HTTPS brauzer kamera ruxsati uchun zarur.
- Qo‘l ruxsati platforma UI va API da tekshiriladi. Darsning o‘quvchi sahifasida kamera uzatish boshqaruvi yo‘q. WebRTC signal va media uchun sinf a’zoligi tekshiriladi.
- Zoom Video SDK eski kod sifatida saqlangan, yangi dars yaratishda asosiy tanlov brauzer kamerasi.

`node --test apps/api/test/browser-live.test.js` signalning guruh va rol chegarasini tekshiradi. Chrome’ning soxta kamera/mikrofon qurilmalari bilan ikki oynali sinovda ustoz videosi, o‘quvchi ovoziga ruxsat berish/qaytarish va to‘liq ekran ishladi.
