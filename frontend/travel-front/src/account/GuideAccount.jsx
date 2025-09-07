// GuideAccount.jsx
// Frontend for Guide (Customer) cabinet powered by your /api/v1 backend.
// - Integrates ChatWidgets via a modal (button with react-icons).
// - Uses your axios instance configured with baseURL "/api/v1/" and token refresh.
// - All classNames start with "guide-account".
// - i18n-ready with react-i18next (keys used below + chat/ui keys).
// - Covers: Profile, Unavailability, Bookings, Portfolio, Verification, Stats.

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import api from "./api";
import './GuideAccount.css';

// Chat integration
// import ChatModal from "./components/ChatModal";
import ChatWidgets from "./ChatWidgets";

// Icons
import {
    FiMessageSquare,
    FiUser,
    FiCalendar,
    FiClipboard,
    FiImage,
    FiFileText,
    FiBarChart2,
    FiRefreshCw,
    FiCamera,
    FiStar,
    FiShield,
    FiCheckCircle,
    FiXCircle,
} from "react-icons/fi";

const API_BASE = (api?.defaults?.baseURL || "http://localhost:8000/api/v1/").replace(/\/+$/, "");
const API_ORIGIN = API_BASE.replace(/\/api\/v1$/i, ""); // -> http://localhost:8000

const toAbsUrl = (u) => {
    if (!u) return u;
    try {
        // allaqachon absolute bo'lsa, qaytarib yuboramiz
        new URL(u);
        return u;
    } catch (_) {
        // nisbiy bo'lsa: `/media/...` yoki `media/...`
        if (u.startsWith("/")) return API_ORIGIN + u;
        return API_ORIGIN + "/" + u;
    }
};

const arr = (x) => {
    if (Array.isArray(x)) return x;
    if (Array.isArray(x?.results)) return x.results;
    if (Array.isArray(x?.data)) return x.data;
    return []; // hech qaysi holatda array bo'lmasa, bo'sh array qaytadi
};
const isNum = (v) => typeof v === "number" && !Number.isNaN(v);
const parseDate = (s) => (s ? new Date(s) : null);

