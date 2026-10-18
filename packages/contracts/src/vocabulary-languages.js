export const vocabularyLanguages = [
  { code: "uz", name: "Uzbek" },
  { code: "en", name: "English" },
  { code: "ru", name: "Russian" },
  { code: "de", name: "German" },
  { code: "fr", name: "French" },
  { code: "es", name: "Spanish" },
  { code: "tr", name: "Turkish" },
  { code: "ar", name: "Arabic" },
  { code: "zh", name: "Chinese" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
];

export const vocabularyLanguageName = (code) => vocabularyLanguages.find((language) => language.code === code)?.name ?? code;
