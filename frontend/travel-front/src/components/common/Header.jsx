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
    FiUserPlus,
} from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { changeLanguage } from "../../i18n";
import axios from "axios";
import "./Header.css";

// API Configuration
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000/api/v1/";

const api = axios.create({
    baseURL: API_URL,
    headers: { "Content-Type": "application/json" },
    withCredentials: false,
});

// Token Interceptor
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`, {
        headers: config.headers,
        data: config.data,
    });
    return config;
});

// Token Refresh Interceptor
api.interceptors.response.use(
    (response) => {
        console.log(`API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
            status: response.status,
            data: response.data,
        });
        return response;
    },
    async (error) => {
        console.error(`API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message,
        });
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                const refreshToken = localStorage.getItem("refresh_token");
                if (!refreshToken) {
                    throw new Error("No refresh token available");
                }
                const refreshResponse = await api.post("token/refresh/", {
                    refresh: refreshToken,
                });
                const newAccessToken = refreshResponse.data.access_token || refreshResponse.data.access;
                localStorage.setItem("access_token", newAccessToken);
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                console.error("Token refresh failed:", refreshError);
                localStorage.removeItem("access_token");
                localStorage.removeItem("refresh_token");
                window.location.href = "/login";
                return Promise.reject(refreshError);
            }
        }
        let errorMessage = "Unknown error occurred";
        if (error.response?.data) {
            const data = error.response.data;
            errorMessage =
                data.detail ||
                data.message ||
                data.error ||
                (data.email && data.email[0]) ||
                (data.code && data.code[0]) ||
                (data.non_field_errors && data.non_field_errors[0]) ||
                JSON.stringify(data);
        } else if (error.message) {
            errorMessage = error.message;
        }
        return Promise.reject(new Error(errorMessage));
    }
);

// Logout API Function
const logoutUser = () => {
    const refreshToken = localStorage.getItem("refresh_token");
    console.log("Logging out user");

    return api
        .post("accounts/logout/", {
            refresh: refreshToken,
        })
        .then((r) => {
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            return r.data;
        })
        .catch((error) => {
            console.error("Logout error:", error);
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            return { detail: "Logged out" };
        });
};

// Avatar olish funksiyasi
const getAvatar = async (userId, role) => {
    try {
        const endpoint = role === "customer" ? `profiles/customers/${userId}/avatar/` : `profiles/clients/${userId}/avatar/`;
        const response = await api.get(endpoint);
        return response.data.avatar_url || null;
    } catch (error) {
        console.error("Avatar fetch error:", error.message);
        return null;
    }
};

// React Component
const Header = ({ isAuthenticated, setIsAuthenticated, user, setUser, updateAuthState }) => {
    const { t } = useTranslation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "default");
    const [language, setLanguage] = useState(() => localStorage.getItem("language") || "en");
    const [isThemeDropdownOpen, setIsThemeDropdownOpen] = useState(false);
    const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
    const [isAvatarDropdownOpen, setIsAvatarDropdownOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState(null); // Avatar URL uchun state

    const themeDropdownRef = useRef(null);
    const langDropdownRef = useRef(null);
    const avatarDropdownRef = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();

    const themeOptions = [
        { value: "light", label: t("theme.light") || "Light", icon: <FiSun />, description: t("theme.light_desc") || "Light theme" },
        { value: "dark", label: t("theme.dark") || "Dark", icon: <FiMoon />, description: t("theme.dark_desc") || "Dark theme" },
        { value: "default", label: t("theme.default") || "System", icon: <FiMonitor />, description: t("theme.default_desc") || "Follow system theme" },
        { value: "auto", label: t("theme.auto") || "Auto", icon: <FiClock />, description: t("theme.auto_desc") || "Auto theme based on time" },
    ];

    const languageOptions = [
        { value: "en", label: t("language.en") || "English", nativeName: t("language.en_native") || "English", flag: "🇺🇸", dir: "ltr" },
        { value: "ru", label: t("language.ru") || "Russian", nativeName: t("language.ru_native") || "Русский", flag: "🇷🇺", dir: "ltr" },
        { value: "uz", label: t("language.uz") || "Uzbek", nativeName: t("language.uz_native") || "O'zbek", flag: "🇺🇿", dir: "ltr" },
        { value: "es", label: t("language.es") || "Spanish", nativeName: t("language.es_native") || "Español", flag: "🇪🇸", dir: "ltr" },
        { value: "ar", label: t("language.ar") || "Arabic", nativeName: t("language.ar_native") || "العربية", flag: "🇸🇦", dir: "rtl" },
    ];

    const currentLang = languageOptions.find((lang) => lang.value === language);

    // Avatarni olish
    useEffect(() => {
        if (isAuthenticated && user?.id && user?.role) {
            getAvatar(user.id, user.role).then((url) => setAvatarUrl(url));
        }
    }, [isAuthenticated, user]);

    // Scroll hodisasini kuzatish
    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 20);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // Theme sozlamalarini yuklash va qo'llash
    useEffect(() => {
        const savedTheme = localStorage.getItem("theme");
        if (savedTheme && savedTheme !== theme) {
            setTheme(savedTheme);
        }
    }, [theme]);

    // Language sozlamalarini yuklash
    useEffect(() => {
        const savedLanguage = localStorage.getItem("language");
        if (savedLanguage && savedLanguage !== language) {
            setLanguage(savedLanguage);
            changeLanguage(savedLanguage);
        }
    }, [language]);

    // Theme ni qo'llash
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
        localStorage.setItem("theme", theme);

        let cleanup;

        if (theme === "auto") {
            const interval = setInterval(updateTheme, 60000);
            cleanup = () => clearInterval(interval);
        }

        if (theme === "default") {
            const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
            const handler = (e) => root.setAttribute("data-theme", e.matches ? "dark" : "light");
            mediaQuery.addEventListener("change", handler);
            cleanup = () => mediaQuery.removeEventListener("change", handler);
        }

        return cleanup;
    }, [theme]);

    // Tashqariga bosilgan hodisani kuzatish
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

    // Escape tugmasini bosish hodisasi
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

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const handleThemeChange = (newTheme) => {
        setTheme(newTheme);
        localStorage.setItem("theme", newTheme);
        setIsThemeDropdownOpen(false);
    };

    const handleLanguageChange = (newLang) => {
        setLanguage(newLang);
        localStorage.setItem("language", newLang);
        changeLanguage(newLang);
        setIsLangDropdownOpen(false);
    };

    const handleLogout = async () => {
        try {
            await logoutUser();
        } catch (error) {
            console.error("Logout error:", error.message);
        } finally {
            if (updateAuthState) {
                updateAuthState(false, null);
            } else {
                localStorage.removeItem("access_token");
                localStorage.removeItem("refresh_token");
                localStorage.removeItem("user_data");
                localStorage.removeItem("userAccount_isEditing");
                localStorage.removeItem("userAccount_formData");
                localStorage.removeItem("guideAccount_isEditing");
                localStorage.removeItem("guideAccount_activeTab");
                localStorage.removeItem("guideAccount_formData");
                localStorage.removeItem("guideAccount_portfolioForm");
                localStorage.removeItem("guideAccount_editingPortfolio");
                localStorage.removeItem("guideAccount_availabilityForm");
                localStorage.removeItem("guideAccount_editingAvailability");
                localStorage.removeItem("guideAccount_documentForm");
                setIsAuthenticated(false);
                setUser(null);
            }
            setIsAvatarDropdownOpen(false);
            navigate("/");
        }
    };

    const menuItems = [
        { label: t("header.find_guides") || "Find Guides", href: "/find-guides" },
        { label: t("header.blog") || "Blog", href: "#blog" },
    ];

    const hideMenu = isAuthenticated && location.pathname === "/account";
    const logoDestination = isAuthenticated ? "/account" : "/";

    // Username ni aniqlash
    const displayUsername = user?.username || user?.full_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || "User";
    const avatarLetter = displayUsername.charAt(0).toUpperCase();

    // User role'ini ko'rsatish uchun
    const getUserRoleDisplay = () => {
        if (!user?.role) return "Client";

        const role = user.role.toLowerCase();
        if (role === "customer") return "Guide";
        if (role === "client") return "Client";
        if (role === "guide") return "Guide";
        if (role === "user") return "User";

        return user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase();
    };

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
                            <span className="header-logo-text">{t("header.logo_text") || "UzGuide"}</span>
                            <span className="header-logo-tagline">{t("header.tagline") || "Explore Together"}</span>
                        </div>
                    </Link>
                </div>

                <div className="header-controls">
                    {/* Language Dropdown */}
                    <div className="header-dropdown header-lang-dropdown" ref={langDropdownRef}>
                        <button
                            type="button"
                            className="header-control-btn header-lang-btn"
                            onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                            aria-label={t("header.select_language") || "Select Language"}
                            aria-expanded={isLangDropdownOpen}
                        >
                            <span className="header-flag">{currentLang?.flag}</span>
                            <span className="header-lang-code">{language.toUpperCase()}</span>
                            <FiChevronDown className={`header-dropdown-arrow ${isLangDropdownOpen ? "header-open" : ""}`} />
                        </button>
                        {isLangDropdownOpen && (
                            <div className="header-dropdown-menu header-lang-menu">
                                <div className="header-dropdown-header">{t("header.select_language") || "Select Language"}</div>
                                {languageOptions.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
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

                    {/* Theme Dropdown */}
                    <div className="header-dropdown header-theme-dropdown" ref={themeDropdownRef}>
                        <button
                            type="button"
                            className="header-control-btn header-theme-btn"
                            onClick={() => setIsThemeDropdownOpen(!isThemeDropdownOpen)}
                            aria-label={t("header.choose_appearance") || "Choose Appearance"}
                            aria-expanded={isThemeDropdownOpen}
                        >
                            {themeOptions.find((opt) => opt.value === theme)?.icon}
                            <FiChevronDown className={`header-dropdown-arrow ${isThemeDropdownOpen ? "header-open" : ""}`} />
                        </button>
                        {isThemeDropdownOpen && (
                            <div className="header-dropdown-menu header-theme-menu">
                                <div className="header-dropdown-header">{t("header.choose_appearance") || "Choose Appearance"}</div>
                                {themeOptions.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
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

                    {/* Authentication Controls */}
                    {isAuthenticated ? (
                        <div className="header-dropdown header-avatar-dropdown" ref={avatarDropdownRef}>
                            <button
                                type="button"
                                className="header-control-btn header-avatar-btn"
                                onClick={() => setIsAvatarDropdownOpen(!isAvatarDropdownOpen)}
                                aria-label={t("header.account") || "Account"}
                                aria-expanded={isAvatarDropdownOpen}
                            >
                                {avatarUrl ? (
                                    <img
                                        src={avatarUrl}
                                        alt={displayUsername}
                                        className="header-avatar-img"
                                        onError={() => setAvatarUrl(null)} // Agar rasm yuklanmasa, fallback
                                    />
                                ) : (
                                    <span className="header-avatar">{avatarLetter}</span>
                                )}
                                <span className="header-username">{displayUsername}</span>
                                <FiChevronDown className={`header-dropdown-arrow ${isAvatarDropdownOpen ? "header-open" : ""}`} />
                            </button>
                            {isAvatarDropdownOpen && (
                                <div className="header-dropdown-menu header-avatar-menu">
                                    <div className="header-dropdown-header">{t("header.account") || "Account"}</div>
                                    <div className="header-user-info">
                                        {process.env.NODE_ENV === 'development' && (
                                            <span className="header-user-debug">Debug: {user?.role}</span>
                                        )}
                                        <span className="header-user-role">{getUserRoleDisplay()}</span>
                                    </div>
                                    <Link to="/account" className="header-dropdown-item">
                                        <span className="header-theme-name">{t("header.profile") || "Profile"}</span>
                                    </Link>
                                    <button type="button" className="header-dropdown-item" onClick={handleLogout}>
                                        <FiLogOut className="header-theme-icon" />
                                        <span className="header-theme-name">{t("header.logout") || "Logout"}</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="header-auth-buttons">
                            <Link to="/login" className="header-btn header-auth-btn header-signin-btn">
                                <FiLogIn />
                                <span>{t("header.sign_in") || "Sign In"}</span>
                            </Link>
                        </div>
                    )}

                    {/* Mobile Menu Toggle */}
                    <button
                        type="button"
                        className="header-mobile-menu-toggle"
                        onClick={toggleMenu}
                        aria-label="Toggle menu"
                        aria-expanded={isMenuOpen}
                    >
                        {isMenuOpen ? <FiX /> : <FiMenu />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMenuOpen && (
                <div className="header-mobile-menu-overlay" onClick={toggleMenu}>
                    <div className="header-mobile-menu" onClick={(e) => e.stopPropagation()}>
                        <div className="header-mobile-menu-header">
                            <div className="header-mobile-logo">
                                <FiGlobe />
                                <span>{t("header.logo_text") || "TourGuide"}</span>
                            </div>
                            <button type="button" className="header-mobile-close-btn" onClick={toggleMenu}>
                                <FiX />
                            </button>
                        </div>

                        <div className="header-mobile-controls">
                            {/* Mobile Theme Controls */}
                            <div className="header-mobile-control-group">
                                <label>{t("header.choose_appearance") || "Choose Appearance"}</label>
                                <div className="header-theme-buttons">
                                    {themeOptions.map((option) => (
                                        <button
                                            key={option.value}
                                            type="button"
                                            className={`header-btn header-theme-option ${theme === option.value ? "header-active" : ""}`}
                                            onClick={() => handleThemeChange(option.value)}
                                        >
                                            {option.icon}
                                            <span>{option.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Mobile Language Controls */}
                            <div className="header-mobile-control-group">
                                <label>{t("header.select_language") || "Select Language"}</label>
                                <div className="header-lang-buttons">
                                    {languageOptions.map((option) => (
                                        <button
                                            key={option.value}
                                            type="button"
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

                        {/* Mobile Authentication */}
                        <div className="header-mobile-menu-footer">
                            {isAuthenticated ? (
                                <div className="header-mobile-auth-section">
                                    <div className="header-mobile-user-info">
                                        {avatarUrl ? (
                                            <img
                                                src={avatarUrl}
                                                alt={displayUsername}
                                                className="header-mobile-avatar-img"
                                                onError={() => setAvatarUrl(null)} // Agar rasm yuklanmasa, fallback
                                            />
                                        ) : (
                                            <div className="header-mobile-avatar">{avatarLetter}</div>
                                        )}
                                        <div className="header-mobile-user-details">
                                            <span className="header-mobile-username">{displayUsername}</span>
                                            <span className="header-mobile-role">{getUserRoleDisplay()}</span>
                                        </div>
                                    </div>
                                    <Link
                                        to="/account"
                                        className="header-btn header-mobile-auth-btn"
                                        onClick={toggleMenu}
                                    >
                                        <span>{t("header.profile") || "Profile"}</span>
                                    </Link>
                                    <button
                                        type="button"
                                        className="header-btn header-mobile-logout-btn"
                                        onClick={handleLogout}
                                    >
                                        <FiLogOut />
                                        <span>{t("header.logout") || "Logout"}</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="header-mobile-auth-actions">
                                    <Link
                                        to="/register"
                                        className="header-btn header-mobile-auth-btn header-mobile-register-btn"
                                        onClick={toggleMenu}
                                    >
                                        <FiUserPlus />
                                        <span>{t("header.register") || "Register"}</span>
                                    </Link>
                                    <Link
                                        to="/login"
                                        className="header-btn header-mobile-auth-btn header-mobile-signin-btn"
                                        onClick={toggleMenu}
                                    >
                                        <FiLogIn />
                                        <span>{t("header.sign_in") || "Sign In"}</span>
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
};

export default Header;