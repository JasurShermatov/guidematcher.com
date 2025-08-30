import React from "react";
import { useTranslation } from "react-i18next";
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
} from "react-icons/fi";
import "./Footer.css";

const Footer = () => {
    const { t } = useTranslation();

    const socialLinks = [
        { icon: <FiFacebook />, href: "#facebook", label: t("footer.social.facebook") },
        { icon: <FiTwitter />, href: "#twitter", label: t("footer.social.twitter") },
        { icon: <FiInstagram />, href: "#instagram", label: t("footer.social.instagram") },
        { icon: <FiLinkedin />, href: "#linkedin", label: t("footer.social.linkedin") },
        { icon: <FiYoutube />, href: "#youtube", label: t("footer.social.youtube") },
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
                            <span className="footer-logo-text">{t("footer.company.logo")}</span>
                        </div>

                        <p className="footer-company-description">{t("footer.company.description")}</p>

                        <div className="footer-contact-info">
                            <div className="footer-contact-item">
                                <FiMapPin />
                                <span>{t("footer.company.contact.address")}</span>
                            </div>
                            <div className="footer-contact-item">
                                <FiMail />
                                <span>{t("footer.company.contact.email")}</span>
                            </div>
                            <div className="footer-contact-item">
                                <FiPhone />
                                <span>{t("footer.company.contact.phone")}</span>
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

                    {/* Mobile App Section */}
                    <div className="footer-section footer-app-section">
                        <h4 className="footer-title">{t("footer.app.title")}</h4>
                        <p className="footer-app-description">{t("footer.app.description")}</p>

                        <div className="footer-app-buttons">
                            <button className="footer-app-btn footer-ios">
                                <FiDownload />
                                <div className="footer-app-btn-text">
                                    <span className="footer-app-label">{t("footer.app.ios_label")}</span>
                                    <span className="footer-app-store">{t("footer.app.ios_store")}</span>
                                </div>
                            </button>

                            <button className="footer-app-btn footer-android">
                                <FiDownload />
                                <div className="footer-app-btn-text">
                                    <span className="footer-app-label">{t("footer.app.android_label")}</span>
                                    <span className="footer-app-store">{t("footer.app.android_store")}</span>
                                </div>
                            </button>
                        </div>

                        <div className="footer-trust-badges">
                            <div className="footer-trust-badge">
                                <FiShield />
                                <span>{t("footer.app.trust.ssl")}</span>
                            </div>
                            <div className="footer-trust-badge">
                                <FiShield />
                                <span>{t("footer.app.trust.gdpr")}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Bottom */}
            <div className="footer-bottom">
                <div className="footer-bottom-content">
                    <div className="footer-copyright">
                        <p>{t("footer.bottom.copyright", { year: currentYear })}</p>
                    </div>

                    <div className="footer-bottom-links">
                        <a href="#terms" className="footer-bottom-link">{t("footer.bottom.links.terms")}</a>
                        <a href="#privacy" className="footer-bottom-link">{t("footer.bottom.links.privacy")}</a>
                        <a href="#cookies" className="footer-bottom-link">{t("footer.bottom.links.cookies")}</a>
                        <a href="#accessibility" className="footer-bottom-link">{t("footer.bottom.links.accessibility")}</a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;