// src/UserAccount.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import api from "./api";
import ChatWidgets from "./ChatWidgets";
import "./UserAccount.css";
import {
    FiMessageSquare,
    FiRefreshCw,
    FiUser,
    FiMapPin,
    FiCalendar,
    FiClipboard,
    FiStar,
    FiTrash2,
    FiUpload,
    FiX,
    FiSearch,
} from "react-icons/fi";

/* ============== Helpers ============== */
const toArr = (x) => (Array.isArray(x) ? x : Array.isArray(x?.results) ? x.results : []);
const byId = (list) => Object.fromEntries(toArr(list).map((x) => [String(x.id), x]));
const errText = (e, f) =>
    e?.response?.data
        ? typeof e.response.data === "string"
            ? e.response.data
            : e.response.data.detail ||
            Object.entries(e.response.data)
                .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join("; ") : String(v)}`)
                .join(" | ")
        : e?.message || f;

/* ====================================================================== */
export default function UserAccount() {
    const { t } = useTranslation();

    /* UI */
    const [tab, setTab] = useState("guides");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const toast = (msg) => console.log("[UserAccount]", msg);

    /* Chat (badge) */
    const [chatOpen, setChatOpen] = useState(false);
    const [chatUnread, setChatUnread] = useState(0);
    const [chatLoading, setChatLoading] = useState(false);

    const refreshChatUnread = useCallback(async () => {
        try {
            setChatLoading(true);
            const { data } = await api.get("chat/unread-count/");
            setChatUnread(Number(data?.total_unread ?? 0));
        } catch (_) {
            /* ignore */
        } finally {
            setChatLoading(false);
        }
    }, []);

    useEffect(() => {
        let timer;
        const start = async () => {
            await refreshChatUnread();
            timer = setInterval(refreshChatUnread, 30000);
        };
        if (!chatOpen) start();
        return () => timer && clearInterval(timer);
    }, [chatOpen, refreshChatUnread]);

    /* Lookups */
    const [countries, setCountries] = useState([]);
    const [cities, setCities] = useState([]);
    const [languages, setLanguages] = useState([]);
    const [serviceTypes, setServiceTypes] = useState([]);

    const loadLookups = async () => {
        const [ctr, cty, lng, st] = await Promise.all([
            api.get("common/countries/"),
            api.get("common/cities/"),
            api.get("common/languages/").catch(() => ({ data: [] })),
            api.get("common/service-types/").catch(() => ({ data: [] })),
        ]);
        setCountries(toArr(ctr.data));
        setCities(toArr(cty.data));
        setLanguages(toArr(lng.data));
        setServiceTypes(toArr(st.data));
    };

    /* ===== Client Profile + Avatar (NO /my endpoints) ===== */
    const [clientProfiles, setClientProfiles] = useState([]);
    const [clientUserId, setClientUserId] = useState(null);

    const [clientAvatarUrl, setClientAvatarUrl] = useState(null);
    const [pendingAvatarFile, setPendingAvatarFile] = useState(null);
    const clientAvatarRef = useRef(null);

    const fetchClientProfiles = async () => {
        const { data } = await api.get("profiles/clients/");
        const list = toArr(data);
        setClientProfiles(list);
        const profile = list[0] || null;
        const uid = profile?.user?.id ?? profile?.user ?? null; // serializer short user
        setClientUserId(uid || null);
        return { list, uid: uid || null };
    };

    const ensureClientProfile = async () => {
        const { list } = await fetchClientProfiles();
        if (!list.length) {
            try {
                await api.post("profiles/clients/", {});
            } catch (e) {
                throw new Error(errText(e, "Create client profile failed"));
            }
            await fetchClientProfiles();
        }
    };

    const fetchClientAvatar = async (uid) => {
        try {
            const { data } = await api.get(`profiles/clients/${uid}/avatar/`);
            setClientAvatarUrl(data?.avatar_url || null);
        } catch {
            setClientAvatarUrl(null);
        }
    };

    const loadClientProfile = async () => {
        const { uid } = await fetchClientProfiles();
        if (uid) await fetchClientAvatar(uid);
    };

    const saveClientAvatar = async () => {
        if (!clientUserId || !pendingAvatarFile) return;
        setBusy(true);
        setError("");
        try {
            const fd = new FormData();
            fd.append("avatar", pendingAvatarFile);
            const { data } = await api.put(`profiles/clients/${clientUserId}/avatar/`, fd);
            setClientAvatarUrl(data?.avatar_url || null);
            setPendingAvatarFile(null);
            if (clientAvatarRef.current) clientAvatarRef.current.value = "";
            toast("Avatar saved");
        } catch (e) {
            setError(errText(e, "Upload failed"));
        } finally {
            setBusy(false);
        }
    };

    const deleteClientAvatar = async () => {
        if (!clientUserId) return;
        setBusy(true);
        setError("");
        try {
            await api.delete(`profiles/clients/${clientUserId}/avatar/`);
            setClientAvatarUrl(null);
            setPendingAvatarFile(null);
            if (clientAvatarRef.current) clientAvatarRef.current.value = "";
            toast("Avatar deleted");
        } catch (e) {
            setError(errText(e, "Delete failed"));
        } finally {
            setBusy(false);
        }
    };

    /* ===== Guides (customers) search + manual Search button ===== */
    const [customers, setCustomers] = useState([]);
    const [filters, setFilters] = useState({
        countryId: "",
        cityId: "",
        minRating: "",
    });

    const loadCustomers = async () => {
        const params = {};
        if (filters.countryId) params.country = filters.countryId;
        if (filters.cityId) params.city = filters.cityId;
        if (filters.minRating !== "") params.min_rating = filters.minRating;
        const { data } = await api.get("profiles/customers/", { params });
        setCustomers(toArr(data));
    };

    const customersById = useMemo(() => byId(customers), [customers]);

    const filteredCities = useMemo(() => {
        if (!filters.countryId) return cities;
        const cid = String(filters.countryId);
        return toArr(cities).filter(
            (c) => String(c.country) === cid || String(c.country?.id) === cid
        );
    }, [cities, filters.countryId]);

    /* ===== Bookings ===== */
    const [bookings, setBookings] = useState([]);
    const [bookModal, setBookModal] = useState({ open: false, customer: null, name: "" });
    const [bookDates, setBookDates] = useState({ start_date: "", end_date: "" });
    const [selectedServiceType, setSelectedServiceType] = useState("");

    const loadBookings = async () => {
        const { data } = await api.get("bookings/bookings/");
        setBookings(toArr(data));
    };

    const openBookNow = async (cust) => {
        const cid = cust?.id ?? cust;
        try {
            await ensureClientProfile(); // make sure we can book
        } catch (e) {
            setError(e.message);
            return;
        }
        setBookModal({
            open: true,
            customer: cid,
            name: cust?.full_name || cust?.display_name || "Guide",
        });
        setBookDates({ start_date: "", end_date: "" });
    };

    const submitBooking = async (e) => {
        e.preventDefault();
        setError("");

        if (!bookModal.customer || !bookDates.start_date || !bookDates.end_date) {
            setError("Start/End required");
            return;
        }
        const s = new Date(bookDates.start_date);
        const en = new Date(bookDates.end_date);
        if (en < s) {
            setError("Invalid date range");
            return;
        }

        // IMPORTANT: availability is validated server-side in perform_create.
        // We rely on BE to return a clear 400 error if the guide is unavailable.
        const payload = {
            customer_profile: Number(bookModal.customer),
            start_date: bookDates.start_date,
            end_date: bookDates.end_date,
            title: `Booking with ${bookModal.name}`,
            ...(selectedServiceType ? { service_type: Number(selectedServiceType) } : {}),
        };

        try {
            setBusy(true);
            await api.post("bookings/bookings/", payload);
            setBookModal({ open: false, customer: null, name: "" });
            await Promise.all([loadBookings(), loadCustomers()]);
            setTab("bookings");
        } catch (e2) {
            // Surface BE unavailability message if present
            const msg = errText(e2, "Booking failed");
            setError(msg);
        } finally {
            setBusy(false);
        }
    };

    const cancelBooking = async (id) => {
        try {
            await api.post(`bookings/bookings/${id}/cancel/`, {});
            await loadBookings();
        } catch (e) {
            setError(errText(e, "Cancel failed"));
        }
    };

    /* ===== Reviews ===== */
    const [myReviews, setMyReviews] = useState([]);

    const [reviewModal, setReviewModal] = useState({
        open: false,
        bookingId: null,
        guideName: "",
    });
    const [reviewDraft, setReviewDraft] = useState({
        overall_rating: 5,
        communication_rating: 5,
        service_rating: 5,
        punctuality_rating: 5,
        value_rating: 5,
        comment: "",
    });

    const [me, setMe] = useState(null);
    useEffect(() => {
        (async () => {
            try {
                const { data } = await api.get("auth/users/me/");
                setMe(data);
            } catch (_) {
                /* ignore */
            }
        })();
    }, []);

    const loadMyReviews = async () => {
        // Use dedicated endpoint that returns user's own published + unpublished
        const { data } = await api.get("reviews/my/");
        setMyReviews(toArr(data));
    };

    useEffect(() => {
        loadMyReviews();
    }, [me?.id]);

    const hasReviewForBooking = useCallback(
        (bookingId) =>
            toArr(myReviews).some(
                (r) => String(r.booking) === String(bookingId) || String(r.booking_id) === String(bookingId)
            ),
        [myReviews]
    );

    const openReviewForBooking = (bk) => {
        const guide =
            customersById[String(bk.customer_profile)] || customersById[String(bk.customer)] || {};
        const guideName = guide.full_name || guide.display_name || "Guide";
        setReviewModal({ open: true, bookingId: bk.id, guideName });
        setReviewDraft({
            overall_rating: 5,
            communication_rating: 5,
            service_rating: 5,
            punctuality_rating: 5,
            value_rating: 5,
            comment: "",
        });
    };

    const submitReview = async (e) => {
        e.preventDefault();
        setError("");
        try {
            const payload = {
                booking_id: Number(reviewModal.bookingId),
                overall_rating: Number(reviewDraft.overall_rating),
                communication_rating: Number(reviewDraft.communication_rating),
                service_rating: Number(reviewDraft.service_rating),
                punctuality_rating: Number(reviewDraft.punctuality_rating),
                value_rating: Number(reviewDraft.value_rating),
                title: `Review for ${reviewModal.guideName}`,
                comment: reviewDraft.comment || "",
            };
            await api.post("reviews/reviews/", payload);
            await loadMyReviews();
            setReviewModal({ open: false, bookingId: null, guideName: "" });
            toast("Review submitted");
        } catch (e2) {
            setError(errText(e2, "Review failed"));
        }
    };

    /* ===== Initial load ===== */
    const initialLoad = async () => {
        setBusy(true);
        setError("");
        try {
            await loadLookups();
            await ensureClientProfile(); // ensure exists before anything
            await loadClientProfile();
            await Promise.all([loadCustomers(), loadBookings(), loadMyReviews()]);
        } catch (e) {
            setError(errText(e, "Load failed"));
        } finally {
            setBusy(false);
        }
    };

    useEffect(() => {
        initialLoad();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* ======================= UI ======================= */
    const ChatModal = ({ open, onClose, title, children }) => {
        if (!open) return null;
        return (
            <div className="user-account-chatmodal">
                <div className="user-account-chatmodal__backdrop" onClick={onClose} />
                <div className="user-account-chatmodal__panel">
                    <div className="user-account-chatmodal__header">
                        <h4 className="user-account-card__title">
                            <FiMessageSquare /> {title}
                        </h4>
                        <button className="user-account-iconbtn" onClick={onClose} title={t("chat.close")}>
                            <FiX />
                        </button>
                    </div>
                    <div className="user-account-chatmodal__body">{children}</div>
                </div>
            </div>
        );
    };

    return (
        <div className="user-account-root">
            <div className="user-account-header">
                <h2 className="user-account-title">{t("userAccount.title") || "User Account"}</h2>
                <div className="user-account-header__actions">
                    <button
                        type="button"
                        className="user-account-btn user-account-btn--ghost"
                        onClick={initialLoad}
                        disabled={busy}
                        title={t("userAccount.loading")}
                    >
                        <FiRefreshCw />
                    </button>
                    <button
                        type="button"
                        className="user-account-btn user-account-btn--primary"
                        onClick={() => setChatOpen(true)}
                        title={t("ui.openChat")}
                    >
                        <FiMessageSquare />
                        <span>{t("ui.openChat") || "Open chat"}</span>
                        {!chatOpen && (chatLoading ? (
                            <span className="user-account-badge user-account-badge--muted">…</span>
                        ) : chatUnread > 0 ? (
                            <span className="user-account-badge">{chatUnread}</span>
                        ) : null)}
                    </button>
                </div>
                {busy && <span className="user-account-busy">{t("userAccount.loading") || "Loading..."}</span>}
                {error && <span className="user-account-error">{error}</span>}
            </div>

            <div className="user-account-tabs">
                <button
                    className={`user-account-tab ${tab === "profile" ? "user-account-tab--active" : ""}`}
                    onClick={() => setTab("profile")}
                >
                    <FiUser /> {t("userAccount.tabs.profile") || "Profile"}
                </button>
                <button
                    className={`user-account-tab ${tab === "guides" ? "user-account-tab--active" : ""}`}
                    onClick={() => setTab("guides")}
                >
                    <FiMapPin /> {t("userAccount.tabs.guides") || "Guides"}
                </button>
                <button
                    className={`user-account-tab ${tab === "bookings" ? "user-account-tab--active" : ""}`}
                    onClick={() => setTab("bookings")}
                >
                    <FiClipboard /> {t("userAccount.tabs.bookings") || "Bookings"}
                </button>
                <button
                    className={`user-account-tab ${tab === "reviews" ? "user-account-tab--active" : ""}`}
                    onClick={() => setTab("reviews")}
                >
                    <FiStar /> {t("userAccount.tabs.reviews") || "Reviews"}
                </button>
            </div>

            {/* PROFILE — Avatar */}
            {tab === "profile" && (
                <section className="user-account-section">
                    <div className="user-account-grid">
                        <div className="user-account-card">
                            <h3 className="user-account-card__title">
                                <FiUpload /> {t("userAccount.avatar.title") || "Avatar"}
                            </h3>
                            <div className="user-account-avatar">
                                {clientAvatarUrl ? (
                                    <img className="user-account-avatar__img" src={clientAvatarUrl} alt={t("userAccount.avatar.alt") || "Avatar"} />
                                ) : (
                                    <div className="user-account-avatar__placeholder">
                                        {t("userAccount.avatar.noAvatar") || "No avatar"}
                                    </div>
                                )}
                            </div>
                            <div className="user-account-actions">
                                <input
                                    ref={clientAvatarRef}
                                    type="file"
                                    accept="image/*"
                                    className="user-account-input"
                                    onChange={(e) => setPendingAvatarFile(e.target.files?.[0] || null)}
                                />
                                <button
                                    type="button"
                                    className="user-account-btn user-account-btn--primary"
                                    onClick={saveClientAvatar}
                                    disabled={!pendingAvatarFile || busy}
                                >
                                    {t("userAccount.avatar.save") || "Save"}
                                </button>
                                {clientAvatarUrl && (
                                    <button type="button" className="user-account-btn user-account-btn--danger" onClick={deleteClientAvatar}>
                                        <FiTrash2 /> {t("userAccount.avatar.delete") || "Delete"}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* GUIDES — Filters + Search */}
            {tab === "guides" && (
                <section className="user-account-section">
                    <h3 className="user-account-card__title">
                        <FiMapPin /> {t("userAccount.guides.title") || "Find Guides"}
                    </h3>
                    <div className="user-account-card">
                        <div className="user-account-row">
                            <label className="user-account-label user-account-col">
                                {t("userAccount.guides.country") || "Country"}
                                <select
                                    className="user-account-select"
                                    value={filters.countryId}
                                    onChange={(e) => setFilters((s) => ({ ...s, countryId: e.target.value }))}
                                >
                                    <option value="">{t("userAccount.select.placeholder") || "Select"}</option>
                                    {countries.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="user-account-label user-account-col">
                                {t("userAccount.guides.city") || "City"}
                                <select
                                    className="user-account-select"
                                    value={filters.cityId}
                                    onChange={(e) => setFilters((s) => ({ ...s, cityId: e.target.value }))}
                                >
                                    <option value="">{t("userAccount.select.placeholder") || "Select"}</option>
                                    {filteredCities.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="user-account-label user-account-col">
                                {t("userAccount.guides.minRating") || "Min rating"}
                                <input
                                    type="number"
                                    min={0}
                                    max={5}
                                    step="0.1"
                                    className="user-account-input"
                                    value={filters.minRating}
                                    onChange={(e) => setFilters((s) => ({ ...s, minRating: e.target.value }))}
                                    placeholder="e.g., 4.0"
                                />
                            </label>
                            <div className="user-account-col" style={{ alignSelf: "end" }}>
                                <button className="user-account-btn" onClick={loadCustomers}>
                                    <FiSearch /> {t("userAccount.guides.search") || "Search"}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="user-account-grid">
                        {toArr(customers).map((g) => (
                            <div className="user-account-card" key={g.id}>
                                <div className="user-account-card__title">
                                    {g.full_name || g.display_name || "Guide"} {g.is_verified ? "✅" : ""}
                                </div>
                                {g.avatar && (
                                    <img className="user-account-card__media" src={g.avatar} alt={g.full_name || "avatar"} />
                                )}
                                <div className="user-account-card__text">
                                    <div>
                                        {t("userAccount.guides.cityName") || "City"}: {g.city_name ?? g.city?.name ?? "-"}
                                    </div>
                                    <div>
                                        {t("userAccount.guides.rating") || "Rating"}: {g.average_rating ?? 0} / 5
                                    </div>
                                    <div>
                                        {t("userAccount.guides.experience") || "Experience"}: {g.years_of_experience ?? 0}
                                    </div>
                                </div>
                                <div className="user-account-card__footer">
                                    <button className="user-account-btn" onClick={() => openBookNow(g)}>
                                        {t("userAccount.guides.book") || "Book now"}
                                    </button>
                                </div>
                            </div>
                        ))}
                        {toArr(customers).length === 0 && (
                            <div className="user-account-empty">{t("userAccount.guides.empty") || "No guides"}</div>
                        )}
                    </div>

                    {/* Booking modal */}
                    {bookModal.open && (
                        <div className="user-account-chatmodal">
                            <div
                                className="user-account-chatmodal__backdrop"
                                onClick={() => setBookModal({ open: false, customer: null, name: "" })}
                            />
                            <div className="user-account-chatmodal__panel">
                                <div className="user-account-chatmodal__header">
                                    <h4 className="user-account-card__title">
                                        <FiClipboard /> {t("userAccount.bookings.title") || "Create booking"}
                                    </h4>
                                    <button
                                        className="user-account-iconbtn"
                                        onClick={() => setBookModal({ open: false, customer: null, name: "" })}
                                    >
                                        <FiX />
                                    </button>
                                </div>
                                <div className="user-account-chatmodal__body" style={{ padding: 12 }}>
                                    <form onSubmit={submitBooking} className="user-account-form">
                                        <div className="user-account-row">
                                            <label className="user-account-label user-account-col">
                                                {t("userAccount.bookings.start") || "Start date"}
                                                <input
                                                    type="date"
                                                    className="user-account-input"
                                                    value={bookDates.start_date}
                                                    onChange={(e) => setBookDates((s) => ({ ...s, start_date: e.target.value }))}
                                                    required
                                                />
                                            </label>
                                            <label className="user-account-label user-account-col">
                                                {t("userAccount.bookings.end") || "End date"}
                                                <input
                                                    type="date"
                                                    className="user-account-input"
                                                    value={bookDates.end_date}
                                                    min={bookDates.start_date || undefined}
                                                    onChange={(e) => setBookDates((s) => ({ ...s, end_date: e.target.value }))}
                                                    required
                                                />
                                            </label>
                                            {serviceTypes.length > 0 && (
                                                <label className="user-account-label user-account-col">
                                                    {t("userAccount.bookings.serviceType") || "Service type"}
                                                    <select
                                                        className="user-account-select"
                                                        value={selectedServiceType}
                                                        onChange={(e) => setSelectedServiceType(e.target.value)}
                                                    >
                                                        <option value="">{t("userAccount.select.placeholder") || "Select"}</option>
                                                        {serviceTypes.map((s) => (
                                                            <option key={s.id} value={s.id}>
                                                                {s.title || s.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </label>
                                            )}
                                        </div>
                                        <div className="user-account-actions">
                                            <button className="user-account-btn user-account-btn--primary" type="submit" disabled={busy}>
                                                {t("userAccount.bookings.create") || "Create"}
                                            </button>
                                            <button
                                                className="user-account-btn user-account-btn--ghost"
                                                type="button"
                                                onClick={() => setBookModal({ open: false, customer: null, name: "" })}
                                            >
                                                {t("chat.close") || "Close"}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    )}
                </section>
            )}

            {/* BOOKINGS — list + cancel + review */}
            {tab === "bookings" && (
                <section className="user-account-section">
                    <h3 className="user-account-card__title">
                        <FiClipboard /> {t("userAccount.bookings.title") || "My bookings"}
                    </h3>
                    <div className="user-account-list">
                        {bookings.map((b) => {
                            const guide =
                                customersById[String(b.customer_profile)] || customersById[String(b.customer)] || {};
                            const guideName = guide.full_name || guide.display_name || b.customer_name || "Guide";
                            const reviewed = hasReviewForBooking(b.id);
                            return (
                                <div className="user-account-item" key={b.id}>
                                    <div className="user-account-item__main">
                                        <div className="user-account-item__title">#{b.id} — {b.title || guideName}</div>
                                        <div className="user-account-item__sub">
                                            <FiCalendar /> {b.start_date} → {b.end_date} | {t("userAccount.bookings.status") || "Status"}: <strong>{b.status_display ?? b.status}</strong>
                                        </div>
                                    </div>
                                    <div className="user-account-actions">
                                        {b.status !== "cancelled" && (
                                            <button className="user-account-btn user-account-btn--danger" onClick={() => cancelBooking(b.id)}>
                                                {t("userAccount.bookings.cancel") || "Cancel"}
                                            </button>
                                        )}
                                        {b.status === "completed" && !reviewed && (
                                            <button className="user-account-btn" onClick={() => openReviewForBooking(b)}>
                                                {t("userAccount.reviews.add") || "Review"}
                                            </button>
                                        )}
                                        {reviewed && <span className="user-account-badge">{t("userAccount.reviews.submitted") || "Reviewed"}</span>}
                                    </div>
                                </div>
                            );
                        })}
                        {bookings.length === 0 && <div className="user-account-empty">{t("userAccount.bookings.empty") || "No bookings"}</div>}
                    </div>

                    {/* Review modal */}
                    {reviewModal.open && (
                        <div className="user-account-chatmodal">
                            <div
                                className="user-account-chatmodal__backdrop"
                                onClick={() => setReviewModal({ open: false, bookingId: null, guideName: "" })}
                            />
                            <div className="user-account-chatmodal__panel">
                                <div className="user-account-chatmodal__header">
                                    <h4 className="user-account-card__title">
                                        <FiStar /> {t("userAccount.reviews.title") || "Reviews"}
                                    </h4>
                                    <button
                                        className="user-account-iconbtn"
                                        onClick={() => setReviewModal({ open: false, bookingId: null, guideName: "" })}
                                    >
                                        <FiX />
                                    </button>
                                </div>
                                <div className="user-account-chatmodal__body" style={{ padding: 12 }}>
                                    <form className="user-account-form" onSubmit={submitReview}>
                                        <div className="user-account-row">
                                            <label className="user-account-label user-account-col">
                                                Overall
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={5}
                                                    className="user-account-input"
                                                    value={reviewDraft.overall_rating}
                                                    onChange={(e) => setReviewDraft((s) => ({ ...s, overall_rating: Number(e.target.value) }))}
                                                    required
                                                />
                                            </label>
                                            <label className="user-account-label user-account-col">
                                                Communication
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={5}
                                                    className="user-account-input"
                                                    value={reviewDraft.communication_rating}
                                                    onChange={(e) => setReviewDraft((s) => ({ ...s, communication_rating: Number(e.target.value) }))}
                                                    required
                                                />
                                            </label>
                                            <label className="user-account-label user-account-col">
                                                Service
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={5}
                                                    className="user-account-input"
                                                    value={reviewDraft.service_rating}
                                                    onChange={(e) => setReviewDraft((s) => ({ ...s, service_rating: Number(e.target.value) }))}
                                                    required
                                                />
                                            </label>
                                            <label className="user-account-label user-account-col">
                                                Punctuality
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={5}
                                                    className="user-account-input"
                                                    value={reviewDraft.punctuality_rating}
                                                    onChange={(e) => setReviewDraft((s) => ({ ...s, punctuality_rating: Number(e.target.value) }))}
                                                    required
                                                />
                                            </label>
                                            <label className="user-account-label user-account-col">
                                                Value
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={5}
                                                    className="user-account-input"
                                                    value={reviewDraft.value_rating}
                                                    onChange={(e) => setReviewDraft((s) => ({ ...s, value_rating: Number(e.target.value) }))}
                                                    required
                                                />
                                            </label>
                                        </div>
                                        <div className="user-account-row">
                                            <label className="user-account-label user-account-col">
                                                {t("userAccount.reviews.comment") || "Comment"}
                                                <input
                                                    className="user-account-input"
                                                    value={reviewDraft.comment}
                                                    onChange={(e) => setReviewDraft((s) => ({ ...s, comment: e.target.value }))}
                                                />
                                            </label>
                                        </div>
                                        <div className="user-account-actions">
                                            <button className="user-account-btn user-account-btn--primary" type="submit" disabled={busy}>
                                                {t("userAccount.reviews.submit") || "Submit"}
                                            </button>
                                            <button
                                                className="user-account-btn user-account-btn--ghost"
                                                type="button"
                                                onClick={() => setReviewModal({ open: false, bookingId: null, guideName: "" })}
                                            >
                                                {t("chat.close") || "Close"}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    )}
                </section>
            )}

            {/* REVIEWS — read-only list */}
            {tab === "reviews" && (
                <section className="user-account-section">
                    <h3 className="user-account-card__title">
                        <FiStar /> {t("userAccount.reviews.title") || "Reviews"}
                    </h3>
                    <div className="user-account-list">
                        {toArr(myReviews).map((r) => (
                            <div key={r.id} className="user-account-item">
                                <div className="user-account-item__main">
                                    <div className="user-account-item__title">
                                        #{r.id} — {customersById[String(r.customer)]?.full_name ||
                                        customersById[String(r.customer)]?.display_name || r.title || "—"} — {r.overall_rating}/5
                                    </div>
                                    <div className="user-account-item__sub">{r.comment}</div>
                                </div>
                            </div>
                        ))}
                        {toArr(myReviews).length === 0 && (
                            <div className="user-account-empty">{t("userAccount.reviews.empty") || "No reviews"}</div>
                        )}
                    </div>
                </section>
            )}

            {/* Floating Chat FAB */}
            <button className="user-account-fab" title={t("ui.openChat") || "Open chat"} onClick={() => setChatOpen(true)}>
                <FiMessageSquare />
                {chatUnread > 0 && !chatOpen && <span className="user-account-fab__badge">{chatUnread}</span>}
            </button>

            {/* Chat Modal */}
            <ChatModal
                open={chatOpen}
                onClose={async () => {
                    setChatOpen(false);
                    await refreshChatUnread();
                }}
                title={t("ui.openChat") || "Chat"}
            >
                <ChatWidgets />
            </ChatModal>
        </div>
    );
}
