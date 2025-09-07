// src/api.js
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000/api/v1/";

const api = axios.create({
    baseURL: API_URL,
    withCredentials: false,
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("access_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    // FormData bo‘lsa browser o‘zi boundary qo‘yadi — header qo‘ymaymiz
    return config;
});

api.interceptors.response.use(
    (r) => r,
    async (error) => {
        const originalRequest = error.config || {};
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                const refreshToken = localStorage.getItem("refresh_token");
                if (!refreshToken) throw new Error("No refresh token");

                // Sizning backend: /api/v1/token/refresh/
                const { data } = await axios.post(`${API_URL}token/refresh/`, {
                    refresh: refreshToken,
                });

                const newAccess =
                    data.access_token || data.access; // DRF SimpleJWT naming
                localStorage.setItem("access_token", newAccess);
                originalRequest.headers = {
                    ...(originalRequest.headers || {}),
                    Authorization: `Bearer ${newAccess}`,
                };
                return api(originalRequest);
            } catch (e) {
                localStorage.removeItem("access_token");
                localStorage.removeItem("refresh_token");
                window.location.href = "/login";
                throw e;
            }
        }
        throw error;
    }
);

export default api;