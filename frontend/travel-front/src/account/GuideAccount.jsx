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
                console.log('No profile found, user needs to create one');
                setShowProfileForm(true);
            }
        } catch (err) {
            console.error('Error initializing data:', err);
            setError(t('account.guide_account.errors.required_fields'));
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
        }
    };

    const loadReviews = async () => {
        try {
            const data = await getMyReviews();
            setReviews(data.results || data);
        } catch (err) {
            console.error('Error loading reviews:', err);
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
        }
    };

    const loadPortfolio = async () => {
        try {
            const data = await getMyPortfolio();
            setPortfolio(data.results || data);
        } catch (err) {
            console.error('Error loading portfolio:', err);
        }
    };

    const loadAvailability = async () => {
        try {
            const data = await getMyAvailability();
            setAvailability(data.results || data);
        } catch (err) {
            console.error('Error loading availability:', err);
        }
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
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
            alert(t(profile ? 'account.guide_account.success.profile_updated' : 'account.guide_account.success.profile_created'));
        } catch (err) {
            setError(t('account.guide_account.errors.profile_failed'));
        }
    };

    const handlePortfolioSubmit = async (e) => {
        e.preventDefault();
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
            alert(t(editingPortfolioItem ? 'account.guide_account.success.portfolio_updated' : 'account.guide_account.success.portfolio_created'));
        } catch (err) {
            setError(t('account.guide_account.errors.portfolio_failed'));
        }
    };

    const handleAvailabilitySubmit = async (e) => {
        e.preventDefault();
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
            alert(t(editingAvailability ? 'account.guide_account.success.availability_updated' : 'account.guide_account.success.availability_created'));
        } catch (err) {
            setError(t('account.guide_account.errors.availability_failed'));
        }
    };

    const handleBookingAction = async (bookingId, action) => {
        try {
            if (action === 'accept') {
                await acceptBooking(bookingId);
                alert(t('account.guide_account.success.booking_accepted'));
            } else if (action === 'cancel') {
                await cancelBooking(bookingId, cancelReason || t('account.guide_account.cancel_booking.reason_placeholder'));
                alert(t('account.guide_account.success.booking_cancelled'));
            }
            loadBookings();
            setError(null);
        } catch (err) {
            setError(t('account.guide_account.errors.cancel_booking_failed'));
        }
    };

    const handleCancelBooking = async () => {
        if (!cancelReason.trim()) {
            setError(t('account.guide_account.errors.cancel_reason_required'));
            return;
        }
        try {
            await cancelBooking(selectedBookingForCancel.id, cancelReason);
            loadBookings();
            setShowCancelModal(false);
            setSelectedBookingForCancel(null);
            setCancelReason('');
            setError(null);
            alert(t('account.guide_account.success.booking_cancelled'));
        } catch (err) {
            setError(t('account.guide_account.errors.cancel_booking_failed'));
        }
    };

    const handleOpenCancelModal = (booking) => {
        setSelectedBookingForCancel(booking);
        setCancelReason('');
        setShowCancelModal(true);
    };

    const handleDeletePortfolio = async (id) => {
        try {
            await deletePortfolioItem(id);
            loadPortfolio();
            setError(null);
            alert(t('account.guide_account.success.portfolio_deleted'));
        } catch (err) {
            setError(t('account.guide_account.errors.portfolio_failed'));
        }
    };

    const handleDeleteAvailability = async (id) => {
        try {
            await deleteAvailability(id);
            loadAvailability();
            setError(null);
            alert(t('account.guide_account.success.availability_deleted'));
        } catch (err) {
            setError(t('account.guide_account.errors.availability_failed'));
        }
    };

    const handleChatWithClient = (booking) => {
        if (booking.client?.user?.email) {
            setSelectedUserForChat(booking.client.user.email);
            setShowChat(true);
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
            setError(t('account.guide_account.errors.reaction_required'));
            return;
        }
        try {
            await reactToReview(reviewId, reactionForm.reactionType, reactionForm.comment);
            loadReviews();
            setShowReactionForm(null);
            setReactionForm({ reactionType: 'like', comment: '' });
            setError(null);
            alert(t('account.guide_account.success.reaction_submitted'));
        } catch (err) {
            setError(t('account.guide_account.errors.reaction_failed'));
        }
    };

    const handleRemoveReaction = async (reviewId) => {
        try {
            await removeReactionFromReview(reviewId);
            loadReviews();
            setError(null);
            alert(t('account.guide_account.success.reaction_removed'));
        } catch (err) {
            setError(t('account.guide_account.errors.remove_reaction_failed'));
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
                <p>{t('auth.loading')}</p>
            </div>
        );
    }

    return (
        <div className="guide-account-container">
            <div className="guide-account-header">
                <h1 className="guide-account-title">{t('account.guide_account.title')}</h1>
                {currentUser && (
                    <div className="guide-account-user-info">
                        <span className="guide-account-welcome">{t('account.guide_account.welcome', { name: currentUser.full_name })}</span>
                        <button
                            className="guide-account-chat-btn"
                            onClick={() => setShowChat(true)}
                            style={{
                                marginLeft: '16px',
                                padding: '8px 16px',
                                backgroundColor: '#667eea',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: '500'
                            }}
                        >
                            {t('account.guide_account.messages')}
                        </button>
                    </div>
                )}
            </div>

            {error && (
                <div className="guide-account-error" style={{ background: '#f8d7da', color: '#721c24', padding: '8px 12px', borderRadius: '4px', marginBottom: '16px' }}>
                    <p>{error}</p>
                    <button onClick={() => setError(null)} className="guide-account-error-close">×</button>
                </div>
            )}

            <div className="guide-account-navigation">
                <button
                    className={`guide-account-nav-btn ${activeTab === 'dashboard' ? 'guide-account-nav-active' : ''}`}
                    onClick={() => setActiveTab('dashboard')}
                >
                    {t('account.guide_account.tabs.dashboard')}
                </button>
                <button
                    className={`guide-account-nav-btn ${activeTab === 'profile' ? 'guide-account-nav-active' : ''}`}
                    onClick={() => setActiveTab('profile')}
                >
                    {t('account.guide_account.tabs.profile')}
                </button>
                <button
                    className={`guide-account-nav-btn ${activeTab === 'bookings' ? 'guide-account-nav-active' : ''}`}
                    onClick={() => setActiveTab('bookings')}
                >
                    {t('account.guide_account.tabs.bookings')}
                </button>
                <button
                    className={`guide-account-nav-btn ${activeTab === 'portfolio' ? 'guide-account-nav-active' : ''}`}
                    onClick={() => setActiveTab('portfolio')}
                >
                    {t('account.guide_account.tabs.portfolio')}
                </button>
                <button
                    className={`guide-account-nav-btn ${activeTab === 'availability' ? 'guide-account-nav-active' : ''}`}
                    onClick={() => setActiveTab('availability')}
                >
                    {t('account.guide_account.tabs.availability')}
                </button>
                <button
                    className={`guide-account-nav-btn ${activeTab === 'reviews' ? 'guide-account-nav-active' : ''}`}
                    onClick={() => setActiveTab('reviews')}
                >
                    {t('account.guide_account.tabs.reviews')}
                </button>
            </div>

            <div className="guide-account-content">
                {activeTab === 'dashboard' && (
                    <div className="guide-account-dashboard">
                        <div className="guide-account-stats">
                            <div className="guide-account-stat-card">
                                <h3 className="guide-account-stat-title">{t('account.guide_account.dashboard.stats.total_bookings')}</h3>
                                <p className="guide-account-stat-value">{bookings.length}</p>
                            </div>
                            <div className="guide-account-stat-card">
                                <h3 className="guide-account-stat-title">{t('account.guide_account.dashboard.stats.active_bookings')}</h3>
                                <p className="guide-account-stat-value">
                                    {bookings.filter(b => b.status === 'confirmed' || b.status === 'accepted').length}
                                </p>
                            </div>
                            <div className="guide-account-stat-card">
                                <h3 className="guide-account-stat-title">{t('account.guide_account.dashboard.stats.total_reviews')}</h3>
                                <p className="guide-account-stat-value">{reviews.length}</p>
                            </div>
                            <div className="guide-account-stat-card">
                                <h3 className="guide-account-stat-title">{t('account.guide_account.dashboard.stats.average_rating')}</h3>
                                <p className="guide-account-stat-value">
                                    {typeof profile?.average_rating === 'number' && !isNaN(profile.average_rating)
                                        ? profile.average_rating.toFixed(1)
                                        : '0.0'}/5
                                </p>
                            </div>
                        </div>
                        <div className="guide-account-recent">
                            <h3 className="guide-account-section-title">{t('account.guide_account.dashboard.recent_bookings')}</h3>
                            <div className="guide-account-recent-bookings">
                                {bookings.slice(0, 5).map(booking => (
                                    <div key={booking.id} className="guide-account-booking-card">
                                        <div className="guide-account-booking-info">
                                            <h4 className="guide-account-booking-title">{t('account.guide_account.bookings.booking_title', { title: booking.title })}</h4>
                                            <p className="guide-account-booking-date">
                                                {t('account.guide_account.bookings.dates', {
                                                    start_date: new Date(booking.start_date).toLocaleDateString(),
                                                    end_date: new Date(booking.end_date).toLocaleDateString()
                                                })}
                                            </p>
                                            <span className={`guide-account-booking-status guide-account-status-${booking.status}`}>
                                                {t(`account.guide_account.dashboard.booking_status.${booking.status}`)}
                                            </span>
                                        </div>
                                        <div className="guide-account-booking-actions">
                                            {booking.status === 'pending' && (
                                                <>
                                                    <button
                                                        className="guide-account-btn guide-account-btn-accept"
                                                        onClick={() => handleBookingAction(booking.id, 'accept')}
                                                    >
                                                        {t('account.guide_account.dashboard.actions.accept')}
                                                    </button>
                                                    <button
                                                        className="guide-account-btn guide-account-btn-cancel"
                                                        onClick={() => handleOpenCancelModal(booking)}
                                                    >
                                                        {t('account.guide_account.dashboard.actions.decline')}
                                                    </button>
                                                </>
                                            )}
                                            {booking.client && (
                                                <button
                                                    className="guide-account-btn guide-account-btn-secondary"
                                                    onClick={() => handleChatWithClient(booking)}
                                                    style={{
                                                        marginLeft: '8px',
                                                        backgroundColor: '#6c757d',
                                                        color: 'white'
                                                    }}
                                                >
                                                    {t('account.guide_account.dashboard.actions.chat_with_client')}
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
                                    {t(profile ? 'account.guide_account.profile.edit_profile' : 'account.guide_account.profile.create_profile')}
                                </h3>
                                <form onSubmit={handleProfileSubmit} className="guide-account-form">
                                    <div className="guide-account-form-group">
                                        <label className="guide-account-label">{t('account.guide_account.profile.form.professional_bio_label')}</label>
                                        <textarea
                                            className="guide-account-textarea"
                                            value={profileForm.professional_bio}
                                            onChange={(e) => setProfileForm({ ...profileForm, professional_bio: e.target.value })}
                                            placeholder={t('account.guide_account.profile.form.professional_bio_placeholder')}
                                            rows="4"
                                        />
                                    </div>
                                    <div className="guide-account-form-row">
                                        <div className="guide-account-form-group">
                                            <label className="guide-account-label">{t('account.guide_account.profile.form.years_of_experience_label')}</label>
                                            <input
                                                type="number"
                                                className="guide-account-input"
                                                value={profileForm.years_of_experience}
                                                onChange={(e) => setProfileForm({ ...profileForm, years_of_experience: parseInt(e.target.value) })}
                                                min="0"
                                            />
                                        </div>
                                        <div className="guide-account-form-group">
                                            <label className="guide-account-label">{t('account.guide_account.profile.form.city_label')}</label>
                                            <select
                                                className="guide-account-select"
                                                value={profileForm.city}
                                                onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                                            >
                                                <option value="">{t('account.guide_account.profile.form.city_placeholder')}</option>
                                                {cities.map(city => (
                                                    <option key={city.id} value={city.id}>{city.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="guide-account-form-group">
                                        <label className="guide-account-label">{t('account.guide_account.profile.form.service_areas_label')}</label>
                                        <input
                                            type="text"
                                            className="guide-account-input"
                                            value={profileForm.service_areas}
                                            onChange={(e) => setProfileForm({ ...profileForm, service_areas: e.target.value })}
                                            placeholder={t('account.guide_account.profile.form.service_areas_placeholder')}
                                        />
                                    </div>
                                    <div className="guide-account-form-group">
                                        <label className="guide-account-label">{t('account.guide_account.profile.form.service_types_label')}</label>
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
                                            <label className="guide-account-label">{t('account.guide_account.profile.form.hourly_rate_label')}</label>
                                            <input
                                                type="number"
                                                className="guide-account-input"
                                                value={profileForm.hourly_rate}
                                                onChange={(e) => setProfileForm({ ...profileForm, hourly_rate: e.target.value })}
                                                placeholder={t('account.guide_account.profile.form.hourly_rate_placeholder')}
                                                step="0.01"
                                            />
                                        </div>
                                        <div className="guide-account-form-group">
                                            <label className="guide-account-label">{t('account.guide_account.profile.form.daily_rate_label')}</label>
                                            <input
                                                type="number"
                                                className="guide-account-input"
                                                value={profileForm.daily_rate}
                                                onChange={(e) => setProfileForm({ ...profileForm, daily_rate: e.target.value })}
                                                placeholder={t('account.guide_account.profile.form.daily_rate_placeholder')}
                                                step="0.01"
                                            />
                                        </div>
                                        <div className="guide-account-form-group">
                                            <label className="guide-account-label">{t('account.guide_account.profile.form.currency_label')}</label>
                                            <select
                                                className="guide-account-select"
                                                value={profileForm.currency}
                                                onChange={(e) => setProfileForm({ ...profileForm, currency: e.target.value })}
                                            >
                                                <option value="USD">USD</option>
                                                <option value="EUR">EUR</option>
                                                <option value="UZS">UZS</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="guide-account-form-group">
                                        <label className="guide-account-label">{t('account.guide_account.profile.form.languages_label')}</label>
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
                                            {t('account.guide_account.profile.form.is_available_label')}
                                        </label>
                                    </div>
                                    <div className="guide-account-form-actions">
                                        <button type="submit" className="guide-account-btn guide-account-btn-primary">
                                            {t(profile ? 'account.guide_account.profile.form.submit_update' : 'account.guide_account.profile.form.submit_create')}
                                        </button>
                                        {profile && (
                                            <button
                                                type="button"
                                                className="guide-account-btn guide-account-btn-secondary"
                                                onClick={() => setShowProfileForm(false)}
                                            >
                                                {t('account.guide_account.profile.form.cancel')}
                                            </button>
                                        )}
                                    </div>
                                </form>
                            </div>
                        ) : (
                            <div className="guide-account-profile-view">
                                <div className="guide-account-profile-header">
                                    <h3 className="guide-account-section-title">{t('account.guide_account.profile.profile_information')}</h3>
                                    <button
                                        className="guide-account-btn guide-account-btn-primary"
                                        onClick={() => setShowProfileForm(true)}
                                    >
                                        {t('account.guide_account.profile.edit_profile')}
                                    </button>
                                </div>
                                <div className="guide-account-profile-info">
                                    <div className="guide-account-profile-field">
                                        <label className="guide-account-profile-label">{t('account.guide_account.profile.professional_bio')}</label>
                                        <p className="guide-account-profile-value">{profile.professional_bio}</p>
                                    </div>
                                    <div className="guide-account-profile-field">
                                        <label className="guide-account-profile-label">{t('account.guide_account.profile.years_of_experience', { years: profile.years_of_experience })}</label>
                                        <p className="guide-account-profile-value">{profile.years_of_experience} years</p>
                                    </div>
                                    <div className="guide-account-profile-field">
                                        <label className="guide-account-profile-label">{t('account.guide_account.profile.availability')}</label>
                                        <p className="guide-account-profile-value">
                                            {profile.is_available ? t('account.guide_account.profile.available') : t('account.guide_account.profile.not_available')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                {activeTab === 'bookings' && (
                    <div className="guide-account-bookings">
                        <h3 className="guide-account-section-title">{t('account.guide_account.bookings.title')}</h3>
                        <div className="guide-account-bookings-list">
                            {bookings.map(booking => (
                                <div key={booking.id} className="guide-account-booking-item">
                                    <div className="guide-account-booking-details">
                                        <h4 className="guide-account-booking-title">{t('account.guide_account.bookings.booking_title', { title: booking.title })}</h4>
                                        <p className="guide-account-booking-dates">
                                            {t('account.guide_account.bookings.dates', {
                                                start_date: new Date(booking.start_date).toLocaleDateString(),
                                                end_date: new Date(booking.end_date).toLocaleDateString()
                                            })}
                                        </p>
                                        <p className="guide-account-booking-description">{t('account.guide_account.bookings.description', { description: booking.description })}</p>
                                        <span className={`guide-account-booking-status guide-account-status-${booking.status}`}>
                                            {t(`account.guide_account.dashboard.booking_status.${booking.status}`)}
                                        </span>
                                    </div>
                                    <div className="guide-account-booking-actions">
                                        {booking.status === 'pending' && (
                                            <>
                                                <button
                                                    className="guide-account-btn guide-account-btn-accept"
                                                    onClick={() => handleBookingAction(booking.id, 'accept')}
                                                >
                                                    {t('account.guide_account.dashboard.actions.accept')}
                                                </button>
                                                <button
                                                    className="guide-account-btn guide-account-btn-cancel"
                                                    onClick={() => handleOpenCancelModal(booking)}
                                                >
                                                    {t('account.guide_account.dashboard.actions.decline')}
                                                </button>
                                            </>
                                        )}
                                        {booking.client && (
                                            <button
                                                className="guide-account-btn guide-account-btn-secondary"
                                                onClick={() => handleChatWithClient(booking)}
                                                style={{
                                                    marginLeft: '8px',
                                                    backgroundColor: '#6c757d',
                                                    color: 'white'
                                                }}
                                            >
                                                {t('account.guide_account.dashboard.actions.chat_with_client')}
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
                            <h3 className="guide-account-section-title">{t('account.guide_account.portfolio.title')}</h3>
                            <button
                                className="guide-account-btn guide-account-btn-primary"
                                onClick={() => setShowPortfolioForm(true)}
                            >
                                {t('account.guide_account.portfolio.add_item')}
                            </button>
                        </div>
                        {showPortfolioForm && (
                            <div className="guide-account-portfolio-form">
                                <h4 className="guide-account-form-title">
                                    {t('account.guide_account.portfolio.form.title', { action: editingPortfolioItem ? t('account.guide_account.profile.edit_profile') : t('account.guide_account.portfolio.add_item') })}
                                </h4>
                                <form onSubmit={handlePortfolioSubmit} className="guide-account-form">
                                    <div className="guide-account-form-group">
                                        <label className="guide-account-label">{t('account.guide_account.portfolio.form.title_label')}</label>
                                        <input
                                            type="text"
                                            className="guide-account-input"
                                            value={portfolioForm.title}
                                            onChange={(e) => setPortfolioForm({ ...portfolioForm, title: e.target.value })}
                                            placeholder={t('account.guide_account.portfolio.form.title_placeholder')}
                                            required
                                        />
                                    </div>
                                    <div className="guide-account-form-group">
                                        <label className="guide-account-label">{t('account.guide_account.portfolio.form.description_label')}</label>
                                        <textarea
                                            className="guide-account-textarea"
                                            value={portfolioForm.description}
                                            onChange={(e) => setPortfolioForm({ ...portfolioForm, description: e.target.value })}
                                            placeholder={t('account.guide_account.portfolio.form.description_placeholder')}
                                            rows="3"
                                        />
                                    </div>
                                    <div className="guide-account-form-group">
                                        <label className="guide-account-label">{t('account.guide_account.portfolio.form.image_label')}</label>
                                        <input
                                            type="file"
                                            className="guide-account-file-input"
                                            accept="image/*"
                                            onChange={(e) => setPortfolioForm({ ...portfolioForm, image: e.target.files[0] })}
                                        />
                                    </div>
                                    <div className="guide-account-form-group">
                                        <label className="guide-account-label">{t('account.guide_account.portfolio.form.order_label')}</label>
                                        <input
                                            type="number"
                                            className="guide-account-input"
                                            value={portfolioForm.order}
                                            onChange={(e) => setPortfolioForm({ ...portfolioForm, order: parseInt(e.target.value) })}
                                            placeholder={t('account.guide_account.portfolio.form.order_placeholder')}
                                            min="0"
                                        />
                                    </div>
                                    <div className="guide-account-form-actions">
                                        <button type="submit" className="guide-account-btn guide-account-btn-primary">
                                            {t(editingPortfolioItem ? 'account.guide_account.portfolio.form.submit_update' : 'account.guide_account.portfolio.form.submit_create')}
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
                                            {t('account.guide_account.portfolio.form.cancel')}
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
                                                {t('account.guide_account.portfolio.item.edit')}
                                            </button>
                                            <button
                                                className="guide-account-btn guide-account-btn-small guide-account-btn-danger"
                                                onClick={() => handleDeletePortfolio(item.id)}
                                            >
                                                {t('account.guide_account.portfolio.item.delete')}
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
                            <h3 className="guide-account-section-title">{t('account.guide_account.availability.title')}</h3>
                            <button
                                className="guide-account-btn guide-account-btn-primary"
                                onClick={() => setShowAvailabilityForm(true)}
                            >
                                {t('account.guide_account.availability.add_availability')}
                            </button>
                        </div>
                        {showAvailabilityForm && (
                            <div className="guide-account-availability-form">
                                <h4 className="guide-account-form-title">
                                    {t('account.guide_account.availability.form.title', { action: editingAvailability ? t('account.guide_account.profile.edit_profile') : t('account.guide_account.availability.add_availability') })}
                                </h4>
                                <form onSubmit={handleAvailabilitySubmit} className="guide-account-form">
                                    <div className="guide-account-form-row">
                                        <div className="guide-account-form-group">
                                            <label className="guide-account-label">{t('account.guide_account.availability.form.date_label')}</label>
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
                                                {t('account.guide_account.availability.form.is_available_label')}
                                            </label>
                                        </div>
                                    </div>
                                    <div className="guide-account-form-row">
                                        <div className="guide-account-form-group">
                                            <label className="guide-account-label">{t('account.guide_account.availability.form.start_time_label')}</label>
                                            <input
                                                type="time"
                                                className="guide-account-input"
                                                value={availabilityForm.start_time}
                                                onChange={(e) => setAvailabilityForm({ ...availabilityForm, start_time: e.target.value })}
                                            />
                                        </div>
                                        <div className="guide-account-form-group">
                                            <label className="guide-account-label">{t('account.guide_account.availability.form.end_time_label')}</label>
                                            <input
                                                type="time"
                                                className="guide-account-input"
                                                value={availabilityForm.end_time}
                                                onChange={(e) => setAvailabilityForm({ ...availabilityForm, end_time: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="guide-account-form-group">
                                        <label className="guide-account-label">{t('account.guide_account.availability.form.note_label')}</label>
                                        <input
                                            type="text"
                                            className="guide-account-input"
                                            value={availabilityForm.note}
                                            onChange={(e) => setAvailabilityForm({ ...availabilityForm, note: e.target.value })}
                                            placeholder={t('account.guide_account.availability.form.note_placeholder')}
                                        />
                                    </div>
                                    <div className="guide-account-form-actions">
                                        <button type="submit" className="guide-account-btn guide-account-btn-primary">
                                            {t(editingAvailability ? 'account.guide_account.availability.form.submit_update' : 'account.guide_account.availability.form.submit_create')}
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
                                            {t('account.guide_account.availability.form.cancel')}
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
                                            {t('account.guide_account.availability.item.date', { date: new Date(item.date).toLocaleDateString() })}
                                        </h4>
                                        <p className="guide-account-availability-time">
                                            {item.start_time && item.end_time ?
                                                t('account.guide_account.availability.item.time', { start_time: item.start_time, end_time: item.end_time }) :
                                                t('account.guide_account.availability.item.all_day')
                                            }
                                        </p>
                                        <p className="guide-account-availability-note">{t('account.guide_account.availability.item.note', { note: item.note || t('account.guide_account.find_guide.none') })}</p>
                                        <span className={`guide-account-availability-status ${item.is_available ? 'guide-account-available' : 'guide-account-unavailable'}`}>
                                            {item.is_available ? t('account.guide_account.availability.item.available') : t('account.guide_account.availability.item.unavailable')}
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
                                            {t('account.guide_account.availability.item.edit')}
                                        </button>
                                        <button
                                            className="guide-account-btn guide-account-btn-small guide-account-btn-danger"
                                            onClick={() => handleDeleteAvailability(item.id)}
                                        >
                                            {t('account.guide_account.availability.item.delete')}
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
                            <h3 className="guide-account-section-title">{t('account.guide_account.reviews.title')}</h3>
                            <div className="guide-account-reviews-filters">
                                <select
                                    className="guide-account-filter-select"
                                    value={reviewFilter.minRating}
                                    onChange={(e) => handleReviewFilterChange('minRating', e.target.value)}
                                >
                                    <option value="">{t('account.guide_account.reviews.filters.all_ratings')}</option>
                                    <option value="5">{t('account.guide_account.reviews.filters.stars_5')}</option>
                                    <option value="4">{t('account.guide_account.reviews.filters.stars_4')}</option>
                                    <option value="3">{t('account.guide_account.reviews.filters.stars_3')}</option>
                                    <option value="2">{t('account.guide_account.reviews.filters.stars_2')}</option>
                                    <option value="1">{t('account.guide_account.reviews.filters.stars_1')}</option>
                                </select>
                                <select
                                    className="guide-account-filter-select"
                                    value={reviewFilter.sortBy}
                                    onChange={(e) => handleReviewFilterChange('sortBy', e.target.value)}
                                >
                                    <option value="date_desc">{t('account.guide_account.reviews.filters.sort_newest')}</option>
                                    <option value="date_asc">{t('account.guide_account.reviews.filters.sort_oldest')}</option>
                                    <option value="rating_desc">{t('account.guide_account.reviews.filters.sort_highest')}</option>
                                    <option value="rating_asc">{t('account.guide_account.reviews.filters.sort_lowest')}</option>
                                </select>
                            </div>
                        </div>
                        {reviewSummary && (
                            <div className="guide-account-reviews-summary">
                                <h4 className="guide-account-section-subtitle">{t('account.guide_account.reviews.summary.title')}</h4>
                                <div className="guide-account-reviews-summary-grid">
                                    <div className="guide-account-summary-item">
                                        <span className="guide-account-summary-label">{t('account.guide_account.reviews.summary.overall')}</span>
                                        <span className="guide-account-summary-value">
                                            {t('account.guide_account.reviews.summary.overall', { rating: reviewSummary.overall_rating?.toFixed(1) || 0 })}
                                        </span>
                                    </div>
                                    <div className="guide-account-summary-item">
                                        <span className="guide-account-summary-label">{t('account.guide_account.reviews.summary.communication')}</span>
                                        <span className="guide-account-summary-value">
                                            {t('account.guide_account.reviews.summary.communication', { rating: reviewSummary.communication_rating?.toFixed(1) || 0 })}
                                        </span>
                                    </div>
                                    <div className="guide-account-summary-item">
                                        <span className="guide-account-summary-label">{t('account.guide_account.reviews.summary.service')}</span>
                                        <span className="guide-account-summary-value">
                                            {t('account.guide_account.reviews.summary.service', { rating: reviewSummary.service_rating?.toFixed(1) || 0 })}
                                        </span>
                                    </div>
                                    <div className="guide-account-summary-item">
                                        <span className="guide-account-summary-label">{t('account.guide_account.reviews.summary.punctuality')}</span>
                                        <span className="guide-account-summary-value">
                                            {t('account.guide_account.reviews.summary.punctuality', { rating: reviewSummary.punctuality_rating?.toFixed(1) || 0 })}
                                        </span>
                                    </div>
                                    <div className="guide-account-summary-item">
                                        <span className="guide-account-summary-label">{t('account.guide_account.reviews.summary.value')}</span>
                                        <span className="guide-account-summary-value">
                                            {t('account.guide_account.reviews.summary.value', { rating: reviewSummary.value_rating?.toFixed(1) || 0 })}
                                        </span>
                                    </div>
                                    <div className="guide-account-summary-item">
                                        <span className="guide-account-summary-label">{t('account.guide_account.reviews.summary.total_reviews')}</span>
                                        <span className="guide-account-summary-value">
                                            {t('account.guide_account.reviews.summary.total_reviews', { count: reviewSummary.total_reviews || 0 })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div className="guide-account-reviews-list">
                            {filteredReviews.length === 0 ? (
                                <p>{t('account.guide_account.reviews.no_reviews')}</p>
                            ) : (
                                filteredReviews.map(review => (
                                    <div key={review.id} className="guide-account-review-item">
                                        <div className="guide-account-review-header">
                                            <div className="guide-account-review-rating">
                                                {'★'.repeat(review.overall_rating)}{'☆'.repeat(5 - review.overall_rating)}
                                                <span className="guide-account-review-rating-text">
                                                    {t('account.guide_account.reviews.review_item.rating', { rating: review.overall_rating })}
                                                </span>
                                            </div>
                                            <span className="guide-account-review-date">
                                                {t('account.guide_account.reviews.review_item.date', { date: new Date(review.created_at).toLocaleDateString() })}
                                            </span>
                                        </div>
                                        <h4 className="guide-account-review-title">{review.title}</h4>
                                        <p className="guide-account-review-comment">{review.comment}</p>
                                        <div className="guide-account-review-details">
                                            <span className="guide-account-review-detail">{t('account.guide_account.reviews.review_item.communication', { rating: review.communication_rating })}</span>
                                            <span className="guide-account-review-detail">{t('account.guide_account.reviews.review_item.service', { rating: review.service_rating })}</span>
                                            <span className="guide-account-review-detail">{t('account.guide_account.reviews.review_item.punctuality', { rating: review.punctuality_rating })}</span>
                                            <span className="guide-account-review-detail">{t('account.guide_account.reviews.review_item.value', { rating: review.value_rating })}</span>
                                        </div>
                                        <div className="guide-account-review-actions">
                                            <button
                                                className="guide-account-btn guide-account-btn-small"
                                                onClick={() => {
                                                    setShowReactionForm(review.id);
                                                    setReactionForm({ reactionType: 'like', comment: '' });
                                                }}
                                            >
                                                {t('account.guide_account.reviews.review_item.react')}
                                            </button>
                                            {review.my_reaction && (
                                                <button
                                                    className="guide-account-btn guide-account-btn-small guide-account-btn-danger"
                                                    onClick={() => handleRemoveReaction(review.id)}
                                                >
                                                    {t('account.guide_account.reviews.review_item.remove_reaction')}
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
                                                        <label className="guide-account-label">{t('account.guide_account.reaction_form.reaction_type_label')}</label>
                                                        <select
                                                            className="guide-account-select"
                                                            value={reactionForm.reactionType}
                                                            onChange={(e) => setReactionForm({ ...reactionForm, reactionType: e.target.value })}
                                                        >
                                                            <option value="like">{t('account.guide_account.reaction_form.reaction_like')}</option>
                                                            <option value="comment">{t('account.guide_account.reaction_form.reaction_comment')}</option>
                                                            <option value="report">{t('account.guide_account.reaction_form.reaction_report')}</option>
                                                        </select>
                                                    </div>
                                                    {reactionForm.reactionType === 'comment' && (
                                                        <div className="guide-account-form-group">
                                                            <label className="guide-account-label">{t('account.guide_account.reaction_form.comment_label')}</label>
                                                            <textarea
                                                                className="guide-account-textarea"
                                                                value={reactionForm.comment}
                                                                onChange={(e) => setReactionForm({ ...reactionForm, comment: e.target.value })}
                                                                rows="3"
                                                                placeholder={t('account.guide_account.reaction_form.comment_placeholder')}
                                                            />
                                                        </div>
                                                    )}
                                                    {reactionForm.reactionType === 'report' && (
                                                        <div className="guide-account-form-group">
                                                            <label className="guide-account-label">{t('account.guide_account.reaction_form.report_reason_label')}</label>
                                                            <textarea
                                                                className="guide-account-textarea"
                                                                value={reactionForm.comment}
                                                                onChange={(e) => setReactionForm({ ...reactionForm, comment: e.target.value })}
                                                                rows="3"
                                                                placeholder={t('account.guide_account.reaction_form.report_reason_placeholder')}
                                                                required
                                                            />
                                                        </div>
                                                    )}
                                                    <div className="guide-account-form-actions">
                                                        <button type="submit" className="guide-account-btn guide-account-btn-primary">
                                                            {t('account.guide_account.reaction_form.submit')}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="guide-account-btn guide-account-btn-secondary"
                                                            onClick={() => setShowReactionForm(null)}
                                                        >
                                                            {t('account.guide_account.reaction_form.cancel')}
                                                        </button>
                                                    </div>
                                                </form>
                                            </div>
                                        )}
                                        {review.my_reaction && (
                                            <div className="guide-account-reaction-display">
                                                <p>
                                                    {review.my_reaction.comment ?
                                                        t('account.guide_account.reviews.review_item.my_reaction_with_comment', {
                                                            type: review.my_reaction.reaction_type,
                                                            comment: review.my_reaction.comment
                                                        }) :
                                                        t('account.guide_account.reviews.review_item.my_reaction', { type: review.my_reaction.reaction_type })}
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
                            <h3 className="guide-account-modal-title">{t('account.guide_account.cancel_booking.title')}</h3>
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
                        <form onSubmit={(e) => { e.preventDefault(); handleCancelBooking(); }} className="guide-account-form">
                            <div className="guide-account-form-group">
                                <label className="guide-account-label">{t('account.guide_account.cancel_booking.reason_label')}</label>
                                <textarea
                                    className="guide-account-textarea"
                                    value={cancelReason}
                                    onChange={(e) => setCancelReason(e.target.value)}
                                    rows="4"
                                    required
                                    placeholder={t('account.guide_account.cancel_booking.reason_placeholder')}
                                />
                            </div>
                            {error && (
                                <div style={{
                                    background: '#f8d7da',
                                    color: '#721c24',
                                    padding: '8px 12px',
                                    borderRadius: '4px',
                                    marginBottom: '16px',
                                    fontSize: '14px'
                                }}>
                                    {error}
                                </div>
                            )}
                            <div className="guide-account-form-actions">
                                <button type="submit" className="guide-account-btn guide-account-btn-danger">
                                    {t('account.guide_account.cancel_booking.submit')}
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
                                    {t('account.guide_account.cancel_booking.close')}
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