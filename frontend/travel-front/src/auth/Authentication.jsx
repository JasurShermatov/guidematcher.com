// Authentication.jsx
import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { FiX, FiMail, FiLock, FiUser, FiLogIn, FiCheckSquare, FiSquare, FiGlobe, FiCheck, FiEye, FiEyeOff, FiRotateCcw } from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";
import { FaFacebook } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { loginUser, requestCode, registerUser, requestPasswordReset, confirmPasswordReset, getCurrentUserShort } from "../api/api";
import "./Authentication.css";

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const Authentication = ({ setIsAuthenticated, setUser }) => {
    const { t } = useTranslation();
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
                setError(t("auth.validation.password_requirements"));
            } else if (currentPassword && currentConfirmPassword && currentPassword !== currentConfirmPassword) {
                setError(t("auth.validation.passwords_not_match"));
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
                setError(t("auth.validation.password_requirements"));
            } else if (currentNewPassword && currentConfirmPassword && currentNewPassword !== currentConfirmPassword) {
                setError(t("auth.validation.passwords_not_match"));
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

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        clearMessages();
        setLoading(true);

        if (!loginForm.email || !loginForm.password) {
            setError(t("auth.validation.required_fields"));
            setLoading(false);
            return;
        }

        if (!passwordRegex.test(loginForm.password)) {
            setError(t("auth.validation.password_requirements"));
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
            setError(error.message || t("auth.errors.login_failed"));
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
            setError(t("auth.validation.required_fields"));
            setLoading(false);
            return;
        }

        if (password !== confirm_password) {
            setError(t("auth.validation.passwords_not_match"));
            setLoading(false);
            return;
        }

        if (!passwordRegex.test(password)) {
            setError(t("auth.validation.password_requirements"));
            setLoading(false);
            return;
        }

        if (!checkboxes.personalData || !checkboxes.terms) {
            setError(t("auth.validation.required_checkboxes"));
            setLoading(false);
            return;
        }

        if (!countries.includes(country)) {
            setError(t("auth.validation.invalid_country"));
            setLoading(false);
            return;
        }

        try {
            await requestCode({ email: email.toLowerCase().trim() });
            setSuccessMessage(t("auth.success.verification_sent"));
            setVerificationStep(true);
        } catch (error) {
            const errorMsg = error.message.includes("Too many verification code requests")
                ? t("auth.errors.too_many_requests")
                : error.message.includes("already exists")
                    ? t("auth.errors.email_exists")
                    : error.message || t("auth.errors.code_request_failed");
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyCode = async (e) => {
        e.preventDefault();
        clearMessages();
        setLoading(true);

        if (!verificationCode) {
            setError(t("auth.validation.required_code"));
            setLoading(false);
            return;
        }

        if (!/^\d{6}$/.test(verificationCode)) {
            setError(t("auth.validation.invalid_code"));
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
            setSuccessMessage(t("auth.success.register_success"));
            if (tokenResponse.user.role === "Client") {
                navigate("/user-account");
            } else if (tokenResponse.user.role === "Customer") {
                navigate("/admin-account");
            } else {
                navigate("/account");
            }
            resetRegisterForm();
        } catch (error) {
            const errorMsg = error.message.includes("already exists")
                ? t("auth.errors.email_exists")
                : error.message.includes("expired")
                    ? t("auth.errors.expired_code")
                    : error.message.includes("Invalid or already used")
                        ? t("auth.errors.invalid_code")
                        : error.message || t("auth.errors.register_failed");
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const handleResendCode = async () => {
        clearMessages();
        setLoading(true);
        try {
            await requestCode({ email: registerForm.email.toLowerCase().trim() });
            setSuccessMessage(t("auth.success.verification_sent"));
        } catch (error) {
            const errorMsg = error.message.includes("Too many verification code requests")
                ? t("auth.errors.too_many_requests")
                : error.message || t("auth.errors.resend_code_failed");
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const handleForgotSubmit = async (e) => {
        e.preventDefault();
        clearMessages();
        setLoading(true);

        if (!forgotForm.email) {
            setError(t("auth.validation.required_fields"));
            setLoading(false);
            return;
        }

        try {
            const response = await requestPasswordReset({ email: forgotForm.email.toLowerCase().trim() });
            setSuccessMessage(response.message || t("auth.success.password_reset_sent"));
            setForgotStep(true);
        } catch (error) {
            const errorMsg = error.message.includes("Too many password reset requests")
                ? t("auth.errors.too_many_requests")
                : error.message || t("auth.errors.code_request_failed");
            setError(errorMsg);
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
            setError(t("auth.validation.required_fields"));
            setLoading(false);
            return;
        }

        if (new_password !== confirm_password) {
            setError(t("auth.validation.passwords_not_match"));
            setLoading(false);
            return;
        }

        if (!passwordRegex.test(new_password)) {
            setError(t("auth.validation.password_requirements"));
            setLoading(false);
            return;
        }

        if (!/^\d{6}$/.test(code)) {
            setError(t("auth.validation.invalid_code"));
            setLoading(false);
            return;
        }

        try {
            await confirmPasswordReset({
                email: email.toLowerCase().trim(),
                code,
                new_password,
            });
            setSuccessMessage(t("auth.success.password_reset_success"));
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
            const errorMsg = error.message.includes("expired")
                ? t("auth.errors.expired_code")
                : error.message.includes("Invalid")
                    ? t("auth.errors.invalid_code")
                    : error.message.includes("Too many failed attempts")
                        ? t("auth.errors.too_many_attempts")
                        : error.message || t("auth.errors.password_reset_failed");
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const handleResendResetCode = async () => {
        clearMessages();
        setLoading(true);
        try {
            const response = await requestPasswordReset({ email: forgotForm.email.toLowerCase().trim() });
            setSuccessMessage(response.message || t("auth.success.password_reset_sent"));
        } catch (error) {
            const errorMsg = error.message.includes("Too many password reset requests")
                ? t("auth.errors.too_many_requests")
                : error.message || t("auth.errors.resend_code_failed");
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const handleSocialLogin = (provider) => {
        alert(t("auth.social_login_dev", { provider }));
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
                <button className="auth-close-btn" onClick={closeModal} aria-label={t("auth.close_aria")}>
                    <FiX />
                </button>

                <div className="auth-header">
                    <h1 className="auth-brand">{t("auth.title")}</h1>
                    <p className="auth-subtitle">{t("auth.subtitle")}</p>
                </div>

                <div className="auth-tabs">
                    <button
                        className={`auth-tab ${activeTab === "login" ? "auth-tab-active" : ""}`}
                        onClick={() => switchTab("login")}
                        aria-selected={activeTab === "login"}
                        disabled={loading}
                    >
                        <FiLogIn />
                        {t("auth.tabs.login")}
                    </button>
                    <button
                        className={`auth-tab ${activeTab === "register" ? "auth-tab-active" : ""}`}
                        onClick={() => switchTab("register")}
                        aria-selected={activeTab === "register"}
                        disabled={loading}
                    >
                        <FiUser />
                        {t("auth.tabs.register")}
                    </button>
                    <button
                        className={`auth-tab ${activeTab === "forgot" ? "auth-tab-active" : ""}`}
                        onClick={() => switchTab("forgot")}
                        aria-selected={activeTab === "forgot"}
                        disabled={loading}
                    >
                        <FiRotateCcw />
                        {t("auth.tabs.forgot")}
                    </button>
                </div>

                {error && (
                    <div className="auth-message auth-error" role="alert">
                        <div className="auth-message-icon">⚠️</div>
                        <span>{error}</span>
                    </div>
                )}
                {successMessage && (
                    <div className="auth-message auth-success" role="alert">
                        <div className="auth-message-icon">✅</div>
                        <span>{successMessage}</span>
                    </div>
                )}

                {loading && (
                    <div className="auth-loading">
                        <div className="spinner"></div>
                        <span>{t("auth.loading")}</span>
                    </div>
                )}

                {activeTab === "login" && (
                    <div className="auth-content">
                        <div className="auth-form-header">
                            <h2 id="auth-title">{t("auth.login.title")}</h2>
                            <p>{t("auth.login.subtitle")}</p>
                        </div>

                        <form className="auth-form" onSubmit={handleLoginSubmit}>
                            <div className="auth-form-group">
                                <label htmlFor="login-email" className="auth-label">
                                    <FiMail className="auth-label-icon" />
                                    {t("auth.login.email_label")}
                                </label>
                                <input
                                    id="login-email"
                                    type="email"
                                    name="email"
                                    value={loginForm.email}
                                    onChange={handleLoginChange}
                                    placeholder={t("auth.login.email_placeholder")}
                                    className="auth-input"
                                    aria-required="true"
                                    disabled={loading}
                                    autoComplete="email"
                                />
                            </div>

                            <div className="auth-form-group">
                                <label htmlFor="login-password" className="auth-label">
                                    <FiLock className="auth-label-icon" />
                                    {t("auth.login.password_label")}
                                </label>
                                <div className="auth-input-wrapper">
                                    <input
                                        id="login-password"
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        value={loginForm.password}
                                        onChange={handleLoginChange}
                                        placeholder={t("auth.login.password_placeholder")}
                                        className="auth-input"
                                        aria-required="true"
                                        disabled={loading}
                                        autoComplete="current-password"
                                    />
                                    <button
                                        type="button"
                                        className="auth-toggle-password"
                                        onClick={toggleShowPassword}
                                        aria-label={showPassword ? t("auth.login.hide_password_aria") : t("auth.login.show_password_aria")}
                                        disabled={loading}
                                    >
                                        {showPassword ? <FiEyeOff /> : <FiEye />}
                                    </button>
                                </div>
                            </div>

                            <button type="submit" className="auth-submit-btn" disabled={loading}>
                                <FiLogIn />
                                {t("auth.login.submit_button")}
                            </button>
                        </form>

                        <div className="auth-divider">
                            <span>{t("auth.login.or")}</span>
                        </div>

                        <div className="auth-social">
                            <button
                                className="auth-social-btn google-btn"
                                onClick={() => handleSocialLogin("Google")}
                                disabled={loading}
                            >
                                <FcGoogle />
                                {t("auth.login.social.google")}
                            </button>
                            <button
                                className="auth-social-btn facebook-btn"
                                onClick={() => handleSocialLogin("Facebook")}
                                disabled={loading}
                            >
                                <FaFacebook />
                                {t("auth.login.social.facebook")}
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === "register" && (
                    <div className="auth-content">
                        <div className="auth-form-header">
                            <h2 id="auth-title">{t("auth.register.title")}</h2>
                            <p>{t("auth.register.subtitle")}</p>
                        </div>

                        {!verificationStep ? (
                            <form className="auth-form" onSubmit={handleRegisterSubmit}>
                                <div className="auth-form-group">
                                    <label htmlFor="register-role" className="auth-label">
                                        <FiUser className="auth-label-icon" />
                                        {t("auth.register.role_label")}
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
                                        <option value="Client">{t("auth.register.role_client")}</option>
                                        <option value="Customer">{t("auth.register.role_customer")}</option>
                                    </select>
                                </div>

                                <div className="auth-name-grid">
                                    <div className="auth-form-group">
                                        <label htmlFor="register-first_name" className="auth-label">
                                            <FiUser className="auth-label-icon" />
                                            {t("auth.register.first_name_label")}
                                        </label>
                                        <input
                                            id="register-first_name"
                                            type="text"
                                            name="first_name"
                                            value={registerForm.first_name}
                                            onChange={handleRegisterChange}
                                            placeholder={t("auth.register.first_name_placeholder")}
                                            className="auth-input"
                                            aria-required="true"
                                            disabled={loading}
                                            autoComplete="given-name"
                                        />
                                    </div>
                                    <div className="auth-form-group">
                                        <label htmlFor="register-last_name" className="auth-label">
                                            <FiUser className="auth-label-icon" />
                                            {t("auth.register.last_name_label")}
                                        </label>
                                        <input
                                            id="register-last_name"
                                            type="text"
                                            name="last_name"
                                            value={registerForm.last_name}
                                            onChange={handleRegisterChange}
                                            placeholder={t("auth.register.last_name_placeholder")}
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
                                        {t("auth.register.email_label")}
                                    </label>
                                    <input
                                        id="register-email"
                                        type="email"
                                        name="email"
                                        value={registerForm.email}
                                        onChange={handleRegisterChange}
                                        placeholder={t("auth.register.email_placeholder")}
                                        className="auth-input"
                                        aria-required="true"
                                        disabled={loading}
                                        autoComplete="email"
                                    />
                                </div>

                                <div className="auth-form-group">
                                    <label htmlFor="register-password" className="auth-label">
                                        <FiLock className="auth-label-icon" />
                                        {t("auth.register.password_label")}
                                    </label>
                                    <div className="auth-input-wrapper">
                                        <input
                                            id="register-password"
                                            type={showPassword ? "text" : "password"}
                                            name="password"
                                            value={registerForm.password}
                                            onChange={handleRegisterChange}
                                            placeholder={t("auth.register.password_placeholder")}
                                            className="auth-input"
                                            aria-required="true"
                                            disabled={loading}
                                            autoComplete="new-password"
                                        />
                                        <button
                                            type="button"
                                            className="auth-toggle-password"
                                            onClick={toggleShowPassword}
                                            aria-label={showPassword ? t("auth.register.hide_password_aria") : t("auth.register.show_password_aria")}
                                            disabled={loading}
                                        >
                                            {showPassword ? <FiEyeOff /> : <FiEye />}
                                        </button>
                                    </div>
                                </div>

                                <div className="auth-form-group">
                                    <label htmlFor="register-confirm_password" className="auth-label">
                                        <FiLock className="auth-label-icon" />
                                        {t("auth.register.confirm_password_label")}
                                    </label>
                                    <div className="auth-input-wrapper">
                                        <input
                                            id="register-confirm_password"
                                            type={showConfirmPassword ? "text" : "password"}
                                            name="confirm_password"
                                            value={registerForm.confirm_password}
                                            onChange={handleRegisterChange}
                                            placeholder={t("auth.register.confirm_password_placeholder")}
                                            className="auth-input"
                                            aria-required="true"
                                            disabled={loading}
                                            autoComplete="new-password"
                                        />
                                        <button
                                            type="button"
                                            className="auth-toggle-password"
                                            onClick={toggleShowConfirmPassword}
                                            aria-label={showConfirmPassword ? t("auth.register.hide_password_aria") : t("auth.register.show_password_aria")}
                                            disabled={loading}
                                        >
                                            {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                                        </button>
                                    </div>
                                </div>

                                <div className="auth-form-group">
                                    <label htmlFor="register-country" className="auth-label">
                                        <FiGlobe className="auth-label-icon" />
                                        {t("auth.register.country_label")}
                                    </label>
                                    <div className="auth-country-wrapper">
                                        <input
                                            id="register-country"
                                            type="text"
                                            name="country"
                                            value={registerForm.country}
                                            onChange={handleRegisterChange}
                                            placeholder={t("auth.register.country_placeholder")}
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
                                        <span>{t("auth.register.checkboxes.personal_data")}</span>
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
                                        <span>{t("auth.register.checkboxes.terms")}</span>
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
                                        <span>{t("auth.register.checkboxes.travel_tips")}</span>
                                    </label>
                                </div>

                                <button type="submit" className="auth-submit-btn" disabled={loading}>
                                    <FiUser />
                                    {t("auth.register.submit_button")}
                                </button>
                            </form>
                        ) : (
                            <div className="auth-verification">
                                <div className="auth-verification-header">
                                    <div className="auth-verification-icon">
                                        <FiMail />
                                    </div>
                                    <h3>{t("auth.register.verification.title")}</h3>
                                    <p
                                        dangerouslySetInnerHTML={{
                                            __html: t("auth.register.verification.subtitle", { email: registerForm.email }),
                                        }}
                                    />
                                </div>

                                <form className="auth-form" onSubmit={handleVerifyCode}>
                                    <div className="auth-form-group">
                                        <label htmlFor="verification-code" className="auth-label">
                                            <FiCheck className="auth-label-icon" />
                                            {t("auth.register.verification.code_label")}
                                        </label>
                                        <input
                                            id="verification-code"
                                            type="text"
                                            value={verificationCode}
                                            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                            placeholder={t("auth.register.verification.code_placeholder")}
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
                                        {t("auth.register.verification.submit_button")}
                                    </button>

                                    <button
                                        type="button"
                                        className="auth-resend-btn"
                                        onClick={handleResendCode}
                                        disabled={loading}
                                    >
                                        <FiRotateCcw />
                                        {t("auth.register.verification.resend_button")}
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === "forgot" && (
                    <div className="auth-content">
                        <div className="auth-form-header">
                            <h2 id="auth-title">{t("auth.forgot.title")}</h2>
                            <p>{t("auth.forgot.subtitle")}</p>
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
                                            {t("auth.forgot.email_label")}
                                        </label>
                                        <input
                                            id="forgot-email"
                                            type="email"
                                            name="email"
                                            value={forgotForm.email}
                                            onChange={handleForgotChange}
                                            placeholder={t("auth.forgot.email_placeholder")}
                                            className="auth-input"
                                            aria-required="true"
                                            disabled={loading}
                                            autoComplete="email"
                                            autoFocus
                                        />
                                    </div>

                                    <button type="submit" className="auth-submit-btn" disabled={loading}>
                                        <FiMail />
                                        {t("auth.forgot.submit_button")}
                                    </button>
                                </form>
                            </div>
                        ) : (
                            <div className="auth-reset-step">
                                <div className="auth-reset-header">
                                    <div className="auth-reset-icon">
                                        <FiLock />
                                    </div>
                                    <h3>{t("auth.forgot.reset.title")}</h3>
                                    <p
                                        dangerouslySetInnerHTML={{
                                            __html: t("auth.forgot.reset.subtitle", { email: forgotForm.email }),
                                        }}
                                    />
                                </div>

                                <form className="auth-form" onSubmit={handleResetPassword}>
                                    <div className="auth-form-group">
                                        <label htmlFor="forgot-code" className="auth-label">
                                            <FiCheck className="auth-label-icon" />
                                            {t("auth.forgot.reset.code_label")}
                                        </label>
                                        <input
                                            id="forgot-code"
                                            type="text"
                                            name="code"
                                            value={forgotForm.code}
                                            onChange={handleForgotChange}
                                            placeholder={t("auth.forgot.reset.code_placeholder")}
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
                                            {t("auth.forgot.reset.new_password_label")}
                                        </label>
                                        <div className="auth-input-wrapper">
                                            <input
                                                id="forgot-new_password"
                                                type={showNewPassword ? "text" : "password"}
                                                name="new_password"
                                                value={forgotForm.new_password}
                                                onChange={handleForgotChange}
                                                placeholder={t("auth.forgot.reset.new_password_placeholder")}
                                                className="auth-input"
                                                aria-required="true"
                                                disabled={loading}
                                                autoComplete="new-password"
                                            />
                                            <button
                                                type="button"
                                                className="auth-toggle-password"
                                                onClick={toggleShowNewPassword}
                                                aria-label={showNewPassword ? t("auth.forgot.reset.hide_password_aria") : t("auth.forgot.reset.show_password_aria")}
                                                disabled={loading}
                                            >
                                                {showNewPassword ? <FiEyeOff /> : <FiEye />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="auth-form-group">
                                        <label htmlFor="forgot-confirm_password" className="auth-label">
                                            <FiLock className="auth-label-icon" />
                                            {t("auth.forgot.reset.confirm_password_label")}
                                        </label>
                                        <div className="auth-input-wrapper">
                                            <input
                                                id="forgot-confirm_password"
                                                type={showConfirmNewPassword ? "text" : "password"}
                                                name="confirm_password"
                                                value={forgotForm.confirm_password}
                                                onChange={handleForgotChange}
                                                placeholder={t("auth.forgot.reset.confirm_password_placeholder")}
                                                className="auth-input"
                                                aria-required="true"
                                                disabled={loading}
                                                autoComplete="new-password"
                                            />
                                            <button
                                                type="button"
                                                className="auth-toggle-password"
                                                onClick={toggleShowConfirmNewPassword}
                                                aria-label={showConfirmNewPassword ? t("auth.forgot.reset.hide_password_aria") : t("auth.forgot.reset.show_password_aria")}
                                                disabled={loading}
                                            >
                                                {showConfirmNewPassword ? <FiEyeOff /> : <FiEye />}
                                            </button>
                                        </div>
                                    </div>

                                    <button type="submit" className="auth-submit-btn" disabled={loading}>
                                        <FiCheck />
                                        {t("auth.forgot.reset.submit_button")}
                                    </button>

                                    <button
                                        type="button"
                                        className="auth-resend-btn"
                                        onClick={handleResendResetCode}
                                        disabled={loading}
                                    >
                                        <FiRotateCcw />
                                        {t("auth.forgot.reset.resend_button")}
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