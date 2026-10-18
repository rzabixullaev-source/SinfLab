// Short, original lessons available even before a student joins a classroom.
export const subjectResources = {
  math: [
    { title: "Kasrlar", summary: "Kasr butunning teng bo‘laklarini bildiradi. Surat nechta bo‘lak olinganini, maxraj jami bo‘laklarni ko‘rsatadi.", example: "3/4 + 1/4 = 4/4 = 1", task: "2/5 + 1/5 nechaga teng?", answer: "3/5" },
    { title: "Foizlar", summary: "Foiz sonning yuzdan bir qismidir. Miqdorning p foizini topish uchun uni p/100 ga ko‘paytiring.", example: "200 ning 15% i = 200 × 0,15 = 30", task: "80 ning 25% i nechaga teng?", answer: "20" },
    { title: "Chiziqli tenglama", summary: "Noma’lumni topish uchun tenglikning har ikki tomonida bir xil amal bajaring.", example: "2x + 3 = 11 → 2x = 8 → x = 4", task: "3x − 6 = 9 bo‘lsa, x nechaga teng?", answer: "5" },
  ],
  language: [
    { title: "Present Simple", summary: "Takrorlanadigan ish yoki odat haqida gapirganda Present Simple ishlatiladi. He, she, it bilan fe’lga odatda -s qo‘shiladi.", example: "I read every day. She reads every day.", task: "He ___ (study) English every day.", answer: "He studies English every day." },
    { title: "Past Simple", summary: "O‘tmishda tugagan ish uchun Past Simple ishlatiladi. Muntazam fe’llar odatda -ed oladi; ayrim fe’llar o‘zgaradi.", example: "We visited the library yesterday. I went home.", task: "I ___ (watch) a film yesterday.", answer: "I watched a film yesterday." },
    { title: "Savol tuzish", summary: "Present Simple savolida do yoki does gap boshiga keladi. Does bilan asosiy fe’l oddiy shaklda qoladi.", example: "Do you play? Does she play?", task: "She likes music → savolga aylantiring.", answer: "Does she like music?" },
  ],
  coding: [
    { title: "Algoritm", summary: "Algoritm masalani yechish uchun aniq ketma-ket qadamlar to‘plamidir. Har qadam bajarilishi mumkin va tushunarli bo‘lishi kerak.", example: "Ikki sonni qo‘shish: a ni ol → b ni ol → a+b ni hisobla → natijani ko‘rsat.", task: "Uchta sonning o‘rtachasini topish qadamlarini ayting.", answer: "Uch sonni qo‘shing, yig‘indini 3 ga bo‘ling va natijani ko‘rsating." },
    { title: "Shart operatori", summary: "Shart operatori dasturga tanlov qilish imkonini beradi: shart rost bo‘lsa bir yo‘l, aks holda boshqa yo‘l bajariladi.", example: "if (ball >= 60) { natija = 'o‘tdi'; }", task: "ball = 70 bo‘lsa misoldagi natija nima?", answer: "o‘tdi" },
    { title: "Takrorlash", summary: "Sikl bir xil amalni qayta-qayta bajaradi. Hisoblagich va to‘xtash sharti siklning asosiy qismlaridir.", example: "for (let i = 1; i <= 3; i++) console.log(i); // 1, 2, 3", task: "1 dan 5 gacha nechta son chiqariladi?", answer: "5 ta son" },
  ],
  physics: [
    { title: "Tezlik", summary: "Tezlik bosib o'tilgan masofaning vaqtga nisbatidir: v = s/t.", example: "120 km / 2 soat = 60 km/soat", task: "90 km yo'l 3 soatda bosilsa, tezlik qancha?", answer: "30 km/soat" },
    { title: "Kuch", summary: "Nyutonning ikkinchi qonuniga ko'ra F = m × a.", example: "2 kg × 3 m/s² = 6 N", task: "4 kg jism 2 m/s² tezlanishda qanday kuch oladi?", answer: "8 N" },
  ],
  chemistry: [
    { title: "Atom", summary: "Atom yadro va uning atrofidagi elektronlardan tuzilgan. Yadroda proton va neytron bo'ladi.", example: "Vodorod atomida bir proton bor.", task: "Atomning manfiy zaryadli zarrachasi nima?", answer: "Elektron" },
    { title: "Kimyoviy formula", summary: "Formuladagi pastki indeks element atomlari sonini bildiradi.", example: "H₂O: ikki vodorod va bir kislorod atomi.", task: "CO₂ da nechta kislorod atomi bor?", answer: "2 ta" },
  ],
  biology: [
    { title: "Hujayra", summary: "Hujayra tirik organizmning asosiy tuzilish birligidir.", example: "O'simlik hujayrasida hujayra devori va xloroplast bo'ladi.", task: "Fotosintez qaysi organoidda sodir bo'ladi?", answer: "Xloroplastda" },
    { title: "Fotosintez", summary: "O'simlik yorug'lik energiyasi yordamida suv va karbonat angidriddan oziqa hosil qiladi.", example: "Fotosintez jarayonida kislorod ajraladi.", task: "Fotosintez uchun energiya manbai nima?", answer: "Quyosh nuri" },
  ],
};

