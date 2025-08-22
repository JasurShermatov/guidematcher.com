import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000/api/v1/";

const api = axios.create({
    baseURL: API_URL,
    headers: { "Content-Type": "application/json" },
    withCredentials: false, // CORS uchun false
});

// Tokenni avtomatik qo'shish
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

// Token muddati tugasa, refresh qilish
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

        // Xabar extract qilish
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

// ─── Auth & Accounts APIs ──────────────────────────────────────────
export const requestCode = (data) => {
    console.log("Requesting verification code for:", data.email);
    return api.post("accounts/request-code/", data).then((r) => r.data);
};

export const registerUser = (data) => {
    console.log("Registering user:", { ...data, password: "***" });
    return api.post("accounts/register/", data).then((r) => ({
        access: r.data.access_token,
        refresh: r.data.refresh_token,
        user: r.data.user,
    }));
};

export const loginUser = (payload) => {
    console.log("Logging in user:", { ...payload, password: "***" });
    return api.post("accounts/login/", payload).then((r) => ({
        access: r.data.access_token,
        refresh: r.data.refresh_token,
        user: r.data.user,
    }));
};

export const logoutUser = () => {
    const refreshToken = localStorage.getItem("refresh_token");
    console.log("Logging out user");

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
            console.error("Logout error:", error);
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            return { detail: "Logged out" };
        });
};

export const refreshToken = () =>
    api
        .post("token/refresh/", {
            refresh: localStorage.getItem("refresh_token"),
        })
        .then((r) => {
            const newToken = r.data.access_token || r.data.access;
            localStorage.setItem("access_token", newToken);
            return r.data;
        });

export const requestPasswordReset = (data) =>
    api.post("accounts/forgot-password/", data).then((r) => r.data);

export const confirmPasswordReset = (payload) =>
    api.post("accounts/reset-password/", payload).then((r) => r.data);

