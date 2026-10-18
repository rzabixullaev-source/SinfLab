import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Globe2, Moon, Sun } from "lucide-react";

const messages = {
  uz: {
    auto: "Avtomatik", theme: "Ko‘rinish", language: "Sayt tili", dark: "Qora", light: "Oq",
    workspace: "ISH MAYDONI", home: "Bosh sahifa", vocabulary: "Til kitoblarim", books: "Kitoblar", parents: "Ota-ona kabineti",
    classrooms: "O‘QUV XONALARI", createRoom: "Xona yaratish", joinCode: "Kod bilan qo‘shilish", noRooms: "Hozircha xonalar yo‘q.",
    signOut: "Hisobdan chiqish", profile: "Profil", teacher: "Ustoz", student: "O‘quvchi", welcome: "Xush kelibsiz",
    loginTitle: "Hisobingizga kiring", registerTitle: "Hisob yarating", loginSubtitle: "Email va parolingiz bilan kiring.",
    registerSubtitle: "Hisob yarating. Keyin guruh yaratishingiz yoki taklif kodi bilan qo‘shilishingiz mumkin.",
    fullName: "Ism va familiya", email: "Email manzil", password: "Parol", login: "Kirish", register: "Ro‘yxatdan o‘tish",
    noAccount: "Hali hisobingiz yo‘qmi?", hasAccount: "Hisobingiz bormi?", demoAccount: "DEMO HISOB",
    authKicker: "TA’LIM UCHUN YAGONA MUHIT", authHeadline: "Bilimni bir joyda", authEmphasis: "harakatga aylantiring.", authBrand: "O‘qishning yangi tartibi",
    authStory: "Jonli dars, vazifa, test va amaliy tajribalar bir o‘quv xonasida. Ustoz uchun boshqaruv, o‘quvchi uchun aniq yo‘l.",
    authLessons: "Tartibli darslar", authLessonsText: "Har mavzu va material o‘z joyida", authLive: "Jonli ta’lim",
    authLiveText: "Birga o‘rganish va muloqot", authPractice: "Amaliy natija", authPracticeText: "Vazifa, test va laboratoriya",
    authEyebrow: "O‘QUV MUHITINGIZGA XUSH KELIBSIZ", demoHint: "Demo hisobni tanlab, yuqoridagi kirish tugmasini bosing.",
    vocabEyebrow: "SHAXSIY TIL KUTUBXONASI", vocabTitle: "Har kuni bir mavzu, har so‘z bir qadam.",
    vocabIntro: "Avval biladigan va o‘rganadigan tilingizni tanlang. Mavzular va so‘z kartalari kitobingizga yig‘iladi.",
    nativeLanguage: "Biladigan tilim", targetLanguage: "O‘rganadigan tilim", startBook: "Til kitobini boshlash", myLanguageBooks: "Til kitoblarim",
    newLanguageBook: "Yangi til kitobi", bookProgress: "{lessons} mavzu · {words} so‘z", todayTopic: "Bugungi mavzu", topicPlaceholder: "Masalan, Qiziqishlarim",
    createTopic: "Mavzuni ochish", topicExists: "Bugungi mavzu allaqachon ochilgan. So‘z qo‘shishda davom eting.",
    chooseTopic: "Mavzuni tanlang", noTopics: "Bu kitobda hali mavzu yo‘q. Bugungi birinchi mavzuni oching.",
    addWord: "So‘z qo‘shish", wordPlaceholder: "Masalan, interesting", createAiCard: "Gemini bilan karta yaratish",
    manualEntry: "Qo‘lda kiritish", aiEntry: "Gemini bilan to‘ldirish", meaning: "Tarjima", pronunciation: "O‘qilishi",
    example: "Misol gap", exampleTranslation: "Misol tarjimasi", forms: "Shakllari", saveCard: "Kartani saqlash",
    aiHint: "So‘zni yozing. Gemini tarjima, o‘qilish va misollarni tayyorlaydi.", manualHint: "AI ishlamasa kartani qo‘lda ham to‘ldirishingiz mumkin.",
    difficult: "Qiyin", markDifficult: "Qiyin deb belgilash", markEasy: "Oson deb belgilash", cardCount: "{count} ta karta",
    emptyLesson: "Bu mavzuda hali karta yo‘q.", compileBook: "Kitobni yig‘ish", openBooks: "Kitoblar sahifasi", legacyWords: "Avvalgi so‘zlar",
    legacyHint: "Eski lug‘atdagi so‘zlar saqlangan. Ularni alohida ko‘rishingiz mumkin.", openLegacy: "Eski lug‘atni ochish",
    booksEyebrow: "SINFLAB KUTUBXONASI", booksTitle: "Kitoblar javoni", booksIntro: "Til darslaridan yig‘ilgan kitoblar va yuklangan PDFlar bir joyda.",
    myBooks: "Mening kitoblarim", communityBooks: "Ulashilgan kitoblar", pdfBooks: "PDF kitoblar", vocabBook: "Lug‘at kitobi", pdfBook: "PDF kitob",
    noBooks: "Hozircha kitob yo‘q.", uploadPdf: "PDF kitob yuklash", pdfTitle: "Kitob nomi", choosePdf: "PDF faylni tanlang",
    sharePublic: "Boshqalarga ochiq qilish", private: "Shaxsiy", public: "Ochiq", byAuthor: "Muallif: {name}",
    downloadPdf: "PDF yuklash", openBook: "Kitobni ochish", shareBook: "Havolani ulashish", publish: "Ulashish uchun ochish",
    unpublish: "Shaxsiy qilish", deletePdf: "PDFni o‘chirish", deleteConfirm: "Ushbu PDF kitobni o‘chirasizmi?",
    lessons: "Mavzular", words: "So‘zlar", print: "Chop etish", back: "Orqaga", loading: "Yuklanmoqda...",
    bookSaved: "Kitob yangilandi.", linkCopied: "Havola nusxalandi.", noWordsCompile: "Kitob yig‘ish uchun kamida bitta so‘z qo‘shing.",
    dashboardGreeting: "Assalomu alaykum, {name}.", dashboardLead: "Bugungi ta’lim yo‘lingiz shu yerdan boshlanadi.",
    newRoom: "Yangi xona", connectParent: "Ota-onani bog‘lash", parentCodeHint: "Bir martalik kodni faqat ota-onangizga yuboring. Kod 48 soat amal qiladi.",
    makeCode: "Kod yaratish", heroKicker: "BIR JOYDA, BIR MAQSADDA", continueLearning: "Bugungi o‘qishni davom ettiring",
    manageLearning: "Ta’limni tartib bilan boshqaring", joinOrCreate: "Guruh yarating yoki taklif bilan qo‘shiling",
    focusReady: "Sizni kutayotgan navbatdagi ish tayyor. Davom etish uchun xonaga o‘ting.",
    allInOne: "Darslar, vazifalar va laboratoriyalar bir joyda.", manageRooms: "Xonalarni boshqaring, darslarni rejalang va o‘quvchilarning ishini kuzating.",
    firstRoomHint: "O‘zingiz guruh yaratsangiz ustoz bo‘lasiz. Taklif kodi bilan qo‘shilsangiz rolingizni sinf ustozi belgilaydi.",
    openRoom: "Xonaga o‘tish", createFirstRoom: "Birinchi xonani yaratish", learningRooms: "O‘quv xonalari",
    managedRooms: "Boshqarilayotgan xonalar", nextTasks: "Navbatdagi vazifalar", reviewAgain: "Qayta ko‘rish",
    yourSpace: "SIZNING MAKONINGIZ", roomsIntro: "Dars, suhbat va amaliy ishlar o‘z xonasida saqlanadi.",
    roomOwner: "Egasi", assistant: "Yordamchi", courseRoom: "Kurs xonasi", studyClub: "O‘quv klubi",
    noRoomTitle: "Hali xona yo‘q", noRoomText: "O‘quv xonasini yarating yoki ustoz yuborgan kod bilan qo‘shiling.",
    direction: "YO‘NALISH", nextStep: "Keyingi qadam", todayFocus: "BUGUNGI FOKUS", waitingInRoom: "{name} xonasida sizni kutayotgan ish.",
    continue: "Davom etish", allGood: "Hammasi joyida", newWorkHint: "Yangi dars va vazifalar paydo bo‘lganda shu yerda ko‘rinadi.",
    dailyThought: "Har bir kichik qadam — katta natijaning boshlanishi.",
    reviewCards: "TAKRORLASH KARTALARI", rememberWords: "So‘zlarni eslab qoling", reviewReady: "{count} ta so‘z takrorlashga tayyor. Avval so‘zni o‘ylang, keyin javobni oching.",
    answers: "{count} ta javob", seenTimes: "{count} marta ko‘rilgan", newWord: "Yangi so‘z", nextWord: "Keyingi so‘z →",
    seeAnswer: "Javobni ko‘rish", noReview: "Hozircha takrorlanadigan so‘z yo‘q", noReviewHint: "Yangi so‘z qo‘shing yoki keyingi takrorlash vaqtini kuting.",
    again: "Yana ko‘raman", hard: "Qiyin", good: "Yaxshi", easy: "Oson",
  },
  en: {
    auto: "Automatic", theme: "Appearance", language: "Site language", dark: "Dark", light: "Light",
    workspace: "WORKSPACE", home: "Home", vocabulary: "My language books", books: "Books", parents: "Parent dashboard",
    classrooms: "CLASSROOMS", createRoom: "Create classroom", joinCode: "Join with code", noRooms: "No classrooms yet.",
    signOut: "Sign out", profile: "Profile", teacher: "Teacher", student: "Student", welcome: "Welcome",
    loginTitle: "Sign in", registerTitle: "Create an account", loginSubtitle: "Sign in with your email and password.",
    registerSubtitle: "Create an account, then start a classroom or join with an invite code.",
    fullName: "Full name", email: "Email address", password: "Password", login: "Sign in", register: "Register",
    noAccount: "No account yet?", hasAccount: "Already have an account?", demoAccount: "DEMO ACCOUNT",
    authKicker: "ONE PLACE FOR LEARNING", authHeadline: "Turn knowledge into", authEmphasis: "meaningful progress.", authBrand: "A new way to learn",
    authStory: "Live classes, assignments, quizzes and experiments together. Clear tools for teachers and a clear path for students.",
    authLessons: "Organized lessons", authLessonsText: "Topics and materials in order", authLive: "Live learning",
    authLiveText: "Learn and discuss together", authPractice: "Practical work", authPracticeText: "Assignments, quizzes and labs",
    authEyebrow: "WELCOME TO YOUR LEARNING SPACE", demoHint: "Choose a demo account and use the sign-in button above.",
    vocabEyebrow: "YOUR LANGUAGE LIBRARY", vocabTitle: "One topic a day. One word at a time.",
    vocabIntro: "Choose your native and target languages first. Daily topics and word cards grow into your own book.",
    nativeLanguage: "Language I know", targetLanguage: "Language I want to learn", startBook: "Start a language book", myLanguageBooks: "My language books",
    newLanguageBook: "New language book", bookProgress: "{lessons} topics · {words} words", todayTopic: "Today's topic", topicPlaceholder: "For example, My interests",
    createTopic: "Create topic", topicExists: "Today's topic is ready. Keep adding words.", chooseTopic: "Choose a topic",
    noTopics: "No topics yet. Create your first topic today.", addWord: "Add a word", wordPlaceholder: "For example, interesting",
    createAiCard: "Create card with Gemini", manualEntry: "Enter manually", aiEntry: "Fill with Gemini", meaning: "Translation",
    pronunciation: "Pronunciation", example: "Example sentence", exampleTranslation: "Example translation", forms: "Word forms",
    saveCard: "Save card", aiHint: "Type a word. Gemini will prepare its translation, pronunciation and examples.",
    manualHint: "You can also fill in a card yourself if AI is unavailable.", difficult: "Difficult", markDifficult: "Mark difficult",
    markEasy: "Mark easy", cardCount: "{count} cards", emptyLesson: "No cards in this topic yet.", compileBook: "Compile book",
    openBooks: "Books page", legacyWords: "Earlier words", legacyHint: "Your older words are preserved in the previous vocabulary view.",
    openLegacy: "Open earlier vocabulary", booksEyebrow: "SINFLAB LIBRARY", booksTitle: "Bookshelf",
    booksIntro: "Books compiled from language lessons and uploaded PDFs in one place.", myBooks: "My books", communityBooks: "Shared books",
    pdfBooks: "PDF books", vocabBook: "Vocabulary book", pdfBook: "PDF book", noBooks: "No books yet.",
    uploadPdf: "Upload a PDF book", pdfTitle: "Book title", choosePdf: "Choose a PDF file", sharePublic: "Share with others",
    private: "Private", public: "Public", byAuthor: "Author: {name}", downloadPdf: "Download PDF", openBook: "Open book",
    shareBook: "Share link", publish: "Make public", unpublish: "Make private", deletePdf: "Delete PDF",
    deleteConfirm: "Delete this PDF book?", lessons: "Topics", words: "Words", print: "Print", back: "Back", loading: "Loading...",
    bookSaved: "Book updated.", linkCopied: "Link copied.", noWordsCompile: "Add at least one word to compile a book.",
    dashboardGreeting: "Hello, {name}.", dashboardLead: "Your learning starts here today.", newRoom: "New classroom",
    connectParent: "Connect a parent", parentCodeHint: "Send this one-time code only to your parent. It is valid for 48 hours.", makeCode: "Create code",
    heroKicker: "ONE PLACE, ONE PURPOSE", continueLearning: "Continue today's learning", manageLearning: "Keep learning organized",
    joinOrCreate: "Create a group or join by invitation", focusReady: "Your next task is ready. Open the classroom to continue.",
    allInOne: "Lessons, assignments and labs in one place.", manageRooms: "Manage classrooms, plan lessons and follow student work.",
    firstRoomHint: "Creating a group makes you its teacher. When you join by code, the classroom teacher sets your role.",
    openRoom: "Open classroom", createFirstRoom: "Create your first classroom", learningRooms: "Classrooms", managedRooms: "Managed classrooms",
    nextTasks: "Upcoming tasks", reviewAgain: "Review", yourSpace: "YOUR SPACE", roomsIntro: "Lessons, discussions and practice stay in their classroom.",
    roomOwner: "Owner", assistant: "Assistant", courseRoom: "Course classroom", studyClub: "Study club",
    noRoomTitle: "No classroom yet", noRoomText: "Create a classroom or join with a code from your teacher.",
    direction: "DIRECTION", nextStep: "Next step", todayFocus: "TODAY'S FOCUS", waitingInRoom: "Your next task is waiting in {name}.",
    continue: "Continue", allGood: "All caught up", newWorkHint: "New lessons and assignments will appear here.",
    dailyThought: "Every small step begins a bigger result.",
    reviewCards: "REVIEW CARDS", rememberWords: "Remember your words", reviewReady: "{count} words are ready to review. Think of the word, then reveal its meaning.",
    answers: "{count} answers", seenTimes: "Reviewed {count} times", newWord: "New word", nextWord: "Next word →",
    seeAnswer: "Reveal answer", noReview: "No words to review yet", noReviewHint: "Add a new word or wait for the next review date.",
    again: "Again", hard: "Hard", good: "Good", easy: "Easy",
  },
  ru: {
    auto: "Автоматически", theme: "Оформление", language: "Язык сайта", dark: "Тёмная", light: "Светлая",
    workspace: "РАБОЧЕЕ ПРОСТРАНСТВО", home: "Главная", vocabulary: "Мои языковые книги", books: "Книги", parents: "Кабинет родителя",
    classrooms: "КЛАССЫ", createRoom: "Создать класс", joinCode: "Войти по коду", noRooms: "Классов пока нет.",
    signOut: "Выйти", profile: "Профиль", teacher: "Учитель", student: "Ученик", welcome: "Добро пожаловать",
    loginTitle: "Войти в аккаунт", registerTitle: "Создать аккаунт", loginSubtitle: "Введите почту и пароль.",
    registerSubtitle: "Создайте аккаунт, затем откройте класс или войдите по коду приглашения.",
    fullName: "Имя и фамилия", email: "Адрес электронной почты", password: "Пароль", login: "Войти", register: "Зарегистрироваться",
    noAccount: "Нет аккаунта?", hasAccount: "Уже есть аккаунт?", demoAccount: "ДЕМО АККАУНТ",
    authKicker: "ЕДИНОЕ ПРОСТРАНСТВО ДЛЯ УЧЁБЫ", authHeadline: "Превратите знания", authEmphasis: "в реальный прогресс.", authBrand: "Новый формат обучения",
    authStory: "Живые уроки, задания, тесты и практические опыты в одном классе. Понятные инструменты учителю и путь ученику.",
    authLessons: "Уроки по порядку", authLessonsText: "Темы и материалы на месте", authLive: "Живое обучение",
    authLiveText: "Учимся и обсуждаем вместе", authPractice: "Практика", authPracticeText: "Задания, тесты и лабораторные",
    authEyebrow: "ДОБРО ПОЖАЛОВАТЬ В УЧЕБНУЮ СРЕДУ", demoHint: "Выберите демо аккаунт и нажмите кнопку входа выше.",
    vocabEyebrow: "ЛИЧНАЯ ЯЗЫКОВАЯ БИБЛИОТЕКА", vocabTitle: "Одна тема в день. Одно слово за раз.",
    vocabIntro: "Сначала выберите родной и изучаемый языки. Темы и карточки постепенно соберутся в книгу.",
    nativeLanguage: "Мой язык", targetLanguage: "Изучаемый язык", startBook: "Начать языковую книгу", myLanguageBooks: "Мои языковые книги",
    newLanguageBook: "Новая языковая книга", bookProgress: "{lessons} тем · {words} слов", todayTopic: "Тема дня",
    topicPlaceholder: "Например, Мои интересы", createTopic: "Создать тему", topicExists: "Тема на сегодня уже создана. Добавляйте слова.",
    chooseTopic: "Выберите тему", noTopics: "Тем пока нет. Создайте первую сегодня.", addWord: "Добавить слово",
    wordPlaceholder: "Например, interesting", createAiCard: "Создать карточку с Gemini", manualEntry: "Ввести вручную",
    aiEntry: "Заполнить с Gemini", meaning: "Перевод", pronunciation: "Произношение", example: "Пример",
    exampleTranslation: "Перевод примера", forms: "Формы слова", saveCard: "Сохранить карточку",
    aiHint: "Введите слово. Gemini подготовит перевод, произношение и примеры.", manualHint: "Если ИИ недоступен, заполните карточку вручную.",
    difficult: "Сложное", markDifficult: "Отметить сложным", markEasy: "Отметить лёгким", cardCount: "{count} карточек",
    emptyLesson: "В этой теме пока нет карточек.", compileBook: "Собрать книгу", openBooks: "Страница книг",
    legacyWords: "Старые слова", legacyHint: "Старые слова сохранены в прежнем словаре.", openLegacy: "Открыть прежний словарь",
    booksEyebrow: "БИБЛИОТЕКА SINFLAB", booksTitle: "Книжная полка", booksIntro: "Книги из языковых уроков и загруженные PDF в одном месте.",
    myBooks: "Мои книги", communityBooks: "Общие книги", pdfBooks: "Книги PDF", vocabBook: "Словарная книга",
    pdfBook: "Книга PDF", noBooks: "Книг пока нет.", uploadPdf: "Загрузить книгу PDF", pdfTitle: "Название книги",
    choosePdf: "Выберите PDF", sharePublic: "Открыть для других", private: "Личная", public: "Открытая",
    byAuthor: "Автор: {name}", downloadPdf: "Скачать PDF", openBook: "Открыть книгу", shareBook: "Поделиться ссылкой",
    publish: "Опубликовать", unpublish: "Сделать личной", deletePdf: "Удалить PDF", deleteConfirm: "Удалить эту книгу PDF?",
    lessons: "Темы", words: "Слова", print: "Печать", back: "Назад", loading: "Загрузка...",
    bookSaved: "Книга обновлена.", linkCopied: "Ссылка скопирована.", noWordsCompile: "Добавьте хотя бы одно слово для книги.",
    dashboardGreeting: "Здравствуйте, {name}.", dashboardLead: "Ваш учебный день начинается здесь.", newRoom: "Новый класс",
    connectParent: "Подключить родителя", parentCodeHint: "Отправьте одноразовый код только родителю. Он действует 48 часов.", makeCode: "Создать код",
    heroKicker: "ОДНО МЕСТО, ОДНА ЦЕЛЬ", continueLearning: "Продолжить обучение", manageLearning: "Управляйте обучением по порядку",
    joinOrCreate: "Создайте группу или войдите по приглашению", focusReady: "Следующее задание готово. Откройте класс, чтобы продолжить.",
    allInOne: "Уроки, задания и лабораторные в одном месте.", manageRooms: "Управляйте классами, планируйте уроки и следите за работой учеников.",
    firstRoomHint: "Создав группу, вы станете учителем. При входе по коду роль назначит учитель класса.",
    openRoom: "Открыть класс", createFirstRoom: "Создать первый класс", learningRooms: "Классы", managedRooms: "Мои классы",
    nextTasks: "Следующие задания", reviewAgain: "Повторение", yourSpace: "ВАШЕ ПРОСТРАНСТВО", roomsIntro: "Уроки, обсуждения и практика в своих классах.",
    roomOwner: "Владелец", assistant: "Помощник", courseRoom: "Учебный класс", studyClub: "Учебный клуб",
    noRoomTitle: "Классов пока нет", noRoomText: "Создайте класс или войдите по коду учителя.",
    direction: "НАПРАВЛЕНИЕ", nextStep: "Следующий шаг", todayFocus: "ФОКУС ДНЯ", waitingInRoom: "Следующее задание ждёт вас в {name}.",
    continue: "Продолжить", allGood: "Всё выполнено", newWorkHint: "Новые уроки и задания появятся здесь.",
    dailyThought: "Каждый маленький шаг — начало большого результата.",
    reviewCards: "КАРТОЧКИ ПОВТОРЕНИЯ", rememberWords: "Запоминайте слова", reviewReady: "{count} слов готовы к повторению. Вспомните слово, затем откройте ответ.",
    answers: "{count} ответов", seenTimes: "Повторено {count} раз", newWord: "Новое слово", nextWord: "Следующее слово →",
    seeAnswer: "Показать ответ", noReview: "Пока нечего повторять", noReviewHint: "Добавьте слово или дождитесь следующего повторения.",
    again: "Снова", hard: "Сложно", good: "Хорошо", easy: "Легко",
  },
};

