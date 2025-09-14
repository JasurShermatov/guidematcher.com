import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FiSearch, FiCalendar, FiMapPin, FiStar } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import axios from "axios";
import "./FindGuide.css";

/* ======================= Axios (inline, as requested) ======================= */
const API_URL = (process.env.REACT_APP_API_URL || "http://localhost:8000/api/v1/").replace(/\/+$/, "") + "/";
const api = axios.create({
    baseURL: API_URL,
    headers: { "Content-Type": "application/json" },
    withCredentials: false,
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("access_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

api.interceptors.response.use(
    (r) => r,
    async (error) => {
        const original = error.config || {};
        if (error?.response?.status === 401 && !original._retry) {
            original._retry = true;
            try {
                const refresh = localStorage.getItem("refresh_token");
                if (!refresh) throw new Error("No refresh token");
                const rr = await api.post("token/refresh/", { refresh });
                const newAccess = rr.data?.access_token || rr.data?.access;
                if (!newAccess) throw new Error("No access in refresh response");
                localStorage.setItem("access_token", newAccess);
                original.headers.Authorization = `Bearer ${newAccess}`;
                return api(original);
            } catch (e) {
                localStorage.removeItem("access_token");
                localStorage.removeItem("refresh_token");
                window.location.href = "/login";
                return Promise.reject(e);
            }
        }
        const msg =
            error?.response?.data?.detail ||
            error?.response?.data?.message ||
            error?.response?.data?.error ||
            error?.message ||
            "Unknown error";
        return Promise.reject(new Error(msg));
    }
);

/* ======================= Small helpers ======================= */
const BACKEND_ORIGIN = API_URL.replace(/\/api\/v1\/?$/, "");
const toAbsMedia = (url) => {
    if (!url) return "/placeholder-avatar.png";
    if (/^https?:\/\//i.test(url)) return url;
    if (url.startsWith("/media")) return BACKEND_ORIGIN + url;
    if (url.startsWith("media/")) return `${BACKEND_ORIGIN}/${url}`;
    return url;
};

/* ======================= Component ======================= */
export default function FindGuide({ user }) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();

    // filters (text-based like in UserAccount)
    const [filters, setFilters] = useState({ country: "", city: "", rating: "" });
    const [isSearching, setIsSearching] = useState(false);
    const [guides, setGuides] = useState([]);
    const [error, setError] = useState("");

    // read "auto-book" after login
    useEffect(() => {
        const { pendingBookGuideUserId } = location.state || {};
        if (user && pendingBookGuideUserId) {
            (async () => {
                try {
                    await api.post("bookings/bookings/", { customer: pendingBookGuideUserId });
                    alert(t("booking_request_sent") || "Booking created successfully");
                    navigate("/my-bookings", { replace: true });
                } catch (e) {
                    console.error(e);
                    setError(t("find_guide.errors.booking_failed") || "Failed to create booking");
                }
            })();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    // fetch all customers once; then filter on front-end (like UserAccount)
    useEffect(() => {
        let mounted = true;
        (async () => {
            setIsSearching(true);
            setError("");
            try {
                const res = await api.get("profiles/customers/");
                const list = res.data?.results || res.data || [];
                if (mounted) setGuides(Array.isArray(list) ? list : []);
            } catch (e) {
                console.error(e);
                if (mounted) setError(e.message || "Failed to load guides");
            } finally {
                if (mounted) setIsSearching(false);
            }
        })();
        return () => {
            mounted = false;
        };
    }, []);

    const filteredGuides = useMemo(() => {
        const c = (s) => String(s || "").toLowerCase().trim();
        const wantCountry = c(filters.country);
        const wantCity = c(filters.city);
        const wantMinRating = Number(filters.rating || 0);

        return guides.filter((g) => {
            const okCountry = !wantCountry || c(g.country_name).includes(wantCountry);
            const okCity = !wantCity || c(g.city_name).includes(wantCity);
            const okRate = Number(g.average_rating || 0) >= wantMinRating;
            return okCountry && okCity && okRate;
        });
    }, [guides, filters]);

    const onSubmit = (e) => {
        e.preventDefault();
        // we already filter in-memory; this just re-triggers render
        setFilters({ ...filters });
    };

    const handleBook = async (g) => {
        const guideUserId = g?.user?.id;
        if (!guideUserId) return;

        // redirect to login if not authenticated
        if (!user) {
            navigate("/login", { state: { pendingBookGuideUserId: guideUserId } });
            return;
        }

        try {
            await api.post("bookings/bookings/", { customer: guideUserId });
            alert(t("booking_request_sent") || "Booking created successfully");
            navigate("/my-bookings");
        } catch (e) {
            console.error(e);
            alert((t("booking_failed") || "Booking failed") + ": " + e.message);
        }
    };

    return (
        <div className="fg-wrapper">
            <div className="fg-panel">
                <div className="fg-header">
                    <FiSearch />
                    <span>{t("find_guides") || "Find Guides"}</span>
                </div>

                <form className="fg-filters" onSubmit={onSubmit}>
                    <div className="fg-field">
                        <label>{t("country") || "Country"}</label>
                        <input
                            placeholder={t("country") || "Country"}
                            value={filters.country}
                            onChange={(e) => setFilters((f) => ({ ...f, country: e.target.value }))}
                        />
                    </div>

                    <div className="fg-field">
                        <label>{t("city") || "City"}</label>
                        <input
                            placeholder={t("city") || "City"}
                            value={filters.city}
                            onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))}
                        />
                    </div>

                    <div className="fg-field">
                        <label>{t("min_rating") || "Minimum Rating"}</label>
                        <input
                            placeholder={t("min_rating") || "Minimum Rating"}
                            type="number"
                            min={0}
                            max={5}
                            step="0.1"
                            value={filters.rating}
                            onChange={(e) => setFilters((f) => ({ ...f, rating: e.target.value }))}
                        />
                    </div>

                    <button className="fg-search-btn" disabled={isSearching}>
                        <FiSearch /> <span>{isSearching ? (t("searching") || "Searching") : (t("search") || "Search")}</span>
                    </button>
                </form>

                {/* Results */}
                {error && <div className="fg-error">{error}</div>}

                {!error && filteredGuides.length === 0 && (
                    <div className="fg-empty">{t("no_guides_found") || "No guides found."}</div>
                )}

                <div className="fg-grid">
                    {filteredGuides.map((g) => (
                        <div key={g.id} className="fg-card">
                            <div className="fg-card-main">
                                <img
                                    className="fg-avatar"
                                    src={toAbsMedia(g.avatar)}
                                    alt={g.full_name || ""}
                                    onError={(e) => {
                                        e.currentTarget.src = "/placeholder-avatar.png";
                                    }}
                                />
                                <div className="fg-info">
                                    <div className="fg-name">{g.full_name}</div>
                                    <div className="fg-loc">
                                        <FiMapPin />
                                        <span>
                      {g.country_name}
                                            {g.city_name ? `, ${g.city_name}` : ""}
                    </span>
                                    </div>
                                    <div className="fg-rating">
                                        <FiStar />
                                        <span>{Number(g.average_rating || 0).toFixed(2)}</span>
                                        <small>({g.total_reviews || 0})</small>
                                    </div>
                                </div>
                            </div>

                            <button className="fg-book-btn" onClick={() => handleBook(g)} title={t("book") || "Book"}>
                                <FiCalendar /> <span>{t("book") || "Book"}</span>
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
