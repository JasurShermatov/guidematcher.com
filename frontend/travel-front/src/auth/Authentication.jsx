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
          "Parol kamida 8 belgidan iborat bo‘lishi, katta harf, kichik harf, raqam va maxsus belgi (@$!%*?&) o‘z ichiga olishi kerak."
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
      setError("Iltimos, barcha maydonlarni to‘ldiring.");
      setLoading(false);
      return;
    }

    if (!passwordRegex.test(loginForm.password)) {
      setError(
        "Parol kamida 8 belgidan iborat bo‘lishi, katta harf, kichik harf, raqam va maxsus belgi (@$!%*?&) o‘z ichiga olishi kerak."
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

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setLoading(true);

    const { role, first_name, last_name, email, password, confirm_password, country } = registerForm;

    if (!first_name || !last_name || !email || !password || !confirm_password || !country) {
      setError("Iltimos, barcha majburiy maydonlarni to‘ldiring.");
      setLoading(false);
      return;
    }

    if (password !== confirm_password) {
      setError("Parollar mos kelmadi.");
      setLoading(false);
      return;
    }

    if (!passwordRegex.test(password)) {
      setError(
        "Parol kamida 8 belgidan iborat bo‘lishi, katta harf, kichik harf, raqam va maxsus belgi (@$!%*?&) o‘z ichiga olishi kerak."
      );
      setLoading(false);
      return;
    }

    if (!checkboxes.personalData || !checkboxes.terms) {
      setError("Shaxsiy ma‘lumotlarni qayta ishlash va shartlarga rozilik berishingiz kerak.");
      setLoading(false);
      return;
    }

    try {
      console.log("Sending requestCode with:", { email });
      await requestCode({ email });
      setSuccessMessage("Tasdiqlash kodi emailingizga yuborildi.");
      setVerificationStep(true);
      setLoading(false); // Loading holatini o'chirish
    } catch (error) {
      const errorMsg = error.message.includes("already exists")
        ? "Bu email allaqachon ro'yxatdan o'tgan. Iltimos, boshqa email ishlating yoki tizimga kiring."
        : error.message || "Kod so‘rovida xatolik yuz berdi.";
      setError(errorMsg);
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setLoading(true);

    if (!verificationCode) {
      setError("Iltimos, tasdiqlash kodini kiriting.");
      setLoading(false);
      return;
    }

    if (!/^\d{6}$/.test(verificationCode)) {
      setError("Tasdiqlash kodi 6 xonali raqam bo‘lishi kerak.");
      setLoading(false);
      return;
    }

    const { role, first_name, last_name, email, password, country } = registerForm;
    if (!country || country.trim() === "") {
      setError("Iltimos, mamlakatni tanlang.");
      setLoading(false);
      return;
    }

    try {
      console.log("Verifying code with payload:", { role, first_name, last_name, email, password, country, code: verificationCode });
      const response = await registerUser({
        role,
        first_name,
        last_name,
        email,
        password,
        country,
        code: verificationCode,
      });
      localStorage.setItem("access_token", response.access_token);
      localStorage.setItem("refresh_token", response.refresh_token);
      setIsAuthenticated(true);
      setUser({
        id: response.user.id,
        role: response.user.role,
        username: response.user.full_name,
        email: response.user.email,
        first_name: response.user.first_name,
        last_name: response.user.last_name,
        country: response.user.country || "",
        city: "",
      });
      setSuccessMessage("Ro‘yxatdan o‘tish muvaffaqiyatli!");
      navigate("/account");
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
    } catch (error) {
      const errorMsg = error.message.includes("already exists")
        ? "Bu email allaqachon ro'yxatdan o'tgan. Iltimos, tizimga kiring."
        : error.message.includes("expired")
        ? "Tasdiqlash kodi muddati tugagan. Iltimos, qaytadan kod so‘rang."
        : error.message.includes("invalid")
        ? "Noto‘g‘ri tasdiqlash kodi. Iltimos, tekshiring."
        : error.message || "Ro‘yxatdan o‘tishda xatolik yuz berdi.";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError("");
    setSuccessMessage("");
    setLoading(true);
    try {
      await requestCode({ email: registerForm.email });
      setSuccessMessage("Yangi tasdiqlash kodi emailingizga yuborildi.");
    } catch (error) {
      setError("Kod qayta yuborishda xatolik yuz berdi.");
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
        <button className="auth-close-btn" onClick={closeModal} aria-label="Close authentication modal">
          <FiX />
        </button>
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
        {error && <p className="auth-error" role="alert">{error}</p>}
        {successMessage && <p className="auth-success" role="alert">{successMessage}</p>}
        {loading && (
          <div className="auth-loading">
            <div className="spinner"></div> Yuklanmoqda...
          </div>
        )}
        {activeTab === "login" ? (
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
            {!verificationStep ? (
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
                    <option value="Customer">Customer (Xizmat ko‘rsatuvchi)</option>
                  </select>
                </div>
                <div className="auth-name-grid">
                  <div className="auth-form-group">
                    <label htmlFor="register-first_name">
                      <FiUser /> First Name
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
                      <FiUser /> Last Name
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
                    <FiMail /> Email
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
                    <FiLock /> Password
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
                    <FiLock /> Confirm Password
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
                    <FiGlobe /> Country
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
                    Shaxsiy ma‘lumotlarni qayta ishlashga roziman.
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
                    TravMatch shartlariga roziman.
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
            ) : (
              <form className="auth-form" onSubmit={handleVerifyCode}>
                <h3>Email Tasdiqlash</h3>
                <p>Iltimos, emailingizga ({registerForm.email}) yuborilgan 6 xonali tasdiqlash kodini kiriting.</p>
                <div className="auth-form-group">
                  <label htmlFor="verification-code">
                    <FiCheck /> Tasdiqlash Kodi
                  </label>
                  <input
                    id="verification-code"
                    type="number"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.slice(0, 6))}
                    placeholder="6 xonali kodni kiriting"
                    className="auth-input"
                    aria-required="true"
                    autoFocus
                    maxLength="6"
                    disabled={loading}
                  />
                </div>
                <button type="submit" className="auth-submit-btn" disabled={loading}>
                  <FiCheck /> Tasdiqlash
                </button>
                <button
                  type="button"
                  className="auth-resend-btn"
                  onClick={handleResendCode}
                  disabled={loading}
                >
                  Kodi Qayta Yuborish
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Authentication;