import React, { useState, useEffect, useMemo } from 'react';
import { FiUser, FiMail, FiLogOut, FiSettings, FiMapPin, FiX, FiCheck, FiCalendar, FiStar, FiDollarSign, FiImage, FiCheckCircle, FiUsers, FiClock, FiGlobe, FiAward, FiEdit, FiEye, FiMessageSquare, FiTrendingUp, FiHeart, FiPhone, FiDownload, FiLock, FiUpload, FiPlus, FiMinus, FiFileText, FiCamera, FiSave, FiRefreshCw } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import './GuideAccount.css';
import GuideChatWidget from './ChatWidgets';
import {
    getCurrentUser,
    updateUserProfile,
    getCustomerProfile,
    createCustomerProfile,
    updateCustomerProfile,
    getMyPortfolio,
    createPortfolioItem,
    updatePortfolioItem,
    deletePortfolioItem,
    getMyAvailability,
    createAvailability,
    updateAvailability,
    deleteAvailability,
    getMyDocuments,
    uploadDocument,
    deleteDocument,
    getGuideBookings,
    updateBookingStatus,
    getGuideReviews,
    getGuideStats,
    getGuideChats,
    getChatMessages,
    sendMessage,
    getNotifications,
    markNotificationAsRead,
    getCountries,
    getCities,
    getServiceTypes,
    getLanguages,
    changePassword
} from '../api/api';

