// GuideAccount.js
import React, { useState, useEffect } from 'react';
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
    // New states for reviews section
    const [reviewFilter, setReviewFilter] = useState({
        minRating: '',
        sortBy: 'date_desc'
    });
    const [showReactionForm, setShowReactionForm] = useState(null);
    const [reactionForm, setReactionForm] = useState({
        reactionType: 'like',
        comment: ''
    });

    // Profile form state
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

    // Portfolio form state
    const [portfolioForm, setPortfolioForm] = useState({
        title: '',
        description: '',
        image: null,
        order: 0
    });

    // Availability form state
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

            // Load current user
            const userData = await getCurrentUser();
            setCurrentUser(userData);

            // Load common data
            const [serviceTypesData, languagesData, citiesData] = await Promise.all([
                getServiceTypes(),
                getLanguages(),
                getCities()
            ]);

            setServiceTypes(serviceTypesData.results || serviceTypesData);
            setLanguages(languagesData.results || languagesData);
            setCities(citiesData.results || citiesData);

            // Try to load profile
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

                // Load other data if profile exists
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
        } catch (err) {
            setError(err.message);
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
        } catch (err) {
            setError(err.message);
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
        } catch (err) {
            setError(err.message);
        }
    };

    const handleBookingAction = async (bookingId, action) => {
        try {
            if (action === 'accept') {
                await acceptBooking(bookingId);
            } else if (action === 'cancel') {
                await cancelBooking(bookingId, cancelReason || 'Guide cancelled the booking');
            }
            loadBookings();
            setError(null);
        } catch (err) {
            setError(err.message);
        }
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
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDeleteAvailability = async (id) => {
        try {
            await deleteAvailability(id);
            loadAvailability();
            setError(null);
        } catch (err) {
            setError(err.message);
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

    // New Review Handlers
    const handleReviewFilterChange = (key, value) => {
        setReviewFilter({ ...reviewFilter, [key]: value });
    };

    const handleReactToReview = async (reviewId) => {
        if (!reactionForm.reactionType || (reactionForm.reactionType === 'comment' && !reactionForm.comment.trim())) {
            setError('Please select a reaction type or provide a comment');
            return;
        }
        try {
            await reactToReview(reviewId, reactionForm.reactionType, reactionForm.comment);
            loadReviews();
            setShowReactionForm(null);
            setReactionForm({ reactionType: 'like', comment: '' });
            setError(null);
        } catch (err) {
            setError(err.message || 'Failed to react to review');
        }
    };

    const handleRemoveReaction = async (reviewId) => {
        try {
            await removeReactionFromReview(reviewId);
            loadReviews();
            setError(null);
        } catch (err) {
            setError(err.message || 'Failed to remove reaction');
        }
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

    if (loading) {
        return (
            <div className="guide-account-loading">
                <div className="guide-account-spinner"></div>
                <p>Loading...</p>
            </div>
        );
    }

    return (
        <div className="guide-account-container">
            <div className="guide-account-header">
                <h1 className="guide-account-title">Guide Dashboard</h1>
                {currentUser && (
                    <div className="guide-account-user-info">
                        <span className="guide-account-welcome">Welcome, {currentUser.full_name}</span>
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
                            Messages
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
                    Dashboard
                </button>
                <button
                    className={`guide-account-nav-btn ${activeTab === 'profile' ? 'guide-account-nav-active' : ''}`}
                    onClick={() => setActiveTab('profile')}
                >
                    Profile
                </button>
                <button
                    className={`guide-account-nav-btn ${activeTab === 'bookings' ? 'guide-account-nav-active' : ''}`}
                    onClick={() => setActiveTab('bookings')}
                >
                    Bookings
                </button>
                <button
                    className={`guide-account-nav-btn ${activeTab === 'portfolio' ? 'guide-account-nav-active' : ''}`}
                    onClick={() => setActiveTab('portfolio')}
                >
                    Portfolio
                </button>
                <button
                    className={`guide-account-nav-btn ${activeTab === 'availability' ? 'guide-account-nav-active' : ''}`}
                    onClick={() => setActiveTab('availability')}
                >
                    Availability
                </button>
                <button
                    className={`guide-account-nav-btn ${activeTab === 'reviews' ? 'guide-account-nav-active' : ''}`}
                    onClick={() => setActiveTab('reviews')}
                >
                    Reviews
                </button>
            </div>

            <div className="guide-account-content">
                {activeTab === 'dashboard' && (
                    <div className="guide-account-dashboard">
                        <div className="guide-account-stats">
                            <div className="guide-account-stat-card">
                                <h3 className="guide-account-stat-title">Total Bookings</h3>
                                <p className="guide-account-stat-value">{bookings.length}</p>
                            </div>
                            <div className="guide-account-stat-card">
                                <h3 className="guide-account-stat-title">Active Bookings</h3>
                                <p className="guide-account-stat-value">
                                    {bookings.filter(b => b.status === 'confirmed' || b.status === 'accepted').length}
                                </p>
                            </div>
                            <div className="guide-account-stat-card">
                                <h3 className="guide-account-stat-title">Total Reviews</h3>
                                <p className="guide-account-stat-value">{reviews.length}</p>
                            </div>
                            <div className="guide-account-stat-card">
                                <h3 className="guide-account-stat-title">Average Rating</h3>
                                <p className="guide-account-stat-value">
                                    {profile?.average_rating || 0}/5
                                </p>
                            </div>
                        </div>

                        <div className="guide-account-recent">
                            <h3 className="guide-account-section-title">Recent Bookings</h3>
                            <div className="guide-account-recent-bookings">
                                {bookings.slice(0, 5).map(booking => (
                                    <div key={booking.id} className="guide-account-booking-card">
                                        <div className="guide-account-booking-info">
                                            <h4 className="guide-account-booking-title">{booking.title}</h4>
                                            <p className="guide-account-booking-date">
                                                {new Date(booking.start_date).toLocaleDateString()} -
                                                {new Date(booking.end_date).toLocaleDateString()}
                                            </p>
                                            <span className={`guide-account-booking-status guide-account-status-${booking.status}`}>
                                                {booking.status}
                                            </span>
                                        </div>
                                        <div className="guide-account-booking-actions">
                                            {booking.status === 'pending' && (
                                                <>
                                                    <button
                                                        className="guide-account-btn guide-account-btn-accept"
                                                        onClick={() => handleBookingAction(booking.id, 'accept')}
                                                    >
                                                        Accept
                                                    </button>
                                                    <button
                                                        className="guide-account-btn guide-account-btn-cancel"
                                                        onClick={() => handleOpenCancelModal(booking)}
                                                    >
                                                        Decline
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
                                                    Chat
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
                                    {profile ? 'Edit Profile' : 'Create Profile'}
                                </h3>
                                <form onSubmit={handleProfileSubmit} className="guide-account-form">
                                    <div className="guide-account-form-group">
                                        <label className="guide-account-label">Professional Bio</label>
                                        <textarea
                                            className="guide-account-textarea"
                                            value={profileForm.professional_bio}
                                            onChange={(e) => setProfileForm({...profileForm, professional_bio: e.target.value})}
                                            placeholder="Tell clients about your experience and expertise..."
                                            rows="4"
                                        />
                                    </div>

                                    <div className="guide-account-form-row">
                                        <div className="guide-account-form-group">
                                            <label className="guide-account-label">Years of Experience</label>
                                            <input
                                                type="number"
                                                className="guide-account-input"
                                                value={profileForm.years_of_experience}
                                                onChange={(e) => setProfileForm({...profileForm, years_of_experience: parseInt(e.target.value)})}
                                                min="0"
                                            />
                                        </div>
                                        <div className="guide-account-form-group">
                                            <label className="guide-account-label">City</label>
                                            <select
                                                className="guide-account-select"
                                                value={profileForm.city}
                                                onChange={(e) => setProfileForm({...profileForm, city: e.target.value})}
                                            >
                                                <option value="">Select City</option>
                                                {cities.map(city => (
                                                    <option key={city.id} value={city.id}>{city.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="guide-account-form-group">
                                        <label className="guide-account-label">Service Areas</label>
                                        <input
                                            type="text"
                                            className="guide-account-input"
                                            value={profileForm.service_areas}
                                            onChange={(e) => setProfileForm({...profileForm, service_areas: e.target.value})}
                                            placeholder="Areas where you provide services"
                                        />
                                    </div>

                                    <div className="guide-account-form-group">
                                        <label className="guide-account-label">Service Types</label>
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
                                            <label className="guide-account-label">Hourly Rate</label>
                                            <input
                                                type="number"
                                                className="guide-account-input"
                                                value={profileForm.hourly_rate}
                                                onChange={(e) => setProfileForm({...profileForm, hourly_rate: e.target.value})}
                                                placeholder="0"
                                                step="0.01"
                                            />
                                        </div>
                                        <div className="guide-account-form-group">
                                            <label className="guide-account-label">Daily Rate</label>
                                            <input
                                                type="number"
                                                className="guide-account-input"
                                                value={profileForm.daily_rate}
                                                onChange={(e) => setProfileForm({...profileForm, daily_rate: e.target.value})}
                                                placeholder="0"
                                                step="0.01"
                                            />
                                        </div>
                                        <div className="guide-account-form-group">
                                            <label className="guide-account-label">Currency</label>
                                            <select
                                                className="guide-account-select"
                                                value={profileForm.currency}
                                                onChange={(e) => setProfileForm({...profileForm, currency: e.target.value})}
                                            >
                                                <option value="USD">USD</option>
                                                <option value="EUR">EUR</option>
                                                <option value="UZS">UZS</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="guide-account-form-group">
                                        <label className="guide-account-label">Languages</label>
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
                                                onChange={(e) => setProfileForm({...profileForm, is_available: e.target.checked})}
                                            />
                                            Available for bookings
                                        </label>
                                    </div>

                                    <div className="guide-account-form-actions">
                                        <button type="submit" className="guide-account-btn guide-account-btn-primary">
                                            {profile ? 'Update Profile' : 'Create Profile'}
                                        </button>
                                        {profile && (
                                            <button
                                                type="button"
                                                className="guide-account-btn guide-account-btn-secondary"
                                                onClick={() => setShowProfileForm(false)}
                                            >
                                                Cancel
                                            </button>
                                        )}
                                    </div>
                                </form>
                            </div>
                        ) : (
                            <div className="guide-account-profile-view">
                                <div className="guide-account-profile-header">
                                    <h3 className="guide-account-section-title">Profile Information</h3>
                                    <button
                                        className="guide-account-btn guide-account-btn-primary"
                                        onClick={() => setShowProfileForm(true)}
                                    >
                                        Edit Profile
                                    </button>
                                </div>
                                <div className="guide-account-profile-info">
                                    <div className="guide-account-profile-field">
                                        <label className="guide-account-profile-label">Bio:</label>
                                        <p className="guide-account-profile-value">{profile.professional_bio}</p>
                                    </div>
                                    <div className="guide-account-profile-field">
                                        <label className="guide-account-profile-label">Experience:</label>
                                        <p className="guide-account-profile-value">{profile.years_of_experience} years</p>
                                    </div>
                                    <div className="guide-account-profile-field">
                                        <label className="guide-account-profile-label">Availability:</label>
                                        <p className="guide-account-profile-value">
                                            {profile.is_available ? 'Available' : 'Not Available'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'bookings' && (
                    <div className="guide-account-bookings">
                        <h3 className="guide-account-section-title">My Bookings</h3>
                        <div className="guide-account-bookings-list">
                            {bookings.map(booking => (
                                <div key={booking.id} className="guide-account-booking-item">
                                    <div className="guide-account-booking-details">
                                        <h4 className="guide-account-booking-title">{booking.title}</h4>
                                        <p className="guide-account-booking-dates">
                                            {new Date(booking.start_date).toLocaleDateString()} -
                                            {new Date(booking.end_date).toLocaleDateString()}
                                        </p>
                                        <p className="guide-account-booking-description">{booking.description}</p>
                                        <span className={`guide-account-booking-status guide-account-status-${booking.status}`}>
                                            {booking.status}
                                        </span>
                                    </div>
                                    <div className="guide-account-booking-actions">
                                        {booking.status === 'pending' && (
                                            <>
                                                <button
                                                    className="guide-account-btn guide-account-btn-accept"
                                                    onClick={() => handleBookingAction(booking.id, 'accept')}
                                                >
                                                    Accept
                                                </button>
                                                <button
                                                    className="guide-account-btn guide-account-btn-cancel"
                                                    onClick={() => handleOpenCancelModal(booking)}
                                                >
                                                    Decline
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
                                                Chat with Client
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
                            <h3 className="guide-account-section-title">Portfolio</h3>
                            <button
                                className="guide-account-btn guide-account-btn-primary"
                                onClick={() => setShowPortfolioForm(true)}
                            >
                                Add Portfolio Item
                            </button>
                        </div>

                        {showPortfolioForm && (
                            <div className="guide-account-portfolio-form">
                                <h4 className="guide-account-form-title">
                                    {editingPortfolioItem ? 'Edit Portfolio Item' : 'Add Portfolio Item'}
                                </h4>
                                <form onSubmit={handlePortfolioSubmit} className="guide-account-form">
                                    <div className="guide-account-form-group">
                                        <label className="guide-account-label">Title</label>
                                        <input
                                            type="text"
                                            className="guide-account-input"
                                            value={portfolioForm.title}
                                            onChange={(e) => setPortfolioForm({...portfolioForm, title: e.target.value})}
                                            required
                                        />
                                    </div>
                                    <div className="guide-account-form-group">
                                        <label className="guide-account-label">Description</label>
                                        <textarea
                                            className="guide-account-textarea"
                                            value={portfolioForm.description}
                                            onChange={(e) => setPortfolioForm({...portfolioForm, description: e.target.value})}
                                            rows="3"
                                        />
                                    </div>
                                    <div className="guide-account-form-group">
                                        <label className="guide-account-label">Image</label>
                                        <input
                                            type="file"
                                            className="guide-account-file-input"
                                            accept="image/*"
                                            onChange={(e) => setPortfolioForm({...portfolioForm, image: e.target.files[0]})}
                                        />
                                    </div>
                                    <div className="guide-account-form-group">
                                        <label className="guide-account-label">Order</label>
                                        <input
                                            type="number"
                                            className="guide-account-input"
                                            value={portfolioForm.order}
                                            onChange={(e) => setPortfolioForm({...portfolioForm, order: parseInt(e.target.value)})}
                                            min="0"
                                        />
                                    </div>
                                    <div className="guide-account-form-actions">
                                        <button type="submit" className="guide-account-btn guide-account-btn-primary">
                                            {editingPortfolioItem ? 'Update' : 'Add'}
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
                                            Cancel
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
                                                Edit
                                            </button>
                                            <button
                                                className="guide-account-btn guide-account-btn-small guide-account-btn-danger"
                                                onClick={() => handleDeletePortfolio(item.id)}
                                            >
                                                Delete
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
                            <h3 className="guide-account-section-title">Availability</h3>
                            <button
                                className="guide-account-btn guide-account-btn-primary"
                                onClick={() => setShowAvailabilityForm(true)}
                            >
                                Add Availability
                            </button>
                        </div>

                        {showAvailabilityForm && (
                            <div className="guide-account-availability-form">
                                <h4 className="guide-account-form-title">
                                    {editingAvailability ? 'Edit Availability' : 'Add Availability'}
                                </h4>
                                <form onSubmit={handleAvailabilitySubmit} className="guide-account-form">
                                    <div className="guide-account-form-row">
                                        <div className="guide-account-form-group">
                                            <label className="guide-account-label">Date</label>
                                            <input
                                                type="date"
                                                className="guide-account-input"
                                                value={availabilityForm.date}
                                                onChange={(e) => setAvailabilityForm({...availabilityForm, date: e.target.value})}
                                                required
                                            />
                                        </div>
                                        <div className="guide-account-form-group">
                                            <label className="guide-account-checkbox-label">
                                                <input
                                                    type="checkbox"
                                                    className="guide-account-checkbox"
                                                    checked={availabilityForm.is_available}
                                                    onChange={(e) => setAvailabilityForm({...availabilityForm, is_available: e.target.checked})}
                                                />
                                                Available
                                            </label>
                                        </div>
                                    </div>
                                    <div className="guide-account-form-row">
                                        <div className="guide-account-form-group">
                                            <label className="guide-account-label">Start Time</label>
                                            <input
                                                type="time"
                                                className="guide-account-input"
                                                value={availabilityForm.start_time}
                                                onChange={(e) => setAvailabilityForm({...availabilityForm, start_time: e.target.value})}
                                            />
                                        </div>
                                        <div className="guide-account-form-group">
                                            <label className="guide-account-label">End Time</label>
                                            <input
                                                type="time"
                                                className="guide-account-input"
                                                value={availabilityForm.end_time}
                                                onChange={(e) => setAvailabilityForm({...availabilityForm, end_time: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                    <div className="guide-account-form-group">
                                        <label className="guide-account-label">Note</label>
                                        <input
                                            type="text"
                                            className="guide-account-input"
                                            value={availabilityForm.note}
                                            onChange={(e) => setAvailabilityForm({...availabilityForm, note: e.target.value})}
                                            placeholder="Optional note"
                                        />
                                    </div>
                                    <div className="guide-account-form-actions">
                                        <button type="submit" className="guide-account-btn guide-account-btn-primary">
                                            {editingAvailability ? 'Update' : 'Add'}
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
                                            Cancel
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
                                            {new Date(item.date).toLocaleDateString()}
                                        </h4>
                                        <p className="guide-account-availability-time">
                                            {item.start_time && item.end_time ?
                                                `${item.start_time} - ${item.end_time}` :
                                                'All day'
                                            }
                                        </p>
                                        <p className="guide-account-availability-note">{item.note}</p>
                                        <span className={`guide-account-availability-status ${item.is_available ? 'guide-account-available' : 'guide-account-unavailable'}`}>
                                            {item.is_available ? 'Available' : 'Unavailable'}
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
                                            Edit
                                        </button>
                                        <button
                                            className="guide-account-btn guide-account-btn-small guide-account-btn-danger"
                                            onClick={() => handleDeleteAvailability(item.id)}
                                        >
                                            Delete
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
                            <h3 className="guide-account-section-title">Reviews</h3>
                            <div className="guide-account-reviews-filters">
                                <select
                                    className="guide-account-filter-select"
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
                                    className="guide-account-filter-select"
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

                        {reviewSummary && (
                            <div className="guide-account-reviews-summary">
                                <h4 className="guide-account-section-subtitle">Rating Summary</h4>
                                <div className="guide-account-reviews-summary-grid">
                                    <div className="guide-account-summary-item">
                                        <span className="guide-account-summary-label">Overall:</span>
                                        <span className="guide-account-summary-value">
                                            {reviewSummary.overall_rating?.toFixed(1) || 0}/5
                                        </span>
                                    </div>
                                    <div className="guide-account-summary-item">
                                        <span className="guide-account-summary-label">Communication:</span>
                                        <span className="guide-account-summary-value">
                                            {reviewSummary.communication_rating?.toFixed(1) || 0}/5
                                        </span>
                                    </div>
                                    <div className="guide-account-summary-item">
                                        <span className="guide-account-summary-label">Service:</span>
                                        <span className="guide-account-summary-value">
                                            {reviewSummary.service_rating?.toFixed(1) || 0}/5
                                        </span>
                                    </div>
                                    <div className="guide-account-summary-item">
                                        <span className="guide-account-summary-label">Punctuality:</span>
                                        <span className="guide-account-summary-value">
                                            {reviewSummary.punctuality_rating?.toFixed(1) || 0}/5
                                        </span>
                                    </div>
                                    <div className="guide-account-summary-item">
                                        <span className="guide-account-summary-label">Value:</span>
                                        <span className="guide-account-summary-value">
                                            {reviewSummary.value_rating?.toFixed(1) || 0}/5
                                        </span>
                                    </div>
                                    <div className="guide-account-summary-item">
                                        <span className="guide-account-summary-label">Total Reviews:</span>
                                        <span className="guide-account-summary-value">
                                            {reviewSummary.total_reviews || 0}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="guide-account-reviews-list">
                            {filteredReviews.length === 0 ? (
                                <p>No reviews match your current filters.</p>
                            ) : (
                                filteredReviews.map(review => (
                                    <div key={review.id} className="guide-account-review-item">
                                        <div className="guide-account-review-header">
                                            <div className="guide-account-review-rating">
                                                {'★'.repeat(review.overall_rating)}{'☆'.repeat(5 - review.overall_rating)}
                                                <span className="guide-account-review-rating-text">
                                                    ({review.overall_rating}/5)
                                                </span>
                                            </div>
                                            <span className="guide-account-review-date">
                                                {new Date(review.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <h4 className="guide-account-review-title">{review.title}</h4>
                                        <p className="guide-account-review-comment">{review.comment}</p>
                                        <div className="guide-account-review-details">
                                            <span className="guide-account-review-detail">Communication: {review.communication_rating}/5</span>
                                            <span className="guide-account-review-detail">Service: {review.service_rating}/5</span>
                                            <span className="guide-account-review-detail">Punctuality: {review.punctuality_rating}/5</span>
                                            <span className="guide-account-review-detail">Value: {review.value_rating}/5</span>
                                        </div>
                                        <div className="guide-account-review-actions">
                                            <button
                                                className="guide-account-btn guide-account-btn-small"
                                                onClick={() => {
                                                    setShowReactionForm(review.id);
                                                    setReactionForm({ reactionType: 'like', comment: '' });
                                                }}
                                            >
                                                React
                                            </button>
                                            {review.my_reaction && (
                                                <button
                                                    className="guide-account-btn guide-account-btn-small guide-account-btn-danger"
                                                    onClick={() => handleRemoveReaction(review.id)}
                                                >
                                                    Remove Reaction
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
                                                        <label className="guide-account-label">Reaction Type</label>
                                                        <select
                                                            className="guide-account-select"
                                                            value={reactionForm.reactionType}
                                                            onChange={(e) => setReactionForm({...reactionForm, reactionType: e.target.value})}
                                                        >
                                                            <option value="like">Like</option>
                                                            <option value="comment">Comment</option>
                                                            <option value="report">Report</option>
                                                        </select>
                                                    </div>
                                                    {reactionForm.reactionType === 'comment' && (
                                                        <div className="guide-account-form-group">
                                                            <label className="guide-account-label">Comment</label>
                                                            <textarea
                                                                className="guide-account-textarea"
                                                                value={reactionForm.comment}
                                                                onChange={(e) => setReactionForm({...reactionForm, comment: e.target.value})}
                                                                rows="3"
                                                                placeholder="Your response to the review..."
                                                            />
                                                        </div>
                                                    )}
                                                    {reactionForm.reactionType === 'report' && (
                                                        <div className="guide-account-form-group">
                                                            <label className="guide-account-label">Reason for Report</label>
                                                            <textarea
                                                                className="guide-account-textarea"
                                                                value={reactionForm.comment}
                                                                onChange={(e) => setReactionForm({...reactionForm, comment: e.target.value})}
                                                                rows="3"
                                                                placeholder="Please explain why you are reporting this review..."
                                                                required
                                                            />
                                                        </div>
                                                    )}
                                                    <div className="guide-account-form-actions">
                                                        <button type="submit" className="guide-account-btn guide-account-btn-primary">
                                                            Submit Reaction
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="guide-account-btn guide-account-btn-secondary"
                                                            onClick={() => setShowReactionForm(null)}
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </form>
                                            </div>
                                        )}
                                        {review.my_reaction && (
                                            <div className="guide-account-reaction-display">
                                                <p>Your reaction: {review.my_reaction.reaction_type}
                                                    {review.my_reaction.comment && ` - ${review.my_reaction.comment}`}
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
                            <h3 className="guide-account-modal-title">Decline/Cancel Booking</h3>
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
                                <label className="guide-account-label">Reason for Decline/Cancel *</label>
                                <textarea
                                    className="guide-account-textarea"
                                    value={cancelReason}
                                    onChange={(e) => setCancelReason(e.target.value)}
                                    rows="4"
                                    required
                                    placeholder="Please provide a reason"
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
                                    Confirm
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
                                    Close
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