import React, { useState, useEffect, useRef } from "react";
import { FiX, FiMail, FiLock, FiUser, FiLogIn, FiCheckSquare, FiSquare, FiGlobe, FiCheck, FiEye, FiEyeOff, FiRotateCcw } from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";
import { FaFacebook } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import axios from "axios";
import "./Authentication.css";
// API Configuration
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000/api/v1/";
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
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
                (data.password && data.password[0]) ||
                (data.role && data.role[0]) ||
                (data.country && data.country[0]) ||
                JSON.stringify(data);
        } else if (error.message) {
            errorMessage = error.message;
        }
        return Promise.reject(new Error(errorMessage));
    }
);
// Necessary API Functions for Authentication
const loginUser = (payload) => {
    console.log("Logging in user:", { ...payload, password: "***" });
    return api.post("accounts/login/", payload).then((r) => ({
        access: r.data.access_token,
        refresh: r.data.refresh_token,
        user: r.data.user,
    }));
};
const requestCode = (data) => {
    console.log("Requesting verification code for:", data.email);
    return api.post("accounts/request-code/", data).then((r) => r.data);
};
const registerUser = (data) => {
    console.log("Registering user:", { ...data, password: "***" });
    return api.post("accounts/register/", data).then((r) => ({
        access: r.data.access_token,
        refresh: r.data.refresh_token,
        user: r.data.user,
    }));
};
const requestPasswordReset = (data) =>
    api.post("accounts/forgot-password/", data).then((r) => r.data);
const confirmPasswordReset = (payload) =>
    api.post("accounts/reset-password/", payload).then((r) => r.data);