const GuideAccount = ({ user, setIsAuthenticated, setUser }) => {
    const { t } = useTranslation();

    // State variables
    const [theme, setTheme] = useState('default');
    const [chatOpen, setChatOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState(null);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [showPortfolioModal, setShowPortfolioModal] = useState(false);
    const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
    const [showDocumentModal, setShowDocumentModal] = useState(false);
    const [activeTab, setActiveTab] = useState('new');
    const [notifications, setNotifications] = useState([]);
    const [profileError, setProfileError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [loading, setLoading] = useState(true);

    // Data states
    const [customerProfile, setCustomerProfile] = useState(null);
    const [portfolio, setPortfolio] = useState([]);
    const [availability, setAvailability] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [guideStats, setGuideStats] = useState({
        totalBookings: 0,
        averageRating: 0,
        responseRate: 0,
        totalEarnings: 0,
        totalReviews: 0
    });
    const [chatMessages, setChatMessages] = useState([]);

    // Form states
    const [profileForm, setProfileForm] = useState({
        professional_bio: '',
        years_of_experience: 0,
        hourly_rate: 0,
        daily_rate: 0,
        currency: 'USD',
        service_areas: '',
        service_types: [],
        city: null,
        languages: []
    });

    const [portfolioForm, setPortfolioForm] = useState({
        title: '',
        description: '',
        image: null,
        order: 0
    });

    const [availabilityForm, setAvailabilityForm] = useState({
        date: '',
        is_available: true,
        start_time: '',
        end_time: '',
        note: ''
    });

    const [documentForm, setDocumentForm] = useState({
        document_type: 'certificate',
        file: null,
        description: ''
    });

    const [passwordForm, setPasswordForm] = useState({
        current_password: '',
        new_password: '',
        confirm_password: ''
    });

    // Reference data
    const [countries, setCountries] = useState([]);
    const [cities, setCities] = useState([]);
    const [serviceTypes, setServiceTypes] = useState([]);
    const [languageOptions, setLanguageOptions] = useState([]);

    // Loading states
    const [dataLoading, setDataLoading] = useState({
        profile: false,
        portfolio: false,
        availability: false,
        documents: false,
        bookings: false,
        reviews: false,
        stats: false,
        chats: false
    });

    // Error states
    const [dataErrors, setDataErrors] = useState({
        profile: false,
        portfolio: false,
        availability: false,
        documents: false,
        bookings: false,
        reviews: false,
        stats: false,
        chats: false
    });

    // Fetch reference data
    useEffect(() => {
        const fetchReferenceData = async () => {
            try {
                const [countriesData, serviceTypesData, languagesData] = await Promise.all([
                    getCountries(),
                    getServiceTypes(),
                    getLanguages()
                ]);
                setCountries(countriesData);
                setServiceTypes(serviceTypesData);
                setLanguageOptions(languagesData);
            } catch (error) {
                console.error('Failed to fetch reference data:', error);
            }
        };
        fetchReferenceData();
    }, []);

    // Fetch cities when country changes
    useEffect(() => {
        if (profileForm.country) {
            fetchCities(profileForm.country);
        }
    }, [profileForm.country]);

    const fetchCities = async (countryId) => {
        try {
            const citiesData = await getCities(countryId);
            setCities(citiesData);
        } catch (error) {
            console.error('Failed to fetch cities:', error);
        }
    };

    // Initialize data
    useEffect(() => {
        if (user) {
            fetchAllData();
        }
    }, [user]);

    const fetchAllData = async () => {
        setLoading(true);

        const dataFetchers = [
            { key: 'profile', fetcher: fetchCustomerProfile },
            { key: 'portfolio', fetcher: fetchPortfolio },
            { key: 'availability', fetcher: fetchAvailability },
            { key: 'documents', fetcher: fetchDocuments },
            { key: 'bookings', fetcher: fetchBookings },
            { key: 'reviews', fetcher: fetchReviews },
            { key: 'stats', fetcher: fetchGuideStats },
            { key: 'chats', fetcher: fetchChats }
        ];

        const results = await Promise.allSettled(
            dataFetchers.map(({ fetcher }) => fetcher())
        );

        // Update error states
        const newErrors = {};
        results.forEach((result, index) => {
            const key = dataFetchers[index].key;
            newErrors[key] = result.status === 'rejected';
            if (result.status === 'rejected') {
                console.error(`Failed to fetch ${key}:`, result.reason);
            }
        });
        setDataErrors(newErrors);
        setLoading(false);
    };

    const fetchCustomerProfile = async () => {
        setDataLoading(prev => ({ ...prev, profile: true }));
        try {
            const profileData = await getCustomerProfile();
            setCustomerProfile(profileData);
            setProfileForm({
                professional_bio: profileData.professional_bio || '',
                years_of_experience: profileData.years_of_experience || 0,
                hourly_rate: profileData.hourly_rate || 0,
                daily_rate: profileData.daily_rate || 0,
                currency: profileData.currency || 'USD',
                service_areas: profileData.service_areas || '',
                service_types: profileData.service_types || [],
                city: profileData.city || null,
                languages: profileData.languages || []
            });
        } catch (error) {
            // If profile doesn't exist, it's not an error - user can create one
            if (error.message.includes("don't have a customer profile")) {
                setCustomerProfile(null);
            } else {
                throw error;
            }
        } finally {
            setDataLoading(prev => ({ ...prev, profile: false }));
        }
    };

    const fetchPortfolio = async () => {
        setDataLoading(prev => ({ ...prev, portfolio: true }));
        try {
            const portfolioData = await getMyPortfolio();
            setPortfolio(portfolioData);
        } catch (error) {
            setPortfolio([]);
            throw error;
        } finally {
            setDataLoading(prev => ({ ...prev, portfolio: false }));
        }
    };

    const fetchAvailability = async () => {
        setDataLoading(prev => ({ ...prev, availability: true }));
        try {
            const availabilityData = await getMyAvailability();
            setAvailability(availabilityData);
        } catch (error) {
            setAvailability([]);
            throw error;
        } finally {
            setDataLoading(prev => ({ ...prev, availability: false }));
        }
    };

    const fetchDocuments = async () => {
        setDataLoading(prev => ({ ...prev, documents: true }));
        try {
            const documentsData = await getMyDocuments();
            setDocuments(documentsData);
        } catch (error) {
            setDocuments([]);
            throw error;
        } finally {
            setDataLoading(prev => ({ ...prev, documents: false }));
        }
    };

    const fetchBookings = async () => {
        setDataLoading(prev => ({ ...prev, bookings: true }));
        try {
            const bookingsData = await getGuideBookings();
            setBookings(Array.isArray(bookingsData.results) ? bookingsData.results : []);
        } catch (error) {
            setBookings([]);
            throw error;
        } finally {
            setDataLoading(prev => ({ ...prev, bookings: false }));
        }
    };

    const fetchReviews = async () => {
        setDataLoading(prev => ({ ...prev, reviews: true }));
        try {
            const reviewsData = await getGuideReviews();
            setReviews(Array.isArray(reviewsData.results) ? reviewsData.results : []);
        } catch (error) {
            setReviews([]);
            throw error;
        } finally {
            setDataLoading(prev => ({ ...prev, reviews: false }));
        }
    };

    const fetchGuideStats = async () => {
        setDataLoading(prev => ({ ...prev, stats: true }));
        try {
            const statsData = await getGuideStats();
            setGuideStats({
                totalBookings: statsData.total_bookings || 0,
                averageRating: statsData.average_rating || 0,
                responseRate: statsData.response_rate || 0,
                totalEarnings: statsData.total_earnings || 0,
                totalReviews: statsData.total_reviews || 0
            });
        } catch (error) {
            setGuideStats({
                totalBookings: 0,
                averageRating: 0,
                responseRate: 0,
                totalEarnings: 0,
                totalReviews: 0
            });
            throw error;
        } finally {
            setDataLoading(prev => ({ ...prev, stats: false }));
        }
    };

    const fetchChats = async () => {
        setDataLoading(prev => ({ ...prev, chats: true }));
        try {
            const chatsData = await getGuideChats();
            setChatMessages(Array.isArray(chatsData.results) ? chatsData.results : []);
        } catch (error) {
            setChatMessages([]);
            throw error;
        } finally {
            setDataLoading(prev => ({ ...prev, chats: false }));
        }
    };

    // Statistics calculations
    const stats = useMemo(() => {
        const pendingBookings = bookings.filter(b => b.status === 'pending').length;
        const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length;
        const completedBookings = bookings.filter(b => b.status === 'completed').length;
        const totalUnreadMessages = chatMessages.reduce((sum, chat) => sum + (chat.unread_count || 0), 0);

        return {
            totalBookings: guideStats.totalBookings || completedBookings,
            pendingBookings,
            confirmedBookings,
            completedBookings,
            averageRating: guideStats.averageRating || customerProfile?.average_rating || 0,
            totalEarnings: guideStats.totalEarnings || 0,
            responseRate: guideStats.responseRate || 0,
            totalReviews: guideStats.totalReviews || reviews.length,
            totalUnreadMessages
        };
    }, [bookings, chatMessages, guideStats, customerProfile, reviews]);

    // Theme handling
    useEffect(() => {
        const root = document.documentElement;
        if (theme === 'auto') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
        } else {
            root.setAttribute('data-theme', theme);
        }

        const handleSystemThemeChange = (e) => {
            if (theme === 'auto') {
                root.setAttribute('data-theme', e.matches ? 'dark' : 'light');
            }
        };

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', handleSystemThemeChange);

        return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
    }, [theme]);

    // Notification handler
    const addNotification = (message, type = 'info') => {
        const notification = {
            id: Date.now(),
            message,
            type,
            timestamp: new Date().toISOString()
        };
        setNotifications(prev => [notification, ...prev.slice(0, 4)]);

        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== notification.id));
        }, 5000);
    };

    // Profile handlers
    const handleCreateCustomerProfile = async () => {
        if (!profileForm.professional_bio || !profileForm.city) {
            setProfileError(t('guide.profile.validation.required_fields'));
            return;
        }

        try {
            const profileData = await createCustomerProfile(profileForm);
            setCustomerProfile(profileData);
            addNotification(t('guide.profile.success.created'), 'success');
            setShowProfileModal(false);
            setProfileError('');
        } catch (error) {
            setProfileError(error.message || t('guide.profile.errors.create_failed'));
        }
    };

    const handleUpdateCustomerProfile = async () => {
        if (!profileForm.professional_bio || !profileForm.city) {
            setProfileError(t('guide.profile.validation.required_fields'));
            return;
        }

        try {
            const profileData = await updateCustomerProfile(profileForm);
            setCustomerProfile(profileData);
            addNotification(t('guide.profile.success.updated'), 'success');
            setShowProfileModal(false);
            setProfileError('');
        } catch (error) {
            setProfileError(error.message || t('guide.profile.errors.update_failed'));
        }
    };

    const handleProfileSubmit = () => {
        if (customerProfile) {
            handleUpdateCustomerProfile();
        } else {
            handleCreateCustomerProfile();
        }
    };

    // Portfolio handlers
    const handlePortfolioSubmit = async () => {
        try {
            const formData = new FormData();
            formData.append('title', portfolioForm.title);
            formData.append('description', portfolioForm.description);
            formData.append('order', portfolioForm.order);
            if (portfolioForm.image) {
                formData.append('image', portfolioForm.image);
            }

            await createPortfolioItem(formData);
            await fetchPortfolio();
            setPortfolioForm({ title: '', description: '', image: null, order: 0 });
            addNotification(t('guide.portfolio.success.created'), 'success');
        } catch (error) {
            addNotification(error.message || t('guide.portfolio.errors.create_failed'), 'error');
        }
    };

    const handleDeletePortfolioItem = async (id) => {
        try {
            await deletePortfolioItem(id);
            await fetchPortfolio();
            addNotification(t('guide.portfolio.success.deleted'), 'success');
        } catch (error) {
            addNotification(error.message || t('guide.portfolio.errors.delete_failed'), 'error');
        }
    };

    // Availability handlers
    const handleAvailabilitySubmit = async () => {
        try {
            await createAvailability(availabilityForm);
            await fetchAvailability();
            setAvailabilityForm({ date: '', is_available: true, start_time: '', end_time: '', note: '' });
            setShowAvailabilityModal(false);
            addNotification(t('guide.availability.success.created'), 'success');
        } catch (error) {
            addNotification(error.message || t('guide.availability.errors.create_failed'), 'error');
        }
    };

    const handleDeleteAvailability = async (id) => {
        try {
            await deleteAvailability(id);
            await fetchAvailability();
            addNotification(t('guide.availability.success.deleted'), 'success');
        } catch (error) {
            addNotification(error.message || t('guide.availability.errors.delete_failed'), 'error');
        }
    };

    // Document handlers
    const handleDocumentSubmit = async () => {
        try {
            const formData = new FormData();
            formData.append('document_type', documentForm.document_type);
            formData.append('description', documentForm.description);
            if (documentForm.file) {
                formData.append('file', documentForm.file);
            }

            await uploadDocument(formData);
            await fetchDocuments();
            setDocumentForm({ document_type: 'certificate', file: null, description: '' });
            setShowDocumentModal(false);
            addNotification(t('guide.documents.success.uploaded'), 'success');
        } catch (error) {
            addNotification(error.message || t('guide.documents.errors.upload_failed'), 'error');
        }
    };

    const handleDeleteDocument = async (id) => {
        try {
            await deleteDocument(id);
            await fetchDocuments();
            addNotification(t('guide.documents.success.deleted'), 'success');
        } catch (error) {
            addNotification(error.message || t('guide.documents.errors.delete_failed'), 'error');
        }
    };

    // Booking handlers
    const handleBookingAction = async (bookingId, status, data = {}) => {
        try {
            await updateBookingStatus(bookingId, status, data);
            await fetchBookings();
            addNotification(t(`guide.bookings.success.${status}`), 'success');
        } catch (error) {
            addNotification(error.message || t('guide.bookings.errors.update_failed'), 'error');
        }
    };

    // Password change handler
    const handlePasswordSubmit = async () => {
        if (!passwordForm.current_password || !passwordForm.new_password || !passwordForm.confirm_password) {
            setPasswordError(t('guide.password.validation.all_fields_required'));
            return;
        }

        if (passwordForm.new_password !== passwordForm.confirm_password) {
            setPasswordError(t('guide.password.validation.passwords_not_match'));
            return;
        }

        if (passwordForm.new_password.length < 8) {
            setPasswordError(t('guide.password.validation.min_length'));
            return;
        }

        try {
            await changePassword({
                current_password: passwordForm.current_password,
                new_password: passwordForm.new_password
            });

            addNotification(t('guide.password.success.changed'), 'success');
            setShowPasswordModal(false);
            setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
            setPasswordError('');
        } catch (error) {
            setPasswordError(error.message || t('guide.password.errors.change_failed'));
        }
    };

    // Chat handler
    const openChat = (clientId) => {
        setSelectedClient(clientId);
        setChatOpen(true);
    };

    // File handlers
    const handleFileUpload = (event, type) => {
        const file = event.target.files[0];
        if (file) {
            if (type === 'portfolio') {
                setPortfolioForm(prev => ({ ...prev, image: file }));
            } else if (type === 'document') {
                setDocumentForm(prev => ({ ...prev, file: file }));
            }
        }
    };

    const getBookingsByStatus = (status) => {
        if (!Array.isArray(bookings)) return [];

        switch (status) {
            case 'new':
                return bookings.filter(b => b.status === 'pending');
            case 'confirmed':
                return bookings.filter(b => b.status === 'confirmed');
            case 'history':
                return bookings.filter(b => ['completed', 'cancelled', 'rejected'].includes(b.status));
            default:
                return bookings;
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return t('guide.general.no_date');
        return new Date(dateString).toLocaleDateString();
    };

    const formatCurrency = (amount) => {
        if (!amount) return '$0';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    if (loading) {
        return (
            <div className="guide-account">
                <div className="guide-account-loading">
                    <div className="guide-account-spinner"></div>
                    <p>{t('guide.loading.data')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="guide-account">
            {/* Notifications */}
            <div className="guide-account-notifications">
                {notifications.map(notification => (
                    <div key={notification.id} className={`guide-account-notification guide-account-notification-${notification.type}`}>
                        <span>{notification.message}</span>
                        <button onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}>
                            <FiX />
                        </button>
                    </div>
                ))}
            </div>

            {/* Header */}
            <div className="guide-account-header">
                <div className="guide-account-header-content">
                    <div className="guide-account-user-info">
                        <div className="guide-account-avatar-container">
                            <img
                                src={user?.profile_picture || '/default-avatar.png'}
                                alt={t('guide.profile.profile_picture_alt')}
                                className="guide-account-avatar"
                            />
                            <div className={`guide-account-status-indicator ${user?.is_online ? 'online' : 'offline'}`}></div>
                        </div>
                        <div>
                            <h1>{user?.first_name} {user?.last_name}</h1>
                            <p className="guide-account-subtitle">
                                {user?.role} • {customerProfile?.city?.name || user?.city}, {user?.country}
                            </p>
                            <div className="guide-account-rating">
                                <FiStar className="guide-account-star" />
                                <span>{stats.averageRating.toFixed(1)}</span>
                                <span>({stats.totalReviews} {t('guide.header.reviews')})</span>
                            </div>
                            {customerProfile?.verification_status && (
                                <div className={`guide-account-verification-badge ${customerProfile.verification_status}`}>
                                    {customerProfile.verification_status === 'verified' && <FiCheckCircle />}
                                    {t(`guide.verification.${customerProfile.verification_status}`)}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="guide-account-header-actions">
                        <div className="guide-account-quick-stats">
                            <div className="guide-account-stat-item">
                                <FiUsers />
                                <span>{stats.pendingBookings}</span>
                                <small>{t('guide.stats.new_bookings')}</small>
                            </div>
                            <div className="guide-account-stat-item">
                                <FiCheckCircle />
                                <span>{stats.confirmedBookings}</span>
                                <small>{t('guide.stats.confirmed')}</small>
                            </div>
                            <div className="guide-account-stat-item">
                                <FiDollarSign />
                                <span>{formatCurrency(stats.totalEarnings)}</span>
                                <small>{t('guide.stats.earnings')}</small>
                            </div>
                            <div className="guide-account-stat-item" onClick={() => setChatOpen(true)}>
                                <FiMessageSquare />
                                <span>{stats.totalUnreadMessages}</span>
                                <small>{t('guide.stats.new_messages')}</small>
                                {stats.totalUnreadMessages > 0 && <div className="guide-account-notification-dot"></div>}
                            </div>
                        </div>
                        <button
                            className="guide-account-settings-btn"
                            onClick={() => setShowSettingsModal(true)}
                        >
                            <FiSettings />
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="guide-account-main">
                {/* Left Sidebar */}
                <div className="guide-account-sidebar">
                    {/* Professional Profile Card */}
                    <div className="guide-account-card">
                        <div className="guide-account-card-header">
                            <h3>{t('guide.profile.professional_profile')}</h3>
                            <button onClick={() => setShowProfileModal(true)} className="guide-account-edit-btn">
                                <FiEdit />
                            </button>
                        </div>
                        <div className="guide-account-profile-details">
                            {!customerProfile ? (
                                <div className="guide-account-no-profile">
                                    <p>{t('guide.profile.no_customer_profile')}</p>
                                    <button
                                        className="guide-account-btn guide-account-btn-primary"
                                        onClick={() => setShowProfileModal(true)}
                                    >
                                        {t('guide.profile.create_profile')}
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="guide-account-profile-item">
                                        <FiUser />
                                        <div>
                                            <strong>{t('guide.profile.bio')}</strong>
                                            <p>{customerProfile.professional_bio || t('guide.profile.no_bio')}</p>
                                        </div>
                                    </div>
                                    <div className="guide-account-profile-item">
                                        <FiAward />
                                        <div>
                                            <strong>{t('guide.profile.experience')}</strong>
                                            <p>{customerProfile.years_of_experience ? t('guide.profile.years_experience', { years: customerProfile.years_of_experience }) : t('guide.profile.no_experience')}</p>
                                        </div>
                                    </div>
                                    <div className="guide-account-profile-item">
                                        <FiGlobe />
                                        <div>
                                            <strong>{t('guide.profile.languages')}</strong>
                                            <p>{customerProfile.languages && customerProfile.languages.length > 0 ? customerProfile.languages.map(l => l.name).join(', ') : t('guide.profile.no_languages')}</p>
                                        </div>
                                    </div>
                                    <div className="guide-account-profile-item">
                                        <FiDollarSign />
                                        <div>
                                            <strong>{t('guide.profile.pricing')}</strong>
                                            <p>
                                                {customerProfile.hourly_rate ? t('guide.profile.hourly_rate', { rate: formatCurrency(customerProfile.hourly_rate) }) : t('guide.profile.no_hourly_rate')}
                                                {customerProfile.daily_rate ? ` • ${t('guide.profile.daily_rate', { rate: formatCurrency(customerProfile.daily_rate) })}` : ` • ${t('guide.profile.no_daily_rate')}`}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="guide-account-profile-item">
                                        <FiMapPin />
                                        <div>
                                            <strong>{t('guide.profile.service_areas')}</strong>
                                            <p>{customerProfile.service_areas || t('guide.profile.no_service_areas')}</p>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Portfolio Card */}
                    <div className="guide-account-card">
                        <div className="guide-account-card-header">
                            <h3>{t('guide.portfolio.title')}</h3>
                            <button onClick={() => setShowPortfolioModal(true)} className="guide-account-edit-btn">
                                <FiPlus />
                            </button>
                        </div>
                        <div className="guide-account-portfolio-preview">
                            {dataLoading.portfolio ? (
                                <div className="guide-account-loading-small">
                                    <FiRefreshCw className="guide-account-spin" />
                                </div>
                            ) : dataErrors.portfolio ? (
                                <div className="guide-account-error-small">
                                    <FiX />
                                    <span>{t('guide.errors.portfolio_loading_error')}</span>
                                </div>
                            ) : portfolio.length > 0 ? (
                                <>
                                    {portfolio.slice(0, 4).map((item) => (
                                        <div key={item.id} className="guide-account-portfolio-item-small">
                                            <img src={item.image} alt={item.title} />
                                            <button
                                                className="guide-account-portfolio-delete-small"
                                                onClick={() => handleDeletePortfolioItem(item.id)}
                                            >
                                                <FiX />
                                            </button>
                                        </div>
                                    ))}
                                    {portfolio.length > 4 && (
                                        <div className="guide-account-portfolio-more-small">
                                            +{portfolio.length - 4}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="guide-account-empty-small">
                                    <FiImage />
                                    <p>{t('guide.portfolio.no_items')}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Statistics Card */}
                    <div className="guide-account-card">
                        <div className="guide-account-card-header">
                            <h3>{t('guide.statistics.title')}</h3>
                            {dataErrors.stats && (
                                <span className="guide-account-error-badge" title={t('guide.errors.data_loading_error')}>
                                    <FiX />
                                </span>
                            )}
                        </div>
                        <div className="guide-account-stats-grid">
                            <div className="guide-account-stat">
                                <FiCheckCircle className="guide-account-stat-icon success" />
                                <div>
                                    <strong>{dataErrors.stats ? '—' : stats.totalBookings}</strong>
                                    <span>{t('guide.statistics.completed_bookings')}</span>
                                </div>
                            </div>
                            <div className="guide-account-stat">
                                <FiStar className="guide-account-stat-icon warning" />
                                <div>
                                    <strong>{dataErrors.stats ? '—' : stats.averageRating.toFixed(1)}</strong>
                                    <span>{t('guide.statistics.average_rating')}</span>
                                </div>
                            </div>
                            <div className="guide-account-stat">
                                <FiTrendingUp className="guide-account-stat-icon primary" />
                                <div>
                                    <strong>{dataErrors.stats ? '—' : stats.responseRate}%</strong>
                                    <span>{t('guide.statistics.response_rate')}</span>
                                </div>
                            </div>
                            <div className="guide-account-stat">
                                <FiDollarSign className="guide-account-stat-icon success" />
                                <div>
                                    <strong>{dataErrors.stats ? '—' : formatCurrency(stats.totalEarnings)}</strong>
                                    <span>{t('guide.statistics.total_earnings')}</span>
                                </div>
                            </div>
                        </div>
                        {dataErrors.stats && (
                            <div className="guide-account-error-message-card">
                                <small>{t('guide.errors.statistics_loading_error')}</small>
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="guide-account-content">
                    <div className="guide-account-card">
                        <div className="guide-account-card-header">
                            <h3>{t('guide.bookings.title')}</h3>
                            {dataErrors.bookings && (
                                <span className="guide-account-error-badge" title={t('guide.errors.bookings_loading_error')}>
                                    <FiX />
                                </span>
                            )}
                            <div className="guide-account-tabs">
                                <button
                                    className={`guide-account-tab ${activeTab === 'new' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('new')}
                                >
                                    {t('guide.bookings.new')} ({dataErrors.bookings ? '—' : stats.pendingBookings})
                                </button>
                                <button
                                    className={`guide-account-tab ${activeTab === 'confirmed' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('confirmed')}
                                >
                                    {t('guide.bookings.confirmed')} ({dataErrors.bookings ? '—' : stats.confirmedBookings})
                                </button>
                                <button
                                    className={`guide-account-tab ${activeTab === 'history' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('history')}
                                >
                                    {t('guide.bookings.history')} ({dataErrors.bookings ? '—' : stats.completedBookings})
                                </button>
                            </div>
                        </div>

                        <div className="guide-account-bookings-list">
                            {dataLoading.bookings ? (
                                <div className="guide-account-loading-state">
                                    <FiRefreshCw className="guide-account-spin" />
                                    <p>{t('guide.loading.bookings')}</p>
                                </div>
                            ) : dataErrors.bookings ? (
                                <div className="guide-account-error-state">
                                    <FiX size={48} color="#ef4444" />
                                    <h3>{t('guide.errors.bookings_loading_error_title')}</h3>
                                    <p>{t('guide.errors.bookings_loading_error_desc')}</p>
                                    <button
                                        className="guide-account-btn guide-account-btn-outline"
                                        onClick={() => fetchBookings()}
                                    >
                                        {t('guide.actions.retry')}
                                    </button>
                                </div>
                            ) : getBookingsByStatus(activeTab).length === 0 ? (
                                <div className="guide-account-empty-state">
                                    <FiUsers size={48} />
                                    <h3>{t('guide.bookings.no_bookings_title')}</h3>
                                    <p>{t('guide.bookings.no_bookings_desc')}</p>
                                </div>
                            ) : (
                                getBookingsByStatus(activeTab).map(booking => (
                                    <div key={booking.id} className="guide-account-booking-item">
                                        <div className="guide-account-booking-header">
                                            <div className="guide-account-client-info">
                                                <div className="guide-account-client-avatar-container">
                                                    <img src={booking.client?.profile_picture || '/default-avatar.png'} alt={booking.client?.name} />
                                                    <div className={`guide-account-client-status ${booking.client?.is_online ? 'online' : 'offline'}`}></div>
                                                </div>
                                                <div>
                                                    <h4>{booking.client?.name || t('guide.bookings.anonymous_client')}</h4>
                                                    <span className="guide-account-booking-id">#{booking.id}</span>
                                                </div>
                                            </div>
                                            <div className="guide-account-booking-meta">
                                                <div className={`guide-account-status guide-account-status-${booking.status}`}>
                                                    {t(`guide.status.${booking.status}`)}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="guide-account-booking-details">
                                            <div className="guide-account-booking-info">
                                                <div className="guide-account-info-item">
                                                    <FiCalendar />
                                                    <span>{formatDate(booking.start_date)}</span>
                                                </div>
                                                <div className="guide-account-info-item">
                                                    <FiClock />
                                                    <span>{booking.duration || t('guide.bookings.no_duration')}</span>
                                                </div>
                                                <div className="guide-account-info-item">
                                                    <FiUsers />
                                                    <span>{booking.travelers_count || t('guide.bookings.no_travelers')}</span>
                                                </div>
                                                <div className="guide-account-info-item">
                                                    <FiDollarSign />
                                                    <span>{formatCurrency(booking.total_price)}</span>
                                                </div>
                                            </div>

                                            <div className="guide-account-service-type">
                                                <strong>{booking.service_type?.name || t('guide.bookings.no_service_type')}</strong>
                                                {booking.notes && <p>{booking.notes}</p>}
                                                {booking.rating && (
                                                    <div className="guide-account-rating">
                                                        <FiStar />
                                                        <span>{booking.rating}/5</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {booking.status === 'pending' && (
                                            <div className="guide-account-booking-actions">
                                                <button
                                                    className="guide-account-btn guide-account-btn-success"
                                                    onClick={() => handleBookingAction(booking.id, 'confirmed')}
                                                >
                                                    <FiCheck /> {t('guide.actions.accept')}
                                                </button>
                                                <button
                                                    className="guide-account-btn guide-account-btn-danger"
                                                    onClick={() => handleBookingAction(booking.id, 'rejected')}
                                                >
                                                    <FiX /> {t('guide.actions.reject')}
                                                </button>
                                                <button
                                                    className="guide-account-btn guide-account-btn-outline"
                                                    onClick={() => openChat(booking.client?.id)}
                                                >
                                                    <FiMessageSquare /> {t('guide.actions.chat')}
                                                </button>
                                            </div>
                                        )}

                                        {booking.status === 'confirmed' && (
                                            <div className="guide-account-booking-actions">
                                                <button
                                                    className="guide-account-btn guide-account-btn-outline"
                                                    onClick={() => openChat(booking.client?.id)}
                                                >
                                                    <FiMessageSquare /> {t('guide.actions.chat_with_client')}
                                                </button>
                                                <button className="guide-account-btn guide-account-btn-primary">
                                                    <FiMapPin /> {t('guide.actions.view_route')}
                                                </button>
                                                <button
                                                    className="guide-account-btn guide-account-btn-success"
                                                    onClick={() => handleBookingAction(booking.id, 'completed')}
                                                >
                                                    <FiCheckCircle /> {t('guide.actions.mark_completed')}
                                                </button>
                                            </div>
                                        )}

                                        {(booking.status === 'completed' || booking.status === 'cancelled') && (
                                            <div className="guide-account-booking-actions">
                                                <button
                                                    className="guide-account-btn guide-account-btn-outline"
                                                    onClick={() => openChat(booking.client?.id)}
                                                >
                                                    <FiMessageSquare /> {t('guide.actions.send_message')}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Chat Widget */}
                    <GuideChatWidget
                        chatMessages={chatMessages}
                        setChatMessages={setChatMessages}
                        bookings={bookings}
                        openChat={openChat}
                        stats={stats}
                        chatOpen={chatOpen}
                        setChatOpen={setChatOpen}
                        selectedClient={selectedClient}
                    />
                </div>
            </div>

            {/* Profile Modal */}
            {showProfileModal && (
                <div className="guide-account-modal-overlay" onClick={() => setShowProfileModal(false)}>
                    <div className="guide-account-modal guide-account-modal-large" onClick={e => e.stopPropagation()}>
                        <div className="guide-account-modal-header">
                            <h3>{customerProfile ? t('guide.modals.edit_profile') : t('guide.modals.create_profile')}</h3>
                            <button onClick={() => setShowProfileModal(false)}>
                                <FiX />
                            </button>
                        </div>
                        <div className="guide-account-modal-content">
                            {profileError && (
                                <div className="guide-account-error-message">{profileError}</div>
                            )}

                            <div className="guide-account-form-group">
                                <label>{t('guide.profile.form.bio')} *</label>
                                <textarea
                                    value={profileForm.professional_bio}
                                    onChange={(e) => setProfileForm({...profileForm, professional_bio: e.target.value})}
                                    rows={4}
                                    placeholder={t('guide.profile.form.bio_placeholder')}
                                />
                            </div>

                            <div className="guide-account-form-row">
                                <div className="guide-account-form-group">
                                    <label>{t('guide.profile.form.experience_years')}</label>
                                    <input
                                        type="number"
                                        value={profileForm.years_of_experience}
                                        onChange={(e) => setProfileForm({...profileForm, years_of_experience: Number(e.target.value)})}
                                        min="0"
                                        max="50"
                                    />
                                </div>
                                <div className="guide-account-form-group">
                                    <label>{t('guide.profile.form.city')} *</label>
                                    <select
                                        value={profileForm.city || ''}
                                        onChange={(e) => setProfileForm({...profileForm, city: Number(e.target.value)})}
                                    >
                                        <option value="">{t('guide.profile.form.select_city')}</option>
                                        {cities.map((city) => (
                                            <option key={city.id} value={city.id}>{city.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="guide-account-form-row">
                                <div className="guide-account-form-group">
                                    <label>{t('guide.profile.form.hourly_rate')}</label>
                                    <input
                                        type="number"
                                        value={profileForm.hourly_rate}
                                        onChange={(e) => setProfileForm({...profileForm, hourly_rate: Number(e.target.value)})}
                                        min="0"
                                        step="5"
                                    />
                                </div>
                                <div className="guide-account-form-group">
                                    <label>{t('guide.profile.form.daily_rate')}</label>
                                    <input
                                        type="number"
                                        value={profileForm.daily_rate}
                                        onChange={(e) => setProfileForm({...profileForm, daily_rate: Number(e.target.value)})}
                                        min="0"
                                        step="10"
                                    />
                                </div>
                            </div>

                            <div className="guide-account-form-group">
                                <label>{t('guide.profile.form.service_areas')}</label>
                                <textarea
                                    value={profileForm.service_areas}
                                    onChange={(e) => setProfileForm({...profileForm, service_areas: e.target.value})}
                                    rows={3}
                                    placeholder={t('guide.profile.form.service_areas_placeholder')}
                                />
                            </div>

                            <div className="guide-account-form-group">
                                <label>{t('guide.profile.form.service_types')}</label>
                                <div className="guide-account-checkbox-group">
                                    {serviceTypes.map((serviceType) => (
                                        <label key={serviceType.id} className="guide-account-checkbox-item">
                                            <input
                                                type="checkbox"
                                                checked={profileForm.service_types.includes(serviceType.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setProfileForm(prev => ({
                                                            ...prev,
                                                            service_types: [...prev.service_types, serviceType.id]
                                                        }));
                                                    } else {
                                                        setProfileForm(prev => ({
                                                            ...prev,
                                                            service_types: prev.service_types.filter(id => id !== serviceType.id)
                                                        }));
                                                    }
                                                }}
                                            />
                                            <span>{serviceType.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="guide-account-form-group">
                                <label>{t('guide.profile.form.languages')}</label>
                                <div className="guide-account-checkbox-group">
                                    {languageOptions.map((language) => (
                                        <label key={language.id} className="guide-account-checkbox-item">
                                            <input
                                                type="checkbox"
                                                checked={profileForm.languages.includes(language.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setProfileForm(prev => ({
                                                            ...prev,
                                                            languages: [...prev.languages, language.id]
                                                        }));
                                                    } else {
                                                        setProfileForm(prev => ({
                                                            ...prev,
                                                            languages: prev.languages.filter(id => id !== language.id)
                                                        }));
                                                    }
                                                }}
                                            />
                                            <span>{language.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="guide-account-form-actions">
                                <button
                                    className="guide-account-btn guide-account-btn-outline"
                                    onClick={() => setShowProfileModal(false)}
                                >
                                    {t('guide.actions.cancel')}
                                </button>
                                <button
                                    className="guide-account-btn guide-account-btn-primary"
                                    onClick={handleProfileSubmit}
                                >
                                    <FiSave /> {customerProfile ? t('guide.actions.save') : t('guide.actions.create')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Portfolio Modal */}
            {showPortfolioModal && (
                <div className="guide-account-modal-overlay" onClick={() => setShowPortfolioModal(false)}>
                    <div className="guide-account-modal" onClick={e => e.stopPropagation()}>
                        <div className="guide-account-modal-header">
                            <h3>{t('guide.modals.add_portfolio_item')}</h3>
                            <button onClick={() => setShowPortfolioModal(false)}>
                                <FiX />
                            </button>
                        </div>
                        <div className="guide-account-modal-content">
                            <div className="guide-account-form-group">
                                <label>{t('guide.portfolio.form.title')}</label>
                                <input
                                    type="text"
                                    value={portfolioForm.title}
                                    onChange={(e) => setPortfolioForm({...portfolioForm, title: e.target.value})}
                                    placeholder={t('guide.portfolio.form.title_placeholder')}
                                />
                            </div>

                            <div className="guide-account-form-group">
                                <label>{t('guide.portfolio.form.description')}</label>
                                <textarea
                                    value={portfolioForm.description}
                                    onChange={(e) => setPortfolioForm({...portfolioForm, description: e.target.value})}
                                    rows={3}
                                    placeholder={t('guide.portfolio.form.description_placeholder')}
                                />
                            </div>

                            <div className="guide-account-form-group">
                                <label>{t('guide.portfolio.form.image')}</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleFileUpload(e, 'portfolio')}
                                />
                            </div>

                            <div className="guide-account-form-group">
                                <label>{t('guide.portfolio.form.order')}</label>
                                <input
                                    type="number"
                                    value={portfolioForm.order}
                                    onChange={(e) => setPortfolioForm({...portfolioForm, order: Number(e.target.value)})}
                                    min="0"
                                />
                            </div>

                            <div className="guide-account-form-actions">
                                <button
                                    className="guide-account-btn guide-account-btn-outline"
                                    onClick={() => setShowPortfolioModal(false)}
                                >
                                    {t('guide.actions.cancel')}
                                </button>
                                <button
                                    className="guide-account-btn guide-account-btn-primary"
                                    onClick={handlePortfolioSubmit}
                                >
                                    <FiPlus /> {t('guide.actions.add')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Availability Modal */}
            {showAvailabilityModal && (
                <div className="guide-account-modal-overlay" onClick={() => setShowAvailabilityModal(false)}>
                    <div className="guide-account-modal" onClick={e => e.stopPropagation()}>
                        <div className="guide-account-modal-header">
                            <h3>{t('guide.modals.add_availability')}</h3>
                            <button onClick={() => setShowAvailabilityModal(false)}>
                                <FiX />
                            </button>
                        </div>
                        <div className="guide-account-modal-content">
                            <div className="guide-account-form-group">
                                <label>{t('guide.availability.form.date')}</label>
                                <input
                                    type="date"
                                    value={availabilityForm.date}
                                    onChange={(e) => setAvailabilityForm({...availabilityForm, date: e.target.value})}
                                />
                            </div>

                            <div className="guide-account-form-group">
                                <label className="guide-account-checkbox-item">
                                    <input
                                        type="checkbox"
                                        checked={availabilityForm.is_available}
                                        onChange={(e) => setAvailabilityForm({...availabilityForm, is_available: e.target.checked})}
                                    />
                                    <span>{t('guide.availability.form.is_available')}</span>
                                </label>
                            </div>

                            {availabilityForm.is_available && (
                                <>
                                    <div className="guide-account-form-row">
                                        <div className="guide-account-form-group">
                                            <label>{t('guide.availability.form.start_time')}</label>
                                            <input
                                                type="time"
                                                value={availabilityForm.start_time}
                                                onChange={(e) => setAvailabilityForm({...availabilityForm, start_time: e.target.value})}
                                            />
                                        </div>
                                        <div className="guide-account-form-group">
                                            <label>{t('guide.availability.form.end_time')}</label>
                                            <input
                                                type="time"
                                                value={availabilityForm.end_time}
                                                onChange={(e) => setAvailabilityForm({...availabilityForm, end_time: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                </>
                            )}

                            <div className="guide-account-form-group">
                                <label>{t('guide.availability.form.note')}</label>
                                <input
                                    type="text"
                                    value={availabilityForm.note}
                                    onChange={(e) => setAvailabilityForm({...availabilityForm, note: e.target.value})}
                                    placeholder={t('guide.availability.form.note_placeholder')}
                                />
                            </div>

                            <div className="guide-account-form-actions">
                                <button
                                    className="guide-account-btn guide-account-btn-outline"
                                    onClick={() => setShowAvailabilityModal(false)}
                                >
                                    {t('guide.actions.cancel')}
                                </button>
                                <button
                                    className="guide-account-btn guide-account-btn-primary"
                                    onClick={handleAvailabilitySubmit}
                                >
                                    <FiCalendar /> {t('guide.actions.add')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Document Upload Modal */}
            {showDocumentModal && (
                <div className="guide-account-modal-overlay" onClick={() => setShowDocumentModal(false)}>
                    <div className="guide-account-modal" onClick={e => e.stopPropagation()}>
                        <div className="guide-account-modal-header">
                            <h3>{t('guide.modals.upload_document')}</h3>
                            <button onClick={() => setShowDocumentModal(false)}>
                                <FiX />
                            </button>
                        </div>
                        <div className="guide-account-modal-content">
                            <div className="guide-account-form-group">
                                <label>{t('guide.documents.form.type')}</label>
                                <select
                                    value={documentForm.document_type}
                                    onChange={(e) => setDocumentForm({...documentForm, document_type: e.target.value})}
                                >
                                    <option value="certificate">{t('guide.documents.types.certificate')}</option>
                                    <option value="id_card">{t('guide.documents.types.id_card')}</option>
                                    <option value="passport">{t('guide.documents.types.passport')}</option>
                                    <option value="license">{t('guide.documents.types.license')}</option>
                                    <option value="other">{t('guide.documents.types.other')}</option>
                                </select>
                            </div>

                            <div className="guide-account-form-group">
                                <label>{t('guide.documents.form.file')}</label>
                                <input
                                    type="file"
                                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                    onChange={(e) => handleFileUpload(e, 'document')}
                                />
                            </div>

                            <div className="guide-account-form-group">
                                <label>{t('guide.documents.form.description')}</label>
                                <input
                                    type="text"
                                    value={documentForm.description}
                                    onChange={(e) => setDocumentForm({...documentForm, description: e.target.value})}
                                    placeholder={t('guide.documents.form.description_placeholder')}
                                />
                            </div>

                            <div className="guide-account-form-actions">
                                <button
                                    className="guide-account-btn guide-account-btn-outline"
                                    onClick={() => setShowDocumentModal(false)}
                                >
                                    {t('guide.actions.cancel')}
                                </button>
                                <button
                                    className="guide-account-btn guide-account-btn-primary"
                                    onClick={handleDocumentSubmit}
                                >
                                    <FiUpload /> {t('guide.actions.upload')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Settings Modal */}
            {showSettingsModal && (
                <div className="guide-account-modal-overlay" onClick={() => setShowSettingsModal(false)}>
                    <div className="guide-account-modal" onClick={e => e.stopPropagation()}>
                        <div className="guide-account-modal-header">
                            <h3>{t('guide.modals.settings')}</h3>
                            <button onClick={() => setShowSettingsModal(false)}>
                                <FiX />
                            </button>
                        </div>
                        <div className="guide-account-modal-content">
                            <div className="guide-account-settings-list">
                                <button
                                    className="guide-account-settings-item"
                                    onClick={() => {
                                        setShowSettingsModal(false);
                                        setShowProfileModal(true);
                                    }}
                                >
                                    <FiUser />
                                    <div>
                                        <strong>{t('guide.settings.profile_data')}</strong>
                                        <p>{t('guide.settings.profile_data_desc')}</p>
                                    </div>
                                </button>

                                <button
                                    className="guide-account-settings-item"
                                    onClick={() => {
                                        setShowSettingsModal(false);
                                        setShowPortfolioModal(true);
                                    }}
                                >
                                    <FiImage />
                                    <div>
                                        <strong>{t('guide.settings.portfolio')}</strong>
                                        <p>{t('guide.settings.portfolio_desc')}</p>
                                    </div>
                                </button>

                                <button
                                    className="guide-account-settings-item"
                                    onClick={() => {
                                        setShowSettingsModal(false);
                                        setShowAvailabilityModal(true);
                                    }}
                                >
                                    <FiCalendar />
                                    <div>
                                        <strong>{t('guide.settings.availability')}</strong>
                                        <p>{t('guide.settings.availability_desc')}</p>
                                    </div>
                                </button>

                                <button
                                    className="guide-account-settings-item"
                                    onClick={() => {
                                        setShowSettingsModal(false);
                                        setShowDocumentModal(true);
                                    }}
                                >
                                    <FiFileText />
                                    <div>
                                        <strong>{t('guide.settings.documents')}</strong>
                                        <p>{t('guide.settings.documents_desc')}</p>
                                    </div>
                                </button>

                                <button
                                    className="guide-account-settings-item"
                                    onClick={() => {
                                        setShowSettingsModal(false);
                                        setShowPasswordModal(true);
                                    }}
                                >
                                    <FiLock />
                                    <div>
                                        <strong>{t('guide.settings.change_password')}</strong>
                                        <p>{t('guide.settings.change_password_desc')}</p>
                                    </div>
                                </button>

                                <div className="guide-account-settings-item">
                                    <FiSettings />
                                    <div>
                                        <strong>{t('guide.settings.theme')}</strong>
                                        <select
                                            value={theme}
                                            onChange={(e) => setTheme(e.target.value)}
                                            className="guide-account-theme-select"
                                        >
                                            <option value="default">{t('theme.default')}</option>
                                            <option value="light">{t('theme.light')}</option>
                                            <option value="dark">{t('theme.dark')}</option>
                                            <option value="auto">{t('theme.auto')}</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Password Change Modal */}
            {showPasswordModal && (
                <div className="guide-account-modal-overlay" onClick={() => setShowPasswordModal(false)}>
                    <div className="guide-account-modal" onClick={e => e.stopPropagation()}>
                        <div className="guide-account-modal-header">
                            <h3>{t('guide.modals.change_password')}</h3>
                            <button onClick={() => setShowPasswordModal(false)}>
                                <FiX />
                            </button>
                        </div>
                        <div className="guide-account-modal-content">
                            {passwordError && (
                                <div className="guide-account-error-message">{passwordError}</div>
                            )}

                            <div className="guide-account-form-group">
                                <label>{t('guide.password.form.current_password')}</label>
                                <input
                                    type="password"
                                    value={passwordForm.current_password}
                                    onChange={(e) => setPasswordForm({...passwordForm, current_password: e.target.value})}
                                    placeholder={t('guide.password.form.current_password_placeholder')}
                                />
                            </div>

                            <div className="guide-account-form-group">
                                <label>{t('guide.password.form.new_password')}</label>
                                <input
                                    type="password"
                                    value={passwordForm.new_password}
                                    onChange={(e) => setPasswordForm({...passwordForm, new_password: e.target.value})}
                                    placeholder={t('guide.password.form.new_password_placeholder')}
                                />
                            </div>

                            <div className="guide-account-form-group">
                                <label>{t('guide.password.form.confirm_password')}</label>
                                <input
                                    type="password"
                                    value={passwordForm.confirm_password}
                                    onChange={(e) => setPasswordForm({...passwordForm, confirm_password: e.target.value})}
                                    placeholder={t('guide.password.form.confirm_password_placeholder')}
                                />
                            </div>

                            <div className="guide-account-form-actions">
                                <button
                                    className="guide-account-btn guide-account-btn-outline"
                                    onClick={() => setShowPasswordModal(false)}
                                >
                                    {t('guide.actions.cancel')}
                                </button>
                                <button
                                    className="guide-account-btn guide-account-btn-primary"
                                    onClick={handlePasswordSubmit}
                                >
                                    <FiLock /> {t('guide.actions.change')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Actions Floating Panel */}
            <div className="guide-account-quick-actions">
                <button
                    className="guide-account-quick-action"
                    onClick={() => setShowAvailabilityModal(true)}
                    title={t('guide.quick_actions.set_availability')}
                >
                    <FiCalendar />
                </button>
                <button
                    className="guide-account-quick-action"
                    onClick={() => setShowPortfolioModal(true)}
                    title={t('guide.quick_actions.add_portfolio')}
                >
                    <FiImage />
                </button>
                <button
                    className="guide-account-quick-action"
                    onClick={() => setShowDocumentModal(true)}
                    title={t('guide.quick_actions.upload_document')}
                >
                    <FiFileText />
                </button>
                <button
                    className="guide-account-quick-action"
                    onClick={() => setChatOpen(true)}
                    title={t('guide.quick_actions.open_chat')}
                >
                    <FiMessageSquare />
                    {stats.totalUnreadMessages > 0 && (
                        <div className="guide-account-quick-action-badge">
                            {stats.totalUnreadMessages}
                        </div>
                    )}
                </button>
            </div>

            {/* Additional Quick Stats */}
            {(availability.length > 0 || documents.length > 0) && (
                <div className="guide-account-additional-stats">
                    <div className="guide-account-stats-card">
                        <h4>{t('guide.stats.availability_title')}</h4>
                        <div className="guide-account-stats-list">
                            {availability.slice(0, 3).map((avail) => (
                                <div key={avail.id} className="guide-account-stat-item-small">
                                    <FiCalendar className={avail.is_available ? 'text-success' : 'text-danger'} />
                                    <span>{formatDate(avail.date)}</span>
                                    <span className={`guide-account-availability-status ${avail.is_available ? 'available' : 'unavailable'}`}>
                                        {avail.is_available ? t('guide.availability.available') : t('guide.availability.unavailable')}
                                    </span>
                                    <button
                                        className="guide-account-remove-btn-small"
                                        onClick={() => handleDeleteAvailability(avail.id)}
                                    >
                                        <FiX />
                                    </button>
                                </div>
                            ))}
                            {availability.length > 3 && (
                                <div className="guide-account-stat-item-more">
                                    +{availability.length - 3} {t('guide.stats.more_items')}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="guide-account-stats-card">
                        <h4>{t('guide.stats.documents_title')}</h4>
                        <div className="guide-account-stats-list">
                            {documents.slice(0, 3).map((doc) => (
                                <div key={doc.id} className="guide-account-stat-item-small">
                                    <FiFileText className={doc.is_verified ? 'text-success' : 'text-warning'} />
                                    <span>{t(`guide.documents.types.${doc.document_type}`)}</span>
                                    <span className={`guide-account-verification-status ${doc.is_verified ? 'verified' : 'pending'}`}>
                                        {doc.is_verified ? t('guide.verification.verified') : t('guide.verification.pending')}
                                    </span>
                                    <button
                                        className="guide-account-remove-btn-small"
                                        onClick={() => handleDeleteDocument(doc.id)}
                                    >
                                        <FiX />
                                    </button>
                                </div>
                            ))}
                            {documents.length > 3 && (
                                <div className="guide-account-stat-item-more">
                                    +{documents.length - 3} {t('guide.stats.more_items')}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GuideAccount;