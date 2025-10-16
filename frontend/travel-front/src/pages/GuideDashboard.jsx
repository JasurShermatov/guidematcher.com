// src/pages/GuideDashboard.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Calendar, DollarSign, Star, Users, MessageCircle, Settings, Edit3, Eye,
    Clock, TrendingUp, MapPin, Camera, Wallet, PieChart, Activity, Plus,
    Download, BarChart3, Target, User as UserIcon, Trash2, X
} from "lucide-react";

import { getMe, patchMe } from "../api/users";
import {
    getMyCustomerProfile,
    updateMyCustomerProfile,
    uploadMyCustomerAvatar,
    deleteMyCustomerAvatar,
    getMyPortfolios,
    createPortfolio,
    deletePortfolio,
} from "../api/profiles";
import {
    listBookings,
    actOnBooking,
    getBooking,
} from "../api/bookings";
import { getLanguages, getCountries } from "../api/common";
import { getReviews } from "../api/reviews";
import { useLanguage } from "../context/LanguageContext";

const DEF_EARNINGS = { total_balance: 0, this_month: 0, pending_payout: 0, average_booking_value: 0, growth_rate: 0 };
const DEF_ANALYTICS = { bookings_this_week: 0, bookings_this_month: 0, popular_services: [], monthly_earnings: [] };

