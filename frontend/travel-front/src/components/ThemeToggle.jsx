import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const ThemeToggle = () => {
    const { theme, toggleTheme, isDark } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className="relative p-2 rounded-lg border border-gray-300 dark:border-dark-700 bg-white dark:bg-dark-900 hover:bg-gray-50 dark:hover:bg-dark-800 transition-all duration-200 shadow-sm"
            aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        >
            <div className="relative w-5 h-5">
                <Sun
                    className={`absolute inset-0 h-5 w-5 text-yellow-500 transition-all duration-300 ${
                        isDark ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'
                    }`}
                />
                <Moon
                    className={`absolute inset-0 h-5 w-5 text-blue-400 transition-all duration-300 ${
                        isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0'
                    }`}
                />
            </div>
        </button>
    );
};

export default ThemeToggle;