// Public practice questions are available without a classroom membership.
export const subjectGames = {
  math: [
    { question: "2/5 + 1/5 = ?", options: ["3/5", "3/10", "2/10"], answer: 0, explanation: "Maxrajlar teng; suratlar qo'shiladi." },
    { question: "80 ning 25 foizi qancha?", options: ["20", "25", "40"], answer: 0, explanation: "80 × 0,25 = 20." },
    { question: "3x − 6 = 9. x = ?", options: ["3", "5", "7"], answer: 1, explanation: "3x = 15, demak x = 5." },
  ],
  language: [
    { question: "He ___ English every day.", options: ["study", "studies", "studied"], answer: 1, explanation: "Present Simple: he/she/it bilan -s yoki -ies." },
    { question: "I ___ a film yesterday.", options: ["watch", "watches", "watched"], answer: 2, explanation: "Yesterday o'tgan zamonni bildiradi." },
    { question: "She likes music. To'g'ri savolni tanlang.", options: ["Does she like music?", "Do she likes music?", "Does she likes music?"], answer: 0, explanation: "Does bilan asosiy fe'l oddiy shaklda qoladi." },
  ],
  coding: [
    { question: "Algoritm nima?", options: ["Aniq qadamlar ketma-ketligi", "Kompyuter markasi", "Faqat kod tili"], answer: 0, explanation: "Algoritm masalani yechish uchun tartibli qadamlar to'plami." },
    { question: "ball = 70 va if (ball >= 60) bo'lsa natija?", options: ["Shart rost", "Shart yolg'on", "Xatolik"], answer: 0, explanation: "70 soni 60 dan katta." },
    { question: "1 dan 5 gacha sonlar chiqarilsa nechta son bo'ladi?", options: ["4", "5", "6"], answer: 1, explanation: "1, 2, 3, 4, 5 — beshta son." },
  ],
  physics: [
    { question: "90 km yo'l 3 soatda bosilsa, tezlik?", options: ["30 km/soat", "60 km/soat", "270 km/soat"], answer: 0, explanation: "v = s/t = 90/3 = 30." },
    { question: "4 kg × 2 m/s² kuch nechaga teng?", options: ["2 N", "6 N", "8 N"], answer: 2, explanation: "F = m × a = 8 N." },
  ],
  chemistry: [
    { question: "Manfiy zaryadli zarracha qaysi?", options: ["Elektron", "Proton", "Neytron"], answer: 0, explanation: "Elektron manfiy zaryadga ega." },
    { question: "CO₂ formulasida nechta kislorod atomi bor?", options: ["1", "2", "3"], answer: 1, explanation: "O dan keyingi ₂ indeksi ikkita atomni bildiradi." },
  ],
  biology: [
    { question: "Fotosintez qaysi organoidda sodir bo'ladi?", options: ["Xloroplast", "Yadro", "Mitoxondriya"], answer: 0, explanation: "Xloroplastda yorug'lik energiyasi yutiladi." },
    { question: "Fotosintezning energiya manbai nima?", options: ["Quyosh nuri", "Tuproq", "Shamol"], answer: 0, explanation: "Quyosh nuri energiya beradi." },
  ],
};
