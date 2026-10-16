# Arxitektura va papkalar

## Tizim chegaralari

Brauzer (apps/web) → API (apps/api) → PostgreSQL, fayl ombori, video xizmati, AI xizmati va laboratoriya xizmati.

API ruxsat, topshiriq, test, lab urinishlari va progressning yagona nazorat nuqtasi. Brauzer ustoz/o‘quvchi ko‘rinishini boshqaradi. Video xizmati faqat media oqimi va dars sessiyasiga xizmat qiladi; vazifa va baholar bazada qoladi.

## Texnik qismlar

- apps/web/src/app: routing, sessiya va global ko‘rinish.
- apps/web/src/features: xona, jonli dars, material, vazifa, test, lab va progress ekranlari.
- apps/web/src/shared: umumiy interfeys elementlari va API klienti.
- apps/api/src/modules: har bir domen uchun route, service, repository, permission tekshiruvi.
- apps/api/src/shared: konfiguratsiya, xato qaytarish, auth middleware va provayder interfeyslari.
- packages/contracts/src: ikkala ilova foydalanadigan identifikatorlar, turlar va API shakllari.
- packages/lab-kits/src: fan modullari uchun yagona LabKit interfeysi.
- infra/db/migrations: PostgreSQL sxemasi va keyingi migratsiyalar.
- infra/video: video provayderi konfiguratsiyasi va webhook hujjatlari.
- infra/sandbox: kiberxavfsizlik mashqlari uchun ajratilgan muhit.

## Muhim ma’lumot oqimlari

### Xonaga qo‘shilish
Foydalanuvchi taklif kodini yuboradi → API xona holati va kodini tekshiradi → a’zolik yaratiladi → rolga mos ko‘rinish ochiladi. Kod bazada oddiy matn ko‘rinishida saqlanmaydi.

### Jonli dars
Ustoz dars sessiyasini boshlaydi → API video provayderida vaqtinchalik xona/token yaratadi → a’zolar roliga mos kiradi → sessiya yakunida davomat va ruxsat berilgan yozuv havolasi darsga ulanadi.

### Materialdan test
Ustoz material sahifalarini tanlaydi → matn ajratiladi → AI savol qoralamasi va manba bo‘lagini qaytaradi → ustoz tahrir va tasdiq qiladi → o‘quvchilar testni bajaradi → urinishlar va tahlil saqlanadi.

### Laboratoriya
Ustoz lab faoliyatini e’lon qiladi → o‘quvchi shaxsiy urinishni boshlaydi → modul natija va dalilni chiqaradi → API urinishni saqlaydi → ustoz ko‘rib fikr bildiradi. Kiberxavfsizlik moduli ajratilgan vaqtinchalik serverni ishga tushirib, tugagach to‘xtatadi.

## Ruxsat va maxfiylik

Xona a’zoligi barcha dars, chat, material va lab so‘rovlarida tekshiriladi. Vazifa e’loni guruhga ko‘rinadi; har bir o‘quvchining topshirig‘i va bahosi o‘sha o‘quvchi bilan ustozlarga ko‘rinadi. Ota-ona kirishi alohida bog‘lanish va rozilik orqali beriladi. Fayllar omborda maxfiy saqlanib, qisqa muddatli havola bilan ochiladi.

## Ilk versiya chegarasi

Birinchi ishlaydigan oqim: xona yaratish → a’zo qo‘shish → dars/material → jonli sessiya → bitta lab → vazifa → natija. Keyingi modullar shu modelga qo‘shiladi.
