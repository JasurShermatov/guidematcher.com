import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000/api/v1/";

const api = axios.create({
    baseURL: API_URL,
    headers: { "Content-Type": "application/json" },
    withCredentials: false,
});

// Token refresh loop prevention
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

// Auto add token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Token refresh on 401
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (originalRequest.url && originalRequest.url.includes('token/refresh/')) {
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            setTimeout(() => {
                window.location.href = "/login";
            }, 1000);
            return Promise.reject(error);
        }

        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then(token => {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    return api(originalRequest);
                }).catch(err => {
                    return Promise.reject(err);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            const refreshToken = localStorage.getItem("refresh_token");

            if (!refreshToken) {
                processQueue(new Error("No refresh token"), null);
                localStorage.removeItem("access_token");
                localStorage.removeItem("refresh_token");
                setTimeout(() => {
                    window.location.href = "/login";
                }, 1000);
                return Promise.reject(new Error("No refresh token available"));
            }

            try {
                const refreshResponse = await axios.post(`${API_URL}token/refresh/`, {
                    refresh: refreshToken,
                }, {
                    headers: {
                        "Content-Type": "application/json",
                    },
                    timeout: 10000,
                });

                const newAccessToken = refreshResponse.data.access || refreshResponse.data.access_token;

                if (!newAccessToken) {
                    throw new Error("No access token received from refresh endpoint");
                }

                localStorage.setItem("access_token", newAccessToken);
                processQueue(null, newAccessToken);
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                return api(originalRequest);

            } catch (refreshError) {
                processQueue(refreshError, null);
                localStorage.removeItem("access_token");
                localStorage.removeItem("refresh_token");
                setTimeout(() => {
                    window.location.href = "/login";
                }, 1000);
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
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

// Auth & Accounts APIs
export const requestCode = (data) => {
    return api.post("accounts/request-code/", data).then((r) => r.data);
};

export const registerUser = (data) => {
    return api.post("accounts/register/", data).then((r) => ({
        access: r.data.access_token,
        refresh: r.data.refresh_token,
        user: r.data.user,
    }));
};

export const loginUser = (payload) => {
    return api.post("accounts/login/", payload).then((r) => ({
        access: r.data.access_token,
        refresh: r.data.refresh_token,
        user: r.data.user,
    }));
};

export const logoutUser = () => {
    const refreshToken = localStorage.getItem("refresh_token");
    return api
        .post("accounts/logout/", {
            refresh: refreshToken,
        })
        .then((r) => {
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            return r.data;
        })
        .catch((error) => {
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            return { detail: "Logged out" };
        });
};

export const refreshToken = () => {
    const refreshToken = localStorage.getItem("refresh_token");
    return axios.post(`${API_URL}token/refresh/`, {
        refresh: refreshToken,
    }, {
        headers: {
            "Content-Type": "application/json",
        },
        timeout: 10000,
    }).then((r) => {
        const newToken = r.data.access_token || r.data.access;
        localStorage.setItem("access_token", newToken);
        return r.data;
    });
};

export const requestPasswordReset = (data) =>
    api.post("accounts/forgot-password/", data).then((r) => r.data);

export const confirmPasswordReset = (payload) =>
    api.post("accounts/reset-password/", payload).then((r) => r.data);

// Users APIs
export const googleLogin = (data) =>
    api.post("auth/auth/google/", data).then((r) => ({
        access: r.data.access,
        refresh: r.data.refresh,
    }));

export const getUsers = (params = {}) =>
    api.get("auth/users/", { params }).then((r) => r.data);

export const getUserById = (id) =>
    api.get(`auth/users/${id}/`).then((r) => r.data);

export const createUser = (payload) =>
    api.post("auth/users/", payload).then((r) => r.data);

export const updateUser = (id, payload) =>
    api.put(`auth/users/${id}/`, payload).then((r) => r.data);

export const partialUpdateUser = (id, payload) =>
    api.patch(`auth/users/${id}/`, payload).then((r) => r.data);

export const deleteUser = (id) =>
    api.delete(`auth/users/${id}/`).then((r) => r.data);

export const getCurrentUser = () => {
    return api.get("auth/users/short/").then((r) => r.data);
};

export const getCurrentUserShort = () => {
    return api.get("auth/users/short/").then((r) => r.data);
};

export const getCustomerProfileByUserId = (userId) =>
    api.get(`profiles/customers/${userId}/`).then((r) => r.data);

// Common APIs
export const getCountries = () => {
    return api.get("common/countries/").then((r) => r.data);
};

export const getCountryById = (id) =>
    api.get(`common/countries/${id}/`).then((r) => r.data);

export const getCities = (countryId = null) => {
    const params = countryId ? { country: countryId } : {};
    return api.get("common/cities/", { params }).then((r) => r.data);
};

export const getCityById = (id) =>
    api.get(`common/cities/${id}/`).then((r) => r.data);

export const getServiceTypes = () => {
    return api.get("common/service-types/").then((r) => r.data);
};

export const getServiceTypeById = (id) =>
    api.get(`common/service-types/${id}/`).then((r) => r.data);

export const getLanguages = () => {
    return api.get("common/languages/").then((r) => r.data);
};

export const getLanguageById = (id) =>
    api.get(`common/languages/${id}/`).then((r) => r.data);

// Profile APIs - Client Profile
export const getClientProfile = () => {
    return api.get("profiles/clients/my/").then((r) => r.data);
};

export const createClientProfile = (payload) => {
    return api.post("profiles/clients/", payload).then((r) => r.data);
};

export const updateClientProfile = (payload) => {
    return api.patch("profiles/clients/my/", payload).then((r) => r.data);
};

export const getClientProfileById = (userId) =>
    api.get(`profiles/clients/${userId}/`).then((r) => r.data);

export const getClientProfiles = (params = {}) =>
    api.get("profiles/clients/", { params }).then((r) => r.data);

// Profile APIs - Customer Profile
export const getCustomerProfile = () => {
    return api.get("profiles/customers/my/").then((r) => r.data);
};

export const createCustomerProfile = (payload) => {
    return api.post("profiles/customers/", payload).then((r) => r.data);
};

export const updateCustomerProfile = (payload) => {
    return api.patch("profiles/customers/my/", payload).then((r) => r.data);
};

// FIXED: Customer profiles API call for finding guides
export const getCustomerProfiles = (params = {}) => {
    // Clean up parameters - remove empty values
    const cleanParams = {};
    Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
            cleanParams[key] = params[key];
        }
    });

    console.log('API: Requesting customer profiles with params:', cleanParams);

    return api.get("profiles/customers/", { params: cleanParams })
        .then((r) => {
            console.log('API: Customer profiles response:', r.data);
            return r.data;
        })
        .catch((error) => {
            console.error('API: Error fetching customer profiles:', error);
            throw error;
        });
};

