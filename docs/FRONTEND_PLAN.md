# Frontend ish rejasi

Stack: ReactJS, JavaScript, Vite. Dizayn: docs/UI_UX.md. API: docs/API.md. Har qismdan keyin build va tegishli oqim smoke testi bajariladi.

## F1. Asos va kirish

Holat: tayyor. Production build; browserda demo login, xona yaratish va sessiyani qayta yuklash tekshirildi.

- Vite workspace, API proxy, dark dizayn tokenlari, responsiv qobiq.
- Login/ro‘yxatdan o‘tish, sessiyani tiklash, chiqish, xato va loading holatlari.
- Xona ro‘yxati, yangi xona va taklif kodi bilan qo‘shilish.
- Test: production build; browserda kirish, xona yaratish va qayta yuklanganda sessiya.

## F2. Xona va dars muhiti

Holat: tayyor. Browserda dars yaratish, chatga yozish, papka yaratish va fayl yuklash tekshirildi.

- Rolga mos xona navigatsiyasi va overview.
- Darslar, chat, material papkalari, fayl yuklash/yuklab olish, a’zolar va taklif.
- Test: o‘qituvchi yaratadi, o‘quvchi o‘qiydi, ruxsat holatlari.

## F3. Baholash oqimi

Holat: tayyor. Browserda ustoz vazifa/test qoralamasi yaratdi va e’lon qildi; o‘quvchi vazifani topshirdi, testda 2/2 ball oldi. Ustoz 100 ball va fikr yubordi; o‘quvchi qabul qilingan holatni ko‘rdi. Revision so‘rash va qayta yuborish API testida bor, frontendda alohida qo‘lda sinov qolgan.

- Vazifa draft/publish, o‘quvchi topshirishi, ustoz feedbacki va qayta topshirish.
- Quiz yaratish/e’lon qilish, urinish va natija.
- Test: boshidan oxirigacha teacher/student oqimi.

## F4. Jonli dars, lab va progress

Holat: asosiy interfeys tayyor. Laboratoriya yaratish va o‘quvchining 12 V / 6 Ω = 2 A tajribasi browserda tekshirildi. Shaxsiy reja test topshirilgach yangilanadi. Jonli dars shakli va tugmalari ko‘rildi, real Zoom/Meet havolasi bilan qo‘lda sinov qolgan.

- Jonli sessiya, davomat, tashqi havolaga kirish.
- Ohm lab mashqi va tarix; o‘quvchining bugungi ishlar paneli.
- Test: API bilan oqim va mobil ko‘rinish.

## F5. Yakuniy sifat

Holat: production build va asosiy desktop browser smoke testi o‘tdi. Mobil ko‘rinish, klaviatura va Atlas bilan real ulanish hali alohida tekshiriladi.

- Klaviatura, fokus, kontrast, loading/empty/error holatlari.
- Production build va browser smoke test.
- MongoDB Atlas URI berilganda haqiqiy backend bilan smoke test; ungacha alohida demo server xotirada ishlaydi va “Demo” deb belgilanadi.
