import React from 'react';
import { 
  FiGlobe, 
  FiMail, 
  FiPhone, 
  FiMapPin,
  FiFacebook,
  FiTwitter,
  FiInstagram,
  FiLinkedin,
  FiYoutube,
  FiArrowRight,
  FiDownload,
  FiShield,
  FiHeart
} from 'react-icons/fi';
import './Footer.css';

const Footer = () => {
  const footerLinks = {
    platform: [
      { label: 'How it Works', href: '#how' },
      { label: 'Find a Guide', href: '#find' },
      { label: 'Become a Guide', href: '#become' },
      { label: 'Safety & Trust', href: '#safety' },
      { label: 'Pricing', href: '#pricing' }
    ],
    support: [
      { label: 'Help Center', href: '#help' },
      { label: 'Contact Us', href: '#contact' },
      { label: 'FAQs', href: '#faq' },
      { label: 'Dispute Center', href: '#dispute' },
      { label: 'Report Issue', href: '#report' }
    ],
    legal: [
      { label: 'Terms of Service', href: '#terms' },
      { label: 'Privacy Policy', href: '#privacy' },
      { label: 'Cookie Policy', href: '#cookies' },
      { label: 'Community Guidelines', href: '#guidelines' },
      { label: 'GDPR Compliance', href: '#gdpr' }
    ],
    company: [
      { label: 'About Us', href: '#about' },
      { label: 'Careers', href: '#careers' },
      { label: 'Press Kit', href: '#press' },
      { label: 'Blog', href: '#blog' },
      { label: 'Investors', href: '#investors' }
    ]
  };

  const socialLinks = [
    { icon: <FiFacebook />, href: '#facebook', label: 'Facebook' },
    { icon: <FiTwitter />, href: '#twitter', label: 'Twitter' },
    { icon: <FiInstagram />, href: '#instagram', label: 'Instagram' },
    { icon: <FiLinkedin />, href: '#linkedin', label: 'LinkedIn' },
    { icon: <FiYoutube />, href: '#youtube', label: 'YouTube' }
  ];

  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer-main">
      {/* Newsletter Section */}
      {/* <section className="footer-newsletter-section">
        <div className="footer-newsletter-content">
          <div className="footer-newsletter-text">
            <h3>Stay Connected</h3>
            <p>Subscribe to our newsletter for travel tips, exclusive offers, and updates.</p>
          </div>
          <form className="footer-newsletter-form">
            <div className="footer-email-input-group">
              <FiMail className="footer-email-icon" />
              <input
                type="email"
                placeholder="Enter your email"
                className="footer-email-input"
                aria-label="Email for newsletter"
              />
              <button type="submit" className="footer-subscribe-btn">
                Subscribe
                <FiArrowRight />
              </button>
            </div>
            <div className="footer-newsletter-privacy">
              <FiShield className="footer-privacy-icon" />
              <span>We respect your privacy</span>
            </div>
          </form>
        </div>
      </section> */}

      {/* Main Footer Content */}
      <div className="footer-content">
        <div className="footer-container">
          {/* Company Info */}
          <div className="footer-section footer-company-info">
            <div className="footer-logo">
              <div className="footer-logo-icon">
                <FiGlobe />
              </div>
              <span className="footer-logo-text">TravMatch</span>
            </div>
            
            <p className="footer-company-description">
              Connecting travelers with trusted local guides worldwide. 
              Experience authentic travel with verified professionals in over 150 countries.
            </p>
            
            <div className="footer-contact-info">
              <div className="footer-contact-item">
                <FiMapPin />
                <span>Tashkent, Uzbekistan</span>
              </div>
              <div className="footer-contact-item">
                <FiMail />
                <span>hello@travmatch.com</span>
              </div>
              <div className="footer-contact-item">
                <FiPhone />
                <span>+998 (90) 123-45-67</span>
              </div>
            </div>

            <div className="footer-social-links">
              {socialLinks.map((social, index) => (
                <a 
                  key={index} 
                  href={social.href} 
                  className="footer-social-link"
                  aria-label={social.label}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Footer Links */}
          <div className="footer-section">
            <h4 className="footer-title">Platform</h4>
            <ul className="footer-links">
              {footerLinks.platform.map((link, index) => (
                <li key={index}>
                  <a href={link.href} className="footer-link">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer-section">
            <h4 className="footer-title">Support</h4>
            <ul className="footer-links">
              {footerLinks.support.map((link, index) => (
                <li key={index}>
                  <a href={link.href} className="footer-link">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer-section">
            <h4 className="footer-title">Legal</h4>
            <ul className="footer-links">
              {footerLinks.legal.map((link, index) => (
                <li key={index}>
                  <a href={link.href} className="footer-link">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer-section">
            <h4 className="footer-title">Company</h4>
            <ul className="footer-links">
              {footerLinks.company.map((link, index) => (
                <li key={index}>
                  <a href={link.href} className="footer-link">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Mobile App Section */}
          <div className="footer-section footer-app-section">
            <h4 className="footer-title">Get the App</h4>
            <p className="footer-app-description">Download our mobile app for better experience</p>
            
            <div className="footer-app-buttons">
              <button className="footer-app-btn footer-ios">
                <FiDownload />
                <div className="footer-app-btn-text">
                  <span className="footer-app-label">Download on the</span>
                  <span className="footer-app-store">App Store</span>
                </div>
              </button>
              
              <button className="footer-app-btn footer-android">
                <FiDownload />
                <div className="footer-app-btn-text">
                  <span className="footer-app-label">Get it on</span>
                  <span className="footer-app-store">Google Play</span>
                </div>
              </button>
            </div>

            <div className="footer-trust-badges">
              <div className="footer-trust-badge">
                <FiShield />
                <span>SSL Secured</span>
              </div>
              <div className="footer-trust-badge">
                <FiShield />
                <span>GDPR Compliant</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Bottom */}
      <div className="footer-bottom">
        <div className="footer-bottom-content">
          <div className="footer-copyright">
            <p>
              © {currentYear} TravMatch. All rights reserved.
            </p>
          </div>
          
          <div className="footer-bottom-links">
            <a href="#terms" className="footer-bottom-link">Terms</a>
            <a href="#privacy" className="footer-bottom-link">Privacy</a>
            <a href="#cookies" className="footer-bottom-link">Cookies</a>
            <a href="#accessibility" className="footer-bottom-link">Accessibility</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;