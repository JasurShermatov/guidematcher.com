import React from "react";
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
    FiDownload,
    FiShield,
} from "react-icons/fi";
import { useTranslation } from "react-i18next";
import "./Footer.css";

const Footer = () => {
    const { t, i18n } = useTranslation("translation");

    // Debugging: Log current language and translations
    React.useEffect(() => {
        console.log("Footer language:", i18n.language);
        console.log("Footer translations:", i18n.getResourceBundle(i18n.language, "translation")?.footer);
    }, [i18n.language]);

    const socialLinks = [
        { icon: <FiFacebook />, href: "#facebook", label: t("footer.social.facebook", { defaultValue: "Facebook" }) },
        { icon: <FiTwitter />, href: "#twitter", label: t("footer.social.twitter", { defaultValue: "Twitter" }) },
        { icon: <FiInstagram />, href: "#instagram", label: t("footer.social.instagram", { defaultValue: "Instagram" }) },
        { icon: <FiLinkedin />, href: "#linkedin", label: t("footer.social.linkedin", { defaultValue: "LinkedIn" }) },
        { icon: <FiYoutube />, href: "#youtube", label: t("footer.social.youtube", { defaultValue: "YouTube" }) },
    ];

    const currentYear = new Date().getFullYear();

    return (
        <footer className="footer-main">
            {/* Main Footer Content */}
            <div className="footer-content">
                <div className="footer-container">
                    {/* Company Info */}
                    <div className="footer-section footer-company-info">
                        <div className="footer-logo">
                            <div className="footer-logo-icon">
                                <FiGlobe />
                            </div>
                            <span className="footer-logo-text">{t("footer.logo_text", { defaultValue: "TourGuide" })}</span>
                        </div>

                        <p className="footer-company-description">
                            {t("footer.company_description", {
                                defaultValue: "Your trusted platform for finding the best travel guides and experiences worldwide.",
                            })}
                        </p>

                        <div className="footer-contact-info">
                            <div className="footer-contact-item">
                                <FiMapPin />
                                <span>{t("footer.contact.address", { defaultValue: "123 Travel St, Global City, World" })}</span>
                            </div>
                            <div className="footer-contact-item">
                                <FiMail />
                                <span>{t("footer.contact.email", { defaultValue: "support@tourguide.com" })}</span>
                            </div>
                            <div className="footer-contact-item">
                                <FiPhone />
                                <span>{t("footer.contact.phone", { defaultValue: "+1-800-123-4567" })}</span>
                            </div>
                        </div>

                        <div className="footer-social-links">
                            {socialLinks.map((social, index) => (
                                <a key={index} href={social.href} className="footer-social-link" aria-label={social.label}>
                                    {social.icon}
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Mobile App Section */}
                    <div className="footer-section footer-app-section">
                        <h4 className="footer-title">{t("footer.app.title", { defaultValue: "Get Our App" })}</h4>
                        <p className="footer-app-description">
                            {t("footer.app.description", { defaultValue: "Download our app to explore destinations and book guides on the go." })}
                        </p>

                        <div className="footer-app-buttons">
                            <button className="footer-app-btn footer-ios">
                                <FiDownload />
                                <div className="footer-app-btn-text">
                                    <span className="footer-app-label">{t("footer.app.download_label", { defaultValue: "Download on the" })}</span>
                                    <span className="footer-app-store">{t("footer.app.app_store", { defaultValue: "App Store" })}</span>
                                </div>
                            </button>

                            <button className="footer-app-btn footer-android">
                                <FiDownload />
                                <div className="footer-app-btn-text">
                                    <span className="footer-app-label">{t("footer.app.get_it_on", { defaultValue: "Get it on" })}</span>
                                    <span className="footer-app-store">{t("footer.app.google_play", { defaultValue: "Google Play" })}</span>
                                </div>
                            </button>
                        </div>

                        <div className="footer-trust-badges">
                            <div className="footer-trust-badge">
                                <FiShield />
                                <span>{t("footer.trust.ssl_secure", { defaultValue: "SSL Secure" })}</span>
                            </div>
                            <div className="footer-trust-badge">
                                <FiShield />
                                <span>{t("footer.trust.gdpr_compliant", { defaultValue: "GDPR Compliant" })}</span>
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
                            {t("footer.copyright", { year: currentYear, defaultValue: `© ${currentYear} TourGuide. All rights reserved.` })}
                        </p>
                    </div>

                    <div className="footer-bottom-links">
                        <a href="#terms" className="footer-bottom-link">
                            {t("footer.links.terms", { defaultValue: "Terms of Service" })}
                        </a>
                        <a href="#privacy" className="footer-bottom-link">
                            {t("footer.links.privacy", { defaultValue: "Privacy Policy" })}
                        </a>
                        <a href="#cookies" className="footer-bottom-link">
                            {t("footer.links.cookies", { defaultValue: "Cookies" })}
                        </a>
                        <a href="#accessibility" className="footer-bottom-link">
                            {t("footer.links.accessibility", { defaultValue: "Accessibility" })}
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;