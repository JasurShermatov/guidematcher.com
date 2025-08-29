// ClientDashboard.jsx (modified to ensure chat integration)
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
    getCities,
    getCountries,
    canReviewBooking,
    logoutUser
} from '../api/api';
import ChatWidget from './ChatWidgets';
import './UserAccount.css';

const ClientDashboard = ({ user, setIsAuthenticated, setUser }) => {
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
    const [selectedGuide, setSelectedGuide] = useState(null);
    const [selectedBookingForReview, setSelectedBookingForReview] = useState(null);
    const [editingReview, setEditingReview] = useState(null);
    const [showChat, setShowChat] = useState(false);
    const [selectedUserForChat, setSelectedUserForChat] = useState(null);

    // Form states
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
        country: '',
        city: '',
        location: '',
        proposed_rate: '',
        special_requirements: '',
        customer_profile: ''
    });

    const [reviewForm, setReviewForm] = useState({
        rating: 5,
        comment: ''
    });

    // FIXED: Filters for guides search - to'g'ri parametrlar
    const [guidesFilter, setGuidesFilter] = useState({
        search: '',
        service_types: '', // FIXED: service_type -> service_types
        country: '',
        city: '',
        average_rating__gte: '', // FIXED: min_rating -> average_rating__gte
        is_available: true
    });

    useEffect(() => {
        initializeData();
    }, []);

    const initializeData = async () => {
        try {
            setLoading(true);

            // Load common data
            const [languagesData, serviceTypesData, citiesData, countriesData] = await Promise.all([
                getLanguages().catch(() => ({ results: [] })),
                getServiceTypes().catch(() => ({ results: [] })),
                getCities().catch(() => ({ results: [] })),
                getCountries().catch(() => ({ results: [] }))
            ]);

            setLanguages(languagesData.results || languagesData || []);
            setServiceTypes(serviceTypesData.results || serviceTypesData || []);
            setCities(citiesData.results || citiesData || []);
            setCountries(countriesData.results || countriesData || []);

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
            setBookings(data.results || data || []);
        } catch (err) {
            console.error('Error loading bookings:', err);
        }
    };

    const loadReviews = async () => {
        try {
            const data = await getMyReviews();
            setReviews(data.results || data || []);
        } catch (err) {
            console.error('Error loading reviews:', err);
        }
    };

    // FIXED: Guides loading with correct parameters
    const loadGuides = async () => {
        try {
            const params = {};

            // FIXED: To'g'ri parameter nomlari
            if (guidesFilter.search?.trim()) {
                params.search = guidesFilter.search.trim();
            }
            if (guidesFilter.service_types) {
                params.service_types = guidesFilter.service_types;
            }
            if (guidesFilter.country) {
                params.country = guidesFilter.country;
            }
            if (guidesFilter.city?.trim()) {
                params.city = guidesFilter.city.trim();
            }
            if (guidesFilter.average_rating__gte) {
                params.average_rating__gte = guidesFilter.average_rating__gte;
            }
            if (guidesFilter.is_available !== undefined) {
                params.is_available = guidesFilter.is_available;
            }

            console.log('Loading guides with params:', params); // Debug log

            const data = await getCustomerProfiles(params);
            console.log('Guides data received:', data); // Debug log

            setGuides(data.results || data || []);

            // FIXED: Error handling uchun message
            if (!data.results && !Array.isArray(data)) {
                console.warn('No guides data or unexpected format:', data);
                setGuides([]);
            }

        } catch (err) {
            console.error('Error loading guides:', err);
            setError('Failed to load guides. Please try again.');
            setGuides([]);
        }
    };

    const handleLogout = async () => {
        try {
            await logoutUser();
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            setIsAuthenticated(false);
            setUser(null);
        } catch (err) {
            console.error('Logout error:', err);
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
            console.error('Profile submit error:', err);
            setError(err.message || 'Failed to save profile');
        }
    };

    const handleBookingSubmit = async (e) => {
        e.preventDefault();

        if (!bookingForm.title.trim()) {
            setError('Title is required');
            return;
        }

        if (!bookingForm.start_date || !bookingForm.end_date) {
            setError('Dates are required');
            return;
        }

        if (!bookingForm.country.trim()) {
            setError('Country is required');
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
                country: bookingForm.country.trim(),
                city: bookingForm.city?.trim() || null,
                location: bookingForm.location.trim(),
                special_requirements: bookingForm.special_requirements.trim(),
                proposed_rate: bookingForm.proposed_rate ? parseFloat(bookingForm.proposed_rate) : null,
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
                country: '',
                city: '',
                location: '',
                proposed_rate: '',
                special_requirements: '',
                customer_profile: ''
            });
            setError(null);
        } catch (err) {
            console.error('Booking creation error:', err);
            setError(err.message || 'Failed to create booking');
        }
    };

    const handleReviewSubmit = async (e) => {
        e.preventDefault();

        if (!reviewForm.comment.trim()) {
            setError('Please provide a comment');
            return;
        }

        try {
            const reviewData = {
                rating: reviewForm.rating,
                comment: reviewForm.comment.trim()
            };

            if (editingReview) {
                await updateReview(editingReview.id, reviewData);
            } else {
                await createReview(selectedBookingForReview.id, reviewData);
            }

            loadReviews();
            loadBookings();
            setShowReviewForm(false);
            setSelectedBookingForReview(null);
            setEditingReview(null);
            setReviewForm({
                rating: 5,
                comment: ''
            });
            setError(null);

        } catch (err) {
            console.error('Review error:', err);
            setError(err.message || 'Failed to save review');
        }
    };

    const handleDeleteReview = async (reviewId) => {
        if (!window.confirm('Are you sure you want to delete this review?')) {
            return;
        }

        try {
            await deleteReview(reviewId);
            loadReviews();
            loadBookings();
            setError(null);
        } catch (err) {
            console.error('Delete review error:', err);
            setError(err.message || 'Failed to delete review');
        }
    };

    const handleCancelBooking = async (bookingId) => {
        if (!window.confirm('Are you sure you want to cancel this booking?')) {
            return;
        }

        try {
            await cancelBooking(bookingId, { confirm: true, reason: 'Client cancelled the booking' });
            loadBookings();
        } catch (err) {
            setError(err.message);
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
            country: guide.country_display?.name || '',
            city: guide.city_name || '',
            location: '',
            proposed_rate: guide.daily_rate || guide.hourly_rate || '',
            special_requirements: '',
            customer_profile: guide.id
        });

        setShowBookingForm(true);
    };

    const handleWriteReview = async (booking) => {
        try {
            const canReview = await canReviewBooking(booking.id);
            if (!canReview.can_review) {
                setError(canReview.reason || 'Cannot review this booking');
                return;
            }
        } catch (err) {
            console.error('Error checking review eligibility:', err);
        }

        setSelectedBookingForReview(booking);
        setEditingReview(null);
        setReviewForm({
            rating: 5,
            comment: ''
        });
        setShowReviewForm(true);
    };

    const handleEditReview = (review) => {
        setEditingReview(review);
        setSelectedBookingForReview(null);
        setReviewForm({
            rating: review.rating || 5,
            comment: review.comment || ''
        });
        setShowReviewForm(true);
    };

    const handleChatWithUser = (guide) => {
        setSelectedUserForChat(guide.user?.email);
        setShowChat(true);
    };

    const handleCloseChat = () => {
        setShowChat(false);
        setSelectedUserForChat(null);
    };

    // FIXED: Filter change handler with correct parameter names
    const handleFilterChange = (key, value) => {
        setGuidesFilter(prev => ({ ...prev, [key]: value }));
    };

    // FIXED: useEffect for loading guides when filters change
    useEffect(() => {
        if (activeTab === 'guides') {
            const delayedSearch = setTimeout(() => {
                loadGuides();
            }, 500); // 500ms delay for search input

            return () => clearTimeout(delayedSearch);
        }
    }, [guidesFilter, activeTab]);

    const canReviewBookingCheck = (booking) => {
        return booking.status === 'completed' && !reviews.find(r => r.booking === booking.id);
    };

    const getReviewForBooking = (booking) => {
        return reviews.find(r => r.booking === booking.id);
    };

    const canEditReview = (review) => {
        if (!review.created_at) return false;
        const reviewDate = new Date(review.created_at);
        const today = new Date();
        const daysDiff = Math.floor((today - reviewDate) / (1000 * 60 * 60 * 24));
        return daysDiff <= 7;
    };

    if (loading) {
        return (
            <div className="client-dashboard-loading">
                <div className="client-dashboard-spinner"></div>
                <p>Loading dashboard...</p>
            </div>
        );
    }

    return (
        <div className="client-dashboard-container">
            <div className="client-dashboard-header">
                <div className="client-dashboard-header-content">
                    <h1 className="client-dashboard-title">Client Dashboard</h1>
                    {user && (
                        <div className="client-dashboard-user-info">
                            <span className="client-dashboard-welcome">Welcome, {user.full_name}</span>
                            <button
                                className="client-dashboard-chat-btn"
                                onClick={() => setShowChat(true)}
                            >
                                Messages
                            </button>
                            <button
                                className="client-dashboard-logout-btn"
                                onClick={handleLogout}
                            >
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {error && (
                <div className="client-dashboard-error">
                    <p>{error}</p>
                    <button onClick={() => setError(null)} className="client-dashboard-error-close">×</button>
                </div>
            )}

            <div className="client-dashboard-navigation">
                <button
                    className={`client-dashboard-nav-btn ${activeTab === 'dashboard' ? 'client-dashboard-nav-active' : ''}`}
                    onClick={() => setActiveTab('dashboard')}
                >
                    Dashboard
                </button>
                <button
                    className={`client-dashboard-nav-btn ${activeTab === 'profile' ? 'client-dashboard-nav-active' : ''}`}
                    onClick={() => setActiveTab('profile')}
                >
                    Profile
                </button>
                <button
                    className={`client-dashboard-nav-btn ${activeTab === 'guides' ? 'client-dashboard-nav-active' : ''}`}
                    onClick={() => setActiveTab('guides')}
                >
                    Find Guides
                </button>
                <button
                    className={`client-dashboard-nav-btn ${activeTab === 'bookings' ? 'client-dashboard-nav-active' : ''}`}
                    onClick={() => setActiveTab('bookings')}
                >
                    My Bookings
                </button>
                <button
                    className={`client-dashboard-nav-btn ${activeTab === 'reviews' ? 'client-dashboard-nav-active' : ''}`}
                    onClick={() => setActiveTab('reviews')}
                >
                    My Reviews
                </button>
            </div>

            <div className="client-dashboard-content">
                {activeTab === 'dashboard' && (
                    <div className="client-dashboard-overview">
                        <div className="client-dashboard-stats">
                            <div className="client-dashboard-stat-card">
                                <h3 className="client-dashboard-stat-title">Total Bookings</h3>
                                <p className="client-dashboard-stat-value">{bookings.length}</p>
                            </div>
                            <div className="client-dashboard-stat-card">
                                <h3 className="client-dashboard-stat-title">Active Bookings</h3>
                                <p className="client-dashboard-stat-value">
                                    {bookings.filter(b => ['pending', 'accepted'].includes(b.status)).length}
                                </p>
                            </div>
                            <div className="client-dashboard-stat-card">
                                <h3 className="client-dashboard-stat-title">Completed Trips</h3>
                                <p className="client-dashboard-stat-value">
                                    {bookings.filter(b => b.status === 'completed').length}
                                </p>
                            </div>
                            <div className="client-dashboard-stat-card">
                                <h3 className="client-dashboard-stat-title">Reviews Written</h3>
                                <p className="client-dashboard-stat-value">{reviews.length}</p>
                            </div>
                        </div>

                        <div className="client-dashboard-recent">
                            <h3 className="client-dashboard-section-title">Recent Activity</h3>
                            <div className="client-dashboard-recent-bookings">
                                {bookings.slice(0, 5).map(booking => (
                                    <div key={booking.id} className="client-dashboard-booking-card">
                                        <div className="client-dashboard-booking-info">
                                            <h4 className="client-dashboard-booking-title">{booking.title}</h4>
                                            <p className="client-dashboard-booking-date">
                                                {new Date(booking.start_date).toLocaleDateString()} - {new Date(booking.end_date).toLocaleDateString()}
                                            </p>
                                            <span className={`client-dashboard-booking-status client-dashboard-status-${booking.status}`}>
                                                {booking.status}
                                            </span>
                                        </div>
                                        <div className="client-dashboard-booking-actions">
                                            {booking.status === 'pending' && (
                                                <button
                                                    className="client-dashboard-btn client-dashboard-btn-cancel"
                                                    onClick={() => handleCancelBooking(booking.id)}
                                                >
                                                    Cancel
                                                </button>
                                            )}
                                            {booking.status === 'completed' && canReviewBookingCheck(booking) && (
                                                <button
                                                    className="client-dashboard-btn client-dashboard-btn-primary"
                                                    onClick={() => handleWriteReview(booking)}
                                                >
                                                    Write Review
                                                </button>
                                            )}
                                            {booking.customer_details && (
                                                <button
                                                    className="client-dashboard-btn client-dashboard-btn-secondary"
                                                    onClick={() => handleChatWithUser({ user: { email: booking.customer_details.email } })}
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
                    <div className="client-dashboard-profile">
                        {!profile || showProfileForm ? (
                            <div className="client-dashboard-profile-form">
                                <h3 className="client-dashboard-section-title">
                                    {profile ? 'Edit Profile' : 'Create Profile'}
                                </h3>
                                <form onSubmit={handleProfileSubmit} className="client-dashboard-form">
                                    <div className="client-dashboard-form-group">
                                        <label className="client-dashboard-label">Date of Birth</label>
                                        <input
                                            type="date"
                                            className="client-dashboard-input"
                                            value={profileForm.date_of_birth}
                                            onChange={(e) => setProfileForm({...profileForm, date_of_birth: e.target.value})}
                                        />
                                    </div>

                                    <div className="client-dashboard-form-group">
                                        <label className="client-dashboard-label">Preferred Contact Method</label>
                                        <select
                                            className="client-dashboard-select"
                                            value={profileForm.preferred_contact}
                                            onChange={(e) => setProfileForm({...profileForm, preferred_contact: e.target.value})}
                                        >
                                            <option value="email">Email</option>
                                            <option value="phone">Phone</option>
                                            <option value="chat">Chat</option>
                                        </select>
                                    </div>

                                    <div className="client-dashboard-form-group">
                                        <label className="client-dashboard-label">Languages</label>
                                        <div className="client-dashboard-checkbox-group">
                                            {languages.map(language => (
                                                <label key={language.id} className="client-dashboard-checkbox-label">
                                                    <input
                                                        type="checkbox"
                                                        className="client-dashboard-checkbox"
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

                                    <div className="client-dashboard-form-actions">
                                        <button type="submit" className="client-dashboard-btn client-dashboard-btn-primary">
                                            {profile ? 'Update Profile' : 'Create Profile'}
                                        </button>
                                        {profile && (
                                            <button
                                                type="button"
                                                className="client-dashboard-btn client-dashboard-btn-secondary"
                                                onClick={() => setShowProfileForm(false)}
                                            >
                                                Cancel
                                            </button>
                                        )}
                                    </div>
                                </form>
                            </div>
                        ) : (
                            <div className="client-dashboard-profile-view">
                                <div className="client-dashboard-profile-header">
                                    <h3 className="client-dashboard-section-title">Profile Information</h3>
                                    <button
                                        className="client-dashboard-btn client-dashboard-btn-primary"
                                        onClick={() => setShowProfileForm(true)}
                                    >
                                        Edit Profile
                                    </button>
                                </div>
                                <div className="client-dashboard-profile-info">
                                    <div className="client-dashboard-profile-field">
                                        <label className="client-dashboard-profile-label">Date of Birth:</label>
                                        <p className="client-dashboard-profile-value">
                                            {profile.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString() : 'Not set'}
                                        </p>
                                    </div>
                                    <div className="client-dashboard-profile-field">
                                        <label className="client-dashboard-profile-label">Preferred Contact:</label>
                                        <p className="client-dashboard-profile-value">{profile.preferred_contact}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'guides' && (
                    <div className="client-dashboard-guides">
                        <div className="client-dashboard-guides-header">
                            <h3 className="client-dashboard-section-title">Find Guides</h3>
                            <div className="client-dashboard-guides-filters">
                                <input
                                    type="text"
                                    className="client-dashboard-filter-input"
                                    placeholder="Search guides..."
                                    value={guidesFilter.search}
                                    onChange={(e) => handleFilterChange('search', e.target.value)}
                                />
                                <select
                                    className="client-dashboard-filter-select"
                                    value={guidesFilter.service_types}
                                    onChange={(e) => handleFilterChange('service_types', e.target.value)}
                                >
                                    <option value="">All Services</option>
                                    {serviceTypes.map(service => (
                                        <option key={service.id} value={service.id}>{service.name}</option>
                                    ))}
                                </select>
                                <select
                                    className="client-dashboard-filter-select"
                                    value={guidesFilter.country}
                                    onChange={(e) => handleFilterChange('country', e.target.value)}
                                >
                                    <option value="">All Countries</option>
                                    {countries.map(country => (
                                        <option key={country.id} value={country.name}>{country.name}</option>
                                    ))}
                                </select>
                                <input
                                    type="text"
                                    className="client-dashboard-filter-input"
                                    placeholder="City..."
                                    value={guidesFilter.city}
                                    onChange={(e) => handleFilterChange('city', e.target.value)}
                                />
                                <select
                                    className="client-dashboard-filter-select"
                                    value={guidesFilter.average_rating__gte}
                                    onChange={(e) => handleFilterChange('average_rating__gte', e.target.value)}
                                >
                                    <option value="">Any Rating</option>
                                    <option value="4">4+ Stars</option>
                                    <option value="4.5">4.5+ Stars</option>
                                    <option value="5">5 Stars</option>
                                </select>
                                <label className="client-dashboard-filter-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={guidesFilter.is_available}
                                        onChange={(e) => handleFilterChange('is_available', e.target.checked)}
                                    />
                                    Available only
                                </label>
                            </div>
                        </div>

                        <div className="client-dashboard-guides-grid">
                            {guides.length > 0 ? guides.map(guide => (
                                <div key={guide.id} className="client-dashboard-guide-card">
                                    <div className="client-dashboard-guide-avatar">
                                        {guide.user?.avatar ? (
                                            <img src={guide.user.avatar} alt={guide.user.full_name} />
                                        ) : (
                                            <div className="client-dashboard-guide-avatar-placeholder">
                                                {guide.user?.full_name?.charAt(0) || 'G'}
                                            </div>
                                        )}
                                    </div>
                                    <div className="client-dashboard-guide-info">
                                        <h4 className="client-dashboard-guide-name">{guide.user?.full_name}</h4>
                                        <p className="client-dashboard-guide-bio">{guide.professional_bio}</p>
                                        <div className="client-dashboard-guide-details">
                                            <span className="client-dashboard-guide-experience">
                                                {guide.years_of_experience} years experience
                                            </span>
                                            <div className="client-dashboard-guide-rating">
                                                {'★'.repeat(Math.floor(guide.average_rating || 0))}
                                                {'☆'.repeat(5 - Math.floor(guide.average_rating || 0))}
                                                <span className="client-dashboard-guide-rating-text">
                                                    {guide.average_rating || 0}/5 ({guide.total_reviews || 0} reviews)
                                                </span>
                                            </div>
                                            <div className="client-dashboard-guide-pricing">
                                                {guide.hourly_rate && (
                                                    <span className="client-dashboard-guide-price">
                                                        ${guide.hourly_rate}/hour
                                                    </span>
                                                )}
                                                {guide.daily_rate && (
                                                    <span className="client-dashboard-guide-price">
                                                        ${guide.daily_rate}/day
                                                    </span>
                                                )}
                                            </div>
                                            <div className="client-dashboard-guide-location">
                                                {guide.city_name && guide.country_display?.name && (
                                                    <span className="client-dashboard-guide-location-text">
                                                        {guide.city_name}, {guide.country_display.name}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="client-dashboard-guide-actions">
                                            <button
                                                className="client-dashboard-btn client-dashboard-btn-primary"
                                                onClick={() => handleBookGuide(guide)}
                                                disabled={!guide.is_available}
                                            >
                                                {guide.is_available ? 'Book Now' : 'Unavailable'}
                                            </button>
                                            <button
                                                className="client-dashboard-btn client-dashboard-btn-secondary"
                                                onClick={() => handleChatWithUser(guide)}
                                            >
                                                Chat
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="client-dashboard-empty-state">
                                    <p>No guides found. This could be due to:</p>
                                    <ul>
                                        <li>No guides available in the system</li>
                                        <li>All guides are currently unavailable</li>
                                        <li>Your search filters are too restrictive</li>
                                    </ul>
                                    <button
                                        className="client-dashboard-btn client-dashboard-btn-primary"
                                        onClick={() => {
                                            setGuidesFilter({
                                                search: '',
                                                service_types: '',
                                                country: '',
                                                city: '',
                                                average_rating__gte: '',
                                                is_available: true
                                            });
                                        }}
                                    >
                                        Clear All Filters
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'bookings' && (
                    <div className="client-dashboard-bookings">
                        <h3 className="client-dashboard-section-title">My Bookings</h3>
                        <div className="client-dashboard-bookings-list">
                            {bookings.map(booking => {
                                const existingReview = getReviewForBooking(booking);
                                return (
                                    <div key={booking.id} className="client-dashboard-booking-item">
                                        <div className="client-dashboard-booking-details">
                                            <h4 className="client-dashboard-booking-title">{booking.title}</h4>
                                            <p className="client-dashboard-booking-dates">
                                                {new Date(booking.start_date).toLocaleDateString()} - {new Date(booking.end_date).toLocaleDateString()}
                                            </p>
                                            <p className="client-dashboard-booking-description">{booking.description}</p>
                                            {booking.location && (
                                                <p className="client-dashboard-booking-location">📍 {booking.location}</p>
                                            )}
                                            {booking.proposed_rate && (
                                                <p className="client-dashboard-booking-rate">💰 ${booking.proposed_rate}</p>
                                            )}
                                            <span className={`client-dashboard-booking-status client-dashboard-status-${booking.status}`}>
                                                {booking.status}
                                            </span>
                                            {existingReview && (
                                                <div className="client-dashboard-booking-review-info">
                                                    <span className="client-dashboard-review-badge">
                                                        Review: {'★'.repeat(existingReview.rating)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="client-dashboard-booking-actions">
                                            {booking.status === 'pending' && (
                                                <button
                                                    className="client-dashboard-btn client-dashboard-btn-cancel"
                                                    onClick={() => handleCancelBooking(booking.id)}
                                                >
                                                    Cancel
                                                </button>
                                            )}
                                            {booking.status === 'completed' && canReviewBookingCheck(booking) && (
                                                <button
                                                    className="client-dashboard-btn client-dashboard-btn-primary"
                                                    onClick={() => handleWriteReview(booking)}
                                                >
                                                    Write Review
                                                </button>
                                            )}
                                            {booking.customer_details && (
                                                <button
                                                    className="client-dashboard-btn client-dashboard-btn-secondary"
                                                    onClick={() => handleChatWithUser({ user: { email: booking.customer_details.email } })}
                                                >
                                                    Chat
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {bookings.length === 0 && (
                            <div className="client-dashboard-empty-state">
                                <p>You haven't made any bookings yet.</p>
                                <button
                                    className="client-dashboard-btn client-dashboard-btn-primary"
                                    onClick={() => setActiveTab('guides')}
                                >
                                    Find Guides
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'reviews' && (
                    <div className="client-dashboard-reviews">
                        <div className="client-dashboard-reviews-header">
                            <h3 className="client-dashboard-section-title">My Reviews</h3>
                            <p className="client-dashboard-reviews-subtitle">
                                {reviews.length} review{reviews.length !== 1 ? 's' : ''} written
                            </p>
                        </div>
                        <div className="client-dashboard-reviews-list">
                            {reviews.length > 0 ? (
                                reviews.map(review => (
                                    <div key={review.id} className="client-dashboard-review-item">
                                        <div className="client-dashboard-review-header">
                                            <div className="client-dashboard-review-rating">
                                                {'★'.repeat(review.rating || 0)}{'☆'.repeat(5 - (review.rating || 0))}
                                                <span className="client-dashboard-review-rating-number">
                                                    {review.rating}/5
                                                </span>
                                            </div>
                                            <div className="client-dashboard-review-meta">
                                                <span className="client-dashboard-review-date">
                                                    {new Date(review.created_at).toLocaleDateString()}
                                                </span>
                                                {review.customer_name && (
                                                    <span className="client-dashboard-review-guide">
                                                        Guide: {review.customer_name}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="client-dashboard-review-content">
                                            <p className="client-dashboard-review-comment">{review.comment}</p>
                                            {review.booking_title && (
                                                <p className="client-dashboard-review-booking">
                                                    <strong>Booking:</strong> {review.booking_title}
                                                </p>
                                            )}
                                        </div>
                                        <div className="client-dashboard-review-actions">
                                            {canEditReview(review) && (
                                                <button
                                                    className="client-dashboard-btn client-dashboard-btn-small"
                                                    onClick={() => handleEditReview(review)}
                                                >
                                                    Edit
                                                </button>
                                            )}
                                            <button
                                                className="client-dashboard-btn client-dashboard-btn-small client-dashboard-btn-danger"
                                                onClick={() => handleDeleteReview(review.id)}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                        {!canEditReview(review) && (
                                            <small className="client-dashboard-review-edit-note">
                                                Reviews can only be edited within 7 days of creation
                                            </small>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="client-dashboard-empty-state">
                                    <p>You haven't written any reviews yet.</p>
                                    <p>Complete a booking and share your experience!</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Booking Form Modal */}
            {showBookingForm && (
                <div className="client-dashboard-modal">
                    <div className="client-dashboard-modal-content">
                        <div className="client-dashboard-modal-header">
                            <h3 className="client-dashboard-modal-title">
                                Book Guide: {selectedGuide?.user?.full_name}
                            </h3>
                            <button
                                className="client-dashboard-modal-close"
                                onClick={() => {
                                    setShowBookingForm(false);
                                    setSelectedGuide(null);
                                    setError(null);
                                }}
                            >
                                ×
                            </button>
                        </div>
                        <form onSubmit={handleBookingSubmit} className="client-dashboard-form">
                            <div className="client-dashboard-form-group">
                                <label className="client-dashboard-label">Title *</label>
                                <input
                                    type="text"
                                    className="client-dashboard-input"
                                    value={bookingForm.title}
                                    onChange={(e) => setBookingForm({...bookingForm, title: e.target.value})}
                                    required
                                    placeholder="Enter booking title"
                                />
                            </div>

                            <div className="client-dashboard-form-group">
                                <label className="client-dashboard-label">Description</label>
                                <textarea
                                    className="client-dashboard-textarea"
                                    value={bookingForm.description}
                                    onChange={(e) => setBookingForm({...bookingForm, description: e.target.value})}
                                    rows="3"
                                    placeholder="Describe what kind of tour/service you need"
                                />
                            </div>

                            <div className="client-dashboard-form-row">
                                <div className="client-dashboard-form-group">
                                    <label className="client-dashboard-label">Start Date *</label>
                                    <input
                                        type="date"
                                        className="client-dashboard-input"
                                        value={bookingForm.start_date}
                                        onChange={(e) => setBookingForm({...bookingForm, start_date: e.target.value})}
                                        required
                                        min={new Date().toISOString().split('T')[0]}
                                    />
                                </div>
                                <div className="client-dashboard-form-group">
                                    <label className="client-dashboard-label">End Date *</label>
                                    <input
                                        type="date"
                                        className="client-dashboard-input"
                                        value={bookingForm.end_date}
                                        onChange={(e) => setBookingForm({...bookingForm, end_date: e.target.value})}
                                        required
                                        min={bookingForm.start_date || new Date().toISOString().split('T')[0]}
                                    />
                                </div>
                            </div>

                            <div className="client-dashboard-form-row">
                                <div className="client-dashboard-form-group">
                                    <label className="client-dashboard-label">Country *</label>
                                    <input
                                        type="text"
                                        className="client-dashboard-input"
                                        value={bookingForm.country}
                                        onChange={(e) => setBookingForm({...bookingForm, country: e.target.value})}
                                        required
                                        placeholder="Enter country"
                                    />
                                </div>
                                <div className="client-dashboard-form-group">
                                    <label className="client-dashboard-label">City</label>
                                    <input
                                        type="text"
                                        className="client-dashboard-input"
                                        value={bookingForm.city}
                                        onChange={(e) => setBookingForm({...bookingForm, city: e.target.value})}
                                        placeholder="Enter city"
                                    />
                                </div>
                            </div>

                            <div className="client-dashboard-form-group">
                                <label className="client-dashboard-label">Specific Location</label>
                                <input
                                    type="text"
                                    className="client-dashboard-input"
                                    value={bookingForm.location}
                                    onChange={(e) => setBookingForm({...bookingForm, location: e.target.value})}
                                    placeholder="Specific meeting point or location"
                                />
                            </div>

                            <div className="client-dashboard-form-group">
                                <label className="client-dashboard-label">Special Requirements</label>
                                <textarea
                                    className="client-dashboard-textarea"
                                    value={bookingForm.special_requirements}
                                    onChange={(e) => setBookingForm({...bookingForm, special_requirements: e.target.value})}
                                    rows="2"
                                    placeholder="Any special requests or requirements"
                                />
                            </div>

                            <div className="client-dashboard-form-group">
                                <label className="client-dashboard-label">Proposed Rate (USD)</label>
                                <input
                                    type="number"
                                    className="client-dashboard-input"
                                    value={bookingForm.proposed_rate}
                                    onChange={(e) => setBookingForm({...bookingForm, proposed_rate: e.target.value})}
                                    placeholder="0"
                                    step="0.01"
                                    min="0"
                                />
                                {selectedGuide?.daily_rate && (
                                    <small className="client-dashboard-guide-rate-info">
                                        Guide's daily rate: ${selectedGuide.daily_rate}
                                    </small>
                                )}
                                {selectedGuide?.hourly_rate && (
                                    <small className="client-dashboard-guide-rate-info">
                                        Guide's hourly rate: ${selectedGuide.hourly_rate}
                                    </small>
                                )}
                            </div>

                            <div className="client-dashboard-form-actions">
                                <button
                                    type="submit"
                                    className="client-dashboard-btn client-dashboard-btn-primary"
                                    disabled={!bookingForm.title.trim() || !bookingForm.start_date || !bookingForm.end_date || !bookingForm.country.trim()}
                                >
                                    Book Guide
                                </button>
                                <button
                                    type="button"
                                    className="client-dashboard-btn client-dashboard-btn-secondary"
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
                <div className="client-dashboard-modal">
                    <div className="client-dashboard-modal-content">
                        <div className="client-dashboard-modal-header">
                            <h3 className="client-dashboard-modal-title">
                                {editingReview ? 'Edit Review' : 'Write Review'}
                            </h3>
                            <button
                                className="client-dashboard-modal-close"
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

                        {selectedBookingForReview && (
                            <div className="client-dashboard-review-booking-info">
                                <h4>Booking: {selectedBookingForReview.title}</h4>
                                <p>Guide: {selectedBookingForReview.customer_details?.full_name}</p>
                            </div>
                        )}

                        <form onSubmit={handleReviewSubmit} className="client-dashboard-form">
                            <div className="client-dashboard-form-group">
                                <label className="client-dashboard-label">Rating *</label>
                                <div className="client-dashboard-rating-input">
                                    {[1, 2, 3, 4, 5].map(rating => (
                                        <button
                                            key={rating}
                                            type="button"
                                            className={`client-dashboard-star-btn ${reviewForm.rating >= rating ? 'active' : ''}`}
                                            onClick={() => setReviewForm({...reviewForm, rating})}
                                        >
                                            ★
                                        </button>
                                    ))}
                                    <span className="client-dashboard-rating-text">
                                        {reviewForm.rating}/5
                                    </span>
                                </div>
                            </div>

                            <div className="client-dashboard-form-group">
                                <label className="client-dashboard-label">Comment *</label>
                                <textarea
                                    className="client-dashboard-textarea"
                                    value={reviewForm.comment}
                                    onChange={(e) => setReviewForm({...reviewForm, comment: e.target.value})}
                                    rows="4"
                                    required
                                    placeholder="Share your experience with this guide..."
                                />
                            </div>

                            <div className="client-dashboard-form-actions">
                                <button
                                    type="submit"
                                    className="client-dashboard-btn client-dashboard-btn-primary"
                                    disabled={!reviewForm.comment.trim()}
                                >
                                    {editingReview ? 'Update Review' : 'Submit Review'}
                                </button>
                                <button
                                    type="button"
                                    className="client-dashboard-btn client-dashboard-btn-secondary"
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

            {/* Chat Widget */}
            {showChat && (
                <ChatWidget
                    isOpen={showChat}
                    onClose={handleCloseChat}
                    selectedUserId={selectedUserForChat}
                    userRole="client"
                />
            )}
        </div>
    );
};

export default ClientDashboard;