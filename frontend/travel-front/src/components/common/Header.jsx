import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
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
  FiLogOut
} from 'react-icons/fi';
import { logoutUser } from '../../api/api'; // API'dan logoutUser import qilindi
import './Header.css';

const Header = ({ isAuthenticated, setIsAuthenticated, user, setUser }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [theme, setTheme] = useState('default');
  const [language, setLanguage] = useState('en');
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
    { value: 'light', label: 'Light Mode', icon: <FiSun />, description: 'Bright and clean' },
    { value: 'dark', label: 'Dark Mode', icon: <FiMoon />, description: 'Sleek and modern' },
    { value: 'default', label: 'System', icon: <FiMonitor />, description: 'Matches your device' },
    { value: 'auto', label: 'Auto Time', icon: <FiClock />, description: 'Time-based theme' }
  ];

  const languageOptions = [
    { value: 'en', label: 'English', nativeName: 'English', flag: '🇺🇸', dir: 'ltr' },
    { value: 'ru', label: 'Russian', nativeName: 'Русский', flag: '🇷🇺', dir: 'ltr' },
    { value: 'uz', label: 'Uzbek', nativeName: "O'zbek", flag: '🇺🇿', dir: 'ltr' },
    { value: 'es', label: 'Spanish', nativeName: 'Español', flag: '🇪🇸', dir: 'ltr' },
    { value: 'ar', label: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', dir: 'rtl' }
  ];

  const currentLang = languageOptions.find(lang => lang.value === language);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const updateTheme = () => {
      if (theme === 'auto') {
        const hour = new Date().getHours();
        root.setAttribute('data-theme', hour >= 6 && hour < 18 ? 'light' : 'dark');
      } else if (theme === 'default') {
        root.setAttribute('data-theme', window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      } else {
        root.setAttribute('data-theme', theme);
      }
    };

    updateTheme();

    if (theme === 'auto') {
      const interval = setInterval(updateTheme, 60000);
      return () => clearInterval(interval);
    }

    if (theme === 'default') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e) => root.setAttribute('data-theme', e.matches ? 'dark' : 'light');
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
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
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
        setIsThemeDropdownOpen(false);
        setIsLangDropdownOpen(false);
        setIsAvatarDropdownOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, []);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    setIsThemeDropdownOpen(false);
  };

  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    setIsLangDropdownOpen(false);
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      setIsAuthenticated(false);
      setUser(null);
      setIsAvatarDropdownOpen(false);
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error.message);
      setIsAuthenticated(false);
      setUser(null);
      setIsAvatarDropdownOpen(false);
      navigate('/');
    }
  };

  const menuItems = [
    { label: 'Find Guides', href: '/find-guides' },
    { label: 'Blog', href: '#blog' }
  ];

  const hideMenu = isAuthenticated && location.pathname === '/account';
  const logoDestination = isAuthenticated ? '/account' : '/';

  return (
    <header className={`header-main ${isScrolled ? 'header-scrolled' : ''}`}>
      <div className="header-container">
        <div className="header-logo-section">
          <Link to={logoDestination} className="header-logo">
            <div className="header-logo-icon">
              <FiGlobe />
              <div className="header-logo-glow"></div>
            </div>
            <div className="header-logo-text-container">
              <span className="header-logo-text">TravMatch</span>
              <span className="header-logo-tagline">Explore with Locals</span>
            </div>
          </Link>
        </div>

        {!hideMenu && (
          <nav className="header-nav">
            <ul className="header-nav-list">
              {menuItems.map((item, index) => (
                <li key={index} className="header-nav-item">
                  {item.href.startsWith('/') ? (
                    <Link to={item.href} className="header-nav-link">{item.label}</Link>
                  ) : (
                    <a href={item.href} className="header-nav-link">{item.label}</a>
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
              aria-label="Select language"
              aria-expanded={isLangDropdownOpen}
            >
              <span className="header-flag">{currentLang?.flag}</span>
              <span className="header-lang-code">{language.toUpperCase()}</span>
              <FiChevronDown className={`header-dropdown-arrow ${isLangDropdownOpen ? 'header-open' : ''}`} />
            </button>
            {isLangDropdownOpen && (
              <div className="header-dropdown-menu header-lang-menu">
                <div className="header-dropdown-header">Select Language</div>
                {languageOptions.map(option => (
                  <button
                    key={option.value}
                    className={`header-dropdown-item ${language === option.value ? 'header-active' : ''}`}
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
              aria-label="Select theme"
              aria-expanded={isThemeDropdownOpen}
            >
              {themeOptions.find(opt => opt.value === theme)?.icon}
              <FiChevronDown className={`header-dropdown-arrow ${isThemeDropdownOpen ? 'header-open' : ''}`} />
            </button>
            {isThemeDropdownOpen && (
              <div className="header-dropdown-menu header-theme-menu">
                <div className="header-dropdown-header">Choose Appearance</div>
                {themeOptions.map(option => (
                  <button
                    key={option.value}
                    className={`header-dropdown-item ${theme === option.value ? 'header-active' : ''}`}
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
                aria-label="User account menu"
                aria-expanded={isAvatarDropdownOpen}
              >
                <span className="header-avatar">
                  {user?.username ? user.username[0].toUpperCase() : 'U'}
                </span>
                <span className="header-username">{user?.username || 'User'}</span>
                <FiChevronDown className={`header-dropdown-arrow ${isAvatarDropdownOpen ? 'header-open' : ''}`} />
              </button>
              {isAvatarDropdownOpen && (
                <div className="header-dropdown-menu header-avatar-menu">
                  <div className="header-dropdown-header">Account</div>
                  <button
                    className="header-dropdown-item"
                    onClick={handleLogout}
                  >
                    <FiLogOut className="header-theme-icon" />
                    <span className="header-theme-name">Logout</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="header-btn header-auth-btn header-signin-btn">
              <FiLogIn />
              <span>Sign In</span>
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
          <div className="header-mobile-menu" onClick={e => e.stopPropagation()}>
            <div className="header-mobile-menu-header">
              <div className="header-mobile-logo">
                <FiGlobe />
                <span>TravMatch</span>
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
                    to={item.href.startsWith('/') ? item.href : `#${item.href}`}
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
                <label>Theme</label>
                <div className="header-theme-buttons">
                  {themeOptions.map(option => (
                    <button
                      key={option.value}
                      className={`header-btn header-theme-option ${theme === option.value ? 'header-active' : ''}`}
                      onClick={() => handleThemeChange(option.value)}
                    >
                      {option.icon}
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="header-mobile-control-group">
                <label>Language</label>
                <div className="header-lang-buttons">
                  {languageOptions.map(option => (
                    <button
                      key={option.value}
                      className={`header-btn header-lang-option ${language === option.value ? 'header-active' : ''}`}
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
                  Logout
                </button>
              ) : (
                <>
                  <Link to="/register" className="header-btn header-mobile-auth-btn header-register-btn">Register</Link>
                  <Link to="/login" className="header-btn header-mobile-auth-btn header-signin-btn">Sign In</Link>
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