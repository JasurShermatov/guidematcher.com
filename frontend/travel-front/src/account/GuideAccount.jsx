import React, { useState, useEffect, useMemo } from 'react';
import { FiUser, FiMail, FiLogOut, FiSettings, FiMapPin, FiX, FiCheck, FiCalendar, FiStar, FiDollarSign, FiImage, FiCheckCircle, FiUsers, FiClock, FiGlobe, FiAward, FiEdit, FiEye, FiMessageSquare, FiTrendingUp, FiHeart, FiPhone, FiDownload, FiLock, FiUpload, FiPlus, FiMinus } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import './GuideAccount.css';
import GuideChatWidget from './ChatWidgets';
import api, { getCurrentUser, updateUserProfile } from '../api/api';

const GuideAccount = () => {
    const { t } = useTranslation();

    const [theme, setTheme] = useState('default');
    const [chatOpen, setChatOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState(null);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [showPortfolioModal, setShowPortfolioModal] = useState(false);
    const [activeTab, setActiveTab] = useState('yangi');
    const [notifications, setNotifications] = useState([]);
    const [profileError, setProfileError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [loading, setLoading] = useState(true);

    // API call states
    const [statsError, setStatsError] = useState(false);
    const [requestsError, setRequestsError] = useState(false);
    const [chatError, setChatError] = useState(false);

    // User state - API'dan olinadi
    const [user, setUser] = useState({
        id: '',
        firstName: '',
        lastName: '',
        email: '',
        role: '',
        phone: '',
        city: '',
        country: '',
        profilePicture: '',
        joinDate: '',
        rating: 0,
        totalTours: 0,
        isOnline: false,
        lastSeen: ''
    });

    // Profile form state - API'dan olinadi
    const [profileForm, setProfileForm] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        bio: '',
        experience: '',
        languages: [],
        pricePerHour: 0,
        pricePerDay: 0,
        workHours: '',
        portfolio: [],
        certificates: [],
        specializations: [],
        avatar: null
    });

    // Password change form
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    // Language form
    const [languageForm, setLanguageForm] = useState({
        language: '',
        level: 'A1'
    });

    // API requests dan olinadi
    const [requests, setRequests] = useState([]);
    const [chatMessages, setChatMessages] = useState([]);
    const [guideStats, setGuideStats] = useState({
        totalTours: 0,
        averageRating: 0,
        responseRate: 0,
        earnings: 0
    });

    // API functions - faqat mavjud endpoint'lar ishlatiladi
    const fetchGuideStats = async () => {
        try {
            setStatsError(false);
            // Hozircha mavjud bo'lmagan endpoint
            // Backend'da yaratilganda comment'dan chiqarib ishlating
            throw new Error(t('guide.errors.stats_api_unavailable'));

            // const response = await api.get('guides/stats/');
            // setGuideStats(response.data);
        } catch (error) {
            console.error('Failed to fetch guide stats:', error);
            setStatsError(true);
            setGuideStats({
                totalTours: 0,
                averageRating: 0,
                responseRate: 0,
                earnings: 0
            });
        }
    };

    const fetchRequests = async () => {
        try {
            setRequestsError(false);
            // Hozircha mavjud bo'lmagan endpoint
            // Backend'da yaratilganda comment'dan chiqarib ishlating
            throw new Error(t('guide.errors.requests_api_unavailable'));

            // const response = await api.get('guides/requests/');
            // setRequests(response.data.results || []);
        } catch (error) {
            console.error('Failed to fetch requests:', error);
            setRequestsError(true);
            setRequests([]);
        }
    };

    const fetchChatMessages = async () => {
        try {
            setChatError(false);
            // Hozircha mavjud bo'lmagan endpoint
            // Backend'da yaratilganda comment'dan chiqarib ishlating
            throw new Error(t('guide.errors.chat_api_unavailable'));

            // const response = await api.get('guides/chats/');
            // setChatMessages(response.data.results || []);
        } catch (error) {
            console.error('Failed to fetch chat messages:', error);
            setChatError(true);
            setChatMessages([]);
        }
    };

    const updateGuideProfile = async (profileData) => {
        try {
            // Hozircha mavjud updateUserProfile'dan foydalanamiz
            const response = await updateUserProfile(profileData);
            return response;
        } catch (error) {
            throw error;
        }
    };

    const changePassword = async (passwordData) => {
        try {
            // Hozircha mavjud bo'lmagan endpoint
            // Backend'da yaratilganda comment'dan chiqarib ishlating
            throw new Error(t('guide.errors.password_api_unavailable'));

            // const response = await api.post('accounts/change-password/', passwordData);
            // return response.data;
        } catch (error) {
            throw error;
        }
    };

    const handleRequestAction = async (requestId, action, data = null) => {
        try {
            // Hozircha mavjud bo'lmagan endpoint
            // Backend'da yaratilganda comment'dan chiqarib ishlating
            throw new Error(t('guide.errors.request_action_unavailable'));

            // const response = await api.post(`guides/requests/${requestId}/${action}/`, data);
            // setRequests(prev => prev.map(req => {
            //     if (req.id === requestId) {
            //         return { ...req, ...response.data };
            //     }
            //     return req;
            // }));

            addNotification(t('guide.errors.request_service_unavailable'), 'error');
        } catch (error) {
            addNotification(error.message || t('guide.errors.general_error'), 'error');
        }
    };

    // Fetch user data on component mount
    useEffect(() => {
        const fetchUserData = async () => {
            try {
                setLoading(true);
                const userData = await getCurrentUser();

                setUser({
                    id: userData.id || '',
                    firstName: userData.first_name || '',
                    lastName: userData.last_name || '',
                    email: userData.email || '',
                    role: userData.role || '',
                    phone: userData.phone || '',
                    city: userData.city || '',
                    country: userData.country || '',
                    profilePicture: userData.profile_picture || '',
                    joinDate: userData.join_date || '',
                    rating: userData.rating || 0,
                    totalTours: userData.total_tours || 0,
                    isOnline: userData.is_online || false,
                    lastSeen: userData.last_seen || ''
                });

                setProfileForm({
                    firstName: userData.first_name || '',
                    lastName: userData.last_name || '',
                    email: userData.email || '',
                    phone: userData.phone || '',
                    bio: userData.bio || '',
                    experience: userData.experience || '',
                    languages: userData.languages || [],
                    pricePerHour: userData.price_per_hour || 0,
                    pricePerDay: userData.price_per_day || 0,
                    workHours: userData.work_hours || '',
                    portfolio: userData.portfolio || [],
                    certificates: userData.certificates || [],
                    specializations: userData.specializations || [],
                    avatar: null
                });

                // API'larni parallel chaqiramiz
                await Promise.allSettled([
                    fetchGuideStats(),
                    fetchRequests(),
                    fetchChatMessages()
                ]);

            } catch (error) {
                console.error('Failed to fetch user data:', error);
                addNotification(t('guide.errors.data_fetch_error'), 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, [t]);

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

    // Statistics
    const stats = useMemo(() => ({
        totalTours: guideStats.totalTours || 0,
        pendingRequests: Array.isArray(requests) ? requests.filter(r => r.status === 'pending').length : 0,
        confirmedTours: Array.isArray(requests) ? requests.filter(r => r.status === 'confirmed').length : 0,
        averageRating: guideStats.averageRating || 0,
        earnings: guideStats.earnings || 0,
        responseRate: guideStats.responseRate || 0,
        totalUnreadMessages: Array.isArray(chatMessages) ? chatMessages.reduce((sum, chat) => sum + (chat.unread_count || 0), 0) : 0
    }), [requests, chatMessages, guideStats]);

    // Notification handler
    const addNotification = (message, type) => {
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

    // Handle opening chat
    const openChat = (clientId) => {
        setSelectedClient(clientId);
        setChatOpen(true);
    };

    // Handle profile form submission
    const handleProfileSubmit = async () => {
        if (!profileForm.firstName || !profileForm.lastName || !profileForm.email) {
            setProfileError(t('guide.profile.validation.required_fields'));
            return;
        }

        try {
            const profileData = {
                first_name: profileForm.firstName,
                last_name: profileForm.lastName,
                email: profileForm.email,
                phone: profileForm.phone,
                bio: profileForm.bio,
                experience: profileForm.experience,
                price_per_hour: profileForm.pricePerHour,
                price_per_day: profileForm.pricePerDay,
                work_hours: profileForm.workHours
            };

            const updatedData = await updateGuideProfile(profileData);

            setUser(prev => ({
                ...prev,
                firstName: updatedData.first_name,
                lastName: updatedData.last_name,
                email: updatedData.email,
                phone: updatedData.phone || prev.phone,
                profilePicture: updatedData.profile_picture || prev.profilePicture
            }));

            addNotification(t('guide.profile.success.updated'), 'success');
            setShowProfileModal(false);
            setProfileError('');
        } catch (error) {
            setProfileError(error.message || t('guide.profile.errors.update_failed'));
        }
    };

    // Handle password change
    const handlePasswordSubmit = async () => {
        if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
            setPasswordError(t('guide.password.validation.all_fields_required'));
            return;
        }

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setPasswordError(t('guide.password.validation.passwords_not_match'));
            return;
        }

        if (passwordForm.newPassword.length < 8) {
            setPasswordError(t('guide.password.validation.min_length'));
            return;
        }

        try {
            await changePassword({
                current_password: passwordForm.currentPassword,
                new_password: passwordForm.newPassword
            });

            addNotification(t('guide.password.success.changed'), 'success');
            setShowPasswordModal(false);
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setPasswordError('');
        } catch (error) {
            setPasswordError(error.message || t('guide.password.errors.change_failed'));
        }
    };

    // Handle language addition
    const addLanguage = () => {
        if (languageForm.language.trim()) {
            setProfileForm(prev => ({
                ...prev,
                languages: [...prev.languages, { ...languageForm, id: Date.now() }]
            }));
            setLanguageForm({ language: '', level: 'A1' });
        }
    };

    // Handle language removal
    const removeLanguage = (id) => {
        setProfileForm(prev => ({
            ...prev,
            languages: prev.languages.filter(lang => lang.id !== id)
        }));
    };

    // Handle specialization addition
    const addSpecialization = (spec) => {
        if (spec.trim() && !profileForm.specializations.includes(spec)) {
            setProfileForm(prev => ({
                ...prev,
                specializations: [...prev.specializations, spec]
            }));
        }
    };

    // Handle specialization removal
    const removeSpecialization = (spec) => {
        setProfileForm(prev => ({
            ...prev,
            specializations: prev.specializations.filter(s => s !== spec)
        }));
    };

    // Handle file upload
    const handleFileUpload = (event, type) => {
        const file = event.target.files[0];
        if (file) {
            if (type === 'avatar') {
                setProfileForm(prev => ({ ...prev, avatar: file }));
            } else if (type === 'certificate') {
                setProfileForm(prev => ({
                    ...prev,
                    certificates: [...prev.certificates, { file, name: file.name, id: Date.now() }]
                }));
            }
        }
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
                                src={user.profilePicture || '/default-avatar.png'}
                                alt={t('guide.profile.profile_picture_alt')}
                                className="guide-account-avatar"
                            />
                            <div className={`guide-account-status-indicator ${user.isOnline ? 'online' : 'offline'}`}></div>
                        </div>
                        <div>
                            <h1>{user.firstName} {user.lastName}</h1>
                            <p className="guide-account-subtitle">{user.role} • {user.city}, {user.country}</p>
                            <div className="guide-account-rating">
                                <FiStar className="guide-account-star" />
                                <span>{user.rating}</span>
                                <span>({user.totalTours} {t('guide.header.tours')})</span>
                            </div>
                        </div>
                    </div>
                    <div className="guide-account-header-actions">
                        <div className="guide-account-quick-stats">
                            <div className="guide-account-stat-item">
                                <FiUsers />
                                <span>{stats.pendingRequests}</span>
                                <small>{t('guide.stats.new_requests')}</small>
                            </div>
                            <div className="guide-account-stat-item">
                                <FiCheckCircle />
                                <span>{stats.confirmedTours}</span>
                                <small>{t('guide.stats.confirmed')}</small>
                            </div>
                            <div className="guide-account-stat-item">
                                <FiDollarSign />
                                <span>${stats.earnings}</span>
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
                    <div className="guide-account-card">
                        <div className="guide-account-card-header">
                            <h3>{t('guide.profile.professional_profile')}</h3>
                            <button onClick={() => setShowProfileModal(true)} className="guide-account-edit-btn">
                                <FiEdit />
                            </button>
                        </div>
                        <div className="guide-account-profile-details">
                            <div className="guide-account-profile-item">
                                <FiUser />
                                <div>
                                    <strong>{t('guide.profile.bio')}</strong>
                                    <p>{profileForm.bio || t('guide.profile.no_bio')}</p>
                                </div>
                            </div>
                            <div className="guide-account-profile-item">
                                <FiAward />
                                <div>
                                    <strong>{t('guide.profile.experience')}</strong>
                                    <p>{profileForm.experience || t('guide.profile.no_experience')}</p>
                                </div>
                            </div>
                            <div className="guide-account-profile-item">
                                <FiGlobe />
                                <div>
                                    <strong>{t('guide.profile.languages')}</strong>
                                    <p>{Array.isArray(profileForm.languages) && profileForm.languages.length > 0 ? profileForm.languages.map(l => `${l.language} (${l.level})`).join(', ') : t('guide.profile.no_languages')}</p>
                                </div>
                            </div>
                            <div className="guide-account-profile-item">
                                <FiDollarSign />
                                <div>
                                    <strong>{t('guide.profile.pricing')}</strong>
                                    <p>
                                        {profileForm.pricePerHour > 0 ? t('guide.profile.hourly_rate', { rate: profileForm.pricePerHour }) : t('guide.profile.no_hourly_rate')}
                                        {profileForm.pricePerDay > 0 ? ` • ${t('guide.profile.daily_rate', { rate: profileForm.pricePerDay })}` : ` • ${t('guide.profile.no_daily_rate')}`}
                                    </p>
                                </div>
                            </div>
                            {Array.isArray(profileForm.portfolio) && profileForm.portfolio.length > 0 && (
                                <div className="guide-account-profile-portfolio">
                                    <strong>{t('guide.profile.portfolio')}</strong>
                                    <div className="guide-account-portfolio-preview">
                                        {profileForm.portfolio.slice(0, 3).map((img, index) => (
                                            <img key={index} src={img} alt={t('guide.profile.portfolio_item', { number: index + 1 })} onClick={() => setShowPortfolioModal(true)} />
                                        ))}
                                        {profileForm.portfolio.length > 3 && (
                                            <div className="guide-account-portfolio-more" onClick={() => setShowPortfolioModal(true)}>
                                                +{profileForm.portfolio.length - 3}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="guide-account-card">
                        <div className="guide-account-card-header">
                            <h3>{t('guide.statistics.title')}</h3>
                            {statsError && (
                                <span className="guide-account-error-badge" title={t('guide.errors.data_loading_error')}>
                                    <FiX />
                                </span>
                            )}
                        </div>
                        <div className="guide-account-stats-grid">
                            <div className="guide-account-stat">
                                <FiCheckCircle className="guide-account-stat-icon success" />
                                <div>
                                    <strong>{statsError ? '—' : stats.totalTours}</strong>
                                    <span>{t('guide.statistics.completed_tours')}</span>
                                </div>
                            </div>
                            <div className="guide-account-stat">
                                <FiStar className="guide-account-stat-icon warning" />
                                <div>
                                    <strong>{statsError ? '—' : stats.averageRating.toFixed(1)}</strong>
                                    <span>{t('guide.statistics.average_rating')}</span>
                                </div>
                            </div>
                            <div className="guide-account-stat">
                                <FiTrendingUp className="guide-account-stat-icon primary" />
                                <div>
                                    <strong>{statsError ? '—' : stats.responseRate}%</strong>
                                    <span>{t('guide.statistics.response_rate')}</span>
                                </div>
                            </div>
                            <div className="guide-account-stat">
                                <FiDollarSign className="guide-account-stat-icon success" />
                                <div>
                                    <strong>{statsError ? '—' : `$${stats.earnings}`}</strong>
                                    <span>{t('guide.statistics.total_earnings')}</span>
                                </div>
                            </div>
                        </div>
                        {statsError && (
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
                            <h3>{t('guide.requests.title')}</h3>
                            {requestsError && (
                                <span className="guide-account-error-badge" title={t('guide.errors.requests_loading_error')}>
                                    <FiX />
                                </span>
                            )}
                            <div className="guide-account-tabs">
                                <button
                                    className={`guide-account-tab ${activeTab === 'yangi' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('yangi')}
                                >
                                    {t('guide.requests.new')} ({requestsError ? '—' : Array.isArray(requests) ? requests.filter(r => r.status === 'pending').length : 0})
                                </button>
                                <button
                                    className={`guide-account-tab ${activeTab === 'tasdiqlangan' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('tasdiqlangan')}
                                >
                                    {t('guide.requests.confirmed')} ({requestsError ? '—' : Array.isArray(requests) ? requests.filter(r => r.status === 'confirmed').length : 0})
                                </button>
                                <button
                                    className={`guide-account-tab ${activeTab === 'tarix' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('tarix')}
                                >
                                    {t('guide.requests.history')} ({requestsError ? '—' : Array.isArray(requests) ? requests.filter(r => r.status === 'completed').length : 0})
                                </button>
                            </div>
                        </div>

                        <div className="guide-account-requests-list">
                            {requestsError ? (
                                <div className="guide-account-error-state">
                                    <FiX size={48} color="#ef4444" />
                                    <h3>{t('guide.errors.requests_loading_error_title')}</h3>
                                    <p>{t('guide.errors.requests_loading_error_desc')}</p>
                                    <button
                                        className="guide-account-btn guide-account-btn-outline"
                                        onClick={() => fetchRequests()}
                                    >
                                        {t('guide.actions.retry')}
                                    </button>
                                </div>
                            ) : !Array.isArray(requests) || requests.length === 0 ? (
                                <div className="guide-account-empty-state">
                                    <FiUsers size={48} />
                                    <h3>{t('guide.requests.no_requests_title')}</h3>
                                    <p>{t('guide.requests.no_requests_desc')}</p>
                                </div>
                            ) : (
                                requests
                                    .filter(req => {
                                        if (activeTab === 'yangi') return req.status === 'pending';
                                        if (activeTab === 'tasdiqlangan') return req.status === 'confirmed';
                                        if (activeTab === 'tarix') return req.status === 'completed';
                                        return false;
                                    })
                                    .map(request => (
                                        <div key={request.id} className="guide-account-request-item">
                                            <div className="guide-account-request-header">
                                                <div className="guide-account-client-info">
                                                    <div className="guide-account-client-avatar-container">
                                                        <img src={request.client?.profile_picture || '/default-avatar.png'} alt={request.client?.name} />
                                                        <div className={`guide-account-client-status ${request.client?.is_online ? 'online' : 'offline'}`}></div>
                                                    </div>
                                                    <div>
                                                        <h4>{request.client?.name || t('guide.requests.anonymous_client')}</h4>
                                                        <span className="guide-account-request-id">#{request.id}</span>
                                                    </div>
                                                </div>
                                                <div className="guide-account-request-meta">
                                                    <div className={`guide-account-status guide-account-status-${request.status}`}>
                                                        {request.status === 'pending' && t('guide.status.pending')}
                                                        {request.status === 'confirmed' && t('guide.status.confirmed')}
                                                        {request.status === 'completed' && t('guide.status.completed')}
                                                        {request.status === 'rejected' && t('guide.status.rejected')}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="guide-account-request-details">
                                                <div className="guide-account-request-info">
                                                    <div className="guide-account-info-item">
                                                        <FiCalendar />
                                                        <span>{request.date ? new Date(request.date).toLocaleDateString() : t('guide.requests.no_date')}</span>
                                                    </div>
                                                    <div className="guide-account-info-item">
                                                        <FiClock />
                                                        <span>{request.duration || t('guide.requests.no_duration')}</span>
                                                    </div>
                                                    <div className="guide-account-info-item">
                                                        <FiUsers />
                                                        <span>{request.travelers || t('guide.requests.no_travelers')}</span>
                                                    </div>
                                                    <div className="guide-account-info-item">
                                                        <FiDollarSign />
                                                        <span>${request.price || 0}</span>
                                                    </div>
                                                </div>

                                                <div className="guide-account-service-type">
                                                    <strong>{request.service_type || t('guide.requests.no_service_type')}</strong>
                                                    {request.notes && <p>{request.notes}</p>}
                                                    {request.rating && (
                                                        <div className="guide-account-rating">
                                                            <FiStar />
                                                            <span>{request.rating}/5</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {request.status === 'pending' && (
                                                <div className="guide-account-request-actions">
                                                    <button
                                                        className="guide-account-btn guide-account-btn-success"
                                                        onClick={() => handleRequestAction(request.id, 'accept')}
                                                    >
                                                        <FiCheck /> {t('guide.actions.accept')}
                                                    </button>
                                                    <button
                                                        className="guide-account-btn guide-account-btn-danger"
                                                        onClick={() => handleRequestAction(request.id, 'reject')}
                                                    >
                                                        <FiX /> {t('guide.actions.reject')}
                                                    </button>
                                                    <button
                                                        className="guide-account-btn guide-account-btn-outline"
                                                        onClick={() => openChat(request.client?.id)}
                                                    >
                                                        <FiMessageSquare /> {t('guide.actions.chat')}
                                                    </button>
                                                </div>
                                            )}

                                            {request.status === 'confirmed' && (
                                                <div className="guide-account-request-actions">
                                                    <button
                                                        className="guide-account-btn guide-account-btn-outline"
                                                        onClick={() => openChat(request.client?.id)}
                                                    >
                                                        <FiMessageSquare /> {t('guide.actions.chat_with_client')}
                                                    </button>
                                                    <button className="guide-account-btn guide-account-btn-primary">
                                                        <FiMapPin /> {t('guide.actions.view_route')}
                                                    </button>
                                                </div>
                                            )}

                                            {request.status === 'completed' && (
                                                <div className="guide-account-request-actions">
                                                    <button
                                                        className="guide-account-btn guide-account-btn-outline"
                                                        onClick={() => openChat(request.client?.id)}
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
                    {chatMessages && (
                        <GuideChatWidget
                            chatMessages={chatMessages}
                            setChatMessages={setChatMessages}
                            requests={requests}
                            openChat={openChat}
                            stats={stats}
                            chatOpen={chatOpen}
                            setChatOpen={setChatOpen}
                            selectedClient={selectedClient}
                        />
                    )}
                </div>
            </div>

            {/* Profile Modal */}
            {showProfileModal && (
                <div className="guide-account-modal-overlay" onClick={() => setShowProfileModal(false)}>
                    <div className="guide-account-modal guide-account-modal-large" onClick={e => e.stopPropagation()}>
                        <div className="guide-account-modal-header">
                            <h3>{t('guide.modals.edit_profile')}</h3>
                            <button onClick={() => setShowProfileModal(false)}>
                                <FiX />
                            </button>
                        </div>
                        <div className="guide-account-modal-content">
                            {profileError && (
                                <div className="guide-account-error-message">{profileError}</div>
                            )}

                            {/* Avatar Upload */}
                            <div className="guide-account-form-group">
                                <label>{t('guide.profile.form.avatar')}</label>
                                <div className="guide-account-avatar-upload">
                                    <img
                                        src={user.profilePicture || '/default-avatar.png'}
                                        alt={t('guide.profile.avatar_alt')}
                                        className="guide-account-avatar-preview"
                                    />
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleFileUpload(e, 'avatar')}
                                        id="avatar-upload"
                                        style={{ display: 'none' }}
                                    />
                                    <label htmlFor="avatar-upload" className="guide-account-upload-btn">
                                        <FiUpload /> {t('guide.profile.form.upload_image')}
                                    </label>
                                </div>
                            </div>

                            <div className="guide-account-form-row">
                                <div className="guide-account-form-group">
                                    <label>{t('guide.profile.form.first_name')} *</label>
                                    <input
                                        type="text"
                                        value={profileForm.firstName}
                                        onChange={(e) => setProfileForm({...profileForm, firstName: e.target.value})}
                                        placeholder={t('guide.profile.form.first_name_placeholder')}
                                    />
                                </div>
                                <div className="guide-account-form-group">
                                    <label>{t('guide.profile.form.last_name')} *</label>
                                    <input
                                        type="text"
                                        value={profileForm.lastName}
                                        onChange={(e) => setProfileForm({...profileForm, lastName: e.target.value})}
                                        placeholder={t('guide.profile.form.last_name_placeholder')}
                                    />
                                </div>
                            </div>

                            <div className="guide-account-form-row">
                                <div className="guide-account-form-group">
                                    <label>{t('guide.profile.form.email')} *</label>
                                    <input
                                        type="email"
                                        value={profileForm.email}
                                        onChange={(e) => setProfileForm({...profileForm, email: e.target.value})}
                                        placeholder={t('guide.profile.form.email_placeholder')}
                                    />
                                </div>
                                <div className="guide-account-form-group">
                                    <label>{t('guide.profile.form.phone')}</label>
                                    <input
                                        type="tel"
                                        value={profileForm.phone}
                                        onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
                                        placeholder={t('guide.profile.form.phone_placeholder')}
                                    />
                                </div>
                            </div>

                            <div className="guide-account-form-group">
                                <label>{t('guide.profile.form.bio')}</label>
                                <textarea
                                    value={profileForm.bio}
                                    onChange={(e) => setProfileForm({...profileForm, bio: e.target.value})}
                                    rows={4}
                                    placeholder={t('guide.profile.form.bio_placeholder')}
                                />
                            </div>

                            <div className="guide-account-form-group">
                                <label>{t('guide.profile.form.experience')}</label>
                                <textarea
                                    value={profileForm.experience}
                                    onChange={(e) => setProfileForm({...profileForm, experience: e.target.value})}
                                    rows={3}
                                    placeholder={t('guide.profile.form.experience_placeholder')}
                                />
                            </div>

                            {/* Languages Section */}
                            <div className="guide-account-form-group">
                                <label>{t('guide.profile.form.languages')}</label>
                                <div className="guide-account-languages-section">
                                    <div className="guide-account-add-language">
                                        <input
                                            type="text"
                                            value={languageForm.language}
                                            onChange={(e) => setLanguageForm({...languageForm, language: e.target.value})}
                                            placeholder={t('guide.profile.form.language_placeholder')}
                                        />
                                        <select
                                            value={languageForm.level}
                                            onChange={(e) => setLanguageForm({...languageForm, level: e.target.value})}
                                        >
                                            <option value="A1">A1</option>
                                            <option value="A2">A2</option>
                                            <option value="B1">B1</option>
                                            <option value="B2">B2</option>
                                            <option value="C1">C1</option>
                                            <option value="C2">C2</option>
                                            <option value="Native">{t('guide.profile.form.native_language')}</option>
                                        </select>
                                        <button type="button" onClick={addLanguage} className="guide-account-btn guide-account-btn-small">
                                            <FiPlus />
                                        </button>
                                    </div>
                                    <div className="guide-account-languages-list">
                                        {Array.isArray(profileForm.languages) && profileForm.languages.map((lang) => (
                                            <div key={lang.id} className="guide-account-language-item">
                                                <span>{lang.language} ({lang.level})</span>
                                                <button
                                                    type="button"
                                                    onClick={() => removeLanguage(lang.id)}
                                                    className="guide-account-remove-btn"
                                                >
                                                    <FiMinus />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Specializations */}
                            <div className="guide-account-form-group">
                                <label>{t('guide.profile.form.specializations')}</label>
                                <div className="guide-account-specializations-section">
                                    <input
                                        type="text"
                                        placeholder={t('guide.profile.form.specializations_placeholder')}
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                addSpecialization(e.target.value);
                                                e.target.value = '';
                                            }
                                        }}
                                    />
                                    <div className="guide-account-specializations-list">
                                        {Array.isArray(profileForm.specializations) && profileForm.specializations.map((spec, index) => (
                                            <div key={index} className="guide-account-specialization-item">
                                                <span>{spec}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => removeSpecialization(spec)}
                                                    className="guide-account-remove-btn"
                                                >
                                                    <FiX />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="guide-account-form-row">
                                <div className="guide-account-form-group">
                                    <label>{t('guide.profile.form.hourly_rate')}</label>
                                    <input
                                        type="number"
                                        value={profileForm.pricePerHour}
                                        onChange={(e) => setProfileForm({...profileForm, pricePerHour: Number(e.target.value)})}
                                        min="0"
                                        step="5"
                                    />
                                </div>
                                <div className="guide-account-form-group">
                                    <label>{t('guide.profile.form.daily_rate')}</label>
                                    <input
                                        type="number"
                                        value={profileForm.pricePerDay}
                                        onChange={(e) => setProfileForm({...profileForm, pricePerDay: Number(e.target.value)})}
                                        min="0"
                                        step="10"
                                    />
                                </div>
                            </div>

                            <div className="guide-account-form-group">
                                <label>{t('guide.profile.form.work_hours')}</label>
                                <input
                                    type="text"
                                    value={profileForm.workHours}
                                    onChange={(e) => setProfileForm({...profileForm, workHours: e.target.value})}
                                    placeholder={t('guide.profile.form.work_hours_placeholder')}
                                />
                            </div>

                            {/* Certificates Upload */}
                            <div className="guide-account-form-group">
                                <label>{t('guide.profile.form.certificates')}</label>
                                <div className="guide-account-certificates-section">
                                    <input
                                        type="file"
                                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                        onChange={(e) => handleFileUpload(e, 'certificate')}
                                        id="certificate-upload"
                                        style={{ display: 'none' }}
                                    />
                                    <label htmlFor="certificate-upload" className="guide-account-upload-btn">
                                        <FiUpload /> {t('guide.profile.form.upload_certificate')}
                                    </label>
                                    <div className="guide-account-certificates-list">
                                        {Array.isArray(profileForm.certificates) && profileForm.certificates.map((cert) => (
                                            <div key={cert.id} className="guide-account-certificate-item">
                                                <span>{cert.name}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setProfileForm(prev => ({
                                                        ...prev,
                                                        certificates: prev.certificates.filter(c => c.id !== cert.id)
                                                    }))}
                                                    className="guide-account-remove-btn"
                                                >
                                                    <FiX />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
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
                                    <FiCheck /> {t('guide.actions.save')}
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
                                    value={passwordForm.currentPassword}
                                    onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                                    placeholder={t('guide.password.form.current_password_placeholder')}
                                />
                            </div>

                            <div className="guide-account-form-group">
                                <label>{t('guide.password.form.new_password')}</label>
                                <input
                                    type="password"
                                    value={passwordForm.newPassword}
                                    onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                                    placeholder={t('guide.password.form.new_password_placeholder')}
                                />
                            </div>

                            <div className="guide-account-form-group">
                                <label>{t('guide.password.form.confirm_password')}</label>
                                <input
                                    type="password"
                                    value={passwordForm.confirmPassword}
                                    onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
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
                                    <FiCheck /> {t('guide.actions.change')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Portfolio Modal */}
            {showPortfolioModal && (
                <div className="guide-account-modal-overlay" onClick={() => setShowPortfolioModal(false)}>
                    <div className="guide-account-modal guide-account-modal-large" onClick={e => e.stopPropagation()}>
                        <div className="guide-account-modal-header">
                            <h3>{t('guide.modals.portfolio')}</h3>
                            <button onClick={() => setShowPortfolioModal(false)}>
                                <FiX />
                            </button>
                        </div>
                        <div className="guide-account-modal-content">
                            <div className="guide-account-portfolio-grid">
                                {Array.isArray(profileForm.portfolio) && profileForm.portfolio.map((img, index) => (
                                    <div key={index} className="guide-account-portfolio-item">
                                        <img src={img} alt={t('guide.profile.portfolio_item', { number: index + 1 })} />
                                        <div className="guide-account-portfolio-overlay">
                                            <button className="guide-account-portfolio-view">
                                                <FiEye />
                                            </button>
                                            <button className="guide-account-portfolio-delete">
                                                <FiX />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                <div className="guide-account-portfolio-add">
                                    <FiImage />
                                    <span>{t('guide.portfolio.add_new_image')}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GuideAccount;