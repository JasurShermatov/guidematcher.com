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

// ---- Response: 401 bo'lsa refresh qilib qayta yuborish (yoki public GETni authsiz qayta sinash)
let refreshingPromise = null;

api.interceptors.response.use(
    (res) => res,
    async (error) => {
        const original = error.config;

        // Tarmoq xatosi yoki 401 emas -> odatdagidek qaytarish
        if (!error.response || error.response.status !== 401 || original._retry) {
            return Promise.reject(error);
        }

        original._retry = true;

        // Bir vaqtning o'zida bitta refresh ishlasin
        if (!refreshingPromise) {
            const refreshToken = getRefresh();
            refreshingPromise = (async () => {
                if (!refreshToken) throw new Error("No refresh token");
                const { data } = await axios.post(
                    `${API_BASE}token/refresh/`,
                    { refresh: refreshToken },
                    { headers: { "Content-Type": "application/json" } }
                );
                // accessni yangilash, refresh ham kelsa yangilash
                setTokens({ access: data.access, refresh: data.refresh });
                return data.access;
            })()
                .catch((e) => {
                    clearTokens();
                    return null; // muhim: refresh bo'lmadi -> null qaytaramiz
                })
                .finally(() => {
                    refreshingPromise = null;
                });
        }

        const newAccess = await refreshingPromise;

        // 1) Refresh muvaffaqiyatli bo'lsa — originalni yangilangan token bilan yuboramiz
        if (newAccess) {
            original.headers = { ...(original.headers || {}), Authorization: `Bearer ${newAccess}` };
            return api(original);
        }

        // 2) Refresh bo'lmadi (token yo'q/eskirgan) — PUBLIC GET bo'lsa, Authorization’siz qayta yuboramiz
        const method = (original.method || "get").toLowerCase();
        if (method === "get") {
            const retried = { ...original };
            // Headerlardan Authorization’ni olib tashlaymiz
            if (retried.headers) {
                delete retried.headers.Authorization;
            }
            // Qayta yuborish — bu safar oddiy guest sifatida
            try {
                return await api(retried);
            } catch (e2) {
                return Promise.reject(e2);
            }
        }

        // 3) Aks holda — xato qaytariladi
        return Promise.reject(error);
    }
);

export default api;
export { getAccess, getRefresh, setTokens, clearTokens };
