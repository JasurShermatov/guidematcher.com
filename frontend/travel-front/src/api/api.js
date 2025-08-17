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
  api.get("profiles/").then((r) => r.data);

export const updateUserProfile = (payload) =>
  api.patch("profiles/", payload).then((r) => ({
    id: r.data.id,
    first_name: r.data.first_name,
    last_name: r.data.last_name,
    email: r.data.email,
    role: r.data.role,
    bio: r.data.bio,
    experience: r.data.experience,
    price_per_hour: r.data.price_per_hour,
    price_per_day: r.data.price_per_day,
    work_hours: r.data.work_hours,
  }));

export const requestPasswordReset = (data) =>
  api.post("accounts/forgot-password/", data).then((r) => r.data);

export const confirmPasswordReset = (payload) =>
  api.post("accounts/reset-password/", payload).then((r) => r.data);

export default api;