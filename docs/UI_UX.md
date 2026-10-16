# SinfLab UI/UX yo‘nalishi

Sana: 2026-10-16. Holat: frontend dizayni uchun kelishilgan boshlang‘ich yo‘nalish; ekran maketlari va React kodi keyingi ish.

## Xarakter

To‘q rangli, jiddiy, tartibli va ta’limga mos. Platforma foydalanuvchiga bugungi o‘qish yoki o‘qitish ishini aniq ko‘rsatadi. Dars mazmuni bezaklardan ustun. Laboratoriya hissi nozik chiziqlar, sxema va progress detallari orqali beriladi; neon, og‘ir animatsiya va o‘yin uslubidagi bezaklar ishlatilmaydi.

## Asosiy ranglar

- Deep navy #172B3A — asosiy panel va brend rang.
- Teal #0F766E — asosiy amal, faol holat va o‘qishdagi progress.
- Warm gold #E9AE43 — dars vaqti, muhim eslatma va alohida ta’kid.

## Yordamchi ranglar

- Umumiy fon #0B1822; ko‘tarilgan panel #203849.
- Asosiy matn #F3F7F7; ikkinchi darajali matn #B9C8CE.
- Input chegarasi #5B7785; fokus halqasi #55CFC1.
- Teal tugma hover holati #117C72; teal rangdagi kichik matn va ikonka #55CFC1.
- Xato holati #E98787. Xato, muvaffaqiyat va ogohlantirish faqat rang bilan ifodalanmaydi: matn va ikonka ham bo‘ladi.

Asosiy matnning navy panelga kontrasti 13.48:1, ikkinchi darajali matnniki 8.47:1. Oq matnning teal tugmaga kontrasti 5.47:1, navy matnning gold fonga kontrasti 7.35:1. Input chegarasi navy panelga 3.06:1. Ranglar komponentga qo‘llanganda ham kontrast qayta tekshiriladi.

## Tipografiya va shakl

- Asosiy shrift: Inter yoki o‘xshash aniq sans-serif; sarlavhalar biroz yirikroq va zichroq.
- Matn odatda 14–16 px, o‘qish materiali 16–18 px, qator oralig‘i keng.
- Kartalar 12 px radiusli, tugmalar 10 px radiusli; soyadan ko‘ra yorqinlik va chegaralar bilan qatlam ajratiladi.
- 8 px spacing tizimi. Animatsiyalar qisqa, ma’noli va kamaytirilgan harakat sozlamasini hurmat qiladi.

## Ekranlar tuzilishi

### O‘quvchi bosh sahifasi

Yuqorida “Bugun” va ayni keyingi amal. Pastda ketma-ket: yaqin dars, topshirish kerak bo‘lgan vazifa, bajarilmagan quiz, lab, qayta ko‘rish ro‘yxati. Qoldirilgan jonli dars alohida aniq karta sifatida ko‘rinadi. Har karta bitta asosiy amalga olib boradi.

### Ustoz bosh sahifasi

Faol xonalar, bugungi dars, topshirilgan ishlar va boshlash/e’lon qilish amallari. Vazifa yaratish va e’lon qilish alohida holatlar bilan ko‘rsatiladi. Ustoz chat, material, quiz va labga ayni xona kontekstidan o‘tadi.

### Xona ichida

Chap navigatsiya: Bosh sahifa, Darslar, Chat, Materiallar, Vazifalar, Testlar, Laboratoriya, A’zolar. Yuqori qismda xona nomi, rol va jonli sessiya holati. Dars sahifasi dars tafsiloti va unga bog‘liq ishlarning tabiiy markazi bo‘ladi.

## Ishlash uslubi

- Bir ekranda bitta ko‘zga tashlanadigan asosiy amal.
- Bo‘sh, yuklanayotgan, xato va muvaffaqiyat holatlari ham dizayn qilinadi.
- Ustoz va o‘quvchi bir xil asosiy navigatsiyadan foydalanadi, lekin rolga mos amallarni ko‘radi.
- Kompyuterda keng ish maydoni; telefonda qisqa navigatsiya va yirik bosiladigan elementlar.
- O‘zbekcha matnlar sodda va amaliy: “Vazifani topshirish”, “Darsga kirish”, “Tuzatib yuborish”.

## Backendga mos chegaralar

Hozirgi MVP video uchrashuvni tashqi Zoom/Meet havolasi bilan ochadi. Qoldirilgan dars kartasi sessiya va progress ma’lumotini ko‘rsatadi; avtomatik yozuv yoki AI konspekti deb ko‘rsatilmaydi. Materialni aynan darsga bog‘lash uchun qo‘shimcha API kerak. Figma/maket va frontend ishlab chiqishda ishlamaydigan funksiyalar tayyor deb chizilmaydi.

## Keyingi dizayn bosqichi

1. O‘quvchi bosh sahifasi, ustoz bosh sahifasi va xona/dars sahifasining desktop va mobil maketlari.
2. Tugma, input, karta, navigatsiya va status komponentlari.
3. React/Vite da dizayn tokenlari va sahifalar; har oqimni mavjud API bilan bog‘lab tekshirish.
