import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    getClientProfile,
    createClientProfile,
    updateClientProfile,
    getMyBookings,
    createBooking,
    cancelBooking,
    getCustomerProfiles,
    getMyReviews,
    createReview,
    updateReview,
    deleteReview,
    getLanguages,
    getCurrentUser,
    getServiceTypes,
    reactToReview,
    removeReactionFromReview,
    getReviewReactions,
    getReviewSummary,
    getCities,
    getCountries
} from '../api/api';
import ChatWidgets from './ChatWidgets';
import './UserAccount.css';

const UserAccount = () => {
    const { t } = useTranslation();
    const [currentUser, setCurrentUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [bookings, setBookings] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [guides, setGuides] = useState([]);
    const [languages, setLanguages] = useState([]);
    const [serviceTypes, setServiceTypes] = useState([]);
    const [cities, setCities] = useState([]);
    const [countries, setCountries] = useState([]);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showProfileForm, setShowProfileForm] = useState(false);
    const [showBookingForm, setShowBookingForm] = useState(false);
    const [showReviewForm, setShowReviewForm] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [showReactionsModal, setShowReactionsModal] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [selectedGuide, setSelectedGuide] = useState(null);
    const [selectedBookingForReview, setSelectedBookingForReview] = useState(null);
    const [selectedBookingForCancel, setSelectedBookingForCancel] = useState(null);
    const [selectedReviewForReactions, setSelectedReviewForReactions] = useState(null);
    const [reactions, setReactions] = useState([]);
    const [reactionSummary, setReactionSummary] = useState(null);
    const [showChat, setShowChat] = useState(false);
    const [selectedUserForChat, setSelectedUserForChat] = useState(null);
    const [guidesFilter, setGuidesFilter] = useState({
        search: '',
        service_type: '',
        country: '',
        city: '',
        min_rating: '',
        is_available: true
    });
    const [reviewFilter, setReviewFilter] = useState({
        minRating: '',
        sortBy: 'date_desc'
    });
    const [editingReview, setEditingReview] = useState(null);
    const [profileForm, setProfileForm] = useState({
        date_of_birth: '',
        preferred_contact: 'email',
        languages: []
    });
    const [bookingForm, setBookingForm] = useState({
        title: '',
        description: '',
        start_date: '',
        end_date: '',
        special_requirements: '',
        budget: '',
        customer_profile: ''
    });
    const [reviewForm, setReviewForm] = useState({
        overall_rating: 5,
        communication_rating: 5,
        service_rating: 5,
        punctuality_rating: 5,
        value_rating: 5,
        title: '',
        comment: '',
        booking_id: ''
    });
    const [reactionForm, setReactionForm] = useState({
        reaction_type: 'like',
        comment: ''
    });

    useEffect(() => {
        initializeData();
    }, []);

    const initializeData = async () => {
        try {
            setLoading(true);
            const userData = await getCurrentUser();
            setCurrentUser(userData);
            const [languagesData, serviceTypesData, citiesData, countriesData] = await Promise.all([
                getLanguages(),
                getServiceTypes(),
                getCities(),
                getCountries()
            ]);
            setLanguages(languagesData.results || languagesData);
            setServiceTypes(serviceTypesData.results || serviceTypesData);
            setCities(citiesData.results || citiesData);
            setCountries(countriesData.results || countriesData);
            try {
                const profileData = await getClientProfile();
                setProfile(profileData);
                setProfileForm({
                    date_of_birth: profileData.date_of_birth || '',
                    preferred_contact: profileData.preferred_contact || 'email',
                    languages: profileData.languages || []
                });
            } catch (profileError) {
                console.log('No profile found, user needs to create one');
                setShowProfileForm(true);
            }
            await Promise.all([
                loadBookings(),
                loadReviews(),
                loadGuides()
            ]);
        } catch (err) {
            console.error('Error initializing data:', err);
            setError(t('account.user_account.errors.required_fields'));
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

    const loadGuides = async () => {
        try {
            const params = {};
            if (guidesFilter.search) params.search = guidesFilter.search;
            if (guidesFilter.service_type) params.service_types = guidesFilter.service_type;
            if (guidesFilter.country) params.country = guidesFilter.country;
            if (guidesFilter.city) params.city = guidesFilter.city;
            if (guidesFilter.min_rating) params.average_rating__gte = guidesFilter.min_rating;
            if (guidesFilter.is_available) params.is_available = guidesFilter.is_available;
            const data = await getCustomerProfiles(params);
            setGuides(data.results || data);
        } catch (err) {
            console.error('Error loading guides:', err);
        }
    };

    const loadReviewReactions = async (reviewId) => {
        try {
            const data = await getReviewReactions(reviewId);
            setReactions(data.results || data);
        } catch (err) {
            console.error('Error loading reactions:', err);
            setError(t('account.user_account.errors.load_reactions_failed'));
        }
    };

    const loadReviewSummary = async (reviewId) => {
        try {
            const data = await getReviewSummary(reviewId);
            setReactionSummary(data);
        } catch (err) {
            console.error('Error loading review summary:', err);
            setError(t('account.user_account.errors.load_summary_failed'));
        }
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        try {
            let result;
            if (profile) {
                result = await updateClientProfile(profileForm);
            } else {
                result = await createClientProfile(profileForm);
            }
            setProfile(result);
            setShowProfileForm(false);
            setError(null);
        } catch (err) {
            setError(t('account.user_account.errors.required_fields'));
        }
    };

    const handleBookingSubmit = async (e) => {
        e.preventDefault();
        if (!bookingForm.start_date) {
            setError(t('account.user_account.errors.start_date_required'));
            return;
        }
        if (!bookingForm.end_date) {
            setError(t('account.user_account.errors.end_date_required'));
            return;
        }
        if (!bookingForm.title.trim()) {
            setError(t('account.user_account.errors.title_required'));
            return;
        }
        if (new Date(bookingForm.start_date) > new Date(bookingForm.end_date)) {
            setError(t('account.user_account.errors.start_date_before_end'));
            return;
        }
        const today = new Date().toISOString().split('T')[0];
        if (bookingForm.start_date < today) {
            setError(t('account.user_account.errors.start_date_past'));
            return;
        }
        try {
            const bookingData = {
                title: bookingForm.title.trim(),
                description: bookingForm.description.trim(),
                start_date: bookingForm.start_date,
                end_date: bookingForm.end_date,
                special_requirements: bookingForm.special_requirements.trim(),
                budget: bookingForm.budget ? parseFloat(bookingForm.budget) : null,
                customer_profile: selectedGuide.id
            };
            await createBooking(bookingData);
            loadBookings();
            setShowBookingForm(false);
            setSelectedGuide(null);
            setBookingForm({
                title: '',
                description: '',
                start_date: '',
                end_date: '',
                special_requirements: '',
                budget: '',
                customer_profile: ''
            });
            setError(null);
            alert(t('account.user_account.success.booking_created'));
        } catch (err) {
            console.error('Booking creation error:', err);
            setError(t('account.user_account.errors.booking_failed'));
        }
    };

    const handleReviewSubmit = async (e) => {
        e.preventDefault();
        if (!reviewForm.title.trim()) {
            setError(t('account.user_account.errors.review_title_required'));
            return;
        }
        if (!reviewForm.comment.trim()) {
            setError(t('account.user_account.errors.review_comment_required'));
            return;
        }
        try {
            const reviewData = {
                ...reviewForm,
                booking_id: selectedBookingForReview.id
            };
            if (editingReview) {
                await updateReview(editingReview.id, reviewData);
            } else {
                await createReview(reviewData);
            }
            loadReviews();
            loadBookings();
            setShowReviewForm(false);
            setSelectedBookingForReview(null);
            setEditingReview(null);
            setReviewForm({
                overall_rating: 5,
                communication_rating: 5,
                service_rating: 5,
                punctuality_rating: 5,
                value_rating: 5,
                title: '',
                comment: '',
                booking_id: ''
            });
            setError(null);
            alert(t(editingReview ? 'account.user_account.success.review_updated' : 'account.user_account.success.review_submitted'));
        } catch (err) {
            setError(t('account.user_account.errors.review_failed'));
        }
    };

    const handleDeleteReview = async (reviewId) => {
        if (!window.confirm('Are you sure you want to delete this review?')) return;
        try {
            await deleteReview(reviewId);
            loadReviews();
            loadBookings();
            setError(null);
            alert(t('account.user_account.success.review_deleted'));
        } catch (err) {
            setError(t('account.user_account.errors.delete_review_failed'));
        }
    };

    const handleReactToReview = async (reviewId) => {
        if (reactionForm.reaction_type === 'dislike' && !reactionForm.comment.trim()) {
            setError(t('account.user_account.errors.dislike_comment_required'));
            return;
        }
        try {
            await reactToReview(reviewId, reactionForm.reaction_type, reactionForm.comment);
            loadReviewReactions(reviewId);
            loadReviewSummary(reviewId);
            setReactionForm({ reaction_type: 'like', comment: '' });
            setError(null);
            alert(t('account.user_account.success.reaction_submitted'));
        } catch (err) {
            setError(t('account.user_account.errors.reaction_failed'));
        }
    };

    const handleRemoveReaction = async (reviewId) => {
        try {
            await removeReactionFromReview(reviewId);
            loadReviewReactions(reviewId);
            loadReviewSummary(reviewId);
            setError(null);
            alert(t('account.user_account.success.reaction_removed'));
        } catch (err) {
            setError(t('account.user_account.errors.remove_reaction_failed'));
        }
    };

    const handleViewReactions = (review) => {
        setSelectedReviewForReactions(review);
        loadReviewReactions(review.id);
        loadReviewSummary(review.id);
        setShowReactionsModal(true);
    };

    const handleEditReview = (review, booking) => {
        setSelectedBookingForReview(booking);
        setEditingReview(review);
        setReviewForm({
            overall_rating: review.overall_rating,
            communication_rating: review.communication_rating,
            service_rating: review.service_rating,
            punctuality_rating: review.punctuality_rating,
            value_rating: review.value_rating,
            title: review.title,
            comment: review.comment,
            booking_id: review.booking
        });
        setShowReviewForm(true);
    };

    const handleCancelBooking = async () => {
        if (!cancelReason.trim()) {
            setError(t('account.user_account.errors.cancel_reason_required'));
            return;
        }
        try {
            await cancelBooking(selectedBookingForCancel.id, cancelReason);
            loadBookings();
            setShowCancelModal(false);
            setSelectedBookingForCancel(null);
            setCancelReason('');
            setError(null);
            alert(t('account.user_account.success.booking_cancelled'));
        } catch (err) {
            setError(t('account.user_account.errors.cancel_booking_failed'));
        }
    };

    const handleBookGuide = (guide) => {
        setSelectedGuide(guide);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);
        setBookingForm({
            title: t('account.user_account.booking_form.title', { name: guide.user?.full_name || 'Guide' }),
            description: '',
            start_date: tomorrow.toISOString().split('T')[0],
            end_date: nextWeek.toISOString().split('T')[0],
            special_requirements: '',
            budget: guide.daily_rate || guide.hourly_rate || '',
            customer_profile: ''
        });
        setShowBookingForm(true);
    };

    const handleWriteReview = (booking) => {
        setSelectedBookingForReview(booking);
        setEditingReview(null);
        setReviewForm({
            overall_rating: 5,
            communication_rating: 5,
            service_rating: 5,
            punctuality_rating: 5,
            value_rating: 5,
            title: t('account.user_account.review_form.title', { action: 'Write', guide: booking.customer_profile?.user?.full_name || 'Unknown', booking: booking.title }),
            comment: '',
            booking_id: booking.id
        });
        setShowReviewForm(true);
    };

    const handleOpenCancelModal = (booking) => {
        setSelectedBookingForCancel(booking);
        setCancelReason('');
        setShowCancelModal(true);
    };

    const handleChatWithUser = (user) => {
        setSelectedUserForChat(user?.user?.email || user?.email);
        setShowChat(true);
    };

    const handleCloseChat = () => {
        setShowChat(false);
        setSelectedUserForChat(null);
    };

    const handleFilterChange = async (key, value) => {
        if (key === 'country') {
            setGuidesFilter({ ...guidesFilter, [key]: value, city: '' });
            if (value) {
                try {
                    const citiesData = await getCities(value);
                    setCities(citiesData.results || citiesData);
                } catch (err) {
                    console.error('Error loading cities:', err);
                }
            } else {
                try {
                    const allCitiesData = await getCities();
                    setCities(allCitiesData.results || allCitiesData);
                } catch (err) {
                    console.error('Error loading all cities:', err);
                }
            }
        } else {
            setGuidesFilter({ ...guidesFilter, [key]: value });
        }
    };

    const handleReviewFilterChange = (key, value) => {
        setReviewFilter({ ...reviewFilter, [key]: value });
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

    useEffect(() => {
        loadGuides();
    }, [guidesFilter]);

    if (loading) {
        return (
            <div className="user-account-loading">
                <div className="user-account-spinner"></div>
                <p>{t('auth.loading')}</p>
            </div>
        );
    }

    return (
        <div className="user-account-container">
            <div className="user-account-header">
                <h1 className="user-account-title">{t('account.user_account.title')}</h1>
                {currentUser && (
                    <div className="user-account-user-info">
                        <span className="user-account-welcome">
                            {t('account.user_account.welcome', { name: currentUser.full_name })}
                        </span>
                        <button
                            className="user-account-chat-btn"
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
                            {t('account.user_account.messages')}
                        </button>
                    </div>
                )}
            </div>
            {error && (
                <div className="user-account-error" style={{ background: '#f8d7da', color: '#721c24', padding: '8px 12px', borderRadius: '4px', marginBottom: '16px' }}>
                    <p>{error}</p>
                    <button onClick={() => setError(null)} className="user-account-error-close">×</button>
                </div>
            )}
            <div className="user-account-navigation">
                <button
                    className={`user-account-nav-btn ${activeTab === 'dashboard' ? 'user-account-nav-active' : ''}`}
                    onClick={() => setActiveTab('dashboard')}
                >
                    {t('account.user_account.tabs.dashboard')}
                </button>
                <button
                    className={`user-account-nav-btn ${activeTab === 'profile' ? 'user-account-nav-active' : ''}`}
                    onClick={() => setActiveTab('profile')}
                >
                    {t('account.user_account.tabs.profile')}
                </button>
                <button
                    className={`user-account-nav-btn ${activeTab === 'guides' ? 'user-account-nav-active' : ''}`}
                    onClick={() => setActiveTab('guides')}
                >
                    {t('account.user_account.tabs.guides')}
                </button>
                <button
                    className={`user-account-nav-btn ${activeTab === 'bookings' ? 'user-account-nav-active' : ''}`}
                    onClick={() => setActiveTab('bookings')}
                >
                    {t('account.user_account.tabs.bookings')}
                </button>
                <button
                    className={`user-account-nav-btn ${activeTab === 'reviews' ? 'user-account-nav-active' : ''}`}
                    onClick={() => setActiveTab('reviews')}
                >
                    {t('account.user_account.tabs.reviews')}
                </button>
            </div>
            <div className="user-account-content">
                {activeTab === 'dashboard' && (
                    <div className="user-account-dashboard">
                        <div className="user-account-stats">
                            <div className="user-account-stat-card">
                                <h3 className="user-account-stat-title">{t('account.user_account.dashboard.stats.total_bookings')}</h3>
                                <p className="user-account-stat-value">{bookings.length}</p>
                            </div>
                            <div className="user-account-stat-card">
                                <h3 className="user-account-stat-title">{t('account.user_account.dashboard.stats.active_bookings')}</h3>
                                <p className="user-account-stat-value">
                                    {bookings.filter(b => b.status === 'confirmed' || b.status === 'accepted').length}
                                </p>
                            </div>
                            <div className="user-account-stat-card">
                                <h3 className="user-account-stat-title">{t('account.user_account.dashboard.stats.completed_trips')}</h3>
                                <p className="user-account-stat-value">
                                    {bookings.filter(b => b.status === 'completed').length}
                                </p>
                            </div>
                            <div className="user-account-stat-card">
                                <h3 className="user-account-stat-title">{t('account.user_account.dashboard.stats.reviews_written')}</h3>
                                <p className="user-account-stat-value">{reviews.length}</p>
                            </div>
                        </div>
                        <div className="user-account-recent">
                            <h3 className="user-account-section-title">{t('account.user_account.dashboard.recent_bookings')}</h3>
                            <div className="user-account-recent-bookings">
                                {bookings.slice(0, 5).map(booking => (
                                    <div key={booking.id} className="user-account-booking-card">
                                        <div className="user-account-booking-info">
                                            <h4 className="user-account-booking-title">{booking.title}</h4>
                                            <p className="user-account-booking-date">
                                                {t('account.user_account.bookings.dates', {
                                                    start_date: new Date(booking.start_date).toLocaleDateString(),
                                                    end_date: new Date(booking.end_date).toLocaleDateString()
                                                })}
                                            </p>
                                            <span className={`user-account-booking-status user-account-status-${booking.status}`}>
                                                {t(`account.user_account.dashboard.booking_status.${booking.status}`)}
                                            </span>
                                            {booking.status === 'cancelled' && booking.cancellation_reason && (
                                                <p className="user-account-booking-cancel-reason" style={{ color: '#721c24', fontSize: '14px', marginTop: '8px' }}>
                                                    {t('account.user_account.dashboard.cancellation_reason', { reason: booking.cancellation_reason })}
                                                </p>
                                            )}
                                        </div>
                                        <div className="user-account-booking-actions">
                                            {['pending', 'confirmed', 'accepted'].includes(booking.status) && (
                                                <button
                                                    className="user-account-btn user-account-btn-cancel"
                                                    onClick={() => handleOpenCancelModal(booking)}
                                                >
                                                    {t('account.user_account.dashboard.actions.cancel')}
                                                </button>
                                            )}
                                            {booking.status === 'completed' && !reviews.find(r => r.booking === booking.id) && (
                                                <button
                                                    className="user-account-btn user-account-btn-primary"
                                                    onClick={() => handleWriteReview(booking)}
                                                >
                                                    {t('account.user_account.dashboard.actions.write_review')}
                                                </button>
                                            )}
                                            {booking.customer_profile?.user && (
                                                <button
                                                    className="user-account-btn user-account-btn-secondary"
                                                    onClick={() => handleChatWithUser(booking.customer_profile)}
                                                    style={{
                                                        marginLeft: '8px',
                                                        backgroundColor: '#6c757d',
                                                        color: 'white'
                                                    }}
                                                >
                                                    {t('account.user_account.dashboard.actions.chat_with_guide')}
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
                    <div className="user-account-profile">
                        {!profile || showProfileForm ? (
                            <div className="user-account-profile-form">
                                <h3 className="user-account-section-title">
                                    {profile ? t('account.user_account.profile.edit_profile') : t('account.user_account.profile.create_profile')}
                                </h3>
                                <form onSubmit={handleProfileSubmit} className="user-account-form">
                                    <div className="user-account-form-group">
                                        <label className="user-account-label">{t('account.user_account.profile.form.date_of_birth_label')}</label>
                                        <input
                                            type="date"
                                            className="user-account-input"
                                            value={profileForm.date_of_birth}
                                            onChange={(e) => setProfileForm({ ...profileForm, date_of_birth: e.target.value })}
                                        />
                                    </div>
                                    <div className="user-account-form-group">
                                        <label className="user-account-label">{t('account.user_account.profile.form.preferred_contact_label')}</label>
                                        <select
                                            className="user-account-select"
                                            value={profileForm.preferred_contact}
                                            onChange={(e) => setProfileForm({ ...profileForm, preferred_contact: e.target.value })}
                                        >
                                            <option value="email">{t('account.user_account.profile.contact_methods.email')}</option>
                                            <option value="phone">{t('account.user_account.profile.contact_methods.phone')}</option>
                                            <option value="chat">{t('account.user_account.profile.contact_methods.chat')}</option>
                                        </select>
                                    </div>
                                    <div className="user-account-form-group">
                                        <label className="user-account-label">{t('account.user_account.profile.form.languages_label')}</label>
                                        <div className="user-account-checkbox-group">
                                            {languages.map(language => (
                                                <label key={language.id} className="user-account-checkbox-label">
                                                    <input
                                                        type="checkbox"
                                                        className="user-account-checkbox"
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
                                    <div className="user-account-form-actions">
                                        <button type="submit" className="user-account-btn user-account-btn-primary">
                                            {profile ? t('account.user_account.profile.form.submit_update') : t('account.user_account.profile.form.submit_create')}
                                        </button>
                                        {profile && (
                                            <button
                                                type="button"
                                                className="user-account-btn user-account-btn-secondary"
                                                onClick={() => setShowProfileForm(false)}
                                            >
                                                {t('account.user_account.profile.form.cancel')}
                                            </button>
                                        )}
                                    </div>
                                </form>
                            </div>
                        ) : (
                            <div className="user-account-profile-view">
                                <div className="user-account-profile-header">
                                    <h3 className="user-account-section-title">{t('account.user_account.profile.profile_information')}</h3>
                                    <button
                                        className="user-account-btn user-account-btn-primary"
                                        onClick={() => setShowProfileForm(true)}
                                    >
                                        {t('account.user_account.profile.edit_profile')}
                                    </button>
                                </div>
                                <div className="user-account-profile-info">
                                    <div className="user-account-profile-field">
                                        <label className="user-account-profile-label">{t('account.user_account.profile.date_of_birth')}</label>
                                        <p className="user-account-profile-value">
                                            {profile.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString() : t('account.not_set')}
                                        </p>
                                    </div>
                                    <div className="user-account-profile-field">
                                        <label className="user-account-profile-label">{t('account.user_account.profile.preferred_contact')}</label>
                                        <p className="user-account-profile-value">{t(`account.user_account.profile.contact_methods.${profile.preferred_contact}`)}</p>
                                    </div>
                                    <div className="user-account-profile-field">
                                        <label className="user-account-profile-label">{t('account.user_account.profile.languages')}</label>
                                        <p className="user-account-profile-value">
                                            {profile.languages?.length > 0
                                                ? profile.languages.map(id => languages.find(l => l.id === id)?.name).join(', ')
                                                : t('account.not_set')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                {activeTab === 'guides' && (
                    <div className="user-account-guides">
                        <div className="user-account-guides-header">
                            <h3 className="user-account-section-title">{t('account.user_account.guides.title')}</h3>
                            <div className="user-account-guides-filters">
                                <input
                                    type="text"
                                    className="user-account-filter-input"
                                    placeholder={t('account.user_account.guides.filters.search_placeholder')}
                                    value={guidesFilter.search}
                                    onChange={(e) => handleFilterChange('search', e.target.value)}
                                />
                                <select
                                    className="user-account-filter-select"
                                    value={guidesFilter.service_type}
                                    onChange={(e) => handleFilterChange('service_type', e.target.value)}
                                >
                                    <option value="">{t('account.user_account.guides.filters.all_services')}</option>
                                    {serviceTypes.map(service => (
                                        <option key={service.id} value={service.id}>{service.name}</option>
                                    ))}
                                </select>
                                <select
                                    className="user-account-filter-select"
                                    value={guidesFilter.country}
                                    onChange={(e) => handleFilterChange('country', e.target.value)}
                                >
                                    <option value="">{t('account.user_account.guides.filters.all_countries')}</option>
                                    {countries.map(country => (
                                        <option key={country.id} value={country.id}>{country.name}</option>
                                    ))}
                                </select>
                                <select
                                    className="user-account-filter-select"
                                    value={guidesFilter.city}
                                    onChange={(e) => handleFilterChange('city', e.target.value)}
                                >
                                    <option value="">{t('account.user_account.guides.filters.all_cities')}</option>
                                    {cities.map(city => (
                                        <option key={city.id} value={city.id}>{city.name}</option>
                                    ))}
                                </select>
                                <select
                                    className="user-account-filter-select"
                                    value={guidesFilter.min_rating}
                                    onChange={(e) => handleFilterChange('min_rating', e.target.value)}
                                >
                                    <option value="">{t('account.user_account.guides.filters.any_rating')}</option>
                                    <option value="4">{t('account.user_account.guides.filters.stars_4')}</option>
                                    <option value="4.5">{t('account.user_account.guides.filters.stars_45')}</option>
                                    <option value="5">{t('account.user_account.guides.filters.stars_5')}</option>
                                </select>
                                <label className="user-account-filter-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={guidesFilter.is_available}
                                        onChange={(e) => handleFilterChange('is_available', e.target.checked)}
                                    />
                                    {t('find_guide.available_only')}
                                </label>
                            </div>
                        </div>
                        <div className="user-account-guides-grid">
                            {guides.map(guide => (
                                <div key={guide.id} className="user-account-guide-card">
                                    <div className="user-account-guide-avatar">
                                        {guide.user?.avatar ? (
                                            <img src={guide.user.avatar} alt={guide.user.full_name} />
                                        ) : (
                                            <div className="user-account-guide-avatar-placeholder">
                                                {guide.user?.full_name?.charAt(0) || 'G'}
                                            </div>
                                        )}
                                    </div>
                                    <div className="user-account-guide-info">
                                        <h4 className="user-account-guide-name">{guide.user?.full_name}</h4>
                                        <p className="user-account-guide-bio">{guide.professional_bio}</p>
                                        <div className="user-account-guide-details">
                                            <span className="user-account-guide-experience">
                                                {t('account.user_account.guides.guide_card.years_experience', { years: guide.years_of_experience })}
                                            </span>
                                            <div className="user-account-guide-rating">
                                                {'★'.repeat(Math.floor(guide.average_rating || 0))}
                                                {'☆'.repeat(5 - Math.floor(guide.average_rating || 0))}
                                                <span className="user-account-guide-rating-text">
                                                    {t('account.user_account.guides.guide_card.rating', { rating: guide.average_rating || 0, reviews: guide.total_reviews || 0 })}
                                                </span>
                                            </div>
                                            <div className="user-account-guide-pricing">
                                                {guide.hourly_rate && (
                                                    <span className="user-account-guide-price">
                                                        {t('account.user_account.guides.guide_card.hourly_rate', { rate: guide.hourly_rate })}
                                                    </span>
                                                )}
                                                {guide.daily_rate && (
                                                    <span className="user-account-guide-price">
                                                        {t('account.user_account.guides.guide_card.daily_rate', { rate: guide.daily_rate })}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="user-account-guide-actions">
                                            <button
                                                className="user-account-btn user-account-btn-primary"
                                                onClick={() => handleBookGuide(guide)}
                                                disabled={!guide.is_available}
                                            >
                                                {guide.is_available ? t('account.user_account.guides.guide_card.book_now') : t('account.user_account.guides.guide_card.unavailable')}
                                            </button>
                                            <button
                                                className="user-account-btn user-account-btn-secondary"
                                                onClick={() => handleChatWithUser(guide)}
                                                style={{
                                                    marginLeft: '8px',
                                                    backgroundColor: '#6c757d',
                                                    color: 'white'
                                                }}
                                            >
                                                {t('account.user_account.guides.guide_card.chat')}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {activeTab === 'bookings' && (
                    <div className="user-account-bookings">
                        <h3 className="user-account-section-title">{t('account.user_account.bookings.title')}</h3>
                        <div className="user-account-bookings-list">
                            {bookings.map(booking => (
                                <div key={booking.id} className="user-account-booking-item">
                                    <div className="user-account-booking-details">
                                        <h4 className="user-account-booking-title">{t('account.user_account.bookings.booking_title', { title: booking.title })}</h4>
                                        <p className="user-account-booking-dates">
                                            {t('account.user_account.bookings.dates', {
                                                start_date: new Date(booking.start_date).toLocaleDateString(),
                                                end_date: new Date(booking.end_date).toLocaleDateString()
                                            })}
                                        </p>
                                        <p className="user-account-booking-description">{t('account.user_account.bookings.description', { description: booking.description || t('account.not_set') })}</p>
                                        <span className={`user-account-booking-status user-account-status-${booking.status}`}>
                                            {t(`account.user_account.dashboard.booking_status.${booking.status}`)}
                                        </span>
                                        {booking.status === 'cancelled' && booking.cancellation_reason && (
                                            <p className="user-account-booking-cancel-reason" style={{ color: '#721c24', fontSize: '14px', marginTop: '8px' }}>
                                                {t('account.user_account.dashboard.cancellation_reason', { reason: booking.cancellation_reason })}
                                            </p>
                                        )}
                                    </div>
                                    <div className="user-account-booking-actions">
                                        {['pending', 'confirmed', 'accepted'].includes(booking.status) && (
                                            <button
                                                className="user-account-btn user-account-btn-cancel"
                                                onClick={() => handleOpenCancelModal(booking)}
                                            >
                                                {t('account.user_account.dashboard.actions.cancel')}
                                            </button>
                                        )}
                                        {booking.status === 'completed' && !reviews.find(r => r.booking === booking.id) && (
                                            <button
                                                className="user-account-btn user-account-btn-primary"
                                                onClick={() => handleWriteReview(booking)}
                                            >
                                                {t('account.user_account.dashboard.actions.write_review')}
                                            </button>
                                        )}
                                        {booking.customer_profile?.user && (
                                            <button
                                                className="user-account-btn user-account-btn-secondary"
                                                onClick={() => handleChatWithUser(booking.customer_profile)}
                                                style={{
                                                    marginLeft: '8px',
                                                    backgroundColor: '#6c757d',
                                                    color: 'white'
                                                }}
                                            >
                                                {t('account.user_account.dashboard.actions.chat_with_guide')}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {activeTab === 'reviews' && (
                    <div className="user-account-reviews">
                        <div className="user-account-reviews-header">
                            <h3 className="user-account-section-title">{t('account.user_account.reviews.title')}</h3>
                            <div className="user-account-reviews-filters">
                                <select
                                    className="user-account-filter-select"
                                    value={reviewFilter.minRating}
                                    onChange={(e) => handleReviewFilterChange('minRating', e.target.value)}
                                >
                                    <option value="">{t('account.user_account.reviews.filters.all_ratings')}</option>
                                    <option value="5">{t('account.user_account.reviews.filters.stars_5')}</option>
                                    <option value="4">{t('account.user_account.reviews.filters.stars_4')}</option>
                                    <option value="3">{t('account.user_account.reviews.filters.stars_3')}</option>
                                    <option value="2">{t('account.user_account.reviews.filters.stars_2')}</option>
                                    <option value="1">{t('account.user_account.reviews.filters.stars_1')}</option>
                                </select>
                                <select
                                    className="user-account-filter-select"
                                    value={reviewFilter.sortBy}
                                    onChange={(e) => handleReviewFilterChange('sortBy', e.target.value)}
                                >
                                    <option value="date_desc">{t('account.user_account.reviews.filters.sort_newest')}</option>
                                    <option value="date_asc">{t('account.user_account.reviews.filters.sort_oldest')}</option>
                                    <option value="rating_desc">{t('account.user_account.reviews.filters.sort_highest')}</option>
                                    <option value="rating_asc">{t('account.user_account.reviews.filters.sort_lowest')}</option>
                                </select>
                            </div>
                        </div>
                        <div className="user-account-reviews-summary">
                            <h4 className="user-account-section-subtitle">{t('account.user_account.reviews.summary.title')}</h4>
                            <div className="user-account-reviews-summary-grid">
                                <div className="user-account-summary-item">
                                    <span className="user-account-summary-label">{t('account.user_account.reviews.summary.total_reviews')}</span>
                                    <span className="user-account-summary-value">{reviews.length}</span>
                                </div>
                                <div className="user-account-summary-item">
                                    <span className="user-account-summary-label">{t('account.user_account.reviews.summary.average_overall')}</span>
                                    <span className="user-account-summary-value">
                                        {reviews.length > 0
                                            ? (reviews.reduce((sum, r) => sum + r.overall_rating, 0) / reviews.length).toFixed(1)
                                            : 0}/5
                                    </span>
                                </div>
                                <div className="user-account-summary-item">
                                    <span className="user-account-summary-label">{t('account.user_account.reviews.summary.average_communication')}</span>
                                    <span className="user-account-summary-value">
                                        {reviews.length > 0
                                            ? (reviews.reduce((sum, r) => sum + r.communication_rating, 0) / reviews.length).toFixed(1)
                                            : 0}/5
                                    </span>
                                </div>
                                <div className="user-account-summary-item">
                                    <span className="user-account-summary-label">{t('account.user_account.reviews.summary.average_service')}</span>
                                    <span className="user-account-summary-value">
                                        {reviews.length > 0
                                            ? (reviews.reduce((sum, r) => sum + r.service_rating, 0) / reviews.length).toFixed(1)
                                            : 0}/5
                                    </span>
                                </div>
                                <div className="user-account-summary-item">
                                    <span className="user-account-summary-label">{t('account.user_account.reviews.summary.average_punctuality')}</span>
                                    <span className="user-account-summary-value">
                                        {reviews.length > 0
                                            ? (reviews.reduce((sum, r) => sum + r.punctuality_rating, 0) / reviews.length).toFixed(1)
                                            : 0}/5
                                    </span>
                                </div>
                                <div className="user-account-summary-item">
                                    <span className="user-account-summary-label">{t('account.user_account.reviews.summary.average_value')}</span>
                                    <span className="user-account-summary-value">
                                        {reviews.length > 0
                                            ? (reviews.reduce((sum, r) => sum + r.value_rating, 0) / reviews.length).toFixed(1)
                                            : 0}/5
                                    </span>
                                </div>
                            </div>
                        </div>
                        {filteredReviews.length === 0 ? (
                            <p>{t('account.user_account.reviews.no_reviews')}</p>
                        ) : (
                            <div className="user-account-reviews-list">
                                {filteredReviews.map(review => {
                                    const relatedBooking = bookings.find(b => b.id === review.booking);
                                    const guideName = relatedBooking?.customer_profile?.user?.full_name || 'Unknown';
                                    return (
                                        <div key={review.id} className="user-account-review-item">
                                            <div className="user-account-review-header">
                                                <div className="user-account-review-rating">
                                                    {'★'.repeat(review.overall_rating)}{'☆'.repeat(5 - review.overall_rating)}
                                                    <span className="user-account-review-rating-text">
                                                        {t('account.user_account.reviews.review_item.rating', { rating: review.overall_rating })}
                                                    </span>
                                                </div>
                                                <span className="user-account-review-date">
                                                    {new Date(review.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <h4 className="user-account-review-title">
                                                {t('account.user_account.reviews.review_item.for_guide', { name: guideName })}
                                            </h4>
                                            <p className="user-account-review-comment">{review.comment}</p>
                                            <div className="user-account-review-details">
                                                <span className="user-account-review-detail">
                                                    {t('account.user_account.reviews.review_item.communication', { rating: review.communication_rating })}
                                                </span>
                                                <span className="user-account-review-detail">
                                                    {t('account.user_account.reviews.review_item.service', { rating: review.service_rating })}
                                                </span>
                                                <span className="user-account-review-detail">
                                                    {t('account.user_account.reviews.review_item.punctuality', { rating: review.punctuality_rating })}
                                                </span>
                                                <span className="user-account-review-detail">
                                                    {t('account.user_account.reviews.review_item.value', { rating: review.value_rating })}
                                                </span>
                                            </div>
                                            {relatedBooking && (
                                                <div className="user-account-review-booking">
                                                    <p>
                                                        {t('account.user_account.reviews.review_item.booking', {
                                                            title: relatedBooking.title,
                                                            start_date: new Date(relatedBooking.start_date).toLocaleDateString(),
                                                            end_date: new Date(relatedBooking.end_date).toLocaleDateString()
                                                        })}
                                                    </p>
                                                </div>
                                            )}
                                            <div className="user-account-review-reactions">
                                                <span className="user-account-review-reaction-count">
                                                    {t('account.user_account.reviews.review_item.likes', { count: review.like_count || 0 })}
                                                </span>
                                                <span className="user-account-review-reaction-count">
                                                    {t('account.user_account.reviews.review_item.dislikes', { count: review.dislike_count || 0 })}
                                                </span>
                                                <button
                                                    className="user-account-btn user-account-btn-small"
                                                    onClick={() => handleViewReactions(review)}
                                                >
                                                    {t('account.user_account.reviews.review_item.view_reactions')}
                                                </button>
                                            </div>
                                            <div className="user-account-review-actions">
                                                <button
                                                    className="user-account-btn user-account-btn-small"
                                                    onClick={() => handleEditReview(review, relatedBooking)}
                                                >
                                                    {t('account.user_account.reviews.review_item.edit')}
                                                </button>
                                                <button
                                                    className="user-account-btn user-account-btn-small user-account-btn-danger"
                                                    onClick={() => handleDeleteReview(review.id)}
                                                >
                                                    {t('account.user_account.reviews.review_item.delete')}
                                                </button>
                                                <button
                                                    className="user-account-btn user-account-btn-small"
                                                    onClick={() => {
                                                        setSelectedReviewForReactions(review);
                                                        setReactionForm({ reaction_type: 'like', comment: '' });
                                                    }}
                                                >
                                                    {t('account.user_account.reviews.review_item.react')}
                                                </button>
                                            </div>
                                            {selectedReviewForReactions?.id === review.id && (
                                                <div className="user-account-reaction-form">
                                                    <h4>{t('account.user_account.reactions.reaction_form.title')}</h4>
                                                    <div className="user-account-form-group">
                                                        <label className="user-account-label">{t('account.user_account.reactions.reaction_form.reaction_type_label')}</label>
                                                        <select
                                                            className="user-account-select"
                                                            value={reactionForm.reaction_type}
                                                            onChange={(e) => setReactionForm({ ...reactionForm, reaction_type: e.target.value })}
                                                        >
                                                            <option value="like">{t('account.user_account.reactions.reaction_form.reaction_like')}</option>
                                                            <option value="dislike">{t('account.user_account.reactions.reaction_form.reaction_dislike')}</option>
                                                        </select>
                                                    </div>
                                                    <div className="user-account-form-group">
                                                        <label className="user-account-label">{t('account.user_account.reactions.reaction_form.comment_label')}</label>
                                                        <textarea
                                                            className="user-account-textarea"
                                                            placeholder={t('account.user_account.reactions.reaction_form.comment_placeholder', {
                                                                type: reactionForm.reaction_type === 'like' ? t('account.user_account.reactions.reaction_form.reaction_like') : t('account.user_account.reactions.reaction_form.reaction_dislike')
                                                            })}
                                                            value={reactionForm.comment}
                                                            onChange={(e) => setReactionForm({ ...reactionForm, comment: e.target.value })}
                                                        />
                                                    </div>
                                                    <div className="user-account-form-actions">
                                                        <button
                                                            className="user-account-btn user-account-btn-primary"
                                                            onClick={() => handleReactToReview(review.id)}
                                                        >
                                                            {t('account.user_account.reactions.reaction_form.submit')}
                                                        </button>
                                                        <button
                                                            className="user-account-btn user-account-btn-secondary"
                                                            onClick={() => setSelectedReviewForReactions(null)}
                                                        >
                                                            {t('account.user_account.reactions.reaction_form.cancel')}
                                                        </button>
                                                        {reactions.some(r => r.user === currentUser?.id && r.review === review.id) && (
                                                            <button
                                                                className="user-account-btn user-account-btn-danger"
                                                                onClick={() => handleRemoveReaction(review.id)}
                                                            >
                                                                {t('account.user_account.reactions.reaction_form.remove_reaction')}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Booking Form Modal */}
            {showBookingForm && selectedGuide && (
                <div className="user-account-modal">
                    <div className="user-account-modal-content">
                        <h3 className="user-account-modal-title">
                            {t('account.user_account.booking_form.title', { name: selectedGuide.user?.full_name })}
                        </h3>
                        <form onSubmit={handleBookingSubmit} className="user-account-form">
                            <div className="user-account-form-group">
                                <label className="user-account-label">{t('account.user_account.booking_form.title_label')}</label>
                                <input
                                    type="text"
                                    className="user-account-input"
                                    placeholder={t('account.user_account.booking_form.title_placeholder')}
                                    value={bookingForm.title}
                                    onChange={(e) => setBookingForm({ ...bookingForm, title: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="user-account-form-group">
                                <label className="user-account-label">{t('account.user_account.booking_form.description_label')}</label>
                                <textarea
                                    className="user-account-textarea"
                                    placeholder={t('account.user_account.booking_form.description_placeholder')}
                                    value={bookingForm.description}
                                    onChange={(e) => setBookingForm({ ...bookingForm, description: e.target.value })}
                                />
                            </div>
                            <div className="user-account-form-group">
                                <label className="user-account-label">{t('account.user_account.booking_form.start_date_label')}</label>
                                <input
                                    type="date"
                                    className="user-account-input"
                                    value={bookingForm.start_date}
                                    onChange={(e) => setBookingForm({ ...bookingForm, start_date: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="user-account-form-group">
                                <label className="user-account-label">{t('account.user_account.booking_form.end_date_label')}</label>
                                <input
                                    type="date"
                                    className="user-account-input"
                                    value={bookingForm.end_date}
                                    onChange={(e) => setBookingForm({ ...bookingForm, end_date: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="user-account-form-group">
                                <label className="user-account-label">{t('account.user_account.booking_form.special_requirements_label')}</label>
                                <textarea
                                    className="user-account-textarea"
                                    placeholder={t('account.user_account.booking_form.special_requirements_placeholder')}
                                    value={bookingForm.special_requirements}
                                    onChange={(e) => setBookingForm({ ...bookingForm, special_requirements: e.target.value })}
                                />
                            </div>
                            <div className="user-account-form-group">
                                <label className="user-account-label">{t('account.user_account.booking_form.budget_label')}</label>
                                <input
                                    type="number"
                                    className="user-account-input"
                                    placeholder={t('account.user_account.booking_form.budget_placeholder')}
                                    value={bookingForm.budget}
                                    onChange={(e) => setBookingForm({ ...bookingForm, budget: e.target.value })}
                                />
                                {selectedGuide.daily_rate && (
                                    <p className="user-account-form-note">
                                        {t('account.user_account.booking_form.guide_daily_rate', { rate: selectedGuide.daily_rate })}
                                    </p>
                                )}
                                {selectedGuide.hourly_rate && (
                                    <p className="user-account-form-note">
                                        {t('account.user_account.booking_form.guide_hourly_rate', { rate: selectedGuide.hourly_rate })}
                                    </p>
                                )}
                            </div>
                            <div className="user-account-form-actions">
                                <button type="submit" className="user-account-btn user-account-btn-primary">
                                    {t('account.user_account.booking_form.submit')}
                                </button>
                                <button
                                    type="button"
                                    className="user-account-btn user-account-btn-secondary"
                                    onClick={() => {
                                        setShowBookingForm(false);
                                        setSelectedGuide(null);
                                    }}
                                >
                                    {t('account.user_account.booking_form.cancel')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Review Form Modal */}
            {showReviewForm && selectedBookingForReview && (
                <div className="user-account-modal">
                    <div className="user-account-modal-content">
                        <h3 className="user-account-modal-title">
                            {t('account.user_account.review_form.title', {
                                action: editingReview ? 'Edit' : 'Write',
                                guide: selectedBookingForReview.customer_profile?.user?.full_name || 'Unknown',
                                booking: selectedBookingForReview.title
                            })}
                        </h3>
                        <form onSubmit={handleReviewSubmit} className="user-account-form">
                            <div className="user-account-form-group">
                                <label className="user-account-label">{t('account.user_account.review_form.overall_rating_label')}</label>
                                <select
                                    className="user-account-select"
                                    value={reviewForm.overall_rating}
                                    onChange={(e) => setReviewForm({ ...reviewForm, overall_rating: parseInt(e.target.value) })}
                                    required
                                >
                                    {[1, 2, 3, 4, 5].map(num => (
                                        <option key={num} value={num}>{t('account.user_account.review_form.star', { count: num })}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="user-account-form-group">
                                <label className="user-account-label">{t('account.user_account.review_form.communication_label')}</label>
                                <select
                                    className="user-account-select"
                                    value={reviewForm.communication_rating}
                                    onChange={(e) => setReviewForm({ ...reviewForm, communication_rating: parseInt(e.target.value) })}
                                    required
                                >
                                    {[1, 2, 3, 4, 5].map(num => (
                                        <option key={num} value={num}>{t('account.user_account.review_form.star', { count: num })}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="user-account-form-group">
                                <label className="user-account-label">{t('account.user_account.review_form.service_label')}</label>
                                <select
                                    className="user-account-select"
                                    value={reviewForm.service_rating}
                                    onChange={(e) => setReviewForm({ ...reviewForm, service_rating: parseInt(e.target.value) })}
                                    required
                                >
                                    {[1, 2, 3, 4, 5].map(num => (
                                        <option key={num} value={num}>{t('account.user_account.review_form.star', { count: num })}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="user-account-form-group">
                                <label className="user-account-label">{t('account.user_account.review_form.punctuality_label')}</label>
                                <select
                                    className="user-account-select"
                                    value={reviewForm.punctuality_rating}
                                    onChange={(e) => setReviewForm({ ...reviewForm, punctuality_rating: parseInt(e.target.value) })}
                                    required
                                >
                                    {[1, 2, 3, 4, 5].map(num => (
                                        <option key={num} value={num}>{t('account.user_account.review_form.star', { count: num })}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="user-account-form-group">
                                <label className="user-account-label">{t('account.user_account.review_form.value_label')}</label>
                                <select
                                    className="user-account-select"
                                    value={reviewForm.value_rating}
                                    onChange={(e) => setReviewForm({ ...reviewForm, value_rating: parseInt(e.target.value) })}
                                    required
                                >
                                    {[1, 2, 3, 4, 5].map(num => (
                                        <option key={num} value={num}>{t('account.user_account.review_form.star', { count: num })}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="user-account-form-group">
                                <label className="user-account-label">{t('account.user_account.review_form.title_label')}</label>
                                <input
                                    type="text"
                                    className="user-account-input"
                                    placeholder={t('account.user_account.review_form.title_placeholder')}
                                    value={reviewForm.title}
                                    onChange={(e) => setReviewForm({ ...reviewForm, title: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="user-account-form-group">
                                <label className="user-account-label">{t('account.user_account.review_form.comment_label')}</label>
                                <textarea
                                    className="user-account-textarea"
                                    placeholder={t('account.user_account.review_form.comment_placeholder')}
                                    value={reviewForm.comment}
                                    onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="user-account-form-actions">
                                <button type="submit" className="user-account-btn user-account-btn-primary">
                                    {editingReview ? t('account.user_account.review_form.submit_update') : t('account.user_account.review_form.submit_create')}
                                </button>
                                <button
                                    type="button"
                                    className="user-account-btn user-account-btn-secondary"
                                    onClick={() => {
                                        setShowReviewForm(false);
                                        setSelectedBookingForReview(null);
                                        setEditingReview(null);
                                    }}
                                >
                                    {t('account.user_account.review_form.cancel')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Cancel Booking Modal */}
            {showCancelModal && selectedBookingForCancel && (
                <div className="user-account-modal">
                    <div className="user-account-modal-content">
                        <h3 className="user-account-modal-title">{t('account.user_account.cancel_booking.title')}</h3>
                        <form onSubmit={handleCancelBooking} className="user-account-form">
                            <div className="user-account-form-group">
                                <label className="user-account-label">{t('account.user_account.cancel_booking.reason_label')}</label>
                                <textarea
                                    className="user-account-textarea"
                                    placeholder={t('account.user_account.cancel_booking.reason_placeholder')}
                                    value={cancelReason}
                                    onChange={(e) => setCancelReason(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="user-account-form-actions">
                                <button type="submit" className="user-account-btn user-account-btn-primary">
                                    {t('account.user_account.cancel_booking.submit')}
                                </button>
                                <button
                                    type="button"
                                    className="user-account-btn user-account-btn-secondary"
                                    onClick={() => {
                                        setShowCancelModal(false);
                                        setSelectedBookingForCancel(null);
                                        setCancelReason('');
                                    }}
                                >
                                    {t('account.user_account.cancel_booking.close')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Reactions Modal */}
            {showReactionsModal && selectedReviewForReactions && (
                <div className="user-account-modal">
                    <div className="user-account-modal-content">
                        <h3 className="user-account-modal-title">{t('account.user_account.reactions.title')}</h3>
                        {reactionSummary && (
                            <div className="user-account-reactions-summary">
                                <h4 className="user-account-section-subtitle">{t('account.user_account.reactions.summary_title')}</h4>
                                <p>{t('account.user_account.reactions.likes', { count: reactionSummary.like_count || 0 })}</p>
                                <p>{t('account.user_account.reactions.dislikes', { count: reactionSummary.dislike_count || 0 })}</p>
                            </div>
                        )}
                        <div className="user-account-reactions-list">
                            <h4>{t('account.user_account.reactions.latest_likes')}</h4>
                            {reactions.filter(r => r.reaction_type === 'like').length > 0 ? (
                                reactions
                                    .filter(r => r.reaction_type === 'like')
                                    .slice(0, 5)
                                    .map((reaction, index) => (
                                        <div key={index} className="user-account-reaction-item">
                                            <p>{reaction.comment || t('account.user_account.reactions.no_comments', { type: 'like' })}</p>
                                            <span>{new Date(reaction.created_at).toLocaleDateString()}</span>
                                        </div>
                                    ))
                            ) : (
                                <p>{t('account.user_account.reactions.no_comments', { type: 'like' })}</p>
                            )}
                            <h4>{t('account.user_account.reactions.latest_dislikes')}</h4>
                            {reactions.filter(r => r.reaction_type === 'dislike').length > 0 ? (
                                reactions
                                    .filter(r => r.reaction_type === 'dislike')
                                    .slice(0, 5)
                                    .map((reaction, index) => (
                                        <div key={index} className="user-account-reaction-item">
                                            <p>{reaction.comment || t('account.user_account.reactions.no_comments', { type: 'dislike' })}</p>
                                            <span>{new Date(reaction.created_at).toLocaleDateString()}</span>
                                        </div>
                                    ))
                            ) : (
                                <p>{t('account.user_account.reactions.no_comments', { type: 'dislike' })}</p>
                            )}
                        </div>
                        <div className="user-account-form-actions">
                            <button
                                className="user-account-btn user-account-btn-secondary"
                                onClick={() => {
                                    setShowReactionsModal(false);
                                    setSelectedReviewForReactions(null);
                                    setReactions([]);
                                    setReactionSummary(null);
                                }}
                            >
                                {t('account.user_account.cancel_booking.close')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Chat Widget */}
            {showChat && (
                <div className="user-account-chat">
                    <ChatWidgets
                        user={selectedUserForChat}
                        onClose={handleCloseChat}
                    />
                </div>
            )}
        </div>
    );
};

export default UserAccount;