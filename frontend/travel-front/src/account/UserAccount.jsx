
import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from 'react';

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
    getReviewSummary
} from '../api/api';
import ChatWidgets from './ChatWidgets';
import './UserAccount.css';

const UserAccount = () => {
    const [currentUser, setCurrentUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [bookings, setBookings] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [guides, setGuides] = useState([]);
    const [languages, setLanguages] = useState([]);
    const [serviceTypes, setServiceTypes] = useState([]);
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
        city: '',
        min_rating: '',
        is_available: true
    });


    const [originalData, setOriginalData] = useState({});
    const [guides, setGuides] = useState([]);
    const [bookings] = useState([]);
    const [chatMessages] = useState({});
    const [filter, setFilter] = useState({
        country: '',
        city: '',
        start_date: '',
        end_date: '',
        service_type: '',
        min_rating: ''
    });
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [bookingDate, setBookingDate] = useState('');
    const [travelers, setTravelers] = useState({ adults: 1, children: 0 });
    const [showBookingSummary, setShowBookingSummary] = useState(null);
    const [dataLoaded, setDataLoaded] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchError, setSearchError] = useState('');

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
            const [languagesData, serviceTypesData] = await Promise.all([
                getLanguages(),
                getServiceTypes()
            ]);
            setLanguages(languagesData.results || languagesData);
            setServiceTypes(serviceTypesData.results || serviceTypesData);
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
            setError(err.message);
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
            setError(err.message || 'Failed to load reactions');
        }
    };

    const loadReviewSummary = async (reviewId) => {
        try {
            const data = await getReviewSummary(reviewId);
            setReactionSummary(data);
        } catch (err) {
            console.error('Error loading review summary:', err);
            setError(err.message || 'Failed to load review summary');
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
            setError(err.message);
        }
    };

    const handleBookingSubmit = async (e) => {
        e.preventDefault();
        if (!bookingForm.start_date) {
            setError('Start date is required');
            return;
        }
        if (!bookingForm.end_date) {
            setError('End date is required');
            return;
        }
        if (!bookingForm.title.trim()) {
            setError('Title is required');
            return;
        }
        if (new Date(bookingForm.start_date) > new Date(bookingForm.end_date)) {
            setError('Start date must be before end date');
            return;
        }
        const today = new Date().toISOString().split('T')[0];
        if (bookingForm.start_date < today) {
            setError('Start date cannot be in the past');
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
            alert('Booking created successfully!');
        } catch (err) {
            console.error('Booking creation error:', err);
            setError(err.message || 'Failed to create booking');
        }
    };

    const handleReviewSubmit = async (e) => {
        e.preventDefault();
        if (!reviewForm.title.trim()) {
            setError('Review title is required');
            return;
        }
        if (!reviewForm.comment.trim()) {
            setError('Review comment is required');
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
            alert(editingReview ? 'Review updated successfully!' : 'Review submitted successfully!');
        } catch (err) {
            setError(err.message || 'Failed to submit review');
        }
    };

    const handleDeleteReview = async (reviewId) => {
        if (!window.confirm('Are you sure you want to delete this review?')) return;
        try {
            await deleteReview(reviewId);
            loadReviews();
            loadBookings();
            setError(null);
            alert('Review deleted successfully!');
        } catch (err) {
            setError(err.message || 'Failed to delete review');
        }
    };

    const handleReactToReview = async (reviewId) => {
        if (reactionForm.reaction_type === 'dislike' && !reactionForm.comment.trim()) {
            setError('Comment is required for dislike');
            return;
        }
        try {
            await reactToReview(reviewId, reactionForm.reaction_type, reactionForm.comment);
            loadReviewReactions(reviewId);
            loadReviewSummary(reviewId);
            setReactionForm({ reaction_type: 'like', comment: '' });
            setError(null);
            alert('Reaction submitted successfully!');
        } catch (err) {
            setError(err.message || 'Failed to submit reaction');
        }
    };

    const handleRemoveReaction = async (reviewId) => {
        try {
            await removeReactionFromReview(reviewId);
            loadReviewReactions(reviewId);
            loadReviewSummary(reviewId);
            setError(null);
            alert('Reaction removed successfully!');
        } catch (err) {
            setError(err.message || 'Failed to remove reaction');
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
            setError('Cancellation reason is required');
            return;
        }
        try {
            await cancelBooking(selectedBookingForCancel.id, cancelReason);
            loadBookings();
            setShowCancelModal(false);
            setSelectedBookingForCancel(null);
            setCancelReason('');
            setError(null);
            alert('Booking cancelled successfully!');
        } catch (err) {
            setError(err.message || 'Failed to cancel booking');
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
            title: `Tour with ${guide.user?.full_name || 'Guide'}`,
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
            title: `Review for ${booking.title}`,
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

    const handleSearchGuides = async () => {
        if (!filter.country) {
            setSearchError(t('user.validation.country_required'));
            return;
        }
        setSearchError('');
        setSearchLoading(true);
        try {
            const params = {
                country: filter.country,
                city: filter.city,
                start_date: filter.start_date,
                end_date: filter.end_date,
                service_type: filter.service_type,
                min_rating: filter.min_rating
            };
            const response = await api.get("bookings/search_customers/", { params });
            setGuides(response.data);
        } catch (error) {
            console.error('Error searching guides:', error);
            setSearchError(t('user.errors.search_failed'));
        } finally {
            setSearchLoading(false);
        }
    };

    const handleBookGuide = () => {
        alert(t('user.alerts.booking_api_unavailable'));

    const handleCloseChat = () => {
        setShowChat(false);
        setSelectedUserForChat(null);

    };

    const handleFilterChange = (key, value) => {
        setGuidesFilter({ ...guidesFilter, [key]: value });
    };

    const handleReviewFilterChange = (key, value) => {
        setReviewFilter({ ...reviewFilter, [key]: value });
    };

    // Filter and sort reviews
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
                <p>Loading...</p>
            </div>
        );
    }

    return (
        <div className="user-account-container">
            <div className="user-account-header">
                <h1 className="user-account-title">My Account</h1>
                {currentUser && (
                    <div className="user-account-user-info">
                        <span className="user-account-welcome">Welcome, {currentUser.full_name}</span>
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
                            Messages
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
                    Dashboard
                </button>
                <button
                    className={`user-account-nav-btn ${activeTab === 'profile' ? 'user-account-nav-active' : ''}`}
                    onClick={() => setActiveTab('profile')}
                >
                    Profile
                </button>
                <button
                    className={`user-account-nav-btn ${activeTab === 'guides' ? 'user-account-nav-active' : ''}`}
                    onClick={() => setActiveTab('guides')}
                >
                    Find Guides
                </button>
                <button
                    className={`user-account-nav-btn ${activeTab === 'bookings' ? 'user-account-nav-active' : ''}`}
                    onClick={() => setActiveTab('bookings')}
                >
                    My Bookings
                </button>
                <button
                    className={`user-account-nav-btn ${activeTab === 'reviews' ? 'user-account-nav-active' : ''}`}
                    onClick={() => setActiveTab('reviews')}
                >
                    My Reviews
                </button>
            </div>
            <div className="user-account-content">
                {activeTab === 'dashboard' && (
                    <div className="user-account-dashboard">
                        <div className="user-account-stats">
                            <div className="user-account-stat-card">
                                <h3 className="user-account-stat-title">Total Bookings</h3>
                                <p className="user-account-stat-value">{bookings.length}</p>
                            </div>
                            <div className="user-account-stat-card">
                                <h3 className="user-account-stat-title">Active Bookings</h3>
                                <p className="user-account-stat-value">
                                    {bookings.filter(b => b.status === 'confirmed' || b.status === 'accepted').length}
                                </p>
                            </div>
                            <div className="user-account-stat-card">
                                <h3 className="user-account-stat-title">Completed Trips</h3>
                                <p className="user-account-stat-value">
                                    {bookings.filter(b => b.status === 'completed').length}
                                </p>
                            </div>
                            <div className="user-account-stat-card">
                                <h3 className="user-account-stat-title">Reviews Written</h3>
                                <p className="user-account-stat-value">{reviews.length}</p>
                            </div>
                        </div>
                        <div className="user-account-recent">
                            <h3 className="user-account-section-title">Recent Bookings</h3>
                            <div className="user-account-recent-bookings">
                                {bookings.slice(0, 5).map(booking => (
                                    <div key={booking.id} className="user-account-booking-card">
                                        <div className="user-account-booking-info">
                                            <h4 className="user-account-booking-title">{booking.title}</h4>
                                            <p className="user-account-booking-date">
                                                {new Date(booking.start_date).toLocaleDateString()} -
                                                {new Date(booking.end_date).toLocaleDateString()}
                                            </p>
                                            <span className={`user-account-booking-status user-account-status-${booking.status}`}>
                                                {booking.status}
                                            </span>
                                            {booking.status === 'cancelled' && booking.cancellation_reason && (
                                                <p className="user-account-booking-cancel-reason" style={{ color: '#721c24', fontSize: '14px', marginTop: '8px' }}>
                                                    Cancellation Reason: {booking.cancellation_reason}
                                                </p>
                                            )}
                                        </div>
                                        <div className="user-account-booking-actions">
                                            {booking.status === 'pending' && (
                                                <button
                                                    className="user-account-btn user-account-btn-cancel"
                                                    onClick={() => handleOpenCancelModal(booking)}
                                                >
                                                    Cancel
                                                </button>
                                            )}
                                            {booking.status === 'completed' && !reviews.find(r => r.booking === booking.id) && (
                                                <button
                                                    className="user-account-btn user-account-btn-primary"
                                                    onClick={() => handleWriteReview(booking)}
                                                >
                                                    Write Review
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
                                                    Chat
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'guides' && (
                        <div className="user-account-content">
                            <div className="user-account-content-header">
                                <h1 className="user-account-title">{t('user.guides.title')}</h1>
                                <p className="user-account-subtitle">{t('user.guides.subtitle')}</p>
                            </div>

                            <div className="user-account-search-section">
                                <form onSubmit={(e) => { e.preventDefault(); handleSearchGuides(); }} className="user-account-search-form">
                                    <div className="user-account-form-group">
                                        <label>{t('user.guides.country')} *</label>
                                        <input
                                            type="text"
                                            name="country"
                                            value={filter.country}
                                            onChange={handleFilterChange}
                                            placeholder={t('user.guides.country_placeholder')}
                                            className="user-account-input"
                                            required
                                        />
                                    </div>

                                    <div className="user-account-form-group">
                                        <label>{t('user.guides.city')}</label>
                                        <input
                                            type="text"
                                            name="city"
                                            value={filter.city}
                                            onChange={handleFilterChange}
                                            placeholder={t('user.guides.city_placeholder')}
                                            className="user-account-input"
                                        />
                                    </div>

                                    <div className="user-account-form-group">
                                        <label>{t('user.guides.start_date')}</label>
                                        <input
                                            type="date"
                                            name="start_date"
                                            value={filter.start_date}
                                            onChange={handleFilterChange}
                                            className="user-account-input"
                                        />
                                    </div>

                                    <div className="user-account-form-group">
                                        <label>{t('user.guides.end_date')}</label>
                                        <input
                                            type="date"
                                            name="end_date"
                                            value={filter.end_date}
                                            onChange={handleFilterChange}
                                            className="user-account-input"
                                        />
                                    </div>

                                    <div className="user-account-form-group">
                                        <label>{t('user.guides.service_type')}</label>
                                        <input
                                            type="text"
                                            name="service_type"
                                            value={filter.service_type}
                                            onChange={handleFilterChange}
                                            placeholder={t('user.guides.service_type_placeholder')}
                                            className="user-account-input"
                                        />
                                    </div>

                                    <div className="user-account-form-group">
                                        <label>{t('user.guides.min_rating')}</label>
                                        <input
                                            type="number"
                                            name="min_rating"
                                            value={filter.min_rating}
                                            onChange={handleFilterChange}
                                            placeholder={t('user.guides.min_rating_placeholder')}
                                            className="user-account-input"
                                            min="0"
                                            max="5"
                                            step="0.1"

                    </div>
                )}
                {activeTab === 'profile' && (
                    <div className="user-account-profile">
                        {!profile || showProfileForm ? (
                            <div className="user-account-profile-form">
                                <h3 className="user-account-section-title">
                                    {profile ? 'Edit Profile' : 'Create Profile'}
                                </h3>
                                <form onSubmit={handleProfileSubmit} className="user-account-form">
                                    <div className="user-account-form-group">
                                        <label className="user-account-label">Date of Birth</label>
                                        <input
                                            type="date"
                                            className="user-account-input"
                                            value={profileForm.date_of_birth}
                                            onChange={(e) => setProfileForm({...profileForm, date_of_birth: e.target.value})}

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
                                            />
                                            <input
                                                type="number"
                                                name="children"
                                                value={travelers.children}
                                                onChange={handleTravelersChange}
                                                placeholder={t('user.guides.children')}
                                                className="user-account-input"
                                            />

                                        <label className="user-account-label">Preferred Contact Method</label>
                                        <select
                                            className="user-account-select"
                                            value={profileForm.preferred_contact}
                                            onChange={(e) => setProfileForm({...profileForm, preferred_contact: e.target.value})}
                                        >
                                            <option value="email">Email</option>
                                            <option value="phone">Phone</option>
                                            <option value="chat">Chat</option>
                                        </select>
                                    </div>
                                    <div className="user-account-form-group">
                                        <label className="user-account-label">Languages</label>
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
                                            {profile ? 'Update Profile' : 'Create Profile'}
                                        </button>
                                        {profile && (
                                            <button
                                                type="button"
                                                className="user-account-btn user-account-btn-secondary"
                                                onClick={() => setShowProfileForm(false)}
                                            >
                                                Cancel
                                            </button>
                                        )}
                                    </div>
                                </form>
                            </div>
                        ) : (
                            <div className="user-account-profile-view">
                                <div className="user-account-profile-header">
                                    <h3 className="user-account-section-title">Profile Information</h3>
                                    <button

                                        type="submit"
                                        className="user-account-btn user-account-btn-primary"
                                        disabled={searchLoading}
                                    >
                                        {searchLoading ? t('user.actions.searching') : t('user.actions.search')}

                                        className="user-account-btn user-account-btn-primary"
                                        onClick={() => setShowProfileForm(true)}
                                    >
                                        Edit Profile

                                    </button>
                                </form>

                                {searchError && (
                                    <div className="user-account-error-message">
                                        <FiAlertCircle size={16} />
                                        {searchError}
                                    </div>
                                )}

                                <div className="user-account-guides-list">
                                    {searchLoading ? (
                                        <div className="user-account-loading">
                                            <div className="user-account-spinner"></div>
                                            <p>{t('user.loading.searching')}</p>
                                        </div>
                                    ) : guides.length > 0 ? (
                                        guides.map((guide) => (
                                            <div key={guide.id} className="user-account-guide-card">
                                                <div className="user-account-guide-header">
                                                    <div className="user-account-avatar-placeholder">
                                                        <img src={guide.user.avatar_url || ''} alt="" />
                                                    </div>
                                                    <h3>{guide.user.full_name}</h3>
                                                    <span className="user-account-guide-rating">
                                                        <FiStar /> {guide.average_rating || 'N/A'}
                                                    </span>
                                                </div>
                                                <p>{guide.country}, {guide.city}</p>
                                                <p>{t('user.guides.services')}: {guide.service_areas}</p>
                                                <p>{t('user.guides.available')}: {guide.is_available ? t('yes') : t('no')}</p>
                                                <button
                                                    className="user-account-btn user-account-btn-primary"
                                                    onClick={() => handleBookGuide(guide)}
                                                >
                                                    {t('user.actions.book')}
                                                </button>
                                            </div>
                                        ))
                                    ) : (
                                        <p>{t('user.guides.no_results')}</p>
                                    )}
                                </div>
                                <div className="user-account-profile-info">
                                    <div className="user-account-profile-field">
                                        <label className="user-account-profile-label">Date of Birth:</label>
                                        <p className="user-account-profile-value">
                                            {profile.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString() : 'Not set'}
                                        </p>
                                    </div>
                                    <div className="user-account-profile-field">
                                        <label className="user-account-profile-label">Preferred Contact:</label>
                                        <p className="user-account-profile-value">{profile.preferred_contact}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                {activeTab === 'guides' && (
                    <div className="user-account-guides">
                        <div className="user-account-guides-header">
                            <h3 className="user-account-section-title">Find Guides</h3>
                            <div className="user-account-guides-filters">
                                <input
                                    type="text"
                                    className="user-account-filter-input"
                                    placeholder="Search guides..."
                                    value={guidesFilter.search}
                                    onChange={(e) => handleFilterChange('search', e.target.value)}
                                />
                                <select
                                    className="user-account-filter-select"
                                    value={guidesFilter.service_type}
                                    onChange={(e) => handleFilterChange('service_type', e.target.value)}
                                >
                                    <option value="">All Services</option>
                                    {serviceTypes.map(service => (
                                        <option key={service.id} value={service.id}>{service.name}</option>
                                    ))}
                                </select>
                                <select
                                    className="user-account-filter-select"
                                    value={guidesFilter.min_rating}
                                    onChange={(e) => handleFilterChange('min_rating', e.target.value)}
                                >
                                    <option value="">Any Rating</option>
                                    <option value="4">4+ Stars</option>
                                    <option value="4.5">4.5+ Stars</option>
                                    <option value="5">5 Stars</option>
                                </select>
                                <label className="user-account-filter-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={guidesFilter.is_available}
                                        onChange={(e) => handleFilterChange('is_available', e.target.checked)}
                                    />
                                    Available only
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
                                                {guide.years_of_experience} years experience
                                            </span>
                                            <div className="user-account-guide-rating">
                                                {'★'.repeat(Math.floor(guide.average_rating || 0))}
                                                {'☆'.repeat(5 - Math.floor(guide.average_rating || 0))}
                                                <span className="user-account-guide-rating-text">
                                                    {guide.average_rating || 0}/5 ({guide.total_reviews || 0} reviews)
                                                </span>
                                            </div>
                                            <div className="user-account-guide-pricing">
                                                {guide.hourly_rate && (
                                                    <span className="user-account-guide-price">
                                                        ${guide.hourly_rate}/hour
                                                    </span>
                                                )}
                                                {guide.daily_rate && (
                                                    <span className="user-account-guide-price">
                                                        ${guide.daily_rate}/day
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
                                                {guide.is_available ? 'Book Now' : 'Unavailable'}
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
                                                Chat
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
                        <h3 className="user-account-section-title">My Bookings</h3>
                        <div className="user-account-bookings-list">
                            {bookings.map(booking => (
                                <div key={booking.id} className="user-account-booking-item">
                                    <div className="user-account-booking-details">
                                        <h4 className="user-account-booking-title">{booking.title}</h4>
                                        <p className="user-account-booking-dates">
                                            {new Date(booking.start_date).toLocaleDateString()} -
                                            {new Date(booking.end_date).toLocaleDateString()}
                                        </p>
                                        <p className="user-account-booking-description">{booking.description}</p>
                                        <span className={`user-account-booking-status user-account-status-${booking.status}`}>
                                            {booking.status}
                                        </span>
                                        {booking.status === 'cancelled' && booking.cancellation_reason && (
                                            <p className="user-account-booking-cancel-reason" style={{ color: '#721c24', fontSize: '14px', marginTop: '8px' }}>
                                                Cancellation Reason: {booking.cancellation_reason}
                                            </p>
                                        )}
                                    </div>
                                    <div className="user-account-booking-actions">
                                        {booking.status === 'pending' && (
                                            <button
                                                className="user-account-btn user-account-btn-cancel"
                                                onClick={() => handleOpenCancelModal(booking)}
                                            >
                                                Cancel
                                            </button>
                                        )}
                                        {booking.status === 'completed' && !reviews.find(r => r.booking === booking.id) && (
                                            <button
                                                className="user-account-btn user-account-btn-primary"
                                                onClick={() => handleWriteReview(booking)}
                                            >
                                                Write Review
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
                                                Chat with Guide
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
                            <h3 className="user-account-section-title">My Reviews</h3>
                            <div className="user-account-reviews-filters">
                                <select
                                    className="user-account-filter-select"
                                    value={reviewFilter.minRating}
                                    onChange={(e) => handleReviewFilterChange('minRating', e.target.value)}
                                >
                                    <option value="">All Ratings</option>
                                    <option value="5">5 Stars</option>
                                    <option value="4">4+ Stars</option>
                                    <option value="3">3+ Stars</option>
                                    <option value="2">2+ Stars</option>
                                    <option value="1">1+ Stars</option>
                                </select>
                                <select
                                    className="user-account-filter-select"
                                    value={reviewFilter.sortBy}
                                    onChange={(e) => handleReviewFilterChange('sortBy', e.target.value)}
                                >
                                    <option value="date_desc">Newest First</option>
                                    <option value="date_asc">Oldest First</option>
                                    <option value="rating_desc">Highest Rating</option>
                                    <option value="rating_asc">Lowest Rating</option>
                                </select>
                            </div>
                        </div>
                        <div className="user-account-reviews-summary">
                            <h4 className="user-account-section-subtitle">Review Summary</h4>
                            <div className="user-account-reviews-summary-grid">
                                <div className="user-account-summary-item">
                                    <span className="user-account-summary-label">Total Reviews:</span>
                                    <span className="user-account-summary-value">{reviews.length}</span>
                                </div>
                                <div className="user-account-summary-item">
                                    <span className="user-account-summary-label">Average Overall Rating:</span>
                                    <span className="user-account-summary-value">
                                        {reviews.length > 0
                                            ? (reviews.reduce((sum, r) => sum + r.overall_rating, 0) / reviews.length).toFixed(1)
                                            : 0}/5
                                    </span>
                                </div>
                                <div className="user-account-summary-item">
                                    <span className="user-account-summary-label">Average Communication:</span>
                                    <span className="user-account-summary-value">
                                        {reviews.length > 0
                                            ? (reviews.reduce((sum, r) => sum + r.communication_rating, 0) / reviews.length).toFixed(1)
                                            : 0}/5
                                    </span>
                                </div>
                                <div className="user-account-summary-item">
                                    <span className="user-account-summary-label">Average Service:</span>
                                    <span className="user-account-summary-value">
                                        {reviews.length > 0
                                            ? (reviews.reduce((sum, r) => sum + r.service_rating, 0) / reviews.length).toFixed(1)
                                            : 0}/5
                                    </span>
                                </div>
                                <div className="user-account-summary-item">
                                    <span className="user-account-summary-label">Average Punctuality:</span>
                                    <span className="user-account-summary-value">
                                        {reviews.length > 0
                                            ? (reviews.reduce((sum, r) => sum + r.punctuality_rating, 0) / reviews.length).toFixed(1)
                                            : 0}/5
                                    </span>
                                </div>
                                <div className="user-account-summary-item">
                                    <span className="user-account-summary-label">Average Value:</span>
                                    <span className="user-account-summary-value">
                                        {reviews.length > 0
                                            ? (reviews.reduce((sum, r) => sum + r.value_rating, 0) / reviews.length).toFixed(1)
                                            : 0}/5
                                    </span>
                                </div>
                            </div>
                        </div>
                        {filteredReviews.length === 0 ? (
                            <p>No reviews match your current filters. Complete a booking to write a review!</p>
                        ) : (
                            <div className="user-account-reviews-list">
                                {filteredReviews.map(review => {
                                    const relatedBooking = bookings.find(b => b.id === review.booking);
                                    return (
                                        <div key={review.id} className="user-account-review-item">
                                            <div className="user-account-review-header">
                                                <div className="user-account-review-rating">
                                                    {'★'.repeat(review.overall_rating)}{'☆'.repeat(5 - review.overall_rating)}
                                                    <span className="user-account-review-rating-text">
                                                        ({review.overall_rating}/5)
                                                    </span>
                                                </div>
                                                <span className="user-account-review-date">
                                                    {new Date(review.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <h4 className="user-account-review-title">{review.title}</h4>
                                            <p className="user-account-review-comment">{review.comment}</p>
                                            <div className="user-account-review-details">
                                                <span className="user-account-review-detail">Communication: {review.communication_rating}/5</span>
                                                <span className="user-account-review-detail">Service: {review.service_rating}/5</span>
                                                <span className="user-account-review-detail">Punctuality: {review.punctuality_rating}/5</span>
                                                <span className="user-account-review-detail">Value: {review.value_rating}/5</span>
                                            </div>
                                            {relatedBooking && (
                                                <div className="user-account-review-booking">
                                                    <p>Booking: {relatedBooking.title} ({new Date(relatedBooking.start_date).toLocaleDateString()} - {new Date(relatedBooking.end_date).toLocaleDateString()})</p>
                                                </div>
                                            )}
                                            <div className="user-account-review-reactions">
                                                <span className="user-account-review-reaction-count">
                                                    👍 {review.like_count || 0}
                                                </span>
                                                <span className="user-account-review-reaction-count">
                                                    👎 {review.dislike_count || 0}
                                                </span>
                                                <button
                                                    className="user-account-btn user-account-btn-small"
                                                    onClick={() => handleViewReactions(review)}
                                                >
                                                    View Reactions
                                                </button>
                                            </div>
                                            <div className="user-account-review-actions">
                                                <button
                                                    className="user-account-btn user-account-btn-small"
                                                    onClick={() => handleEditReview(review, relatedBooking)}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    className="user-account-btn user-account-btn-small user-account-btn-danger"
                                                    onClick={() => handleDeleteReview(review.id)}
                                                >
                                                    Delete
                                                </button>
                                                <button
                                                    className="user-account-btn user-account-btn-small"
                                                    onClick={() => {
                                                        setSelectedReviewForReactions(review);
                                                        setReactionForm({ reaction_type: 'like', comment: '' });
                                                    }}
                                                >
                                                    React
                                                </button>
                                            </div>
                                            {selectedReviewForReactions?.id === review.id && (
                                                <div className="user-account-reaction-form">
                                                    <select
                                                        className="user-account-select"
                                                        value={reactionForm.reaction_type}
                                                        onChange={(e) => setReactionForm({ ...reactionForm, reaction_type: e.target.value })}
                                                    >
                                                        <option value="like">Like</option>
                                                        <option value="dislike">Dislike</option>
                                                    </select>
                                                    <textarea
                                                        className="user-account-textarea"
                                                        value={reactionForm.comment}
                                                        onChange={(e) => setReactionForm({ ...reactionForm, comment: e.target.value })}
                                                        placeholder={reactionForm.reaction_type === 'dislike' ? 'Comment (required for dislike)' : 'Comment (optional)'}
                                                        rows="2"
                                                    />
                                                    <div className="user-account-form-actions">
                                                        <button
                                                            className="user-account-btn user-account-btn-small user-account-btn-primary"
                                                            onClick={() => handleReactToReview(review.id)}
                                                        >
                                                            Submit Reaction
                                                        </button>
                                                        <button
                                                            className="user-account-btn user-account-btn-small user-account-btn-secondary"
                                                            onClick={() => setSelectedReviewForReactions(null)}
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            className="user-account-btn user-account-btn-small user-account-btn-danger"
                                                            onClick={() => handleRemoveReaction(review.id)}
                                                        >
                                                            Remove My Reaction
                                                        </button>
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
            {showBookingForm && (
                <div className="user-account-modal">
                    <div className="user-account-modal-content">
                        <div className="user-account-modal-header">
                            <h3 className="user-account-modal-title">
                                Book Guide: {selectedGuide?.user?.full_name}
                            </h3>
                            <button
                                className="user-account-modal-close"
                                onClick={() => {
                                    setShowBookingForm(false);
                                    setSelectedGuide(null);
                                    setError(null);
                                }}
                            >
                                ×
                            </button>
                        </div>
                        <form onSubmit={handleBookingSubmit} className="user-account-form">
                            <div className="user-account-form-group">
                                <label className="user-account-label">Title *</label>
                                <input
                                    type="text"
                                    className="user-account-input"
                                    value={bookingForm.title}
                                    onChange={(e) => setBookingForm({...bookingForm, title: e.target.value})}
                                    required
                                    placeholder="Enter booking title"
                                />
                            </div>
                            <div className="user-account-form-group">
                                <label className="user-account-label">Description</label>
                                <textarea
                                    className="user-account-textarea"
                                    value={bookingForm.description}
                                    onChange={(e) => setBookingForm({...bookingForm, description: e.target.value})}
                                    rows="3"
                                    placeholder="Describe what kind of tour/service you need"
                                />
                            </div>
                            <div className="user-account-form-row">
                                <div className="user-account-form-group">
                                    <label className="user-account-label">Start Date *</label>
                                    <input
                                        type="date"
                                        className="user-account-input"
                                        value={bookingForm.start_date}
                                        onChange={(e) => setBookingForm({...bookingForm, start_date: e.target.value})}
                                        required
                                        min={new Date().toISOString().split('T')[0]}
                                    />
                                </div>
                                <div className="user-account-form-group">
                                    <label className="user-account-label">End Date *</label>
                                    <input
                                        type="date"
                                        className="user-account-input"
                                        value={bookingForm.end_date}
                                        onChange={(e) => setBookingForm({...bookingForm, end_date: e.target.value})}
                                        required
                                        min={bookingForm.start_date || new Date().toISOString().split('T')[0]}
                                    />
                                </div>
                            </div>
                            <div className="user-account-form-group">
                                <label className="user-account-label">Special Requirements</label>
                                <textarea
                                    className="user-account-textarea"
                                    value={bookingForm.special_requirements}
                                    onChange={(e) => setBookingForm({...bookingForm, special_requirements: e.target.value})}
                                    rows="2"
                                    placeholder="Any special requests or requirements"
                                />
                            </div>
                            <div className="user-account-form-group">
                                <label className="user-account-label">Budget (USD)</label>
                                <input
                                    type="number"
                                    className="user-account-input"
                                    value={bookingForm.budget}
                                    onChange={(e) => setBookingForm({...bookingForm, budget: e.target.value})}
                                    placeholder="0"
                                    step="0.01"
                                    min="0"
                                />
                                {selectedGuide?.daily_rate && (
                                    <small style={{color: '#666', fontSize: '12px', display: 'block', marginTop: '4px'}}>
                                        Guide's daily rate: ${selectedGuide.daily_rate}
                                    </small>
                                )}
                                {selectedGuide?.hourly_rate && (
                                    <small style={{color: '#666', fontSize: '12px', display: 'block', marginTop: '4px'}}>
                                        Guide's hourly rate: ${selectedGuide.hourly_rate}
                                    </small>
                                )}
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
                            <div className="user-account-form-actions">
                                <button
                                    type="submit"
                                    className="user-account-btn user-account-btn-primary"
                                    disabled={!bookingForm.title.trim() || !bookingForm.start_date || !bookingForm.end_date}
                                >
                                    Book Guide
                                </button>
                                <button
                                    type="button"
                                    className="user-account-btn user-account-btn-secondary"
                                    onClick={() => {
                                        setShowBookingForm(false);
                                        setSelectedGuide(null);
                                        setError(null);
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {showReviewForm && (
                <div className="user-account-modal">
                    <div className="user-account-modal-content">
                        <div className="user-account-modal-header">
                            <h3 className="user-account-modal-title">
                                {editingReview ? 'Edit Review' : 'Write Review'} for {selectedBookingForReview?.title}
                            </h3>
                            <button
                                className="user-account-modal-close"
                                onClick={() => {
                                    setShowReviewForm(false);
                                    setSelectedBookingForReview(null);
                                    setEditingReview(null);
                                    setError(null);
                                }}
                            >
                                ×
                            </button>
                        </div>
                        <form onSubmit={handleReviewSubmit} className="user-account-form">
                            <div className="user-account-rating-group">
                                <div className="user-account-form-group">
                                    <label className="user-account-label">Overall Rating *</label>
                                    <select
                                        className="user-account-select"
                                        value={reviewForm.overall_rating}
                                        onChange={(e) => setReviewForm({...reviewForm, overall_rating: parseInt(e.target.value)})}
                                        required
                                    >
                                        {[1,2,3,4,5].map(num => (
                                            <option key={num} value={num}>{num} Star{num > 1 ? 's' : ''}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="user-account-form-group">
                                    <label className="user-account-label">Communication *</label>
                                    <select
                                        className="user-account-select"
                                        value={reviewForm.communication_rating}
                                        onChange={(e) => setReviewForm({...reviewForm, communication_rating: parseInt(e.target.value)})}
                                        required
                                    >
                                        {[1,2,3,4,5].map(num => (
                                            <option key={num} value={num}>{num}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="user-account-form-group">
                                    <label className="user-account-label">Service Quality *</label>
                                    <select
                                        className="user-account-select"
                                        value={reviewForm.service_rating}
                                        onChange={(e) => setReviewForm({...reviewForm, service_rating: parseInt(e.target.value)})}
                                        required
                                    >
                                        {[1,2,3,4,5].map(num => (
                                            <option key={num} value={num}>{num}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="user-account-form-group">
                                    <label className="user-account-label">Punctuality *</label>
                                    <select
                                        className="user-account-select"
                                        value={reviewForm.punctuality_rating}
                                        onChange={(e) => setReviewForm({...reviewForm, punctuality_rating: parseInt(e.target.value)})}
                                        required
                                    >
                                        {[1,2,3,4,5].map(num => (
                                            <option key={num} value={num}>{num}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="user-account-form-group">
                                    <label className="user-account-label">Value for Money *</label>
                                    <select
                                        className="user-account-select"
                                        value={reviewForm.value_rating}
                                        onChange={(e) => setReviewForm({...reviewForm, value_rating: parseInt(e.target.value)})}
                                        required
                                    >
                                        {[1,2,3,4,5].map(num => (
                                            <option key={num} value={num}>{num}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="user-account-form-group">
                                <label className="user-account-label">Title *</label>
                                <input
                                    type="text"
                                    className="user-account-input"
                                    value={reviewForm.title}
                                    onChange={(e) => setReviewForm({...reviewForm, title: e.target.value})}
                                    required
                                    placeholder="Enter review title"
                                />
                            </div>
                            <div className="user-account-form-group">
                                <label className="user-account-label">Comment *</label>
                                <textarea
                                    className="user-account-textarea"
                                    value={reviewForm.comment}
                                    onChange={(e) => setReviewForm({...reviewForm, comment: e.target.value})}
                                    rows="4"
                                    required
                                    placeholder="Share your experience..."
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
                            <div className="user-account-form-actions">
                                <button type="submit" className="user-account-btn user-account-btn-primary">
                                    {editingReview ? 'Update Review' : 'Submit Review'}
                                </button>
                                <button
                                    type="button"
                                    className="user-account-btn user-account-btn-secondary"
                                    onClick={() => {
                                        setShowReviewForm(false);
                                        setSelectedBookingForReview(null);
                                        setEditingReview(null);
                                        setError(null);
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {showCancelModal && (
                <div className="user-account-modal">
                    <div className="user-account-modal-content">
                        <div className="user-account-modal-header">
                            <h3 className="user-account-modal-title">Cancel Booking</h3>
                            <button
                                className="user-account-modal-close"
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
                        <form onSubmit={(e) => { e.preventDefault(); handleCancelBooking(); }} className="user-account-form">
                            <div className="user-account-form-group">
                                <label className="user-account-label">Cancellation Reason *</label>
                                <textarea
                                    className="user-account-textarea"
                                    value={cancelReason}
                                    onChange={(e) => setCancelReason(e.target.value)}
                                    rows="4"
                                    required
                                    placeholder="Please provide a reason for cancellation"
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
                            <div className="user-account-form-actions">
                                <button type="submit" className="user-account-btn user-account-btn-danger">
                                    Confirm Cancel
                                </button>
                                <button
                                    type="button"
                                    className="user-account-btn user-account-btn-secondary"
                                    onClick={() => {
                                        setShowCancelModal(false);
                                        setSelectedBookingForCancel(null);
                                        setCancelReason('');
                                        setError(null);
                                    }}
                                >
                                    Close
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {showReactionsModal && (
                <div className="user-account-modal">
                    <div className="user-account-modal-content">
                        <div className="user-account-modal-header">
                            <h3 className="user-account-modal-title">Review Reactions</h3>
                            <button
                                className="user-account-modal-close"
                                onClick={() => {
                                    setShowReactionsModal(false);
                                    setSelectedReviewForReactions(null);
                                    setReactions([]);
                                    setReactionSummary(null);
                                    setError(null);
                                }}
                            >
                                ×
                            </button>
                        </div>
                        {reactionSummary && (
                            <div className="user-account-reactions-summary">
                                <h4 className="user-account-section-subtitle">Reaction Summary</h4>
                                <div className="user-account-reactions-summary-grid">
                                    <div className="user-account-summary-item">
                                        <span className="user-account-summary-label">Likes:</span>
                                        <span className="user-account-summary-value">{reactionSummary.like_count}</span>
                                    </div>
                                    <div className="user-account-summary-item">
                                        <span className="user-account-summary-label">Dislikes:</span>
                                        <span className="user-account-summary-value">{reactionSummary.dislike_count}</span>
                                    </div>
                                </div>
                                <h4 className="user-account-section-subtitle">Latest Like Comments</h4>
                                {reactionSummary.latest_likes.length > 0 ? (
                                    <ul className="user-account-reactions-list">
                                        {reactionSummary.latest_likes.map(like => (
                                            <li key={like.id} className="user-account-reaction-item">
                                                <span>{like.user__first_name} {like.user__last_name}: {like.comment}</span>
                                                <span className="user-account-reaction-date">
                                                    {new Date(like.created_at).toLocaleDateString()}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p>No like comments available.</p>
                                )}
                                <h4 className="user-account-section-subtitle">Latest Dislike Comments</h4>
                                {reactionSummary.latest_dislikes.length > 0 ? (
                                    <ul className="user-account-reactions-list">
                                        {reactionSummary.latest_dislikes.map(dislike => (
                                            <li key={dislike.id} className="user-account-reaction-item">
                                                <span>{dislike.user__first_name} {dislike.user__last_name}: {dislike.comment}</span>
                                                <span className="user-account-reaction-date">
                                                    {new Date(dislike.created_at).toLocaleDateString()}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p>No dislike comments available.</p>
                                )}
                            </div>
                        )}
                        <h4 className="user-account-section-subtitle">All Reactions</h4>
                        {reactions.length > 0 ? (
                            <ul className="user-account-reactions-list">
                                {reactions.map(reaction => (
                                    <li key={reaction.id} className="user-account-reaction-item">
                                        <span>{reaction.user.first_name} {reaction.user.last_name}: {reaction.reaction_type === 'like' ? '👍' : '👎'} {reaction.comment}</span>
                                        <span className="user-account-reaction-date">
                                            {new Date(reaction.created_at).toLocaleDateString()}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p>No reactions available.</p>
                        )}
                    </div>
                </div>
            )}
            <ChatWidgets
                isOpen={showChat}
                onClose={handleCloseChat}
                selectedUserId={selectedUserForChat}
                userRole="client"
            />
        </div>
    );
};

export default UserAccount;