import React from 'react';
import { Globe } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const LanguageSelector = () => {
    const { language, setLanguage } = useLanguage();

    const languages = [
        {
            code: 'en',
            name: 'English',
            flag: 'https://flagcdn.com/w20/us.png',
            shortName: 'EN'
        },
        {
            code: 'uz',
            name: "O'zbekcha",
            flag: 'https://flagcdn.com/w20/uz.png',
            shortName: 'UZ'
        },
        {
            code: 'ru',
            name: 'Русский',
            flag: 'https://flagcdn.com/w20/ru.png',
            shortName: 'RU'
        },
        {
            code: 'kz',
            name: 'Қазақша',
            flag: 'https://flagcdn.com/w20/kz.png',
            shortName: 'KZ'
        }
    ];

    const currentLanguage = languages.find(lang => lang.code === language);

    return (
        <div className="relative group">
            <button className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-800 transition-colors border border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-900 shadow-sm">
                <Globe className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                <img
                    src={currentLanguage?.flag}
                    alt={currentLanguage?.name}
                    className="w-5 h-4 object-cover rounded-sm"
                    onError={(e) => {
                        e.currentTarget.style.display = 'none';
                    }}
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden sm:inline">
          {currentLanguage?.name}
        </span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 sm:hidden">
          {currentLanguage?.shortName}
        </span>
                <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-dark-900 rounded-xl shadow-lg border border-gray-100 dark:border-dark-700 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                {languages.map((lang) => (
                    <button
                        key={lang.code}
                        onClick={() => setLanguage(lang.code)}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-dark-800 transition-colors flex items-center space-x-3 ${
                            language === lang.code ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-200'
                        }`}
                    >
                        <img
                            src={lang.flag}
                            alt={lang.name}
                            className="w-6 h-4 object-cover rounded-sm flex-shrink-0"
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                            }}
                        />
                        <div className="flex flex-col flex-1">
                            <span className="font-medium">{lang.name}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">{lang.shortName}</span>
                        </div>
                        {language === lang.code && (
                            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 ml-auto flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default LanguageSelector;