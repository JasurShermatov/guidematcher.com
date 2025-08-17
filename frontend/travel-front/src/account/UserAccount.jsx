// src/account/UserAccount.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    FiUser,
    FiMail,
    FiLogOut,
    FiSettings,
    FiX,
    FiCheck,
    FiUsers,
    FiCalendar,
    FiStar,
    FiGlobe,
    FiDollarSign,
    FiTrash2,
    FiMenu,
    FiEdit,
    FiHeart,
    FiClock,
    FiPhone,
    FiMessageCircle,
    FiMapPin,
    FiFilter,
    FiEye,
    FiAlertCircle,
    FiSave,
    FiWifi,
    FiWifiOff,
    FiRefreshCw
} from 'react-icons/fi';
import UserChatWidget from './UserChatWidget';
import './UserAccount.css';
import { logoutUser } from '../api/api';
import api from '../api/api';

const UserAccount = ({ user, setUser, setIsAuthenticated }) => {
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();

    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(location.state?.openSettings || false);
    const [settingsError, setSettingsError] = useState('');
    const [settingsSuccess, setSettingsSuccess] = useState('');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('profile');
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [backendConnected, setBackendConnected] = useState(false);

    const [settingsForm, setSettingsForm] = useState({
        first_name: '',
        last_name: '',
        email: '',
        role: 'Client',
        country: ''
    });

    const [originalData, setOriginalData] = useState({});
    const [guides] = useState([]);
    const [bookings] = useState([]);
    const [chatMessages] = useState({});
    const [filter, setFilter] = useState({
        name: '',
        minRating: '',
        language: '',
        maxPrice: '',
        location: ''
    });
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [bookingDate, setBookingDate] = useState('');
    const [travelers, setTravelers] = useState({ adults: 1, children: 0 });
    const [showBookingSummary, setShowBookingSummary] = useState(null);
    const [dataLoaded, setDataLoaded] = useState(false);

    const fetchUserFromAccounts = useCallback(async () => {
        try {
            console.log(t('user.console.fetching_user_data'));
            const token = localStorage.getItem('access_token');
            if (!token) {
                throw new Error(t('user.errors.no_access_token'));
            }

            const response = await api.post('accounts/refresh/', {
                refresh: localStorage.getItem('refresh_token')
            });

            console.log(t('user.console.accounts_api_response'), response.data);

            const savedUserData = localStorage.getItem('user_data');
            if (savedUserData) {
                const userData = JSON.parse(savedUserData);
                console.log(t('user.console.retrieved_user_data'), userData);
                return userData;
            }

            throw new Error(t('user.errors.user_data_not_found'));
        } catch (error) {
            console.error(t('user.console.error_fetching_user'), error);
            throw error;
        }
    }, [t]);

    const fetchUserData = useCallback(async () => {
        if (dataLoaded) {
            return;
        }

        try {
            setLoading(true);
            setSettingsError('');
            setBackendConnected(false);

            console.log(t('user.console.attempting_fetch_user_data'));

            const savedUserData = localStorage.getItem('user_data');
            let userData;

            if (savedUserData) {
                userData = JSON.parse(savedUserData);
                console.log(t('user.console.using_saved_user_data'), userData);
                setBackendConnected(true);
            } else {
                userData = await fetchUserFromAccounts();
                setBackendConnected(true);
            }

            const userInfo = {
                id: userData.id,
                first_name: userData.first_name || '',
                last_name: userData.last_name || '',
                email: userData.email || '',
                role: userData.role || 'Client',
                country: userData.country || ''
            };

            setUser(prevUser => ({
                ...prevUser,
                ...userInfo
            }));

            const formData = {
                first_name: userInfo.first_name,
                last_name: userInfo.last_name,
                email: userInfo.email,
                role: userInfo.role,
                country: userInfo.country
            };

            setSettingsForm(formData);
            setOriginalData(formData);
            setDataLoaded(true);

            console.log(t('user.console.user_data_loaded'), userInfo);
        } catch (error) {
            console.error(t('user.console.failed_fetch_user_data'), error);
            setBackendConnected(false);

            if (user && user.email) {
                console.log(t('user.console.using_fallback_user_data'), user);

                const fallbackData = {
                    first_name: user.first_name || '',
                    last_name: user.last_name || '',
                    email: user.email || '',
                    role: user.role || 'Client',
                    country: user.country || ''
                };

                setSettingsForm(fallbackData);
                setOriginalData(fallbackData);
                setDataLoaded(true);
                setSettingsError(t('user.errors.backend_not_connected_fallback'));
            } else {
                setSettingsError(t('user.errors.backend_and_user_data_missing'));
            }
        } finally {
            setLoading(false);
        }
    }, [dataLoaded, setUser, user, fetchUserFromAccounts, t]);

    const updateUserProfileViaAccounts = async (payload) => {
        try {
            console.log(t('user.console.attempting_update_profile'));

            const currentUserData = JSON.parse(localStorage.getItem('user_data') || '{}');
            const updatedUserData = {
                ...currentUserData,
                ...payload
            };

            localStorage.setItem('user_data', JSON.stringify(updatedUserData));

            console.log(t('user.console.profile_updated_localstorage'), updatedUserData);
            return updatedUserData;
        } catch (error) {
            console.error(t('user.console.error_updating_profile'), error);
            throw new Error(t('user.errors.no_profile_update_endpoint'));
        }
    };

    const retryConnection = useCallback(async () => {
        setDataLoaded(false);
        await fetchUserData();
    }, [fetchUserData]);

    useEffect(() => {
        fetchUserData();
    }, [fetchUserData]);

    const handleSettingsChange = (e) => {
        const { name, value } = e.target;
        setSettingsForm(prev => ({ ...prev, [name]: value }));
        setSettingsError('');
        setSettingsSuccess('');
    };

    const handleSettingsSubmit = async (e) => {
        e.preventDefault();
        const { first_name, last_name, email, role, country } = settingsForm;

        if (!first_name.trim() || !last_name.trim() || !email.trim()) {
            setSettingsError(t('user.validation.required_fields'));
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            setSettingsError(t('user.validation.invalid_email'));
            return;
        }

        try {
            setUpdating(true);
            setSettingsError('');
            setSettingsSuccess('');

            const payload = {
                first_name: first_name.trim(),
                last_name: last_name.trim(),
                email: email.trim().toLowerCase(),
                role: role,
                country: country.trim()
            };

            console.log(t('user.console.updating_profile_payload'), payload);

            const updatedData = await updateUserProfileViaAccounts(payload);
            console.log(t('user.console.profile_update_response'), updatedData);

            const userInfo = {
                id: updatedData.id,
                first_name: updatedData.first_name,
                last_name: updatedData.last_name,
                email: updatedData.email,
                role: updatedData.role,
                country: updatedData.country
            };

            setUser(prevUser => ({
                ...prevUser,
                ...userInfo
            }));

            const newFormData = {
                first_name: userInfo.first_name,
                last_name: userInfo.last_name,
                email: userInfo.email,
                role: userInfo.role,
                country: userInfo.country
            };

            setSettingsForm(newFormData);
            setOriginalData(newFormData);

            setSettingsSuccess(t('user.success.profile_updated'));

            setTimeout(() => {
                setIsSettingsOpen(false);
                setSettingsSuccess('');
            }, 1500);
        } catch (error) {
            console.error(t('user.console.profile_update_error'), error);
            setSettingsError(error.message || t('user.errors.profile_update_failed'));
        } finally {
            setUpdating(false);
        }
    };

    const handleLogout = async () => {
        if (window.confirm(t('user.confirm_logout'))) {
            try {
                await logoutUser();
                console.log(t('user.console.logout_success'));
            } catch (error) {
                console.error(t('user.console.logout_error'), error);
            } finally {
                setIsAuthenticated(false);
                setUser(null);
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                localStorage.removeItem('user_data');
                navigate('/');
            }
        }
    };

    const handleResetForm = () => {
        setSettingsForm(originalData);
        setSettingsError('');
        setSettingsSuccess('');
    };

    const hasChanges = () => {
        return JSON.stringify(settingsForm) !== JSON.stringify(originalData);
    };

    const handleFilterChange = (e) => {
        setFilter({ ...filter, [e.target.name]: e.target.value });
    };

    const handleTravelersChange = (e) => {
        setTravelers({ ...travelers, [e.target.name]: Math.max(0, parseInt(e.target.value) || 0) });
    };

    const handleBookGuide = () => {
        alert(t('user.alerts.booking_api_unavailable'));
    };

    const handleCancelBooking = () => {
        alert(t('user.alerts.cancel_booking_api_unavailable'));
    };

    const toggleChatWidget = () => {
        alert(t('user.alerts.chat_api_unavailable'));
    };

    const APINotConnected = ({ message, icon: Icon = FiAlertCircle }) => (
        <div className="user-account-api-error">
            <Icon size={32} />
            <h3>{t('user.api_not_connected.title')}</h3>
            <p>{message}</p>
            <div className="user-account-api-error-badge">
                <FiAlertCircle size={16} />
                <span>{t('user.api_not_connected.soon_available')}</span>
            </div>
        </div>
    );

    const BackendStatus = () => (
        <div className={`user-account-backend-status ${backendConnected ? 'connected' : 'disconnected'}`}>
            {backendConnected ? (
                <>
                    <FiWifi size={16} />
                    <span>{t('user.backend_status.connected')}</span>
                </>
            ) : (
                <>
                    <FiWifiOff size={16} />
                    <span>{t('user.backend_status.disconnected')}</span>
                    <button
                        className="user-account-retry-btn"
                        onClick={retryConnection}
                        title={t('user.actions.retry_connection')}
                    >
                        <FiRefreshCw size={14} />
                    </button>
                </>
            )}
        </div>
    );

    if (loading) {
        return (
            <div className="user-account">
                <div className="user-account-loading">
                    <div className="user-account-spinner"></div>
                    <p>{t('user.loading.data')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="user-account">
            <BackendStatus />

            <button
                className="user-account-mobile-menu-btn"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label={t('user.actions.menu')}
            >
                <FiMenu size={24} />
            </button>

            <div className="user-account-container">
                <aside className={`user-account-sidebar ${isMobileMenuOpen ? 'user-account-sidebar-open' : ''}`}>
                    <div className="user-account-sidebar-header">
                        <div className="user-account-avatar-container">
                            <div className="user-account-avatar-placeholder">
                                <FiUser size={40} />
                            </div>
                        </div>
                        <h3 className="user-account-sidebar-name">
                            {user?.first_name ? `${user.first_name} ${user.last_name}` : t('user.profile.user')}
                        </h3>
                        <p className="user-account-sidebar-role">{user?.role || t('user.profile.client')}</p>
                    </div>

                    <nav className="user-account-sidebar-nav">
                        <button
                            className={`user-account-nav-item ${activeTab === 'profile' ? 'user-account-nav-item-active' : ''}`}
                            onClick={() => {
                                setActiveTab('profile');
                                setIsMobileMenuOpen(false);
                            }}
                        >
                            <FiUser size={20} />
                            <span>{t('user.tabs.profile')}</span>
                            {backendConnected && <span className="user-account-nav-status">✓</span>}
                        </button>

                        <button
                            className={`user-account-nav-item ${activeTab === 'bookings' ? 'user-account-nav-item-active' : ''}`}
                            onClick={() => {
                                setActiveTab('bookings');
                                setIsMobileMenuOpen(false);
                            }}
                        >
                            <FiCalendar size={20} />
                            <span>{t('user.tabs.bookings')}</span>
                            <span className="user-account-nav-badge">{t('user.api_not_connected.badge')}</span>
                        </button>

                        <button
                            className={`user-account-nav-item ${activeTab === 'guides' ? 'user-account-nav-item-active' : ''}`}
                            onClick={() => {
                                setActiveTab('guides');
                                setIsMobileMenuOpen(false);
                            }}
                        >
                            <FiUsers size={20} />
                            <span>{t('user.tabs.guides')}</span>
                            <span className="user-account-nav-badge">{t('user.api_not_connected.badge')}</span>
                        </button>

                        <button
                            className="user-account-nav-item"
                            onClick={() => setIsSettingsOpen(true)}
                        >
                            <FiSettings size={20} />
                            <span>{t('user.modals.settings')}</span>
                            {backendConnected && <span className="user-account-nav-status">✓</span>}
                        </button>

                        <button
                            className="user-account-nav-item user-account-nav-logout"
                            onClick={handleLogout}
                        >
                            <FiLogOut size={20} />
                            <span>{t('user.actions.logout')}</span>
                        </button>
                    </nav>
                </aside>

                <main className="user-account-main">
                    {activeTab === 'profile' && (
                        <div className="user-account-content">
                            <div className="user-account-content-header">
                                <h1 className="user-account-title">{t('user.profile.title')}</h1>
                                <p className="user-account-subtitle">{t('user.profile.subtitle')}</p>
                                {settingsError && (
                                    <div className="user-account-warning-alert">
                                        <FiAlertCircle />
                                        <div className="user-account-warning-alert-content">
                                            <div className="user-account-warning-alert-title">{t('user.alerts.warning')}</div>
                                            <p className="user-account-warning-alert-text">{settingsError}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="user-account-profile-section">
                                <div className="user-account-profile-card">
                                    <div className="user-account-profile-header">
                                        <div className="user-account-avatar-container">
                                            <div className="user-account-avatar-placeholder user-account-profile-avatar-large">
                                                <FiUser size={50} />
                                            </div>
                                        </div>
                                        <div className="user-account-profile-info">
                                            <h2 className="user-account-profile-name">
                                                {user?.first_name ? `${user.first_name} ${user.last_name}` : t('user.profile.user')}
                                            </h2>
                                            <p className="user-account-profile-role">{user?.role || t('user.profile.client')}</p>
                                            <div className="user-account-profile-status">
                                                <span className={`user-account-status-indicator ${backendConnected ? 'user-account-status-online' : 'user-account-status-offline'}`}></span>
                                                {backendConnected ? t('user.backend_status.connected') : t('user.backend_status.disconnected')}
                                            </div>
                                        </div>
                                        <button
                                            className="user-account-edit-btn"
                                            onClick={() => setIsSettingsOpen(true)}
                                            aria-label={t('user.actions.edit_profile')}
                                        >
                                            <FiEdit size={18} />
                                        </button>
                                    </div>

                                    <div className="user-account-profile-details">
                                        <div className="user-account-detail-item">
                                            <div className="user-account-detail-icon">
                                                <FiMail />
                                            </div>
                                            <div className="user-account-detail-content">
                                                <span className="user-account-detail-label">{t('user.profile.email')}</span>
                                                <span className="user-account-detail-value">{user?.email || t('user.profile.no_email')}</span>
                                            </div>
                                        </div>

                                        <div className="user-account-detail-item">
                                            <div className="user-account-detail-icon">
                                                <FiUser />
                                            </div>
                                            <div className="user-account-detail-content">
                                                <span className="user-account-detail-label">{t('user.profile.first_name')}</span>
                                                <span className="user-account-detail-value">{user?.first_name || t('user.profile.no_first_name')}</span>
                                            </div>
                                        </div>

                                        <div className="user-account-detail-item">
                                            <div className="user-account-detail-icon">
                                                <FiUser />
                                            </div>
                                            <div className="user-account-detail-content">
                                                <span className="user-account-detail-label">{t('user.profile.last_name')}</span>
                                                <span className="user-account-detail-value">{user?.last_name || t('user.profile.no_last_name')}</span>
                                            </div>
                                        </div>

                                        <div className="user-account-detail-item">
                                            <div className="user-account-detail-icon">
                                                <FiStar />
                                            </div>
                                            <div className="user-account-detail-content">
                                                <span className="user-account-detail-label">{t('user.profile.role')}</span>
                                                <span className="user-account-detail-value">{user?.role || t('user.profile.client')}</span>
                                            </div>
                                        </div>

                                        <div className="user-account-detail-item">
                                            <div className="user-account-detail-icon">
                                                <FiGlobe />
                                            </div>
                                            <div className="user-account-detail-content">
                                                <span className="user-account-detail-label">{t('user.profile.country')}</span>
                                                <span className="user-account-detail-value">{user?.country || t('user.profile.no_country')}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="user-account-stats-grid">
                                    <div className="user-account-stat-card">
                                        <div className="user-account-stat-icon">
                                            <FiCalendar />
                                        </div>
                                        <div className="user-account-stat-content">
                                            <span className="user-account-stat-number">0</span>
                                            <span className="user-account-stat-label">{t('user.stats.total_bookings')}</span>
                                            <small className="user-account-api-notice">{t('user.api_not_connected.badge')}</small>
                                        </div>
                                    </div>

                                    <div className="user-account-stat-card">
                                        <div className="user-account-stat-icon">
                                            <FiUsers />
                                        </div>
                                        <div className="user-account-stat-content">
                                            <span className="user-account-stat-number">0</span>
                                            <span className="user-account-stat-label">{t('user.stats.active_chats')}</span>
                                            <small className="user-account-api-notice">{t('user.api_not_connected.badge')}</small>
                                        </div>
                                    </div>

                                    <div className="user-account-stat-card">
                                        <div className="user-account-stat-icon">
                                            <FiCheck />
                                        </div>
                                        <div className="user-account-stat-content">
                                            <span className="user-account-stat-number">{backendConnected ? '✓' : '△'}</span>
                                            <span className="user-account-stat-label">{t('user.stats.accounts_api')}</span>
                                            <small className={`user-account-api-notice ${backendConnected ? 'connected' : ''}`}>
                                                {backendConnected ? t('user.backend_status.connected') : t('user.backend_status.disconnected')}
                                            </small>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'bookings' && (
                        <div className="user-account-content">
                            <div className="user-account-content-header">
                                <h1 className="user-account-title">{t('user.bookings.title')}</h1>
                                <p className="user-account-subtitle">{t('user.bookings.subtitle')}</p>
                            </div>

                            <APINotConnected
                                message={t('user.api_not_connected.bookings')}
                                icon={FiCalendar}
                            />
                        </div>
                    )}

                    {activeTab === 'guides' && (
                        <div className="user-account-content">
                            <div className="user-account-content-header">
                                <h1 className="user-account-title">{t('user.guides.title')}</h1>
                                <p className="user-account-subtitle">{t('user.guides.subtitle')}</p>
                            </div>

                            <APINotConnected
                                message={t('user.api_not_connected.guides')}
                                icon={FiUsers}
                            />

                            <div className="user-account-search-section user-account-disabled">
                                <div className="user-account-search-form">
                                    <div className="user-account-form-group">
                                        <label>{t('user.guides.travel_date')}</label>
                                        <input
                                            type="date"
                                            value={bookingDate}
                                            onChange={(e) => setBookingDate(e.target.value)}
                                            className="user-account-input"
                                            disabled
                                        />
                                    </div>

                                    <div className="user-account-form-group">
                                        <label>{t('user.guides.travelers_count')}</label>
                                        <div className="user-account-travelers-inputs">
                                            <input
                                                type="number"
                                                name="adults"
                                                value={travelers.adults}
                                                onChange={handleTravelersChange}
                                                placeholder={t('user.guides.adults')}
                                                className="user-account-input"
                                                disabled
                                            />
                                            <input
                                                type="number"
                                                name="children"
                                                value={travelers.children}
                                                onChange={handleTravelersChange}
                                                placeholder={t('user.guides.children')}
                                                className="user-account-input"
                                                disabled
                                            />
                                        </div>
                                    </div>

                                    <button
                                        className="user-account-btn user-account-btn-outline"
                                        disabled
                                    >
                                        <FiFilter /> {t('user.actions.filters')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </main>

                {isSettingsOpen && (
                    <div className="user-account-modal-overlay" onClick={() => setIsSettingsOpen(false)}>
                        <div className="user-account-modal" onClick={e => e.stopPropagation()}>
                            <div className="user-account-modal-header">
                                <h3>{t('user.modals.settings')}</h3>
                                <div className="user-account-modal-header-status">
                                    {backendConnected ? (
                                        <span className="user-account-connection-status connected">
                                            <FiWifi size={16} /> {t('user.backend_status.connected')}
                                        </span>
                                    ) : (
                                        <span className="user-account-connection-status disconnected">
                                            <FiWifiOff size={16} /> {t('user.backend_status.disconnected')}
                                        </span>
                                    )}
                                </div>
                                <button onClick={() => setIsSettingsOpen(false)} aria-label={t('user.actions.close')}>
                                    <FiX size={24} />
                                </button>
                            </div>
                            <div className="user-account-modal-content">
                                {settingsError && (
                                    <div className="user-account-error-message">
                                        <FiAlertCircle size={16} />
                                        {settingsError}
                                    </div>
                                )}
                                {settingsSuccess && (
                                    <div className="user-account-success-message">
                                        <FiCheck size={16} />
                                        {settingsSuccess}
                                    </div>
                                )}
                                <form onSubmit={handleSettingsSubmit}>
                                    <div className="user-account-form-row">
                                        <div className="user-account-form-group">
                                            <label htmlFor="first_name">{t('user.form.first_name')} *</label>
                                            <input
                                                type="text"
                                                id="first_name"
                                                name="first_name"
                                                value={settingsForm.first_name}
                                                onChange={handleSettingsChange}
                                                placeholder={t('user.form.first_name_placeholder')}
                                                className="user-account-input"
                                                required
                                                maxLength={50}
                                                disabled={updating}
                                            />
                                        </div>
                                        <div className="user-account-form-group">
                                            <label htmlFor="last_name">{t('user.form.last_name')} *</label>
                                            <input
                                                type="text"
                                                id="last_name"
                                                name="last_name"
                                                value={settingsForm.last_name}
                                                onChange={handleSettingsChange}
                                                placeholder={t('user.form.last_name_placeholder')}
                                                className="user-account-input"
                                                required
                                                maxLength={50}
                                                disabled={updating}
                                            />
                                        </div>
                                    </div>

                                    <div className="user-account-form-group">
                                        <label htmlFor="email">{t('user.form.email')} *</label>
                                        <input
                                            type="email"
                                            id="email"
                                            name="email"
                                            value={settingsForm.email}
                                            onChange={handleSettingsChange}
                                            placeholder={t('user.form.email_placeholder')}
                                            className="user-account-input"
                                            required
                                            disabled={updating}
                                        />
                                    </div>

                                    <div className="user-account-form-row">
                                        <div className="user-account-form-group">
                                            <label htmlFor="role">{t('user.form.role')}</label>
                                            <select
                                                id="role"
                                                name="role"
                                                value={settingsForm.role}
                                                onChange={handleSettingsChange}
                                                className="user-account-select"
                                                disabled={updating}
                                            >
                                                <option value="Client">{t('user.form.client')}</option>
                                                <option value="Customer">{t('user.form.customer')}</option>
                                            </select>
                                        </div>
                                        <div className="user-account-form-group">
                                            <label htmlFor="country">{t('user.form.country')}</label>
                                            <input
                                                type="text"
                                                id="country"
                                                name="country"
                                                value={settingsForm.country}
                                                onChange={handleSettingsChange}
                                                placeholder={t('user.form.country_placeholder')}
                                                className="user-account-input"
                                                maxLength={100}
                                                disabled={updating}
                                            />
                                        </div>
                                    </div>

                                    <div className="user-account-info-alert">
                                        <FiAlertCircle />
                                        <div className="user-account-info-alert-content">
                                            <div className="user-account-info-alert-title">{t('user.alerts.info')}</div>
                                            <p className="user-account-info-alert-text">{t('user.alerts.localstorage_notice')}</p>
                                        </div>
                                    </div>

                                    <div className="user-account-form-actions">
                                        <button
                                            type="button"
                                            className="user-account-btn user-account-btn-outline"
                                            onClick={handleResetForm}
                                            disabled={!hasChanges()}
                                        >
                                            <FiX /> {t('user.actions.cancel')}
                                        </button>

                                        <button
                                            type="submit"
                                            className="user-account-btn user-account-btn-primary"
                                            disabled={updating || !hasChanges()}
                                        >
                                            {updating ? (
                                                <>
                                                    <div className="user-account-btn-spinner"></div>
                                                    {t('user.actions.saving')}
                                                </>
                                            ) : (
                                                <>
                                                    <FiSave /> {t('user.actions.save_localstorage')}
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {settingsSuccess && !isSettingsOpen && (
                    <div className="user-account-notification">
                        <FiCheck size={20} />
                        <span>{settingsSuccess}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserAccount;