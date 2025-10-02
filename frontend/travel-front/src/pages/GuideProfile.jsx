// src/pages/GuideProfile.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    Calendar, MapPin, MessageCircle, Users,
    CheckCircle2, AlertCircle, ChevronLeft, Search, Star, Filter,
    ChevronLeft as PrevIcon, ChevronRight as NextIcon
} from "lucide-react";

import {
    getCustomer as getCustomerProfile,
    portfolioList,
} from "../api/profiles";
import { checkAvailabilityAuto } from "../api/bookings";
import api from "../api/api";
import { useUser } from "../context/UserContext";
import { useLanguage } from "../context/LanguageContext";

/* ================== Utils ================== */
async function safeGet(url, { params, def = null } = {}) {
    try {
        const { data } = await api.get(url, { params });
        return data ?? def;
    } catch (e) {
        console.error("GET failed:", url, e?.response?.data || e?.message);
        return def;
    }
}

async function resolveCustomerPk(maybeId) {
    if (!maybeId) return null;
    const s = String(maybeId);
    if (/^\d+$/.test(s)) return s;

    let d = await safeGet(`profiles/customers/${encodeURIComponent(s)}/`);
    if (!d) d = await safeGet(`profiles/customers/by-user/${encodeURIComponent(s)}/`);
    if (!d) d = await safeGet(`profiles/customers/resolve/`, { params: { user: s } });

    const id = d?.id || d?.profile_id || null;
    return id ? String(id) : null;
}

/* ---------- Field helpers ---------- */
const pickName = (g) =>
    g?.user_full_name || g?.full_name || g?.first_name || g?.user?.full_name || "Guide";

const pickLocation = (g) => {
    const city = g?.city_name || g?.city || "";
    const country = g?.country_name || g?.country || "";
    if (city && country) return `${city}, ${country}`;
    return country || city || "—";
};

const pickAvatar = (g) =>
    g?.avatar_url || g?.user?.avatar_url || g?.avatar || "https://placehold.co/120?text=%F0%9F%91%A4";

/* ---------- Normalizer for list cards ---------- */
function normalizeGuideCard(g) {
    return {
        id: g?.user_uuid || g?.user_id || g?.user?.id || g?.id,
        full_name: pickName(g),
        avatar_url: g?.avatar_url || g?.user?.avatar_url || null,
        city: g?.city_name || g?.city || "",
        country: g?.country_name || g?.country || "",
        rating:
            typeof g?.average_rating === "number"
                ? g.average_rating
                : typeof g?.rating === "number"
                    ? g.rating
                    : null,
        total_reviews: g?.total_reviews || g?.reviews_count || g?.reviews || 0,
        professional_bio: g?.professional_bio || g?.bio || g?.description || "",
        years_of_experience: g?.years_of_experience || g?.experience_years || 0,
        languages: Array.isArray(g?.languages)
            ? g.languages.map((x) => x?.name || x).filter(Boolean)
            : [],
        is_available: g?.is_available ?? true,
    };
}

