// src/api/api.js
import axios from "axios";

const API_BASE = (process.env.REACT_APP_API_URL ?? "/api/v1/").replace(/\/+$/, "/");

const api = axios.create({
    baseURL: API_BASE,
    headers: { "Content-Type": "application/json" },
});

// ---- Token helpers
const getAccess = () => localStorage.getItem("access_token");
const getRefresh = () => localStorage.getItem("refresh_token");
const setTokens = ({ access, refresh }) => {
    if (access) localStorage.setItem("access_token", access);
    if (refresh) localStorage.setItem("refresh_token", refresh);
};
const clearTokens = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
};

// ---- Request: Bearer qo'shish
api.interceptors.request.use((config) => {
    const t = getAccess();
    if (t) config.headers.Authorization = `Bearer ${t}`;
    return config;
});

// ---- Response: 401 bo'lsa refresh qilib qayta yuborish
let refreshingPromise = null;

api.interceptors.response.use(
    (res) => res,
    async (error) => {
        const original = error.config;

        // Server javobi yo'q yoki 401 emas -> odatdagidek xato
        if (!error.response || error.response.status !== 401 || original._retry) {
            return Promise.reject(error);
        }

        original._retry = true;

        // Bir vaqtning o'zida bitta refresh
        if (!refreshingPromise) {
            const refreshToken = getRefresh();
            refreshingPromise = (async () => {
                if (!refreshToken) throw new Error("No refresh token");
                const { data } = await axios.post(`${API_BASE}token/refresh/`, { refresh: refreshToken }, {
                    headers: { "Content-Type": "application/json" },
                });
                // accessni yangila, refresh ham kelsa yangila
                setTokens({ access: data.access, refresh: data.refresh });
                return data.access;
            })().catch((e) => {
                clearTokens();
                throw e;
            }).finally(() => {
                // queue tugagach nolga qaytariladi
                refreshingPromise = null;
            });
        }

        // refresh tugashini kutamiz, so'ng original requestni qayta yuboramiz
        const newAccess = await refreshingPromise;
        original.headers.Authorization = `Bearer ${newAccess}`;
        return api(original);
    }
);

export default api;
export { getAccess, getRefresh, setTokens, clearTokens };