// ─── Users APIs ────────────────────────────────────────────────────
export const googleLogin = (data) =>
    api.post("auth/google/", data).then((r) => ({
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
    console.log("Getting current user info...");
    return api.get("auth/users/short/").then((r) => r.data);
};

export const getCurrentUserShort = () => {
    console.log("Getting current user short info...");
    return api.get("auth/users/short/").then((r) => r.data);
};

export const getCustomerProfileByUserId = (userId) =>
    api.get(`auth/profiles/customers/${userId}/`).then((r) => r.data);

// ─── Client Profile APIs ───────────────────────────────────────────
// ✅ O'ZGARTIRILDI: `my/` emas, barcha profillar orasidan topish
export const getClientProfile = () => {
    console.log("Fetching client profiles list to find current user...");
    return api.get("profiles/clients/").then((r) => {
        const profiles = r.data?.results || r.data || [];
        // Joriy foydalanuvchining tokendagi user bilan solishtirish
        // Eslatma: bu yerda `user.id` `UserAccount` komponentidan keladi
        // Shu sababli, `getClientProfile` faqat `profiles/clients/` qaytarguncha ishlaydi
        return profiles.length > 0 ? profiles[0] : null;
    });
};

export const createClientProfile = (payload) => {
    console.log("Creating client profile:", payload);
    return api.post("profiles/clients/", payload).then((r) => r.data);
};

export const updateClientProfile = (payload) => {
    console.log("Updating client profile:", payload);
    // Agar `my/` bo'lmasa, `PUT/PATCH` bevosita `profiles/clients/{id}/` ga qilinadi
    // Lekin hozircha `my/`ni ishlatmaymiz, shuning uchun `update` ham `list`dan `id` oladi
    return api.patch("profiles/clients/my/", payload).then((r) => r.data);
};

export const getClientProfileById = (userId) =>
    api.get(`profiles/clients/${userId}/`).then((r) => r.data);

export const getClientProfiles = (params = {}) =>
    api.get("profiles/clients/", { params }).then((r) => r.data);

// ─── Customer Profile APIs ─────────────────────────────────────────
// ✅ Xuddi shunday `my/` emas, `GET /profiles/customers/` dan topish
export const getCustomerProfile = () => {
    console.log("Fetching customer profiles list...");
    return api.get("profiles/customers/").then((r) => {
        const profiles = r.data?.results || r.data || [];
        return profiles.length > 0 ? profiles[0] : null;
    });
};

export const createCustomerProfile = (payload) => {
    console.log("Creating customer profile:", payload);
    return api.post("profiles/customers/", payload).then((r) => r.data);
};

export const updateCustomerProfile = (payload) => {
    console.log("Updating customer profile:", payload);
    return api.patch("profiles/customers/my/", payload).then((r) => r.data);
};

export const updateUserProfile = (payload) => {
    console.log("Updating user profile:", payload);
    return api.patch("profiles/customers/my/", payload).then((r) => r.data);
};

export const getCustomerProfiles = (params = {}) =>
    api.get("profiles/customers/", { params }).then((r) => r.data);

export const getCustomerProfileById = (userId) =>
    api.get(`profiles/customers/${userId}/`).then((r) => r.data);

// ─── Portfolio APIs ────────────────────────────────────────────────
export const getMyPortfolio = () => {
    console.log("Getting my portfolio...");
    return api.get("profiles/portfolios/my/").then((r) => r.data);
};

export const getPortfolioById = (id) =>
    api.get(`profiles/portfolios/${id}/`).then((r) => r.data);

export const createPortfolioItem = (payload) => {
    console.log("Creating portfolio item...");
    return api.post("profiles/portfolios/", payload, {
        headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data);
};

export const updatePortfolioItem = (id, payload) => {
    console.log("Updating portfolio item:", id);
    return api.patch(`profiles/portfolios/${id}/`, payload, {
        headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data);
};

export const deletePortfolioItem = (id) => {
    console.log("Deleting portfolio item:", id);
    return api.delete(`profiles/portfolios/${id}/`).then((r) => r.data);
};

export const getPortfolios = (params = {}) =>
    api.get("profiles/portfolios/", { params }).then((r) => r.data);

// ─── Availability APIs ─────────────────────────────────────────────
export const getMyAvailability = () => {
    console.log("Getting my availability...");
    return api.get("profiles/availabilities/my/").then((r) => r.data);
};

export const getAvailabilityById = (id) =>
    api.get(`profiles/availabilities/${id}/`).then((r) => r.data);

export const createAvailability = (payload) => {
    console.log("Creating availability:", payload);
    return api.post("profiles/availabilities/", payload).then((r) => r.data);
};

export const updateAvailability = (id, payload) => {
    console.log("Updating availability:", id, payload);
    return api.patch(`profiles/availabilities/${id}/`, payload).then((r) => r.data);
};

export const deleteAvailability = (id) => {
    console.log("Deleting availability:", id);
    return api.delete(`profiles/availabilities/${id}/`).then((r) => r.data);
};

export const getAvailabilities = (params = {}) =>
    api.get("profiles/availabilities/", { params }).then((r) => r.data);

// ─── Verification Documents APIs ───────────────────────────────────
export const getMyDocuments = () => {
    console.log("Getting my documents...");
    return api.get("profiles/verifications/my/").then((r) => r.data);
};

export const getDocumentById = (id) =>
    api.get(`profiles/verifications/${id}/`).then((r) => r.data);

export const uploadDocument = (payload) => {
    console.log("Uploading document...");
    return api.post("profiles/verifications/", payload, {
        headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data);
};

export const updateDocument = (id, payload) => {
    console.log("Updating document:", id);
    return api.patch(`profiles/verifications/${id}/`, payload, {
        headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data);
};

export const deleteDocument = (id) => {
    console.log("Deleting document:", id);
    return api.delete(`profiles/verifications/${id}/`).then((r) => r.data);
};

export const getDocuments = (params = {}) =>
    api.get("profiles/verifications/", { params }).then((r) => r.data);

// ─── Common APIs ───────────────────────────────────────────────────
export const getCountries = () => {
    console.log("Getting countries...");
    return api.get("common/countries/").then((r) => r.data);
};

export const getCountryById = (id) =>
    api.get(`common/countries/${id}/`).then((r) => r.data);

export const getCities = (countryId = null) => {
    const params = countryId ? { country: countryId } : {};
    console.log("Getting cities...", params);
    return api.get("common/cities/", { params }).then((r) => r.data);
};

export const getCityById = (id) =>
    api.get(`common/cities/${id}/`).then((r) => r.data);

export const getServiceTypes = () => {
    console.log("Getting service types...");
    return api.get("common/service-types/").then((r) => r.data);
};

export const getServiceTypeById = (id) =>
    api.get(`common/service-types/${id}/`).then((r) => r.data);

export const getLanguages = () => {
    console.log("Getting languages...");
    return api.get("common/languages/").then((r) => r.data);
};

export const getLanguageById = (id) =>
    api.get(`common/languages/${id}/`).then((r) => r.data);

// ─── Booking APIs ──────────────────────────────────────────────────
export const getGuideBookings = (status = null) => {
    const params = status ? { status } : {};
    return api.get("bookings/guide/", { params }).then((r) => r.data);
};

export const getClientBookings = (status = null) => {
    const params = status ? { status } : {};
    return api.get("bookings/client/", { params }).then((r) => r.data);
};

export const createBooking = (payload) =>
    api.post("bookings/", payload).then((r) => r.data);

export const updateBookingStatus = (id, status, data = {}) =>
    api.patch(`bookings/${id}/`, { status, ...data }).then((r) => r.data);

export const getBookingById = (id) =>
    api.get(`bookings/${id}/`).then((r) => r.data);

export const cancelBooking = (id, reason = "") =>
    api.patch(`bookings/${id}/`, { status: "cancelled", cancellation_reason: reason }).then((r) => r.data);

export const getBookings = (params = {}) =>
    api.get("bookings/", { params }).then((r) => r.data);

// ─── Reviews APIs ──────────────────────────────────────────────────
export const getGuideReviews = () =>
    api.get("reviews/guide/").then((r) => r.data);

export const getClientReviews = () =>
    api.get("reviews/client/").then((r) => r.data);

export const createReview = (payload) =>
    api.post("reviews/", payload).then((r) => r.data);

export const updateReview = (id, payload) =>
    api.patch(`reviews/${id}/`, payload).then((r) => r.data);

export const deleteReview = (id) =>
    api.delete(`reviews/${id}/`).then((r) => r.data);

export const getGuideStats = () =>
    api.get("reviews/guide/stats/").then((r) => r.data);

export const getReviews = (params = {}) =>
    api.get("reviews/", { params }).then((r) => r.data);

export const getReviewById = (id) =>
    api.get(`reviews/${id}/`).then((r) => r.data);

// ─── Chat APIs ─────────────────────────────────────────────────────
export const getGuideChats = () =>
    api.get("chat/conversations/").then((r) => r.data);

export const getClientChats = () =>
    api.get("chat/conversations/").then((r) => r.data);

export const getChatMessages = (conversationId) =>
    api.get(`chat/conversations/${conversationId}/messages/`).then((r) => r.data);

export const sendMessage = (conversationId, payload) =>
    api.post(`chat/conversations/${conversationId}/messages/`, payload).then((r) => r.data);

export const markMessagesAsRead = (conversationId) =>
    api.post(`chat/conversations/${conversationId}/mark-read/`).then((r) => r.data);

export const createConversation = (payload) =>
    api.post("chat/conversations/", payload).then((r) => r.data);

export const getConversationById = (id) =>
    api.get(`chat/conversations/${id}/`).then((r) => r.data);

export const updateConversation = (id, payload) =>
    api.patch(`chat/conversations/${id}/`, payload).then((r) => r.data);

export const deleteConversation = (id) =>
    api.delete(`chat/conversations/${id}/`).then((r) => r.data);

// ─── Notification APIs ─────────────────────────────────────────────
export const getNotifications = () =>
    api.get("notifications/").then((r) => r.data);

export const markNotificationAsRead = (id) =>
    api.patch(`notifications/${id}/`, { is_read: true }).then((r) => r.data);

export const markAllNotificationsAsRead = () =>
    api.post("notifications/mark-all-read/").then((r) => r.data);

export const deleteNotification = (id) =>
    api.delete(`notifications/${id}/`).then((r) => r.data);

export const getUnreadNotificationsCount = () =>
    api.get("notifications/unread-count/").then((r) => r.data);

// ─── File Upload Helpers ───────────────────────────────────────────
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

// ─── Utility Functions ─────────────────────────────────────────────
export const healthCheck = () =>
    api.get("health/").then((r) => r.data);

export const getAppVersion = () =>
    api.get("version/").then((r) => r.data);

export const reportBug = (payload) =>
    api.post("support/bug-report/", payload).then((r) => r.data);

export const contactSupport = (payload) =>
    api.post("support/contact/", payload).then((r) => r.data);

// Default export
export default api;