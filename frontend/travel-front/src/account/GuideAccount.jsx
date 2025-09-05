import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import ChatWidgets from './ChatWidgets';
import './GuideAccount.css';

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

const getCustomerAvatar = (userId) => {
    console.log(`Getting customer avatar for user ${userId}...`);
    return api.get(`profiles/customers/${userId}/avatar/`).then((r) => r.data);
};

const uploadCustomerAvatar = (userId, avatarFile) => {
    console.log(`Uploading customer avatar for user ${userId}...`);
    const formData = new FormData();
    formData.append("avatar", avatarFile);
    return api.put(`profiles/customers/${userId}/avatar/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data);
};

const deleteCustomerAvatar = (userId) => {
    console.log(`Deleting customer avatar for user ${userId}...`);
    return api.delete(`profiles/customers/${userId}/avatar/`).then((r) => r.data);
};

// API Functions
const getCustomerProfile = () => {
    console.log("Getting customer profile...");
    return api.get("profiles/customers/my/").then((r) => r.data);
};

const createCustomerProfile = (payload) => {
    console.log("Creating customer profile:", payload);
    return api.post("profiles/customers/", payload, {
        headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data);
};

const updateCustomerProfile = (payload) => {
    console.log("Updating customer profile:", payload);
    return api.patch("profiles/customers/my/", payload, {
        headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data);
};

const getMyBookings = (status = null) => {
    const params = status ? { status } : {};
    console.log("Getting my bookings...", params);
    return api.get("bookings/bookings/", { params }).then((r) => r.data);
};

const acceptBooking = (id) => {
    console.log("Accepting booking:", id);
    return api.post(`bookings/bookings/${id}/accept/`).then((r) => r.data);
};

const cancelBooking = (id, reason = "") => {
    console.log("Canceling booking:", id, reason);
    return api.post(`bookings/bookings/${id}/cancel/`, {
        cancellation_reason: reason
    }).then((r) => r.data);
};

const checkAvailability = async (customerId, startDate, endDate) => {
    console.log("Checking availability:", customerId, startDate, endDate);
    return api.get(`bookings/bookings/${customerId}/check-availability/`, {
        params: { start_date: startDate, end_date: endDate }
    }).then((r) => r.data);
};

const getMyReviews = () => {
    console.log("Getting my reviews...");
    return api.get("reviews/my/").then((r) => r.data);
};

const getReviewSummary = (id) =>
    api.get(`reviews/reviews/${id}/reactions/summary/`).then((r) => r.data);

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

const getMyPortfolio = () => {
    console.log("Getting my portfolio...");
    return api.get("profiles/portfolios/my/").then((r) => r.data);
};

const createPortfolioItem = (payload) => {
    console.log("Creating portfolio item...");
    const formData = new FormData();
    Object.keys(payload).forEach(key => {
        if (payload[key] !== null && payload[key] !== undefined) {
            formData.append(key, payload[key]);
        }
    });
    return api.post("profiles/portfolios/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data);
};

const updatePortfolioItem = (id, payload) => {
    console.log("Updating portfolio item:", id);
    const formData = new FormData();
    Object.keys(payload).forEach(key => {
        if (payload[key] !== null && payload[key] !== undefined) {
            formData.append(key, payload[key]);
        }
    });
    return api.patch(`profiles/portfolios/${id}/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data);
};

const deletePortfolioItem = (id) => {
    console.log("Deleting portfolio item:", id);
    return api.delete(`profiles/portfolios/${id}/`).then((r) => r.data);
};

const getMyUnavailability = () => {
    console.log("Getting my unavailability...");
    return api.get("profiles/unavailabilities/my/").then((r) => r.data);
};

const createUnavailability = (payload) => {
    console.log("Creating unavailability:", payload);
    return api.post("profiles/unavailabilities/", payload).then((r) => r.data);
};

const updateUnavailability = (id, payload) => {
    console.log("Updating unavailability:", id, payload);
    return api.patch(`profiles/unavailabilities/${id}/`, payload).then((r) => r.data);
};

const deleteUnavailability = (id) => {
    console.log("Deleting unavailability:", id);
    return api.delete(`profiles/unavailabilities/${id}/`).then((r) => r.data);
};

