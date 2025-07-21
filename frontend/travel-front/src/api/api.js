// frontend/travel-front/src/api/api.js
import axios from "axios";

const API_URL =
  process.env.REACT_APP_API_URL || "http://localhost:8000/api/v1/";

/* asosiy instansiya */
const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/* 🔄  AUTH ENDPOINTLAR  ──────────────────────────────── */
export const requestCode = (email) =>
  api.post("accounts/request-code/", { email }).then((r) => r.data);

// Yangi qo'shilgan qator
export const registerUser = (payload) =>
  api.post("accounts/register/", payload).then((r) => r.data);

// export const verifyCode = (payload) =>
//    api.post("accounts/register/", payload).then((r) => r.data);

export const loginUser = (payload) =>
  api.post("accounts/login/", payload).then((r) => r.data);

export const logoutUser = () =>
  api
    .post("accounts/logout/", {
      refresh: localStorage.getItem("refresh_token"),
    })
    .then((r) => {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      return r.data;
    });

/* 🔄  Token yangilash — backend-dagi /accounts/refresh/ yo‘li bilan */
export const refreshToken = () =>
  api
    .post("accounts/refresh/", {
      refresh: localStorage.getItem("refresh_token"),
    })
    .then((r) => {
      localStorage.setItem("access_token", r.data.access);
      return r.data;
    });

/* 🔄  Kodni tasdiqlash: backend Register endpointiga code + email + password … */
// verifyCode alias -> accounts/register/
export const verifyCode = (payload) =>
  api.post("accounts/register/", payload).then((r) => r.data);

export default api;
