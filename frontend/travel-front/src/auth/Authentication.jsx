import React, { useState, useEffect, useRef } from 'react';
import { FiX, FiMail, FiLock, FiUser, FiLogIn, FiCheckSquare, FiSquare, FiGlobe, FiCheck } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import { FaFacebook } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { loginUser, requestCode, verifyCode } from '../api/api';
import './Authentication.css';

const Authentication = ({ setIsAuthenticated, setUser }) => {
  const [activeTab, setActiveTab] = useState('login');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    role: 'Client',
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    confirm_password: '',
    country: '',
  });
  const [verificationCode, setVerificationCode] = useState('');
  const [checkboxes, setCheckboxes] = useState({
    personalData: false,
    terms: false,
    travelTips: false,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationStep, setVerificationStep] = useState(false);
  const [countrySuggestions, setCountrySuggestions] = useState([]);
  const countryInputRef = useRef(null);
  const navigate = useNavigate();

  const countries = [
    'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda', 'Argentina', 'Armenia', 'Australia',
    'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin',
    'Bhutan', 'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi',
    'Cabo Verde', 'Cambodia', 'Cameroon', 'Canada', 'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia',
    'Comoros', 'Congo (Congo-Brazzaville)', 'Costa Rica', 'Croatia', 'Cuba', 'Cyprus', 'Czechia', 'Denmark', 'Djibouti',
    'Dominica', 'Dominican Republic', 'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia',
    'Eswatini', 'Ethiopia', 'Fiji', 'Finland', 'France', 'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece',
    'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana', 'Haiti', 'Honduras', 'Hungary', 'Iceland', 'India',
    'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya',
    'Kiribati', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein',
    'Lithuania', 'Luxembourg', 'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands',
    'Mauritania', 'Mauritius', 'Mexico', 'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco',
    'Mozambique', 'Myanmar', 'Namibia', 'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria',
    'North Korea', 'North Macedonia', 'Norway', 'Oman', 'Pakistan', 'Palau', 'Palestine', 'Panama', 'Papua New Guinea',
    'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia', 'Rwanda', 'Saint Kitts and Nevis',
    'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 'Sao Tome and Principe', 'Saudi Arabia',
    'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia',
    'South Africa', 'South Korea', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland',
    'Syria', 'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo', 'Tonga', 'Trinidad and Tobago',
    'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu', 'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom',
    'United States', 'Uruguay', 'Uzbekistan', 'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe'
  ];

  const handleLoginChange = (e) => {
    setLoginForm({ ...loginForm, [e.target.name]: e.target.value });
    setError('');
  };

  const handleRegisterChange = (e) => {
    const { name, value } = e.target;
    setRegisterForm({ ...registerForm, [name]: value });
    setError('');

    if (name === 'country') {
      const filteredSuggestions = countries.filter(country =>
        country.toLowerCase().startsWith(value.toLowerCase())
      ).slice(0, 5); // Maksimum 5 ta taklif
      setCountrySuggestions(filteredSuggestions);
    }
  };

  const handleCountrySelect = (country) => {
    setRegisterForm({ ...registerForm, country });
    setCountrySuggestions([]);
    if (countryInputRef.current) countryInputRef.current.focus();
  };

  const handleCheckboxChange = (e) => {
    setCheckboxes({ ...checkboxes, [e.target.name]: e.target.checked });
    setError('');
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!loginForm.email || !loginForm.password) {
      setError('Iltimos, barcha maydonlarni to‘ldiring');
      setLoading(false);
      return;
    }

    try {
      const data = await loginUser(loginForm);
      localStorage.setItem('access_token', data.access);
      localStorage.setItem('refresh_token', data.refresh);
      setIsAuthenticated(true);
      setUser({
        id: data.user.id,
        role: data.user.role,
        username: `${data.user.first_name} ${data.user.last_name}`,
        email: data.user.email,
        first_name: data.user.first_name,
        last_name: data.user.last_name,
        country: data.user.country || '',
        city: data.user.city || '',
      });
      navigate('/account');
    } catch (error) {
      setError(error.message || 'Email yoki parol noto‘g‘ri');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { role, first_name, last_name, email, password, confirm_password, country } = registerForm;

    if (!first_name || !last_name || !email || !password || !confirm_password) {
      setError('Iltimos, barcha majburiy maydonlarni to‘ldiring');
      setLoading(false);
      return;
    }
    if (password !== confirm_password) {
      setError('Parollar mos kelmadi');
      setLoading(false);
      return;
    }
    if (!checkboxes.personalData || !checkboxes.terms) {
      setError('Shaxsiy ma‘lumotlarni qayta ishlash va shartlarga rozilik berishingiz kerak');
      setLoading(false);
      return;
    }

    try {
      await requestCode(email);           // 1) e-mailga kod yuborish
      setVerificationStep(true);          // 2) verify step’iga o‘tish
    } catch (error) {
      setError(error.message || 'Ro‘yxatdan o‘tishda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!verificationCode) {
      setError('Iltimos, tasdiqlash kodini kiriting');
      setLoading(false);
      return;
    }

    try {
      await verifyCode({
        role: registerForm.role,
        first_name: registerForm.first_name,
        last_name: registerForm.last_name,
        email: registerForm.email,
        password: registerForm.password,
        country: registerForm.country,
        code: verificationCode,
      });
      setActiveTab('login');
      setLoginForm({ email: registerForm.email, password: registerForm.password });
      setRegisterForm({
        role: 'Client',
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        confirm_password: '',
        country: '',
      });
      setVerificationCode('');
      setCheckboxes({ personalData: false, terms: false, travelTips: false });
      setVerificationStep(false);
      alert('Tasdiqlash muvaffaqiyatli! Iltimos, tizimga kiring.');
    } catch (error) {
      setError(error.message || 'Tasdiqlash kodida xatolik yuz berdi');
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
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="auth-overlay" onClick={closeModal} role="dialog" aria-labelledby="auth-title" aria-modal="true">
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <button className="auth-close-btn" onClick={closeModal} aria-label="Close authentication modal">
          <FiX />
        </button>
        <div className="auth-tabs">
          <button
            className={`auth-tab ${activeTab === 'login' ? 'auth-tab-active' : ''}`}
            onClick={() => setActiveTab('login')}
            aria-selected={activeTab === 'login'}
          >
            Sign In
          </button>
          <button
            className={`auth-tab ${activeTab === 'register' ? 'auth-tab-active' : ''}`}
            onClick={() => setActiveTab('register')}
            aria-selected={activeTab === 'register'}
          >
            Register
          </button>
        </div>
        {error && <p className="auth-error" role="alert">{error}</p>}
        {loading && <p className="auth-loading">Yuklanmoqda...</p>}
        {activeTab === 'login' ? (
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
                />
              </div>
              <div className="auth-form-group">
                <label htmlFor="login-password">
                  <FiLock /> Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  name="password"
                  value={loginForm.password}
                  onChange={handleLoginChange}
                  placeholder="Enter your password"
                  className="auth-input"
                  aria-required="true"
                />
              </div>
              <button type="submit" className="auth-submit-btn" disabled={loading}>
                <FiLogIn /> Sign In
              </button>
            </form>
            <div className="auth-social">
              <button className="auth-social-btn" onClick={() => handleSocialLogin('Google')}>
                <FcGoogle /> Google
              </button>
              <button className="auth-social-btn" onClick={() => handleSocialLogin('Facebook')}>
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
                  >
                    <option value="Client">Client (Mijoz)</option>
                    <option value="Customer">Customer (Xizmat ko'rsatuvchi)</option>
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
                  />
                </div>
                <div className="auth-form-group">
                  <label htmlFor="register-password">
                    <FiLock /> Password
                  </label>
                  <input
                    id="register-password"
                    type="password"
                    name="password"
                    value={registerForm.password}
                    onChange={handleRegisterChange}
                    placeholder="Enter your password"
                    className="auth-input"
                    aria-required="true"
                  />
                </div>
                <div className="auth-form-group">
                  <label htmlFor="register-confirm_password">
                    <FiLock /> Confirm Password
                  </label>
                  <input
                    id="register-confirm_password"
                    type="password"
                    name="confirm_password"
                    value={registerForm.confirm_password}
                    onChange={handleRegisterChange}
                    placeholder="Confirm your password"
                    className="auth-input"
                    aria-required="true"
                  />
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
                  />
                  {countrySuggestions.length > 0 && (
                    <ul className="country-suggestions">
                      {countrySuggestions.map((country, index) => (
                        <li key={index} onClick={() => handleCountrySelect(country)}>
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
                    />
                    {checkboxes.personalData ? <FiCheckSquare /> : <FiSquare />}
                    I agree to the processing of my personal data.
                  </label>
                  <label className="auth-checkbox-label">
                    <input
                      type="checkbox"
                      name="terms"
                      checked={checkboxes.terms}
                      onChange={handleCheckboxChange}
                      aria-required="true"
                    />
                    {checkboxes.terms ? <FiCheckSquare /> : <FiSquare />}
                    I accept TravMatch's Terms and Conditions.
                  </label>
                  <label className="auth-checkbox-label">
                    <input
                      type="checkbox"
                      name="travelTips"
                      checked={checkboxes.travelTips}
                      onChange={handleCheckboxChange}
                    />
                    {checkboxes.travelTips ? <FiCheckSquare /> : <FiSquare />}
                    I agree to receive travel tips and promotions.
                  </label>
                </div>
                <button type="submit" className="auth-submit-btn" disabled={loading}>
                  <FiLogIn /> Register
                </button>
              </form>
            ) : (
              <form className="auth-form" onSubmit={handleVerifyCode}>
                <h3>Verify Your Email</h3>
                <p>Please check your email ({registerForm.email}) for the verification code.</p>
                <div className="auth-form-group">
                  <label htmlFor="verification-code">
                    <FiCheck /> Verification Code
                  </label>
                  <input
                    id="verification-code"
                    type="text"
                    name="verificationCode"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="Enter the code"
                    className="auth-input"
                    aria-required="true"
                  />
                </div>
                <button type="submit" className="auth-submit-btn" disabled={loading}>
                  <FiCheck /> Verify
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