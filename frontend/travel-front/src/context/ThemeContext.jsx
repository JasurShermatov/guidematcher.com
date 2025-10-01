import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(undefined);

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

export const ThemeProvider = ({ children }) => {
    const isBrowser = typeof window !== 'undefined';

    const getInitialTheme = () => {
        if (!isBrowser) return 'light';
        const saved = localStorage.getItem('theme');
        if (saved === 'light' || saved === 'dark') return saved;
        const prefersDark =
            window.matchMedia &&
            window.matchMedia('(prefers-color-scheme: dark)').matches;
        return prefersDark ? 'dark' : 'light';
    };

    const [theme, setTheme] = useState(getInitialTheme);

    const toggleTheme = () => {
        const next = theme === 'light' ? 'dark' : 'light';
        setTheme(next);
        if (isBrowser) localStorage.setItem('theme', next);
    };

    // Apply theme class to <html>
    useEffect(() => {
        if (!isBrowser) return;
        const root = document.documentElement;
        if (theme === 'dark') root.classList.add('dark');
        else root.classList.remove('dark');
    }, [theme, isBrowser]);

    // Sync with system theme if user hasn't explicitly chosen one
    useEffect(() => {
        if (!isBrowser) return;
        const mq = window.matchMedia('(prefers-color-scheme: dark)');

        const handleChange = (e) => {
            // Respect explicit user choice stored in localStorage
            const saved = localStorage.getItem('theme');
            if (!saved) setTheme(e.matches ? 'dark' : 'light');
        };

        if (mq.addEventListener) mq.addEventListener('change', handleChange);
        else if (mq.addListener) mq.addListener(handleChange); // older Safari

        return () => {
            if (mq.removeEventListener) mq.removeEventListener('change', handleChange);
            else if (mq.removeListener) mq.removeListener(handleChange);
        };
    }, [isBrowser]);

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === 'dark' }}>
            {children}
        </ThemeContext.Provider>
    );
};
