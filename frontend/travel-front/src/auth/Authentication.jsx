import React, { useState, useEffect, useRef } from "react";
import { FiX, FiMail, FiLock, FiUser, FiLogIn, FiCheckSquare, FiSquare, FiGlobe, FiCheck, FiEye, FiEyeOff } from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";
import { FaFacebook } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { loginUser, requestCode, registerUser, getCurrentUser } from "../api/api";
import "./Authentication.css";

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

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
  const [countrySuggestions, setCountrySuggestions] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [codeTimer, setCodeTimer] = useState(0);
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

  // Timer effect for resend code
  useEffect(() => {
    let interval = null;
    if (codeTimer > 0) {
      interval = setInterval(() => {
        setCodeTimer(codeTimer - 1);
      }, 1000);
    } else if (codeTimer === 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [codeTimer]);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("access_token");
      if (token) {
        try {
          const userData = await getCurrentUser();
          setIsAuthenticated(true);
          setUser({
            id: userData.id,
            role: userData.role,
            username: userData.full_name,
            email: userData.email,
            first_name: userData.first_name,
            last_name: userData.last_name,
            country: userData.country || "",
            city: userData.city || "",
            bio: userData.bio || "",
          });
          navigate("/account");
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

  const handleLoginChange = (e) => {
    setLoginForm({ ...loginForm, [e.target.name]: e.target.value });
    setError("");
    setSuccessMessage("");
  };

  const handleRegisterChange = (e) => {
    const { name, value } = e.target;
    setRegisterForm({ ...registerForm, [name]: value });
    setError("");
    setSuccessMessage("");

    if (name === "country") {
      const filteredSuggestions = countries
        .filter((country) => country.toLowerCase().startsWith(value.toLowerCase()))
        .slice(0, 5);
      setCountrySuggestions(filteredSuggestions);
    }

    if (name === "password" || name === "confirm_password") {
      if (value && !passwordRegex.test(value)) {
        setError(
          "Parol kamida 8 belgidan iborat bo'lishi, katta harf, kichik harf, raqam va maxsus belgi (@$!%*?&) o'z ichiga olishi kerak."
        );
      } else if (registerForm.password && registerForm.confirm_password && registerForm.password !== registerForm.confirm_password) {
        setError("Parollar mos kelmadi.");
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
    setError("");
    setSuccessMessage("");
  };

  const toggleShowPassword = () => setShowPassword(!showPassword);
  const toggleShowConfirmPassword = () => setShowConfirmPassword(!showConfirmPassword);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setLoading(true);

    if (!loginForm.email || !loginForm.password) {
      setError("Iltimos, barcha maydonlarni to'ldiring.");
      setLoading(false);
      return;
    }

    if (!passwordRegex.test(loginForm.password)) {
      setError(
        "Parol kamida 8 belgidan iborat bo'lishi, katta harf, kichik harf, raqam va maxsus belgi (@$!%*?&) o'z ichiga olishi kerak."
      );
      setLoading(false);
      return;
    }

    try {
      const data = await loginUser(loginForm);
      localStorage.setItem("access_token", data.access);
      localStorage.setItem("refresh_token", data.refresh);
      setIsAuthenticated(true);
      setUser(data.user);
      navigate("/account");
    } catch (error) {
      setError(error.message || "Kirishda xatolik yuz berdi. Email yoki parolni tekshiring.");
    } finally {
      setLoading(false);
    }
  };

  const validateRegistrationForm = () => {
    const { role, first_name, last_name, email, password, confirm_password, country } = registerForm;

    if (!first_name?.trim()) {
      setError("Ism kiritish majburiy.");
      return false;
    }

    if (!last_name?.trim()) {
      setError("Familiya kiritish majburiy.");
      return false;
    }

    if (!email?.trim()) {
      setError("Email kiritish majburiy.");
      return false;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("To'g'ri email formatini kiriting.");
      return false;
    }

    if (!password) {
      setError("Parol kiritish majburiy.");
      return false;
    }

    if (!confirm_password) {
      setError("Parolni tasdiqlash majburiy.");
      return false;
    }

    if (password !== confirm_password) {
      setError("Parollar mos kelmadi.");
      return false;
    }

    if (!passwordRegex.test(password)) {
      setError(
        "Parol kamida 8 belgidan iborat bo'lishi, katta harf, kichik harf, raqam va maxsus belgi (@$!%*?&) o'z ichiga olishi kerak."
      );
      return false;
    }

    if (!country?.trim()) {
      setError("Mamlakat kiritish majburiy.");
      return false;
    }

    if (!checkboxes.personalData) {
      setError("Shaxsiy ma'lumotlarni qayta ishlashga rozilik berishingiz kerak.");
      return false;
    }

    if (!checkboxes.terms) {
      setError("Foydalanish shartlariga rozilik berishingiz kerak.");
      return false;
    }

    return true;
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setLoading(true);

    if (!validateRegistrationForm()) {
      setLoading(false);
      return;
    }

    try {
      console.log("Requesting verification code for:", registerForm.email);
      
      const requestData = {
        email: registerForm.email.trim(),
        code_type: "registration"
      };

      await requestCode(requestData);
      
      setSuccessMessage(`Tasdiqlash kodi ${registerForm.email} manziliga yuborildi. Iltimos, emailingizni tekshiring.`);
      setVerificationStep(true);
      setCodeTimer(300); // 5 minutes timer for resend
      
    } catch (error) {
      console.error("Error requesting verification code:", error);
      
      let errorMsg = "Tasdiqlash kodi so'rovida xatolik yuz berdi.";
      
      if (error.message.includes("already")) {
        errorMsg = "Bu email allaqachon ro'yxatdan o'tgan. Iltimos, boshqa email ishlating yoki tizimga kiring.";
      } else if (error.message.includes("rate")) {
        errorMsg = "Juda ko'p urinish. Iltimos, biroz kutib qaytadan urinib ko'ring.";
      } else if (error.message.includes("invalid")) {
        errorMsg = "Noto'g'ri email format.";
      } else {
        errorMsg = error.message || errorMsg;
      }
      
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setLoading(true);

    // Validation
    if (!verificationCode?.trim()) {
      setError("Iltimos, tasdiqlash kodini kiriting.");
      setLoading(false);
      return;
    }

    if (!/^\d{6}$/.test(verificationCode.trim())) {
      setError("Tasdiqlash kodi 6 xonali raqam bo'lishi kerak.");
      setLoading(false);
      return;
    }

    try {
      const { role, first_name, last_name, email, password, country } = registerForm;
      
      console.log("Attempting registration with data:", {
        role,
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        email: email.trim(),
        country: country.trim(),
        code: verificationCode.trim()
      });

      const registrationData = {
        role,
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        email: email.trim(),
        password,
        country: country.trim(),
        code: verificationCode.trim(),
      };

      const response = await registerUser(registrationData);
      
      console.log("Registration successful:", response);

      // Store tokens
      localStorage.setItem("access_token", response.access_token);
      localStorage.setItem("refresh_token", response.refresh_token);
      
      // Set user data
      const userData = {
        id: response.user.id,
        role: response.user.role,
        username: response.user.full_name,
        email: response.user.email,
        first_name: response.user.first_name,
        last_name: response.user.last_name,
        country: response.user.country || "",
        city: response.user.city || "",
      };

      setIsAuthenticated(true);
      setUser(userData);
      setSuccessMessage("Ro'yxatdan o'tish muvaffaqiyatli yakunlandi!");
      
      // Reset form
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
      
      // Navigate to account page
      setTimeout(() => {
        navigate("/account");
      }, 1000);
      
    } catch (error) {
      console.error("Registration error:", error);
      
      let errorMsg = "Ro'yxatdan o'tishda xatolik yuz berdi.";
      
      if (error.message.includes("already exists") || error.message.includes("already")) {
        errorMsg = "Bu email allaqachon ro'yxatdan o'tgan. Iltimos, tizimga kiring.";
        setVerificationStep(false); // Go back to login
      } else if (error.message.includes("expired") || error.message.includes("tugagan")) {
        errorMsg = "Tasdiqlash kodi muddati tugagan. Iltimos, qaytadan kod so'rang.";
      } else if (error.message.includes("invalid") || error.message.includes("noto'g'ri")) {
        errorMsg = "Noto'g'ri tasdiqlash kodi. Iltimos, qaytadan kiriting.";
      } else if (error.message.includes("used")) {
        errorMsg = "Bu tasdiqlash kodi allaqachon ishlatilgan. Yangi kod so'rang.";
      } else if (error.message.includes("attempts")) {
        errorMsg = "Juda ko'p noto'g'ri urinish. Yangi kod so'rang.";
      } else {
        errorMsg = error.message || errorMsg;
      }
      
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (codeTimer > 0) {
      setError(`Yana ${Math.floor(codeTimer / 60)}:${(codeTimer % 60).toString().padStart(2, '0')} kutib turing.`);
      return;
    }

    setError("");
    setSuccessMessage("");
    setLoading(true);
    
    try {
      console.log("Resending verification code for:", registerForm.email);
      
      await requestCode({ 
        email: registerForm.email.trim(),
        code_type: "registration" 
      });
      
      setSuccessMessage("Yangi tasdiqlash kodi emailingizga yuborildi.");
      setCodeTimer(300); // Reset timer to 5 minutes
      setVerificationCode(""); // Clear previous code
      
    } catch (error) {
      console.error("Error resending code:", error);
      setError(error.message || "Kod qayta yuborishda xatolik yuz berdi.");
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = (provider) => {
    alert(`Login with ${provider} is not implemented yet.`);
  };

  const closeModal = () => {
    navigate(-1);
    setVerificationStep(false);
    setCountrySuggestions([]);
    setError("");
    setSuccessMessage("");
    setVerificationCode("");
    setCodeTimer(0);
  };

  const goBackToRegistration = () => {
    setVerificationStep(false);
    setVerificationCode("");
    setError("");
    setSuccessMessage("");
    setCodeTimer(0);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="auth-overlay" onClick={closeModal} role="dialog" aria-labelledby="auth-title" aria-modal="true">
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <button className="auth-close-btn" onClick={closeModal} aria-label="Close authentication modal">
          <FiX />
        </button>
        
        {!verificationStep && (
          <div className="auth-tabs">
            <button
              className={`auth-tab ${activeTab === "login" ? "auth-tab-active" : ""}`}
              onClick={() => setActiveTab("login")}
              aria-selected={activeTab === "login"}
            >
              Sign In
            </button>
            <button
              className={`auth-tab ${activeTab === "register" ? "auth-tab-active" : ""}`}
              onClick={() => setActiveTab("register")}
              aria-selected={activeTab === "register"}
            >
              Register
            </button>
          </div>
        )}

        {error && <p className="auth-error" role="alert">{error}</p>}
        {successMessage && <p className="auth-success" role="alert">{successMessage}</p>}
        
        {loading && (
          <div className="auth-loading">
            <div className="spinner"></div> Yuklanmoqda...
          </div>
        )}

        {verificationStep ? (
          <div className="auth-content">
            <h2 id="auth-title">Email Tasdiqlash</h2>
            <div className="verification-info">
              <p>
                Tasdiqlash kodi <strong>{registerForm.email}</strong> manziliga yuborildi.
              </p>
              <p>6 xonali kodni quyidagi maydonga kiriting:</p>
            </div>

            <form className="auth-form" onSubmit={handleVerifyCode}>
              <div className="auth-form-group">
                <label htmlFor="verification-code">
                  <FiCheck /> Tasdiqlash Kodi
                </label>
                <input
                  id="verification-code"
                  type="text"
                  value={verificationCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
                    setVerificationCode(value);
                  }}
                  placeholder="000000"
                  className="auth-input verification-input"
                  aria-required="true"
                  autoFocus
                  maxLength="6"
                  disabled={loading}
                  style={{ textAlign: 'center', fontSize: '18px', letterSpacing: '4px' }}
                />
              </div>

              <button type="submit" className="auth-submit-btn" disabled={loading || !verificationCode || verificationCode.length !== 6}>
                <FiCheck /> Tasdiqlash
              </button>

              <div className="auth-verification-actions">
                {codeTimer > 0 ? (
                  <p className="resend-timer">
                    Qayta yuborish uchun {formatTime(codeTimer)} kutib turing
                  </p>
                ) : (
                  <button
                    type="button"
                    className="auth-resend-btn"
                    onClick={handleResendCode}
                    disabled={loading}
                  >
                    Kodni Qayta Yuborish
                  </button>
                )}

                <button
                  type="button"
                  className="auth-back-btn"
                  onClick={goBackToRegistration}
                  disabled={loading}
                >
                  ← Orqaga qaytish
                </button>
              </div>
            </form>
          </div>
        ) : activeTab === "login" ? (
          <div className="auth-content">
            <h2 id="auth-title">Sign In to TravMatch</h2>
            <form className="auth-form" onSubmit={handleLoginSubmit}>
              <div className="auth-form-group">
                <label htmlFor="login-email">
                  <FiMail /> Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  name="email"
                  value={loginForm.email}
                  onChange={handleLoginChange}
                  placeholder="Enter your email"
                  className="auth-input"
                  aria-required="true"
                  disabled={loading}
                />
              </div>
              <div className="auth-form-group">
                <label htmlFor="login-password">
                  <FiLock /> Password
                </label>
                <div className="password-container">
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={loginForm.password}
                    onChange={handleLoginChange}
                    placeholder="Enter your password"
                    className="auth-input"
                    aria-required="true"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={toggleShowPassword}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>
              <button type="submit" className="auth-submit-btn" disabled={loading}>
                <FiLogIn /> Sign In
              </button>
            </form>
            <div className="auth-social">
              <button className="auth-social-btn" onClick={() => handleSocialLogin("Google")} disabled={loading}>
                <FcGoogle /> Google
              </button>
              <button className="auth-social-btn" onClick={() => handleSocialLogin("Facebook")} disabled={loading}>
                <FaFacebook /> Facebook
              </button>
            </div>
          </div>
        ) : (
          <div className="auth-content">
            <h2 id="auth-title">Create Your TravMatch Account</h2>
            <form className="auth-form" onSubmit={handleRegisterSubmit}>
              <div className="auth-form-group">
                <label htmlFor="register-role">
                  <FiUser /> Role
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
                  <option value="Client">Client (Mijoz)</option>
                  <option value="Guide">Guide (Gid)</option>
                </select>
              </div>
              <div className="auth-name-grid">
                <div className="auth-form-group">
                  <label htmlFor="register-first_name">
                    <FiUser /> First Name *
                  </label>
                  <input
                    id="register-first_name"
                    type="text"
                    name="first_name"
                    value={registerForm.first_name}
                    onChange={handleRegisterChange}
                    placeholder="Enter your first name"
                    className="auth-input"
                    aria-required="true"
                    disabled={loading}
                  />
                </div>
                <div className="auth-form-group">
                  <label htmlFor="register-last_name">
                    <FiUser /> Last Name *
                  </label>
                  <input
                    id="register-last_name"
                    type="text"
                    name="last_name"
                    value={registerForm.last_name}
                    onChange={handleRegisterChange}
                    placeholder="Enter your last name"
                    className="auth-input"
                    aria-required="true"
                    disabled={loading}
                  />
                </div>
              </div>
              <div className="auth-form-group">
                <label htmlFor="register-email">
                  <FiMail /> Email *
                </label>
                <input
                  id="register-email"
                  type="email"
                  name="email"
                  value={registerForm.email}
                  onChange={handleRegisterChange}
                  placeholder="Enter your email"
                  className="auth-input"
                  aria-required="true"
                  disabled={loading}
                />
              </div>
              <div className="auth-form-group">
                <label htmlFor="register-password">
                  <FiLock /> Password *
                </label>
                <div className="password-container">
                  <input
                    id="register-password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={registerForm.password}
                    onChange={handleRegisterChange}
                    placeholder="Enter your password"
                    className="auth-input"
                    aria-required="true"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={toggleShowPassword}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>
              <div className="auth-form-group">
                <label htmlFor="register-confirm_password">
                  <FiLock /> Confirm Password *
                </label>
                <div className="password-container">
                  <input
                    id="register-confirm_password"
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirm_password"
                    value={registerForm.confirm_password}
                    onChange={handleRegisterChange}
                    placeholder="Confirm your password"
                    className="auth-input"
                    aria-required="true"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={toggleShowConfirmPassword}
                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  >
                    {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>
              <div className="auth-form-group">
                <label htmlFor="register-country">
                  <FiGlobe /> Country *
                </label>
                <input
                  id="register-country"
                  type="text"
                  name="country"
                  value={registerForm.country}
                  onChange={handleRegisterChange}
                  placeholder="Enter your country"
                  className="auth-input"
                  ref={countryInputRef}
                  aria-required="true"
                  disabled={loading}
                />
                {countrySuggestions.length > 0 && (
                  <ul className="country-suggestions">
                    {countrySuggestions.map((country, index) => (
                      <li key={index} onClick={() => handleCountrySelect(country)} role="option" aria-selected="false">
                        {country}
                      </li>
                    ))}
                  </ul>
                )}
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
                  />
                  {checkboxes.personalData ? <FiCheckSquare /> : <FiSquare />}
                  Shaxsiy ma'lumotlarni qayta ishlashga roziman. *
                </label>
                <label className="auth-checkbox-label">
                  <input
                    type="checkbox"
                    name="terms"
                    checked={checkboxes.terms}
                    onChange={handleCheckboxChange}
                    aria-required="true"
                    disabled={loading}
                  />
                  {checkboxes.terms ? <FiCheckSquare /> : <FiSquare />}
                  TravMatch shartlariga roziman. *
                </label>
                <label className="auth-checkbox-label">
                  <input
                    type="checkbox"
                    name="travelTips"
                    checked={checkboxes.travelTips}
                    onChange={handleCheckboxChange}
                    disabled={loading}
                  />
                  {checkboxes.travelTips ? <FiCheckSquare /> : <FiSquare />}
                  Sayohat maslahatlari va aksiyalarni olishga roziman.
                </label>
              </div>
              <button type="submit" className="auth-submit-btn" disabled={loading}>
                <FiLogIn /> Register
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default Authentication;