const SettingsContext = createContext(null);
const readChoice = (key, allowed, fallback) => {
  try { const value = localStorage.getItem(key); return allowed.includes(value) ? value : fallback; }
  catch { return fallback; }
};
const browserLocale = () => {
  const code = navigator.language?.slice(0, 2).toLowerCase();
  return code === "ru" || code === "en" ? code : "uz";
};

export function SettingsProvider({ children }) {
  const [localeChoice, setLocaleChoice] = useState(() => readChoice("sinflab.language", ["auto", "uz", "ru", "en"], "auto"));
  const [themeChoice, setThemeChoice] = useState(() => readChoice("sinflab.theme", ["auto", "dark", "light"], "auto"));
  const [systemDark, setSystemDark] = useState(() => window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? true);
  useEffect(() => {
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!media) return;
    const update = () => setSystemDark(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const locale = localeChoice === "auto" ? browserLocale() : localeChoice;
  const theme = themeChoice === "auto" ? (systemDark ? "dark" : "light") : themeChoice;
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem("sinflab.language", localeChoice); localStorage.setItem("sinflab.theme", themeChoice); } catch { /* private browsing */ }
  }, [locale, theme, localeChoice, themeChoice]);
  const value = useMemo(() => ({ locale, localeChoice, setLocaleChoice, theme, themeChoice, setThemeChoice,
    t: (key, values = {}) => (messages[locale]?.[key] || messages.uz[key] || key).replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? "")),
  }), [locale, localeChoice, theme, themeChoice]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export const useSettings = () => useContext(SettingsContext);

export function SettingsControls({ compact = false }) {
  const { locale, localeChoice, setLocaleChoice, theme, themeChoice, setThemeChoice, t } = useSettings();
  return <div className={`settings-controls ${compact ? "settings-compact" : ""}`}>
    <label className="settings-choice"><Globe2 size={16} /><span className="sr-only">{t("language")}</span>
      <select aria-label={t("language")} value={localeChoice} onChange={(event) => setLocaleChoice(event.target.value)}>
        <option value="auto">{t("auto")} ({locale.toUpperCase()})</option><option value="uz">O‘zbekcha</option>
        <option value="ru">Русский</option><option value="en">English</option>
      </select></label>
    <label className="settings-choice">{theme === "dark" ? <Moon size={16} /> : <Sun size={16} />}<span className="sr-only">{t("theme")}</span>
      <select aria-label={t("theme")} value={themeChoice} onChange={(event) => setThemeChoice(event.target.value)}>
        <option value="auto">{t("auto")}</option><option value="dark">{t("dark")}</option><option value="light">{t("light")}</option>
      </select></label>
  </div>;
}
