import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
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
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// Token Refresh Interceptor
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                const refreshToken = localStorage.getItem("refresh_token");
                if (!refreshToken) throw new Error("No refresh token available");
                const refreshResponse = await api.post("token/refresh/", { refresh: refreshToken });
                const newAccessToken = refreshResponse.data.access_token || refreshResponse.data.access;
                localStorage.setItem("access_token", newAccessToken);
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                localStorage.removeItem("access_token");
                localStorage.removeItem("refresh_token");
                window.location.href = "/login";
                return Promise.reject(refreshError);
            }
        }
        let msg = "Unknown error occurred";
        if (error.response?.data) {
            const d = error.response.data;
            msg =
                d.detail ||
                d.message ||
                d.error ||
                (d.email && d.email[0]) ||
                (d.code && d.code[0]) ||
                (d.non_field_errors && d.non_field_errors[0]) ||
                JSON.stringify(d);
        } else if (error.message) msg = error.message;
        return Promise.reject(new Error(msg));
    }
);

// Logout API Function
const logoutUser = () => {
    const refreshToken = localStorage.getItem("refresh_token");
    return api
        .post("accounts/logout/", { refresh: refreshToken })
        .then((r) => {
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            return r.data;
        })
        .catch(() => {
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            return { detail: "Logged out" };
        });
};

// Avatar olish funksiyasi
const getAvatar = async (userId, role) => {
    try {
        const endpoint =
            role === "customer" ? `profiles/customers/${userId}/avatar/` : `profiles/clients/${userId}/avatar/`;
        const response = await api.get(endpoint);
        return response.data.avatar_url || null;
    } catch {
        return null;
    }
};

