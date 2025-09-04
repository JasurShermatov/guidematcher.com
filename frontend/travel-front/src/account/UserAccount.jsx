import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import ChatWidgets from './ChatWidgets';
import './UserAccount.css';

// API Configuration
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000/api/v1/";
const WS_URL = process.env.REACT_APP_WS_URL || "ws://localhost:8000/ws/chat/";

const api = axios.create({
    baseURL: API_URL,
    headers: { "Content-Type": "application/json" },
    withCredentials: false,
});

// Token Interceptor
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`, {
        headers: config.headers,
        data: config.data,
    });
    return config;
});

// Token Refresh Interceptor
api.interceptors.response.use(
    (response) => {
        console.log(`API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
            status: response.status,
            data: response.data,
        });
        return response;
    },
    async (error) => {
        console.error(`API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message,
        });
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                const refreshToken = localStorage.getItem("refresh_token");
                if (!refreshToken) {
                    throw new Error("No refresh token available");
                }
                const refreshResponse = await api.post("token/refresh/", {
                    refresh: refreshToken,
                });
                const newAccessToken = refreshResponse.data.access_token || refreshResponse.data.access;
                localStorage.setItem("access_token", newAccessToken);
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                console.error("Token refresh failed:", refreshError);
                localStorage.removeItem("access_token");
                localStorage.removeItem("refresh_token");
                window.location.href = "/login";
                return Promise.reject(refreshError);
            }
        }
        let errorMessage = "Unknown error occurred";
        if (error.response?.data) {
            const data = error.response.data;
            errorMessage =
                data.detail ||
                data.message ||
                data.error ||
                (data.email && data.email[0]) ||
                (data.code && data.code[0]) ||
                (data.non_field_errors && data.non_field_errors[0]) ||
                JSON.stringify(data);
        } else if (error.message) {
            errorMessage = error.message;
        }
        return Promise.reject(new Error(errorMessage));
    }
);

// API Functions
const getClientProfile = () => {
    console.log("Getting client profile...");
    return api.get("profiles/clients/my/").then((r) => r.data);
};

const createClientProfile = (payload) => {
    console.log("Creating client profile:", payload);
    return api.post("profiles/clients/", payload).then((r) => r.data);
};

const updateClientProfile = (payload) => {
    console.log("Updating client profile:", payload);
    return api.patch("profiles/clients/my/", payload).then((r) => r.data);
};

const getMyBookings = (status = null) => {
    const params = status ? { status } : {};
    console.log("Getting my bookings...", params);
    return api.get("bookings/bookings/", { params }).then((r) => r.data);
};

const createBooking = (payload) => {
    console.log("Creating booking:", payload);
    return api.post("bookings/bookings/", payload).then((r) => r.data);
};

const cancelBooking = (id, reason = "") => {
    console.log("Canceling booking:", id, reason);
    return api.patch(`bookings/bookings/${id}/`, {
        status: "cancelled",
        cancellation_reason: reason
    }).then((r) => r.data);
};

const getCustomerProfiles = (params = {}) => {
    console.log("Getting customer profiles...", params);
    return api.get("profiles/customers/", { params }).then((r) => r.data);
};

const getMyReviews = () => {
    console.log("Getting my reviews...");
    return api.get("reviews/my/").then((r) => r.data);
};

const createReview = (payload) => {
    console.log("Creating review:", payload);
    return api.post("reviews/reviews/", payload).then((r) => r.data);
};

const updateReview = (id, payload) => {
    console.log("Updating review:", id);
    return api.patch(`reviews/reviews/${id}/`, payload).then((r) => r.data);
};

const deleteReview = (id) => {
    console.log("Deleting review:", id);
    return api.delete(`reviews/reviews/${id}/`).then((r) => r.data);
};

const getLanguages = () => {
    console.log("Getting languages...");
    return api.get("common/languages/").then((r) => r.data);
};

const getCurrentUser = () => {
    console.log("Getting current user info...");
    return api.get("auth/users/short/").then((r) => r.data);
};

const getServiceTypes = () => {
    console.log("Getting service types...");
    return api.get("common/service-types/").then((r) => r.data);
};

const reactToReview = (id, reactionType, comment = "") => {
    console.log("Reacting to review:", id, reactionType);
    return api.post(`reviews/reviews/${id}/react/`, {
        reaction_type: reactionType,
        comment: comment
    }).then((r) => r.data);
};

const removeReactionFromReview = (id) => {
    console.log("Removing reaction from review:", id);
    return api.delete(`reviews/reviews/${id}/react/`).then((r) => r.data);
};

const getReviewReactions = (id, type = null) => {
    const params = type ? { type } : {};
    return api.get(`reviews/reviews/${id}/reactions/`, { params }).then((r) => r.data);
};

const getReviewSummary = (id) => {
    return api.get(`reviews/reviews/${id}/reactions/summary/`).then((r) => r.data);
};

const getCities = (countryId = null) => {
    const params = countryId ? { country: countryId } : {};
    console.log("Getting cities...", params);
    return api.get("common/cities/", { params }).then((r) => r.data);
};

const getCountries = () => {
    console.log("Getting countries...");
    return api.get("common/countries/").then((r) => r.data);
};

const updateClientAvatar = (payload) => {
    console.log("Updating client avatar:", payload);
    return api.patch("profiles/clients/my/", payload).then((r) => r.data);
};

// WebSocket Helpers
let wsConnections = {};

const connectWebSocket = (conversationId, onMessage, onOpen, onClose, onError) => {
    if (wsConnections[conversationId]) {
        console.log(`WebSocket already connected for conversation ${conversationId}`);
        return wsConnections[conversationId];
    }

    const token = localStorage.getItem("access_token");
    if (!token) {
        throw new Error("No access token for WebSocket");
    }

    const ws = new WebSocket(`${WS_URL}${conversationId}/?token=${token}`);

    ws.onopen = () => {
        console.log(`WebSocket connected for conversation ${conversationId}`);
        if (onOpen) onOpen();
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log(`WebSocket message received:`, data);
        if (onMessage) onMessage(data);
    };

    ws.onclose = (event) => {
        console.log(`WebSocket closed for conversation ${conversationId}:`, event);
        delete wsConnections[conversationId];
        if (onClose) onClose(event);
        setTimeout(() => connectWebSocket(conversationId, onMessage, onOpen, onClose, onError), 3000);
    };

    ws.onerror = (error) => {
        console.error(`WebSocket error for conversation ${conversationId}:`, error);
        if (onError) onError(error);
    };

    wsConnections[conversationId] = ws;
    return ws;
};

const sendWebSocketMessage = (conversationId, payload) => {
    const ws = wsConnections[conversationId];
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.error(`WebSocket not open for conversation ${conversationId}`);
        return;
    }
    ws.send(JSON.stringify(payload));
};

const closeWebSocket = (conversationId) => {
    const ws = wsConnections[conversationId];
    if (ws) {
        ws.close();
        delete wsConnections[conversationId];
    }
};

// React Component
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
        languages: [],
        avatar: null,
        avatarPreview: null
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
                console.log("Profile Data:", profileData); // Debug uchun
                setProfile(profileData);
                setProfileForm({
                    date_of_birth: profileData.date_of_birth || '',
                    preferred_contact: profileData.preferred_contact || 'email',
                    languages: profileData.languages || [],
                    avatar: null
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
            setError(t('user_account.errors.fill_required_fields'));
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
            setError(t('user_account.errors.failed_load_reactions'));
        }
    };

    const loadReviewSummary = async (reviewId) => {
        try {
            const data = await getReviewSummary(reviewId);
            setReactionSummary(data);
        } catch (err) {
            console.error('Error loading review summary:', err);
            setError(t('user_account.errors.failed_load_review_summary'));
        }
    };
    // Avatar oldindan ko'rish funksiyasi
    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfileForm({
                    ...profileForm,
                    avatar: file,
                    avatarPreview: reader.result
                });
            };
            reader.readAsDataURL(file);
        } else {
            setProfileForm({
                ...profileForm,
                avatar: null,
                avatarPreview: null
            });
        }
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            formData.append('date_of_birth', profileForm.date_of_birth || '');
            formData.append('preferred_contact', profileForm.preferred_contact || 'email');
            profileForm.languages.forEach(lang => {
                if (lang) formData.append('languages', lang);
            });

            let result;
            if (profile) {
                result = await updateClientProfile(formData);
            } else {
                result = await createClientProfile(formData);
            }
            setProfile(result);
            setProfileForm({
                ...profileForm,
                avatar: null,
                avatarPreview: null
            });
            setShowProfileForm(false);
            setError(null);
        } catch (err) {
            console.error('Profile submit error:', err);
            setError(t('user_account.errors.fill_required_fields') + ': ' + err.message);
        }
    };

    const handleAvatarSubmit = async (e) => {
        e.preventDefault();
        if (!profileForm.avatar) {
            setError(t('user_account.errors.avatar_required'));
            return;
        }
        try {
            const formData = new FormData();
            formData.append('avatar', profileForm.avatar);
            const result = await updateClientAvatar(formData);
            setProfile(result); // Full profile ni yangilash, chunki response full bo'ladi
            setProfileForm({
                ...profileForm,
                avatar: null,
                avatarPreview: null
            });
            setError(null);
        } catch (err) {
            console.error('Avatar submit error:', err);
            setError(t('user_account.errors.avatar_upload_failed') + ': ' + err.message);
        }
    };

    const handleBookingSubmit = async (e) => {
        e.preventDefault();
        if (!bookingForm.start_date) {
            setError(t('user_account.errors.start_date_required'));
            return;
        }
        if (!bookingForm.end_date) {
            setError(t('user_account.errors.end_date_required'));
            return;
        }
        if (!bookingForm.title.trim()) {
            setError(t('user_account.errors.title_required'));
            return;
        }
        if (new Date(bookingForm.start_date) > new Date(bookingForm.end_date)) {
            setError(t('user_account.errors.start_date_before_end'));
            return;
        }
        const today = new Date().toISOString().split('T')[0];
        if (bookingForm.start_date < today) {
            setError(t('user_account.errors.start_date_past'));
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
            alert(t('user_account.success.booking_created'));
        } catch (err) {
            console.error('Booking creation error:', err);
            setError(t('user_account.errors.failed_create_booking'));
        }
    };

    const handleReviewSubmit = async (e) => {
        e.preventDefault();
        if (!reviewForm.title.trim()) {
            setError(t('user_account.errors.review_title_required'));
            return;
        }
        if (!reviewForm.comment.trim()) {
            setError(t('user_account.errors.review_comment_required'));
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
            alert(editingReview ? t('user_account.success.review_updated') : t('user_account.success.review_submitted'));
        } catch (err) {
            setError(t('user_account.errors.failed_submit_review'));
        }
    };

    const handleDeleteReview = async (reviewId) => {
        if (!window.confirm(t('user_account.confirm.delete_review'))) {
            return;
        }
        try {
            await deleteReview(reviewId);
            loadReviews();
            loadBookings();
            setError(null);
            alert(t('user_account.success.review_deleted'));
        } catch (err) {
            setError(t('user_account.errors.failed_delete_review'));
        }
    };

    const handleReactToReview = async (reviewId) => {
        if (reactionForm.reaction_type === 'dislike' && !reactionForm.comment.trim()) {
            setError(t('user_account.errors.dislike_comment_required'));
            return;
        }
        try {
            await reactToReview(reviewId, reactionForm.reaction_type, reactionForm.comment);
            loadReviewReactions(reviewId);
            loadReviewSummary(reviewId);
            setReactionForm({ reaction_type: 'like', comment: '' });
            setError(null);
            alert(t('user_account.success.reaction_submitted'));
        } catch (err) {
            setError(t('user_account.errors.failed_submit_reaction'));
        }
    };

    const handleRemoveReaction = async (reviewId) => {
        try {
            await removeReactionFromReview(reviewId);
            loadReviewReactions(reviewId);
            loadReviewSummary(reviewId);
            setError(null);
            alert(t('user_account.success.reaction_removed'));
        } catch (err) {
            setError(t('user_account.errors.failed_remove_reaction'));
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
            setError(t('user_account.errors.cancellation_reason_required'));
            return;
        }
        try {
            await cancelBooking(selectedBookingForCancel.id, cancelReason);
            loadBookings();
            setShowCancelModal(false);
            setSelectedBookingForCancel(null);
            setCancelReason('');
            setError(null);
            alert(t('user_account.success.booking_cancelled'));
        } catch (err) {
            setError(t('user_account.errors.failed_cancel_booking'));
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
            title: t('user_account.forms.booking.title_default', { guideName: guide.user?.full_name || 'Guide' }),
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
            title: t('user_account.forms.review.title_default', {
                guideName: booking.customer_profile?.user?.full_name || 'Unknown',
                bookingTitle: booking.title
            }),
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
                <p>{t('user_account.loading')}</p>
            </div>
        );
    }

    return (
        <div className="user-account-container">
            <div className="user-account-header">
                <h1 className="user-account-title">{t('user_account.title')}</h1>
                {currentUser && (
                    <div className="user-account-user-info">
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
                            {t('user_account.buttons.messages')}
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
                    {t('user_account.navigation.dashboard')}
                </button>
                <button
                    className={`user-account-nav-btn ${activeTab === 'profile' ? 'user-account-nav-active' : ''}`}
                    onClick={() => setActiveTab('profile')}
                >
                    {t('user_account.navigation.profile')}
                </button>
                <button
                    className={`user-account-nav-btn ${activeTab === 'guides' ? 'user-account-nav-active' : ''}`}
                    onClick={() => setActiveTab('guides')}
                >
                    {t('user_account.navigation.guides')}
                </button>
                <button
                    className={`user-account-nav-btn ${activeTab === 'bookings' ? 'user-account-nav-active' : ''}`}
                    onClick={() => setActiveTab('bookings')}
                >
                    {t('user_account.navigation.bookings')}
                </button>
                <button
                    className={`user-account-nav-btn ${activeTab === 'reviews' ? 'user-account-nav-active' : ''}`}
                    onClick={() => setActiveTab('reviews')}
                >
                    {t('user_account.navigation.reviews')}
                </button>
            </div>
            <div className="user-account-content">
                {activeTab === 'dashboard' && (
                    <div className="user-account-dashboard">
                        <div className="user-account-stats">
                            <div className="user-account-stat-card">
                                <h3 className="user-account-stat-title">{t('user_account.dashboard.total_bookings')}</h3>
                                <p className="user-account-stat-value">{bookings.length}</p>
                            </div>
                            <div className="user-account-stat-card">
                                <h3 className="user-account-stat-title">{t('user_account.dashboard.active_bookings')}</h3>
                                <p className="user-account-stat-value">
                                    {bookings.filter(b => b.status === 'confirmed' || b.status === 'accepted').length}
                                </p>
                            </div>
                            <div className="user-account-stat-card">
                                <h3 className="user-account-stat-title">{t('user_account.dashboard.completed_trips')}</h3>
                                <p className="user-account-stat-value">
                                    {bookings.filter(b => b.status === 'completed').length}
                                </p>
                            </div>
                            <div className="user-account-stat-card">
                                <h3 className="user-account-stat-title">{t('user_account.dashboard.reviews_written')}</h3>
                                <p className="user-account-stat-value">{reviews.length}</p>
                            </div>
                        </div>
                        <div className="user-account-recent">
                            <h3 className="user-account-section-title">{t('user_account.dashboard.recent_bookings')}</h3>
                            <div className="user-account-recent-bookings">
                                {bookings.slice(0, 5).map(booking => (
                                    <div key={booking.id} className="user-account-booking-card">
                                        <div className="user-account-booking-info">
                                            <h4 className="user-account-booking-title">{booking.title}</h4>
                                            <p className="user-account-booking-date">
                                                {new Date(booking.start_date).toLocaleDateString()} - {new Date(booking.end_date).toLocaleDateString()}
                                            </p>
                                            <span className={`user-account-booking-status user-account-status-${booking.status}`}>
                                                {t(`user_account.status.${booking.status}`)}
                                            </span>
                                            {booking.status === 'cancelled' && booking.cancellation_reason && (
                                                <p className="user-account-booking-cancel-reason" style={{ color: '#721c24', fontSize: '14px', marginTop: '8px' }}>
                                                    {t('user_account.bookings.cancellation_reason')}: {booking.cancellation_reason}
                                                </p>
                                            )}
                                        </div>
                                        <div className="user-account-booking-actions">
                                            {['pending', 'confirmed', 'accepted'].includes(booking.status) && (
                                                <button
                                                    className="user-account-btn user-account-btn-cancel"
                                                    onClick={() => handleOpenCancelModal(booking)}
                                                >
                                                    {t('user_account.buttons.cancel')}
                                                </button>
                                            )}
                                            {booking.status === 'completed' && !reviews.find(r => r.booking === booking.id) && (
                                                <button
                                                    className="user-account-btn user-account-btn-primary"
                                                    onClick={() => handleWriteReview(booking)}
                                                >
                                                    {t('user_account.buttons.write_review')}
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
                                                    {t('user_account.buttons.chat_with_guide')}
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
                                    {profile ? t('user_account.profile.edit_profile') : t('user_account.profile.create_profile')}
                                </h3>
                                <form onSubmit={handleProfileSubmit} className="user-account-form">
                                    <div className="user-account-form-group">
                                        <label className="user-account-label">{t('user_account.forms.profile.date_of_birth')}</label>
                                        <input
                                            type="date"
                                            className="user-account-input"
                                            value={profileForm.date_of_birth}
                                            onChange={(e) => setProfileForm({ ...profileForm, date_of_birth: e.target.value })}
                                        />
                                    </div>
                                    <div className="user-account-form-group">
                                        <label className="user-account-label">{t('user_account.forms.profile.preferred_contact')}</label>
                                        <select
                                            className="user-account-select"
                                            value={profileForm.preferred_contact}
                                            onChange={(e) => setProfileForm({ ...profileForm, preferred_contact: e.target.value })}
                                        >
                                            <option value="email">{t('user_account.forms.profile.contact_options.email')}</option>
                                            <option value="phone">{t('user_account.forms.profile.contact_options.phone')}</option>
                                            <option value="chat">{t('user_account.forms.profile.contact_options.chat')}</option>
                                        </select>
                                    </div>
                                    <div className="user-account-form-group">
                                        <label className="user-account-label">{t('user_account.forms.profile.languages')}</label>
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
                                            {profile ? t('user_account.buttons.update_profile') : t('user_account.buttons.create_profile')}
                                        </button>
                                        {profile && (
                                            <button
                                                type="button"
                                                className="user-account-btn user-account-btn-secondary"
                                                onClick={() => {
                                                    setShowProfileForm(false);
                                                    setProfileForm({
                                                        ...profileForm,
                                                        avatar: null,
                                                        avatarPreview: null
                                                    });
                                                }}
                                            >
                                                {t('user_account.buttons.cancel')}
                                            </button>
                                        )}
                                    </div>
                                </form>
                                <form onSubmit={handleAvatarSubmit} className="user-account-form">
                                    <div className="user-account-form-group">
                                        <label className="user-account-label">{t('user_account.forms.profile.avatar')}</label>
                                        <input
                                            type="file"
                                            className="user-account-file-input"
                                            accept="image/*"
                                            onChange={handleAvatarChange}
                                        />
                                        {(profile?.avatar || profileForm.avatarPreview) && (
                                            <img
                                                src={
                                                    profileForm.avatarPreview ||
                                                    (profile?.avatar?.startsWith('http')
                                                        ? profile.avatar
                                                        : `${API_URL.replace('/api/v1/', '')}${profile.avatar}`)
                                                }
                                                alt="Avatar preview"
                                                className="user-account-avatar-preview"
                                                style={{ width: '120px', height: '120px', borderRadius: '50%', marginTop: '12px', objectFit: 'cover', border: '2px solid #e2e8f0' }}
                                                onError={(e) => {
                                                    e.target.src = '/placeholder-avatar.png';
                                                    console.error("Avatar yuklanmadi:", e);
                                                }}
                                            />
                                        )}
                                    </div>
                                    <div className="user-account-form-actions">
                                        <button type="submit" className="user-account-btn user-account-btn-primary">
                                            {t('user_account.buttons.upload_avatar')}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        ) : (
                            <div className="user-account-profile-view">
                                <div className="user-account-profile-header">
                                    <h3 className="user-account-section-title">{t('user_account.profile.profile_information')}</h3>
                                    <button
                                        className="user-account-btn user-account-btn-primary"
                                        onClick={() => setShowProfileForm(true)}
                                    >
                                        {t('user_account.buttons.edit_profile')}
                                    </button>
                                </div>
                                <div className="user-account-profile-info">
                                    <div className="user-account-profile-field">
                                        <label className="user-account-profile-label">{t('user_account.forms.profile.date_of_birth')}</label>
                                        <p className="user-account-profile-value">
                                            {profile.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString() : t('user_account.profile.not_set')}
                                        </p>
                                    </div>
                                    <div className="user-account-profile-field">
                                        <label className="user-account-profile-label">{t('user_account.forms.profile.preferred_contact')}</label>
                                        <p className="user-account-profile-value">
                                            {t(`user_account.forms.profile.contact_options.${profile.preferred_contact}`)}
                                        </p>
                                    </div>
                                    <div className="user-account-profile-field">
                                        <label className="user-account-profile-label">{t('user_account.forms.profile.languages')}</label>
                                        <p className="user-account-profile-value">
                                            {profile.languages?.length > 0
                                                ? profile.languages.map(id => languages.find(l => l.id === id)?.name).join(', ')
                                                : t('user_account.profile.not_set')}
                                        </p>
                                    </div>
                                    <div className="user-account-profile-field">
                                        <label className="user-account-profile-label">{t('user_account.forms.profile.avatar')}</label>
                                        {profile.avatar ? (
                                            <img
                                                src={
                                                    profile.avatar.startsWith('http')
                                                        ? profile.avatar
                                                        : `${API_URL.replace('/api/v1/', '')}${profile.avatar}`
                                                }
                                                alt="Avatar"
                                                className="user-account-avatar-preview"
                                                style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #e2e8f0' }}
                                                onError={(e) => {
                                                    e.target.src = '/placeholder-avatar.png';
                                                    console.error("Avatar yuklanmadi:", e);
                                                }}
                                            />
                                        ) : (
                                            <img
                                                src="/placeholder-avatar.png"
                                                alt="No avatar"
                                                className="user-account-avatar-preview"
                                                style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #e2e8f0' }}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                {activeTab === 'guides' && (
                    <div className="user-account-guides">
                        <div className="user-account-guides-header">
                            <h3 className="user-account-section-title">{t('user_account.guides.find_guides')}</h3>
                            <div className="user-account-guides-filters">
                                <input
                                    type="text"
                                    className="user-account-filter-input"
                                    placeholder={t('user_account.guides.search_placeholder')}
                                    value={guidesFilter.search}
                                    onChange={(e) => handleFilterChange('search', e.target.value)}
                                />
                                <select
                                    className="user-account-filter-select"
                                    value={guidesFilter.service_type}
                                    onChange={(e) => handleFilterChange('service_type', e.target.value)}
                                >
                                    <option value="">{t('user_account.guides.filters.all_services')}</option>
                                    {serviceTypes.map(service => (
                                        <option key={service.id} value={service.id}>{service.name}</option>
                                    ))}
                                </select>
                                <select
                                    className="user-account-filter-select"
                                    value={guidesFilter.country}
                                    onChange={(e) => handleFilterChange('country', e.target.value)}
                                >
                                    <option value="">{t('user_account.guides.filters.all_countries')}</option>
                                    {countries.map(country => (
                                        <option key={country.id} value={country.id}>{country.name}</option>
                                    ))}
                                </select>
                                <select
                                    className="user-account-filter-select"
                                    value={guidesFilter.city}
                                    onChange={(e) => handleFilterChange('city', e.target.value)}
                                >
                                    <option value="">{t('user_account.guides.filters.all_cities')}</option>
                                    {cities.map(city => (
                                        <option key={city.id} value={city.id}>{city.name}</option>
                                    ))}
                                </select>
                                <select
                                    className="user-account-filter-select"
                                    value={guidesFilter.min_rating}
                                    onChange={(e) => handleFilterChange('min_rating', e.target.value)}
                                >
                                    <option value="">{t('user_account.guides.filters.any_rating')}</option>
                                    <option value="4">{t('user_account.guides.filters.rating_4')}</option>
                                    <option value="4.5">{t('user_account.guides.filters.rating_4_5')}</option>
                                    <option value="5">{t('user_account.guides.filters.rating_5')}</option>
                                </select>
                                <label className="user-account-filter-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={guidesFilter.is_available}
                                        onChange={(e) => handleFilterChange('is_available', e.target.checked)}
                                    />
                                    {t('user_account.guides.filters.available_only')}
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
                                                {t('user_account.guides.years_experience', { years: guide.years_of_experience })}
                                            </span>
                                            <div className="user-account-guide-rating">
                                                {'★'.repeat(Math.floor(guide.average_rating || 0))}
                                                {'☆'.repeat(5 - Math.floor(guide.average_rating || 0))}
                                                <span className="user-account-guide-rating-text">
                                                    {t('user_account.guides.rating', { rating: guide.average_rating || 0, count: guide.total_reviews || 0 })}
                                                </span>
                                            </div>
                                            <div className="user-account-guide-pricing">
                                                {guide.hourly_rate && (
                                                    <span className="user-account-guide-price">
                                                        {t('user_account.guides.hourly_rate', { rate: guide.hourly_rate })}
                                                    </span>
                                                )}
                                                {guide.daily_rate && (
                                                    <span className="user-account-guide-price">
                                                        {t('user_account.guides.daily_rate', { rate: guide.daily_rate })}
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
                                                {guide.is_available ? t('user_account.buttons.book_now') : t('user_account.buttons.unavailable')}
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
                                                {t('user_account.buttons.chat')}
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
                        <h3 className="user-account-section-title">{t('user_account.bookings.title')}</h3>
                        <div className="user-account-bookings-list">
                            {bookings.map(booking => (
                                <div key={booking.id} className="user-account-booking-item">
                                    <div className="user-account-booking-details">
                                        <h4 className="user-account-booking-title">{t('user_account.bookings.booking_title', { title: booking.title })}</h4>
                                        <p className="user-account-booking-dates">
                                            {new Date(booking.start_date).toLocaleDateString()} - {new Date(booking.end_date).toLocaleDateString()}
                                        </p>
                                        <p className="user-account-booking-description">{t('user_account.bookings.description', { description: booking.description || t('user_account.bookings.not_set') })}</p>
                                        <span className={`user-account-booking-status user-account-status-${booking.status}`}>
                                            {t(`user_account.status.${booking.status}`)}
                                        </span>
                                        {booking.status === 'cancelled' && booking.cancellation_reason && (
                                            <p className="user-account-booking-cancel-reason" style={{ color: '#721c24', fontSize: '14px', marginTop: '8px' }}>
                                                {t('user_account.bookings.cancellation_reason')}: {booking.cancellation_reason}
                                            </p>
                                        )}
                                    </div>
                                    <div className="user-account-booking-actions">
                                        {['pending', 'confirmed', 'accepted'].includes(booking.status) && (
                                            <button
                                                className="user-account-btn user-account-btn-cancel"
                                                onClick={() => handleOpenCancelModal(booking)}
                                            >
                                                {t('user_account.buttons.cancel')}
                                            </button>
                                        )}
                                        {booking.status === 'completed' && !reviews.find(r => r.booking === booking.id) && (
                                            <button
                                                className="user-account-btn user-account-btn-primary"
                                                onClick={() => handleWriteReview(booking)}
                                            >
                                                {t('user_account.buttons.write_review')}
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
                                                {t('user_account.buttons.chat_with_guide')}
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
                            <h3 className="user-account-section-title">{t('user_account.reviews.title')}</h3>
                            <div className="user-account-reviews-filters">
                                <select
                                    className="user-account-filter-select"
                                    value={reviewFilter.minRating}
                                    onChange={(e) => handleReviewFilterChange('minRating', e.target.value)}
                                >
                                    <option value="">{t('user_account.reviews.filters.all_ratings')}</option>
                                    <option value="5">{t('user_account.reviews.filters.rating_5')}</option>
                                    <option value="4">{t('user_account.reviews.filters.rating_4')}</option>
                                    <option value="3">{t('user_account.reviews.filters.rating_3')}</option>
                                    <option value="2">{t('user_account.reviews.filters.rating_2')}</option>
                                    <option value="1">{t('user_account.reviews.filters.rating_1')}</option>
                                </select>
                                <select
                                    className="user-account-filter-select"
                                    value={reviewFilter.sortBy}
                                    onChange={(e) => handleReviewFilterChange('sortBy', e.target.value)}
                                >
                                    <option value="date_desc">{t('user_account.reviews.filters.newest_first')}</option>
                                    <option value="date_asc">{t('user_account.reviews.filters.oldest_first')}</option>
                                    <option value="rating_desc">{t('user_account.reviews.filters.highest_rated')}</option>
                                    <option value="rating_asc">{t('user_account.reviews.filters.lowest_rated')}</option>
                                </select>
                            </div>
                        </div>
                        <div className="user-account-reviews-summary">
                            <h4 className="user-account-section-subtitle">{t('user_account.reviews.summary_title')}</h4>
                            <div className="user-account-reviews-summary-grid">
                                <div className="user-account-summary-item">
                                    <span className="user-account-summary-label">{t('user_account.reviews.summary.total_reviews')}</span>
                                    <span className="user-account-summary-value">{reviews.length}</span>
                                </div>
                                <div className="user-account-summary-item">
                                    <span className="user-account-summary-label">{t('user_account.reviews.summary.avg_overall_rating')}</span>
                                    <span className="user-account-summary-value">
                                        {reviews.length > 0
                                            ? (reviews.reduce((sum, r) => sum + r.overall_rating, 0) / reviews.length).toFixed(1)
                                            : 0}/5
                                    </span>
                                </div>
                                <div className="user-account-summary-item">
                                    <span className="user-account-summary-label">{t('user_account.reviews.summary.avg_communication')}</span>
                                    <span className="user-account-summary-value">
                                        {reviews.length > 0
                                            ? (reviews.reduce((sum, r) => sum + r.communication_rating, 0) / reviews.length).toFixed(1)
                                            : 0}/5
                                    </span>
                                </div>
                                <div className="user-account-summary-item">
                                    <span className="user-account-summary-label">{t('user_account.reviews.summary.avg_service')}</span>
                                    <span className="user-account-summary-value">
                                        {reviews.length > 0
                                            ? (reviews.reduce((sum, r) => sum + r.service_rating, 0) / reviews.length).toFixed(1)
                                            : 0}/5
                                    </span>
                                </div>
                                <div className="user-account-summary-item">
                                    <span className="user-account-summary-label">{t('user_account.reviews.summary.avg_punctuality')}</span>
                                    <span className="user-account-summary-value">
                                        {reviews.length > 0
                                            ? (reviews.reduce((sum, r) => sum + r.punctuality_rating, 0) / reviews.length).toFixed(1)
                                            : 0}/5
                                    </span>
                                </div>
                                <div className="user-account-summary-item">
                                    <span className="user-account-summary-label">{t('user_account.reviews.summary.avg_value')}</span>
                                    <span className="user-account-summary-value">
                                        {reviews.length > 0
                                            ? (reviews.reduce((sum, r) => sum + r.value_rating, 0) / reviews.length).toFixed(1)
                                            : 0}/5
                                    </span>
                                </div>
                            </div>
                        </div>
                        {filteredReviews.length === 0 ? (
                            <p>{t('user_account.reviews.no_reviews')}</p>
                        ) : (
                            <div className="user-account-reviews-list">
                                {filteredReviews.map(review => {
                                    const relatedBooking = bookings.find(b => b.id === review.booking);
                                    const guideName = relatedBooking?.customer_profile?.user?.full_name || t('user_account.reviews.unknown');
                                    return (
                                        <div key={review.id} className="user-account-review-item">
                                            <div className="user-account-review-header">
                                                <div className="user-account-review-rating">
                                                    {'★'.repeat(review.overall_rating)}{'☆'.repeat(5 - review.overall_rating)}
                                                    <span className="user-account-review-rating-text">
                                                        {review.overall_rating}/5
                                                    </span>
                                                </div>
                                                <span className="user-account-review-date">
                                                    {new Date(review.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <h4 className="user-account-review-title">
                                                {t('user_account.reviews.review_for', { guideName })}
                                            </h4>
                                            <p className="user-account-review-comment">{review.comment}</p>
                                            <div className="user-account-review-details">
                                                <span className="user-account-review-detail">
                                                    {t('user_account.reviews.communication')}: {review.communication_rating}/5
                                                </span>
                                                <span className="user-account-review-detail">
                                                    {t('user_account.reviews.service')}: {review.service_rating}/5
                                                </span>
                                                <span className="user-account-review-detail">
                                                    {t('user_account.reviews.punctuality')}: {review.punctuality_rating}/5
                                                </span>
                                                <span className="user-account-review-detail">
                                                    {t('user_account.reviews.value')}: {review.value_rating}/5
                                                </span>
                                            </div>
                                            {relatedBooking && (
                                                <div className="user-account-review-booking">
                                                    <p>
                                                        {t('user_account.reviews.booking_details', {
                                                            title: relatedBooking.title,
                                                            startDate: new Date(relatedBooking.start_date).toLocaleDateString(),
                                                            endDate: new Date(relatedBooking.end_date).toLocaleDateString()
                                                        })}
                                                    </p>
                                                </div>
                                            )}
                                            <div className="user-account-review-reactions">
                                                <span className="user-account-review-reaction-count">
                                                    {t('user_account.reviews.likes', { count: review.like_count || 0 })}
                                                </span>
                                                <span className="user-account-review-reaction-count">
                                                    {t('user_account.reviews.dislikes', { count: review.dislike_count || 0 })}
                                                </span>
                                                <button
                                                    className="user-account-btn user-account-btn-small"
                                                    onClick={() => handleViewReactions(review)}
                                                >
                                                    {t('user_account.buttons.view_reactions')}
                                                </button>
                                            </div>
                                            <div className="user-account-review-actions">
                                                <button
                                                    className="user-account-btn user-account-btn-small"
                                                    onClick={() => handleEditReview(review, relatedBooking)}
                                                >
                                                    {t('user_account.buttons.edit')}
                                                </button>
                                                <button
                                                    className="user-account-btn user-account-btn-small user-account-btn-danger"
                                                    onClick={() => handleDeleteReview(review.id)}
                                                >
                                                    {t('user_account.buttons.delete')}
                                                </button>
                                                <button
                                                    className="user-account-btn user-account-btn-small"
                                                    onClick={() => {
                                                        setSelectedReviewForReactions(review);
                                                        setReactionForm({ reaction_type: 'like', comment: '' });
                                                    }}
                                                >
                                                    {t('user_account.buttons.react')}
                                                </button>
                                            </div>
                                            {selectedReviewForReactions?.id === review.id && (
                                                <div className="user-account-reaction-form">
                                                    <h4>{t('user_account.reviews.add_reaction')}</h4>
                                                    <div className="user-account-form-group">
                                                        <label className="user-account-label">{t('user_account.forms.reaction.reaction_type')}</label>
                                                        <select
                                                            className="user-account-select"
                                                            value={reactionForm.reaction_type}
                                                            onChange={(e) => setReactionForm({ ...reactionForm, reaction_type: e.target.value })}
                                                        >
                                                            <option value="like">{t('user_account.forms.reaction.like')}</option>
                                                            <option value="dislike">{t('user_account.forms.reaction.dislike')}</option>
                                                        </select>
                                                    </div>
                                                    <div className="user-account-form-group">
                                                        <label className="user-account-label">{t('user_account.forms.reaction.comment')}</label>
                                                        <textarea
                                                            className="user-account-textarea"
                                                            placeholder={reactionForm.reaction_type === 'like' ? t('user_account.forms.reaction.like_placeholder') : t('user_account.forms.reaction.dislike_placeholder')}
                                                            value={reactionForm.comment}
                                                            onChange={(e) => setReactionForm({ ...reactionForm, comment: e.target.value })}
                                                        />
                                                    </div>
                                                    <div className="user-account-form-actions">
                                                        <button
                                                            className="user-account-btn user-account-btn-primary"
                                                            onClick={() => handleReactToReview(review.id)}
                                                        >
                                                            {t('user_account.buttons.submit_reaction')}
                                                        </button>
                                                        <button
                                                            className="user-account-btn user-account-btn-secondary"
                                                            onClick={() => setSelectedReviewForReactions(null)}
                                                        >
                                                            {t('user_account.buttons.cancel')}
                                                        </button>
                                                        {reactions.some(r => r.user === currentUser?.id && r.review === review.id) && (
                                                            <button
                                                                className="user-account-btn user-account-btn-danger"
                                                                onClick={() => handleRemoveReaction(review.id)}
                                                            >
                                                                {t('user_account.buttons.remove_reaction')}
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
                            {t('user_account.forms.booking.title', { guideName: selectedGuide.user?.full_name })}
                        </h3>
                        <form onSubmit={handleBookingSubmit} className="user-account-form">
                            <div className="user-account-form-group">
                                <label className="user-account-label">{t('user_account.forms.booking.title_label')}</label>
                                <input
                                    type="text"
                                    className="user-account-input"
                                    placeholder={t('user_account.forms.booking.title_placeholder')}
                                    value={bookingForm.title}
                                    onChange={(e) => setBookingForm({ ...bookingForm, title: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="user-account-form-group">
                                <label className="user-account-label">{t('user_account.forms.booking.description')}</label>
                                <textarea
                                    className="user-account-textarea"
                                    placeholder={t('user_account.forms.booking.description_placeholder')}
                                    value={bookingForm.description}
                                    onChange={(e) => setBookingForm({ ...bookingForm, description: e.target.value })}
                                />
                            </div>
                            <div className="user-account-form-group">
                                <label className="user-account-label">{t('user_account.forms.booking.start_date')}</label>
                                <input
                                    type="date"
                                    className="user-account-input"
                                    value={bookingForm.start_date}
                                    onChange={(e) => setBookingForm({ ...bookingForm, start_date: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="user-account-form-group">
                                <label className="user-account-label">{t('user_account.forms.booking.end_date')}</label>
                                <input
                                    type="date"
                                    className="user-account-input"
                                    value={bookingForm.end_date}
                                    onChange={(e) => setBookingForm({ ...bookingForm, end_date: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="user-account-form-group">
                                <label className="user-account-label">{t('user_account.forms.booking.special_requirements')}</label>
                                <textarea
                                    className="user-account-textarea"
                                    placeholder={t('user_account.forms.booking.special_requirements_placeholder')}
                                    value={bookingForm.special_requirements}
                                    onChange={(e) => setBookingForm({ ...bookingForm, special_requirements: e.target.value })}
                                />
                            </div>
                            <div className="user-account-form-group">
                                <label className="user-account-label">{t('user_account.forms.booking.budget')}</label>
                                <input
                                    type="number"
                                    className="user-account-input"
                                    placeholder={t('user_account.forms.booking.budget_placeholder')}
                                    value={bookingForm.budget}
                                    onChange={(e) => setBookingForm({ ...bookingForm, budget: e.target.value })}
                                />
                                {selectedGuide.daily_rate && (
                                    <p className="user-account-form-note">
                                        {t('user_account.forms.booking.daily_rate_note', { rate: selectedGuide.daily_rate })}
                                    </p>
                                )}
                                {selectedGuide.hourly_rate && (
                                    <p className="user-account-form-note">
                                        {t('user_account.forms.booking.hourly_rate_note', { rate: selectedGuide.hourly_rate })}
                                    </p>
                                )}
                            </div>
                            <div className="user-account-form-actions">
                                <button type="submit" className="user-account-btn user-account-btn-primary">
                                    {t('user_account.buttons.submit_booking')}
                                </button>
                                <button
                                    type="button"
                                    className="user-account-btn user-account-btn-secondary"
                                    onClick={() => {
                                        setShowBookingForm(false);
                                        setSelectedGuide(null);
                                    }}
                                >
                                    {t('user_account.buttons.cancel')}
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
                            {editingReview
                                ? t('user_account.forms.review.edit_title', {
                                    guideName: selectedBookingForReview.customer_profile?.user?.full_name || t('user_account.reviews.unknown'),
                                    bookingTitle: selectedBookingForReview.title
                                })
                                : t('user_account.forms.review.write_title', {
                                    guideName: selectedBookingForReview.customer_profile?.user?.full_name || t('user_account.reviews.unknown'),
                                    bookingTitle: selectedBookingForReview.title
                                })}
                        </h3>
                        <form onSubmit={handleReviewSubmit} className="user-account-form">
                            <div className="user-account-form-group">
                                <label className="user-account-label">{t('user_account.forms.review.overall_rating')}</label>
                                <select
                                    className="user-account-select"
                                    value={reviewForm.overall_rating}
                                    onChange={(e) => setReviewForm({ ...reviewForm, overall_rating: parseInt(e.target.value) })}
                                    required
                                >
                                    {[1, 2, 3, 4, 5].map(num => (
                                        <option key={num} value={num}>{t('user_account.forms.review.star', { count: num })}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="user-account-form-group">
                                <label className="user-account-label">{t('user_account.forms.review.communication_rating')}</label>
                                <select
                                    className="user-account-select"
                                    value={reviewForm.communication_rating}
                                    onChange={(e) => setReviewForm({ ...reviewForm, communication_rating: parseInt(e.target.value) })}
                                    required
                                >
                                    {[1, 2, 3, 4, 5].map(num => (
                                        <option key={num} value={num}>{t('user_account.forms.review.star', { count: num })}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="user-account-form-group">
                                <label className="user-account-label">{t('user_account.forms.review.service_rating')}</label>
                                <select
                                    className="user-account-select"
                                    value={reviewForm.service_rating}
                                    onChange={(e) => setReviewForm({ ...reviewForm, service_rating: parseInt(e.target.value) })}
                                    required
                                >
                                    {[1, 2, 3, 4, 5].map(num => (
                                        <option key={num} value={num}>{t('user_account.forms.review.star', { count: num })}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="user-account-form-group">
                                <label className="user-account-label">{t('user_account.forms.review.punctuality_rating')}</label>
                                <select
                                    className="user-account-select"
                                    value={reviewForm.punctuality_rating}
                                    onChange={(e) => setReviewForm({ ...reviewForm, punctuality_rating: parseInt(e.target.value) })}
                                    required
                                >
                                    {[1, 2, 3, 4, 5].map(num => (
                                        <option key={num} value={num}>{t('user_account.forms.review.star', { count: num })}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="user-account-form-group">
                                <label className="user-account-label">{t('user_account.forms.review.value_rating')}</label>
                                <select
                                    className="user-account-select"
                                    value={reviewForm.value_rating}
                                    onChange={(e) => setReviewForm({ ...reviewForm, value_rating: parseInt(e.target.value) })}
                                    required
                                >
                                    {[1, 2, 3, 4, 5].map(num => (
                                        <option key={num} value={num}>{t('user_account.forms.review.star', { count: num })}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="user-account-form-group">
                                <label className="user-account-label">{t('user_account.forms.review.title')}</label>
                                <input
                                    type="text"
                                    className="user-account-input"
                                    placeholder={t('user_account.forms.review.title_placeholder')}
                                    value={reviewForm.title}
                                    onChange={(e) => setReviewForm({ ...reviewForm, title: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="user-account-form-group">
                                <label className="user-account-label">{t('user_account.forms.review.comment')}</label>
                                <textarea
                                    className="user-account-textarea"
                                    placeholder={t('user_account.forms.review.comment_placeholder')}
                                    value={reviewForm.comment}
                                    onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="user-account-form-actions">
                                <button type="submit" className="user-account-btn user-account-btn-primary">
                                    {editingReview ? t('user_account.buttons.update_review') : t('user_account.buttons.submit_review')}
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
                                    {t('user_account.buttons.cancel')}
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
                        <h3 className="user-account-modal-title">{t('user_account.forms.cancel_booking.title')}</h3>
                        <form onSubmit={handleCancelBooking} className="user-account-form">
                            <div className="user-account-form-group">
                                <label className="user-account-label">{t('user_account.forms.cancel_booking.reason')}</label>
                                <textarea
                                    className="user-account-textarea"
                                    placeholder={t('user_account.forms.cancel_booking.reason_placeholder')}
                                    value={cancelReason}
                                    onChange={(e) => setCancelReason(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="user-account-form-actions">
                                <button type="submit" className="user-account-btn user-account-btn-primary">
                                    {t('user_account.buttons.submit_cancellation')}
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
                                    {t('user_account.buttons.close')}
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
                        <h3 className="user-account-modal-title">{t('user_account.reviews.reactions_title')}</h3>
                        {reactionSummary && (
                            <div className="user-account-reactions-summary">
                                <h4 className="user-account-section-subtitle">{t('user_account.reviews.reaction_summary')}</h4>
                                <p>{t('user_account.reviews.likes', { count: reactionSummary.like_count || 0 })}</p>
                                <p>{t('user_account.reviews.dislikes', { count: reactionSummary.dislike_count || 0 })}</p>
                            </div>
                        )}
                        <div className="user-account-reactions-list">
                            <h4>{t('user_account.reviews.latest_likes')}</h4>
                            {reactions.filter(r => r.reaction_type === 'like').length > 0 ? (
                                reactions
                                    .filter(r => r.reaction_type === 'like')
                                    .slice(0, 5)
                                    .map((reaction, index) => (
                                        <div key={index} className="user-account-reaction-item">
                                            <p>{reaction.comment || t('user_account.reviews.no_comment')}</p>
                                            <span>{new Date(reaction.created_at).toLocaleDateString()}</span>
                                        </div>
                                    ))
                            ) : (
                                <p>{t('user_account.reviews.no_likes')}</p>
                            )}
                            <h4>{t('user_account.reviews.latest_dislikes')}</h4>
                            {reactions.filter(r => r.reaction_type === 'dislike').length > 0 ? (
                                reactions
                                    .filter(r => r.reaction_type === 'dislike')
                                    .slice(0, 5)
                                    .map((reaction, index) => (
                                        <div key={index} className="user-account-reaction-item">
                                            <p>{reaction.comment || t('user_account.reviews.no_comment')}</p>
                                            <span>{new Date(reaction.created_at).toLocaleDateString()}</span>
                                        </div>
                                    ))
                            ) : (
                                <p>{t('user_account.reviews.no_dislikes')}</p>
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
                                {t('user_account.buttons.close')}
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