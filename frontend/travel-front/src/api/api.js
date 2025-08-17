import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://backend:8000/api/v1/";

const api = axios.create({
    baseURL: API_URL,
    headers: { "Content-Type": "application/json" },
    withCredentials: true,
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                const refreshResponse = await api.post("accounts/refresh/", {
                    refresh: localStorage.getItem("refresh_token"),
                });
                const newAccessToken = refreshResponse.data.access_token;
                localStorage.setItem("access_token", newAccessToken);
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                localStorage.removeItem("access_token");
                localStorage.removeItem("refresh_token");
                window.location.href = "/login";
                return Promise.reject(refreshError);
            }
        }

        const errorMessage =
            error.response?.data?.detail ||
            error.response?.data?.email?.[0] ||
            error.response?.data?.code?.[0] ||
            "Noma'lum xatolik yuz berdi";
        console.error("API Error Response:", error.response?.data);
        return Promise.reject(new Error(errorMessage));
    }
);

// ─── Auth & User APIs ──────────────────────────────────────────
export const requestCode = (data) =>
    api.post("accounts/request-code/", data).then((r) => r.data);

export const registerUser = (data) =>
    api.post("accounts/register/", data).then((r) => r.data);

export const loginUser = (payload) =>
    api.post("accounts/login/", payload).then((r) => ({
        access: r.data.access_token,
        refresh: r.data.refresh_token,
        user: {
            id: r.data.user.id,
            role: r.data.user.role,
            full_name: `${r.data.user.first_name} ${r.data.user.last_name}`,
            email: r.data.user.email,
            first_name: r.data.user.first_name,
            last_name: r.data.user.last_name,
            country: r.data.user.country || "",
            city: "",
        },
    }));

export const logoutUser = () =>
    api
        .post("accounts/logout/", {
            refresh: localStorage.getItem("refresh_token"),
        })
        .then((r) => {
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            return r.data;
        })
        .catch(() => {
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            return { detail: "Logged out" };
        });

export const refreshToken = () =>
    api
        .post("accounts/refresh/", {
            refresh: localStorage.getItem("refresh_token"),
        })
        .then((r) => {
            localStorage.setItem("access_token", r.data.access_token);
            return r.data;
        });

export const getCurrentUser = () =>
    api.get("auth/profile/").then((r) => r.data);

export const updateUserProfile = (payload) =>
    api.patch("auth/profile/", payload).then((r) => r.data);

export const requestPasswordReset = (data) =>
    api.post("accounts/forgot-password/", data).then((r) => r.data);

export const confirmPasswordReset = (payload) =>
    api.post("accounts/reset-password/", payload).then((r) => r.data);

export const changePassword = (payload) =>
    api.post("auth/change-password/", payload).then((r) => r.data);

// ─── Customer Profile APIs ────────────────────────────────────
export const getCustomerProfile = () =>
    api.get("profiles/customers/my/").then((r) => r.data);

export const createCustomerProfile = (payload) =>
    api.post("profiles/customers/", payload).then((r) => r.data);

export const updateCustomerProfile = (payload) =>
    api.patch("profiles/customers/my/", payload).then((r) => r.data);

export const getCustomerProfiles = (params = {}) =>
    api.get("profiles/customers/", { params }).then((r) => r.data);

export const getCustomerProfileById = (id) =>
    api.get(`profiles/customers/${id}/`).then((r) => r.data);

// ─── Portfolio APIs ────────────────────────────────────────────
export const getMyPortfolio = () =>
    api.get("profiles/portfolio/my/").then((r) => r.data);

export const createPortfolioItem = (payload) =>
    api.post("profiles/portfolio/", payload).then((r) => r.data);

export const updatePortfolioItem = (id, payload) =>
    api.patch(`profiles/portfolio/${id}/`, payload).then((r) => r.data);

export const deletePortfolioItem = (id) =>
    api.delete(`profiles/portfolio/${id}/`).then((r) => r.data);

// ─── Availability APIs ─────────────────────────────────────────
export const getMyAvailability = () =>
    api.get("profiles/availability/my/").then((r) => r.data);

export const createAvailability = (payload) =>
    api.post("profiles/availability/", payload).then((r) => r.data);

export const updateAvailability = (id, payload) =>
    api.patch(`profiles/availability/${id}/`, payload).then((r) => r.data);

export const deleteAvailability = (id) =>
    api.delete(`profiles/availability/${id}/`).then((r) => r.data);

// ─── Verification Documents APIs ───────────────────────────────
export const getMyDocuments = () =>
    api.get("profiles/documents/my/").then((r) => r.data);

export const uploadDocument = (payload) =>
    api.post("profiles/documents/", payload, {
        headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data);

export const deleteDocument = (id) =>
    api.delete(`profiles/documents/${id}/`).then((r) => r.data);

// ─── Booking APIs ──────────────────────────────────────────────
export const getGuideBookings = (status = null) => {
    const params = status ? { status } : {};
    return api.get("bookings/guide/", { params }).then((r) => r.data);
};

export const updateBookingStatus = (id, status, data = {}) =>
    api.patch(`bookings/${id}/`, { status, ...data }).then((r) => r.data);

export const getBookingById = (id) =>
    api.get(`bookings/${id}/`).then((r) => r.data);

// ─── Reviews APIs ──────────────────────────────────────────────
export const getGuideReviews = () =>
    api.get("reviews/guide/").then((r) => r.data);

export const getGuideStats = () =>
    api.get("reviews/guide/stats/").then((r) => r.data);

// ─── Chat APIs ─────────────────────────────────────────────────
export const getGuideChats = () =>
    api.get("chat/conversations/").then((r) => r.data);

export const getChatMessages = (conversationId) =>
    api.get(`chat/conversations/${conversationId}/messages/`).then((r) => r.data);

export const sendMessage = (conversationId, payload) =>
    api.post(`chat/conversations/${conversationId}/messages/`, payload).then((r) => r.data);

export const markMessagesAsRead = (conversationId) =>
    api.post(`chat/conversations/${conversationId}/mark-read/`).then((r) => r.data);

// ─── Notification APIs ─────────────────────────────────────────
export const getNotifications = () =>
    api.get("notifications/").then((r) => r.data);

export const markNotificationAsRead = (id) =>
    api.patch(`notifications/${id}/`, { is_read: true }).then((r) => r.data);

export const markAllNotificationsAsRead = () =>
    api.post("notifications/mark-all-read/").then((r) => r.data);

// ─── Common APIs ───────────────────────────────────────────────
export const getCountries = () =>
    api.get("common/countries/").then((r) => r.data);

export const getCities = (countryId = null) => {
    const params = countryId ? { country: countryId } : {};
    return api.get("common/cities/", { params }).then((r) => r.data);
};

export const getServiceTypes = () =>
    api.get("common/service-types/").then((r) => r.data);

export const getLanguages = () =>
    api.get("common/languages/").then((r) => r.data);

export default api;