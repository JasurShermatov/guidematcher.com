import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Globe, Moon, Sun, Menu, X, ChevronDown } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useUser } from '../context/UserContext';
import { getDashboardPath } from '../context/UserContext';

// Portal komponenti
function Portal({ children }) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    if (!mounted) return null;
    return createPortal(children, document.body);
}

export default function Navbar() {
    const navigate = useNavigate();
    const { language, setLanguage, t } = useLanguage();
    const { isDark, toggleTheme } = useTheme();
    const { isAuthenticated, user, role, logout } = useUser();

    const [open, setOpen] = useState(false);
    const [langOpen, setLangOpen] = useState(false);

    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
    }, [open]);

    const languages = [
        { code: 'en', label: 'English', flag: '🇺🇸' },
        { code: 'uz', label: "O'zbek", flag: '🇺🇿' },
        { code: 'ru', label: 'Русский', flag: '🇷🇺' },
        { code: 'kz', label: 'Қазақ', flag: '🇰🇿' },
    ];

    const goMyDashboard = () => {
        if (!isAuthenticated) return navigate('/auth');
        if (!role) return navigate('/');
        navigate(getDashboardPath(role), { replace: true });
    };

    const onSignOut = async () => {
        await logout();
        setOpen(false);
        navigate('/', { replace: true });
    };

    return (
        <header className="fixed top-0 inset-x-0 z-50 bg-white/80 dark:bg-[#161616]/90 text-gray-900 dark:text-white backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-[#161616]/70 shadow-sm">
            <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                <button onClick={() => navigate('/')} className="flex items-center gap-2">
                    <img src="/image.png" alt="UzGuide" className="h-7 w-7 rounded" />
                    <span className="text-xl font-semibold text-rose-500">UzGuide</span>
                </button>

                <div className="flex items-center gap-3">
                    <div className="hidden lg:flex items-center gap-3">
                        <button
                            onClick={() => navigate('/search')}
                            className="px-3 py-2 rounded-lg border border-gray-200/60 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 text-sm"
                        >
                            {t('nav.findGuides') || 'Find Guides'}
                        </button>

                        {/* Language dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setLangOpen((s) => !s)}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200/60 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 text-sm"
                            >
                                <Globe className="h-4 w-4" />
                                <span className="hidden xl:inline">
                  {languages.find((l) => l.code === language)?.label || 'Language'}
                </span>
                                <ChevronDown className="h-4 w-4" />
                            </button>
                            {langOpen && (
                                <div
                                    className="absolute right-0 mt-2 w-44 rounded-md border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1e1e1e] shadow-lg p-1"
                                    onMouseLeave={() => setLangOpen(false)}
                                >
                                    {languages.map((l) => (
                                        <button
                                            key={l.code}
                                            onClick={() => { setLanguage(l.code); setLangOpen(false); }}
                                            className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-gray-100 dark:hover:bg-white/10 ${language === l.code ? 'bg-gray-100 dark:bg-white/10' : ''}`}
                                        >
                                            <span className="mr-2">{l.flag}</span>{l.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Theme toggle */}
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-lg border border-gray-200/60 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10"
                            aria-label="Toggle theme"
                        >
                            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                        </button>

                        {/* Auth actions */}
                        {isAuthenticated ? (
                            <>
                                <button
                                    onClick={goMyDashboard}
                                    className="px-4 py-2 rounded-full border border-gray-200/60 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 text-sm"
                                >
                                    {user?.first_name ? `Hi, ${user.first_name}` : 'My dashboard'}
                                </button>
                                <button
                                    onClick={onSignOut}
                                    className="ml-1 bg-gradient-to-r from-gray-500 to-gray-700 px-5 py-2 rounded-full text-sm font-medium text-white"
                                >
                                    Sign Out
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => navigate('/auth')}
                                className="ml-1 bg-gradient-to-r from-rose-500 to-orange-500 px-5 py-2 rounded-full text-sm font-medium text-white"
                            >
                                {t('nav.signIn') || 'Sign In'}
                            </button>
                        )}
                    </div>

                    {/* Mobile menu button */}
                    <button
                        className="lg:hidden p-2 rounded-md hover:bg-gray-100 dark:hover:bg-white/10"
                        onClick={() => setOpen(true)}
                        aria-label="Open menu"
                    >
                        <Menu className="h-6 w-6" />
                    </button>
                </div>
            </nav>

            {/* Mobile slide-over */}
            {open && (
                <Portal>
                    <div className="fixed inset-0 z-[100] lg:hidden">
                        <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
                        <div className="absolute right-0 top-0 h-full w-80 max-w-[85%] bg-white dark:bg-[#141414] text-gray-900 dark:text-white border-l border-gray-200 dark:border-white/10 p-4 flex flex-col shadow-xl">
                            <div className="flex items-center justify-between mb-4">
                                <button onClick={() => { setOpen(false); navigate('/'); }} className="flex items-center gap-2">
                                    <img src="/image.png" alt="UzGuide" className="h-7 w-7 rounded" />
                                    <span className="text-xl font-semibold text-rose-500">UzGuide</span>
                                </button>
                                <button
                                    onClick={() => setOpen(false)}
                                    className="p-2 rounded-md border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10"
                                    aria-label="Close menu"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Language + Theme */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="relative">
                                    <button
                                        onClick={() => setLangOpen((s) => !s)}
                                        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 text-sm"
                                    >
                                        <Globe className="h-4 w-4" />
                                        {languages.find((l) => l.code === language)?.code.toUpperCase()}
                                        <ChevronDown className="h-4 w-4" />
                                    </button>
                                    {langOpen && (
                                        <div
                                            className="absolute right-0 mt-2 w-44 rounded-md border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1e1e1e] shadow-lg p-1"
                                            onMouseLeave={() => setLangOpen(false)}
                                        >
                                            {languages.map((l) => (
                                                <button
                                                    key={l.code}
                                                    onClick={() => { setLanguage(l.code); setLangOpen(false); }}
                                                    className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-gray-100 dark:hover:bg-white/10 ${language === l.code ? 'bg-gray-100 dark:bg-white/10' : ''}`}
                                                >
                                                    <span className="mr-2">{l.flag}</span>{l.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={toggleTheme}
                                    className="p-2 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10"
                                    aria-label="Toggle theme"
                                    title={isDark ? 'Switch to light' : 'Switch to dark'}
                                >
                                    {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                                </button>
                            </div>

                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={() => { setOpen(false); navigate('/search'); }}
                                    className="px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-left"
                                >
                                    {t('nav.findGuides') || 'Find Guides'}
                                </button>

                                {isAuthenticated ? (
                                    <>
                                        <button
                                            onClick={() => { setOpen(false); goMyDashboard(); }}
                                            className="px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-left"
                                        >
                                            {user?.first_name ? `Hi, ${user.first_name}` : 'My dashboard'}
                                        </button>
                                        <button
                                            onClick={onSignOut}
                                            className="mt-2 inline-flex justify-center items-center rounded-full bg-gradient-to-r from-gray-500 to-gray-700 px-4 py-2 font-medium text-white"
                                        >
                                            Sign Out
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => { setOpen(false); navigate('/auth'); }}
                                        className="mt-2 inline-flex justify-center items-center rounded-full bg-gradient-to-r from-rose-500 to-orange-500 px-4 py-2 font-medium text-white"
                                    >
                                        {t('nav.signIn') || 'Sign In'}
                                    </button>
                                )}
                            </div>

                            <div className="mt-auto pt-4 text-xs text-gray-500 dark:text-gray-400">
                                © {new Date().getFullYear()} UzGuide
                            </div>
                        </div>
                    </div>
                </Portal>
            )}
        </header>
    );
}