const getServiceTypes = () => {
    console.log("Getting service types...");
    return api.get("common/service-types/").then((r) => r.data);
};

const getLanguages = () => {
    console.log("Getting languages...");
    return api.get("common/languages/").then((r) => r.data);
};

const getCities = (countryId = null) => {
    const params = countryId ? { country: countryId } : {};
    console.log("Getting cities...", params);
    return api.get("common/cities/", { params }).then((r) => r.data);
};

const getCurrentUser = () => {
    console.log("Getting current user info...");
    return api.get("auth/users/short/").then((r) => r.data);
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
const GuideAccount = () => {
    const { t } = useTranslation();
    const [currentUser, setCurrentUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [bookings, setBookings] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [reviewSummary, setReviewSummary] = useState(null);
    const [portfolio, setPortfolio] = useState([]);
    const [unavailability, setUnavailability] = useState([]);
    const [serviceTypes, setServiceTypes] = useState([]);
    const [languages, setLanguages] = useState([]);
    const [cities, setCities] = useState([]);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showProfileForm, setShowProfileForm] = useState(false);
    const [showPortfolioForm, setShowPortfolioForm] = useState(false);
    const [showUnavailabilityForm, setShowUnavailabilityForm] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [editingPortfolioItem, setEditingPortfolioItem] = useState(null);
    const [editingUnavailability, setEditingUnavailability] = useState(null);
    const [selectedBookingForCancel, setSelectedBookingForCancel] = useState(null);
    const [showChat, setShowChat] = useState(false);
    const [selectedUserForChat, setSelectedUserForChat] = useState(null);
    const [avatarUrl, setAvatarUrl] = useState(null);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [bookingFilter, setBookingFilter] = useState('all');
    const [availabilityForm, setAvailabilityForm] = useState({
        start_date: '',
        end_date: ''
    });
    const [availabilityResult, setAvailabilityResult] = useState(null);
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
        is_available: true,
    });
    const [portfolioForm, setPortfolioForm] = useState({
        title: '',
        description: '',
        image: null,
        order: 0
    });
    const [unavailabilityForm, setUnavailabilityForm] = useState({
        start_date: '',
        end_date: '',
        reason: ''
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
                getCities(),
            ]);
            setServiceTypes(serviceTypesData.results || serviceTypesData);
            setLanguages(languagesData.results || languagesData);
            setCities(citiesData.results || citiesData);
            try {
                const profileData = await getCustomerProfile();
                setProfile(profileData);
                setProfileForm({
                    professional_bio: profileData.professional_bio || "",
                    years_of_experience: profileData.years_of_experience || 0,
                    service_types: profileData.service_types || [],
                    city: profileData.city || "",
                    service_areas: profileData.service_areas || "",
                    hourly_rate: profileData.hourly_rate || "",
                    daily_rate: profileData.daily_rate || "",
                    currency: profileData.currency || "USD",
                    languages: profileData.languages || [],
                    is_available: profileData.is_available !== undefined ? profileData.is_available : true,
                });
                if (userData.id) {
                    try {
                        const avatarData = await getCustomerAvatar(userData.id);
                        setAvatarUrl(avatarData.avatar_url || null);
                    } catch (avatarError) {
                        console.log("No avatar found or error fetching avatar:", avatarError);
                        setAvatarUrl(null);
                    }
                }
                await Promise.all([
                    loadBookings(),
                    loadReviews(),
                    loadPortfolio(),
                    loadUnavailability(),
                    loadReviewSummary(),
                ]);
            } catch (profileError) {
                console.log(t("guideAccount.error.noProfile"));
                setShowProfileForm(true);
                setAvatarUrl(null);
            }
        } catch (err) {
            console.error("Error initializing data:", err);
            setError(t("guideAccount.error.requiredFields"));
        } finally {
            setLoading(false);
        }
    };

    const handleAvatarUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) {
            setError(t("guideAccount.error.noAvatarSelected"));
            return;
        }
        try {
            setUploadingAvatar(true);
            const avatarData = await uploadCustomerAvatar(currentUser.id, file);
            setAvatarUrl(avatarData.avatar_url);
            setProfile({ ...profile, avatar: avatarData.avatar_url });
            setError(null);
            alert(t("guideAccount.success.avatarUploaded"));
        } catch (err) {
            setError(t("guideAccount.error.failedToUploadAvatar"));
        } finally {
            setUploadingAvatar(false);
        }
    };

    const handleAvatarDelete = async () => {
        if (!window.confirm(t('guideAccount.profile.deleteAvatarConfirm'))) return;
        try {
            await deleteCustomerAvatar(currentUser.id);
            setAvatarUrl(null);
            setError(null);
            alert(t('guideAccount.success.avatarDeleted'));
        } catch (err) {
            setError(t('guideAccount.error.failedToDeleteAvatar'));
        }
    };

    const loadBookings = async (status = null) => {
        try {
            const data = await getMyBookings(status);
            setBookings(data.results || data);
        } catch (err) {
            console.error('Bronlarni yuklashda xato:', err);
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

    const loadUnavailability = async () => {
        try {
            const data = await getMyUnavailability();
            setUnavailability(data.results || data);
        } catch (err) {
            console.error('Error loading unavailability:', err);
            setError(t('guideAccount.error.failedToLoadUnavailability'));
        }
    };

    const handleAvailabilityCheck = async (e) => {
        e.preventDefault();
        if (!availabilityForm.start_date || !availabilityForm.end_date) {
            setError(t('guideAccount.error.datesRequired'));
            return;
        }
        try {
            const result = await checkAvailability(currentUser.id, availabilityForm.start_date, availabilityForm.end_date);
            setAvailabilityResult(result);
            setError(null);
        } catch (err) {
            setError(t('guideAccount.error.failedToCheckAvailability'));
        }
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        if (!profileForm.professional_bio.trim() || !profileForm.city) {
            setError(t('guideAccount.error.profileRequired'));
            return;
        }
        try {
            const formData = new FormData();
            formData.append('professional_bio', profileForm.professional_bio);
            formData.append('years_of_experience', profileForm.years_of_experience);
            profileForm.service_types.forEach(st => formData.append('service_types', st));
            formData.append('city', profileForm.city);
            formData.append('service_areas', profileForm.service_areas);
            formData.append('hourly_rate', profileForm.hourly_rate);
            formData.append('daily_rate', profileForm.daily_rate);
            formData.append('currency', profileForm.currency);
            profileForm.languages.forEach(lang => formData.append('languages', lang));
            formData.append('is_available', profileForm.is_available);

            let result;
            if (profile) {
                result = await updateCustomerProfile(formData);
            } else {
                result = await createCustomerProfile(formData);
            }
            setProfile(result);
            setShowProfileForm(false);
            setError(null);
            alert(profile ? t('guideAccount.success.profileUpdated') : t('guideAccount.success.profileCreated'));
        } catch (err) {
            setError(t('guideAccount.error.failedToSaveProfile'));
        }
    };

    const handleBookingFilterChange = (status) => {
        setBookingFilter(status);
        loadBookings(status === 'all' ? null : status);
    };

    const handleUnavailabilitySubmit = async (e) => {
        e.preventDefault();
        if (!unavailabilityForm.start_date || !unavailabilityForm.end_date) {
            setError(t('guideAccount.error.datesRequired'));
            return;
        }
        if (new Date(unavailabilityForm.end_date) < new Date(unavailabilityForm.start_date)) {
            setError(t('guideAccount.error.invalidDateRange'));
            return;
        }
        try {
            const payload = {
                start_date: unavailabilityForm.start_date,
                end_date: unavailabilityForm.end_date,
                reason: unavailabilityForm.reason || '',
            };
            if (editingUnavailability) {
                await updateUnavailability(editingUnavailability.id, payload);
            } else {
                await createUnavailability(payload);
            }
            loadUnavailability();
            setShowUnavailabilityForm(false);
            setEditingUnavailability(null);
            setUnavailabilityForm({ start_date: '', end_date: '', reason: '' });
            setError(null);
            alert(editingUnavailability ? t('guideAccount.success.unavailabilityUpdated') : t('guideAccount.success.unavailabilityCreated'));
        } catch (err) {
            setError(t('guideAccount.error.failedToSaveUnavailability'));
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
            loadBookings(bookingFilter === 'all' ? null : bookingFilter);
            setShowCancelModal(false);
            setSelectedBookingForCancel(null);
            setCancelReason('');
            setError(null);
        } catch (err) {
            setError(err.message || t('guideAccount.error.failedToProcessBooking'));
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

    const handleDeleteUnavailability = async (id) => {
        if (!window.confirm(t('guideAccount.unavailability.deleteConfirm'))) return;
        try {
            await deleteUnavailability(id);
            loadUnavailability();
            setError(null);
            alert(t('guideAccount.success.unavailabilityDeleted'));
        } catch (err) {
            setError(t('guideAccount.error.failedToDeleteUnavailability'));
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

    const handlePortfolioSubmit = async (e) => {
        e.preventDefault();
        if (!portfolioForm.title.trim()) {
            setError(t('guideAccount.error.portfolioTitleRequired'));
            return;
        }
        try {
            const formData = new FormData();
            formData.append('title', portfolioForm.title);
            formData.append('description', portfolioForm.description || '');
            if (portfolioForm.image) {
                formData.append('image', portfolioForm.image);
            }
            formData.append('order', portfolioForm.order);

            if (editingPortfolioItem) {
                await updatePortfolioItem(editingPortfolioItem.id, formData);
            } else {
                await createPortfolioItem(formData);
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
                {/*<button*/}
                {/*    className={`guide-account-nav-btn ${activeTab === 'portfolio' ? 'guide-account-nav-active' : ''}`}*/}
                {/*    onClick={() => setActiveTab('portfolio')}*/}
                {/*>*/}
                {/*    {t('guideAccount.navigation.portfolio')}*/}
                {/*</button>*/}
                <button
                    className={`guide-account-nav-btn ${activeTab === 'unavailability' ? 'guide-account-nav-active' : ''}`}
                    onClick={() => setActiveTab('unavailability')}
                >
                    {t('guideAccount.navigation.unavailability')}
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
                                                        {t('guideAccount.bookings.decline')}
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
                                    <div className="guide-account-form-group">
                                        <label className="guide-account-label">{t('guideAccount.profile.avatar')}</label>
                                        <input
                                            type="file"
                                            className="guide-account-file-input"
                                            accept="image/*"
                                            onChange={handleAvatarUpload}
                                            disabled={uploadingAvatar}
                                        />
                                        {avatarUrl ? (
                                            <div style={{ marginTop: '10px' }}>
                                                <img
                                                    src={avatarUrl}
                                                    alt="Current avatar"
                                                    className="guide-account-avatar-preview"
                                                    style={{ width: '100px', height: '100px', borderRadius: '50%' }}
                                                />
                                                <button
                                                    type="button"
                                                    className="guide-account-btn guide-account-btn-danger"
                                                    onClick={handleAvatarDelete}
                                                    style={{ marginLeft: '10px' }}
                                                    disabled={uploadingAvatar}
                                                >
                                                    {t('guideAccount.profile.deleteAvatar')}
                                                </button>
                                            </div>
                                        ) : (
                                            <p className="guide-account-profile-value">{t('guideAccount.profile.noAvatar')}</p>
                                        )}
                                        {uploadingAvatar && <p>{t('guideAccount.profile.uploading')}</p>}
                                    </div>
                                    <div className="guide-account-form-actions">
                                        <button type="submit" className="guide-account-btn guide-account-btn-primary" disabled={uploadingAvatar}>
                                            {profile ? t('guideAccount.profile.updateProfile') : t('guideAccount.profile.createProfileButton')}
                                        </button>
                                        {profile && (
                                            <button
                                                type="button"
                                                className="guide-account-btn guide-account-btn-secondary"
                                                onClick={() => setShowProfileForm(false)}
                                                disabled={uploadingAvatar}
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
                                        <label className="guide-account-profile-label">{t('guideAccount.profile.serviceAreas')}</label>
                                        <p className="guide-account-profile-value">{profile.service_areas || t('guideAccount.profile.notSet')}</p>
                                    </div>
                                    <div className="guide-account-profile-field">
                                        <label className="guide-account-profile-label">{t('guideAccount.profile.serviceTypes')}</label>
                                        <p className="guide-account-profile-value">
                                            {profile.service_types?.length > 0
                                                ? profile.service_types.map(id => serviceTypes.find(st => st.id === id)?.name).filter(Boolean).join(', ')
                                                : t('guideAccount.profile.notSet')}
                                        </p>
                                    </div>
                                    <div className="guide-account-profile-field">
                                        <label className="guide-account-profile-label">{t('guideAccount.profile.hourlyRate')}</label>
                                        <p className="guide-account-profile-value">
                                            {profile.hourly_rate ? `${profile.hourly_rate} ${profile.currency}` : t('guideAccount.profile.notSet')}
                                        </p>
                                    </div>
                                    <div className="guide-account-profile-field">
                                        <label className="guide-account-profile-label">{t('guideAccount.profile.dailyRate')}</label>
                                        <p className="guide-account-profile-value">
                                            {profile.daily_rate ? `${profile.daily_rate} ${profile.currency}` : t('guideAccount.profile.notSet')}
                                        </p>
                                    </div>
                                    <div className="guide-account-profile-field">
                                        <label className="guide-account-profile-label">{t('guideAccount.profile.languages')}</label>
                                        <p className="guide-account-profile-value">
                                            {profile.languages?.length > 0
                                                ? profile.languages.map(id => languages.find(lang => lang.id === id)?.name).filter(Boolean).join(', ')
                                                : t('guideAccount.profile.notSet')}
                                        </p>
                                    </div>
                                    <div className="guide-account-profile-field">
                                        <label className="guide-account-profile-label">{t('guideAccount.profile.availability')}</label>
                                        <p className="guide-account-profile-value">
                                            {profile.is_available ? t('guideAccount.profile.available') : t('guideAccount.profile.notAvailable')}
                                        </p>
                                    </div>
                                    <div className="guide-account-profile-field">
                                        <label className="guide-account-profile-label">{t('guideAccount.profile.avatar')}</label>
                                        {avatarUrl ? (
                                            <div>
                                                <img
                                                    src={avatarUrl}
                                                    alt="Avatar"
                                                    className="guide-account-avatar-preview"
                                                    style={{ width: '100px', height: '100px', borderRadius: '50%' }}
                                                />
                                                <button
                                                    className="guide-account-btn guide-account-btn-danger"
                                                    onClick={handleAvatarDelete}
                                                    style={{ marginLeft: '10px' }}
                                                    disabled={uploadingAvatar}
                                                >
                                                    {t('guideAccount.profile.deleteAvatar')}
                                                </button>
                                            </div>
                                        ) : (
                                            <div>
                                                <p className="guide-account-profile-value">{t('guideAccount.profile.noAvatar')}</p>
                                                <input
                                                    type="file"
                                                    className="guide-account-file-input"
                                                    accept="image/*"
                                                    onChange={handleAvatarUpload}
                                                    disabled={uploadingAvatar}
                                                />
                                                {uploadingAvatar && <p>{t('guideAccount.profile.uploading')}</p>}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                {activeTab === 'bookings' && (
                    <div className="guide-account-bookings">
                        <h3 className="guide-account-section-title">{t('guideAccount.bookings.myBookings')}</h3>
                        <div className="guide-account-bookings-filters">
                            <select
                                className="guide-account-filter-select"
                                value={bookingFilter}
                                onChange={(e) => handleBookingFilterChange(e.target.value)}
                            >
                                <option value="all">{t('guideAccount.bookings.allStatuses')}</option>
                                <option value="pending">{t('guideAccount.bookings.pending')}</option>
                                <option value="accepted">{t('guideAccount.bookings.accepted')}</option>
                                <option value="cancelled">{t('guideAccount.bookings.cancelled')}</option>
                            </select>
                        </div>
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
                {activeTab === 'unavailability' && (
                    <div className="guide-account-unavailability">
                        <div className="guide-account-unavailability-header">
                            <h3 className="guide-account-section-title">{t('guideAccount.unavailability.myUnavailability')}</h3>
                            <button
                                className="guide-account-btn guide-account-btn-primary"
                                onClick={() => setShowUnavailabilityForm(true)}
                            >
                                {t('guideAccount.unavailability.addUnavailability')}
                            </button>
                        </div>
                        {showUnavailabilityForm && (
                            <div className="guide-account-unavailability-form">
                                <h4 className="guide-account-form-title">
                                    {editingUnavailability ? t('guideAccount.unavailability.editUnavailability') : t('guideAccount.unavailability.createUnavailability')}
                                </h4>
                                <form onSubmit={handleUnavailabilitySubmit} className="guide-account-form">
                                    <div className="guide-account-form-row">
                                        <div className="guide-account-form-group">
                                            <label className="guide-account-label">{t('guideAccount.unavailability.startDate')}</label>
                                            <input
                                                type="date"
                                                className="guide-account-input"
                                                value={unavailabilityForm.start_date}
                                                onChange={(e) => setUnavailabilityForm({ ...unavailabilityForm, start_date: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="guide-account-form-group">
                                            <label className="guide-account-label">{t('guideAccount.unavailability.endDate')}</label>
                                            <input
                                                type="date"
                                                className="guide-account-input"
                                                value={unavailabilityForm.end_date}
                                                onChange={(e) => setUnavailabilityForm({ ...unavailabilityForm, end_date: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="guide-account-form-group">
                                        <label className="guide-account-label">{t('guideAccount.unavailability.reason')}</label>
                                        <textarea
                                            className="guide-account-textarea"
                                            value={unavailabilityForm.reason}
                                            onChange={(e) => setUnavailabilityForm({ ...unavailabilityForm, reason: e.target.value })}
                                            placeholder={t('guideAccount.unavailability.reasonPlaceholder')}
                                            rows="3"
                                        />
                                    </div>
                                    <div className="guide-account-form-actions">
                                        <button type="submit" className="guide-account-btn guide-account-btn-primary">
                                            {editingUnavailability ? t('guideAccount.unavailability.updateUnavailability') : t('guideAccount.unavailability.createUnavailability')}
                                        </button>
                                        <button
                                            type="button"
                                            className="guide-account-btn guide-account-btn-secondary"
                                            onClick={() => {
                                                setShowUnavailabilityForm(false);
                                                setEditingUnavailability(null);
                                                setUnavailabilityForm({ start_date: '', end_date: '', reason: '' });
                                            }}
                                        >
                                            {t('guideAccount.unavailability.cancel')}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}
                        <div className="guide-account-unavailability-list">
                            {unavailability.map(item => (
                                <div key={item.id} className="guide-account-unavailability-item">
                                    <div className="guide-account-unavailability-info">
                                        <h4 className="guide-account-unavailability-dates">
                                            {t('guideAccount.unavailability.dates', {
                                                start: new Date(item.start_date).toLocaleDateString(),
                                                end: new Date(item.end_date).toLocaleDateString()
                                            })}
                                        </h4>
                                        <p className="guide-account-unavailability-reason">
                                            {t('guideAccount.unavailability.reason')}: {item.reason || t('guideAccount.unavailability.noReason')}
                                        </p>
                                    </div>
                                    <div className="guide-account-unavailability-actions">
                                        <button
                                            className="guide-account-btn guide-account-btn-small"
                                            onClick={() => {
                                                setEditingUnavailability(item);
                                                setUnavailabilityForm({
                                                    start_date: item.start_date,
                                                    end_date: item.end_date,
                                                    reason: item.reason || ''
                                                });
                                                setShowUnavailabilityForm(true);
                                            }}
                                        >
                                            {t('guideAccount.unavailability.edit')}
                                        </button>
                                        <button
                                            className="guide-account-btn guide-account-btn-small guide-account-btn-danger"
                                            onClick={() => handleDeleteUnavailability(item.id)}
                                        >
                                            {t('guideAccount.unavailability.delete')}
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
                                                {t('guideAccount.reviews.date')}: {new Date(review.created_at).toLocaleDateString()}
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