const getCurrentUserShort = () => {
    console.log("Getting current user short info...");
    return api.get("auth/users/short/").then((r) => r.data);
};
// React Component
const Authentication = ({ setIsAuthenticated, setUser }) => {
    const { t, i18n } = useTranslation("translation");
    const [activeTab, setActiveTab] = useState("login");
    const [loginForm, setLoginForm] = useState({ email: "", password: "" });
    const [registerForm, setRegisterForm] = useState({
        role: "Client",
        first_name: "",
        last_name: "",
        email: "",
        password: "",
        confirm_password: "",
        country: "",
    });
    const [forgotForm, setForgotForm] = useState({
        email: "",
        code: "",
        new_password: "",
        confirm_password: "",
    });
    const [verificationCode, setVerificationCode] = useState("");
    const [checkboxes, setCheckboxes] = useState({
        personalData: false,
        terms: false,
        travelTips: false,
    });
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [verificationStep, setVerificationStep] = useState(false);
    const [forgotStep, setForgotStep] = useState(false);
    const [countrySuggestions, setCountrySuggestions] = useState([]);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
    const countryInputRef = useRef(null);
    const navigate = useNavigate();
    // Debugging: Log current language and translations
    useEffect(() => {
        console.log("Authentication language:", i18n.language);
        console.log("Authentication translations:", i18n.getResourceBundle(i18n.language, "translation")?.authentication);
    }, [i18n.language]);
    const countries = [
        "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia",
        "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin",
        "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi",
        "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia",
        "Comoros", "Congo (Congo-Brazzaville)", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czechia (Czech Republic)",
        "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea",
        "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany",
        "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Honduras", "Hungary",
        "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan",
        "Kazakhstan", "Kenya", "Kiribati", "Korea, North", "Korea, South", "Kuwait", "Kyrgyzstan", "Laos", "Latvia",
        "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar", "Malawi",
        "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia",
        "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar (Burma)", "Namibia", "Nauru",
        "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Macedonia", "Norway", "Oman",
        "Pakistan", "Palau", "Palestine State", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland",
        "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines",
        "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone",
        "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Sudan", "Spain", "Sri Lanka",
        "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste",
        "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine",
        "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City",
        "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
    ];
    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem("access_token");
            if (token) {
                try {
                    const userData = await getCurrentUserShort();
                    setIsAuthenticated(true);
                    setUser(userData);
                    if (userData.role === "Client") {
                        navigate("/user-account");
                    } else if (userData.role === "Customer") {
                        navigate("/admin-account");
                    } else {
                        navigate("/account");
                    }
                } catch (error) {
                    console.error("Failed to fetch user:", error);
                    localStorage.removeItem("access_token");
                    localStorage.removeItem("refresh_token");
                    setIsAuthenticated(false);
                }
            }
        };
        checkAuth();
    }, [setIsAuthenticated, setUser, navigate]);
    const clearMessages = () => {
        setError("");
        setSuccessMessage("");
    };
    const handleLoginChange = (e) => {
        setLoginForm({ ...loginForm, [e.target.name]: e.target.value });
        clearMessages();
    };
    const handleRegisterChange = (e) => {
        const { name, value } = e.target;
        setRegisterForm({ ...registerForm, [name]: value });
        clearMessages();
        if (name === "country") {
            const filteredSuggestions = countries
                .filter((country) => country.toLowerCase().startsWith(value.toLowerCase()))
                .slice(0, 5);
            setCountrySuggestions(filteredSuggestions);
        }
        if (name === "password" || name === "confirm_password") {
            const currentPassword = name === "password" ? value : registerForm.password;
            const currentConfirmPassword = name === "confirm_password" ? value : registerForm.confirm_password;
            if (value && !passwordRegex.test(value)) {
                setError(t("authentication.errors.password_requirements", {
                    defaultValue: "Password must contain at least 8 characters, one uppercase, one lowercase, one number and one special character"
                }));
            } else if (currentPassword && currentConfirmPassword && currentPassword !== currentConfirmPassword) {
                setError(t("authentication.errors.passwords_do_not_match", { defaultValue: "Passwords do not match" }));
            } else {
                setError("");
            }
        }
    };
    const handleForgotChange = (e) => {
        const { name, value } = e.target;
        setForgotForm({ ...forgotForm, [name]: value });
        clearMessages();
        if (name === "new_password" || name === "confirm_password") {
            const currentNewPassword = name === "new_password" ? value : forgotForm.new_password;
            const currentConfirmPassword = name === "confirm_password" ? value : forgotForm.confirm_password;
            if (value && !passwordRegex.test(value)) {
                setError(t("authentication.errors.password_requirements", {
                    defaultValue: "Password must contain at least 8 characters, one uppercase, one lowercase, one number and one special character"
                }));
            } else if (currentNewPassword && currentConfirmPassword && currentNewPassword !== currentConfirmPassword) {
                setError(t("authentication.errors.passwords_do_not_match", { defaultValue: "Passwords do not match" }));
            } else {
                setError("");
            }
        }
    };
    const handleCountrySelect = (country) => {
        setRegisterForm({ ...registerForm, country });
        setCountrySuggestions([]);
        if (countryInputRef.current) countryInputRef.current.focus();
    };
    const handleCheckboxChange = (e) => {
        setCheckboxes({ ...checkboxes, [e.target.name]: e.target.checked });
        clearMessages();
    };
    const toggleShowPassword = () => setShowPassword(!showPassword);
    const toggleShowConfirmPassword = () => setShowConfirmPassword(!showConfirmPassword);
    const toggleShowNewPassword = () => setShowNewPassword(!showNewPassword);
    const toggleShowConfirmNewPassword = () => setShowConfirmNewPassword(!showConfirmNewPassword);
    const getLoginErrorMessage = (errorMessage) => {
        if (errorMessage.includes("No active account found") || errorMessage.includes("credentials")) {
            return t("authentication.errors.invalid_email_or_password", { defaultValue: "Invalid email or password" });
        } else if (errorMessage.includes("email")) {
            return t("authentication.errors.invalid_email", { defaultValue: "Invalid email address" });
        } else if (errorMessage.includes("password")) {
            return t("authentication.errors.invalid_password", { defaultValue: "Invalid password" });
        }
        return errorMessage || t("authentication.errors.login_failed", { defaultValue: "Login failed" });
    };
    const getRegisterErrorMessage = (errorMessage) => {
        if (errorMessage.includes("This email is already registered")) {
            return t("authentication.errors.email_exists", { defaultValue: "This email is already registered" });
        } else if (errorMessage.includes("Invalid or already used verification code")) {
            return t("authentication.errors.invalid_code", { defaultValue: "Invalid or already used verification code" });
        } else if (errorMessage.includes("Verification code has expired")) {
            return t("authentication.errors.code_expired", { defaultValue: "Verification code has expired" });
        } else if (errorMessage.includes("Role must be one of")) {
            return t("authentication.errors.invalid_role", { defaultValue: "Invalid role selected" });
        } else if (errorMessage.includes("country")) {
            return t("authentication.errors.invalid_country", { defaultValue: "Invalid country" });
        } else if (errorMessage.includes("Password must contain")) {
            return t("authentication.errors.password_requirements", { defaultValue: "Password must contain at least one lowercase letter, one uppercase letter, one digit, and one special character (@$!%*?&)." });
        }
        return errorMessage || t("authentication.errors.registration_failed", { defaultValue: "Registration failed" });
    };
    const getForgotErrorMessage = (errorMessage) => {
        if (errorMessage.includes("Too many password reset requests")) {
            return t("authentication.errors.too_many_requests", { defaultValue: "Too many password reset requests. Please wait 30 minutes and try again." });
        } else if (errorMessage.includes("Code has expired")) {
            return t("authentication.errors.code_expired", { defaultValue: "Code has expired" });
        } else if (errorMessage.includes("Invalid or already used code")) {
            return t("authentication.errors.invalid_code", { defaultValue: "Invalid or already used code" });
        } else if (errorMessage.includes("Too many failed attempts")) {
            return t("authentication.errors.too_many_attempts", { defaultValue: "Too many failed attempts. Please request a new code." });
        } else if (errorMessage.includes("email")) {
            return t("authentication.errors.invalid_email", { defaultValue: "Invalid email address" });
        }
        return errorMessage || t("authentication.errors.password_reset_failed", { defaultValue: "Password reset failed" });
    };
    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        clearMessages();
        setLoading(true);
        if (!loginForm.email || !loginForm.password) {
            setError(t("authentication.errors.all_fields_required", { defaultValue: "All fields are required" }));
            setLoading(false);
            return;
        }
        if (!passwordRegex.test(loginForm.password)) {
            setError(t("authentication.errors.password_requirements", {
                defaultValue: "Password must contain at least 8 characters, one uppercase, one lowercase, one number and one special character"
            }));
            setLoading(false);
            return;
        }
        try {
            const tokenData = await loginUser({
                email: loginForm.email.toLowerCase().trim(),
                password: loginForm.password,
            });
            localStorage.setItem("access_token", tokenData.access);
            localStorage.setItem("refresh_token", tokenData.refresh);
            setIsAuthenticated(true);
            setUser(tokenData.user);
            if (tokenData.user.role === "Client") {
                navigate("/user-account");
            } else if (tokenData.user.role === "Customer") {
                navigate("/admin-account");
            } else {
                navigate("/account");
            }
            setLoginForm({ email: "", password: "" });
        } catch (error) {
            setError(getLoginErrorMessage(error.message));
        } finally {
            setLoading(false);
        }
    };
    const handleRegisterSubmit = async (e) => {
        e.preventDefault();
        clearMessages();
        setLoading(true);
        const { role, first_name, last_name, email, password, confirm_password, country } = registerForm;
        if (!role || !first_name || !last_name || !email || !password || !confirm_password || !country) {
            setError(t("authentication.errors.all_fields_required", { defaultValue: "All fields are required" }));
            setLoading(false);
            return;
        }
        if (password !== confirm_password) {
            setError(t("authentication.errors.passwords_do_not_match", { defaultValue: "Passwords do not match" }));
            setLoading(false);
            return;
        }
        if (!passwordRegex.test(password)) {
            setError(t("authentication.errors.password_requirements", {
                defaultValue: "Password must contain at least 8 characters, one uppercase, one lowercase, one number and one special character"
            }));
            setLoading(false);
            return;
        }
        if (!checkboxes.personalData || !checkboxes.terms) {
            setError(t("authentication.errors.required_checkboxes", { defaultValue: "You must agree to the required checkboxes" }));
            setLoading(false);
            return;
        }
        if (!countries.includes(country)) {
            setError(t("authentication.errors.invalid_country", { defaultValue: "Invalid country selected" }));
            setLoading(false);
            return;
        }
        try {
            await requestCode({ email: email.toLowerCase().trim() });
            setSuccessMessage(t("authentication.success.verification_code_sent", { defaultValue: "Verification code sent" }));
            setVerificationStep(true);
        } catch (error) {
            const errorMsg = getRegisterErrorMessage(error.message);
            if (errorMsg.includes("Too many verification code requests")) {
                setError(t("authentication.errors.too_many_requests", { defaultValue: "Too many verification code requests. Please wait 15 minutes and try again." }));
            } else {
                setError(errorMsg);
            }
        } finally {
            setLoading(false);
        }
    };
    const handleVerifyCode = async (e) => {
        e.preventDefault();
        clearMessages();
        setLoading(true);
        if (!verificationCode) {
            setError(t("authentication.errors.verification_code_required", { defaultValue: "Verification code is required" }));
            setLoading(false);
            return;
        }
        if (!/^\d{6}$/.test(verificationCode)) {
            setError(t("authentication.errors.invalid_verification_code", { defaultValue: "Invalid verification code" }));
            setLoading(false);
            return;
        }
        try {
            const { role, first_name, last_name, email, password, country } = registerForm;
            const tokenResponse = await registerUser({
                role,
                first_name,
                last_name,
                email: email.toLowerCase().trim(),
                password,
                country,
                code: verificationCode,
            });
            localStorage.setItem("access_token", tokenResponse.access);
            localStorage.setItem("refresh_token", tokenResponse.refresh);
            setIsAuthenticated(true);
            setUser(tokenResponse.user);
            setSuccessMessage(t("authentication.success.registration_successful", { defaultValue: "Registration successful" }));
            if (tokenResponse.user.role === "Client") {
                navigate("/user-account");
            } else if (tokenResponse.user.role === "Customer") {
                navigate("/admin-account");
            } else {
                navigate("/account");
            }
            resetRegisterForm();
        } catch (error) {
            setError(getRegisterErrorMessage(error.message));
        } finally {
            setLoading(false);
        }
    };
    const handleResendCode = async () => {
        clearMessages();
        setLoading(true);
        try {
            await requestCode({ email: registerForm.email.toLowerCase().trim() });
            setSuccessMessage(t("authentication.success.verification_code_sent", { defaultValue: "Verification code sent" }));
        } catch (error) {
            const errorMsg = getRegisterErrorMessage(error.message);
            if (errorMsg.includes("Too many verification code requests")) {
                setError(t("authentication.errors.too_many_requests", { defaultValue: "Too many verification code requests. Please wait 15 minutes and try again." }));
            } else {
                setError(errorMsg);
            }
        } finally {
            setLoading(false);
        }
    };
    const handleForgotSubmit = async (e) => {
        e.preventDefault();
        clearMessages();
        setLoading(true);
        if (!forgotForm.email) {
            setError(t("authentication.errors.all_fields_required", { defaultValue: "All fields are required" }));
            setLoading(false);
            return;
        }
        try {
            const response = await requestPasswordReset({ email: forgotForm.email.toLowerCase().trim() });
            setSuccessMessage(response.message || t("authentication.success.reset_code_sent", { defaultValue: "Password reset code sent" }));
            setForgotStep(true);
        } catch (error) {
            setError(getForgotErrorMessage(error.message));
        } finally {
            setLoading(false);
        }
    };
    const handleResetPassword = async (e) => {
        e.preventDefault();
        clearMessages();
        setLoading(true);
        const { email, code, new_password, confirm_password } = forgotForm;
        if (!code || !new_password || !confirm_password) {
            setError(t("authentication.errors.all_fields_required", { defaultValue: "All fields are required" }));
            setLoading(false);
            return;
        }
        if (new_password !== confirm_password) {
            setError(t("authentication.errors.passwords_do_not_match", { defaultValue: "Passwords do not match" }));
            setLoading(false);
            return;
        }
        if (!passwordRegex.test(new_password)) {
            setError(t("authentication.errors.password_requirements", {
                defaultValue: "Password must contain at least 8 characters, one uppercase, one lowercase, one number and one special character"
            }));
            setLoading(false);
            return;
        }
        if (!/^\d{6}$/.test(code)) {
            setError(t("authentication.errors.invalid_code", { defaultValue: "Invalid code" }));
            setLoading(false);
            return;
        }
        try {
            await confirmPasswordReset({
                email: email.toLowerCase().trim(),
                code,
                new_password,
            });
            setSuccessMessage(t("authentication.success.password_reset_successful", { defaultValue: "Password reset successful" }));
            setTimeout(() => {
                setActiveTab("login");
                setForgotStep(false);
                setForgotForm({
                    email: "",
                    code: "",
                    new_password: "",
                    confirm_password: "",
                });
                clearMessages();
            }, 2000);
        } catch (error) {
            setError(getForgotErrorMessage(error.message));
        } finally {
            setLoading(false);
        }
    };
    const handleResendResetCode = async () => {
        clearMessages();
        setLoading(true);
        try {
            const response = await requestPasswordReset({ email: forgotForm.email.toLowerCase().trim() });
            setSuccessMessage(response.message || t("authentication.success.reset_code_sent", { defaultValue: "Password reset code sent" }));
        } catch (error) {
            setError(getForgotErrorMessage(error.message));
        } finally {
            setLoading(false);
        }
    };
    const handleSocialLogin = (provider) => {
        alert(t("authentication.social_login_under_development", { provider, defaultValue: `Social login with ${provider} is under development` }));
    };
    const resetRegisterForm = () => {
        setRegisterForm({
            role: "Client",
            first_name: "",
            last_name: "",
            email: "",
            password: "",
            confirm_password: "",
            country: "",
        });
        setVerificationCode("");
        setCheckboxes({ personalData: false, terms: false, travelTips: false });
        setVerificationStep(false);
        clearMessages();
    };
    const closeModal = () => {
        navigate(-1);
        resetRegisterForm();
        setForgotStep(false);
        setCountrySuggestions([]);
        clearMessages();
    };
    const switchTab = (tab) => {
        setActiveTab(tab);
        setVerificationStep(false);
        setForgotStep(false);
        setCountrySuggestions([]);
        clearMessages();
        setLoginForm({ email: "", password: "" });
        setForgotForm({ email: "", code: "", new_password: "", confirm_password: "" });
    };
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape") closeModal();
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, []);
    return (
        <div className="auth-overlay" onClick={closeModal} role="dialog" aria-labelledby="auth-title" aria-modal="true">
            <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
                <button className="auth-close-btn" onClick={closeModal} aria-label={t("authentication.close", { defaultValue: "Close" })}>
                    <FiX />
                </button>
                <div className="auth-header">
                    <h1 className="auth-brand">{t("authentication.brand", { defaultValue: "Authentication" })}</h1>
                    <p className="auth-subtitle">{t("authentication.subtitle", { defaultValue: "Please sign in or register" })}</p>
                </div>
                <div className="auth-tabs">
                    <button
                        className={`auth-tab ${activeTab === "login" ? "auth-tab-active" : ""}`}
                        onClick={() => switchTab("login")}
                        aria-selected={activeTab === "login"}
                        disabled={loading}
                    >
                        <FiLogIn />
                        {t("authentication.tabs.login", { defaultValue: "Login" })}
                    </button>
                    <button
                        className={`auth-tab ${activeTab === "register" ? "auth-tab-active" : ""}`}
                        onClick={() => switchTab("register")}
                        aria-selected={activeTab === "register"}
                        disabled={loading}
                    >
                        <FiUser />
                        {t("authentication.tabs.register", { defaultValue: "Register" })}
                    </button>
                    <button
                        className={`auth-tab ${activeTab === "forgot" ? "auth-tab-active" : ""}`}
                        onClick={() => switchTab("forgot")}
                        aria-selected={activeTab === "forgot"}
                        disabled={loading}
                    >
                        <FiRotateCcw />
                        {t("authentication.tabs.forgot_password", { defaultValue: "Forgot Password" })}
                    </button>
                </div>
                {error && (
                    <div className="auth-message auth-error" role="alert">
                        <div className="auth-message-icon"></div>
                        <span>{error}</span>
                    </div>
                )}
                {successMessage && (
                    <div className="auth-message auth-success" role="alert">
                        <div className="auth-message-icon"></div>
                        <span>{successMessage}</span>
                    </div>
                )}
                {loading && (
                    <div className="auth-loading">
                        <div className="spinner"></div>
                        <span>{t("authentication.loading", { defaultValue: "Loading..." })}</span>
                    </div>
                )}
                {activeTab === "login" && (
                    <div className="auth-content">
                        <div className="auth-form-header">
                            <h2 id="auth-title">{t("authentication.login.title", { defaultValue: "Login" })}</h2>
                            <p>{t("authentication.login.subtitle", { defaultValue: "Enter your credentials to access your account" })}</p>
                        </div>
                        <form className="auth-form" onSubmit={handleLoginSubmit}>
                            <div className="auth-form-group">
                                <label htmlFor="login-email" className="auth-label">
                                    <FiMail className="auth-label-icon" />
                                    {t("authentication.login.email_label", { defaultValue: "Email" })}
                                </label>
                                <input
                                    id="login-email"
                                    type="email"
                                    name="email"
                                    value={loginForm.email}
                                    onChange={handleLoginChange}
                                    placeholder={t("authentication.login.email_placeholder", { defaultValue: "Enter your email" })}
                                    className="auth-input"
                                    aria-required="true"
                                    disabled={loading}
                                    autoComplete="email"
                                />
                            </div>
                            <div className="auth-form-group">
                                <label htmlFor="login-password" className="auth-label">
                                    <FiLock className="auth-label-icon" />
                                    {t("authentication.login.password_label", { defaultValue: "Password" })}
                                </label>
                                <div className="auth-input-wrapper">
                                    <input
                                        id="login-password"
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        value={loginForm.password}
                                        onChange={handleLoginChange}
                                        placeholder={t("authentication.login.password_placeholder", { defaultValue: "Enter your password" })}
                                        className="auth-input"
                                        aria-required="true"
                                        disabled={loading}
                                        autoComplete="current-password"
                                    />
                                    <button
                                        type="button"
                                        className="auth-toggle-password"
                                        onClick={toggleShowPassword}
                                        aria-label={showPassword ? t("authentication.hide_password", { defaultValue: "Hide password" }) : t("authentication.show_password", { defaultValue: "Show password" })}
                                        disabled={loading}
                                    >
                                        {showPassword ? <FiEyeOff /> : <FiEye />}
                                    </button>
                                </div>
                            </div>
                            <button type="submit" className="auth-submit-btn" disabled={loading}>
                                <FiLogIn />
                                {t("authentication.login.submit", { defaultValue: "Login" })}
                            </button>
                        </form>
                        <div className="auth-divider">
                            <span>{t("authentication.login.or", { defaultValue: "or" })}</span>
                        </div>
                    </div>
                )}
                {activeTab === "register" && (
                    <div className="auth-content">
                        <div className="auth-form-header">
                            <h2 id="auth-title">{t("authentication.register.title", { defaultValue: "Register" })}</h2>
                            <p>{t("authentication.register.subtitle", { defaultValue: "Create a new account" })}</p>
                        </div>
                        {!verificationStep ? (
                            <form className="auth-form" onSubmit={handleRegisterSubmit}>
                                <div className="auth-form-group">
                                    <label htmlFor="register-role" className="auth-label">
                                        <FiUser className="auth-label-icon" />
                                        {t("authentication.register.role_label", { defaultValue: "Role" })}
                                    </label>
                                    <select
                                        id="register-role"
                                        name="role"
                                        value={registerForm.role}
                                        onChange={handleRegisterChange}
                                        className="auth-input"
                                        aria-required="true"
                                        disabled={loading}
                                    >
                                        <option value="Client">{t("authentication.register.role_client", { defaultValue: "Client" })}</option>
                                        <option value="Customer">{t("authentication.register.role_customer", { defaultValue: "Customer" })}</option>
                                    </select>
                                </div>
                                <div className="auth-name-grid">
                                    <div className="auth-form-group">
                                        <label htmlFor="register-first_name" className="auth-label">
                                            <FiUser className="auth-label-icon" />
                                            {t("authentication.register.first_name_label", { defaultValue: "First Name" })}
                                        </label>
                                        <input
                                            id="register-first_name"
                                            type="text"
                                            name="first_name"
                                            value={registerForm.first_name}
                                            onChange={handleRegisterChange}
                                            placeholder={t("authentication.register.first_name_placeholder", { defaultValue: "Enter your first name" })}
                                            className="auth-input"
                                            aria-required="true"
                                            disabled={loading}
                                            autoComplete="given-name"
                                        />
                                    </div>
                                    <div className="auth-form-group">
                                        <label htmlFor="register-last_name" className="auth-label">
                                            <FiUser className="auth-label-icon" />
                                            {t("authentication.register.last_name_label", { defaultValue: "Last Name" })}
                                        </label>
                                        <input
                                            id="register-last_name"
                                            type="text"
                                            name="last_name"
                                            value={registerForm.last_name}
                                            onChange={handleRegisterChange}
                                            placeholder={t("authentication.register.last_name_placeholder", { defaultValue: "Enter your last name" })}
                                            className="auth-input"
                                            aria-required="true"
                                            disabled={loading}
                                            autoComplete="family-name"
                                        />
                                    </div>
                                </div>
                                <div className="auth-form-group">
                                    <label htmlFor="register-email" className="auth-label">
                                        <FiMail className="auth-label-icon" />
                                        {t("authentication.register.email_label", { defaultValue: "Email" })}
                                    </label>
                                    <input
                                        id="register-email"
                                        type="email"
                                        name="email"
                                        value={registerForm.email}
                                        onChange={handleRegisterChange}
                                        placeholder={t("authentication.register.email_placeholder", { defaultValue: "Enter your email" })}
                                        className="auth-input"
                                        aria-required="true"
                                        disabled={loading}
                                        autoComplete="email"
                                    />
                                </div>
                                <div className="auth-form-group">
                                    <label htmlFor="register-password" className="auth-label">
                                        <FiLock className="auth-label-icon" />
                                        {t("authentication.register.password_label", { defaultValue: "Password" })}
                                    </label>
                                    <div className="auth-input-wrapper">
                                        <input
                                            id="register-password"
                                            type={showPassword ? "text" : "password"}
                                            name="password"
                                            value={registerForm.password}
                                            onChange={handleRegisterChange}
                                            placeholder={t("authentication.register.password_placeholder", { defaultValue: "Enter your password" })}
                                            className="auth-input"
                                            aria-required="true"
                                            disabled={loading}
                                            autoComplete="new-password"
                                        />
                                        <button
                                            type="button"
                                            className="auth-toggle-password"
                                            onClick={toggleShowPassword}
                                            aria-label={showPassword ? t("authentication.hide_password", { defaultValue: "Hide password" }) : t("authentication.show_password", { defaultValue: "Show password" })}
                                            disabled={loading}
                                        >
                                            {showPassword ? <FiEyeOff /> : <FiEye />}
                                        </button>
                                    </div>
                                </div>
                                <div className="auth-form-group">
                                    <label htmlFor="register-confirm_password" className="auth-label">
                                        <FiLock className="auth-label-icon" />
                                        {t("authentication.register.confirm_password_label", { defaultValue: "Confirm Password" })}
                                    </label>
                                    <div className="auth-input-wrapper">
                                        <input
                                            id="register-confirm_password"
                                            type={showConfirmPassword ? "text" : "password"}
                                            name="confirm_password"
                                            value={registerForm.confirm_password}
                                            onChange={handleRegisterChange}
                                            placeholder={t("authentication.register.confirm_password_placeholder", { defaultValue: "Confirm your password" })}
                                            className="auth-input"
                                            aria-required="true"
                                            disabled={loading}
                                            autoComplete="new-password"
                                        />
                                        <button
                                            type="button"
                                            className="auth-toggle-password"
                                            onClick={toggleShowConfirmPassword}
                                            aria-label={showConfirmPassword ? t("authentication.hide_password", { defaultValue: "Hide password" }) : t("authentication.show_password", { defaultValue: "Show password" })}
                                            disabled={loading}
                                        >
                                            {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                                        </button>
                                    </div>
                                </div>
                                <div className="auth-form-group">
                                    <label htmlFor="register-country" className="auth-label">
                                        <FiGlobe className="auth-label-icon" />
                                        {t("authentication.register.country_label", { defaultValue: "Country" })}
                                    </label>
                                    <div className="auth-country-wrapper">
                                        <input
                                            id="register-country"
                                            type="text"
                                            name="country"
                                            value={registerForm.country}
                                            onChange={handleRegisterChange}
                                            placeholder={t("authentication.register.country_placeholder", { defaultValue: "Enter your country" })}
                                            className="auth-input"
                                            ref={countryInputRef}
                                            aria-required="true"
                                            disabled={loading}
                                            autoComplete="country-name"
                                        />
                                        {countrySuggestions.length > 0 && (
                                            <ul className="auth-country-suggestions">
                                                {countrySuggestions.map((country, index) => (
                                                    <li
                                                        key={index}
                                                        onClick={() => handleCountrySelect(country)}
                                                        role="option"
                                                        aria-selected="false"
                                                        className="auth-country-option"
                                                    >
                                                        <FiGlobe className="auth-country-icon" />
                                                        {country}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>
                                <div className="auth-checkbox-group">
                                    <label className="auth-checkbox-label">
                                        <input
                                            type="checkbox"
                                            name="personalData"
                                            checked={checkboxes.personalData}
                                            onChange={handleCheckboxChange}
                                            aria-required="true"
                                            disabled={loading}
                                            className="auth-checkbox-input"
                                        />
                                        <div className="auth-checkbox-icon">
                                            {checkboxes.personalData ? <FiCheckSquare /> : <FiSquare />}
                                        </div>
                                        <span>{t("authentication.register.personal_data", { defaultValue: "I agree to the processing of personal data" })}</span>
                                    </label>
                                    <label className="auth-checkbox-label">
                                        <input
                                            type="checkbox"
                                            name="terms"
                                            checked={checkboxes.terms}
                                            onChange={handleCheckboxChange}
                                            aria-required="true"
                                            disabled={loading}
                                            className="auth-checkbox-input"
                                        />
                                        <div className="auth-checkbox-icon">
                                            {checkboxes.terms ? <FiCheckSquare /> : <FiSquare />}
                                        </div>
                                        <span>{t("authentication.register.terms", { defaultValue: "I accept the terms and conditions" })}</span>
                                    </label>
                                    <label className="auth-checkbox-label">
                                        <input
                                            type="checkbox"
                                            name="travelTips"
                                            checked={checkboxes.travelTips}
                                            onChange={handleCheckboxChange}
                                            disabled={loading}
                                            className="auth-checkbox-input"
                                        />
                                        <div className="auth-checkbox-icon">
                                            {checkboxes.travelTips ? <FiCheckSquare /> : <FiSquare />}
                                        </div>
                                        <span>{t("authentication.register.travel_tips", { defaultValue: "Subscribe to travel tips" })}</span>
                                    </label>
                                </div>
                                <button type="submit" className="auth-submit-btn" disabled={loading}>
                                    <FiUser />
                                    {t("authentication.register.submit", { defaultValue: "Register" })}
                                </button>
                            </form>
                        ) : (
                            <div className="auth-verification">
                                <div className="auth-verification-header">
                                    <div className="auth-verification-icon">
                                        <FiMail />
                                    </div>
                                    <h3>{t("authentication.register.verify_email_title", { defaultValue: "Verify Your Email" })}</h3>
                                    <p
                                        dangerouslySetInnerHTML={{
                                            __html: t("authentication.register.verify_email_message", {
                                                email: `<strong>${registerForm.email}</strong>`,
                                                defaultValue: `We have sent a verification code to <strong>${registerForm.email}</strong>`
                                            }),
                                        }}
                                    />
                                </div>
                                <form className="auth-form" onSubmit={handleVerifyCode}>
                                    <div className="auth-form-group">
                                        <label htmlFor="verification-code" className="auth-label">
                                            <FiCheck className="auth-label-icon" />
                                            {t("authentication.register.verification_code_label", { defaultValue: "Verification Code" })}
                                        </label>
                                        <input
                                            id="verification-code"
                                            type="text"
                                            value={verificationCode}
                                            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                            placeholder={t("authentication.register.verification_code_placeholder", { defaultValue: "Enter 6-digit code" })}
                                            className="auth-input auth-verification-input"
                                            aria-required="true"
                                            autoFocus
                                            maxLength="6"
                                            disabled={loading}
                                            pattern="[0-9]{6}"
                                        />
                                    </div>
                                    <button type="submit" className="auth-submit-btn" disabled={loading}>
                                        <FiCheck />
                                        {t("authentication.register.verify_submit", { defaultValue: "Verify" })}
                                    </button>
                                    <button
                                        type="button"
                                        className="auth-resend-btn"
                                        onClick={handleResendCode}
                                        disabled={loading}
                                    >
                                        <FiRotateCcw />
                                        {t("authentication.register.resend_code", { defaultValue: "Resend Code" })}
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                )}
                {activeTab === "forgot" && (
                    <div className="auth-content">
                        <div className="auth-form-header">
                            <h2 id="auth-title">{t("authentication.forgot.title", { defaultValue: "Forgot Password" })}</h2>
                            <p>{t("authentication.forgot.subtitle", { defaultValue: "Reset your password" })}</p>
                        </div>
                        {!forgotStep ? (
                            <div className="auth-forgot-step">
                                <div className="auth-forgot-icon">
                                    <FiMail />
                                </div>
                                <form className="auth-form" onSubmit={handleForgotSubmit}>
                                    <div className="auth-form-group">
                                        <label htmlFor="forgot-email" className="auth-label">
                                            <FiMail className="auth-label-icon" />
                                            {t("authentication.forgot.email_label", { defaultValue: "Email" })}
                                        </label>
                                        <input
                                            id="forgot-email"
                                            type="email"
                                            name="email"
                                            value={forgotForm.email}
                                            onChange={handleForgotChange}
                                            placeholder={t("authentication.forgot.email_placeholder", { defaultValue: "Enter your email" })}
                                            className="auth-input"
                                            aria-required="true"
                                            disabled={loading}
                                            autoComplete="email"
                                            autoFocus
                                        />
                                    </div>
                                    <button type="submit" className="auth-submit-btn" disabled={loading}>
                                        <FiMail />
                                        {t("authentication.forgot.submit", { defaultValue: "Send Reset Code" })}
                                    </button>
                                </form>
                            </div>
                        ) : (
                            <div className="auth-reset-step">
                                <div className="auth-reset-header">
                                    <div className="auth-reset-icon">
                                        <FiLock />
                                    </div>
                                    <h3>{t("authentication.forgot.reset_title", { defaultValue: "Reset Password" })}</h3>
                                    <p
                                        dangerouslySetInnerHTML={{
                                            __html: t("authentication.forgot.reset_message", {
                                                email: `<strong>${forgotForm.email}</strong>`,
                                                defaultValue: `We have sent a reset code to <strong>${forgotForm.email}</strong>`
                                            }),
                                        }}
                                    />
                                </div>
                                <form className="auth-form" onSubmit={handleResetPassword}>
                                    <div className="auth-form-group">
                                        <label htmlFor="forgot-code" className="auth-label">
                                            <FiCheck className="auth-label-icon" />
                                            {t("authentication.forgot.reset_code_label", { defaultValue: "Reset Code" })}
                                        </label>
                                        <input
                                            id="forgot-code"
                                            type="text"
                                            name="code"
                                            value={forgotForm.code}
                                            onChange={handleForgotChange}
                                            placeholder={t("authentication.forgot.reset_code_placeholder", { defaultValue: "Enter 6-digit code" })}
                                            className="auth-input auth-verification-input"
                                            aria-required="true"
                                            autoFocus
                                            maxLength="6"
                                            disabled={loading}
                                            pattern="[0-9]{6}"
                                        />
                                    </div>
                                    <div className="auth-form-group">
                                        <label htmlFor="forgot-new_password" className="auth-label">
                                            <FiLock className="auth-label-icon" />
                                            {t("authentication.forgot.new_password_label", { defaultValue: "New Password" })}
                                        </label>
                                        <div className="auth-input-wrapper">
                                            <input
                                                id="forgot-new_password"
                                                type={showNewPassword ? "text" : "password"}
                                                name="new_password"
                                                value={forgotForm.new_password}
                                                onChange={handleForgotChange}
                                                placeholder={t("authentication.forgot.new_password_placeholder", { defaultValue: "Enter new password" })}
                                                className="auth-input"
                                                aria-required="true"
                                                disabled={loading}
                                                autoComplete="new-password"
                                            />
                                            <button
                                                type="button"
                                                className="auth-toggle-password"
                                                onClick={toggleShowNewPassword}
                                                aria-label={showNewPassword ? t("authentication.hide_password", { defaultValue: "Hide password" }) : t("authentication.show_password", { defaultValue: "Show password" })}
                                                disabled={loading}
                                            >
                                                {showNewPassword ? <FiEyeOff /> : <FiEye />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="auth-form-group">
                                        <label htmlFor="forgot-confirm_password" className="auth-label">
                                            <FiLock className="auth-label-icon" />
                                            {t("authentication.forgot.confirm_password_label", { defaultValue: "Confirm Password" })}
                                        </label>
                                        <div className="auth-input-wrapper">
                                            <input
                                                id="forgot-confirm_password"
                                                type={showConfirmNewPassword ? "text" : "password"}
                                                name="confirm_password"
                                                value={forgotForm.confirm_password}
                                                onChange={handleForgotChange}
                                                placeholder={t("authentication.forgot.confirm_password_placeholder", { defaultValue: "Confirm new password" })}
                                                className="auth-input"
                                                aria-required="true"
                                                disabled={loading}
                                                autoComplete="new-password"
                                            />
                                            <button
                                                type="button"
                                                className="auth-toggle-password"
                                                onClick={toggleShowConfirmNewPassword}
                                                aria-label={showConfirmNewPassword ? t("authentication.hide_password", { defaultValue: "Hide password" }) : t("authentication.show_password", { defaultValue: "Show password" })}
                                                disabled={loading}
                                            >
                                                {showConfirmNewPassword ? <FiEyeOff /> : <FiEye />}
                                            </button>
                                        </div>
                                    </div>
                                    <button type="submit" className="auth-submit-btn" disabled={loading}>
                                        <FiCheck />
                                        {t("authentication.forgot.reset_submit", { defaultValue: "Reset Password" })}
                                    </button>
                                    <button
                                        type="button"
                                        className="auth-resend-btn"
                                        onClick={handleResendResetCode}
                                        disabled={loading}
                                    >
                                        <FiRotateCcw />
                                        {t("authentication.forgot.resend_code", { defaultValue: "Resend Code" })}
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
export default Authentication;