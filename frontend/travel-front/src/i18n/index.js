import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import translationEn from "./locales/en/translation.json";
import translationRu from "./locales/ru/translation.json";
import translationUz from "./locales/uz/translation.json";
import translationEs from "./locales/es/translation.json";
import translationAr from "./locales/ar/translation.json";

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            en: { translation: translationEn },
            ru: { translation: translationRu },
            uz: { translation: translationUz },
            es: { translation: translationEs },
            ar: { translation: translationAr },
        },
        fallbackLng: "en",
        supportedLngs: ["en", "ru", "uz", "es", "ar"],
        interpolation: {
            escapeValue: false,
        },
        detection: {
            order: ["localStorage", "navigator"],
            caches: ["localStorage"],
        },
    });

// Tilni o‘zgartirish funksiyasi
export const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    document.documentElement.setAttribute("lang", lng);
    document.documentElement.setAttribute("dir", lng === "ar" ? "rtl" : "ltr");
};

export default i18n;
