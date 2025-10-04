// src/pages/GuideProfile.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    Calendar, MapPin, MessageCircle, Users,
    CheckCircle2, AlertCircle, ChevronLeft, Search, Star, Filter,
    CheckCircle, CircleDot, Clock, Award, Globe, Flag,
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
import { buildServicesFromProfile } from "../api/services";

/* ================== Utils ================== */
async function safeGet(url, { params, def = null } = {}) {
    try {
        const { data } = await api.get(url, { params });
        return data ?? def;
    } catch {
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

const pickCountry = (g) => g?.country_name || g?.country || "";
const pickAvatar = (g) =>
    g?.avatar_url || g?.user?.avatar_url || g?.avatar || "https://placehold.co/320x320?text=%F0%9F%91%A4";

const currencySymbol = (cur) => {
    const c = String(cur || "").toUpperCase();
    if (c === "USD" || c === "$") return "$";
    if (c === "EUR" || c === "€") return "€";
    if (c === "GBP" || c === "£") return "£";
    if (c === "UZS") return "so'm";
    return c || "$";
};
const formatPrice = (amount, cur) => {
    if (amount == null) return "";
    const sym = currencySymbol(cur);
    if (sym === "so'm") return `${Number(amount).toLocaleString()} ${sym}`;
    return `${sym}${Number(amount).toFixed(0)}`;
};

/* ---------- Normalizer for list cards ---------- */
function normalizeGuideCard(g) {
    const langs = Array.isArray(g?.languages)
        ? g.languages.map((x) => x?.name || x).filter(Boolean)
        : [];

    const serviceTypes = Array.isArray(g?.service_types)
        ? g.service_types.map((x) => x?.name || x).filter(Boolean)
        : [];

    const ratingVal =
        typeof g?.average_rating === "number"
            ? g.average_rating
            : typeof g?.rating === "number"
                ? g.rating
                : null;

    const hourly = g?.hourly_rate ?? g?.rates?.hourly ?? null;
    const price_text =
        hourly != null ? `${formatPrice(hourly, g?.currency || g?.rates?.currency)}/hour` : "";

    return {
        id: g?.user_uuid || g?.user_id || g?.user?.id || g?.id,
        full_name: pickName(g),
        avatar_url: g?.avatar_url || g?.user?.avatar_url || null,
        city: g?.city_name || g?.city || "",
        country: g?.country_name || g?.country || "",
        rating: ratingVal,
        total_reviews: g?.total_reviews || g?.reviews_count || g?.reviews || 0,
        professional_bio: g?.professional_bio || g?.bio || g?.description || "",
        years_of_experience: g?.years_of_experience || g?.experience_years || 0,
        languages: langs,
        service_types: serviceTypes,
        is_available: g?.is_available ?? true,
        is_verified: !!g?.is_verified || String(g?.verification_status || "").toLowerCase() === "verified",
        price_text,
        hourly_rate: hourly,
        currency: g?.currency,
        member_since: g?.member_since,
        member_since_year: g?.member_since_year,
    };
}

/* ======= Reusable components ======= */
function GuideCard({ g, onView, onBook }) {
    return (
        <div className="border border-gray-200 dark:border-dark-700 rounded-xl p-4 bg-white dark:bg-dark-900 hover:shadow-sm transition">
            <div className="flex gap-4">
                <div className="relative">
                    {g.avatar_url ? (
                        <img
                            src={g.avatar_url}
                            alt={g.full_name}
                            className="w-20 h-20 rounded-full object-cover border border-gray-200 dark:border-dark-700"
                        />
                    ) : (
                        <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-dark-700" />
                    )}
                    {g.is_verified && (
                        <div className="absolute -top-2 -left-2">
              <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-emerald-600 text-white shadow">
                <CheckCircle className="w-3 h-3" />
                Tasdiqlangan
              </span>
                        </div>
                    )}
                    {g.is_available && (
                        <div className="absolute -bottom-2 left-0">
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-white dark:bg-dark-900 border border-emerald-300 text-emerald-700">
                <CircleDot className="w-3 h-3" />
                Available Now
              </span>
                        </div>
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-3">
                        <div>
                            <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{g.full_name}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {g.city || g.country || "—"}
                            </div>
                        </div>

                        <div className="text-right shrink-0">
                            {typeof g.rating === "number" && (
                                <div className="text-sm text-yellow-600 inline-flex items-center gap-1 justify-end">
                                    <Star className="h-4 w-4 fill-current" />
                                    {g.rating.toFixed(1)}
                                    {g.total_reviews ? (
                                        <span className="text-gray-500 dark:text-gray-400 ml-1">
                      ({g.total_reviews} reviews)
                    </span>
                                    ) : null}
                                </div>
                            )}
                            {g.price_text && (
                                <div className="text-blue-600 font-semibold mt-1">
                                    {g.price_text}
                                </div>
                            )}
                        </div>
                    </div>

                    {!!g.service_types?.length && (
                        <div className="mt-2 flex flex-wrap gap-2">
                            {g.service_types.slice(0, 4).map((s, i) => (
                                <span
                                    key={`${s}-${i}`}
                                    className="px-2 py-1 rounded-full text-xs bg-blue-50 dark:bg-dark-800 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-dark-700"
                                >
                  {s}
                </span>
                            ))}
                            {g.service_types.length > 4 && (
                                <span className="px-2 py-1 rounded-full text-xs bg-gray-50 dark:bg-dark-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-dark-700">
                  +{g.service_types.length - 4} more
                </span>
                            )}
                        </div>
                    )}

                    <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                        {g.languages?.length ? <div>Gapiradi: {g.languages.join(", ")}</div> : null}
                        <div className="text-gray-500 dark:text-gray-400">Odatda javob beradi within 1 hour</div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                        <button onClick={onView} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
                            Profilni ko'rish
                        </button>
                        <button
                            onClick={onBook}
                            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-dark-700 hover:bg-gray-50 dark:hover:bg-dark-800 text-gray-800 dark:text-gray-200"
                        >
                            Hozir band qilish
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ServiceCard({ s, onBook }) {
    const hasDur = s.duration_min || s.duration_max;
    const durText = hasDur ? `Duration: ${s.duration_min ?? "?"}-${s.duration_max ?? "?"} hours` : "";
    const priceText = s.price != null ? `${formatPrice(s.price, s.currency)}/hr` : "";

    return (
        <div className="flex items-stretch justify-between gap-4 border rounded-xl border-gray-200 dark:border-dark-700 p-4">
            <div className="min-w-0">
                <div className="font-semibold text-gray-900 dark:text-gray-100 text-base">{s.title}</div>
                {s.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-3">
                        {s.description}
                    </p>
                )}
                {hasDur && <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">{durText}</div>}
            </div>

            <div className="flex flex-col items-end justify-between shrink-0">
                <div className="text-blue-600 font-semibold text-lg">{priceText}</div>
                <button onClick={onBook} className="mt-3 px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm">
                    Book This Service
                </button>
            </div>
        </div>
    );
}

/* ================== Component ================== */
export default function GuideProfile() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { isAuthenticated } = useUser();
    const { t } = useLanguage();

    const isDetail = !!id;

    /* ===== LIST ===== */
    const [allGuides, setAllGuides] = useState([]);
    const [isListLoading, setIsListLoading] = useState(false);
    const [listError, setListError] = useState("");
    const [qName, setQName] = useState("");
    const [countryFilter, setCountryFilter] = useState("");
    const [minRating, setMinRating] = useState("");
    const [page, setPage] = useState(1);
    const pageSize = 12;

    const loadGuides = async () => {
        setIsListLoading(true);
        setListError("");
        try {
            const params = { page: 1, page_size: 200, ordering: "-average_rating", is_public: true };
            const q = qName.trim();
            if (q) params.q = q;
            if (countryFilter) {
                params.country_name = countryFilter;
                params.country = countryFilter;
            }
            if (minRating) params.min_rating = Number(minRating);

            const data = await safeGet("profiles/customers/", { params, def: { results: [], count: 0 } });
            const results = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
            setAllGuides(results.map(normalizeGuideCard));
        } catch {
            setListError(t("guide.list.error"));
        } finally {
            setIsListLoading(false);
        }
    };

    useEffect(() => { if (!isDetail) loadGuides(); /* eslint-disable-next-line */ }, [isDetail]);

    const countryOptions = useMemo(() => {
        const setC = new Set();
        allGuides.forEach((g) => { const c = (g.country || "").trim(); if (c) setC.add(c); });
        return [t("guide.list.allCountries"), ...Array.from(setC).sort()];
    }, [allGuides, t]);

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

    const onApplyFilters = (e) => { e?.preventDefault?.(); setPage(1); loadGuides(); };
    const clearFilters = () => { setQName(""); setCountryFilter(""); setMinRating(""); setPage(1); loadGuides(); };

    const goDetail = (uid) => { if (!uid) return; navigate(`/guides/${encodeURIComponent(uid)}`); };
    const goBookNowFromList = async (uid) => {
        const profileId = await resolveCustomerPk(uid);
        if (!profileId) return alert("Guide ID aniqlanmadi");
        navigate(`/booking/${encodeURIComponent(profileId)}`);
    };

    /* ===== DETAIL ===== */
    const [guide, setGuide] = useState(null);
    const [portfolio, setPortfolio] = useState([]);
    const [services, setServices] = useState([]); // My Services (synthetic)
    const [loading, setLoading] = useState(isDetail);

    const pickHeadline = (g) =>
        g?.headline ||
        g?.title ||
        (Array.isArray(g?.service_types) && g.service_types.length
            ? `${g.service_types[0]?.name || g.service_types[0]} Guide`
            : "Professional Local Guide");

    const getResponseRate = (g) => {
        if (g?.response_rate != null) {
            const v = Number(g.response_rate);
            return v <= 1 ? Math.round(v * 100) : Math.round(v);
        }
        return 0;
    };
    const getYears = (g) => Number(g?.years_of_experience || 0);
    const getLangCount = (g) => (Array.isArray(g?.languages) ? g.languages.length : 0);

    useEffect(() => {
        if (!isDetail) { setGuide(null); setPortfolio([]); setServices([]); setLoading(false); return; }
        (async () => {
            setLoading(true);
            try {
                // 1) Guide ma'lumotlari
                let guideData = await getCustomerProfile(id).then(r => r?.data).catch(() => null);
                if (!guideData) {
                    const candidates = [
                        `profiles/customers/${encodeURIComponent(id)}/`,
                        `profiles/customers/detail/${encodeURIComponent(id)}/`,
                    ];
                    for (const u of candidates) {
                        const d = await safeGet(u, { def: null });
                        if (d) { guideData = d; break; }
                    }
                }
                if (!guideData) { setGuide(null); return; }

                setGuide({
                    ...guideData,
                    avatar_url: guideData?.avatar_url || guideData?.user?.avatar_url || null,
                });

                // 2) Portfolio (mavjud endpoint)
                const userUUID = guideData?.user_id || guideData?.user_uuid || guideData?.user?.id || id;
                if (userUUID) {
                    const pRes = await portfolioList({ customer: userUUID }).catch(() => ({ results: [] }));
                    const pList = Array.isArray(pRes?.results) ? pRes.results : Array.isArray(pRes) ? pRes : [];
                    setPortfolio(pList);
                } else {
                    setPortfolio([]);
                }

                // 3) My Services — faqat profil ma’lumotidan (hech qanday GET yo‘q)
                setServices(buildServicesFromProfile(guideData));
            } finally {
                setLoading(false);
            }
        })();
    }, [id, isDetail]);

    const fullName = useMemo(() => pickName(guide), [guide]);
    const locationText = useMemo(() => pickLocation(guide || {}), [guide]);
    const countryText = useMemo(() => pickCountry(guide || {}), [guide]);
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

    const handleCheckAvailability = async () => {
        let pk = customerPk;
        if (!pk) { pk = await resolveCustomerPk(id); setCustomerPk(pk); }
        if (!pk) return alert(t("guide.detail.resolveError"));
        if (!startDate || !endDate) return alert(t("guide.detail.chooseDates"));

        setCheckingAvailability(true);
        try {
            const { ok } = await checkAvailabilityAuto({ customer: String(pk), start_date: startDate, end_date: endDate });
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
        if (!canBook) return setResult({ ok: false, msg: t("guide.detail.noGuideId") });
        if (!startDate || !endDate) return setResult({ ok: false, msg: t("guide.detail.selectDates") });
        if (new Date(startDate) > new Date(endDate)) return setResult({ ok: false, msg: t("guide.detail.endAfterStart") });
        if (availabilityOk === false) return setResult({ ok: false, msg: t("guide.detail.notAvailable") });

        setCreating(true);
        setResult({ ok: null, msg: "" });

        const params = new URLSearchParams({
            start_date: startDate,
            end_date: endDate,
            guests: String(guests || 1),
            ...(note ? { description: note } : {}),
        });

        const profileId = await resolveCustomerPk(bookingTargetId);
        if (!profileId) { setResult({ ok: false, msg: t("guide.detail.resolveError") }); setCreating(false); return; }
        navigate(`/booking/${encodeURIComponent(profileId)}?${params.toString()}`);

        setCreating(false);
        setResult({ ok: true, msg: t("guide.detail.redirecting") });
        setShowForm(false);
    };

    /* ================== Render ================== */
    return (
        <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8 space-y-8">

            {/* ===== LIST ===== */}
            {!isDetail && (
                <div>
                    <div className="flex items-center justify-between">
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{t("guide.list.title")}</h1>
                        <button onClick={onApplyFilters} className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-dark-700">
                            <Filter className="h-4 w-4" /> {t("guide.list.apply")}
                        </button>
                    </div>

                    <form onSubmit={onApplyFilters} className="bg-white dark:bg-dark-900 border border-gray-200 dark:border-dark-700 rounded-xl p-4 grid md:grid-cols-5 gap-3 mt-3">
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

                        <div>
                            <select value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-dark-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-dark-700">
                                {[t("guide.list.allCountries"), ...Array.from(new Set(allGuides.map(g => g.country).filter(Boolean)))].map((c) => (
                                    <option key={c} value={c === t("guide.list.allCountries") ? "" : c}>{c}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <select value={minRating} onChange={(e) => setMinRating(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-dark-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-dark-700">
                                <option value="">{t("guide.list.anyRating")}</option>
                                <option value="3">3.0★+</option>
                                <option value="4">4.0★+</option>
                                <option value="4.5">4.5★+</option>
                                <option value="5">5.0★</option>
                            </select>
                        </div>

                        <div className="md:col-span-5 flex flex-wrap gap-3 pt-2">
                            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{t("guide.list.search")}</button>
                            <button type="button" onClick={clearFilters} className="px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-dark-700">{t("guide.list.clear")}</button>
                        </div>
                    </form>

                    <div className="bg-white dark:bg-dark-900 border border-gray-200 dark:border-dark-700 rounded-xl p-4 mt-4">
                        {isListLoading ? (
                            <div className="p-8 text-center text-gray-600 dark:text-gray-300">{t("common.loading")}</div>
                        ) : listError ? (
                            <div className="p-8 text-center text-red-600">{listError}</div>
                        ) : pagedGuides.length ? (
                            <>
                                <div className="grid md:grid-cols-2 gap-4">
                                    {pagedGuides.map((g) => (
                                        <GuideCard key={g.id} g={g} onView={() => goDetail(g.id)} onBook={() => goBookNowFromList(g.id)} />
                                    ))}
                                </div>
                                <div className="flex items-center justify-center gap-2 mt-6 text-gray-800 dark:text-gray-200">
                                    <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className={`px-3 py-2 border rounded-lg border-gray-200 dark:border-dark-700 ${page <= 1 ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50 dark:hover:bg-dark-800"}`} title={t("guide.list.prev")}><PrevIcon className="h-4 w-4" /></button>
                                    <div className="text-sm">{t("guide.list.page")} <span className="font-semibold">{page}</span> {t("guide.list.of")} <span className="font-semibold">{totalPages}</span></div>
                                    <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className={`px-3 py-2 border rounded-lg border-gray-200 dark:border-dark-700 ${page >= totalPages ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50 dark:hover:bg-dark-800"}`} title={t("guide.list.next")}>{t("guide.list.next")} <NextIcon className="h-4 w-4 inline-block ml-1" /></button>
                                </div>
                            </>
                        ) : (
                            <div className="p-8 text-center text-gray-600 dark:text-gray-300">{t("guide.list.empty")}</div>
                        )}
                    </div>
                </div>
            )}

            {/* ===== DETAIL ===== */}
            {isDetail && (
                <>
                    {loading && <div className="min-h-[30vh] grid place-items-center text-gray-600 dark:text-gray-300">{t("common.loading")}</div>}
                    {!loading && !guide && <div className="min-h-[30vh] grid place-items-center text-gray-600 dark:text-gray-300">{t("guide.detail.notFound")}</div>}
                    {!loading && guide && (
                        <>
                            <button onClick={() => navigate("/guides")} className="inline-flex items-center gap-2 text-xs sm:text-sm text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white">
                                <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" /> {t("guide.detail.back")}
                            </button>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* LEFT */}
                                <aside className="lg:col-span-1">
                                    <div className="bg-white dark:bg-dark-900 border border-gray-200 dark:border-dark-700 rounded-2xl p-4">
                                        <div className="relative">
                                            <img
                                                src={pickAvatar(guide)}
                                                alt="avatar"
                                                className="w-full aspect-square object-cover rounded-2xl border border-gray-200 dark:border-dark-700"
                                            />
                                            {guide?.is_verified && (
                                                <div className="absolute top-2 right-2">
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-emerald-600 text-white shadow">
                            <CheckCircle className="w-3 h-3" />
                            Verified
                          </span>
                                                </div>
                                            )}
                                            {guide?.is_available && (
                                                <div className="absolute bottom-2 left-2">
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-white/90 dark:bg-dark-900/90 border border-emerald-300 text-emerald-700">
                            <CircleDot className="w-3 h-3" />
                            Available Now
                          </span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-4 space-y-3 text-gray-800 dark:text-gray-100">
                                            {!!countryText && (
                                                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                                    <Flag className="w-5 h-5" />
                                                    <span>{countryText}</span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                                <MapPin className="w-5 h-5" />
                                                <span>{pickLocation(guide)}</span>
                                            </div>
                                            {/*{(typeof guide?.average_rating === "number" || guide?.total_reviews) && (*/}
                                            {/*    <div className="flex items-center gap-2">*/}
                                            {/*        <Star className="w-5 h-5 text-yellow-500 fill-current" />*/}
                                            {/*        <div className="text-lg font-semibold">*/}
                                            {/*            {Number(guide?.average_rating || 0).toFixed(1)}*/}
                                            {/*        </div>*/}
                                            {/*        {guide?.total_reviews ? (*/}
                                            {/*            <div className="text-gray-500 dark:text-gray-400">*/}
                                            {/*                ({guide.total_reviews} reviews)*/}
                                            {/*            </div>*/}
                                            {/*        ) : null}*/}
                                            {/*    </div>*/}
                                            {/*)}*/}
                                            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                                <Clock className="w-5 h-5" />
                                                <span>Responds within 1 hour</span>
                                            </div>
                                            {(guide?.member_since_year || guide?.member_since) && (
                                                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                                    <Award className="w-5 h-5" />
                                                    <span>
                            Member since {guide?.member_since_year || (guide?.member_since || "").slice(0, 4)}
                          </span>
                                                </div>
                                            )}
                                            {!!languageText && (
                                                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                                    <Globe className="w-5 h-5" />
                                                    <span>{languageText}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </aside>

                                {/* RIGHT */}
                                <section className="lg:col-span-2 space-y-6">
                                    {/* Header */}
                                    <div className="bg-white dark:bg-dark-900 border border-gray-200 dark:border-dark-700 rounded-2xl p-4 sm:p-6">
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div>
                                                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                                                    {pickName(guide)}
                                                </h1>
                                                <div className="mt-0.5 text-blue-600 text-sm sm:text-base">
                                                    { (Array.isArray(guide?.service_types) && guide.service_types.length)
                                                        ? `${guide.service_types[0]?.name || guide.service_types[0]} Guide`
                                                        : "Professional Local Guide" }
                                                </div>
                                                <div className="mt-1 text-gray-600 dark:text-gray-300 flex flex-wrap items-center gap-3 text-xs sm:text-sm">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
                              {pickLocation(guide)}
                          </span>
                                                    {(typeof guide?.average_rating === "number") && (
                                                        <span className="text-yellow-600 font-medium">
                              {Number(guide.average_rating).toFixed(1)}★
                            </span>
                                                    )}
                                                    {!!guide?.total_reviews && (
                                                        <span className="text-gray-500 dark:text-gray-400">
                              {guide.total_reviews} {t("common.reviews")}
                            </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {!!guide?.service_types?.length && (
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                {guide.service_types.map((st, i) => (
                                                    <span
                                                        key={`${st?.name || st}-${i}`}
                                                        className="px-2 py-1 rounded-full text-xs bg-blue-50 dark:bg-dark-800 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-dark-700"
                                                    >
                            {st?.name || st}
                          </span>
                                                ))}
                                            </div>
                                        )}

                                        <div className="mt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                                            {!!languageText && <div>Gapiradi: {languageText}</div>}
                                            <div className="text-gray-500 dark:text-gray-400">Odatda javob beradi within 1 hour</div>
                                        </div>
                                    </div>

                                    {/* About + Stats */}
                                    <div className="bg-white dark:bg-dark-900 border border-gray-200 dark:border-dark-700 rounded-2xl p-4 sm:p-6">
                                        <h2 className="text-lg font-semibold mb-2">About Me</h2>
                                        {guide?.professional_bio ? (
                                            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                                                {guide.professional_bio}
                                            </p>
                                        ) : (
                                            <p className="text-gray-500">Bio ma’lumoti hali kiritilmagan.</p>
                                        )}

                                        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                                            <div className="rounded-xl border border-blue-100 bg-blue-50 dark:bg-dark-800 dark:border-dark-700 p-4 text-center">
                                                <div className="text-2xl font-semibold text-blue-700">
                                                    {guide?.total_reviews ?? 0}
                                                </div>
                                                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-1">Reviews</div>
                                            </div>
                                            <div className="rounded-xl border border-green-100 bg-green-50 dark:bg-dark-800 dark:border-dark-700 p-4 text-center">
                                                <div className="text-2xl font-semibold text-green-700">
                                                    {getResponseRate(guide)}%
                                                </div>
                                                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-1">Response Rate</div>
                                            </div>
                                            <div className="rounded-xl border border-orange-100 bg-orange-50 dark:bg-dark-800 dark:border-dark-700 p-4 text-center">
                                                <div className="text-2xl font-semibold text-orange-700">
                                                    {Math.max(1, getYears(guide))}{getYears(guide) >= 5 ? "+" : ""}
                                                </div>
                                                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-1">Years Experience</div>
                                            </div>
                                            <div className="rounded-xl border border-purple-100 bg-purple-50 dark:bg-dark-800 dark:border-dark-700 p-4 text-center">
                                                <div className="text-2xl font-semibold text-purple-700">
                                                    {getLangCount(guide)}
                                                </div>
                                                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-1">Languages</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Booking */}
                                    <div className="bg-white dark:bg-dark-900 rounded-2xl border border-gray-200 dark:border-dark-700 p-4 sm:p-5">
                                        <div className="flex items-center justify-between mb-3 sm:mb-4">
                                            <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">{t("guide.detail.bookTitle")}</h2>
                                            {guide?.is_available === false && <span className="text-xs sm:text-sm text-red-600">{t("guide.detail.unavailable")}</span>}
                                        </div>
                                        {!showForm ? (
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() => { if (!isAuthenticated) return navigate("/auth"); setShowForm(true); }}
                                                    disabled={guide?.is_available === false}
                                                    className="px-4 py-2 sm:px-5 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-xs sm:text-base"
                                                >
                                                    {isAuthenticated ? t("guide.detail.requestBooking") : t("guide.detail.signInToBook")}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => openChat()}
                                                    className="px-4 py-2 sm:px-5 sm:py-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-dark-700 text-xs sm:text-base inline-flex items-center gap-2"
                                                >
                                                    <MessageCircle className="w-4 h-4" />
                                                    Chat
                                                </button>
                                            </div>
                                        ) : (
                                            <form onSubmit={submitBooking} className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                                <div>
                                                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("guide.detail.startDate")}</label>
                                                    <div className="relative">
                                                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full p-2 sm:p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm bg-white dark:bg-dark-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-dark-700" required />
                                                        <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 absolute right-2 sm:right-3 top-2.5 sm:top-3.5" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("guide.detail.endDate")}</label>
                                                    <div className="relative">
                                                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full p-2 sm:p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm bg-white dark:bg-dark-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-dark-700" required />
                                                        <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 absolute right-2 sm:right-3 top-2.5 sm:top-3.5" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <button type="button" onClick={handleCheckAvailability} className="px-3 py-1 sm:px-4 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs sm:text-sm">
                                                        {t("guide.detail.check")}
                                                    </button>
                                                </div>
                                                <div>
                                                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("guide.detail.guests")}</label>
                                                    <div className="relative">
                                                        <input type="number" min={1} value={guests} onChange={(e) => setGuests(Number(e.target.value) || 1)} className="w-full p-2 sm:p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm bg-white dark:bg-dark-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-dark-700" required />
                                                        <Users className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 absolute right-2 sm:right-3 top-2.5 sm:top-3.5" />
                                                    </div>
                                                </div>
                                                <div className="sm:col-span-2">
                                                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("guide.detail.messageLabel")}</label>
                                                    <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} className="w-full p-2 sm:p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm bg-white dark:bg-dark-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-dark-700 placeholder-gray-400 dark:placeholder-gray-500" placeholder={t("guide.detail.messagePh")} />
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
                                                        className={`px-4 py-2 sm:px-5 sm:py-3 rounded-lg text-white transition-colors text-xs sm:text-base ${creating ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
                                                    >
                                                        {t("guide.detail.submit")}
                                                    </button>
                                                    <button type="button" onClick={() => { setShowForm(false); setStartDate(""); setEndDate(""); setGuests(1); setNote(""); setAvailabilityOk(null); setResult({ ok: null, msg: "" }); }} className="px-4 py-2 sm:px-5 sm:py-3 bg-gray-300 text-gray-800 dark:bg-dark-700 dark:text-gray-100 rounded-lg hover:bg-gray-400 dark:hover:bg-dark-600 text-xs sm:text-base">
                                                        {t("common.cancel")}
                                                    </button>
                                                </div>
                                            </form>
                                        )}
                                    </div>

                                    {/* Portfolio */}
                                    <div className="bg-white dark:bg-dark-900 rounded-2xl border border-gray-200 dark:border-dark-700 p-4 sm:p-5">
                                        <div className="font-semibold mb-2 text-base sm:text-lg text-gray-900 dark:text-white">{t("guide.detail.portfolio")}</div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                                            {portfolio.map((item) => (
                                                <div key={item.id} className="border border-gray-200 dark:border-dark-700 rounded-lg p-3 sm:p-4 bg-white dark:bg-dark-900">
                                                    <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-gray-100">{item.title}</h3>
                                                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">{item.description}</p>
                                                </div>
                                            ))}
                                            {!portfolio?.length && <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-300">{t("guide.detail.noPortfolio")}</div>}
                                        </div>
                                    </div>
                                </section>
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    );
}