export default function GuideAccount() {
    const { t } = useTranslation();

    // --------------------------------
    // Global
    // --------------------------------
    const [tab, setTab] = useState("profile");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    // Chat modal & unread
    const [chatOpen, setChatOpen] = useState(false);
    const [chatUnread, setChatUnread] = useState(0);
    const [chatLoading, setChatLoading] = useState(false);

    // --------------------------------
    // Lookups (Common)
    // --------------------------------
    const [serviceTypes, setServiceTypes] = useState([]);
    const [cities, setCities] = useState([]);
    const [languages, setLanguages] = useState([]);

    // --------------------------------
    // Profile (Customer)
    // --------------------------------
    const [profile, setProfile] = useState(null);
    const [userId, setUserId] = useState(null); // for avatar endpoints
    const [customerId, setCustomerId] = useState(null); // CustomerProfile.id

    const [profileForm, setProfileForm] = useState({
        professional_bio: "",
        years_of_experience: 0,
        service_types: [],
        city: null,
        service_areas: [],
        hourly_rate: null,
        daily_rate: null,
        currency: "USD",
        languages: [],
        is_available: true,
    });

    // Avatar
    const [avatarUrl, setAvatarUrl] = useState(null);
    const avatarInputRef = useRef(null);

    // --------------------------------
    // Unavailability
    // --------------------------------
    const [unavailList, setUnavailList] = useState([]);
    const [unavailForm, setUnavailForm] = useState({
        id: null, // for edit
        start_date: "",
        end_date: "",
        reason: "",
    });

    // --------------------------------
    // Bookings (Orders incoming to guide)
    // --------------------------------
    const [bookings, setBookings] = useState([]);
    const [cancelReason, setCancelReason] = useState("");

    // --------------------------------
    // Portfolio
    // --------------------------------
    const [portfolios, setPortfolios] = useState([]);
    const [portfolioForm, setPortfolioForm] = useState({
        title: "",
        description: "",
        order: 0,
        image: null,
    });
    const portfolioFileRef = useRef(null);

    // --------------------------------
    // Verification docs
    // --------------------------------
    const [verifs, setVerifs] = useState([]);
    const [verifForm, setVerifForm] = useState({
        document_type: "",
        description: "",
        file: null,
    });
    const verifFileRef = useRef(null);

    // --------------------------------
    // Stats (Latest public reviews for this guide)
    // --------------------------------
    const [latestReviews, setLatestReviews] = useState([]);

    // Derived
    const canCheckLocalAvailability = useMemo(() => {
        const { start_date, end_date } = unavailForm;
        return Boolean(customerId && start_date && end_date);
    }, [customerId, unavailForm]);

    // ---------------- Helpers ----------------
    const toast = (msg) => console.log("[GuideAccount]", msg);
    const resetError = () => setError("");

    const onField = (setter) => (e) => {
        const { name, value, type, checked } = e.target;
        setter((s) => ({ ...s, [name]: type === "checkbox" ? checked : value }));
    };

    const onNumber = (setter) => (e) => {
        const { name, value } = e.target;
        setter((s) => ({ ...s, [name]: value === "" ? "" : Number(value) }));
    };

    const onMulti = (setter) => (e) => {
        const { name, selectedOptions } = e.target;
        const vals = Array.from(selectedOptions).map((o) =>
            /^\d+$/.test(o.value) ? Number(o.value) : o.value
        );
        setter((s) => ({ ...s, [name]: vals }));
    };

    // --------------- Loaders ---------------
    const loadLookups = async () => {
        const [svc, cty, lng] = await Promise.all([
            api.get("common/service-types/"),
            api.get("common/cities/"),
            api.get("common/languages/"),
        ]);
        setServiceTypes(arr(svc.data));
        setCities(arr(cty.data));
        setLanguages(arr(lng.data));
    };

    const loadProfile = async () => {
        const { data } = await api.get("profiles/customers/my/");
        setProfile(data);
        setUserId(data?.user?.id ?? null);
        setCustomerId(data?.id ?? null);
        setAvatarUrl(data?.avatar ?? null);
        setProfileForm((s) => ({
            ...s,
            professional_bio: data.professional_bio ?? "",
            years_of_experience: data.years_of_experience ?? 0,
            service_types: data.service_types ?? [],
            city: data.city ?? null,
            service_areas: data.service_areas ?? [],
            hourly_rate: data.hourly_rate ?? null,
            daily_rate: data.daily_rate ?? null,
            currency: data.currency ?? "USD",
            languages: data.languages ?? [],
            is_available: data.is_available ?? true,
        }));
    };

    const loadUnavailability = async () => {
        const { data } = await api.get("profiles/unavailabilities/");
        setUnavailList(arr(data));
    };

    const loadBookings = async () => {
        const { data } = await api.get("bookings/");
        setBookings(arr(data));
    };

    const loadPortfolios = async () => {
        const { data } = await api.get("profiles/portfolios/");
        setPortfolios(arr(data));
    };

    const loadVerifs = async () => {
        const { data } = await api.get("profiles/verifications/");
        setVerifs(arr(data));
    };

    const loadLatestReviews = async (custId) => {
        if (!custId) return;
        try {
            // Public reviews list supports filtering by customer
            const { data } = await api.get(
                `reviews/reviews/?customer=${custId}&ordering=-created_at`
            );
            setLatestReviews(arr(data).slice(0, 5));
        } catch {
            setLatestReviews([]);
        }
    };

    const initialLoad = async () => {
        setBusy(true);
        resetError();
        try {
            await loadLookups();
            await loadProfile();
            await Promise.all([
                loadUnavailability(),
                loadBookings(),
                loadPortfolios(),
                loadVerifs(),
            ]);
            await loadLatestReviews(customerId);
            toast(t("guideAccount.loaded"));
        } catch (e) {
            setError(e?.message || "Load failed");
        } finally {
            setBusy(false);
        }
    };

    useEffect(() => {
        initialLoad();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (customerId) loadLatestReviews(customerId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [customerId]);

    // ---------- Chat unread (lightweight poll) ----------
    const refreshChatUnread = useCallback(async () => {
        try {
            setChatLoading(true);
            const { data } = await api.get("chat/unread-count/");
            const total = Number(data?.total_unread ?? 0);
            setChatUnread(total);
        } catch {
            // ignore
        } finally {
            setChatLoading(false);
        }
    }, []);

    useEffect(() => {
        // poll every 30s if modal closed
        let timer = null;
        const start = async () => {
            await refreshChatUnread();
            timer = setInterval(refreshChatUnread, 30000);
        };
        if (!chatOpen) start();
        return () => {
            if (timer) clearInterval(timer);
        };
    }, [chatOpen, refreshChatUnread]);

    useEffect(() => {
        if (!chatOpen) return;
        const onKey = (e) => e.key === "Escape" && setChatOpen(false);
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [chatOpen]);

    useEffect(() => {
        const orig = document.body.style.overflow;
        if (chatOpen) document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = orig || ""; };
    }, [chatOpen]);


    // --------------- Actions: Profile ---------------
    const submitProfile = async (e) => {
        e.preventDefault();
        setBusy(true);
        resetError();

        try {
            const fd = new FormData();
            const f = profileForm;

            const putNum = (k, v) => {
                if (v === "" || v === null || typeof v === "undefined") return;
                fd.append(k, String(v)); // DRF FormData-da string sifatida keladi
            };
            const putStr = (k, v) => {
                if (typeof v === "undefined" || v === null) return;
                fd.append(k, v);
            };
            const putBool = (k, v) => fd.append(k, v ? "true" : "false");
            const putList = (k, list) => {
                (Array.isArray(list) ? list : []).forEach((val) => {
                    // DRF odatda repeated keys yoki k[] ni hazm qiladi.
                    // Ikkaladan biri ishlaydi: backendga moslab biri tanlang.
                    fd.append(k, String(val));
                    // kerak bo'lsa: fd.append(`${k}[]`, String(val));
                });
            };

            putStr("professional_bio", f.professional_bio || "");
            putNum("years_of_experience", f.years_of_experience ?? 0);
            // city null bo'lsa, bo'sh qoldiring yoki "null" emas
            if (f.city) fd.append("city", String(f.city));
            putList("service_types", f.service_types);
            putList("service_areas", f.service_areas);
            putNum("hourly_rate", f.hourly_rate);
            putNum("daily_rate", f.daily_rate);
            putStr("currency", f.currency || "USD");
            putList("languages", f.languages);
            putBool("is_available", !!f.is_available);

            await api.patch("profiles/customers/my/", fd, {
                // MUHIM: boundary’ni browserning o‘zi qo‘ysin, header qo‘ymang
                headers: { /* no manual 'Content-Type' here */ },
            });

            await Promise.all([loadBookings(), loadUnavailability(), loadProfile()]);
            toast(t("guideAccount.profileSaved"));
        } catch (e2) {
            setError(e2?.response?.data ? JSON.stringify(e2.response.data) : e2.message);
        } finally {
            setBusy(false);
        }
    };


    const uploadAvatar = async (file) => {
        if (!userId || !file) return;
        setBusy(true);
        resetError();
        try {
            const fd = new FormData();
            fd.append("avatar", file);
            const { data } = await api.put(`profiles/customers/${userId}/avatar/`, fd);
            const raw = data?.avatar_url ?? data?.avatar ?? ""; // backend qaysi maydonni bersa
            const abs = toAbsUrl(raw) + `?v=${Date.now()}`;      // cache bust
            setAvatarUrl(abs);
            // profilni yangilab qo'yish foydali (agar boshqa joylarda ham ishlatilsa)
            await loadProfile();
            // ixtiyoriy: yana cache bust
            setAvatarUrl((u) => (u ? u.split("?v=")[0] + `?v=${Date.now()}` : u));
            toast(t("guideAccount.avatarSaved"));
        } catch (e) {
            setError(e.message);
        } finally {
            setBusy(false);
            if (avatarInputRef.current) avatarInputRef.current.value = "";
        }
    };

    const deleteAvatar = async () => {
        if (!userId) return;
        setBusy(true);
        resetError();
        try {
            await api.delete(`profiles/customers/${userId}/avatar/`);
            setAvatarUrl(null);
            toast(t("guideAccount.avatarDeleted"));
        } catch (e) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    };

    // --------------- Actions: Unavailability ---------------
    const createOrUpdateUnavail = async (e) => {
        e.preventDefault();
        setBusy(true);
        resetError();
        try {
            const payload = {
                start_date: unavailForm.start_date,
                end_date: unavailForm.end_date,
                reason: unavailForm.reason || "",
            };
            if (unavailForm.id) {
                await api.patch(
                    `profiles/unavailabilities/${unavailForm.id}/`,
                    payload
                );
                toast(t("guideAccount.unavailUpdated"));
            } else {
                await api.post("profiles/unavailabilities/", payload);
                toast(t("guideAccount.unavailCreated"));
            }
            setUnavailForm({ id: null, start_date: "", end_date: "", reason: "" });
            await loadUnavailability();
        } catch (e) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    };

    const editUnavail = (u) =>
        setUnavailForm({
            id: u.id,
            start_date: u.start_date,
            end_date: u.end_date,
            reason: u.reason ?? "",
        });

    const deleteUnavail = async (id) => {
        setBusy(true);
        resetError();
        try {
            await api.delete(`profiles/unavailabilities/${id}/`);
            await loadUnavailability();
            toast(t("guideAccount.unavailDeleted"));
        } catch (e) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    };

    // Client-side check vs local unavailability list
    const localAvailability = useMemo(() => {
        const { start_date, end_date } = unavailForm;
        if (!start_date || !end_date) return null;
        const s = new Date(start_date);
        const e = new Date(end_date);
        if (e < s) return { ok: false, reason: t("guideAccount.endBeforeStart") };
        const clash = unavailList.find((u) => {
            const us = new Date(u.start_date);
            const ue = new Date(u.end_date);
            return us <= e && ue >= s;
        });
        if (clash) return { ok: false, reason: t("guideAccount.overlapsExisting") };
        return { ok: true };
    }, [unavailForm.start_date, unavailForm.end_date, unavailList, t]);

    // --------------- Actions: Bookings (Accept / Cancel) ---------------
    const acceptBooking = async (id) => {
        setBusy(true);
        resetError();
        try {
            await api.post(`bookings/${id}/accept/`);
            await loadBookings();
            toast(t("guideAccount.bookingAccepted"));
        } catch (e) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    };

    const cancelBooking = async (id) => {
        setBusy(true);
        resetError();
        try {
            await api.post(`bookings/${id}/cancel/`, {
                cancellation_reason: cancelReason || "",
            });
            setCancelReason("");
            await loadBookings();
            toast(t("guideAccount.bookingCancelled"));
        } catch (e) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    };

    // --------------- Actions: Portfolio ---------------
    const addPortfolio = async (e) => {
        e.preventDefault();
        if (!portfolioForm.image) {
            setError(t("guideAccount.imageRequired"));
            return;
        }
        setBusy(true);
        resetError();
        try {
            const fd = new FormData();
            fd.append("title", portfolioForm.title || "");
            fd.append("description", portfolioForm.description || "");
            fd.append("order", String(portfolioForm.order ?? 0));
            fd.append("image", portfolioForm.image);
            await api.post("profiles/portfolios/", fd);
            setPortfolioForm({ title: "", description: "", order: 0, image: null });
            if (portfolioFileRef.current) portfolioFileRef.current.value = "";
            await loadPortfolios();
            toast(t("guideAccount.portfolioAdded"));
        } catch (e) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    };

    const deletePortfolio = async (id) => {
        setBusy(true);
        resetError();
        try {
            await api.delete(`profiles/portfolios/${id}/`);
            await loadPortfolios();
            toast(t("guideAccount.portfolioDeleted"));
        } catch (e) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    };

    // --------------- Actions: Verification Docs ---------------
    // GuideAccount.jsx ichida addVerif ni ALMASHTIRING
    const addVerif = async (e) => {
        e.preventDefault();
        if (!verifForm.file || !verifForm.document_type) {
            setError(t("guideAccount.verifRequired"));
            return;
        }

        setBusy(true);
        resetError();

        // yordamchi: FormData to‘plash
        const buildFD = (fileFieldName = "file") => {
            const fd = new FormData();
            fd.append("document_type", verifForm.document_type); // choice bo'lsa to'g'ri qiymat bering
            if (verifForm.description) fd.append("description", verifForm.description);
            fd.append(fileFieldName, verifForm.file);

            // Ba’zi backendlar uchun kerak bo‘lishi mumkin:
            if (customerId) fd.append("customer", String(customerId));

            return fd;
        };

        // 1-urinish: 'file' nomi bilan
        try {
            await api.post("profiles/verifications/", buildFD("file"), {
                // 'Content-Type' qo‘ymang — browser o‘zi qo‘yadi
                headers: {},
            });
            setVerifForm({ document_type: "", description: "", file: null });
            if (verifFileRef.current) verifFileRef.current.value = "";
            await loadVerifs();
            toast(t("guideAccount.verifAdded"));
        } catch (e1) {
            const data = e1?.response?.data;

            // Agar backend 'file' nomini tanimasa yoki "unknown field" desa — 'document' bilan qayta urinib ko‘ramiz
            const looksLikeWrongField =
                data &&
                typeof data === "object" &&
                (data.file?.some?.((m) => /unknown|invalid|required/i.test(String(m))) ||
                    /file/i.test(JSON.stringify(data)));

            if (looksLikeWrongField) {
                try {
                    await api.post("profiles/verifications/", buildFD("document"), { headers: {} });
                    setVerifForm({ document_type: "", description: "", file: null });
                    if (verifFileRef.current) verifFileRef.current.value = "";
                    await loadVerifs();
                    toast(t("guideAccount.verifAdded"));
                } catch (e2) {
                    console.error("[verif 400-second]", e2?.response?.data || e2.message);
                    setError(e2?.response?.data ? JSON.stringify(e2.response.data) : e2.message);
                } finally {
                    setBusy(false);
                }
            } else {
                console.error("[verif 400-first]", data || e1.message);
                // Masalan: {"document_type":["\"something\" is not a valid choice."]}
                setError(data ? JSON.stringify(data) : e1.message);
                setBusy(false);
            }
        }
    };


    const deleteVerif = async (id) => {
        setBusy(true);
        resetError();
        try {
            await api.delete(`profiles/verifications/${id}/`);
            await loadVerifs();
            toast(t("guideAccount.verifDeleted"));
        } catch (e) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    };

    // -------------------- Stats helpers (computed from data) --------------------
    const bookingsByStatus = useMemo(() => {
        const map = {};
        bookings.forEach((b) => {
            const key = (b.status || "").toLowerCase();
            map[key] = (map[key] || 0) + 1;
        });
        return map; // e.g., { pending: 3, accepted: 5, completed: 2, cancelled: 1 }
    }, [bookings]);

    const totalUpcomingBookings = useMemo(() => {
        const now = new Date();
        return bookings.filter((b) => {
            const sd = parseDate(b.start_date);
            return sd && sd >= now;
        }).length;
    }, [bookings]);

    const upcomingBookings = useMemo(() => {
        const now = new Date();
        return bookings
            .filter((b) => {
                const sd = parseDate(b.start_date);
                return sd && sd >= now;
            })
            .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
            .slice(0, 5);
    }, [bookings]);

    const totalUnavailabilityDaysUpcoming = useMemo(() => {
        const now = new Date();
        let sum = 0;
        unavailList.forEach((u) => {
            const s = parseDate(u.start_date);
            const e = parseDate(u.end_date);
            if (!s || !e) return;
            // count only future overlap
            const sEff = s > now ? s : now;
            if (e >= sEff) {
                const days = Math.ceil((e - sEff) / (1000 * 60 * 60 * 24)) + 1;
                sum += Math.max(0, days);
            }
        });
        return sum;
    }, [unavailList]);

    // -------------------------------- UI --------------------------------
    const Tab = ({ id, label, icon: Icon }) => (
        <button
            type="button"
            onClick={() => setTab(id)}
            className={`guide-account-tab ${tab === id ? "guide-account-tab--active" : ""}`}
        >
            {Icon && <Icon className="guide-account-tab__icon" />} {label}
        </button>
    );

    // --- GuideAccount.jsx ichida, component funksiyasi ichiga qo'ying (return'dan yuqoriga) ---
    const ChatModal = ({ open, onClose, title, children }) => {
        if (!open) return null;
        return (
            <div className="guide-account-chatmodal">
                <div className="guide-account-chatmodal__backdrop" onClick={onClose} />
                <div className="guide-account-chatmodal__panel">
                    <div className="guide-account-chatmodal__header">
                        <h4 className="guide-account-card__title">
                            <FiMessageSquare /> {title}
                        </h4>
                        <button
                            className="guide-account-iconbtn"
                            onClick={onClose}
                            title="Close"
                            aria-label="Close"
                        >
                            <FiXCircle />
                        </button>
                    </div>
                    <div className="guide-account-chatmodal__body">
                        {children}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="guide-account-root">
            <div className="guide-account-header">
                <h2 className="guide-account-title">
                    {t("guideAccount.title")}
                </h2>

                {/* Header actions: refresh + open chat */}
                <div className="guide-account-header__actions">
                    <button
                        type="button"
                        className="guide-account-btn guide-account-btn--ghost"
                        title={t("guideAccount.loading")}
                        onClick={initialLoad}
                        disabled={busy}
                    >
                        <FiRefreshCw />
                    </button>

                    <button
                        type="button"
                        className="guide-account-btn guide-account-btn--primary"
                        onClick={() => setChatOpen(true)}
                        title={t("ui.openChat")}
                    >
                        <FiMessageSquare />
                        <span>{t("ui.openChat")}</span>
                        {/* unread badge */}
                        {!chatOpen && (chatLoading ? (
                            <span className="guide-account-badge guide-account-badge--muted">…</span>
                        ) : chatUnread > 0 ? (
                            <span className="guide-account-badge">{chatUnread}</span>
                        ) : null)}
                    </button>
                </div>

                {busy && <span className="guide-account-busy">{t("guideAccount.loading")}</span>}
                {error && <span className="guide-account-error">{error}</span>}
            </div>

            <div className="guide-account-tabs">
                <Tab id="profile" label={t("guideAccount.tabs.profile")} icon={FiUser} />
                <Tab id="unavailability" label={t("guideAccount.tabs.unavailability")} icon={FiCalendar} />
                <Tab id="bookings" label={t("guideAccount.tabs.bookings")} icon={FiClipboard} />
                <Tab id="portfolio" label={t("guideAccount.tabs.portfolio")} icon={FiImage} />
                <Tab id="verification" label={t("guideAccount.tabs.verification")} icon={FiFileText} />
                <Tab id="stats" label={t("guideAccount.tabs.stats")} icon={FiBarChart2} />
            </div>

            {/* PROFILE */}
            {tab === "profile" && (
                <section className="guide-account-section">
                    <div className="guide-account-grid">
                        {/* Avatar */}
                        <div className="guide-account-card">
                            <h3 className="guide-account-card__title">
                                <FiCamera /> {t("guideAccount.avatar.title")}
                            </h3>
                            <div className="guide-account-avatar">
                                {avatarUrl ? (
                                    <img
                                        className="guide-account-avatar__img"
                                        src={avatarUrl}
                                        alt={t("guideAccount.avatar.alt")}
                                    />
                                ) : (
                                    <div className="guide-account-avatar__placeholder">
                                        {t("guideAccount.avatar.noAvatar")}
                                    </div>
                                )}
                            </div>
                            <div className="guide-account-avatar__actions">
                                <input
                                    ref={avatarInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => uploadAvatar(e.target.files?.[0])}
                                    className="guide-account-input"
                                />
                                {avatarUrl && (
                                    <button
                                        type="button"
                                        onClick={deleteAvatar}
                                        className="guide-account-btn guide-account-btn--danger"
                                    >
                                        {t("guideAccount.avatar.delete")}
                                    </button>
                                )}
                            </div>
                            <p className="guide-account-hint">{t("guideAccount.avatar.hint")}</p>
                        </div>

                        {/* Profile form */}
                        <div className="guide-account-card">
                            <h3 className="guide-account-card__title">
                                <FiUser /> {t("guideAccount.profile.title")}
                            </h3>
                            <form onSubmit={submitProfile} className="guide-account-form">
                                <label className="guide-account-label">
                                    {t("guideAccount.profile.bio")}
                                    <textarea
                                        name="professional_bio"
                                        value={profileForm.professional_bio}
                                        onChange={onField(setProfileForm)}
                                        className="guide-account-textarea"
                                        rows={4}
                                    />
                                </label>

                                <label className="guide-account-label">
                                    {t("guideAccount.profile.years")}
                                    <input
                                        type="number"
                                        min={0}
                                        name="years_of_experience"
                                        value={profileForm.years_of_experience}
                                        onChange={onNumber(setProfileForm)}
                                        className="guide-account-input"
                                    />
                                </label>

                                <label className="guide-account-label">
                                    {t("guideAccount.profile.city")}
                                    <select
                                        name="city"
                                        value={profileForm.city ?? ""}
                                        onChange={onField(setProfileForm)}
                                        className="guide-account-select"
                                    >
                                        <option value="">{t("guideAccount.select.placeholder")}</option>
                                        {cities.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label className="guide-account-label">
                                    {t("guideAccount.profile.languages")}
                                    <select
                                        multiple
                                        name="languages"
                                        value={profileForm.languages}
                                        onChange={onMulti(setProfileForm)}
                                        className="guide-account-select"
                                    >
                                        {languages.map((l) => (
                                            <option key={l.id} value={l.id}>
                                                {l.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label className="guide-account-label">
                                    {t("guideAccount.profile.serviceTypes")}
                                    <select
                                        multiple
                                        name="service_types"
                                        value={profileForm.service_types}
                                        onChange={onMulti(setProfileForm)}
                                        className="guide-account-select"
                                    >
                                        {serviceTypes.map((s) => (
                                            <option key={s.id} value={s.id}>
                                                {s.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <div className="guide-account-row">
                                    <label className="guide-account-label guide-account-col">
                                        {t("guideAccount.profile.hourly")}
                                        <input
                                            type="number"
                                            min={0}
                                            name="hourly_rate"
                                            value={profileForm.hourly_rate ?? ""}
                                            onChange={onNumber(setProfileForm)}
                                            className="guide-account-input"
                                        />
                                    </label>
                                    <label className="guide-account-label guide-account-col">
                                        {t("guideAccount.profile.daily")}
                                        <input
                                            type="number"
                                            min={0}
                                            name="daily_rate"
                                            value={profileForm.daily_rate ?? ""}
                                            onChange={onNumber(setProfileForm)}
                                            className="guide-account-input"
                                        />
                                    </label>
                                    <label className="guide-account-label guide-account-col">
                                        {t("guideAccount.profile.currency")}
                                        <input
                                            type="text"
                                            name="currency"
                                            value={profileForm.currency}
                                            onChange={onField(setProfileForm)}
                                            className="guide-account-input"
                                        />
                                    </label>
                                </div>

                                <label className="guide-account-check">
                                    <input
                                        type="checkbox"
                                        name="is_available"
                                        checked={!!profileForm.is_available}
                                        onChange={onField(setProfileForm)}
                                    />
                                    <span>{t("guideAccount.profile.available")}</span>
                                </label>

                                <div className="guide-account-actions">
                                    <button className="guide-account-btn" type="submit" disabled={busy}>
                                        {t("guideAccount.save")}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    {profile && (
                        <div className="guide-account-meta">
                            <div className="guide-account-meta__item">
                                <strong>{t("guideAccount.meta.name")}:</strong> {profile.full_name} ({profile.email})
                            </div>
                            <div className="guide-account-meta__item">
                                <strong>{t("guideAccount.meta.stats")}:</strong>{" "}
                                {t("guideAccount.meta.reviews", { count: profile.total_reviews ?? 0 })} |{" "}
                                {t("guideAccount.meta.rating", { rating: profile.average_rating ?? 0 })}
                            </div>
                            <div className="guide-account-meta__item">
                                <strong>ID:</strong> user={userId ?? "-"} | customerProfile={customerId ?? "-"}
                            </div>
                        </div>
                    )}
                </section>
            )}

            {/* UNAVAILABILITY */}
            {tab === "unavailability" && (
                <section className="guide-account-section">
                    <h3 className="guide-account-card__title">
                        <FiCalendar /> {t("guideAccount.unavail.title")}
                    </h3>
                    <form onSubmit={createOrUpdateUnavail} className="guide-account-form">
                        <div className="guide-account-row">
                            <label className="guide-account-label guide-account-col">
                                {t("guideAccount.unavail.start")}
                                <input
                                    type="date"
                                    name="start_date"
                                    value={unavailForm.start_date}
                                    onChange={onField(setUnavailForm)}
                                    className="guide-account-input"
                                    required
                                />
                            </label>
                            <label className="guide-account-label guide-account-col">
                                {t("guideAccount.unavail.end")}
                                <input
                                    type="date"
                                    name="end_date"
                                    value={unavailForm.end_date}
                                    onChange={onField(setUnavailForm)}
                                    className="guide-account-input"
                                    required
                                />
                            </label>
                        </div>
                        <label className="guide-account-label">
                            {t("guideAccount.unavail.reason")}
                            <input
                                type="text"
                                name="reason"
                                value={unavailForm.reason}
                                onChange={onField(setUnavailForm)}
                                className="guide-account-input"
                                placeholder={t("guideAccount.unavail.reasonPh")}
                            />
                        </label>

                        {canCheckLocalAvailability && (
                            <div
                                className={`guide-account-unavail-check ${
                                    localAvailability?.ok
                                        ? "guide-account-unavail-check--ok"
                                        : "guide-account-unavail-check--bad"
                                }`}
                            >
                                {localAvailability?.ok
                                    ? t("guideAccount.unavail.localOk")
                                    : t("guideAccount.unavail.localBad", {
                                        reason: localAvailability?.reason,
                                    })}
                            </div>
                        )}

                        <div className="guide-account-actions">
                            <button className="guide-account-btn" type="submit" disabled={busy}>
                                {unavailForm.id ? t("guideAccount.update") : t("guideAccount.add")}
                            </button>
                            {unavailForm.id && (
                                <button
                                    type="button"
                                    className="guide-account-btn guide-account-btn--ghost"
                                    onClick={() =>
                                        setUnavailForm({ id: null, start_date: "", end_date: "", reason: "" })
                                    }
                                >
                                    {t("guideAccount.cancel")}
                                </button>
                            )}
                        </div>
                    </form>

                    <div className="guide-account-list">
                        {unavailList.map((u) => (
                            <div className="guide-account-item" key={u.id}>
                                <div className="guide-account-item__main">
                                    <div className="guide-account-item__title">
                                        {u.start_date} → {u.end_date}
                                    </div>
                                    {u.reason && <div className="guide-account-item__sub">{u.reason}</div>}
                                </div>
                                <div className="guide-account-item__actions">
                                    <button
                                        className="guide-account-btn guide-account-btn--ghost"
                                        onClick={() => editUnavail(u)}
                                    >
                                        {t("guideAccount.edit")}
                                    </button>
                                    <button
                                        className="guide-account-btn guide-account-btn--danger"
                                        onClick={() => deleteUnavail(u.id)}
                                    >
                                        {t("guideAccount.delete")}
                                    </button>
                                </div>
                            </div>
                        ))}
                        {unavailList.length === 0 && (
                            <div className="guide-account-empty">{t("guideAccount.unavail.empty")}</div>
                        )}
                    </div>
                </section>
            )}

            {/* BOOKINGS */}
            {tab === "bookings" && (
                <section className="guide-account-section">
                    <h3 className="guide-account-card__title">
                        <FiClipboard /> {t("guideAccount.bookings.title")}
                    </h3>
                    <div className="guide-account-list">
                        {bookings.map((b) => (
                            <div className="guide-account-item" key={b.id}>
                                <div className="guide-account-item__main">
                                    <div className="guide-account-item__title">
                                        #{b.id} — {b.title ?? t("guideAccount.bookings.noTitle")}
                                    </div>
                                    <div className="guide-account-item__sub">
                                        {b.start_date} → {b.end_date} | {t("guideAccount.bookings.status")}:{" "}
                                        <strong>{b.status_display ?? b.status}</strong>
                                    </div>
                                </div>
                                <div className="guide-account-item__actions">
                                    <button
                                        className="guide-account-btn"
                                        onClick={() => acceptBooking(b.id)}
                                        disabled={busy}
                                        title={t("guideAccount.bookings.accept")}
                                    >
                                        <FiCheckCircle />
                                        {t("guideAccount.bookings.accept")}
                                    </button>
                                    <input
                                        className="guide-account-input guide-account-input--inline"
                                        placeholder={t("guideAccount.bookings.reasonPh")}
                                        value={cancelReason}
                                        onChange={(e) => setCancelReason(e.target.value)}
                                    />
                                    <button
                                        className="guide-account-btn guide-account-btn--danger"
                                        onClick={() => cancelBooking(b.id)}
                                        disabled={busy}
                                        title={t("guideAccount.bookings.cancel")}
                                    >
                                        <FiXCircle />
                                        {t("guideAccount.bookings.cancel")}
                                    </button>
                                </div>
                            </div>
                        ))}
                        {bookings.length === 0 && (
                            <div className="guide-account-empty">{t("guideAccount.bookings.empty")}</div>
                        )}
                    </div>
                </section>
            )}

            {/* PORTFOLIO */}
            {tab === "portfolio" && (
                <section className="guide-account-section">
                    <h3 className="guide-account-card__title">
                        <FiImage /> {t("guideAccount.portfolio.title")}
                    </h3>
                    <form onSubmit={addPortfolio} className="guide-account-form">
                        <label className="guide-account-label">
                            {t("guideAccount.portfolio.titleLabel")}
                            <input
                                className="guide-account-input"
                                name="title"
                                value={portfolioForm.title}
                                onChange={onField(setPortfolioForm)}
                            />
                        </label>
                        <label className="guide-account-label">
                            {t("guideAccount.portfolio.desc")}
                            <input
                                className="guide-account-input"
                                name="description"
                                value={portfolioForm.description}
                                onChange={onField(setPortfolioForm)}
                            />
                        </label>
                        <label className="guide-account-label">
                            {t("guideAccount.portfolio.order")}
                            <input
                                type="number"
                                className="guide-account-input"
                                name="order"
                                value={portfolioForm.order}
                                onChange={onNumber(setPortfolioForm)}
                            />
                        </label>
                        <label className="guide-account-label">
                            {t("guideAccount.portfolio.image")}
                            <input
                                ref={portfolioFileRef}
                                type="file"
                                accept="image/*"
                                className="guide-account-input"
                                onChange={(e) =>
                                    setPortfolioForm((s) => ({ ...s, image: e.target.files?.[0] ?? null }))
                                }
                            />
                        </label>
                        <div className="guide-account-actions">
                            <button className="guide-account-btn" type="submit" disabled={busy}>
                                {t("guideAccount.add")}
                            </button>
                        </div>
                    </form>

                    <div className="guide-account-grid">
                        {portfolios.map((p) => (
                            <div key={p.id} className="guide-account-card">
                                <div className="guide-account-card__title">
                                    {p.title || t("guideAccount.portfolio.noTitle")}
                                </div>
                                {p.image && (
                                    <img className="guide-account-card__media" src={p.image} alt={p.title} />
                                )}
                                {p.description && (
                                    <div className="guide-account-card__text">{p.description}</div>
                                )}
                                <div className="guide-account-card__footer">
                                    <button
                                        className="guide-account-btn guide-account-btn--danger"
                                        onClick={() => deletePortfolio(p.id)}
                                    >
                                        {t("guideAccount.delete")}
                                    </button>
                                </div>
                            </div>
                        ))}
                        {portfolios.length === 0 && (
                            <div className="guide-account-empty">{t("guideAccount.portfolio.empty")}</div>
                        )}
                    </div>
                </section>
            )}

            {/* VERIFICATION */}
            {tab === "verification" && (
                <section className="guide-account-section">
                    <h3 className="guide-account-card__title">
                        <FiShield /> {t("guideAccount.verif.title")}
                    </h3>
                    <form onSubmit={addVerif} className="guide-account-form">
                        <label className="guide-account-label">
                            {t("guideAccount.verif.type")}
                            <input
                                className="guide-account-input"
                                name="document_type"
                                value={verifForm.document_type}
                                onChange={onField(setVerifForm)}
                                placeholder={t("guideAccount.verif.typePh")}
                            />
                        </label>
                        <label className="guide-account-label">
                            {t("guideAccount.verif.desc")}
                            <input
                                className="guide-account-input"
                                name="description"
                                value={verifForm.description}
                                onChange={onField(setVerifForm)}
                            />
                        </label>
                        <label className="guide-account-label">
                            {t("guideAccount.verif.file")}
                            <input
                                ref={verifFileRef}
                                type="file"
                                className="guide-account-input"
                                onChange={(e) =>
                                    setVerifForm((s) => ({ ...s, file: e.target.files?.[0] ?? null }))
                                }
                            />
                        </label>
                        <div className="guide-account-actions">
                            <button className="guide-account-btn" type="submit" disabled={busy}>
                                {t("guideAccount.add")}
                            </button>
                        </div>
                    </form>

                    <div className="guide-account-list">
                        {verifs.map((v) => (
                            <div className="guide-account-item" key={v.id}>
                                <div className="guide-account-item__main">
                                    <div className="guide-account-item__title">
                                        {v.document_type} {v.is_verified ? "✅" : "⏳"}
                                    </div>
                                    {v.description && (
                                        <div className="guide-account-item__sub">{v.description}</div>
                                    )}
                                </div>
                                <div className="guide-account-item__actions">
                                    <button
                                        className="guide-account-btn guide-account-btn--danger"
                                        onClick={() => deleteVerif(v.id)}
                                    >
                                        {t("guideAccount.delete")}
                                    </button>
                                </div>
                            </div>
                        ))}
                        {verifs.length === 0 && (
                            <div className="guide-account-empty">{t("guideAccount.verif.empty")}</div>
                        )}
                    </div>
                </section>
            )}

            {/* STATS */}
            {tab === "stats" && (
                <section className="guide-account-section">
                    <h3 className="guide-account-card__title">
                        <FiBarChart2 /> {t("guideAccount.stats.title")}
                    </h3>

                    {/* KPI cards */}
                    <div className="guide-account-grid">
                        <div className="guide-account-kpi">
                            <div className="guide-account-kpi__label">
                                <FiStar /> {t("guideAccount.stats.avgRating")}
                            </div>
                            <div className="guide-account-kpi__value">
                                {profile?.average_rating ?? 0}/5
                            </div>
                        </div>
                        <div className="guide-account-kpi">
                            <div className="guide-account-kpi__label">
                                <FiStar /> {t("guideAccount.stats.totalReviews")}
                            </div>
                            <div className="guide-account-kpi__value">{profile?.total_reviews ?? 0}</div>
                        </div>
                        <div className="guide-account-kpi">
                            <div className="guide-account-kpi__label">
                                <FiClipboard /> {t("guideAccount.stats.totalBookings")}
                            </div>
                            <div className="guide-account-kpi__value">
                                {profile?.total_bookings ?? bookings.length}
                            </div>
                        </div>
                        <div className="guide-account-kpi">
                            <div className="guide-account-kpi__label">
                                <FiShield /> {t("guideAccount.stats.verified")}
                            </div>
                            <div className="guide-account-kpi__value">
                                {profile?.is_verified ? "✅" : "⏳"}
                            </div>
                        </div>
                    </div>

                    {/* Booking breakdown */}
                    <div className="guide-account-card">
                        <div className="guide-account-card__title">
                            {t("guideAccount.stats.bookingBreakdown")}
                        </div>
                        <div className="guide-account-stats-grid">
                            {Object.keys(bookingsByStatus).length > 0 ? (
                                Object.entries(bookingsByStatus).map(([k, v]) => (
                                    <div key={k} className="guide-account-stats-chip">
                                        <span className="guide-account-stats-chip__label">{k}</span>
                                        <span className="guide-account-stats-chip__value">{v}</span>
                                    </div>
                                ))
                            ) : (
                                <div className="guide-account-empty">{t("guideAccount.stats.noBookings")}</div>
                            )}
                        </div>
                    </div>

                    {/* Upcoming bookings & unavailability */}
                    <div className="guide-account-grid">
                        <div className="guide-account-card">
                            <div className="guide-account-card__title">
                                {t("guideAccount.stats.upcomingBookings", { count: totalUpcomingBookings })}
                            </div>
                            <div className="guide-account-list">
                                {upcomingBookings.map((b) => (
                                    <div className="guide-account-item" key={b.id}>
                                        <div className="guide-account-item__main">
                                            <div className="guide-account-item__title">
                                                #{b.id} — {b.title ?? t("guideAccount.bookings.noTitle")}
                                            </div>
                                            <div className="guide-account-item__sub">
                                                {b.start_date} → {b.end_date} | {t("guideAccount.bookings.status")}:{" "}
                                                <strong>{b.status_display ?? b.status}</strong>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {upcomingBookings.length === 0 && (
                                    <div className="guide-account-empty">{t("guideAccount.stats.noUpcoming")}</div>
                                )}
                            </div>
                        </div>

                        <div className="guide-account-card">
                            <div className="guide-account-card__title">
                                {t("guideAccount.stats.unavailDaysUpcoming")}
                            </div>
                            <div className="guide-account-kpi guide-account-kpi--inline">
                                <div className="guide-account-kpi__value">{totalUnavailabilityDaysUpcoming}</div>
                                <div className="guide-account-kpi__label">{t("guideAccount.stats.days")}</div>
                            </div>
                        </div>
                    </div>

                    {/* Latest reviews */}
                    <div className="guide-account-card">
                        <div className="guide-account-card__title">
                            {t("guideAccount.stats.latestReviews")}
                        </div>
                        <div className="guide-account-list">
                            {latestReviews.map((r) => (
                                <div className="guide-account-item" key={r.id}>
                                    <div className="guide-account-item__main">
                                        <div className="guide-account-item__title">
                                            {r.title || t("guideAccount.reviews.noTitle")} — {r.overall_rating}/5
                                        </div>
                                        {r.comment && (
                                            <div className="guide-account-item__sub">{r.comment}</div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {latestReviews.length === 0 && (
                                <div className="guide-account-empty">{t("guideAccount.stats.noReviews")}</div>
                            )}
                        </div>
                    </div>
                </section>
            )}

            {/* Floating Chat FAB (optional duplicate to header button) */}
            <button
                className="guide-account-fab"
                title={t("ui.openChat")}
                onClick={() => setChatOpen(true)}
            >
                <FiMessageSquare />
                {chatUnread > 0 && !chatOpen && (
                    <span className="guide-account-fab__badge">{chatUnread}</span>
                )}
            </button>

            <ChatModal
                open={chatOpen}
                onClose={async () => {
                    setChatOpen(false);
                    await refreshChatUnread(); // sizda bor funksiya
                }}
                title={t("ui.openChat")}
            >
                <ChatWidgets />
            </ChatModal>
        </div>
    );
}
