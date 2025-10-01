import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, Facebook, Twitter, Instagram, Youtube } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const Footer = () => {
    const { t } = useLanguage();

    return (
        <footer className="bg-gray-900 dark:bg-dark-950 text-white transition-colors">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">

                    {/* Brand Section */}
                    <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                            <img src="/image.png" alt="UzGuide" className="h-8 w-8" />
                            <span className="font-bold text-xl text-red-500 dark:text-red-400">UzGuide</span>
                        </div>
                        <p className="text-gray-300 dark:text-gray-400 text-sm leading-relaxed">
                            {t('footer.description')}
                        </p>
                        <div className="flex space-x-4">
                            <a href="#" className="text-gray-400 dark:text-gray-500 hover:text-white dark:hover:text-gray-300 transition-colors">
                                <Facebook className="h-5 w-5" />
                            </a>
                            <a href="#" className="text-gray-400 dark:text-gray-500 hover:text-white dark:hover:text-gray-300 transition-colors">
                                <Twitter className="h-5 w-5" />
                            </a>
                            <a href="#" className="text-gray-400 dark:text-gray-500 hover:text-white dark:hover:text-gray-300 transition-colors">
                                <Instagram className="h-5 w-5" />
                            </a>
                            <a href="#" className="text-gray-400 dark:text-gray-500 hover:text-white dark:hover:text-gray-300 transition-colors">
                                <Youtube className="h-5 w-5" />
                            </a>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="font-semibold text-lg mb-4">{t('footer.quickLinks')}</h3>
                        <ul className="space-y-2">
                            <li>
                                <Link to="/search" className="text-gray-300 dark:text-gray-400 hover:text-white dark:hover:text-gray-300 transition-colors text-sm">
                                    {t('footer.findGuides')}
                                </Link>
                            </li>
                            <li>
                                <Link to="/auth" className="text-gray-300 dark:text-gray-400 hover:text-white dark:hover:text-gray-300 transition-colors text-sm">
                                    {t('footer.becomeGuide')}
                                </Link>
                            </li>
                            <li>
                                <Link to="/about" className="text-gray-300 dark:text-gray-400 hover:text-white dark:hover:text-gray-300 transition-colors text-sm">
                                    {t('footer.aboutUs')}
                                </Link>
                            </li>
                            <li>
                                <Link to="/how-it-works" className="text-gray-300 dark:text-gray-400 hover:text-white dark:hover:text-gray-300 transition-colors text-sm">
                                    {t('footer.howItWorks')}
                                </Link>
                            </li>
                            <li>
                                <Link to="/safety" className="text-gray-300 dark:text-gray-400 hover:text-white dark:hover:text-gray-300 transition-colors text-sm">
                                    {t('footer.safety')}
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Support */}
                    <div>
                        <h3 className="font-semibold text-lg mb-4">{t('footer.support')}</h3>
                        <ul className="space-y-2">
                            <li>
                                <Link to="/help" className="text-gray-300 dark:text-gray-400 hover:text-white dark:hover:text-gray-300 transition-colors text-sm">
                                    {t('footer.helpCenter')}
                                </Link>
                            </li>
                            <li>
                                <Link to="/contact" className="text-gray-300 dark:text-gray-400 hover:text-white dark:hover:text-gray-300 transition-colors text-sm">
                                    {t('footer.contactUs')}
                                </Link>
                            </li>
                            <li>
                                <Link to="/terms" className="text-gray-300 dark:text-gray-400 hover:text-white dark:hover:text-gray-300 transition-colors text-sm">
                                    {t('footer.termsOfService')}
                                </Link>
                            </li>
                            <li>
                                <Link to="/privacy" className="text-gray-300 dark:text-gray-400 hover:text-white dark:hover:text-gray-300 transition-colors text-sm">
                                    {t('footer.privacyPolicy')}
                                </Link>
                            </li>
                            <li>
                                <Link to="/cancellation" className="text-gray-300 dark:text-gray-400 hover:text-white dark:hover:text-gray-300 transition-colors text-sm">
                                    {t('footer.cancellationPolicy')}
                                </Link>
                            </li>
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
                            <div className="flex items-center space-x-3">
                                <Phone className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                <span className="text-gray-300 dark:text-gray-400 text-sm">+998 90 123 45 67</span>
                            </div>
                            <div className="flex items-center space-x-3">
                                <Mail className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                <span className="text-gray-300 dark:text-gray-400 text-sm">info@uzguide.com</span>
                            </div>
                        </div>

                        {/* Newsletter */}
                        <div className="mt-6">
                            <h4 className="font-medium mb-2">{t('footer.newsletter')}</h4>
                            <div className="flex">
                                <input
                                    type="email"
                                    placeholder={t('footer.yourEmail')}
                                    className="flex-1 px-3 py-2 bg-gray-800 dark:bg-gray-900 border border-gray-700 dark:border-gray-600 rounded-l-lg text-sm focus:outline-none focus:border-red-500 text-white placeholder-gray-400"
                                />
                                <button className="bg-red-500 dark:bg-red-600 text-white px-4 py-2 rounded-r-lg hover:bg-red-600 dark:hover:bg-red-700 transition-colors text-sm">
                                    {t('footer.subscribe')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Section */}
                <div className="border-t border-gray-800 dark:border-gray-700 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
                    <p className="text-gray-400 dark:text-gray-500 text-sm">
                        © 2024 UzGuide. {t('footer.allRightsReserved')}
                    </p>
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
