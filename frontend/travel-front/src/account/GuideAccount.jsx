import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    getCustomerProfile,
    createCustomerProfile,
    updateCustomerProfile,
    getMyBookings,
    acceptBooking,
    cancelBooking,
    getMyReviews,
    getReviewSummary,
    reactToReview,
    removeReactionFromReview,
    getMyPortfolio,
    createPortfolioItem,
    updatePortfolioItem,
    deletePortfolioItem,
    getMyAvailability,
    createAvailability,
    updateAvailability,
    deleteAvailability,
    getServiceTypes,
    getLanguages,
    getCities,
    getCurrentUser
} from '../api/api';
import ChatWidgets from './ChatWidgets';
import './GuideAccount.css';

const GuideAccount = () => {
    const { t } = useTranslation();
    const [currentUser, setCurrentUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [bookings, setBookings] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [reviewSummary, setReviewSummary] = useState(null);
    const [portfolio, setPortfolio] = useState([]);
    const [availability, setAvailability] = useState([]);
    const [serviceTypes, setServiceTypes] = useState([]);
    const [languages, setLanguages] = useState([]);
    const [cities, setCities] = useState([]);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showProfileForm, setShowProfileForm] = useState(false);
    const [showPortfolioForm, setShowPortfolioForm] = useState(false);
    const [showAvailabilityForm, setShowAvailabilityForm] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [editingPortfolioItem, setEditingPortfolioItem] = useState(null);
    const [editingAvailability, setEditingAvailability] = useState(null);
    const [selectedBookingForCancel, setSelectedBookingForCancel] = useState(null);
    const [showChat, setShowChat] = useState(false);
    const [selectedUserForChat, setSelectedUserForChat] = useState(null);
    const [reviewFilter, setReviewFilter] = useState({
        minRating: '',
        sortBy: 'date_desc'
    });
    const [showReactionForm, setShowReactionForm] = useState(null);
    const [reactionForm, setReactionForm] = useState({
        reactionType: 'like',
        comment: ''
    });
    const [profileForm, setProfileForm] = useState({
        professional_bio: '',
        years_of_experience: 0,
        service_types: [],
        city: '',
        service_areas: '',
        hourly_rate: '',
        daily_rate: '',
        currency: 'USD',
        languages: [],
        is_available: true
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

    useEffect(() => {
        initializeData();
    }, []);

    const initializeData = async () => {
        try {
            setLoading(true);
            const userData = await getCurrentUser();
            setCurrentUser(userData);
            const [serviceTypesData, languagesData, citiesData] = await Promise.all([
                getServiceTypes(),
                getLanguages(),
                getCities()
            ]);
            setServiceTypes(serviceTypesData.results || serviceTypesData);
            setLanguages(languagesData.results || languagesData);
            setCities(citiesData.results || citiesData);
            try {
                const profileData = await getCustomerProfile();
                setProfile(profileData);
                setProfileForm({
                    professional_bio: profileData.professional_bio || '',
                    years_of_experience: profileData.years_of_experience || 0,
                    service_types: profileData.service_types || [],
                    city: profileData.city || '',
                    service_areas: profileData.service_areas || '',
                    hourly_rate: profileData.hourly_rate || '',
                    daily_rate: profileData.daily_rate || '',
                    currency: profileData.currency || 'USD',
                    languages: profileData.languages || [],
                    is_available: profileData.is_available !== undefined ? profileData.is_available : true
                });
                await Promise.all([
                    loadBookings(),
                    loadReviews(),
                    loadPortfolio(),
                    loadAvailability(),
                    loadReviewSummary()
                ]);
            } catch (profileError) {
                console.log(t('guideAccount.error.noProfile'));
                setShowProfileForm(true);
            }
        } catch (err) {
            console.error('Error initializing data:', err);
            setError(t('guideAccount.error.requiredFields'));
        } finally {
            setLoading(false);
        }
    };

    const loadBookings = async () => {
        try {
            const data = await getMyBookings();
            setBookings(data.results || data);
        } catch (err) {
            console.error('Error loading bookings:', err);
            setError(t('guideAccount.error.failedToLoadBookings'));
        }
    };

    const loadReviews = async () => {
        try {
            const data = await getMyReviews();
            setReviews(data.results || data);
        } catch (err) {
            console.error('Error loading reviews:', err);
            setError(t('guideAccount.error.failedToLoadReviews'));
        }
    };

    const loadReviewSummary = async () => {
        try {
            if (profile) {
                const summary = await getReviewSummary(profile.id);
                setReviewSummary(summary);
            }
        } catch (err) {
            console.error('Error loading review summary:', err);
            setError(t('guideAccount.error.failedToLoadReviewSummary'));
        }
    };

    const loadPortfolio = async () => {
        try {
            const data = await getMyPortfolio();
            setPortfolio(data.results || data);
        } catch (err) {
            console.error('Error loading portfolio:', err);
            setError(t('guideAccount.error.failedToLoadPortfolio'));
        }
    };

    const loadAvailability = async () => {
        try {
            const data = await getMyAvailability();
            setAvailability(data.results || data);
        } catch (err) {
            console.error('Error loading availability:', err);
            setError(t('guideAccount.error.failedToLoadAvailability'));
        }
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        if (!profileForm.professional_bio.trim() || !profileForm.city) {
            setError(t('guideAccount.error.profileRequired'));
            return;
        }
        try {
            let result;
            if (profile) {
                result = await updateCustomerProfile(profileForm);
            } else {
                result = await createCustomerProfile(profileForm);
            }
            setProfile(result);
            setShowProfileForm(false);
            setError(null);
            alert(profile ? t('guideAccount.success.profileUpdated') : t('guideAccount.success.profileCreated'));
        } catch (err) {
            setError(t('guideAccount.error.failedToSaveProfile'));
        }
    };

    const handlePortfolioSubmit = async (e) => {
        e.preventDefault();
        if (!portfolioForm.title.trim()) {
            setError(t('guideAccount.error.portfolioTitleRequired'));
            return;
        }
        try {
            if (editingPortfolioItem) {
                await updatePortfolioItem(editingPortfolioItem.id, portfolioForm);
            } else {
                await createPortfolioItem(portfolioForm);
            }
            loadPortfolio();
            setShowPortfolioForm(false);
            setEditingPortfolioItem(null);
            setPortfolioForm({ title: '', description: '', image: null, order: 0 });
            setError(null);
            alert(editingPortfolioItem ? t('guideAccount.success.portfolioUpdated') : t('guideAccount.success.portfolioCreated'));
        } catch (err) {
            setError(t('guideAccount.error.failedToSavePortfolio'));
        }
    };

    const handleAvailabilitySubmit = async (e) => {
        e.preventDefault();
        if (!availabilityForm.date) {
            setError(t('guideAccount.error.dateRequired'));
            return;
        }
        try {
            if (editingAvailability) {
                await updateAvailability(editingAvailability.id, availabilityForm);
            } else {
                await createAvailability(availabilityForm);
            }
            loadAvailability();
            setShowAvailabilityForm(false);
            setEditingAvailability(null);
            setAvailabilityForm({ date: '', is_available: true, start_time: '', end_time: '', note: '' });
            setError(null);
            alert(editingAvailability ? t('guideAccount.success.availabilityUpdated') : t('guideAccount.success.availabilityCreated'));
        } catch (err) {
            setError(t('guideAccount.error.failedToSaveAvailability'));
        }
    };

    const handleBookingAction = async (bookingId, action) => {
        try {
            if (action === 'accept') {
                await acceptBooking(bookingId);
                alert(t('guideAccount.success.bookingAccepted'));
            } else if (action === 'cancel') {
                if (!cancelReason.trim()) {
                    setError(t('guideAccount.error.cancelReasonRequired'));
                    return;
                }
                await cancelBooking(bookingId, cancelReason);
                alert(t('guideAccount.success.bookingCancelled'));
            }
            loadBookings();
            setShowCancelModal(false);
            setSelectedBookingForCancel(null);
            setCancelReason('');
            setError(null);
        } catch (err) {
            setError(t('guideAccount.error.failedToProcessBooking'));
        }
    };

    const handleOpenCancelModal = (booking) => {
        setSelectedBookingForCancel(booking);
        setCancelReason('');
        setShowCancelModal(true);
    };

    const handleDeletePortfolio = async (id) => {
        if (!window.confirm(t('guideAccount.portfolio.deleteConfirm'))) return;
        try {
            await deletePortfolioItem(id);
            loadPortfolio();
            setError(null);
            alert(t('guideAccount.success.portfolioDeleted'));
        } catch (err) {
            setError(t('guideAccount.error.failedToDeletePortfolio'));
        }
    };

    const handleDeleteAvailability = async (id) => {
        if (!window.confirm(t('guideAccount.availability.deleteConfirm'))) return;
        try {
            await deleteAvailability(id);
            loadAvailability();
            setError(null);
            alert(t('guideAccount.success.availabilityDeleted'));
        } catch (err) {
            setError(t('guideAccount.error.failedToDeleteAvailability'));
        }
    };

    const handleChatWithClient = (booking) => {
        if (booking.client?.user?.email) {
            setSelectedUserForChat(booking.client.user.email);
            setShowChat(true);
        } else {
            setError(t('guideAccount.error.noClientEmail'));
        }
    };

    const handleCloseChat = () => {
        setShowChat(false);
        setSelectedUserForChat(null);
    };

    const handleReviewFilterChange = (key, value) => {
        setReviewFilter({ ...reviewFilter, [key]: value });
    };

    const handleReactToReview = async (reviewId) => {
        if (!reactionForm.reactionType || (reactionForm.reactionType === 'comment' && !reactionForm.comment.trim()) || (reactionForm.reactionType === 'report' && !reactionForm.comment.trim())) {
            setError(t('guideAccount.error.reactionRequired'));
            return;
        }
        try {
            await reactToReview(reviewId, reactionForm.reactionType, reactionForm.comment);
            loadReviews();
            setShowReactionForm(null);
            setReactionForm({ reactionType: 'like', comment: '' });
            setError(null);
            alert(t('guideAccount.success.reactionSubmitted'));
        } catch (err) {
            setError(t('guideAccount.error.failedToSubmitReaction'));
        }
    };

    const handleRemoveReaction = async (reviewId) => {
        try {
            await removeReactionFromReview(reviewId);
            loadReviews();
            setError(null);
            alert(t('guideAccount.success.reactionRemoved'));
        } catch (err) {
            setError(t('guideAccount.error.failedToRemoveReaction'));
        }
    };

    const filteredReviews = reviews
        .filter(review => reviewFilter.minRating ? review.overall_rating >= parseInt(reviewFilter.minRating) : true)
        .sort((a, b) => {
            if (reviewFilter.sortBy === 'date_desc') {
                return new Date(b.created_at) - new Date(a.created_at);
            } else if (reviewFilter.sortBy === 'date_asc') {
                return new Date(a.created_at) - new Date(b.created_at);
            } else if (reviewFilter.sortBy === 'rating_desc') {
                return b.overall_rating - a.overall_rating;
            } else if (reviewFilter.sortBy === 'rating_asc') {
                return a.overall_rating - b.overall_rating;
            }
            return 0;
        });

    if (loading) {
        return (
            <div className="guide-account-loading">
                <div className="guide-account-spinner"></div>
                <p>{t('guideAccount.loading')}</p>
            </div>
        );
    }

    return (
        <div className="guide-account-container">
            <div className="guide-account-header">
                <h1 className="guide-account-title">{t('guideAccount.title')}</h1>
                {currentUser && (
                    <div className="guide-account-user-info">
                        <span className="guide-account-welcome">{t('guideAccount.welcome', { name: currentUser.full_name })}</span>
                        <button
                            className="guide-account-chat-btn"
                            onClick={() => setShowChat(true)}
                            style={{
                                marginLeft: '16px',
                                padding: '8px 16px',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: '500'
                            }}
                        >
                            {t('guideAccount.messages')}
                        </button>
                    </div>
                )}
            </div>
            {error && (
                <div className="guide-account-error">
                    <p>{error}</p>
                    <button onClick={() => setError(null)} className="guide-account-error-close">×</button>
                </div>
            )}
            <div className="guide-account-navigation">
                <button
                    className={`guide-account-nav-btn ${activeTab === 'dashboard' ? 'guide-account-nav-active' : ''}`}
                    onClick={() => setActiveTab('dashboard')}
                >
                    {t('guideAccount.navigation.dashboard')}
                </button>
                <button
                    className={`guide-account-nav-btn ${activeTab === 'profile' ? 'guide-account-nav-active' : ''}`}
                    onClick={() => setActiveTab('profile')}
                >
                    {t('guideAccount.navigation.profile')}
                </button>
                <button
                    className={`guide-account-nav-btn ${activeTab === 'bookings' ? 'guide-account-nav-active' : ''}`}
                    onClick={() => setActiveTab('bookings')}
                >
                    {t('guideAccount.navigation.bookings')}
                </button>
                <button
                    className={`guide-account-nav-btn ${activeTab === 'portfolio' ? 'guide-account-nav-active' : ''}`}
                    onClick={() => setActiveTab('portfolio')}
                >
                    {t('guideAccount.navigation.portfolio')}
                </button>
                <button
                    className={`guide-account-nav-btn ${activeTab === 'availability' ? 'guide-account-nav-active' : ''}`}
                    onClick={() => setActiveTab('availability')}
                >
                    {t('guideAccount.navigation.availability')}
                </button>
                <button
                    className={`guide-account-nav-btn ${activeTab === 'reviews' ? 'guide-account-nav-active' : ''}`}
                    onClick={() => setActiveTab('reviews')}
                >
                    {t('guideAccount.navigation.reviews')}
                </button>
            </div>
            <div className="guide-account-content">
                {activeTab === 'dashboard' && (
                    <div className="guide-account-dashboard">
                        <div className="guide-account-stats">
                            <div className="guide-account-stat-card">
                                <h3 className="guide-account-stat-title">{t('guideAccount.dashboard.totalBookings')}</h3>
                                <p className="guide-account-stat-value">{bookings.length}</p>
                            </div>
                            <div className="guide-account-stat-card">
                                <h3 className="guide-account-stat-title">{t('guideAccount.dashboard.activeBookings')}</h3>
                                <p className="guide-account-stat-value">
                                    {bookings.filter(b => b.status === 'confirmed' || b.status === 'accepted').length}
                                </p>
                            </div>
                            <div className="guide-account-stat-card">
                                <h3 className="guide-account-stat-title">{t('guideAccount.dashboard.totalReviews')}</h3>
                                <p className="guide-account-stat-value">{reviews.length}</p>
                            </div>
                            <div className="guide-account-stat-card">
                                <h3 className="guide-account-stat-title">{t('guideAccount.dashboard.averageRating')}</h3>
                                <p className="guide-account-stat-value">
                                    {typeof profile?.average_rating === 'number' && !isNaN(profile.average_rating)
                                        ? profile.average_rating.toFixed(1)
                                        : '0.0'}/5
                                </p>
                            </div>
                        </div>
                        <div className="guide-account-recent">
                            <h3 className="guide-account-section-title">{t('guideAccount.dashboard.recentBookings')}</h3>
                            <div className="guide-account-recent-bookings">
                                {bookings.slice(0, 5).map(booking => (
                                    <div key={booking.id} className="guide-account-booking-card">
                                        <div className="guide-account-booking-info">
                                            <h4 className="guide-account-booking-title">{booking.title}</h4>
                                            <p className="guide-account-booking-date">
                                                {t('guideAccount.bookings.dates', {
                                                    start: new Date(booking.start_date).toLocaleDateString(),
                                                    end: new Date(booking.end_date).toLocaleDateString()
                                                })}
                                            </p>
                                            <span className={`guide-account-booking-status guide-account-status-${booking.status}`}>
                                                {t('guideAccount.dashboard.bookingStatus', { status: booking.status.charAt(0).toUpperCase() + booking.status.slice(1) })}
                                            </span>
                                        </div>
                                        <div className="guide-account-booking-actions">
                                            {booking.status === 'pending' && (
                                                <>
                                                    <button
                                                        className="guide-account-btn guide-account-btn-accept"
                                                        onClick={() => handleBookingAction(booking.id, 'accept')}
                                                    >
                                                        {t('guideAccount.dashboard.accept')}
                                                    </button>
                                                    <button
                                                        className="guide-account-btn guide-account-btn-cancel"
                                                        onClick={() => handleOpenCancelModal(booking)}
                                                    >
                                                        {t('guideAccount.dashboard.decline')}
                                                    </button>
                                                </>
                                            )}
                                            {booking.client && (
                                                <button
                                                    className="guide-account-btn guide-account-btn-secondary"
                                                    onClick={() => handleChatWithClient(booking)}
                                                >
                                                    {t('guideAccount.dashboard.chatWithClient')}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
                {activeTab === 'profile' && (
                    <div className="guide-account-profile">
                        {!profile || showProfileForm ? (
                            <div className="guide-account-profile-form">
                                <h3 className="guide-account-section-title">
                                    {profile ? t('guideAccount.profile.editProfile') : t('guideAccount.profile.createProfile')}
                                </h3>
                                <form onSubmit={handleProfileSubmit} className="guide-account-form">
                                    <div className="guide-account-form-group">
                                        <label className="guide-account-label">{t('guideAccount.profile.professionalBio')}</label>
                                        <textarea
                                            className="guide-account-textarea"
                                            value={profileForm.professional_bio}
                                            onChange={(e) => setProfileForm({ ...profileForm, professional_bio: e.target.value })}
                                            placeholder={t('guideAccount.profile.bioPlaceholder')}
                                            rows="4"
                                            required
                                        />
                                    </div>
                                    <div className="guide-account-form-row">
                                        <div className="guide-account-form-group">
                                            <label className="guide-account-label">{t('guideAccount.profile.yearsOfExperience')}</label>
                                            <input
                                                type="number"
                                                className="guide-account-input"
                                                value={profileForm.years_of_experience}
                                                onChange={(e) => setProfileForm({ ...profileForm, years_of_experience: parseInt(e.target.value) || 0 })}
                                                min="0"
                                            />
                                        </div>
                                        <div className="guide-account-form-group">
                                            <label className="guide-account-label">{t('guideAccount.profile.city')}</label>
                                            <select
                                                className="guide-account-select"
                                                value={profileForm.city}
                                                onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                                                required
                                            >
                                                <option value="">{t('guideAccount.profile.selectCity')}</option>
                                                {cities.map(city => (
                                                    <option key={city.id} value={city.id}>{city.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="guide-account-form-group">
                                        <label className="guide-account-label">{t('guideAccount.profile.serviceAreas')}</label>
                                        <input
                                            type="text"
                                            className="guide-account-input"
                                            value={profileForm.service_areas}
                                            onChange={(e) => setProfileForm({ ...profileForm, service_areas: e.target.value })}
                                            placeholder={t('guideAccount.profile.serviceAreasPlaceholder')}
                                        />
                                    </div>
                                    <div className="guide-account-form-group">
                                        <label className="guide-account-label">{t('guideAccount.profile.serviceTypes')}</label>
                                        <div className="guide-account-checkbox-group">
                                            {serviceTypes.map(service => (
                                                <label key={service.id} className="guide-account-checkbox-label">
                                                    <input
                                                        type="checkbox"
                                                        className="guide-account-checkbox"
                                                        checked={profileForm.service_types.includes(service.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setProfileForm({
                                                                    ...profileForm,
                                                                    service_types: [...profileForm.service_types, service.id]
                                                                });
                                                            } else {
                                                                setProfileForm({
                                                                    ...profileForm,
                                                                    service_types: profileForm.service_types.filter(id => id !== service.id)
                                                                });
                                                            }
                                                        }}
                                                    />
                                                    {service.name}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="guide-account-form-row">
                                        <div className="guide-account-form-group">
                                            <label className="guide-account-label">{t('guideAccount.profile.hourlyRate')}</label>
                                            <input
                                                type="number"
                                                className="guide-account-input"
                                                value={profileForm.hourly_rate}
                                                onChange={(e) => setProfileForm({ ...profileForm, hourly_rate: e.target.value })}
                                                placeholder={t('guideAccount.profile.hourlyRatePlaceholder')}
                                                step="0.01"
                                            />
                                        </div>
                                        <div className="guide-account-form-group">
                                            <label className="guide-account-label">{t('guideAccount.profile.dailyRate')}</label>
                                            <input
                                                type="number"
                                                className="guide-account-input"
                                                value={profileForm.daily_rate}
                                                onChange={(e) => setProfileForm({ ...profileForm, daily_rate: e.target.value })}
                                                placeholder={t('guideAccount.profile.dailyRatePlaceholder')}
                                                step="0.01"
                                            />
                                        </div>
                                        <div className="guide-account-form-group">
                                            <label className="guide-account-label">{t('guideAccount.profile.currency')}</label>
                                            <select
                                                className="guide-account-select"
                                                value={profileForm.currency}
                                                onChange={(e) => setProfileForm({ ...profileForm, currency: e.target.value })}
                                            >
                                                <option value="USD">{t('guideAccount.profile.usd')}</option>
                                                <option value="EUR">{t('guideAccount.profile.eur')}</option>
                                                <option value="UZS">{t('guideAccount.profile.uzs')}</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="guide-account-form-group">
                                        <label className="guide-account-label">{t('guideAccount.profile.languages')}</label>
                                        <div className="guide-account-checkbox-group">
                                            {languages.map(language => (
                                                <label key={language.id} className="guide-account-checkbox-label">
                                                    <input
                                                        type="checkbox"
                                                        className="guide-account-checkbox"
                                                        checked={profileForm.languages.includes(language.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setProfileForm({
                                                                    ...profileForm,
                                                                    languages: [...profileForm.languages, language.id]
                                                                });
                                                            } else {
                                                                setProfileForm({
                                                                    ...profileForm,
                                                                    languages: profileForm.languages.filter(id => id !== language.id)
                                                                });
                                                            }
                                                        }}
                                                    />
                                                    {language.name}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="guide-account-form-group">
                                        <label className="guide-account-checkbox-label">
                                            <input
                                                type="checkbox"
                                                className="guide-account-checkbox"
                                                checked={profileForm.is_available}
                                                onChange={(e) => setProfileForm({ ...profileForm, is_available: e.target.checked })}
                                            />
                                            {t('guideAccount.profile.availableForBookings')}
                                        </label>
                                    </div>
                                    <div className="guide-account-form-actions">
                                        <button type="submit" className="guide-account-btn guide-account-btn-primary">
                                            {profile ? t('guideAccount.profile.updateProfile') : t('guideAccount.profile.createProfileButton')}
                                        </button>
                                        {profile && (
                                            <button
                                                type="button"
                                                className="guide-account-btn guide-account-btn-secondary"
                                                onClick={() => setShowProfileForm(false)}
                                            >
                                                {t('guideAccount.profile.cancel')}
                                            </button>
                                        )}
                                    </div>
                                </form>
                            </div>
                        ) : (
                            <div className="guide-account-profile-view">
                                <div className="guide-account-profile-header">
                                    <h3 className="guide-account-section-title">{t('guideAccount.profile.profileInformation')}</h3>
                                    <button
                                        className="guide-account-btn guide-account-btn-primary"
                                        onClick={() => setShowProfileForm(true)}
                                    >
                                        {t('guideAccount.profile.editProfileButton')}
                                    </button>
                                </div>
                                <div className="guide-account-profile-info">
                                    <div className="guide-account-profile-field">
                                        <label className="guide-account-profile-label">{t('guideAccount.profile.professionalBio')}</label>
                                        <p className="guide-account-profile-value">{profile.professional_bio}</p>
                                    </div>
                                    <div className="guide-account-profile-field">
                                        <label className="guide-account-profile-label">{t('guideAccount.profile.yearsOfExperience')}</label>
                                        <p className="guide-account-profile-value">{profile.years_of_experience} {t('guideAccount.profile.yearsOfExperience').toLowerCase()}</p>
                                    </div>
                                    <div className="guide-account-profile-field">
                                        <label className="guide-account-profile-label">{t('guideAccount.profile.availability')}</label>
                                        <p className="guide-account-profile-value">
                                            {profile.is_available ? t('guideAccount.profile.available') : t('guideAccount.profile.notAvailable')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                {activeTab === 'bookings' && (
                    <div className="guide-account-bookings">
                        <h3 className="guide-account-section-title">{t('guideAccount.bookings.myBookings')}</h3>
                        <div className="guide-account-bookings-list">
                            {bookings.map(booking => (
                                <div key={booking.id} className="guide-account-booking-item">
                                    <div className="guide-account-booking-details">
                                        <h4 className="guide-account-booking-title">{booking.title}</h4>
                                        <p className="guide-account-booking-dates">
                                            {t('guideAccount.bookings.dates', {
                                                start: new Date(booking.start_date).toLocaleDateString(),
                                                end: new Date(booking.end_date).toLocaleDateString()
                                            })}
                                        </p>
                                        <p className="guide-account-booking-description">{booking.description}</p>
                                        <span className={`guide-account-booking-status guide-account-status-${booking.status}`}>
                                            {t('guideAccount.dashboard.bookingStatus', { status: booking.status.charAt(0).toUpperCase() + booking.status.slice(1) })}
                                        </span>
                                    </div>
                                    <div className="guide-account-booking-actions">
                                        {booking.status === 'pending' && (
                                            <>
                                                <button
                                                    className="guide-account-btn guide-account-btn-accept"
                                                    onClick={() => handleBookingAction(booking.id, 'accept')}
                                                >
                                                    {t('guideAccount.bookings.accept')}
                                                </button>
                                                <button
                                                    className="guide-account-btn guide-account-btn-cancel"
                                                    onClick={() => handleOpenCancelModal(booking)}
                                                >
                                                    {t('guideAccount.bookings.decline')}
                                                </button>
                                            </>
                                        )}
                                        {booking.client && (
                                            <button
                                                className="guide-account-btn guide-account-btn-secondary"
                                                onClick={() => handleChatWithClient(booking)}
                                            >
                                                {t('guideAccount.bookings.chatWithClient')}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {activeTab === 'portfolio' && (
                    <div className="guide-account-portfolio">
                        <div className="guide-account-portfolio-header">
                            <h3 className="guide-account-section-title">{t('guideAccount.portfolio.myPortfolio')}</h3>
                            <button
                                className="guide-account-btn guide-account-btn-primary"
                                onClick={() => setShowPortfolioForm(true)}
                            >
                                {t('guideAccount.portfolio.addPortfolioItem')}
                            </button>
                        </div>
                        {showPortfolioForm && (
                            <div className="guide-account-portfolio-form">
                                <h4 className="guide-account-form-title">
                                    {editingPortfolioItem ? t('guideAccount.portfolio.editPortfolioItem') : t('guideAccount.portfolio.createPortfolioItem')}
                                </h4>
                                <form onSubmit={handlePortfolioSubmit} className="guide-account-form">
                                    <div className="guide-account-form-group">
                                        <label className="guide-account-label">{t('guideAccount.portfolio.title')}</label>
                                        <input
                                            type="text"
                                            className="guide-account-input"
                                            value={portfolioForm.title}
                                            onChange={(e) => setPortfolioForm({ ...portfolioForm, title: e.target.value })}
                                            placeholder={t('guideAccount.portfolio.titlePlaceholder')}
                                            required
                                        />
                                    </div>
                                    <div className="guide-account-form-group">
                                        <label className="guide-account-label">{t('guideAccount.portfolio.description')}</label>
                                        <textarea
                                            className="guide-account-textarea"
                                            value={portfolioForm.description}
                                            onChange={(e) => setPortfolioForm({ ...portfolioForm, description: e.target.value })}
                                            placeholder={t('guideAccount.portfolio.descriptionPlaceholder')}
                                            rows="3"
                                        />
                                    </div>
                                    <div className="guide-account-form-group">
                                        <label className="guide-account-label">{t('guideAccount.portfolio.image')}</label>
                                        <input
                                            type="file"
                                            className="guide-account-file-input"
                                            accept="image/*"
                                            onChange={(e) => setPortfolioForm({ ...portfolioForm, image: e.target.files[0] })}
                                        />
                                    </div>
                                    <div className="guide-account-form-group">
                                        <label className="guide-account-label">{t('guideAccount.portfolio.order')}</label>
                                        <input
                                            type="number"
                                            className="guide-account-input"
                                            value={portfolioForm.order}
                                            onChange={(e) => setPortfolioForm({ ...portfolioForm, order: parseInt(e.target.value) || 0 })}
                                            placeholder={t('guideAccount.portfolio.orderPlaceholder')}
                                            min="0"
                                        />
                                    </div>
                                    <div className="guide-account-form-actions">
                                        <button type="submit" className="guide-account-btn guide-account-btn-primary">
                                            {editingPortfolioItem ? t('guideAccount.portfolio.updatePortfolioItem') : t('guideAccount.portfolio.createPortfolioItem')}
                                        </button>
                                        <button
                                            type="button"
                                            className="guide-account-btn guide-account-btn-secondary"
                                            onClick={() => {
                                                setShowPortfolioForm(false);
                                                setEditingPortfolioItem(null);
                                                setPortfolioForm({ title: '', description: '', image: null, order: 0 });
                                            }}
                                        >
                                            {t('guideAccount.portfolio.cancel')}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}
                        <div className="guide-account-portfolio-grid">
                            {portfolio.map(item => (
                                <div key={item.id} className="guide-account-portfolio-item">
                                    {item.image && (
                                        <img
                                            src={item.image}
                                            alt={item.title}
                                            className="guide-account-portfolio-image"
                                        />
                                    )}
                                    <div className="guide-account-portfolio-content">
                                        <h4 className="guide-account-portfolio-title">{item.title}</h4>
                                        <p className="guide-account-portfolio-description">{item.description}</p>
                                        <div className="guide-account-portfolio-actions">
                                            <button
                                                className="guide-account-btn guide-account-btn-small"
                                                onClick={() => {
                                                    setEditingPortfolioItem(item);
                                                    setPortfolioForm({
                                                        title: item.title,
                                                        description: item.description,
                                                        image: null,
                                                        order: item.order
                                                    });
                                                    setShowPortfolioForm(true);
                                                }}
                                            >
                                                {t('guideAccount.portfolio.edit')}
                                            </button>
                                            <button
                                                className="guide-account-btn guide-account-btn-small guide-account-btn-danger"
                                                onClick={() => handleDeletePortfolio(item.id)}
                                            >
                                                {t('guideAccount.portfolio.delete')}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {activeTab === 'availability' && (
                    <div className="guide-account-availability">
                        <div className="guide-account-availability-header">
                            <h3 className="guide-account-section-title">{t('guideAccount.availability.myAvailability')}</h3>
                            <button
                                className="guide-account-btn guide-account-btn-primary"
                                onClick={() => setShowAvailabilityForm(true)}
                            >
                                {t('guideAccount.availability.addAvailability')}
                            </button>
                        </div>
                        {showAvailabilityForm && (
                            <div className="guide-account-availability-form">
                                <h4 className="guide-account-form-title">
                                    {editingAvailability ? t('guideAccount.availability.editAvailability') : t('guideAccount.availability.createAvailability')}
                                </h4>
                                <form onSubmit={handleAvailabilitySubmit} className="guide-account-form">
                                    <div className="guide-account-form-row">
                                        <div className="guide-account-form-group">
                                            <label className="guide-account-label">{t('guideAccount.availability.date')}</label>
                                            <input
                                                type="date"
                                                className="guide-account-input"
                                                value={availabilityForm.date}
                                                onChange={(e) => setAvailabilityForm({ ...availabilityForm, date: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="guide-account-form-group">
                                            <label className="guide-account-checkbox-label">
                                                <input
                                                    type="checkbox"
                                                    className="guide-account-checkbox"
                                                    checked={availabilityForm.is_available}
                                                    onChange={(e) => setAvailabilityForm({ ...availabilityForm, is_available: e.target.checked })}
                                                />
                                                {t('guideAccount.availability.available')}
                                            </label>
                                        </div>
                                    </div>
                                    <div className="guide-account-form-row">
                                        <div className="guide-account-form-group">
                                            <label className="guide-account-label">{t('guideAccount.availability.startTime')}</label>
                                            <input
                                                type="time"
                                                className="guide-account-input"
                                                value={availabilityForm.start_time}
                                                onChange={(e) => setAvailabilityForm({ ...availabilityForm, start_time: e.target.value })}
                                            />
                                        </div>
                                        <div className="guide-account-form-group">
                                            <label className="guide-account-label">{t('guideAccount.availability.endTime')}</label>
                                            <input
                                                type="time"
                                                className="guide-account-input"
                                                value={availabilityForm.end_time}
                                                onChange={(e) => setAvailabilityForm({ ...availabilityForm, end_time: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="guide-account-form-group">
                                        <label className="guide-account-label">{t('guideAccount.availability.note')}</label>
                                        <input
                                            type="text"
                                            className="guide-account-input"
                                            value={availabilityForm.note}
                                            onChange={(e) => setAvailabilityForm({ ...availabilityForm, note: e.target.value })}
                                            placeholder={t('guideAccount.availability.notePlaceholder')}
                                        />
                                    </div>
                                    <div className="guide-account-form-actions">
                                        <button type="submit" className="guide-account-btn guide-account-btn-primary">
                                            {editingAvailability ? t('guideAccount.availability.updateAvailability') : t('guideAccount.availability.createAvailability')}
                                        </button>
                                        <button
                                            type="button"
                                            className="guide-account-btn guide-account-btn-secondary"
                                            onClick={() => {
                                                setShowAvailabilityForm(false);
                                                setEditingAvailability(null);
                                                setAvailabilityForm({ date: '', is_available: true, start_time: '', end_time: '', note: '' });
                                            }}
                                        >
                                            {t('guideAccount.availability.cancel')}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}
                        <div className="guide-account-availability-list">
                            {availability.map(item => (
                                <div key={item.id} className="guide-account-availability-item">
                                    <div className="guide-account-availability-info">
                                        <h4 className="guide-account-availability-date">
                                            {t('guideAccount.availability.date')}: {new Date(item.date).toLocaleDateString()}
                                        </h4>
                                        <p className="guide-account-availability-time">
                                            {item.start_time && item.end_time
                                                ? `${item.start_time} - ${item.end_time}`
                                                : t('guideAccount.availability.allDay')}
                                        </p>
                                        <p className="guide-account-availability-note">
                                            {t('guideAccount.availability.note')}: {item.note || 'None'}
                                        </p>
                                        <span className={`guide-account-availability-status ${item.is_available ? 'guide-account-available' : 'guide-account-unavailable'}`}>
                                            {item.is_available ? t('guideAccount.availability.available') : t('guideAccount.availability.unavailable')}
                                        </span>
                                    </div>
                                    <div className="guide-account-availability-actions">
                                        <button
                                            className="guide-account-btn guide-account-btn-small"
                                            onClick={() => {
                                                setEditingAvailability(item);
                                                setAvailabilityForm({
                                                    date: item.date,
                                                    is_available: item.is_available,
                                                    start_time: item.start_time || '',
                                                    end_time: item.end_time || '',
                                                    note: item.note || ''
                                                });
                                                setShowAvailabilityForm(true);
                                            }}
                                        >
                                            {t('guideAccount.availability.edit')}
                                        </button>
                                        <button
                                            className="guide-account-btn guide-account-btn-small guide-account-btn-danger"
                                            onClick={() => handleDeleteAvailability(item.id)}
                                        >
                                            {t('guideAccount.availability.delete')}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {activeTab === 'reviews' && (
                    <div className="guide-account-reviews">
                        <div className="guide-account-reviews-header">
                            <h3 className="guide-account-section-title">{t('guideAccount.reviews.myReviews')}</h3>
                            <div className="guide-account-reviews-filters">
                                <select
                                    className="guide-account-filter-select"
                                    value={reviewFilter.minRating}
                                    onChange={(e) => handleReviewFilterChange('minRating', e.target.value)}
                                >
                                    <option value="">{t('guideAccount.reviews.allRatings')}</option>
                                    <option value="5">{t('guideAccount.reviews.stars.5')}</option>
                                    <option value="4">{t('guideAccount.reviews.stars.4')}</option>
                                    <option value="3">{t('guideAccount.reviews.stars.3')}</option>
                                    <option value="2">{t('guideAccount.reviews.stars.2')}</option>
                                    <option value="1">{t('guideAccount.reviews.stars.1')}</option>
                                </select>
                                <select
                                    className="guide-account-filter-select"
                                    value={reviewFilter.sortBy}
                                    onChange={(e) => handleReviewFilterChange('sortBy', e.target.value)}
                                >
                                    <option value="date_desc">{t('guideAccount.reviews.sortBy.newestFirst')}</option>
                                    <option value="date_asc">{t('guideAccount.reviews.sortBy.oldestFirst')}</option>
                                    <option value="rating_desc">{t('guideAccount.reviews.sortBy.highestRated')}</option>
                                    <option value="rating_asc">{t('guideAccount.reviews.sortBy.lowestRated')}</option>
                                </select>
                            </div>
                        </div>
                        {reviewSummary && (
                            <div className="guide-account-reviews-summary">
                                <h4 className="guide-account-section-subtitle">{t('guideAccount.reviews.reviewSummary')}</h4>
                                <div className="guide-account-reviews-summary-grid">
                                    <div className="guide-account-summary-item">
                                        <span className="guide-account-summary-label">{t('guideAccount.reviews.overallRating')}</span>
                                        <span className="guide-account-summary-value">
                                            {reviewSummary.overall_rating?.toFixed(1) || 0}/5
                                        </span>
                                    </div>
                                    <div className="guide-account-summary-item">
                                        <span className="guide-account-summary-label">{t('guideAccount.reviews.communication')}</span>
                                        <span className="guide-account-summary-value">
                                            {reviewSummary.communication_rating?.toFixed(1) || 0}/5
                                        </span>
                                    </div>
                                    <div className="guide-account-summary-item">
                                        <span className="guide-account-summary-label">{t('guideAccount.reviews.service')}</span>
                                        <span className="guide-account-summary-value">
                                            {reviewSummary.service_rating?.toFixed(1) || 0}/5
                                        </span>
                                    </div>
                                    <div className="guide-account-summary-item">
                                        <span className="guide-account-summary-label">{t('guideAccount.reviews.punctuality')}</span>
                                        <span className="guide-account-summary-value">
                                            {reviewSummary.punctuality_rating?.toFixed(1) || 0}/5
                                        </span>
                                    </div>
                                    <div className="guide-account-summary-item">
                                        <span className="guide-account-summary-label">{t('guideAccount.reviews.value')}</span>
                                        <span className="guide-account-summary-value">
                                            {reviewSummary.value_rating?.toFixed(1) || 0}/5
                                        </span>
                                    </div>
                                    <div className="guide-account-summary-item">
                                        <span className="guide-account-summary-label">{t('guideAccount.reviews.totalReviews')}</span>
                                        <span className="guide-account-summary-value">
                                            {reviewSummary.total_reviews || 0}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div className="guide-account-reviews-list">
                            {filteredReviews.length === 0 ? (
                                <p>{t('guideAccount.reviews.noReviews')}</p>
                            ) : (
                                filteredReviews.map(review => (
                                    <div key={review.id} className="guide-account-review-item">
                                        <div className="guide-account-review-header">
                                            <div className="guide-account-review-rating">
                                                {'★'.repeat(review.overall_rating)}{'☆'.repeat(5 - review.overall_rating)}
                                                <span className="guide-account-review-rating-text">
                                                    {review.overall_rating}/5
                                                </span>
                                            </div>
                                            <span className="guide-account-review-date">
                                                {t('guideAccount.availability.date')}: {new Date(review.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <h4 className="guide-account-review-title">{review.title}</h4>
                                        <p className="guide-account-review-comment">{review.comment}</p>
                                        <div className="guide-account-review-details">
                                            <span className="guide-account-review-detail">{t('guideAccount.reviews.communication')}: {review.communication_rating}/5</span>
                                            <span className="guide-account-review-detail">{t('guideAccount.reviews.service')}: {review.service_rating}/5</span>
                                            <span className="guide-account-review-detail">{t('guideAccount.reviews.punctuality')}: {review.punctuality_rating}/5</span>
                                            <span className="guide-account-review-detail">{t('guideAccount.reviews.value')}: {review.value_rating}/5</span>
                                        </div>
                                        <div className="guide-account-review-actions">
                                            <button
                                                className="guide-account-btn guide-account-btn-small"
                                                onClick={() => {
                                                    setShowReactionForm(review.id);
                                                    setReactionForm({ reactionType: 'like', comment: '' });
                                                }}
                                            >
                                                {t('guideAccount.reviews.react')}
                                            </button>
                                            {review.my_reaction && (
                                                <button
                                                    className="guide-account-btn guide-account-btn-small guide-account-btn-danger"
                                                    onClick={() => handleRemoveReaction(review.id)}
                                                >
                                                    {t('guideAccount.reviews.removeReaction')}
                                                </button>
                                            )}
                                        </div>
                                        {showReactionForm === review.id && (
                                            <div className="guide-account-reaction-form">
                                                <form
                                                    onSubmit={(e) => {
                                                        e.preventDefault();
                                                        handleReactToReview(review.id);
                                                    }}
                                                    className="guide-account-form"
                                                >
                                                    <div className="guide-account-form-group">
                                                        <label className="guide-account-label">{t('guideAccount.reviews.reactionType')}</label>
                                                        <select
                                                            className="guide-account-select"
                                                            value={reactionForm.reactionType}
                                                            onChange={(e) => setReactionForm({ ...reactionForm, reactionType: e.target.value })}
                                                        >
                                                            <option value="like">{t('guideAccount.reviews.like')}</option>
                                                            <option value="comment">{t('guideAccount.reviews.comment')}</option>
                                                            <option value="report">{t('guideAccount.reviews.report')}</option>
                                                        </select>
                                                    </div>
                                                    {reactionForm.reactionType === 'comment' && (
                                                        <div className="guide-account-form-group">
                                                            <label className="guide-account-label">{t('guideAccount.reviews.comment')}</label>
                                                            <textarea
                                                                className="guide-account-textarea"
                                                                value={reactionForm.comment}
                                                                onChange={(e) => setReactionForm({ ...reactionForm, comment: e.target.value })}
                                                                rows="3"
                                                                placeholder={t('guideAccount.reviews.commentPlaceholder')}
                                                            />
                                                        </div>
                                                    )}
                                                    {reactionForm.reactionType === 'report' && (
                                                        <div className="guide-account-form-group">
                                                            <label className="guide-account-label">{t('guideAccount.reviews.report')}</label>
                                                            <textarea
                                                                className="guide-account-textarea"
                                                                value={reactionForm.comment}
                                                                onChange={(e) => setReactionForm({ ...reactionForm, comment: e.target.value })}
                                                                rows="3"
                                                                placeholder={t('guideAccount.reviews.reportReasonPlaceholder')}
                                                                required
                                                            />
                                                        </div>
                                                    )}
                                                    <div className="guide-account-form-actions">
                                                        <button type="submit" className="guide-account-btn guide-account-btn-primary">
                                                            {t('guideAccount.reviews.submitReaction')}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="guide-account-btn guide-account-btn-secondary"
                                                            onClick={() => setShowReactionForm(null)}
                                                        >
                                                            {t('guideAccount.reviews.cancel')}
                                                        </button>
                                                    </div>
                                                </form>
                                            </div>
                                        )}
                                        {review.my_reaction && (
                                            <div className="guide-account-reaction-display">
                                                <p>
                                                    {review.my_reaction.comment
                                                        ? t('guideAccount.reviews.yourReaction', { type: review.my_reaction.reaction_type, comment: review.my_reaction.comment })
                                                        : t('guideAccount.reviews.yourReactionNoComment', { type: review.my_reaction.reaction_type })}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
            {showCancelModal && (
                <div className="guide-account-modal">
                    <div className="guide-account-modal-content">
                        <div className="guide-account-modal-header">
                            <h3 className="guide-account-modal-title">{t('guideAccount.cancelModal.cancelBooking')}</h3>
                            <button
                                className="guide-account-modal-close"
                                onClick={() => {
                                    setShowCancelModal(false);
                                    setSelectedBookingForCancel(null);
                                    setCancelReason('');
                                    setError(null);
                                }}
                            >
                                ×
                            </button>
                        </div>
                        <form onSubmit={(e) => { e.preventDefault(); handleBookingAction(selectedBookingForCancel.id, 'cancel'); }} className="guide-account-form">
                            <div className="guide-account-form-group">
                                <label className="guide-account-label">{t('guideAccount.cancelModal.reasonForCancellation')}</label>
                                <textarea
                                    className="guide-account-textarea"
                                    value={cancelReason}
                                    onChange={(e) => setCancelReason(e.target.value)}
                                    rows="4"
                                    required
                                    placeholder={t('guideAccount.cancelModal.reasonPlaceholder')}
                                />
                            </div>
                            {error && (
                                <div className="guide-account-error">
                                    {error}
                                </div>
                            )}
                            <div className="guide-account-form-actions">
                                <button type="submit" className="guide-account-btn guide-account-btn-danger">
                                    {t('guideAccount.cancelModal.cancelBookingButton')}
                                </button>
                                <button
                                    type="button"
                                    className="guide-account-btn guide-account-btn-secondary"
                                    onClick={() => {
                                        setShowCancelModal(false);
                                        setSelectedBookingForCancel(null);
                                        setCancelReason('');
                                        setError(null);
                                    }}
                                >
                                    {t('guideAccount.cancelModal.close')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            <ChatWidgets
                isOpen={showChat}
                onClose={handleCloseChat}
                selectedUserId={selectedUserForChat}
                userRole="guide"
            />
        </div>
    );
};

export default GuideAccount;