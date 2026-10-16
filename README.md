# SinfLab

SinfLab (ishchi nom) — ustoz boshqaradigan doimiy o‘quv xonalari uchun platforma. Bir xonada guruh suhbati, jonli dars, materiallar, vazifa, test, virtual laboratoriya va o‘quvchi natijalari bog‘lanadi.

## Asosiy mahsulot oqimi

Ustoz xona ochadi → o‘quvchilar qo‘shiladi → dars va material joylanadi → jonli dars va amaliy laboratoriya o‘tkaziladi → vazifa/test bajariladi → ustoz fikr bildiradi → natija keyingi darsga ta’sir qiladi.

Oddiy o‘quv klubida a’zolar hamkorlik qiladi. Kurs xonasida ustoz dars, vazifa va baholashni boshqaradi.

## Hozirgi bosqich

1-bosqich: mahsulot, dastur va ma’lumotlar tuzilmasi tayyorlandi. Hali ishlaydigan ilova yig‘ilmagan. Keyingi bosqich guruh yaratish va a’zolik oqimining ishlaydigan asosini qurish.

## Hujjatlar

- docs/PRODUCT.md — mahsulot qoidalari va foydalanuvchi oqimlari
- docs/ARCHITECTURE.md — komponentlar va papkalar vazifasi
- docs/DATA_MODEL.md — obyektlar, aloqalar va maxfiylik qoidalari
- docs/ROADMAP.md — bajarish ketma-ketligi va namoyish
- docs/decisions/0001-stack.md — texnologiya qarori
- infra/db/migrations/001_core.sql — dastlabki PostgreSQL jadvallari
- PROJECT_STATE.md — qisqa joriy holat; yangi ishni boshlashda avval shu faylni o‘qing

## Papkalar

- apps/web — o‘quvchi va ustoz foydalanadigan veb ilova
- apps/api — avtorizatsiya, huquqlar va biznes qoidalari
- packages/contracts — frontend va API uchun umumiy ma’lumot turlari
- packages/lab-kits — fanlarga oid laboratoriya modullari shartnomalari
- infra/db — ma’lumotlar bazasi
- infra/video — jonli dars provayderi ulanishi
- infra/sandbox — ajratilgan kiberxavfsizlik mashq muhiti