/* ================== Component ================== */
export default function GuideProfile() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { isAuthenticated } = useUser();
    const { t } = useLanguage();

    const isDetail = !!id;

    /* ================== LIST (qidiruv + filtrlash) ================== */
    // raw list
    const [allGuides, setAllGuides] = useState([]);
    const [isListLoading, setIsListLoading] = useState(false);
    const [listError, setListError] = useState("");

    // filters: name/lastname, country, min rating
    const [qName, setQName] = useState("");
    const [countryFilter, setCountryFilter] = useState("");
    const [minRating, setMinRating] = useState("");

    // pagination (client-side)
    const [page, setPage] = useState(1);
    const pageSize = 12;

    // load guides (serverga ham filterlarni jo‘natamiz; backend qo‘llamasa — client-side baribir ishlaydi)
    const loadGuides = async () => {
        setIsListLoading(true);
        setListError("");
        try {
            const params = {
                page: 1,
                page_size: 200,          // ko‘proq yuklab, client-side filter/pagination
                ordering: "-average_rating",
                is_public: true,
            };
            const q = qName.trim();
            if (q) params.q = q;                  // ism/lastname qidiruvi
            if (countryFilter) params.country = countryFilter; // agar backend 'country' ni qabul qilsa
            if (minRating) params.min_rating = Number(minRating); // agar backend qo‘llasa

            const data = await safeGet("profiles/customers/", { params, def: { results: [], count: 0 } });
            const results = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
            setAllGuides(results.map(normalizeGuideCard));
        } catch (e) {
            setListError(t("guide.list.error"));
        } finally {
            setIsListLoading(false);
        }
    };

    useEffect(() => {
        // list rejimiga kirganda yoki qaytganda ro‘yxatni yuklaymiz
        if (!isDetail) loadGuides();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isDetail]);

    // unique countries for dropdown
    const countryOptions = useMemo(() => {
        const setC = new Set();
        allGuides.forEach((g) => {
            const c = (g.country || "").trim();
            if (c) setC.add(c);
        });
        return [t("guide.list.allCountries"), ...Array.from(setC).sort()];
    }, [allGuides, t]);

    // filtered + paginated list (client-side fallback)
    const filteredGuides = useMemo(() => {
        const q = qName.trim().toLowerCase();
        const selectedCountry = (countryFilter || "").toLowerCase();
        const mr = minRating ? Number(minRating) : null;

        return allGuides.filter((g) => {
            const okName = !q || (g.full_name || "").toLowerCase().includes(q);
            const okCountry = !selectedCountry || (g.country || "").toLowerCase() === selectedCountry;
            const r = typeof g.rating === "number" ? g.rating : Number(g.rating);
            const okRating = mr === null || (Number.isFinite(r) ? r : 0) >= mr;
            return okName && okCountry && okRating;
        });
    }, [allGuides, qName, countryFilter, minRating]);

    const total = filteredGuides.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const pagedGuides = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filteredGuides.slice(start, start + pageSize);
    }, [filteredGuides, page]);

    const onApplyFilters = (e) => {
        e?.preventDefault?.();
        setPage(1);
        loadGuides();
    };

    const clearFilters = () => {
        setQName("");
        setCountryFilter("");
        setMinRating("");
        setPage(1);
        loadGuides();
    };

    const goDetail = (uid) => {
        if (!uid) return;
        navigate(`/guides/${encodeURIComponent(uid)}`); // profil ochiladi
    };

    /* ================== DETAIL (faqat :id bo‘lsa) ================== */
    const [guide, setGuide] = useState(null);
    const [portfolio, setPortfolio] = useState([]);
    const [loading, setLoading] = useState(isDetail);

    useEffect(() => {
        if (!isDetail) {
            setGuide(null);
            setPortfolio([]);
            setLoading(false);
            return;
        }
        (async () => {
            setLoading(true);
            try {
                let guideData = await getCustomerProfile(id).catch(() => null);
                if (guideData && guideData.data) guideData = guideData.data;

                if (!guideData) {
                    const candidates = [
                        `profiles/customers/${encodeURIComponent(id)}/`,
                        `profiles/customers/detail/${encodeURIComponent(id)}/`,
                    ];
                    for (const u of candidates) {
                        const d = await safeGet(u, { def: null });
                        if (d) {
                            guideData = d;
                            break;
                        }
                    }
                }

                setGuide({
                    ...guideData,
                    avatar_url: guideData?.avatar_url || guideData?.user?.avatar_url || null,
                });

                if (guideData?.user_id) {
                    const pRes = await portfolioList({ customer: guideData.user_id }).catch(() => ({ results: [] }));
                    setPortfolio(Array.isArray(pRes?.results) ? pRes.results : Array.isArray(pRes) ? pRes : []);
                } else {
                    setPortfolio([]);
                }
            } finally {
                setLoading(false);
            }
        })();
    }, [id, isDetail]);

    const fullName = useMemo(() => pickName(guide), [guide]);
    const locationText = useMemo(() => pickLocation(guide || {}), [guide]);
    const languageText = useMemo(
        () => (guide?.languages || []).map((l) => l?.name || l).filter(Boolean).join(", "),
        [guide]
    );

    const bookingTargetId = id || null;
    const canBook = Boolean(bookingTargetId);
    const openChat = () => navigate(`/chat?user=${encodeURIComponent(String(id))}`);

    // Booking states
    const { isAuthenticated: authed } = useUser();
    const [showForm, setShowForm] = useState(false);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [guests, setGuests] = useState(1);
    const [note, setNote] = useState("");

    const [checkingAvailability, setCheckingAvailability] = useState(false);
    const [availabilityOk, setAvailabilityOk] = useState(null);
    const [creating, setCreating] = useState(false);
    const [result, setResult] = useState({ ok: null, msg: "" });
    const [customerPk, setCustomerPk] = useState(null);

    const handleRequestBooking = () => {
        if (!authed) {
            navigate("/auth");
            return;
        }
        setShowForm(true);
    };

    const handleCheckAvailability = async () => {
        let pk = customerPk;
        if (!pk) {
            pk = await resolveCustomerPk(id);
            setCustomerPk(pk);
        }
        if (!pk) return alert(t("guide.detail.resolveError"));
        if (!startDate || !endDate) return alert(t("guide.detail.chooseDates"));

        setCheckingAvailability(true);
        try {
            const { ok } = await checkAvailabilityAuto({
                customer: String(pk),
                start_date: startDate,
                end_date: endDate,
            });
            setAvailabilityOk(ok);
            alert(ok ? t("guide.detail.availableOk") : t("guide.detail.availableNo"));
        } catch {
            alert(t("guide.detail.availableFail"));
        } finally {
            setCheckingAvailability(false);
        }
    };

    const submitBooking = async (e) => {
        e.preventDefault();
        if (!canBook) {
            setResult({ ok: false, msg: t("guide.detail.noGuideId") });
            return;
        }
        if (!startDate || !endDate) {
            setResult({ ok: false, msg: t("guide.detail.selectDates") });
            return;
        }
        if (new Date(startDate) > new Date(endDate)) {
            setResult({ ok: false, msg: t("guide.detail.endAfterStart") });
            return;
        }
        if (availabilityOk === false) {
            setResult({ ok: false, msg: t("guide.detail.notAvailable") });
            return;
        }
        setCreating(true);
        setResult({ ok: null, msg: "" });

        const params = new URLSearchParams({
            start_date: startDate,
            end_date: endDate,
            guests: String(guests || 1),
            ...(note ? { description: note } : {}),
        });

        const profileId = await resolveCustomerPk(bookingTargetId);
        if (!profileId) {
            setResult({ ok: false, msg: t("guide.detail.resolveError") });
            setCreating(false);
            return;
        }
        navigate(`/booking/${encodeURIComponent(profileId)}?${params.toString()}`);

        setCreating(false);
        setResult({ ok: true, msg: t("guide.detail.redirecting") });
        setShowForm(false);
    };

    const handleCancel = () => {
        setShowForm(false);
        setStartDate("");
        setEndDate("");
        setGuests(1);
        setNote("");
        setAvailabilityOk(null);
        setResult({ ok: null, msg: "" });
    };

    /* ================== Render ================== */
    return (
        <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8 space-y-8">

            {/* ======= LIST: faqat /guides (id yo‘q) bo‘lsa ko‘rinadi ======= */}
            {!isDetail && (
                <div>
                    <div className="flex items-center justify-between">
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                            {t("guide.list.title")}
                        </h1>
                        <button
                            onClick={onApplyFilters}
                            className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-dark-700"
                        >
                            <Filter className="h-4 w-4" /> {t("guide.list.apply")}
                        </button>
                    </div>

                    <form
                        onSubmit={onApplyFilters}
                        className="bg-white dark:bg-dark-900 border border-gray-200 dark:border-dark-700 rounded-xl p-4 grid md:grid-cols-5 gap-3 mt-3"
                    >
                        {/* Name / Lastname text search */}
                        <div className="md:col-span-2">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder={t("guide.list.placeholder")}
                                    value={qName}
                                    onChange={(e) => setQName(e.target.value)}
                                    className="w-full p-3 pl-9 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-dark-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-dark-700 placeholder-gray-400 dark:placeholder-gray-500"
                                />
                                <Search className="h-4 w-4 text-gray-400 absolute left-3 top-3.5" />
                            </div>
                        </div>

                        {/* Country */}
                        <div>
                            <select
                                value={countryFilter}
                                onChange={(e) => setCountryFilter(e.target.value)}
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-dark-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-dark-700"
                            >
                                {countryOptions.map((c) => (
                                    <option key={c} value={c === t("guide.list.allCountries") ? "" : c}>
                                        {c}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Min rating */}
                        <div>
                            <select
                                value={minRating}
                                onChange={(e) => setMinRating(e.target.value)}
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-dark-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-dark-700"
                            >
                                <option value="">{t("guide.list.anyRating")}</option>
                                <option value="3">3.0★+</option>
                                <option value="4">4.0★+</option>
                                <option value="4.5">4.5★+</option>
                                <option value="5">5.0★</option>
                            </select>
                        </div>

                        {/* Actions */}
                        <div className="md:col-span-5 flex flex-wrap gap-3 pt-2">
                            <button
                                type="submit"
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                {t("guide.list.search")}
                            </button>
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-dark-700"
                            >
                                {t("guide.list.clear")}
                            </button>
                        </div>
                    </form>

                    <div className="bg-white dark:bg-dark-900 border border-gray-200 dark:border-dark-700 rounded-xl p-4 mt-4">
                        {isListLoading ? (
                            <div className="p-8 text-center text-gray-600 dark:text-gray-300">{t("common.loading")}</div>
                        ) : listError ? (
                            <div className="p-8 text-center text-red-600">{listError}</div>
                        ) : pagedGuides.length ? (
                            <>
                                <div className="grid md:grid-cols-3 gap-4">
                                    {pagedGuides.map((g) => (
                                        <div key={g.id} className="border border-gray-200 dark:border-dark-700 rounded-lg p-4 flex flex-col bg-white dark:bg-dark-900">
                                            <div className="flex items-center gap-3">
                                                {g.avatar_url ? (
                                                    <img src={g.avatar_url} alt={g.full_name} className="w-12 h-12 rounded-full object-cover" />
                                                ) : (
                                                    <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-dark-700" />
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-semibold truncate text-gray-900 dark:text-gray-100">{g.full_name}</div>
                                                    <div className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1 truncate">
                                                        <MapPin className="h-3 w-3" />
                                                        {g.city || g.country || "—"}
                                                    </div>
                                                </div>
                                                {typeof g.rating === "number" && (
                                                    <div className="text-sm text-yellow-600 inline-flex items-center gap-1">
                                                        <Star className="h-4 w-4 fill-current" />
                                                        {g.rating.toFixed(1)}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                                                {t("guide.list.experience")}: {g.years_of_experience} {t("guide.list.years")}
                                            </div>
                                            <div className="mt-2 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                                                {g.professional_bio || "—"}
                                            </div>

                                            <div className="mt-auto pt-4 flex items-center justify-between">
                                                <button
                                                    onClick={() => goDetail(g.id)}
                                                    className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                                >
                                                    {t("guide.list.viewProfile")}
                                                </button>
                                                {!!g.total_reviews && (
                                                    <div className="text-xs text-gray-600 dark:text-gray-300">
                                                        {g.total_reviews} {t("common.reviews")}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Pagination */}
                                <div className="flex items-center justify-center gap-2 mt-6 text-gray-800 dark:text-gray-200">
                                    <button
                                        disabled={page <= 1}
                                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                                        className={`px-3 py-2 border rounded-lg border-gray-200 dark:border-dark-700 ${page <= 1 ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50 dark:hover:bg-dark-800"}`}
                                        title={t("guide.list.prev")}
                                    >
                                        <PrevIcon className="h-4 w-4" />
                                    </button>
                                    <div className="text-sm">
                                        {t("guide.list.page")} <span className="font-semibold">{page}</span> {t("guide.list.of")}{" "}
                                        <span className="font-semibold">{totalPages}</span>
                                    </div>
                                    <button
                                        disabled={page >= totalPages}
                                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                        className={`px-3 py-2 border rounded-lg border-gray-200 dark:border-dark-700 ${page >= totalPages ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50 dark:hover:bg-dark-800"}`}
                                        title={t("guide.list.next")}
                                    >
                                        {t("guide.list.next")} <NextIcon className="h-4 w-4 inline-block ml-1" />
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="p-8 text-center text-gray-600 dark:text-gray-300">{t("guide.list.empty")}</div>
                        )}
                    </div>
                </div>
            )}

            {/* ======= DETAIL: faqat /guides/:id bo‘lsa ko‘rinadi ======= */}
            {isDetail && (
                <>
                    {loading && (
                        <div className="min-h-[30vh] grid place-items-center text-gray-600 dark:text-gray-300">{t("common.loading")}</div>
                    )}
                    {!loading && !guide && (
                        <div className="min-h-[30vh] grid place-items-center text-gray-600 dark:text-gray-300">{t("guide.detail.notFound")}</div>
                    )}
                    {!loading && guide && (
                        <>
                            <button
                                onClick={() => navigate("/guides")}
                                className="inline-flex items-center gap-2 text-xs sm:text-sm text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white"
                            >
                                <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" /> {t("guide.detail.back")}
                            </button>

                            {/* Header */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                                <img
                                    src={pickAvatar(guide)}
                                    alt="avatar"
                                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border border-gray-200 dark:border-dark-700"
                                />
                                <div className="flex-1">
                                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{pickName(guide)}</h1>
                                    <div className="mt-1 text-gray-600 dark:text-gray-300 flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
                        {locationText}
                    </span>
                                        {typeof guide?.average_rating === "number" && (
                                            <span className="text-yellow-600 font-medium">
                        {Number(guide.average_rating).toFixed(1)}★
                      </span>
                                        )}
                                        {!!guide?.total_reviews && (
                                            <span className="text-gray-500 dark:text-gray-400">{guide.total_reviews} {t("common.reviews")}</span>
                                        )}
                                    </div>
                                    {!!languageText && <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-1">{languageText}</div>}
                                </div>
                            </div>

                            {/* Booking card */}
                            <div className="bg-white dark:bg-dark-900 rounded-lg border border-gray-200 dark:border-dark-700 p-4 sm:p-5">
                                <div className="flex items-center justify-between mb-3 sm:mb-4">
                                    <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">{t("guide.detail.bookTitle")}</h2>
                                    {guide?.is_available === false && (
                                        <span className="text-xs sm:text-sm text-red-600">{t("guide.detail.unavailable")}</span>
                                    )}
                                </div>
                                {!showForm ? (
                                    <button
                                        onClick={handleRequestBooking}
                                        disabled={guide?.is_available === false || !canBook}
                                        className="px-4 py-2 sm:px-5 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-xs sm:text-base"
                                    >
                                        {isAuthenticated ? t("guide.detail.requestBooking") : t("guide.detail.signInToBook")}
                                    </button>
                                ) : (
                                    <form onSubmit={submitBooking} className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                        <div>
                                            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("guide.detail.startDate")}</label>
                                            <div className="relative">
                                                <input
                                                    type="date"
                                                    value={startDate}
                                                    onChange={(e) => setStartDate(e.target.value)}
                                                    className="w-full p-2 sm:p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm bg-white dark:bg-dark-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-dark-700"
                                                    required
                                                />
                                                <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 absolute right-2 sm:right-3 top-2.5 sm:top-3.5" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("guide.detail.endDate")}</label>
                                            <div className="relative">
                                                <input
                                                    type="date"
                                                    value={endDate}
                                                    onChange={(e) => setEndDate(e.target.value)}
                                                    className="w-full p-2 sm:p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm bg-white dark:bg-dark-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-dark-700"
                                                    required
                                                />
                                                <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 absolute right-2 sm:right-3 top-2.5 sm:top-3.5" />
                                            </div>
                                        </div>
                                        <div>
                                            <button
                                                type="button"
                                                onClick={handleCheckAvailability}
                                                disabled={checkingAvailability}
                                                className="px-3 py-1 sm:px-4 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-xs sm:text-sm"
                                            >
                                                {checkingAvailability ? t("guide.detail.checking") : t("guide.detail.check")}
                                            </button>
                                        </div>
                                        <div>
                                            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("guide.detail.guests")}</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    min={1}
                                                    value={guests}
                                                    onChange={(e) => setGuests(Number(e.target.value) || 1)}
                                                    className="w-full p-2 sm:p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm bg-white dark:bg-dark-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-dark-700"
                                                    required
                                                />
                                                <Users className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 absolute right-2 sm:right-3 top-2.5 sm:top-3.5" />
                                            </div>
                                        </div>
                                        <div className="sm:col-span-2">
                                            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                {t("guide.detail.messageLabel")}
                                            </label>
                                            <textarea
                                                rows={3}
                                                value={note}
                                                onChange={(e) => setNote(e.target.value)}
                                                className="w-full p-2 sm:p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm bg-white dark:bg-dark-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-dark-700 placeholder-gray-400 dark:placeholder-gray-500"
                                                placeholder={t("guide.detail.messagePh")}
                                            />
                                        </div>
                                        {result.ok === true && (
                                            <div className="sm:col-span-2 flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg p-2 sm:p-3 text-xs sm:text-sm">
                                                <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
                                                <span>{result.msg}</span>
                                            </div>
                                        )}
                                        {result.ok === false && (
                                            <div className="sm:col-span-2 flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded-lg p-2 sm:p-3 text-xs sm:text-sm">
                                                <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                                                <span>{result.msg}</span>
                                            </div>
                                        )}
                                        <div className="sm:col-span-2 flex gap-3 sm:gap-4">
                                            <button
                                                type="submit"
                                                disabled={creating || availabilityOk === false || !canBook}
                                                className={`px-4 py-2 sm:px-5 sm:py-3 rounded-lg text-white transition-colors text-xs sm:text-base ${
                                                    creating ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                                                }`}
                                            >
                                                {creating ? t("guide.detail.preparing") : t("guide.detail.submit")}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleCancel}
                                                className="px-4 py-2 sm:px-5 sm:py-3 bg-gray-300 text-gray-800 dark:bg-dark-700 dark:text-gray-100 rounded-lg hover:bg-gray-400 dark:hover:bg-dark-600 text-xs sm:text-base"
                                            >
                                                {t("common.cancel")}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>

                            {/* Portfolio */}
                            <div className="bg-white dark:bg-dark-900 rounded-lg border border-gray-200 dark:border-dark-700 p-4 sm:p-5">
                                <div className="font-semibold mb-2 text-base sm:text-lg text-gray-900 dark:text-white">{t("guide.detail.portfolio")}</div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                                    {portfolio.map((item) => (
                                        <div key={item.id} className="border border-gray-200 dark:border-dark-700 rounded-lg p-3 sm:p-4 bg-white dark:bg-dark-900">
                                            {item.image_url && (
                                                <img
                                                    src={item.image_url}
                                                    alt={item.title}
                                                    className="w-full h-24 sm:h-32 object-cover rounded-lg mb-2"
                                                />
                                            )}
                                            <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-gray-100">{item.title}</h3>
                                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">{item.description}</p>
                                        </div>
                                    ))}
                                    {!portfolio?.length && <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-300">{t("guide.detail.noPortfolio")}</div>}
                                </div>
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    );
}
