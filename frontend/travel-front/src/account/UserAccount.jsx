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
    getLanguages,
    getCurrentUser,
    getServiceTypes
} from '../api/api';
import ChatWidgets from './ChatWidgets'; // YANGI: Chat widget import
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
    const [selectedGuide, setSelectedGuide] = useState(null);
    const [selectedBookingForReview, setSelectedBookingForReview] = useState(null);

    // YANGI: Chat states
    const [showChat, setShowChat] = useState(false);
    const [selectedUserForChat, setSelectedUserForChat] = useState(null);

    const [guidesFilter, setGuidesFilter] = useState({
        search: '',
        service_type: '',
        city: '',
        min_rating: '',
        is_available: true
    });

    // Profile form state
    const [profileForm, setProfileForm] = useState({
        date_of_birth: '',
        preferred_contact: 'email',
        languages: []
    });

    // Booking form state
    const [bookingForm, setBookingForm] = useState({
        title: '',
        description: '',
        start_date: '',
        end_date: '',
        special_requirements: '',
        budget: '',
        customer_profile: ''
    });

    // Review form state
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
            const [languagesData, serviceTypesData] = await Promise.all([
                getLanguages(),
                getServiceTypes()
            ]);

            setLanguages(languagesData.results || languagesData);
            setServiceTypes(serviceTypesData.results || serviceTypesData);

            // Try to load profile
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

            // Load other data
            loadBookings();
            loadReviews();
            loadGuides();

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

        // YANGI: Validation qo'shish
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

        // Start date End date dan kichik bo'lishi kerak
        if (new Date(bookingForm.start_date) > new Date(bookingForm.end_date)) {
            setError('Start date must be before end date');
            return;
        }

        // Bugungi sanadan oldingi sana bo'lmasligi kerak
        const today = new Date().toISOString().split('T')[0];
        if (bookingForm.start_date < today) {
            setError('Start date cannot be in the past');
            return;
        }

        try {
            console.log('Creating booking with data:', {
                ...bookingForm,
                customer_profile: selectedGuide.id
            });

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

            // Success message
            alert('Booking created successfully!');

        } catch (err) {
            console.error('Booking creation error:', err);
            setError(err.message || 'Failed to create booking');
        }
    };

    const handleReviewSubmit = async (e) => {
        e.preventDefault();
        try {
            await createReview({
                ...reviewForm,
                booking_id: selectedBookingForReview.id
            });
            loadReviews();
            setShowReviewForm(false);
            setSelectedBookingForReview(null);
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
        } catch (err) {
            setError(err.message);
        }
    };

    const handleCancelBooking = async (bookingId) => {
        try {
            await cancelBooking(bookingId, 'Client cancelled the booking');
            loadBookings();
        } catch (err) {
            setError(err.message);
        }
    };

    // TO'G'RILANGAN: handleBookGuide funksiyasi default qiymatlar bilan
    const handleBookGuide = (guide) => {
        setSelectedGuide(guide);

        // Default qiymatlar qo'yish
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);

        setBookingForm({
            title: `Tour with ${guide.user?.full_name || 'Guide'}`,
            description: '',
            start_date: tomorrow.toISOString().split('T')[0], // Tomorrow
            end_date: nextWeek.toISOString().split('T')[0],   // Next week
            special_requirements: '',
            budget: guide.daily_rate || guide.hourly_rate || '',
            customer_profile: ''
        });

        setShowBookingForm(true);
    };

    const handleWriteReview = (booking) => {
        setSelectedBookingForReview(booking);
        setShowReviewForm(true);
    };

    // YANGI: Chat functions
    const handleChatWithUser = (user) => {
        setSelectedUserForChat(user?.user?.email || user?.email);
        setShowChat(true);
    };

    const handleCloseChat = () => {
        setShowChat(false);
        setSelectedUserForChat(null);
    };

    const handleFilterChange = (key, value) => {
        setGuidesFilter({ ...guidesFilter, [key]: value });
    };

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
                        {/* YANGI: Messages button */}
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
                <div className="user-account-error">
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
                                        </div>
                                        <div className="user-account-booking-actions">
                                            {booking.status === 'pending' && (
                                                <button
                                                    className="user-account-btn user-account-btn-cancel"
                                                    onClick={() => handleCancelBooking(booking.id)}
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
                                            {/* YANGI: Chat button */}
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
                                        className="user-account-btn user-account-btn-primary"
                                        onClick={() => setShowProfileForm(true)}
                                    >
                                        Edit Profile
                                    </button>
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
                                            {/* YANGI: Chat button */}
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
                                    </div>
                                    <div className="user-account-booking-actions">
                                        {booking.status === 'pending' && (
                                            <button
                                                className="user-account-btn user-account-btn-cancel"
                                                onClick={() => handleCancelBooking(booking.id)}
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
                                        {/* YANGI: Chat button */}
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
                        <h3 className="user-account-section-title">My Reviews</h3>
                        <div className="user-account-reviews-list">
                            {reviews.map(review => (
                                <div key={review.id} className="user-account-review-item">
                                    <div className="user-account-review-header">
                                        <div className="user-account-review-rating">
                                            {'★'.repeat(review.overall_rating)}{'☆'.repeat(5 - review.overall_rating)}
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
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* TO'G'RILANGAN: Booking Form Modal */}
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

                            {/* Error display in form */}
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

            {/* Review Form Modal */}
            {showReviewForm && (
                <div className="user-account-modal">
                    <div className="user-account-modal-content">
                        <div className="user-account-modal-header">
                            <h3 className="user-account-modal-title">Write Review</h3>
                            <button
                                className="user-account-modal-close"
                                onClick={() => {
                                    setShowReviewForm(false);
                                    setSelectedBookingForReview(null);
                                }}
                            >
                                ×
                            </button>
                        </div>
                        <form onSubmit={handleReviewSubmit} className="user-account-form">
                            <div className="user-account-rating-group">
                                <div className="user-account-form-group">
                                    <label className="user-account-label">Overall Rating</label>
                                    <select
                                        className="user-account-select"
                                        value={reviewForm.overall_rating}
                                        onChange={(e) => setReviewForm({...reviewForm, overall_rating: parseInt(e.target.value)})}
                                    >
                                        {[1,2,3,4,5].map(num => (
                                            <option key={num} value={num}>{num} Star{num > 1 ? 's' : ''}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="user-account-form-group">
                                    <label className="user-account-label">Communication</label>
                                    <select
                                        className="user-account-select"
                                        value={reviewForm.communication_rating}
                                        onChange={(e) => setReviewForm({...reviewForm, communication_rating: parseInt(e.target.value)})}
                                    >
                                        {[1,2,3,4,5].map(num => (
                                            <option key={num} value={num}>{num}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="user-account-form-group">
                                    <label className="user-account-label">Service Quality</label>
                                    <select
                                        className="user-account-select"
                                        value={reviewForm.service_rating}
                                        onChange={(e) => setReviewForm({...reviewForm, service_rating: parseInt(e.target.value)})}
                                    >
                                        {[1,2,3,4,5].map(num => (
                                            <option key={num} value={num}>{num}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="user-account-form-group">
                                    <label className="user-account-label">Punctuality</label>
                                    <select
                                        className="user-account-select"
                                        value={reviewForm.punctuality_rating}
                                        onChange={(e) => setReviewForm({...reviewForm, punctuality_rating: parseInt(e.target.value)})}
                                    >
                                        {[1,2,3,4,5].map(num => (
                                            <option key={num} value={num}>{num}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="user-account-form-group">
                                    <label className="user-account-label">Value for Money</label>
                                    <select
                                        className="user-account-select"
                                        value={reviewForm.value_rating}
                                        onChange={(e) => setReviewForm({...reviewForm, value_rating: parseInt(e.target.value)})}
                                    >
                                        {[1,2,3,4,5].map(num => (
                                            <option key={num} value={num}>{num}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="user-account-form-group">
                                <label className="user-account-label">Title</label>
                                <input
                                    type="text"
                                    className="user-account-input"
                                    value={reviewForm.title}
                                    onChange={(e) => setReviewForm({...reviewForm, title: e.target.value})}
                                    required
                                />
                            </div>
                            <div className="user-account-form-group">
                                <label className="user-account-label">Comment</label>
                                <textarea
                                    className="user-account-textarea"
                                    value={reviewForm.comment}
                                    onChange={(e) => setReviewForm({...reviewForm, comment: e.target.value})}
                                    rows="4"
                                    required
                                />
                            </div>
                            <div className="user-account-form-actions">
                                <button type="submit" className="user-account-btn user-account-btn-primary">
                                    Submit Review
                                </button>
                                <button
                                    type="button"
                                    className="user-account-btn user-account-btn-secondary"
                                    onClick={() => {
                                        setShowReviewForm(false);
                                        setSelectedBookingForReview(null);
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* YANGI: Chat Widget */}
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