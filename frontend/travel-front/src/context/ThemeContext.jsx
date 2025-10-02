// src/context/ThemeContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const ThemeContext = createContext(undefined);
const THEME_KEY = "theme"; // 'light' | 'dark'

const getInitial = () => {
    try {
        const saved = localStorage.getItem(THEME_KEY);
        if (saved === "light" || saved === "dark") return saved;
    } catch {}
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    return prefersDark ? "dark" : "light";
};

const applyTheme = (t) => {
    const root = document.documentElement;
    if (t === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    root.setAttribute("data-theme", t);
};

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(getInitial);

    useEffect(() => {
        applyTheme(theme);
        try { localStorage.setItem(THEME_KEY, theme); } catch {}
    }, [theme]);

    // (ixtiyoriy) tizimdagi o‘zgarishni faqat localStorage bo‘lmasa qabul qiladi
    useEffect(() => {
        const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
        if (!mq) return;
        const onChange = (e) => {
            const saved = localStorage.getItem(THEME_KEY);
            if (!saved) setTheme(e.matches ? "dark" : "light");
        };
        mq.addEventListener?.("change", onChange);
        return () => mq.removeEventListener?.("change", onChange);
    }, []);

    const isDark = theme === "dark";
    const toggleTheme = () => setTheme((p) => (p === "dark" ? "light" : "dark"));

    const value = useMemo(() => ({ theme, isDark, setTheme, toggleTheme }), [theme, isDark]);

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
    return ctx;
};
