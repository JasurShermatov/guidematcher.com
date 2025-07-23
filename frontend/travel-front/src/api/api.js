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
        const newAccessToken = refreshResponse.data.access;
        localStorage.setItem("access_token", newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        window.location.href = "/auth";
        return Promise.reject(refreshError);
      }
    }

    const errorMessage =
      error.response?.data?.detail ||
      Object.values(error.response?.data || {}).flat()[0] ||
      "Noma'lum xatolik yuz berdi";
    console.error("API Error Response:", error.response?.data);
    return Promise.reject(new Error(errorMessage));
  }
);

/* 🔄 AUTH ENDPOINTLAR */
export const requestCode = (data) =>
  api.post("accounts/request-code/", data).then((r) => r.data);

export const registerUser = (payload) =>
  api.post("accounts/register/", payload).then((r) => r.data);

export const loginUser = (payload) =>
  api.post("accounts/login/", payload).then((r) => {
    localStorage.setItem("access_token", r.data.access);
    localStorage.setItem("refresh_token", r.data.refresh);
    return r.data;
  });

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
    .catch((error) => {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      return Promise.resolve({ detail: "Logged out" });
    });

export const refreshToken = () =>
  api
    .post("accounts/refresh/", {
      refresh: localStorage.getItem("refresh_token"),
    })
    .then((r) => {
      localStorage.setItem("access_token", r.data.access);
      return r.data;
    });

export default api;