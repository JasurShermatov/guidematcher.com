import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, Twitter, Instagram } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

/** Minimal Telegram logotipi (SVG) — lucide-react'da yo‘q */
function TelegramIcon({ className = "h-5 w-5" }) {
    return (
        <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
            className={className}
            fill="currentColor"
        >
            <path d="M9.96 15.47 9.8 19.5c.29 0 .42-.13.57-.28l2.74-2.62 4.54 3.32c.83.46 1.42.22 1.65-.77l3-14.04c.27-1.26-.46-1.76-1.26-1.46L1.7 9.2c-1.23.48-1.22 1.17-.21 1.48l4.96 1.55L18.8 5.44c.6-.37 1.14-.17.69.2L9.96 15.47z" />
        </svg>
    );
}

const Footer = () => {
    const { t } = useLanguage();

    return (
        <footer className="bg-gray-900 dark:bg-dark-950 text-white transition-colors">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Brand */}
                    <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                            <img src="/image.png" alt="UzGuide" className="h-8 w-8" />
                            <span className="font-bold text-xl text-red-500 dark:text-red-400">UzGuide</span>
                        </div>
                        <p className="text-gray-300 dark:text-gray-400 text-sm leading-relaxed">
                            {t('footer.description')}
                        </p>

                        <div className="flex space-x-4">
                            {/* Twitter */}
                            <a
                                href="https://twitter.com/your_handle"
                                target="_blank" rel="noopener noreferrer"
                                className="text-gray-400 dark:text-gray-500 hover:text-white dark:hover:text-gray-300 transition-colors"
                                aria-label="Twitter"
                                title="Twitter"
                            >
                                <Twitter className="h-5 w-5" />
                            </a>

                            {/* Instagram */}
                            <a
                                href="https://instagram.com/your_handle"
                                target="_blank" rel="noopener noreferrer"
                                className="text-gray-400 dark:text-gray-500 hover:text-white dark:hover:text-gray-300 transition-colors"
                                aria-label="Instagram"
                                title="Instagram"
                            >
                                <Instagram className="h-5 w-5" />
                            </a>

                            {/* Telegram */}
                            <a
                                href="https://t.me/your_username"
                                target="_blank" rel="noopener noreferrer"
                                className="text-gray-400 dark:text-gray-500 hover:text-white dark:hover:text-gray-300 transition-colors"
                                aria-label="Telegram"
                                title="Telegram"
                            >
                                <TelegramIcon className="h-5 w-5" />
                            </a>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="font-semibold text-lg mb-4">{t('footer.quickLinks')}</h3>
                        <ul className="space-y-2">
                            <li><Link to="/search" className="text-gray-300 dark:text-gray-400 hover:text-white transition-colors text-sm">{t('footer.findGuides')}</Link></li>
                            <li><Link to="/auth" className="text-gray-300 dark:text-gray-400 hover:text-white transition-colors text-sm">{t('footer.becomeGuide')}</Link></li>
                            <li><Link to="/about" className="text-gray-300 dark:text-gray-400 hover:text-white transition-colors text-sm">{t('footer.aboutUs')}</Link></li>
                            <li><Link to="/how-it-works" className="text-gray-300 dark:text-gray-400 hover:text-white transition-colors text-sm">{t('footer.howItWorks')}</Link></li>
                            <li><Link to="/safety" className="text-gray-300 dark:text-gray-400 hover:text-white transition-colors text-sm">{t('footer.safety')}</Link></li>
                        </ul>
                    </div>

                    {/* Support */}
                    <div>
                        <h3 className="font-semibold text-lg mb-4">{t('footer.support')}</h3>
                        <ul className="space-y-2">
                            <li><Link to="/help" className="text-gray-300 dark:text-gray-400 hover:text-white transition-colors text-sm">{t('footer.helpCenter')}</Link></li>
                            <li><Link to="/contact" className="text-gray-300 dark:text-gray-400 hover:text-white transition-colors text-sm">{t('footer.contactUs')}</Link></li>
                            <li><Link to="/terms" className="text-gray-300 dark:text-gray-400 hover:text-white transition-colors text-sm">{t('footer.termsOfService')}</Link></li>
                            <li><Link to="/cancellation" className="text-gray-300 dark:text-gray-400 hover:text-white transition-colors text-sm">{t('footer.cancellationPolicy')}</Link></li>
                        </ul>
                    </div>

                    {/* Contact Info */}
                    <div>
                        <h3 className="font-semibold text-lg mb-4">{t('footer.contact')}</h3>
                        <div className="space-y-3">
                            <div className="flex items-center space-x-3">
                                <MapPin className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                <span className="text-gray-300 dark:text-gray-400 text-sm">Tashkent, Uzbekistan</span>
                            </div>
                            {/*<div className="flex items-center space-x-3">*/}
                            {/*    <Phone className="h-4 w-4 text-gray-400 dark:text-gray-500" />*/}
                            {/*    <span className="text-gray-300 dark:text-gray-400 text-sm">+998 90 123 45 67</span>*/}
                            {/*</div>*/}
                            <div className="flex items-center space-x-3">
                                <Mail className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                <span className="text-gray-300 dark:text-gray-400 text-sm">info@uzguide.com</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom */}
                <div className="border-t border-gray-800 dark:border-gray-700 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center text-center md:text-left">
                    <div>
                        <p className="text-gray-400 dark:text-gray-500 text-sm">
                            © {new Date().getFullYear()} UzGuide. {t('footer.allRightsReserved')}
                        </p>
                        {/* 🔹 Privacy Policy link pastda joylashgan */}
                        <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
                            <Link
                                to="/privacy"
                                className="hover:text-white dark:hover:text-gray-300 transition-colors underline"
                            >
                                Privacy Policy
                            </Link>
                        </p>
                    </div>

                    <div className="flex space-x-6 mt-4 md:mt-0">
                        <Link to="/sitemap" className="text-gray-400 dark:text-gray-500 hover:text-white dark:hover:text-gray-300 text-sm transition-colors">
                            {t('footer.sitemap')}
                        </Link>
                        <Link to="/accessibility" className="text-gray-400 dark:text-gray-500 hover:text-white dark:hover:text-gray-300 text-sm transition-colors">
                            {t('footer.accessibility')}
                        </Link>
                        <Link to="/cookies" className="text-gray-400 dark:text-gray-500 hover:text-white dark:hover:text-gray-300 text-sm transition-colors">
                            {t('footer.cookiePolicy')}
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
