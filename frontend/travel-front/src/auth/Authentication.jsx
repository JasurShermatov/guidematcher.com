import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
    loginUser,
    requestCode,
    registerUser,
    requestPasswordReset,
    confirmPasswordReset,
    getCurrentUserShort,
    googleLogin
} from "../api/api";
import './Authentication.css';

const Authentication = ({ setIsAuthenticated, setUser }) => {
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
        country_code: "",
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
    const [expiryTime, setExpiryTime] = useState(null);

    const countryInputRef = useRef(null);
    const navigate = useNavigate();

    const countries = [
        { name: "Afghanistan", code: "AF" },
        { name: "Albania", code: "AL" },
        { name: "Algeria", code: "DZ" },
        { name: "Argentina", code: "AR" },
        { name: "Armenia", code: "AM" },
        { name: "Australia", code: "AU" },
        { name: "Austria", code: "AT" },
        { name: "Azerbaijan", code: "AZ" },
        { name: "Bangladesh", code: "BD" },
        { name: "Belarus", code: "BY" },
        { name: "Belgium", code: "BE" },
        { name: "Brazil", code: "BR" },
        { name: "Bulgaria", code: "BG" },
        { name: "Canada", code: "CA" },
        { name: "China", code: "CN" },
        { name: "Colombia", code: "CO" },
        { name: "Croatia", code: "HR" },
        { name: "Czech Republic", code: "CZ" },
        { name: "Denmark", code: "DK" },
        { name: "Egypt", code: "EG" },
        { name: "Estonia", code: "EE" },
        { name: "Finland", code: "FI" },
        { name: "France", code: "FR" },
        { name: "Georgia", code: "GE" },
        { name: "Germany", code: "DE" },
        { name: "Greece", code: "GR" },
        { name: "Hungary", code: "HU" },
        { name: "Iceland", code: "IS" },
        { name: "India", code: "IN" },
        { name: "Indonesia", code: "ID" },
        { name: "Iran", code: "IR" },
        { name: "Iraq", code: "IQ" },
        { name: "Ireland", code: "IE" },
        { name: "Israel", code: "IL" },
        { name: "Italy", code: "IT" },
        { name: "Japan", code: "JP" },
        { name: "Jordan", code: "JO" },
        { name: "Kazakhstan", code: "KZ" },
        { name: "Kenya", code: "KE" },
        { name: "South Korea", code: "KR" },
        { name: "Kuwait", code: "KW" },
        { name: "Kyrgyzstan", code: "KG" },
        { name: "Latvia", code: "LV" },
        { name: "Lithuania", code: "LT" },
        { name: "Luxembourg", code: "LU" },
        { name: "Malaysia", code: "MY" },
        { name: "Mexico", code: "MX" },
        { name: "Netherlands", code: "NL" },
        { name: "New Zealand", code: "NZ" },
        { name: "Norway", code: "NO" },
        { name: "Pakistan", code: "PK" },
        { name: "Philippines", code: "PH" },
        { name: "Poland", code: "PL" },
        { name: "Portugal", code: "PT" },
        { name: "Qatar", code: "QA" },
        { name: "Romania", code: "RO" },
        { name: "Russia", code: "RU" },
        { name: "Saudi Arabia", code: "SA" },
        { name: "Singapore", code: "SG" },
        { name: "Slovakia", code: "SK" },
        { name: "Slovenia", code: "SI" },
        { name: "South Africa", code: "ZA" },
        { name: "Spain", code: "ES" },
        { name: "Sri Lanka", code: "LK" },
        { name: "Sweden", code: "SE" },
        { name: "Switzerland", code: "CH" },
        { name: "Tajikistan", code: "TJ" },
        { name: "Thailand", code: "TH" },
        { name: "Turkey", code: "TR" },
        { name: "Turkmenistan", code: "TM" },
        { name: "Ukraine", code: "UA" },
        { name: "United Arab Emirates", code: "AE" },
        { name: "United Kingdom", code: "GB" },
        { name: "United States", code: "US" },
        { name: "Uruguay", code: "UY" },
        { name: "Uzbekistan", code: "UZ" },
        { name: "Vietnam", code: "VN" },
        { name: "Yemen", code: "YE" },
    ];

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem("access_token");
            if (token) {
                try {
                    const userData = await getCurrentUserShort();
                    setIsAuthenticated(true);
                    setUser(userData);
                    if (userData.role === "Client") {
                        navigate("/client-dashboard");
                    } else if (userData.role === "Customer") {
                        navigate("/customer-dashboard");
                    }
                } catch (error) {
                    localStorage.removeItem("access_token");
                    localStorage.removeItem("refresh_token");
                    setIsAuthenticated(false);
                }
            }
        };
        checkAuth();
    }, [setIsAuthenticated, setUser, navigate]);

    // Countdown timer for code expiry
    useEffect(() => {
        let timer;
        if (expiryTime && expiryTime > Date.now()) {
            timer = setInterval(() => {
                const remaining = expiryTime - Date.now();
                if (remaining <= 0) {
                    setExpiryTime(null);
                    clearInterval(timer);
                }
            }, 1000);
        }
        return () => {
            if (timer) clearInterval(timer);
        };
    }, [expiryTime]);

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
                .filter((country) =>
                    country.name.toLowerCase().startsWith(value.toLowerCase())
                )
                .slice(0, 5);
            setCountrySuggestions(filteredSuggestions);
        }

        if (name === "password" || name === "confirm_password") {
            const currentPassword = name === "password" ? value : registerForm.password;
            const currentConfirmPassword = name === "confirm_password" ? value : registerForm.confirm_password;

            if (value && !passwordRegex.test(value)) {
                setError("Password must contain at least one lowercase letter, one uppercase letter, one digit, and one special character (@$!%*?&).");
            } else if (currentPassword && currentConfirmPassword && currentPassword !== currentConfirmPassword) {
                setError("Passwords do not match.");
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
                setError("Password must contain at least one lowercase letter, one uppercase letter, one digit, and one special character (@$!%*?&).");
            } else if (currentNewPassword && currentConfirmPassword && currentNewPassword !== currentConfirmPassword) {
                setError("Passwords do not match.");
            } else {
                setError("");
            }
        }
    };

    const handleCountrySelect = (country) => {
        setRegisterForm({ ...registerForm, country: country.name, country_code: country.code });
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

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getRemainingTime = () => {
        if (!expiryTime) return 0;
        return Math.max(0, Math.floor((expiryTime - Date.now()) / 1000));
    };

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        clearMessages();
        setLoading(true);

        if (!loginForm.email || !loginForm.password) {
            setError("All fields are required.");
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
                navigate("/client-dashboard");
            } else if (tokenData.user.role === "Customer") {
                navigate("/customer-dashboard");
            }

            setLoginForm({ email: "", password: "" });
        } catch (error) {
            setError(error.message || "Login failed. Please check your credentials.");
        } finally {
            setLoading(false);
        }
    };

    const handleRegisterSubmit = async (e) => {
        e.preventDefault();
        clearMessages();
        setLoading(true);

        const { role, first_name, last_name, email, password, confirm_password, country, country_code } = registerForm;

        if (!role || !first_name || !last_name || !email || !password || !confirm_password || !country) {
            setError("All fields are required.");
            setLoading(false);
            return;
        }

        if (password !== confirm_password) {
            setError("Passwords do not match.");
            setLoading(false);
            return;
        }

        if (!passwordRegex.test(password)) {
            setError("Password must contain at least one lowercase letter, one uppercase letter, one digit, and one special character (@$!%*?&).");
            setLoading(false);
            return;
        }

        if (!checkboxes.personalData || !checkboxes.terms) {
            setError("You must agree to the terms and privacy policy.");
            setLoading(false);
            return;
        }

        const selectedCountry = countries.find(c => c.name === country);
        if (!selectedCountry) {
            setError("Please select a valid country from the suggestions.");
            setLoading(false);
            return;
        }

        try {
            const response = await requestCode({ email: email.toLowerCase().trim() });
            setSuccessMessage("Verification code sent successfully to your email.");
            setVerificationStep(true);
            setExpiryTime(Date.now() + (response.expires_at ? new Date(response.expires_at).getTime() - Date.now() : 300000));
        } catch (error) {
            const errorMsg = error.message.includes("Too many verification code requests")
                ? "Too many requests. Please wait 15 minutes and try again."
                : error.message.includes("already exists")
                    ? "This email is already registered."
                    : error.message || "Failed to send verification code.";
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
            setError("Verification code is required.");
            setLoading(false);
            return;
        }

        if (!/^\d{6}$/.test(verificationCode)) {
            setError("Verification code must be 6 digits.");
            setLoading(false);
            return;
        }

        try {
            const { role, first_name, last_name, email, password, country, country_code } = registerForm;
            const tokenResponse = await registerUser({
                role,
                first_name,
                last_name,
                email: email.toLowerCase().trim(),
                password,
                country,
                country_code,
                code: verificationCode,
            });

            localStorage.setItem("access_token", tokenResponse.access);
            localStorage.setItem("refresh_token", tokenResponse.refresh);
            setIsAuthenticated(true);
            setUser(tokenResponse.user);
            setSuccessMessage("Registration successful! Welcome!");

            if (tokenResponse.user.role === "Client") {
                navigate("/client-dashboard");
            } else if (tokenResponse.user.role === "Customer") {
                navigate("/customer-dashboard");
            }

            resetRegisterForm();
        } catch (error) {
            const errorMsg = error.message.includes("already exists")
                ? "This email is already registered."
                : error.message.includes("expired")
                    ? "Verification code has expired."
                    : error.message.includes("Invalid or already used")
                        ? "Invalid or already used verification code."
                        : error.message || "Registration failed.";
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const handleResendCode = async () => {
        clearMessages();
        setLoading(true);
        try {
            const response = await requestCode({ email: registerForm.email.toLowerCase().trim() });
            setSuccessMessage("New verification code sent successfully.");
            setExpiryTime(Date.now() + (response.expires_at ? new Date(response.expires_at).getTime() - Date.now() : 300000));
        } catch (error) {
            const errorMsg = error.message.includes("Too many verification code requests")
                ? "Too many requests. Please wait 15 minutes and try again."
                : error.message || "Failed to resend verification code.";
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
            setError("Email is required.");
            setLoading(false);
            return;
        }

        try {
            const response = await requestPasswordReset({ email: forgotForm.email.toLowerCase().trim() });
            setSuccessMessage(response.message || "Password reset code sent to your email.");
            setForgotStep(true);
        } catch (error) {
            const errorMsg = error.message.includes("Too many password reset requests")
                ? "Too many requests. Please wait 30 minutes and try again."
                : error.message || "Failed to send password reset code.";
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
            setError("All fields are required.");
            setLoading(false);
            return;
        }

        if (new_password !== confirm_password) {
            setError("Passwords do not match.");
            setLoading(false);
            return;
        }

        if (!passwordRegex.test(new_password)) {
            setError("Password must contain at least one lowercase letter, one uppercase letter, one digit, and one special character (@$!%*?&).");
            setLoading(false);
            return;
        }

        if (!/^\d{6}$/.test(code)) {
            setError("Verification code must be 6 digits.");
            setLoading(false);
            return;
        }

        try {
            await confirmPasswordReset({
                email: email.toLowerCase().trim(),
                code,
                new_password,
            });
            setSuccessMessage("Password has been reset successfully!");
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
                ? "Verification code has expired."
                : error.message.includes("Invalid")
                    ? "Invalid verification code."
                    : error.message.includes("Too many failed attempts")
                        ? "Too many failed attempts. Please request a new code."
                        : error.message || "Password reset failed.";
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
            setSuccessMessage(response.message || "New password reset code sent to your email.");
        } catch (error) {
            const errorMsg = error.message.includes("Too many password reset requests")
                ? "Too many requests. Please wait 30 minutes and try again."
                : error.message || "Failed to resend password reset code.";
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const handleSocialLogin = async (provider) => {
        if (provider === 'google') {
            // Implement Google OAuth logic here
            alert("Google login will be implemented here");
        } else {
            alert(`${provider} login will be implemented here`);
        }
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
            country_code: "",
        });
        setVerificationCode("");
        setCheckboxes({ personalData: false, terms: false, travelTips: false });
        setVerificationStep(false);
        setExpiryTime(null);
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
        setExpiryTime(null);
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
        <div className="authentication-overlay" onClick={closeModal}>
            <div className="authentication-modal" onClick={(e) => e.stopPropagation()}>
                <button className="authentication-close-btn" onClick={closeModal}>
                    ×
                </button>

                <div className="authentication-header">
                    <h1 className="authentication-brand">TravMatch</h1>
                    <p className="authentication-subtitle">Connect with local guides worldwide</p>
                </div>

                <div className="authentication-tabs">
                    <button
                        className={`authentication-tab ${activeTab === "login" ? "authentication-tab-active" : ""}`}
                        onClick={() => switchTab("login")}
                        disabled={loading}
                    >
                        Login
                    </button>
                    <button
                        className={`authentication-tab ${activeTab === "register" ? "authentication-tab-active" : ""}`}
                        onClick={() => switchTab("register")}
                        disabled={loading}
                    >
                        Register
                    </button>
                    <button
                        className={`authentication-tab ${activeTab === "forgot" ? "authentication-tab-active" : ""}`}
                        onClick={() => switchTab("forgot")}
                        disabled={loading}
                    >
                        Reset Password
                    </button>
                </div>

                {error && (
                    <div className="authentication-message authentication-error">
                        <div className="authentication-message-icon">⚠️</div>
                        <span>{error}</span>
                    </div>
                )}
                {successMessage && (
                    <div className="authentication-message authentication-success">
                        <div className="authentication-message-icon">✅</div>
                        <span>{successMessage}</span>
                    </div>
                )}

                {loading && (
                    <div className="authentication-loading">
                        <div className="authentication-spinner"></div>
                        <span>Processing...</span>
                    </div>
                )}

                {activeTab === "login" && (
                    <div className="authentication-content">
                        <div className="authentication-form-header">
                            <h2>Welcome Back</h2>
                            <p>Sign in to your account</p>
                        </div>

                        <form className="authentication-form" onSubmit={handleLoginSubmit}>
                            <div className="authentication-form-group">
                                <label htmlFor="login-email" className="authentication-label">
                                    Email Address
                                </label>
                                <input
                                    id="login-email"
                                    type="email"
                                    name="email"
                                    value={loginForm.email}
                                    onChange={handleLoginChange}
                                    placeholder="Enter your email"
                                    className="authentication-input"
                                    required
                                    disabled={loading}
                                    autoComplete="email"
                                />
                            </div>

                            <div className="authentication-form-group">
                                <label htmlFor="login-password" className="authentication-label">
                                    Password
                                </label>
                                <div className="authentication-input-wrapper">
                                    <input
                                        id="login-password"
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        value={loginForm.password}
                                        onChange={handleLoginChange}
                                        placeholder="Enter your password"
                                        className="authentication-input"
                                        required
                                        disabled={loading}
                                        autoComplete="current-password"
                                    />
                                    <button
                                        type="button"
                                        className="authentication-toggle-password"
                                        onClick={toggleShowPassword}
                                        disabled={loading}
                                    >
                                        {showPassword ? "👁️" : "👁️‍🗨️"}
                                    </button>
                                </div>
                            </div>

                            <button type="submit" className="authentication-submit-btn" disabled={loading}>
                                Sign In
                            </button>
                        </form>

                        <div className="authentication-divider">
                            <span>or continue with</span>
                        </div>

                        <div className="authentication-social">
                            <button
                                className="authentication-social-btn authentication-google-btn"
                                onClick={() => handleSocialLogin("Google")}
                                disabled={loading}
                            >
                                <span>🔍</span>
                                Google
                            </button>
                            <button
                                className="authentication-social-btn authentication-facebook-btn"
                                onClick={() => handleSocialLogin("Facebook")}
                                disabled={loading}
                            >
                                <span>📘</span>
                                Facebook
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === "register" && (
                    <div className="authentication-content">
                        <div className="authentication-form-header">
                            <h2>Create Account</h2>
                            <p>Join our community of travelers and guides</p>
                        </div>

                        {!verificationStep ? (
                            <form className="authentication-form" onSubmit={handleRegisterSubmit}>
                                <div className="authentication-form-group">
                                    <label htmlFor="register-role" className="authentication-label">
                                        Account Type
                                    </label>
                                    <select
                                        id="register-role"
                                        name="role"
                                        value={registerForm.role}
                                        onChange={handleRegisterChange}
                                        className="authentication-input"
                                        required
                                        disabled={loading}
                                    >
                                        <option value="Client">Client (Looking for guides)</option>
                                        <option value="Customer">Guide (Offer services)</option>
                                    </select>
                                </div>

                                <div className="authentication-name-grid">
                                    <div className="authentication-form-group">
                                        <label htmlFor="register-first_name" className="authentication-label">
                                            First Name
                                        </label>
                                        <input
                                            id="register-first_name"
                                            type="text"
                                            name="first_name"
                                            value={registerForm.first_name}
                                            onChange={handleRegisterChange}
                                            placeholder="John"
                                            className="authentication-input"
                                            required
                                            disabled={loading}
                                            autoComplete="given-name"
                                        />
                                    </div>
                                    <div className="authentication-form-group">
                                        <label htmlFor="register-last_name" className="authentication-label">
                                            Last Name
                                        </label>
                                        <input
                                            id="register-last_name"
                                            type="text"
                                            name="last_name"
                                            value={registerForm.last_name}
                                            onChange={handleRegisterChange}
                                            placeholder="Doe"
                                            className="authentication-input"
                                            required
                                            disabled={loading}
                                            autoComplete="family-name"
                                        />
                                    </div>
                                </div>

                                <div className="authentication-form-group">
                                    <label htmlFor="register-email" className="authentication-label">
                                        Email Address
                                    </label>
                                    <input
                                        id="register-email"
                                        type="email"
                                        name="email"
                                        value={registerForm.email}
                                        onChange={handleRegisterChange}
                                        placeholder="john.doe@example.com"
                                        className="authentication-input"
                                        required
                                        disabled={loading}
                                        autoComplete="email"
                                    />
                                </div>

                                <div className="authentication-form-group">
                                    <label htmlFor="register-password" className="authentication-label">
                                        Password
                                    </label>
                                    <div className="authentication-input-wrapper">
                                        <input
                                            id="register-password"
                                            type={showPassword ? "text" : "password"}
                                            name="password"
                                            value={registerForm.password}
                                            onChange={handleRegisterChange}
                                            placeholder="Create a strong password"
                                            className="authentication-input"
                                            required
                                            disabled={loading}
                                            autoComplete="new-password"
                                        />
                                        <button
                                            type="button"
                                            className="authentication-toggle-password"
                                            onClick={toggleShowPassword}
                                            disabled={loading}
                                        >
                                            {showPassword ? "👁️" : "👁️‍🗨️"}
                                        </button>
                                    </div>
                                </div>

                                <div className="authentication-form-group">
                                    <label htmlFor="register-confirm_password" className="authentication-label">
                                        Confirm Password
                                    </label>
                                    <div className="authentication-input-wrapper">
                                        <input
                                            id="register-confirm_password"
                                            type={showConfirmPassword ? "text" : "password"}
                                            name="confirm_password"
                                            value={registerForm.confirm_password}
                                            onChange={handleRegisterChange}
                                            placeholder="Confirm your password"
                                            className="authentication-input"
                                            required
                                            disabled={loading}
                                            autoComplete="new-password"
                                        />
                                        <button
                                            type="button"
                                            className="authentication-toggle-password"
                                            onClick={toggleShowConfirmPassword}
                                            disabled={loading}
                                        >
                                            {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
                                        </button>
                                    </div>
                                </div>

                                <div className="authentication-form-group">
                                    <label htmlFor="register-country" className="authentication-label">
                                        Country
                                    </label>
                                    <div className="authentication-country-wrapper">
                                        <input
                                            id="register-country"
                                            type="text"
                                            name="country"
                                            value={registerForm.country}
                                            onChange={handleRegisterChange}
                                            placeholder="Type to search countries..."
                                            className="authentication-input"
                                            ref={countryInputRef}
                                            required
                                            disabled={loading}
                                            autoComplete="country-name"
                                        />
                                        {countrySuggestions.length > 0 && (
                                            <ul className="authentication-country-suggestions">
                                                {countrySuggestions.map((country, index) => (
                                                    <li
                                                        key={index}
                                                        onClick={() => handleCountrySelect(country)}
                                                        className="authentication-country-option"
                                                    >
                                                        🌍 {country.name}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>

                                <div className="authentication-checkbox-group">
                                    <label className="authentication-checkbox-label">
                                        <input
                                            type="checkbox"
                                            name="personalData"
                                            checked={checkboxes.personalData}
                                            onChange={handleCheckboxChange}
                                            required
                                            disabled={loading}
                                            className="authentication-checkbox-input"
                                        />
                                        <div className="authentication-checkbox-icon">
                                            {checkboxes.personalData ? "✅" : "⬜"}
                                        </div>
                                        <span>I agree to the processing of personal data</span>
                                    </label>

                                    <label className="authentication-checkbox-label">
                                        <input
                                            type="checkbox"
                                            name="terms"
                                            checked={checkboxes.terms}
                                            onChange={handleCheckboxChange}
                                            required
                                            disabled={loading}
                                            className="authentication-checkbox-input"
                                        />
                                        <div className="authentication-checkbox-icon">
                                            {checkboxes.terms ? "✅" : "⬜"}
                                        </div>
                                        <span>I agree to the Terms of Service</span>
                                    </label>

                                    <label className="authentication-checkbox-label">
                                        <input
                                            type="checkbox"
                                            name="travelTips"
                                            checked={checkboxes.travelTips}
                                            onChange={handleCheckboxChange}
                                            disabled={loading}
                                            className="authentication-checkbox-input"
                                        />
                                        <div className="authentication-checkbox-icon">
                                            {checkboxes.travelTips ? "✅" : "⬜"}
                                        </div>
                                        <span>Send me travel tips and updates (optional)</span>
                                    </label>
                                </div>

                                <button type="submit" className="authentication-submit-btn" disabled={loading}>
                                    Create Account
                                </button>
                            </form>
                        ) : (
                            <div className="authentication-verification">
                                <div className="authentication-verification-header">
                                    <div className="authentication-verification-icon">
                                        📧
                                    </div>
                                    <h3>Check Your Email</h3>
                                    <p>
                                        We've sent a verification code to <strong>{registerForm.email}</strong>
                                    </p>
                                    {expiryTime && (
                                        <p className="authentication-expiry-timer">
                                            Code expires in: {formatTime(getRemainingTime())}
                                        </p>
                                    )}
                                </div>

                                <form className="authentication-form" onSubmit={handleVerifyCode}>
                                    <div className="authentication-form-group">
                                        <label htmlFor="verification-code" className="authentication-label">
                                            Verification Code
                                        </label>
                                        <input
                                            id="verification-code"
                                            type="text"
                                            value={verificationCode}
                                            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                            placeholder="Enter 6-digit code"
                                            className="authentication-input authentication-verification-input"
                                            required
                                            autoFocus
                                            maxLength="6"
                                            disabled={loading}
                                            pattern="[0-9]{6}"
                                        />
                                    </div>

                                    <button type="submit" className="authentication-submit-btn" disabled={loading}>
                                        Verify & Create Account
                                    </button>

                                    <button
                                        type="button"
                                        className="authentication-resend-btn"
                                        onClick={handleResendCode}
                                        disabled={loading || getRemainingTime() > 0}
                                    >
                                        {getRemainingTime() > 0 ? `Resend in ${formatTime(getRemainingTime())}` : "Resend Code"}
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === "forgot" && (
                    <div className="authentication-content">
                        <div className="authentication-form-header">
                            <h2>Reset Password</h2>
                            <p>Enter your email to receive a reset code</p>
                        </div>

                        {!forgotStep ? (
                            <div className="authentication-forgot-step">
                                <div className="authentication-forgot-icon">
                                    📧
                                </div>
                                <form className="authentication-form" onSubmit={handleForgotSubmit}>
                                    <div className="authentication-form-group">
                                        <label htmlFor="forgot-email" className="authentication-label">
                                            Email Address
                                        </label>
                                        <input
                                            id="forgot-email"
                                            type="email"
                                            name="email"
                                            value={forgotForm.email}
                                            onChange={handleForgotChange}
                                            placeholder="Enter your email address"
                                            className="authentication-input"
                                            required
                                            disabled={loading}
                                            autoComplete="email"
                                            autoFocus
                                        />
                                    </div>

                                    <button type="submit" className="authentication-submit-btn" disabled={loading}>
                                        Send Reset Code
                                    </button>
                                </form>
                            </div>
                        ) : (
                            <div className="authentication-reset-step">
                                <div className="authentication-reset-header">
                                    <div className="authentication-reset-icon">
                                        🔐
                                    </div>
                                    <h3>Enter Reset Code</h3>
                                    <p>
                                        We've sent a reset code to <strong>{forgotForm.email}</strong>
                                    </p>
                                </div>

                                <form className="authentication-form" onSubmit={handleResetPassword}>
                                    <div className="authentication-form-group">
                                        <label htmlFor="forgot-code" className="authentication-label">
                                            Reset Code
                                        </label>
                                        <input
                                            id="forgot-code"
                                            type="text"
                                            name="code"
                                            value={forgotForm.code}
                                            onChange={handleForgotChange}
                                            placeholder="Enter 6-digit code"
                                            className="authentication-input authentication-verification-input"
                                            required
                                            autoFocus
                                            maxLength="6"
                                            disabled={loading}
                                            pattern="[0-9]{6}"
                                        />
                                    </div>

                                    <div className="authentication-form-group">
                                        <label htmlFor="forgot-new_password" className="authentication-label">
                                            New Password
                                        </label>
                                        <div className="authentication-input-wrapper">
                                            <input
                                                id="forgot-new_password"
                                                type={showNewPassword ? "text" : "password"}
                                                name="new_password"
                                                value={forgotForm.new_password}
                                                onChange={handleForgotChange}
                                                placeholder="Enter new password"
                                                className="authentication-input"
                                                required
                                                disabled={loading}
                                                autoComplete="new-password"
                                            />
                                            <button
                                                type="button"
                                                className="authentication-toggle-password"
                                                onClick={toggleShowNewPassword}
                                                disabled={loading}
                                            >
                                                {showNewPassword ? "👁️" : "👁️‍🗨️"}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="authentication-form-group">
                                        <label htmlFor="forgot-confirm_password" className="authentication-label">
                                            Confirm New Password
                                        </label>
                                        <div className="authentication-input-wrapper">
                                            <input
                                                id="forgot-confirm_password"
                                                type={showConfirmNewPassword ? "text" : "password"}
                                                name="confirm_password"
                                                value={forgotForm.confirm_password}
                                                onChange={handleForgotChange}
                                                placeholder="Confirm new password"
                                                className="authentication-input"
                                                required
                                                disabled={loading}
                                                autoComplete="new-password"
                                            />
                                            <button
                                                type="button"
                                                className="authentication-toggle-password"
                                                onClick={toggleShowConfirmNewPassword}
                                                disabled={loading}
                                            >
                                                {showConfirmNewPassword ? "👁️" : "👁️‍🗨️"}
                                            </button>
                                        </div>
                                    </div>

                                    <button type="submit" className="authentication-submit-btn" disabled={loading}>
                                        Reset Password
                                    </button>

                                    <button
                                        type="button"
                                        className="authentication-resend-btn"
                                        onClick={handleResendResetCode}
                                        disabled={loading}
                                    >
                                        Resend Reset Code
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