const Header = ({ isAuthenticated, setIsAuthenticated, user, setUser, updateAuthState }) => {
    const { t } = useTranslation();

    const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "default");
    const [language, setLanguage] = useState(() => localStorage.getItem("language") || "en");
    const [isThemeDropdownOpen, setIsThemeDropdownOpen] = useState(false);
    const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
    const [isAvatarDropdownOpen, setIsAvatarDropdownOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState(null);

    const themeDropdownRef = useRef(null);
    const langDropdownRef = useRef(null);
    const avatarDropdownRef = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();

    const themeOptions = [
        { value: "light", label: t("theme.light") || "Light", icon: <FiSun /> },
        { value: "dark", label: t("theme.dark") || "Dark", icon: <FiMoon /> },
        { value: "default", label: t("theme.default") || "System", icon: <FiMonitor /> },
        { value: "auto", label: t("theme.auto") || "Auto", icon: <FiClock /> },
    ];

    const languageOptions = [
        { value: "en", label: t("language.en") || "English", nativeName: t("language.en_native") || "English", flag: "🇺🇸", dir: "ltr" },
        { value: "ru", label: t("language.ru") || "Russian", nativeName: t("language.ru_native") || "Русский", flag: "🇷🇺", dir: "ltr" },
        { value: "uz", label: t("language.uz") || "Uzbek", nativeName: t("language.uz_native") || "O'zbek", flag: "🇺🇿", dir: "ltr" },
        { value: "es", label: t("language.es") || "Spanish", nativeName: t("language.es_native") || "Español", flag: "🇪🇸", dir: "ltr" },
        { value: "ar", label: t("language.ar") || "Arabic", nativeName: t("language.ar_native") || "العربية", flag: "🇸🇦", dir: "rtl" },
    ];

    const currentLang = languageOptions.find((l) => l.value === language);

    // Avatar
    useEffect(() => {
        if (isAuthenticated && user?.id && user?.role) getAvatar(user.id, user.role).then(setAvatarUrl);
    }, [isAuthenticated, user]);

    // Scroll soyasi
    useEffect(() => {
        const onScroll = () => setIsScrolled(window.scrollY > 20);
        window.addEventListener("scroll", onScroll);
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    // Theme init/apply
    useEffect(() => {
        const saved = localStorage.getItem("theme");
        if (saved && saved !== theme) setTheme(saved);
    }, [theme]);

    useEffect(() => {
        const root = document.documentElement;
        const update = () => {
            if (theme === "auto") {
                const h = new Date().getHours();
                root.setAttribute("data-theme", h >= 6 && h < 18 ? "light" : "dark");
            } else if (theme === "default") {
                root.setAttribute("data-theme", window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
            } else root.setAttribute("data-theme", theme);
        };
        update();
        localStorage.setItem("theme", theme);

        let cleanup;
        if (theme === "auto") {
            const i = setInterval(update, 60000);
            cleanup = () => clearInterval(i);
        }
        if (theme === "default") {
            const mq = window.matchMedia("(prefers-color-scheme: dark)");
            const h = (e) => root.setAttribute("data-theme", e.matches ? "dark" : "light");
            mq.addEventListener("change", h);
            cleanup = () => mq.removeEventListener("change", h);
        }
        return cleanup;
    }, [theme]);

    // Language init
    useEffect(() => {
        const saved = localStorage.getItem("language");
        if (saved && saved !== language) {
            setLanguage(saved);
            changeLanguage(saved);
        }
    }, [language]);

    // Close dropdowns on outside click
    useEffect(() => {
        const handler = (e) => {
            if (themeDropdownRef.current && !themeDropdownRef.current.contains(e.target)) setIsThemeDropdownOpen(false);
            if (langDropdownRef.current && !langDropdownRef.current.contains(e.target)) setIsLangDropdownOpen(false);
            if (avatarDropdownRef.current && !avatarDropdownRef.current.contains(e.target)) setIsAvatarDropdownOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    // Escape
    useEffect(() => {
        const onEsc = (e) => {
            if (e.key === "Escape") {
                setIsThemeDropdownOpen(false);
                setIsLangDropdownOpen(false);
                setIsAvatarDropdownOpen(false);
            }
        };
        document.addEventListener("keydown", onEsc);
        return () => document.removeEventListener("keydown", onEsc);
    }, []);

    const handleThemeChange = (v) => {
        setTheme(v);
        localStorage.setItem("theme", v);
        setIsThemeDropdownOpen(false);
    };

    const handleLanguageChange = (v) => {
        setLanguage(v);
        localStorage.setItem("language", v);
        changeLanguage(v);
        setIsLangDropdownOpen(false);
        // RTL qo'llab-quvvatlash
        const dir = languageOptions.find((l) => l.value === v)?.dir || "ltr";
        document.documentElement.setAttribute("dir", dir);
    };

    const handleLogout = async () => {
        try {
            await logoutUser();
        } finally {
            if (updateAuthState) updateAuthState(false, null);
            else {
                localStorage.removeItem("access_token");
                localStorage.removeItem("refresh_token");
                localStorage.removeItem("user_data");
            }
            setIsAvatarDropdownOpen(false);
            navigate("/");
        }
    };

    const logoDestination = isAuthenticated ? "/account" : "/";

    const displayUsername =
        user?.username ||
        user?.full_name ||
        `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
        "User";
    const avatarLetter = displayUsername.charAt(0).toUpperCase();

    const getUserRoleDisplay = () => {
        if (!user?.role) return "Client";
        const role = user.role.toLowerCase();
        if (role === "customer" || role === "guide") return "Guide";
        if (role === "client") return "Client";
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
                            <span className="header-logo-text">UzGuide</span>
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
                            onClick={() => {
                                setIsLangDropdownOpen((v) => !v);
                                setIsThemeDropdownOpen(false);
                                setIsAvatarDropdownOpen(false);
                            }}
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
                            onClick={() => {
                                setIsThemeDropdownOpen((v) => !v);
                                setIsLangDropdownOpen(false);
                                setIsAvatarDropdownOpen(false);
                            }}
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

                    {/* Auth Controls */}
                    {isAuthenticated ? (
                        <div className="header-dropdown header-avatar-dropdown" ref={avatarDropdownRef}>
                            <button
                                type="button"
                                className="header-control-btn header-avatar-btn"
                                onClick={() => {
                                    setIsAvatarDropdownOpen((v) => !v);
                                    setIsThemeDropdownOpen(false);
                                    setIsLangDropdownOpen(false);
                                }}
                                aria-label={t("header.account") || "Account"}
                                aria-expanded={isAvatarDropdownOpen}
                            >
                                {avatarUrl ? (
                                    <img
                                        src={avatarUrl}
                                        alt={displayUsername}
                                        className="header-avatar-img"
                                        onError={() => setAvatarUrl(null)}
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
                                        <span className="header-user-role">{getUserRoleDisplay()}</span>
                                    </div>
                                    <Link to="/account" className="header-dropdown-item" onClick={() => setIsAvatarDropdownOpen(false)}>
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
                        <Link to="/login" className="header-btn header-auth-btn header-signin-inline">
                            <FiLogIn />
                            <span>{t("header.sign_in") || "Sign In"}</span>
                        </Link>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