export const getCustomerProfileById = (userId) =>
    api.get(`profiles/customers/${userId}/`).then((r) => r.data);

export const getCustomerPortfolio = (userId, params = {}) =>
    api.get(`profiles/customers/${userId}/portfolio/`, { params }).then((r) => r.data);

// Portfolio APIs
export const getMyPortfolio = () => {
    return api.get("profiles/portfolios/my/").then((r) => r.data);
};

export const getPortfolioById = (id) =>
    api.get(`profiles/portfolios/${id}/`).then((r) => r.data);

export const createPortfolioItem = (payload) => {
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

export const updatePortfolioItem = (id, payload) => {
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

export const deletePortfolioItem = (id) => {
    return api.delete(`profiles/portfolios/${id}/`).then((r) => r.data);
};

export const getPortfolios = (params = {}) =>
    api.get("profiles/portfolios/", { params }).then((r) => r.data);

// Availability APIs
export const getMyAvailability = () => {
    return api.get("profiles/availabilities/my/").then((r) => r.data);
};

export const getAvailabilityById = (id) =>
    api.get(`profiles/availabilities/${id}/`).then((r) => r.data);

export const createAvailability = (payload) => {
    return api.post("profiles/availabilities/", payload).then((r) => r.data);
};

export const updateAvailability = (id, payload) => {
    return api.patch(`profiles/availabilities/${id}/`, payload).then((r) => r.data);
};

export const deleteAvailability = (id) => {
    return api.delete(`profiles/availabilities/${id}/`).then((r) => r.data);
};

export const getAvailabilities = (params = {}) =>
    api.get("profiles/availabilities/", { params }).then((r) => r.data);

// Verification Documents APIs
export const getMyDocuments = () => {
    return api.get("profiles/verifications/my/").then((r) => r.data);
};

export const getDocumentById = (id) =>
    api.get(`profiles/verifications/${id}/`).then((r) => r.data);

export const uploadDocument = (payload) => {
    const formData = new FormData();
    Object.keys(payload).forEach(key => {
        if (payload[key] !== null && payload[key] !== undefined) {
            formData.append(key, payload[key]);
        }
    });
    return api.post("profiles/verifications/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data);
};

export const updateDocument = (id, payload) => {
    const formData = new FormData();
    Object.keys(payload).forEach(key => {
        if (payload[key] !== null && payload[key] !== undefined) {
            formData.append(key, payload[key]);
        }
    });
    return api.patch(`profiles/verifications/${id}/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data);
};

export const deleteDocument = (id) => {
    return api.delete(`profiles/verifications/${id}/`).then((r) => r.data);
};

export const getDocuments = (params = {}) =>
    api.get("profiles/verifications/", { params }).then((r) => r.data);

// Booking APIs
export const getMyBookings = (params = {}) => {
    return api.get("bookings/bookings/", { params }).then((r) => r.data);
};

export const createBooking = (payload) => {
    return api.post("bookings/bookings/", payload).then((r) => r.data);
};

export const getBookingById = (id) =>
    api.get(`bookings/bookings/${id}/`).then((r) => r.data);

export const updateBooking = (id, payload) =>
    api.patch(`bookings/bookings/${id}/`, payload).then((r) => r.data);

export const deleteBooking = (id) =>
    api.delete(`bookings/bookings/${id}/`).then((r) => r.data);

export const acceptBooking = (id, payload) => {
    return api.post(`bookings/bookings/${id}/accept/`, payload).then((r) => r.data);
};

export const updateBookingDates = (id, payload) => {
    return api.post(`bookings/bookings/${id}/update_dates/`, payload).then((r) => r.data);
};

export const cancelBooking = (id, payload) => {
    return api.post(`bookings/bookings/${id}/cancel/`, payload).then((r) => r.data);
};

export const searchCustomers = (params = {}) => {
    return api.get("bookings/bookings/search_customers/", { params }).then((r) => r.data);
};

export const getMySchedule = (params = {}) => {
    return api.get("bookings/bookings/my_schedule/", { params }).then((r) => r.data);
};

export const getBookings = (params = {}) =>
    api.get("bookings/bookings/", { params }).then((r) => r.data);

// Reviews APIs
export const getMyReviews = () => {
    return api.get("reviews/my_reviews/").then((r) => r.data);
};

export const createReview = (bookingId, payload) => {
    return api.post(`reviews/?booking_id=${bookingId}`, payload).then((r) => r.data);
};

export const updateReview = (id, payload) => {
    return api.patch(`reviews/${id}/`, payload).then((r) => r.data);
};

export const deleteReview = (id) => {
    return api.delete(`reviews/${id}/`).then((r) => r.data);
};

export const getReviews = (params = {}) =>
    api.get("reviews/", { params }).then((r) => r.data);

export const getReviewById = (id) =>
    api.get(`reviews/${id}/`).then((r) => r.data);

export const getCustomerReviews = (customerId, params = {}) =>
    api.get(`reviews/customer/${customerId}/`, { params }).then((r) => r.data);

export const canReviewBooking = (bookingId) =>
    api.get(`reviews/can-review/${bookingId}/`).then((r) => r.data);

// Chat APIs
export const getConversations = () => {
    return api.get("chat/conversations/").then((r) => r.data);
};

export const getConversationById = (id) =>
    api.get(`chat/conversations/${id}/`).then((r) => r.data);

export const createConversation = (payload) => {
    return api.post("chat/conversations/", payload).then((r) => r.data);
};

export const getChatMessages = (conversationId, params = {}) => {
    return api.get(`chat/conversations/${conversationId}/messages/`, { params }).then((r) => r.data);
};

export const sendMessage = (payload) => {
    return api.post("chat/messages/send/", payload).then((r) => r.data);
};

export const markMessagesAsRead = (conversationId) => {
    return api.post(`chat/conversations/${conversationId}/mark-read/`).then((r) => r.data);
};

export const acceptBookingInChat = (conversationId, bookingId, payload) => {
    return api.post(`chat/conversations/${conversationId}/bookings/${bookingId}/accept/`, payload).then((r) => r.data);
};

export const updateBookingInChat = (conversationId, bookingId, payload) => {
    return api.post(`chat/conversations/${conversationId}/bookings/${bookingId}/update/`, payload).then((r) => r.data);
};

export const cancelBookingInChat = (conversationId, bookingId, payload) => {
    return api.post(`chat/conversations/${conversationId}/bookings/${bookingId}/cancel/`, payload).then((r) => r.data);
};

export const blockUser = (userId, payload = {}) => {
    return api.post(`chat/users/block/${userId}/`, payload).then((r) => r.data);
};

export const unblockUser = (userId) => {
    return api.post(`chat/users/unblock/${userId}/`).then((r) => r.data);
};

export const getBlockedUsers = () =>
    api.get("chat/blocked/").then((r) => r.data);

export const getUnreadCount = () =>
    api.get("chat/unread-count/").then((r) => r.data);

export const searchUsers = (query) => {
    return api.get("chat/users/search/", { params: { q: query } }).then((r) => r.data);
};

export const messageAction = (messageId, action) => {
    return api.post(`chat/messages/${messageId}/action/`, { action }).then((r) => r.data);
};

// File Upload Helpers
export const uploadFile = (file, path = "general") => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("path", path);
    return api.post("upload/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data);
};

export const uploadAvatar = (file) => {
    const formData = new FormData();
    formData.append("avatar", file);
    return api.patch("auth/users/avatar/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data);
};

export const deleteFile = (fileUrl) =>
    api.delete("upload/delete/", { data: { file_url: fileUrl } }).then((r) => r.data);

// Utility Functions
export const healthCheck = () =>
    api.get("health/").then((r) => r.data);

export const getAppVersion = () =>
    api.get("version/").then((r) => r.data);

export const reportBug = (payload) =>
    api.post("support/bug-report/", payload).then((r) => r.data);

export const contactSupport = (payload) =>
    api.post("support/contact/", payload).then((r) => r.data);

export default api;