const colorMap = {
    blue:   { bg: "bg-blue-100 dark:bg-blue-900/30",   text: "text-blue-600 dark:text-blue-300" },
    green:  { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-600 dark:text-green-300" },
    yellow: { bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-600 dark:text-yellow-300" },
    purple: { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-600 dark:text-purple-300" },
    orange: { bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-600 dark:text-orange-300" },
};

const StatCard = ({ icon: Icon, title, value, subtitle, color = "blue" }) => {
    const c = colorMap[color] || colorMap.blue;
    return (
        <div className="bg-white dark:bg-dark-900 rounded-xl p-4 md:p-6 shadow-sm border border-gray-200 dark:border-dark-800">
            <div className="flex items-center justify-between mb-3 md:mb-4">
                <div className={`p-2 md:p-3 rounded-lg ${c.bg}`}>
                    <Icon className={`h-5 w-5 md:h-6 md:w-6 ${c.text}`} />
                </div>
                <span className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400">+12%</span>
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-0.5 md:mb-1">{value}</h3>
            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300">{title}</p>
            {subtitle && <p className="text-[11px] md:text-xs text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
        </div>
    );
};

export default function GuideDashboard() {
    const { t } = useLanguage();
    const navigate = useNavigate();

    const [reviews, setReviews] = useState([]);
    const [reviewsLoading, setReviewsLoading] = useState(false);
    const [reviewsErr, setReviewsErr] = useState(null);

    const [activeTab, setActiveTab] = useState("overview");

    // profile
    const [userMe, setUserMe] = useState(null);
    const [customerMe, setCustomerMe] = useState(null);
    const [edit, setEdit] = useState({
        first_name: "", last_name: "", email: "", location: "", bio: "",
        languages: "", experience_years: 0,
    });
    const [allLanguages, setAllLanguages] = useState([]);
    const [allCountries, setAllCountries] = useState([]);

    // avatar
    const [uploadPreview, setUploadPreview] = useState(null);
    const [uploadFile, setUploadFile] = useState(null);
    const [isUploadingImage, setIsUploadingImage] = useState(false);

    // services (portfolio)
    const [portfolio, setPortfolio] = useState([]);
    const [openPortfolioForm, setOpenPortfolioForm] = useState(false);
    const [pfTitle, setPfTitle] = useState("");
    const [pfDesc, setPfDesc] = useState("");
    const [pfOrder, setPfOrder] = useState("");

    const [loading, setLoading] = useState(true);

    // dashboards
    const [earnings] = useState(DEF_EARNINGS);
    const [analytics] = useState(DEF_ANALYTICS);

    // bookings
    const [pendingBookings, setPendingBookings] = useState([]);
    const [confirmedBookings, setConfirmedBookings] = useState([]);
    const [bookingLoading, setBookingLoading] = useState(false);
    const [bookingError, setBookingError] = useState(null);

    // modals
    const [detailOpen, setDetailOpen] = useState(false);
    const [detail, setDetail] = useState(null);
    const [declineOpen, setDeclineOpen] = useState(false);
    const [declineId, setDeclineId] = useState(null);
    const [declineReason, setDeclineReason] = useState("");

    // demo
    const todaySchedule = [];
    const transactions = [];

    const avgRating = useMemo(() => Number(customerMe?.average_rating || 0).toFixed(1), [customerMe]);
    const fullName = useMemo(() => {
        return `${userMe?.first_name || ''} ${userMe?.last_name || ''}`.trim() || t('guide.common.yourName');
    }, [userMe?.first_name, userMe?.last_name]);

    // helpers
    // --- GuideDashboard.jsx: mapLanguagesToIds (yangilangan) ---
    const mapLanguagesToIds = (csv) => {
        const UUID_RE =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

        const parts = String(csv || "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        if (!parts.length) return [];

        return parts
            .map((raw) => {
                // 1) To‘g‘ridan-to‘g‘ri UUID/ID kiritilgan bo‘lsa
                if (UUID_RE.test(raw)) return raw;

                const v = raw.toLowerCase();

                // 2) Avval code bo‘yicha (aniq moslik)
                let hit = allLanguages.find(
                    (l) => String(l?.code || "").toLowerCase() === v
                );
                if (hit?.id) return hit.id;

                // 3) So‘ng name/native_name/title/iso bo‘yicha
                hit = allLanguages.find((l) => {
                    const fields = [
                        l?.name,
                        l?.native_name,
                        l?.title,
                        l?.iso2,
                        l?.iso_639_1,
                        l?.isoCode,
                    ]
                        .filter(Boolean)
                        .map((x) => String(x).toLowerCase());
                    return fields.includes(v);
                });

                return hit?.id ?? null;
            })
            .filter(Boolean);
    };

    const findCountryId = (val) => {
        if (!val) return null;
        const v = String(val).trim().toLowerCase();
        const hit = allCountries.find((c) => {
            const fields = [c?.name, c?.code, c?.alpha2, c?.alpha3, c?.iso2, c?.iso3]
                .filter(Boolean).map(String).map((x) => x.toLowerCase());
            return fields.includes(v);
        });
        return hit?.id ?? null;
    };

    // Bookings helpers
    const normalizeBooking = (b) => ({
        id: b?.id,
        title: b?.title || "—",
        status: String(b?.status || b?.status_display || "").toLowerCase(),
        tourist_name: b?.client_name || b?.client?.full_name || b?.user?.full_name || t('guide.common.tourist'),
        start_date: b?.start_date,
        end_date: b?.end_date,
        location: b?.location || b?.city_name || b?.country_name || "",
        number_of_people: b?.number_of_people ?? b?.guests ?? 1,
        proposed_rate: b?.proposed_rate ?? b?.amount ?? null,
        currency: b?.currency || "USD",
        message: b?.description || b?.notes || b?.message || "",
        created_at: b?.created_at,
    });
    const splitByStatus = (items = []) => {
        const P = [], C = [];
        items.forEach((raw) => {
            const b = normalizeBooking(raw);
            if (b.status === "pending") P.push(b);
            else if (b.status === "confirmed" || b.status === "accepted") C.push(b);
        });
        return { P, C };
    };
    const fetchGuideBookings = async () => {
        setBookingLoading(true);
        setBookingError(null);
        try {
            const res = await listBookings({ as: "customer", page: 1, page_size: 50 });
            const results = Array.isArray(res?.data?.results)
                ? res.data.results
                : Array.isArray(res?.data)
                    ? res.data
                    : Array.isArray(res)
                        ? res
                        : [];
            const { P, C } = splitByStatus(results);
            setPendingBookings(P);
            setConfirmedBookings(C);
        } catch (e) {
            setBookingError(t('common.loadFailed'));
        } finally {
            setBookingLoading(false);
        }
    };

    const fetchMyReviews = async () => {
        if (!customerMe?.id) return;
        setReviewsLoading(true);
        setReviewsErr(null);
        try {
            const res = await getReviews({ customer: customerMe.id, ordering: "-created_at" });
            const data = res?.data ?? res;
            const list = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
            setReviews(list);
        } catch (e) {
            setReviewsErr(t('common.loadFailed'));
        } finally {
            setReviewsLoading(false);
        }
    };

    // "reviews" tabida yuklash
    useEffect(() => {
        if (activeTab === "reviews") fetchMyReviews();
    }, [activeTab, customerMe?.id]);

    // init
    useEffect(() => {
        (async () => {
            try {
                const u = await getMe().then((r) => r.data ?? r);
                setUserMe(u);
                const c = await getMyCustomerProfile().then((r) => r.data ?? r);
                setCustomerMe(c);
                setEdit({
                    first_name: u?.first_name || "",
                    last_name: u?.last_name || "",
                    email: u?.email || "",
                    location: u?.country_name || "",
                    bio: c?.professional_bio || "",
                    languages: (c?.languages?.[0]?.name) || "",
                    experience_years: Number(c?.years_of_experience || 0),
                });
                const [langs, countries] = await Promise.all([
                    getLanguages().then((r) => r.data ?? r).catch(() => []),
                    getCountries().then((r) => r.data ?? r).catch(() => []),
                ]);
                setAllLanguages(Array.isArray(langs) ? langs : langs?.results || []);
                setAllCountries(Array.isArray(countries) ? countries : countries?.results || []);
                const ports = await getMyPortfolios().then((r) => r.data ?? r).catch(() => []);
                setPortfolio(Array.isArray(ports) ? ports : ports?.results || []);
                await fetchGuideBookings();
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    // polling: bookings tab aktiv bo‘lsa 60s
    useEffect(() => {
        if (activeTab !== "bookings") return;
        let timer = null;
        const POLL_MS = 60000;
        const tick = async () => {
            await fetchGuideBookings();
            timer = setTimeout(tick, POLL_MS);
        };
        const onVis = () => {
            if (document.hidden) { if (timer) { clearTimeout(timer); timer = null; } }
            else if (!timer) { tick(); }
        };
        tick();
        document.addEventListener("visibilitychange", onVis);
        return () => {
            if (timer) clearTimeout(timer);
            document.removeEventListener("visibilitychange", onVis);
        };
    }, [activeTab]);

    // avatar
    const onPickAvatar = (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        if (f.size > 5 * 1024 * 1024) return alert(t('guide.dashboard.photoMax'));
        if (!/^image\/(jpeg|png|gif)$/.test(f.type)) return alert(t('guide.dashboard.photoTypes'));
        setUploadFile(f);
        const reader = new FileReader();
        reader.onload = (ev) => setUploadPreview(ev?.target?.result || null);
        reader.readAsDataURL(f);
    };
    const saveAvatar = async () => {
        if (!uploadFile) return;
        setIsUploadingImage(true);
        try {
            await uploadMyCustomerAvatar(uploadFile);
            const c = await getMyCustomerProfile().then(r => r.data ?? r);
            setCustomerMe(c);
            setUploadFile(null);
            setUploadPreview(null);
            alert(t('guide.dashboard.photoUpdated'));
        } catch {
            alert(t('guide.dashboard.photoUploadFailed'));
        } finally {
            setIsUploadingImage(false);
        }
    };
    const removeAvatar = async () => {
        try {
            await deleteMyCustomerAvatar();
            const c = await getMyCustomerProfile().then((r) => r.data ?? r);
            setCustomerMe(c);
            setUploadFile(null);
            setUploadPreview(null);
            alert(t('guide.dashboard.photoRemoved'));
        } catch {
            alert(t('guide.dashboard.photoRemoveFailed'));
        }
    };

    // save profile
    // --- GuideDashboard.jsx: saveProfile (yangilangan) ---
    const saveProfile = async () => {
        try {
            const countryId = findCountryId(edit.location);

            await patchMe({
                first_name: edit.first_name || "",
                last_name: edit.last_name || "",
                ...(countryId ? { country: countryId } : {}),
            });

            const payload = {
                professional_bio: edit.bio || "",
                years_of_experience: Number(edit.experience_years) || 0,
                // MUHIM: bo‘sh bo‘lsa ham yuboramiz
                language: (edit.languages || "").trim(),
            };

            const upd = await updateMyCustomerProfile(payload);

            const [u, c] = await Promise.all([
                getMe().then((r) => r.data ?? r),
                getMyCustomerProfile().then((r) => r.data ?? r),
            ]);

            setUserMe(u);
            setCustomerMe(c);

            // Inputni ham serverdan qaytgan holatga moslab yangilaymiz
            setEdit((x) => ({
                ...x,
                languages: (c?.languages?.[0]?.name) || "",
            }));

            alert(t("guide.dashboard.saved"));
        } catch (e) {
            console.error("saveProfile error:", e);
            alert(t("guide.dashboard.saveFailed"));
        }
    };


    // SERVICES form (no image)
    const submitPortfolio = async (e) => {
        e.preventDefault();
        try {
            // still use multipart but without "image"
            const fd = new FormData();
            if (pfTitle) fd.append("title", pfTitle);
            if (pfDesc) fd.append("description", pfDesc);
            // if (pfOrder) fd.append("order", String(pfOrder));
            if (pfOrder !== "" && !Number.isNaN(Number(pfOrder))) {
                fd.append("order", String(pfOrder));
            }
            const created = await createPortfolio(fd).then((r) => r.data ?? r);
            setPortfolio((xs) => [created, ...xs]);
            setPfTitle(""); setPfDesc(""); setPfOrder(""); setOpenPortfolioForm(false);
            alert(t('guide.dashboard.portfolioCreated'));
        } catch (e) {
            alert(t('guide.dashboard.portfolioCreateFailed'));
        }
    };
    const removePortfolio = async (id) => {
        if (!window.confirm(t('guide.dashboard.confirmDelete'))) return;
        try {
            await deletePortfolio(id);
            setPortfolio((xs) => xs.filter((i) => i.id !== id));
        } catch {
            alert(t('guide.dashboard.deleteFailed'));
        }
    };

    // bookings actions
    const handleAccept = async (id) => {
        try {
            await actOnBooking(id, "accept");
            setPendingBookings((xs) => xs.filter((b) => b.id !== id));
            try {
                const { data } = await getBooking(id);
                const nb = normalizeBooking(data);
                setConfirmedBookings((xs) => [{ ...nb, status: "confirmed" }, ...xs]);
            } catch {
                setConfirmedBookings((xs) => [{ id, title: "—", status: "confirmed" }, ...xs]);
            }
        } catch {
            alert(t('guide.dashboard.acceptFailed'));
        }
    };
    const openDeclineModal = (id) => {
        setDeclineId(id);
        setDeclineReason("");
        setDeclineOpen(true);
    };

    const openDetail = async (id) => {
        try {
            const { data } = await getBooking(id);
            setDetail(normalizeBooking(data));
            setDetailOpen(true);
        } catch {
            alert("Failed to load details");
        }
    };

    const confirmDecline = async () => {
        const id = declineId;
        setDeclineOpen(false);
        if (!id) return;
        const prev = [...pendingBookings];
        setPendingBookings(xs => xs.filter(b => b.id !== id));
        try {
            await actOnBooking(id, "decline", declineReason ? { reason: declineReason } : {});
        } catch (e) {
            setPendingBookings(prev);
            alert(t('guide.dashboard.declineFailed'));
        } finally {
            setDeclineId(null);
            setDeclineReason("");
        }
    };
    const handleComplete = async (id) => {
        try {
            await actOnBooking(id, "complete");
            setConfirmedBookings((xs) => xs.filter((b) => b.id !== id));
        } catch {
            alert(t('guide.dashboard.completeFailed'));
        }
    };
    const refreshBookings = async () => {
        await fetchGuideBookings();
        alert(t('guide.dashboard.bookingsRefreshed'));
    };

    // Shunchaki Chat sahifasini ochamiz
    const openChat = () => navigate("/chat");

    const upcomingCount = useMemo(
        () => (pendingBookings?.length || 0) + (confirmedBookings?.length || 0),
        [pendingBookings, confirmedBookings]
    );

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-dark-950">
                {t('common.loading')}
            </div>
        );
    }

    const tabs = [
        { id: "overview",  label: t('guide.nav.overview'),  icon: TrendingUp },
        { id: "bookings",  label: t('guide.dashboard.bookings'), icon: Calendar },
        { id: "profile",   label: t('guide.nav.profileServices'), icon: UserIcon },
        { id: "earnings",  label: t('guide.dashboard.earnings'), icon: DollarSign },
        { id: "reviews",   label: t('guide.dashboard.reviews'), icon: Star },
        { id: "analytics", label: t('guide.nav.analytics'), icon: BarChart3 },
        { id: "settings",  label: t('guide.dashboard.settings'), icon: Settings },
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-dark-950 pt-4 md:pt-8 transition-colors">
            <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 md:py-8">
                <div className="mb-4 md:mb-8">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-1 md:mb-2">
                        {t('guide.dashboard.title')}
                    </h1>
                    <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
                        {t('guide.dashboard.description')}
                    </p>
                </div>

                <div className="flex flex-col lg:flex-row gap-4 md:gap-8">
                    {/* Sidebar (lg+) */}
                    <div className="hidden lg:block lg:w-64 flex-shrink-0">
                        <div className="bg-white dark:bg-dark-900 rounded-xl shadow-sm border border-gray-200 dark:border-dark-800 p-3">
                            <nav className="space-y-2">
                                {tabs.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => setActiveTab(item.id)}
                                        className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                                            activeTab === item.id
                                                ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-r-2 border-blue-700 dark:border-blue-400"
                                                : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-dark-800"
                                        }`}
                                    >
                                        <item.icon className="h-5 w-5" />
                                        <span className="font-medium">{item.label}</span>
                                    </button>
                                ))}
                            </nav>
                        </div>
                    </div>

                    {/* Mobile Tabbar (sticky) */}
                    <div className="lg:hidden sticky top-0 z-30 -mx-3 sm:-mx-4 px-3 sm:px-4 py-2 bg-gray-50/95 dark:bg-dark-950/95 backdrop-blur supports-[backdrop-filter]:bg-opacity-70">
                        <div className="flex gap-2 overflow-x-auto no-scrollbar">
                            {tabs.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveTab(item.id)}
                                    className={`flex items-center gap-1 px-3 py-2 rounded-full border text-xs whitespace-nowrap ${
                                        activeTab === item.id
                                            ? "bg-blue-600 text-white border-blue-600"
                                            : "bg-white dark:bg-dark-900 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-dark-800"
                                    }`}
                                >
                                    <item.icon className="h-4 w-4" />
                                    <span>{item.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1">
                        {/* OVERVIEW */}
                        {activeTab === "overview" && (
                            <div className="space-y-4 md:space-y-8">
                                <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-4 md:p-8 text-white">
                                    <div className="flex items-start md:items-center justify-between gap-3">
                                        <div>
                                            <h2 className="text-xl md:text-2xl font-bold mb-1 md:mb-2">
                                                {t('guide.overview.welcome').replace('{{name}}', fullName)}
                                            </h2>
                                            <p className="text-blue-100 text-xs md:text-sm">
                                                {t('guide.overview.todayCount').replace('{{n}}', upcomingCount)}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl md:text-3xl font-bold">{avgRating}★</div>
                                            <p className="text-blue-100 text-xs md:text-sm">{t('guide.overview.yourRating')}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
                                    <StatCard icon={Calendar} title={t('guide.dashboard.activeBookings')} value={upcomingCount} color="blue" />
                                    <StatCard icon={DollarSign} title={t('guide.earn.thisMonth')} value={`$${earnings.this_month}`} subtitle={`+${earnings.growth_rate}%`} color="green" />
                                    <StatCard icon={Star} title={t('guide.dashboard.averageRating')} value={avgRating} subtitle={`${customerMe?.total_reviews || 0} ${t('guide.reviews.count')}`} color="yellow" />
                                    <StatCard icon={MessageCircle} title={t('guide.overview.responseRate')} value={`${customerMe?.response_rate || 0}%`} subtitle={t('guide.overview.last30')} color="purple" />
                                </div>

                                <div className="bg-white dark:bg-dark-900 rounded-xl p-4 md:p-6 shadow-sm border border-gray-200 dark:border-dark-800">
                                    <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-3 md:mb-4">{t('guide.overview.todaySchedule')}</h3>
                                    {todaySchedule.length ? (
                                        <div className="space-y-3 md:space-y-4">
                                            {todaySchedule.map((a) => (
                                                <div key={a.id} className="flex items-center justify-between p-3 md:p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                                    <div className="flex items-center space-x-3 md:space-x-4">
                                                        <div className="text-center">
                                                            <div className="text-base md:text-lg font-bold text-blue-600 dark:text-blue-300">{a.time ?? "—"}</div>
                                                        </div>
                                                        <div>
                                                            <h4 className="font-semibold text-gray-900 dark:text-white text-sm md:text-base">{a.tourist_name ?? t('guide.common.guest')}</h4>
                                                            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300">{a.service_name ?? t('guide.common.service')} • {a.duration ?? 0}h</p>
                                                            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 flex items-center">
                                                                <MapPin className="h-3 w-3 mr-1" /> {a.location ?? "—"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center">
                                                        <span className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-1 rounded-full text-[10px] md:text-xs">{a.status ?? t('guide.common.scheduled')}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm md:text-base text-gray-600 dark:text-gray-300 text-center py-6 md:py-8">{t('guide.overview.noToursToday')}</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* BOOKINGS */}
                        {activeTab === "bookings" && (
                            <div className="space-y-4 md:space-y-6">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{t('guide.bookings.title')}</h2>
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={refreshBookings}
                                            className="px-3 md:px-4 py-2 border border-gray-300 dark:border-dark-700 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-800 text-sm md:text-base text-gray-800 dark:text-gray-200"
                                        >
                                            {t('common.refresh')}
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-dark-900 rounded-xl p-4 md:p-6 shadow-sm border border-gray-200 dark:border-dark-800">
                                    <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-3 md:mb-4">{t('guide.bookings.pending')}</h3>
                                    {bookingLoading ? (
                                        <div className="text-sm text-gray-500 dark:text-gray-400">{t('common.loading')}</div>
                                    ) : bookingError ? (
                                        <div className="text-sm text-red-600">{bookingError}</div>
                                    ) : pendingBookings.length ? (
                                        <div className="space-y-3 md:space-y-4">
                                            {pendingBookings.map((b) => (
                                                <div key={b.id} className="p-3 md:p-4 rounded-lg border border-gray-200 dark:border-dark-800 bg-white dark:bg-dark-900 flex items-start justify-between gap-3">
                                                    <div className="space-y-1">
                                                        <div
                                                            className="font-semibold text-gray-900 dark:text-white cursor-pointer hover:underline text-sm md:text-base"
                                                            onClick={() => openDetail(b.id)}
                                                        >
                                                            {b.title}
                                                        </div>
                                                        <div className="text-xs md:text-sm text-gray-600 dark:text-gray-300">
                                                            {b.tourist_name} • {b.number_of_people} {b.number_of_people === 1 ? t('booking.guest') : t('booking.guests')}
                                                        </div>
                                                        <div className="text-xs md:text-sm text-gray-600 dark:text-gray-300">
                                                            {b.start_date} → {b.end_date}
                                                        </div>
                                                        {!!b.location && <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400">📍 {b.location}</div>}
                                                        {!!b.message && <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400">“{b.message}”</div>}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => handleAccept(b.id)}
                                                            className="px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 text-sm"
                                                        >
                                                            {t('guide.bookings.accept')}
                                                        </button>
                                                        <button
                                                            onClick={() => openDeclineModal(b.id)}
                                                            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-dark-700 hover:bg-gray-50 dark:hover:bg-dark-800 text-gray-800 dark:text-gray-200 text-sm"
                                                        >
                                                            {t('guide.bookings.decline')}
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-sm text-gray-500 dark:text-gray-400">{t('guide.bookings.noPending')}</div>
                                    )}
                                </div>

                                <div className="bg-white dark:bg-dark-900 rounded-xl p-4 md:p-6 shadow-sm border border-gray-200 dark:border-dark-800">
                                    <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-3 md:mb-4">{t('guide.bookings.confirmed')}</h3>
                                    {bookingLoading ? (
                                        <div className="text-sm text-gray-500 dark:text-gray-400">{t('common.loading')}</div>
                                    ) : confirmedBookings.length ? (
                                        <div className="space-y-3 md:space-y-4">
                                            {confirmedBookings.map((b) => (
                                                <div key={b.id} className="p-3 md:p-4 rounded-lg border border-gray-200 dark:border-dark-800 bg-white dark:bg-dark-900 flex items-start justify-between gap-3">
                                                    <div className="space-y-1">
                                                        <div
                                                            className="font-semibold text-gray-900 dark:text-white cursor-pointer hover:underline text-sm md:text-base"
                                                            onClick={() => openDetail(b.id)}
                                                        >
                                                            {b.title}
                                                        </div>
                                                        <div className="text-xs md:text-sm text-gray-600 dark:text-gray-300">
                                                            {b.tourist_name} • {b.number_of_people} {b.number_of_people === 1 ? t('booking.guest') : t('booking.guests')}
                                                        </div>
                                                        <div className="text-xs md:text-sm text-gray-600 dark:text-gray-300">
                                                            {b.start_date} → {b.end_date}
                                                        </div>
                                                        {!!b.location && <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400">📍 {b.location}</div>}
                                                        {!!b.proposed_rate && (
                                                            <div className="text-xs md:text-sm text-gray-700 dark:text-gray-200">
                                                                {t('guide.bookings.offer')}: {b.proposed_rate} {b.currency}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={openChat}
                                                            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-dark-700 hover:bg-gray-50 dark:hover:bg-dark-800 text-gray-800 dark:text-gray-200 text-sm"
                                                        >
                                                            {t('chat.title')}
                                                        </button>
                                                        <button
                                                            onClick={() => handleComplete(b.id)}
                                                            className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm"
                                                        >
                                                            {t('guide.bookings.markCompleted')}
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-sm text-gray-500 dark:text-gray-400">{t('guide.bookings.noConfirmed')}</div>
                                    )}
                                </div>

                                {/* Decline modal */}
                                {declineOpen && (
                                    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-3">
                                        <div className="bg-white dark:bg-dark-900 rounded-xl p-4 md:p-6 w-full max-w-md border border-gray-200 dark:border-dark-800">
                                            <div className="flex items-center justify-between mb-3 md:mb-4">
                                                <h4 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">{t('guide.bookings.declineTitle')}</h4>
                                                <button onClick={() => setDeclineOpen(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                                                    <X className="h-5 w-5" />
                                                </button>
                                            </div>
                                            <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('guide.bookings.reasonOpt')}</label>
                                            <textarea
                                                rows={4}
                                                value={declineReason}
                                                onChange={(e) => setDeclineReason(e.target.value)}
                                                className="w-full p-3 border border-gray-300 dark:border-dark-700 rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100 text-sm"
                                                placeholder={t('guide.bookings.reasonPh')}
                                            />
                                            <div className="mt-4 flex items-center justify-end gap-2 md:gap-3">
                                                <button onClick={() => setDeclineOpen(false)} className="px-3 md:px-4 py-2 border border-gray-300 dark:border-dark-700 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-800 text-gray-800 dark:text-gray-200 text-sm">{t('guide.dashboard.cancel')}</button>
                                                <button onClick={confirmDecline} className="px-3 md:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">{t('guide.bookings.decline')}</button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Booking detail modal */}
                                {detailOpen && (
                                    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-3">
                                        <div className="bg-white dark:bg-dark-900 rounded-xl p-4 md:p-6 w-full max-w-2xl border border-gray-200 dark:border-dark-800">
                                            <div className="flex items-center justify-between mb-3 md:mb-4">
                                                <h4 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">{t('guide.bookings.detailTitle')}</h4>
                                                <button onClick={() => setDetailOpen(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                                                    <X className="h-5 w-5" />
                                                </button>
                                            </div>
                                            <div className="grid md:grid-cols-2 gap-3 md:gap-4 text-sm">
                                                <div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400">{t('guide.bookings.title')}</div>
                                                    <div className="font-medium text-gray-900 dark:text-white">{detail?.title}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400">{t('guide.bookings.status')}</div>
                                                    <div className="font-medium capitalize text-gray-900 dark:text-white">{detail?.status}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400">{t('guide.bookings.tourist')}</div>
                                                    <div className="font-medium text-gray-900 dark:text-white">{detail?.tourist_name}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400">{t('guide.bookings.dates')}</div>
                                                    <div className="font-medium text-gray-900 dark:text-white">{detail?.start_date} → {detail?.end_date}</div>
                                                </div>
                                                {detail?.location && (
                                                    <div className="md:col-span-2">
                                                        <div className="text-xs text-gray-500 dark:text-gray-400">{t('guide.bookings.location')}</div>
                                                        <div className="font-medium text-gray-900 dark:text-white">📍 {detail.location}</div>
                                                    </div>
                                                )}
                                                {detail?.message && (
                                                    <div className="md:col-span-2">
                                                        <div className="text-xs text-gray-500 dark:text-gray-400">{t('guide.bookings.message')}</div>
                                                        <div className="font-medium text-gray-900 dark:text-white">{detail.message}</div>
                                                    </div>
                                                )}
                                                {!!detail?.proposed_rate && (
                                                    <div>
                                                        <div className="text-xs text-gray-500 dark:text-gray-400">{t('guide.bookings.offer')}</div>
                                                        <div className="font-medium text-gray-900 dark:text-white">{detail.proposed_rate} {detail.currency}</div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="mt-4 md:mt-6 flex items-center justify-end gap-2 md:gap-3">
                                                {detail?.status === "pending" && (
                                                    <>
                                                        <button
                                                            onClick={() => { setDetailOpen(false); handleAccept(detail.id); }}
                                                            className="px-3 md:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                                                        >
                                                            {t('guide.bookings.accept')}
                                                        </button>
                                                        <button
                                                            onClick={() => { setDetailOpen(false); openDeclineModal(detail.id); }}
                                                            className="px-3 md:px-4 py-2 border border-gray-300 dark:border-dark-700 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-800 text-gray-800 dark:text-gray-200 text-sm"
                                                        >
                                                            {t('guide.bookings.decline')}
                                                        </button>
                                                    </>
                                                )}
                                                {(detail?.status === "confirmed" || detail?.status === "accepted") && (
                                                    <>
                                                        <button
                                                            onClick={() => { setDetailOpen(false); openChat(); }}
                                                            className="px-3 md:px-4 py-2 border border-gray-300 dark:border-dark-700 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-800 text-gray-800 dark:text-gray-200 text-sm"
                                                        >
                                                            {t('chat.title')}
                                                        </button>
                                                        <button
                                                            onClick={() => { setDetailOpen(false); handleComplete(detail.id); }}
                                                            className="px-3 md:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                                                        >
                                                            {t('guide.bookings.markCompleted')}
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* PROFILE & SERVICES */}
                        {activeTab === "profile" && (
                            <div className="space-y-4 md:space-y-8">
                                <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{t('guide.nav.profileServices')}</h2>
                                {/* Profile */}
                                <div className="bg-white dark:bg-dark-900 rounded-xl p-4 md:p-6 shadow-sm border border-gray-200 dark:border-dark-800">
                                    <div className="flex items-center justify-between mb-4 md:mb-6">
                                        <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">{t('guide.dashboard.profileInfo')}</h3>
                                        <button onClick={saveProfile} className="flex items-center space-x-1 px-3 md:px-4 py-2 rounded-lg transition-colors bg-blue-600 text-white hover:bg-blue-700 text-sm md:text-base">
                                            <Edit3 className="h-4 w-4" />
                                            <span>{t('guide.dashboard.saveChanges')}</span>
                                        </button>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-4 md:gap-6">
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('guide.dashboard.changeProfilePicture')}</label>
                                                <div className="flex items-center flex-wrap gap-3 md:gap-4">
                                                    <img
                                                        src={uploadPreview || customerMe?.avatar_url || "https://placehold.co/80x80"}
                                                        alt="Profile"
                                                        className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover border-4 border-gray-200 dark:border-dark-800"
                                                    />
                                                    <label className="bg-blue-600 text-white px-3 md:px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 cursor-pointer text-sm">
                                                        <Camera className="h-4 w-4" />
                                                        <span>{t('guide.dashboard.uploadNewPhoto')}</span>
                                                        <input type="file" accept="image/jpeg,image/png,image/gif" onChange={onPickAvatar} className="hidden" />
                                                    </label>
                                                    {uploadFile && (
                                                        <button onClick={saveAvatar} disabled={isUploadingImage} className={`px-3 md:px-4 py-2 rounded-lg ${isUploadingImage ? "bg-gray-300" : "bg-green-600 hover:bg-green-700"} text-white text-sm`}>
                                                            {isUploadingImage ? t('guide.dashboard.saving') : t('guide.dashboard.uploadNewPhoto')}
                                                        </button>
                                                    )}
                                                    {(customerMe?.avatar_url || uploadPreview) && (
                                                        <button onClick={removeAvatar} className="border border-gray-300 dark:border-dark-700 text-gray-700 dark:text-gray-200 px-3 md:px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-800 transition-colors text-sm">
                                                            {t('guide.dashboard.removePhoto')}
                                                        </button>
                                                    )}
                                                </div>
                                                <p className="text-[11px] md:text-xs text-gray-500 dark:text-gray-400 mt-2">{t('guide.dashboard.photoRequirements')}</p>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3 md:gap-4">
                                                <div>
                                                    <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('guide.profile.firstName')}</label>
                                                    <input
                                                        type="text"
                                                        value={edit.first_name}
                                                        onChange={(e) => setEdit((x) => ({ ...x, first_name: e.target.value }))}
                                                        className="w-full p-2.5 md:p-3 border border-gray-300 dark:border-dark-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100 text-sm md:text-base"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('guide.profile.lastName')}</label>
                                                    <input
                                                        type="text"
                                                        value={edit.last_name}
                                                        onChange={(e) => setEdit((x) => ({ ...x, last_name: e.target.value }))}
                                                        className="w-full p-2.5 md:p-3 border border-gray-300 dark:border-dark-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100 text-sm md:text-base"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('guide.profile.emailReadonly')}</label>
                                                <input type="email" value={edit.email} readOnly className="w-full p-2.5 md:p-3 border border-gray-300 dark:border-dark-700 bg-gray-50 dark:bg-dark-800 rounded-lg text-gray-600 dark:text-gray-300 text-sm md:text-base" />
                                            </div>

                                            <div>
                                                <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('guide.profile.location')}</label>
                                                <input
                                                    type="text"
                                                    placeholder={t('guide.profile.locationPh')}
                                                    value={edit.location}
                                                    onChange={(e) => setEdit((x) => ({ ...x, location: e.target.value }))}
                                                    className="w-full p-2.5 md:p-3 border border-gray-300 dark:border-dark-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100 text-sm md:text-base"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('guide.profile.bio')}</label>
                                                <textarea
                                                    value={edit.bio}
                                                    onChange={(e) => setEdit((x) => ({ ...x, bio: e.target.value }))}
                                                    className="w-full p-2.5 md:p-3 border border-gray-300 dark:border-dark-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100 text-sm md:text-base"
                                                    rows={4}
                                                    placeholder={t('guide.profile.bioPh')}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('guide.profile.languages')}</label>
                                                <input
                                                    type="text"
                                                    value={edit.languages}
                                                    onChange={(e) => setEdit((x) => ({ ...x, languages: e.target.value }))}
                                                    className="w-full p-2.5 md:p-3 border border-gray-300 dark:border-dark-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100 text-sm md:text-base"
                                                    placeholder="e.g. English"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('guide.profile.years')}</label>
                                                <select
                                                    value={edit.experience_years}
                                                    onChange={(e) => setEdit((x) => ({ ...x, experience_years: Number(e.target.value) }))}
                                                    className="w-full p-2.5 md:p-3 border border-gray-300 dark:border-dark-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100 text-sm md:text-base"
                                                >
                                                    <option value={0}>0</option>
                                                    <option value={1}>1-2</option>
                                                    <option value={3}>3-5</option>
                                                    <option value={5}>5+</option>
                                                    <option value={10}>10+</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Services (no image) */}
                                <div className="bg-white dark:bg-dark-900 rounded-xl p-4 md:p-6 shadow-sm border border-gray-200 dark:border-dark-800">
                                    <div className="flex items-center justify-between mb-4 md:mb-6">
                                        <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">{t('guide.dashboard.services')}</h3>
                                        <button
                                            onClick={() => setOpenPortfolioForm(true)}
                                            className="bg-blue-600 text-white px-3 md:px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1 md:gap-2 text-sm md:text-base"
                                        >
                                            <Plus className="h-4 w-4" />
                                            <span>{t('guide.dashboard.addService')}</span>
                                        </button>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-3 md:gap-4">
                                        {portfolio.map((s) => (
                                            <div key={s.id} className="border border-gray-200 dark:border-dark-800 rounded-lg p-3 md:p-4 bg-white dark:bg-dark-900">
                                                <div className="flex items-start justify-between gap-3 mb-2 md:mb-3">
                                                    <div>
                                                        <h4 className="font-medium text-gray-900 dark:text-white text-sm md:text-base">{s.title ?? t('guide.service.item')}</h4>
                                                        <p className="text-[11px] md:text-xs text-gray-500 dark:text-gray-400">
                                                            {(s.order !== null && s.order !== undefined)
                                                                ? (
                                                                    <>
                                                                        <span>{t('guide.service.orderLabel')}:</span>{' '}
                                                                        <strong>{Number(s.order)}</strong>
                                                                    </>
                                                                )
                                                                : t('guide.service.noOrder')}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button title={t('guide.service.preview')} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                                            <Eye className="h-4 w-4" />
                                                        </button>
                                                        <button title={t('guide.dashboard.deleteService')} onClick={() => removePortfolio(s.id)} className="text-red-500 hover:text-red-600">
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                                {s.description && <div className="text-xs md:text-sm text-gray-600 dark:text-gray-300">{s.description}</div>}
                                                {!s.description && <div className="text-xs text-gray-500 dark:text-gray-400">{t('guide.service.noDesc')}</div>}
                                            </div>
                                        ))}
                                        {!portfolio.length && <div className="text-sm text-gray-500 dark:text-gray-400">{t('guide.service.empty')}</div>}
                                    </div>

                                    {/* form modal — no image field */}
                                    {openPortfolioForm && (
                                        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-3">
                                            <div className="bg-white dark:bg-dark-900 rounded-xl p-4 md:p-6 w-full max-w-lg border border-gray-200 dark:border-dark-800">
                                                <h4 className="text-base md:text-lg font-semibold mb-3 md:mb-4 text-gray-900 dark:text-white">{t('guide.dashboard.addService')}</h4>
                                                <form onSubmit={submitPortfolio} className="space-y-3 md:space-y-4">
                                                    <div>
                                                        <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('guide.dashboard.serviceName')}</label>
                                                        <input value={pfTitle} onChange={(e) => setPfTitle(e.target.value)} className="w-full p-2.5 md:p-3 border border-gray-300 dark:border-dark-700 rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100 text-sm md:text-base" placeholder={t('guide.service.titlePh')} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('guide.dashboard.description')}</label>
                                                        <textarea value={pfDesc} onChange={(e) => setPfDesc(e.target.value)} className="w-full p-2.5 md:p-3 border border-gray-300 dark:border-dark-700 rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100 text-sm md:text-base" rows={3} placeholder={t('guide.service.descPh')} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                            {t('guide.service.orderLabel')}
                                                        </label>
                                                        <input
                                                            type="number"
                                                            value={pfOrder}
                                                            onChange={(e) => setPfOrder(e.target.value)}
                                                            placeholder="Raqam kiriting (ixtiyoriy)"
                                                            className="w-full p-2.5 md:p-3 border border-gray-300 dark:border-dark-700
                                                                       rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100
                                                                       text-sm md:text-base"
                                                        />
                                                    </div>
                                                    <div className="flex items-center justify-end gap-2 md:gap-3 pt-1 md:pt-2">
                                                        <button type="button" onClick={() => setOpenPortfolioForm(false)} className="px-3 md:px-4 py-2 border border-gray-300 dark:border-dark-700 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-800 text-gray-800 dark:text-gray-200 text-sm">{t('guide.dashboard.cancel')}</button>
                                                        <button type="submit" className="px-3 md:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">{t('guide.dashboard.saveService')}</button>
                                                    </div>
                                                </form>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* EARNINGS */}
                        {activeTab === "earnings" && (
                            <div className="space-y-4 md:space-y-6">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{t('guide.dashboard.earnings')}</h2>
                                    <button className="bg-green-600 text-white px-3 md:px-6 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1 md:gap-2 text-sm md:text-base">
                                        <Wallet className="h-4 w-4 md:h-5 md:w-5" />
                                        <span>{t('guide.earn.withdraw')}</span>
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
                                    <div className="bg-white dark:bg-dark-900 rounded-xl p-4 md:p-6 shadow-sm border border-gray-200 dark:border-dark-800">
                                        <div className="flex items-center justify-between mb-3 md:mb-4">
                                            <Wallet className="h-6 w-6 md:h-8 md:w-8 text-green-600" />
                                            <span className="text-[10px] md:text-xs text-green-600">+{earnings.growth_rate}%</span>
                                        </div>
                                        <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">${earnings.total_balance}</h3>
                                        <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300">{t('guide.earn.totalBalance')}</p>
                                    </div>
                                    <div className="bg-white dark:bg-dark-900 rounded-xl p-4 md:p-6 shadow-sm border border-gray-200 dark:border-dark-800">
                                        <div className="flex items-center justify-between mb-3 md:mb-4">
                                            <DollarSign className="h-6 w-6 md:h-8 md:w-8 text-blue-600" />
                                            <span className="text-[10px] md:text-xs text-blue-600">{t('guide.earn.thisMonthShort')}</span>
                                        </div>
                                        <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">${earnings.this_month}</h3>
                                        <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300">{t('guide.earn.monthly')}</p>
                                    </div>
                                    <div className="bg-white dark:bg-dark-900 rounded-xl p-4 md:p-6 shadow-sm border border-gray-200 dark:border-dark-800">
                                        <div className="flex items-center justify-between mb-3 md:mb-4">
                                            <TrendingUp className="h-6 w-6 md:h-8 md:w-8 text-purple-600" />
                                            <span className="text-[10px] md:text-xs text-purple-600">{t('guide.earn.average')}</span>
                                        </div>
                                        <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">${earnings.average_booking_value}</h3>
                                        <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300">{t('guide.earn.perBooking')}</p>
                                    </div>
                                    <div className="bg-white dark:bg-dark-900 rounded-xl p-4 md:p-6 shadow-sm border border-gray-200 dark:border-dark-800">
                                        <div className="flex items-center justify-between mb-3 md:mb-4">
                                            <Clock className="h-6 w-6 md:h-8 md:w-8 text-orange-600" />
                                            <span className="text-[10px] md:text-xs text-orange-600">{t('guide.earn.pendingShort')}</span>
                                        </div>
                                        <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">${earnings.pending_payout}</h3>
                                        <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300">{t('guide.earn.available')}</p>
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-dark-900 rounded-xl p-4 md:p-6 shadow-sm border border-gray-200 dark:border-dark-800">
                                    <div className="flex items-center justify-between mb-4 md:mb-6">
                                        <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">{t('guide.earn.transactions')}</h3>
                                        <button className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 text-sm md:text-base">
                                            <Download className="h-4 w-4" />
                                            <span>{t('guide.earn.export')}</span>
                                        </button>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-800 text-sm">
                                            <thead className="bg-gray-50 dark:bg-dark-900">
                                            <tr>
                                                <th className="px-4 md:px-6 py-3 text-left text-[11px] md:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('guide.earn.date')}</th>
                                                <th className="px-4 md:px-6 py-3 text-left text-[11px] md:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('guide.earn.tourist')}</th>
                                                <th className="px-4 md:px-6 py-3 text-left text-[11px] md:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('guide.earn.service')}</th>
                                                <th className="px-4 md:px-6 py-3 text-left text-[11px] md:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('guide.earn.amount')}</th>
                                                <th className="px-4 md:px-6 py-3 text-left text-[11px] md:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('guide.earn.status')}</th>
                                            </tr>
                                            </thead>
                                            <tbody className="bg-white dark:bg-dark-900 divide-y divide-gray-200 dark:divide-dark-800">
                                            {!transactions.length && (
                                                <tr><td colSpan={5} className="px-4 md:px-6 py-4 text-xs md:text-sm text-gray-500 dark:text-gray-400">{t('guide.earn.noTx')}</td></tr>
                                            )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* REVIEWS */}
                        {activeTab === "reviews" && (
                            <div className="space-y-4 md:space-y-6">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{t('guide.dashboard.reviews')}</h2>
                                    <button
                                        onClick={fetchMyReviews}
                                        className="px-3 md:px-4 py-2 border border-gray-300 dark:border-dark-700 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-800 text-gray-800 dark:text-gray-200 text-sm md:text-base"
                                    >
                                        {t('common.refresh')}
                                    </button>
                                </div>
                                <div className="bg-white dark:bg-dark-900 rounded-xl p-4 md:p-6 shadow-sm border border-gray-200 dark:border-dark-800">
                                    {reviewsLoading ? (
                                        <div className="text-sm text-gray-500 dark:text-gray-400">{t('common.loading')}</div>
                                    ) : reviewsErr ? (
                                        <div className="text-sm text-red-600">{reviewsErr}</div>
                                    ) : reviews.length ? (
                                        <div className="space-y-3 md:space-y-4">
                                            {reviews.map((r) => (
                                                <div key={r.id} className="p-3 md:p-4 rounded-lg border border-gray-200 dark:border-dark-800">
                                                    <div className="flex items-center justify-between">
                                                        <div className="font-semibold text-gray-900 dark:text-white text-sm md:text-base">
                                                            {(r.client?.first_name || "") + " " + (r.client?.last_name || "")}
                                                        </div>
                                                        <div className="text-yellow-600 dark:text-yellow-300 font-medium text-sm">
                                                            {Number(r.overall_rating || 0).toFixed(1)}★
                                                        </div>
                                                    </div>
                                                    {r.title && <div className="mt-1 text-gray-800 dark:text-gray-200 text-sm">{r.title}</div>}
                                                    {r.comment && <div className="mt-1 text-gray-600 dark:text-gray-300 text-sm">{r.comment}</div>}
                                                    <div className="mt-2 text-[11px] md:text-xs text-gray-500 dark:text-gray-400">
                                                        {new Date(r.created_at).toLocaleString()}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-sm text-gray-500 dark:text-gray-400">{t('guide.reviews.none')}</div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ANALYTICS */}
                        {activeTab === "analytics" && (
                            <div className="space-y-4 md:space-y-6">
                                <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{t('guide.nav.analytics')}</h2>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
                                    <StatCard icon={Users} title={t('guide.stats.week')}   value={analytics.bookings_this_week ?? 0} color="blue" />
                                    <StatCard icon={Calendar} title={t('guide.stats.month')} value={analytics.bookings_this_month ?? 0} color="green" />
                                    <StatCard icon={Target} title={t('guide.stats.completion')} value={`${customerMe?.completion_rate ?? 0}%`} color="purple" />
                                    <StatCard icon={Activity} title={t('guide.stats.response')}   value={`${customerMe?.response_rate ?? 0}%`} color="orange" />
                                </div>

                                <div className="bg-white dark:bg-dark-900 rounded-xl p-4 md:p-6 shadow-sm border border-gray-200 dark:border-dark-800">
                                    <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('guide.stats.popular')}</h3>
                                    <div className="space-y-3">
                                        {!analytics.popular_services?.length && <div className="text-sm text-gray-500 dark:text-gray-400">{t('guide.stats.noData')}</div>}
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-dark-900 rounded-xl p-4 md:p-6 shadow-sm border border-gray-200 dark:border-dark-800">
                                    <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('guide.stats.monthlyPerf')}</h3>
                                    <div className="h-48 md:h-64 bg-gray-100 dark:bg-dark-800 rounded-lg flex items-center justify-center">
                                        <div className="text-center">
                                            <PieChart className="h-10 w-10 md:h-12 md:w-12 text-gray-400 mx-auto mb-2" />
                                            <p className="text-sm md:text-base text-gray-600 dark:text-gray-300">{t('guide.stats.chartPlaceholder')}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* SETTINGS */}
                        {activeTab === "settings" && (
                            <div className="space-y-4 md:space-y-6">
                                <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{t('guide.dashboard.settings')}</h2>
                                <div className="bg-white dark:bg-dark-900 rounded-xl p-4 md:p-6 shadow-sm border border-gray-200 dark:border-dark-800">
                                    <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('guide.dashboard.changeProfilePicture')}</h3>
                                    <div className="flex items-center gap-4 md:gap-6">
                                        <div className="relative">
                                            <img
                                                src={uploadPreview || customerMe?.avatar_url || "https://placehold.co/96x96"}
                                                alt="Current profile"
                                                className="w-20 h-20 md:w-24 md:h-24 rounded-full object-cover border-4 border-gray-200 dark:border-dark-800"
                                            />
                                            <label className="absolute -bottom-2 -right-2 md:bottom-0 md:right-0 bg-blue-600 rounded-full p-2 cursor-pointer hover:bg-blue-700 transition-colors">
                                                <Camera className="h-4 w-4 text-white" />
                                                <input type="file" accept="image/jpeg,image/png,image/gif" onChange={onPickAvatar} className="hidden" />
                                            </label>
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-medium text-gray-900 dark:text-white mb-2 text-sm md:text-base">{t('guide.dashboard.currentPhoto')}</h4>
                                            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300 mb-3 md:mb-4">{t('guide.dashboard.photoRequirements')}</p>
                                            <div className="flex flex-wrap gap-2 md:gap-3">
                                                {uploadPreview && (
                                                    <button onClick={saveAvatar} disabled={isUploadingImage} className={`px-3 md:px-4 py-2 rounded-lg ${isUploadingImage ? "bg-gray-300" : "bg-green-600 hover:bg-green-700"} text-white text-sm`}>
                                                        {isUploadingImage ? t('guide.dashboard.saving') : t('guide.dashboard.uploadNewPhoto')}
                                                    </button>
                                                )}
                                                {(customerMe?.avatar_url || uploadPreview) && (
                                                    <button onClick={removeAvatar} className="border border-gray-300 dark:border-dark-700 text-gray-700 dark:text-gray-200 px-3 md:px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-800 transition-colors text-sm">
                                                        {t('guide.dashboard.removePhoto')}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}