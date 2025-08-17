import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
    FiMenu,
    FiX,
    FiSun,
    FiMoon,
    FiMonitor,
    FiClock,
    FiChevronDown,
    FiGlobe,
    FiLogIn,
    FiCheck,
    FiLogOut,
} from "react-icons/fi";
import { useTranslation } from "react-i18next"; // i18next hook
import { changeLanguage } from "../../i18n"; // Til o‘zgartirish funksiyasi
import { logoutUser } from "../../api/api";
import "./Header.css";

const Header = ({ isAuthenticated, setIsAuthenticated, user, setUser }) => {
    const { t } = useTranslation(); // Tarjima uchun hook
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [theme, setTheme] = useState("default");
    const [language, setLanguage] = useState("en");
    const [isThemeDropdownOpen, setIsThemeDropdownOpen] = useState(false);
    const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
    const [isAvatarDropdownOpen, setIsAvatarDropdownOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);

    const themeDropdownRef = useRef(null);
    const langDropdownRef = useRef(null);
    const avatarDropdownRef = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();

    const themeOptions = [
        { value: "light", label: t("theme.light"), icon: <FiSun />, description: t("theme.light_desc") },
        { value: "dark", label: t("theme.dark"), icon: <FiMoon />, description: t("theme.dark_desc") },
        { value: "default", label: t("theme.default"), icon: <FiMonitor />, description: t("theme.default_desc") },
        { value: "auto", label: t("theme.auto"), icon: <FiClock />, description: t("theme.auto_desc") },
    ];

    const languageOptions = [
        { value: "en", label: t("language.en"), nativeName: t("language.en_native"), flag: "🇺🇸", dir: "ltr" },
        { value: "ru", label: t("language.ru"), nativeName: t("language.ru_native"), flag: "🇷🇺", dir: "ltr" },
        { value: "uz", label: t("language.uz"), nativeName: t("language.uz_native"), flag: "🇺🇿", dir: "ltr" },
        { value: "es", label: t("language.es"), nativeName: t("language.es_native"), flag: "🇪🇸", dir: "ltr" },
        { value: "ar", label: t("language.ar"), nativeName: t("language.ar_native"), flag: "🇸🇦", dir: "rtl" },
    ];

    const currentLang = languageOptions.find((lang) => lang.value === language);

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 20);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    useEffect(() => {
        const root = document.documentElement;
        const updateTheme = () => {
            if (theme === "auto") {
                const hour = new Date().getHours();
                root.setAttribute("data-theme", hour >= 6 && hour < 18 ? "light" : "dark");
            } else if (theme === "default") {
                root.setAttribute(
                    "data-theme",
                    window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
                );
            } else {
                root.setAttribute("data-theme", theme);
            }
        };

        updateTheme();

        if (theme === "auto") {
            const interval = setInterval(updateTheme, 60000);
            return () => clearInterval(interval);
        }

        if (theme === "default") {
            const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
            const handler = (e) => root.setAttribute("data-theme", e.matches ? "dark" : "light");
            mediaQuery.addEventListener("change", handler);
            return () => mediaQuery.removeEventListener("change", handler);
        }
    }, [theme]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (themeDropdownRef.current && !themeDropdownRef.current.contains(event.target)) {
                setIsThemeDropdownOpen(false);
            }
            if (langDropdownRef.current && !langDropdownRef.current.contains(event.target)) {
                setIsLangDropdownOpen(false);
            }
            if (avatarDropdownRef.current && !avatarDropdownRef.current.contains(event.target)) {
                setIsAvatarDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        const handleEscapeKey = (event) => {
            if (event.key === "Escape") {
                setIsMenuOpen(false);
                setIsThemeDropdownOpen(false);
                setIsLangDropdownOpen(false);
                setIsAvatarDropdownOpen(false);
            }
        };
        document.addEventListener("keydown", handleEscapeKey);
        return () => document.removeEventListener("keydown", handleEscapeKey);
    }, []);

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

    const handleThemeChange = (newTheme) => {
        setTheme(newTheme);
        setIsThemeDropdownOpen(false);
    };

    const handleLanguageChange = (newLang) => {
        setLanguage(newLang);
        changeLanguage(newLang); // i18n tilni o‘zgartirish
        setIsLangDropdownOpen(false);
    };

    const handleLogout = async () => {
        try {
            await logoutUser();
            setIsAuthenticated(false);
            setUser(null);
            setIsAvatarDropdownOpen(false);
            navigate("/");
        } catch (error) {
            console.error("Logout error:", error.message);
            setIsAuthenticated(false);
            setUser(null);
            setIsAvatarDropdownOpen(false);
            navigate("/");
        }
    };

    const menuItems = [
        { label: t("header.find_guides"), href: "/find-guides" },
        { label: t("header.blog"), href: "#blog" },
    ];

    const hideMenu = isAuthenticated && location.pathname === "/account";
    const logoDestination = isAuthenticated ? "/account" : "/";

    return (
        <header className={`header-main ${isScrolled ? "header-scrolled" : ""}`}>
            <div className="header-container">
                <div className="header-logo-section">
                    <Link to={logoDestination} className="header-logo">
                        <div className="header-logo-icon">
                            <FiGlobe />
                            <div className="header-logo-glow"></div>
                        </div>
                        <div className="header-logo-text-container">
                            <span className="header-logo-text">{t("header.logo_text")}</span>
                            <span className="header-logo-tagline">{t("header.tagline")}</span>
                        </div>
                    </Link>
                </div>

                {!hideMenu && (
                    <nav className="header-nav">
                        <ul className="header-nav-list">
                            {menuItems.map((item, index) => (
                                <li key={index} className="header-nav-item">
                                    {item.href.startsWith("/") ? (
                                        <Link to={item.href} className="header-nav-link">
                                            {item.label}
                                        </Link>
                                    ) : (
                                        <a href={item.href} className="header-nav-link">
                                            {item.label}
                                        </a>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </nav>
                )}

                <div className="header-controls">
                    <div className="header-dropdown header-lang-dropdown" ref={langDropdownRef}>
                        <button
                            className="header-control-btn header-lang-btn"
                            onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                            aria-label={t("header.select_language")}
                            aria-expanded={isLangDropdownOpen}
                        >
                            <span className="header-flag">{currentLang?.flag}</span>
                            <span className="header-lang-code">{language.toUpperCase()}</span>
                            <FiChevronDown className={`header-dropdown-arrow ${isLangDropdownOpen ? "header-open" : ""}`} />
                        </button>
                        {isLangDropdownOpen && (
                            <div className="header-dropdown-menu header-lang-menu">
                                <div className="header-dropdown-header">{t("header.select_language")}</div>
                                {languageOptions.map((option) => (
                                    <button
                                        key={option.value}
                                        className={`header-dropdown-item ${language === option.value ? "header-active" : ""}`}
                                        onClick={() => handleLanguageChange(option.value)}
                                        dir={option.dir}
                                    >
                                        <span className="header-flag">{option.flag}</span>
                                        <span className="header-lang-name">{option.nativeName}</span>
                                        {language === option.value && <FiCheck className="header-check-mark" />}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="header-dropdown header-theme-dropdown" ref={themeDropdownRef}>
                        <button
                            className="header-control-btn header-theme-btn"
                            onClick={() => setIsThemeDropdownOpen(!isThemeDropdownOpen)}
                            aria-label={t("header.choose_appearance")}
                            aria-expanded={isThemeDropdownOpen}
                        >
                            {themeOptions.find((opt) => opt.value === theme)?.icon}
                            <FiChevronDown className={`header-dropdown-arrow ${isThemeDropdownOpen ? "header-open" : ""}`} />
                        </button>
                        {isThemeDropdownOpen && (
                            <div className="header-dropdown-menu header-theme-menu">
                                <div className="header-dropdown-header">{t("header.choose_appearance")}</div>
                                {themeOptions.map((option) => (
                                    <button
                                        key={option.value}
                                        className={`header-dropdown-item ${theme === option.value ? "header-active" : ""}`}
                                        onClick={() => handleThemeChange(option.value)}
                                    >
                                        <div className="header-theme-icon">{option.icon}</div>
                                        <span className="header-theme-name">{option.label}</span>
                                        {theme === option.value && <FiCheck className="header-check-mark" />}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {isAuthenticated ? (
                        <div className="header-dropdown header-avatar-dropdown" ref={avatarDropdownRef}>
                            <button
                                className="header-control-btn header-avatar-btn"
                                onClick={() => setIsAvatarDropdownOpen(!isAvatarDropdownOpen)}
                                aria-label={t("header.account")}
                                aria-expanded={isAvatarDropdownOpen}
                            >
                                <span className="header-avatar">{user?.username ? user.username[0].toUpperCase() : "U"}</span>
                                <span className="header-username">{user?.username || "User"}</span>
                                <FiChevronDown className={`header-dropdown-arrow ${isAvatarDropdownOpen ? "header-open" : ""}`} />
                            </button>
                            {isAvatarDropdownOpen && (
                                <div className="header-dropdown-menu header-avatar-menu">
                                    <div className="header-dropdown-header">{t("header.account")}</div>
                                    <button className="header-dropdown-item" onClick={handleLogout}>
                                        <FiLogOut className="header-theme-icon" />
                                        <span className="header-theme-name">{t("header.logout")}</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <Link to="/login" className="header-btn header-auth-btn header-signin-btn">
                            <FiLogIn />
                            <span>{t("header.sign_in")}</span>
                        </Link>
                    )}

                    <button
                        className="header-mobile-menu-toggle"
                        onClick={toggleMenu}
                        aria-label="Toggle menu"
                        aria-expanded={isMenuOpen}
                    >
                        {isMenuOpen ? <FiX /> : <FiMenu />}
                    </button>
                </div>
            </div>

            {isMenuOpen && (
                <div className="header-mobile-menu-overlay" onClick={toggleMenu}>
                    <div className="header-mobile-menu" onClick={(e) => e.stopPropagation()}>
                        <div className="header-mobile-menu-header">
                            <div className="header-mobile-logo">
                                <FiGlobe />
                                <span>{t("header.logo_text")}</span>
                            </div>
                            <button className="header-mobile-close-btn" onClick={toggleMenu}>
                                <FiX />
                            </button>
                        </div>
                        {!hideMenu && (
                            <nav className="header-mobile-nav">
                                {menuItems.map((item, index) => (
                                    <Link
                                        key={index}
                                        to={item.href.startsWith("/") ? item.href : `#${item.href}`}
                                        className="header-mobile-nav-link"
                                        onClick={toggleMenu}
                                    >
                                        {item.label}
                                    </Link>
                                ))}
                            </nav>
                        )}
                        <div className="header-mobile-controls">
                            <div className="header-mobile-control-group">
                                <label>{t("header.choose_appearance")}</label>
                                <div className="header-theme-buttons">
                                    {themeOptions.map((option) => (
                                        <button
                                            key={option.value}
                                            className={`header-btn header-theme-option ${theme === option.value ? "header-active" : ""}`}
                                            onClick={() => handleThemeChange(option.value)}
                                        >
                                            {option.icon}
                                            <span>{option.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="header-mobile-control-group">
                                <label>{t("header.select_language")}</label>
                                <div className="header-lang-buttons">
                                    {languageOptions.map((option) => (
                                        <button
                                            key={option.value}
                                            className={`header-btn header-lang-option ${language === option.value ? "header-active" : ""}`}
                                            onClick={() => handleLanguageChange(option.value)}
                                        >
                                            <span className="header-flag">{option.flag}</span>
                                            <span>{option.nativeName}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="header-mobile-menu-footer">
                            {isAuthenticated ? (
                                <button
                                    className="header-btn header-mobile-auth-btn header-logout-btn"
                                    onClick={handleLogout}
                                >
                                    {t("header.logout")}
                                </button>
                            ) : (
                                <>
                                    <Link to="/register" className="header-btn header-mobile-auth-btn header-register-btn">
                                        Register
                                    </Link>
                                    <Link to="/login" className="header-btn header-mobile-auth-btn header-signin-btn">
                                        {t("header.sign_in")}
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
};

export default Header;