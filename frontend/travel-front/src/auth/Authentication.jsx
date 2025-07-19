import React, { useState, useEffect } from 'react';
import { FiX, FiMail, FiLock, FiUser, FiLogIn, FiCheckSquare, FiSquare, FiGlobe, FiMapPin } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import { FaFacebook } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import './Authentication.css';

const Authentication = ({ setIsAuthenticated, setUser }) => {
  const [activeTab, setActiveTab] = useState('login');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    role: 'Client',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    country: '',
    city: ''
  });
  const [checkboxes, setCheckboxes] = useState({
    personalData: false,
    terms: false,
    travelTips: false
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLoginChange = (e) => {
    setLoginForm({ ...loginForm, [e.target.name]: e.target.value });
    setError('');
  };

  const handleRegisterChange = (e) => {
    setRegisterForm({ ...registerForm, [e.target.name]: e.target.value });
    setError('');
  };

  const handleCheckboxChange = (e) => {
    setCheckboxes({ ...checkboxes, [e.target.name]: e.target.checked });
    setError('');
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (!loginForm.email || !loginForm.password) {
      setError('Please fill in all fields');
      return;
    }
    setTimeout(() => {
      if (loginForm.email === 'user123@gmail.com' && loginForm.password === '123') {
        setIsAuthenticated(true);
        setUser({ email: 'user123@gmail.com', username: 'Client User', role: 'Client' });
        navigate('/account');
      } else if (loginForm.email === 'git321@gmail.com' && loginForm.password === '321') {
        setIsAuthenticated(true);
        setUser({
          email: 'git321@gmail.com',
          username: 'Guide User',
          role: 'Customer',
          firstName: 'Ali',
          lastName: 'Valiyev',
          country: 'Uzbekistan',
          city: 'Tashkent'
        });
        navigate('/account');
      } else {
        setError('Invalid email or password');
      }
    }, 500);
  };

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    const { role, firstName, lastName, email, password, confirmPassword, country, city } = registerForm;
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      setError('Please fill in all required fields');
      return;
    }
    if (role === 'Customer' && (!country || !city)) {
      setError('Please fill in country and city');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!checkboxes.personalData || !checkboxes.terms) {
      setError('You must agree to the personal data processing and terms');
      return;
    }
    // Mock registration
    setTimeout(() => {
      setActiveTab('login');
      setLoginForm({ email, password });
      setRegisterForm({
        role: 'Client',
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        country: '',
        city: ''
      });
      setCheckboxes({ personalData: false, terms: false, travelTips: false });
      setError('');
      alert('Registration successful! Please log in.');
    }, 500);
  };

  const handleSocialLogin = (provider) => {
    alert(`Login with ${provider} is not implemented yet.`);
  };

  const closeModal = () => {
    navigate(-1);
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
              <button type="submit" className="auth-submit-btn">
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
                  <label htmlFor="register-firstName">
                    <FiUser /> First Name
                  </label>
                  <input
                    id="register-firstName"
                    type="text"
                    name="firstName"
                    value={registerForm.firstName}
                    onChange={handleRegisterChange}
                    placeholder="Enter your first name"
                    className="auth-input"
                    aria-required="true"
                  />
                </div>
                <div className="auth-form-group">
                  <label htmlFor="register-lastName">
                    <FiUser /> Last Name
                  </label>
                  <input
                    id="register-lastName"
                    type="text"
                    name="lastName"
                    value={registerForm.lastName}
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
                <label htmlFor="register-confirm-password">
                  <FiLock /> Confirm Password
                </label>
                <input
                  id="register-confirm-password"
                  type="password"
                  name="confirmPassword"
                  value={registerForm.confirmPassword}
                  onChange={handleRegisterChange}
                  placeholder="Confirm your password"
                  className="auth-input"
                  aria-required="true"
                />
              </div>
              {registerForm.role === 'Customer' && (
                <div className="auth-location-grid">
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
                      aria-required="true"
                    />
                  </div>
                  <div className="auth-form-group">
                    <label htmlFor="register-city">
                      <FiMapPin /> City
                    </label>
                    <input
                      id="register-city"
                      type="text"
                      name="city"
                      value={registerForm.city}
                      onChange={handleRegisterChange}
                      placeholder="Enter your city"
                      className="auth-input"
                      aria-required="true"
                    />
                  </div>
                </div>
              )}
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
              <button type="submit" className="auth-submit-btn">
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