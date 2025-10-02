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
        <div className="bg-white dark:bg-dark-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-dark-800">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${c.bg}`}>
                    <Icon className={`h-6 w-6 ${c.text}`} />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">+12%</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{value}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">{title}</p>
            {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
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

    // portfolio
    const [portfolio, setPortfolio] = useState([]);
    const [openPortfolioForm, setOpenPortfolioForm] = useState(false);
    const [pfTitle, setPfTitle] = useState("");
    const [pfDesc, setPfDesc] = useState("");
    const [pfOrder, setPfOrder] = useState(0);
    const [pfImage, setPfImage] = useState(null);

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
    const fullName = userMe?.full_name || t('guide.common.yourName');

    // helpers
    const mapLanguagesToIds = (csv) => {
        const parts = (csv || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
        if (!parts.length) return [];
        return parts
            .map((v) => {
                const hit = allLanguages.find((l) => {
                    const fields = [l?.name, l?.code, l?.native_name, l?.title, l?.iso2, l?.iso_639_1, l?.isoCode]
                        .filter(Boolean).map(String).map((x) => x.toLowerCase());
                    return fields.includes(v);
                });
                return hit?.id;
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
                    languages: (c?.languages || []).map((l) => l.name).join(", "),
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
    const saveProfile = async () => {
        try {
            const countryId = findCountryId(edit.location);
            const langIds = mapLanguagesToIds(edit.languages);
            await patchMe({
                first_name: edit.first_name || "",
                last_name: edit.last_name || "",
                ...(countryId ? { country: countryId } : {}),
            });
            const payload = {
                professional_bio: edit.bio || "",
                years_of_experience: Number(edit.experience_years) || 0,
            };
            if (Array.isArray(langIds) && langIds.length) payload.languages = langIds;
            await updateMyCustomerProfile(payload);
            const [u, c] = await Promise.all([
                getMe().then((r) => r.data ?? r),
                getMyCustomerProfile().then((r) => r.data ?? r),
            ]);
            setUserMe(u);
            setCustomerMe(c);
            alert(t('guide.dashboard.saved'));
        } catch (e) {
            alert(t('guide.dashboard.saveFailed'));
        }
    };

    // portfolio form
    const onPickPortfolioImage = (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        if (f.size > 10 * 1024 * 1024) return alert(t('guide.dashboard.portfolioMax'));
        setPfImage(f);
    };
    const submitPortfolio = async (e) => {
        e.preventDefault();
        if (!pfImage) return alert(t('guide.dashboard.photoRequired'));
        try {
            const fd = new FormData();
            fd.append("image", pfImage);
            if (pfTitle) fd.append("title", pfTitle);
            if (pfDesc) fd.append("description", pfDesc);
            if (pfOrder) fd.append("order", String(pfOrder));
            const created = await createPortfolio(fd).then((r) => r.data ?? r);
            setPortfolio((xs) => [created, ...xs]);
            setPfTitle(""); setPfDesc(""); setPfOrder(0); setPfImage(null); setOpenPortfolioForm(false);
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
                setConfirmedBookings((xs) => [{ ...nb, status: nb.status === "confirmed" ? "confirmed" : "confirmed" }, ...xs]);
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

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-dark-950 pt-8 transition-colors">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('guide.dashboard.title')}</h1>
                    <p className="text-gray-600 dark:text-gray-400">{t('guide.dashboard.description')}</p>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Sidebar */}
                    <div className="lg:w-64 flex-shrink-0">
                        <div className="bg-white dark:bg-dark-900 rounded-xl shadow-sm border border-gray-200 dark:border-dark-800 p-4">
                            <nav className="space-y-2">
                                {[
                                    { id: "overview",  label: t('guide.nav.overview'),  icon: TrendingUp },
                                    { id: "bookings",  label: t('guide.dashboard.bookings'), icon: Calendar },
                                    { id: "profile",   label: t('guide.nav.profileServices'), icon: UserIcon },
                                    { id: "earnings",  label: t('guide.dashboard.earnings'), icon: DollarSign },
                                    { id: "reviews",   label: t('guide.dashboard.reviews'), icon: Star },
                                    { id: "analytics", label: t('guide.nav.analytics'), icon: BarChart3 },
                                    { id: "settings",  label: t('guide.dashboard.settings'), icon: Settings },
                                ].map((item) => (
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

                    <div className="flex-1">
                        {/* OVERVIEW */}
                        {activeTab === "overview" && (
                            <div className="space-y-8">
                                <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-white">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h2 className="text-2xl font-bold mb-2">
                                                {t('guide.overview.welcome', { name: fullName })}
                                            </h2>
                                            <p className="text-blue-100">{t('guide.overview.todayCount', { n: todaySchedule.length })}</p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-3xl font-bold">{avgRating}★</div>
                                            <p className="text-blue-100">{t('guide.overview.yourRating')}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                    <StatCard icon={Calendar} title={t('guide.dashboard.activeBookings')} value={upcomingCount} color="blue" />
                                    <StatCard icon={DollarSign} title={t('guide.earn.thisMonth')} value={`$${earnings.this_month}`} subtitle={`+${earnings.growth_rate}%`} color="green" />
                                    <StatCard icon={Star} title={t('guide.dashboard.averageRating')} value={avgRating} subtitle={`${customerMe?.total_reviews || 0} ${t('guide.reviews.count')}`} color="yellow" />
                                    <StatCard icon={MessageCircle} title={t('guide.overview.responseRate')} value={`${customerMe?.response_rate || 0}%`} subtitle={t('guide.overview.last30')} color="purple" />
                                </div>

                                <div className="bg-white dark:bg-dark-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-dark-800">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('guide.overview.todaySchedule')}</h3>
                                    {todaySchedule.length ? (
                                        <div className="space-y-4">
                                            {todaySchedule.map((a) => (
                                                <div key={a.id} className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                                    <div className="flex items-center space-x-4">
                                                        <div className="text-center">
                                                            <div className="text-lg font-bold text-blue-600 dark:text-blue-300">{a.time ?? "—"}</div>
                                                        </div>
                                                        <div>
                                                            <h4 className="font-semibold text-gray-900 dark:text-white">{a.tourist_name ?? t('guide.common.guest')}</h4>
                                                            <p className="text-sm text-gray-600 dark:text-gray-300">{a.service_name ?? t('guide.common.service')} • {a.duration ?? 0}h</p>
                                                            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                                                                <MapPin className="h-3 w-3 mr-1" /> {a.location ?? "—"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <span className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-1 rounded-full text-xs">{a.status ?? t('guide.common.scheduled')}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-600 dark:text-gray-300 text-center py-8">{t('guide.overview.noToursToday')}</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* BOOKINGS */}
                        {activeTab === "bookings" && (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('guide.bookings.title')}</h2>
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={refreshBookings}
                                            className="px-4 py-2 border border-gray-300 dark:border-dark-700 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-800 text-gray-800 dark:text-gray-200"
                                        >
                                            {t('common.refresh')}
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-dark-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-dark-800">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('guide.bookings.pending')}</h3>
                                    {bookingLoading ? (
                                        <div className="text-sm text-gray-500 dark:text-gray-400">{t('common.loading')}</div>
                                    ) : bookingError ? (
                                        <div className="text-sm text-red-600">{bookingError}</div>
                                    ) : pendingBookings.length ? (
                                        <div className="space-y-4">
                                            {pendingBookings.map((b) => (
                                                <div key={b.id} className="p-4 rounded-lg border border-gray-200 dark:border-dark-800 bg-white dark:bg-dark-900 flex items-start justify-between">
                                                    <div className="space-y-1">
                                                        <div
                                                            className="font-semibold text-gray-900 dark:text-white cursor-pointer hover:underline"
                                                            onClick={() => openDetail(b.id)}
                                                        >
                                                            {b.title}
                                                        </div>
                                                        <div className="text-sm text-gray-600 dark:text-gray-300">
                                                            {b.tourist_name} • {b.number_of_people} {b.number_of_people === 1 ? t('booking.guest') : t('booking.guests')}
                                                        </div>
                                                        <div className="text-sm text-gray-600 dark:text-gray-300">
                                                            {b.start_date} → {b.end_date}
                                                        </div>
                                                        {!!b.location && <div className="text-sm text-gray-500 dark:text-gray-400">📍 {b.location}</div>}
                                                        {!!b.message && <div className="text-sm text-gray-500 dark:text-gray-400">“{b.message}”</div>}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => handleAccept(b.id)}
                                                            className="px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
                                                        >
                                                            {t('guide.bookings.accept')}
                                                        </button>
                                                        <button
                                                            onClick={() => openDeclineModal(b.id)}
                                                            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-dark-700 hover:bg-gray-50 dark:hover:bg-dark-800 text-gray-800 dark:text-gray-200"
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

                                <div className="bg-white dark:bg-dark-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-dark-800">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('guide.bookings.confirmed')}</h3>
                                    {bookingLoading ? (
                                        <div className="text-sm text-gray-500 dark:text-gray-400">{t('common.loading')}</div>
                                    ) : confirmedBookings.length ? (
                                        <div className="space-y-4">
                                            {confirmedBookings.map((b) => (
                                                <div key={b.id} className="p-4 rounded-lg border border-gray-200 dark:border-dark-800 bg-white dark:bg-dark-900 flex items-start justify-between">
                                                    <div className="space-y-1">
                                                        <div
                                                            className="font-semibold text-gray-900 dark:text-white cursor-pointer hover:underline"
                                                            onClick={() => openDetail(b.id)}
                                                        >
                                                            {b.title}
                                                        </div>
                                                        <div className="text-sm text-gray-600 dark:text-gray-300">
                                                            {b.tourist_name} • {b.number_of_people} {b.number_of_people === 1 ? t('booking.guest') : t('booking.guests')}
                                                        </div>
                                                        <div className="text-sm text-gray-600 dark:text-gray-300">
                                                            {b.start_date} → {b.end_date}
                                                        </div>
                                                        {!!b.location && <div className="text-sm text-gray-500 dark:text-gray-400">📍 {b.location}</div>}
                                                        {!!b.proposed_rate && (
                                                            <div className="text-sm text-gray-700 dark:text-gray-200">
                                                                {t('guide.bookings.offer')}: {b.proposed_rate} {b.currency}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={openChat}
                                                            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-dark-700 hover:bg-gray-50 dark:hover:bg-dark-800 text-gray-800 dark:text-gray-200"
                                                        >
                                                            {t('chat.title')}
                                                        </button>
                                                        <button
                                                            onClick={() => handleComplete(b.id)}
                                                            className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
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
                                    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
                                        <div className="bg-white dark:bg-dark-900 rounded-xl p-6 w-full max-w-md border border-gray-200 dark:border-dark-800">
                                            <div className="flex items-center justify-between mb-4">
                                                <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{t('guide.bookings.declineTitle')}</h4>
                                                <button onClick={() => setDeclineOpen(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                                                    <X className="h-5 w-5" />
                                                </button>
                                            </div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('guide.bookings.reasonOpt')}</label>
                                            <textarea
                                                rows={4}
                                                value={declineReason}
                                                onChange={(e) => setDeclineReason(e.target.value)}
                                                className="w-full p-3 border border-gray-300 dark:border-dark-700 rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100"
                                                placeholder={t('guide.bookings.reasonPh')}
                                            />
                                            <div className="mt-4 flex items-center justify-end gap-3">
                                                <button onClick={() => setDeclineOpen(false)} className="px-4 py-2 border border-gray-300 dark:border-dark-700 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-800 text-gray-800 dark:text-gray-200">{t('guide.dashboard.cancel')}</button>
                                                <button onClick={confirmDecline} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">{t('guide.bookings.decline')}</button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Booking detail modal */}
                                {detailOpen && (
                                    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
                                        <div className="bg-white dark:bg-dark-900 rounded-xl p-6 w-full max-w-2xl border border-gray-200 dark:border-dark-800">
                                            <div className="flex items-center justify-between mb-4">
                                                <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{t('guide.bookings.detailTitle')}</h4>
                                                <button onClick={() => setDetailOpen(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                                                    <X className="h-5 w-5" />
                                                </button>
                                            </div>
                                            <div className="grid md:grid-cols-2 gap-4">
                                                <div>
                                                    <div className="text-sm text-gray-500 dark:text-gray-400">{t('guide.bookings.title')}</div>
                                                    <div className="font-medium text-gray-900 dark:text-white">{detail?.title}</div>
                                                </div>
                                                <div>
                                                    <div className="text-sm text-gray-500 dark:text-gray-400">{t('guide.bookings.status')}</div>
                                                    <div className="font-medium capitalize text-gray-900 dark:text-white">{detail?.status}</div>
                                                </div>
                                                <div>
                                                    <div className="text-sm text-gray-500 dark:text-gray-400">{t('guide.bookings.tourist')}</div>
                                                    <div className="font-medium text-gray-900 dark:text-white">{detail?.tourist_name}</div>
                                                </div>
                                                <div>
                                                    <div className="text-sm text-gray-500 dark:text-gray-400">{t('guide.bookings.dates')}</div>
                                                    <div className="font-medium text-gray-900 dark:text-white">{detail?.start_date} → {detail?.end_date}</div>
                                                </div>
                                                {detail?.location && (
                                                    <div className="md:col-span-2">
                                                        <div className="text-sm text-gray-500 dark:text-gray-400">{t('guide.bookings.location')}</div>
                                                        <div className="font-medium text-gray-900 dark:text-white">📍 {detail.location}</div>
                                                    </div>
                                                )}
                                                {detail?.message && (
                                                    <div className="md:col-span-2">
                                                        <div className="text-sm text-gray-500 dark:text-gray-400">{t('guide.bookings.message')}</div>
                                                        <div className="font-medium text-gray-900 dark:text-white">{detail.message}</div>
                                                    </div>
                                                )}
                                                {!!detail?.proposed_rate && (
                                                    <div>
                                                        <div className="text-sm text-gray-500 dark:text-gray-400">{t('guide.bookings.offer')}</div>
                                                        <div className="font-medium text-gray-900 dark:text-white">{detail.proposed_rate} {detail.currency}</div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="mt-6 flex items-center justify-end gap-3">
                                                {detail?.status === "pending" && (
                                                    <>
                                                        <button
                                                            onClick={() => { setDetailOpen(false); handleAccept(detail.id); }}
                                                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                                                        >
                                                            {t('guide.bookings.accept')}
                                                        </button>
                                                        <button
                                                            onClick={() => { setDetailOpen(false); openDeclineModal(detail.id); }}
                                                            className="px-4 py-2 border border-gray-300 dark:border-dark-700 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-800 text-gray-800 dark:text-gray-200"
                                                        >
                                                            {t('guide.bookings.decline')}
                                                        </button>
                                                    </>
                                                )}
                                                {(detail?.status === "confirmed" || detail?.status === "accepted") && (
                                                    <>
                                                        <button
                                                            onClick={() => { setDetailOpen(false); openChat(); }}
                                                            className="px-4 py-2 border border-gray-300 dark:border-dark-700 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-800 text-gray-800 dark:text-gray-200"
                                                        >
                                                            {t('chat.title')}
                                                        </button>
                                                        <button
                                                            onClick={() => { setDetailOpen(false); handleComplete(detail.id); }}
                                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
                            <div className="space-y-8">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('guide.nav.profileServices')}</h2>
                                {/* Profile */}
                                <div className="bg-white dark:bg-dark-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-dark-800">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('guide.dashboard.profileInfo')}</h3>
                                        <button onClick={saveProfile} className="flex items-center space-x-1 px-4 py-2 rounded-lg transition-colors bg-blue-600 text-white hover:bg-blue-700">
                                            <Edit3 className="h-4 w-4" />
                                            <span>{t('guide.dashboard.saveChanges')}</span>
                                        </button>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('guide.dashboard.changeProfilePicture')}</label>
                                                <div className="flex items-center space-x-4">
                                                    <img
                                                        src={uploadPreview || customerMe?.avatar_url || "https://placehold.co/80x80"}
                                                        alt="Profile"
                                                        className="w-20 h-20 rounded-full object-cover border-4 border-gray-200 dark:border-dark-800"
                                                    />
                                                    <label className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 cursor-pointer">
                                                        <Camera className="h-4 w-4" />
                                                        <span>{t('guide.dashboard.uploadNewPhoto')}</span>
                                                        <input type="file" accept="image/jpeg,image/png,image/gif" onChange={onPickAvatar} className="hidden" />
                                                    </label>
                                                    {uploadFile && (
                                                        <button onClick={saveAvatar} disabled={isUploadingImage} className={`px-4 py-2 rounded-lg ${isUploadingImage ? "bg-gray-300" : "bg-green-600 hover:bg-green-700"} text-white`}>
                                                            {isUploadingImage ? t('guide.dashboard.saving') : t('guide.dashboard.uploadNewPhoto')}
                                                        </button>
                                                    )}
                                                    {(customerMe?.avatar_url || uploadPreview) && (
                                                        <button onClick={removeAvatar} className="border border-gray-300 dark:border-dark-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-800 transition-colors">
                                                            {t('guide.dashboard.removePhoto')}
                                                        </button>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{t('guide.dashboard.photoRequirements')}</p>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('guide.profile.firstName')}</label>
                                                    <input
                                                        type="text"
                                                        value={edit.first_name}
                                                        onChange={(e) => setEdit((x) => ({ ...x, first_name: e.target.value }))}
                                                        className="w-full p-3 border border-gray-300 dark:border-dark-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('guide.profile.lastName')}</label>
                                                    <input
                                                        type="text"
                                                        value={edit.last_name}
                                                        onChange={(e) => setEdit((x) => ({ ...x, last_name: e.target.value }))}
                                                        className="w-full p-3 border border-gray-300 dark:border-dark-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('guide.profile.emailReadonly')}</label>
                                                <input type="email" value={edit.email} readOnly className="w-full p-3 border border-gray-300 dark:border-dark-700 bg-gray-50 dark:bg-dark-800 rounded-lg text-gray-600 dark:text-gray-300" />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('guide.profile.location')}</label>
                                                <input
                                                    type="text"
                                                    placeholder={t('guide.profile.locationPh')}
                                                    value={edit.location}
                                                    onChange={(e) => setEdit((x) => ({ ...x, location: e.target.value }))}
                                                    className="w-full p-3 border border-gray-300 dark:border-dark-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('guide.profile.bio')}</label>
                                                <textarea
                                                    value={edit.bio}
                                                    onChange={(e) => setEdit((x) => ({ ...x, bio: e.target.value }))}
                                                    className="w-full p-3 border border-gray-300 dark:border-dark-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100"
                                                    rows={4}
                                                    placeholder={t('guide.profile.bioPh')}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('guide.profile.languages')}</label>
                                                <input
                                                    type="text"
                                                    value={edit.languages}
                                                    onChange={(e) => setEdit((x) => ({ ...x, languages: e.target.value }))}
                                                    className="w-full p-3 border border-gray-300 dark:border-dark-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100"
                                                    placeholder={t('guide.profile.languagesPh')}
                                                />
                                                {!!allLanguages.length ? (
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                        {t('guide.profile.known')}: {allLanguages.slice(0, 6).map((l) => l.code).join(", ")}
                                                        {allLanguages.length > 6 ? "…" : ""}
                                                    </p>
                                                ) : (
                                                    <p className="text-xs text-gray-400 mt-1">{t('guide.profile.langsNotLoaded')}</p>
                                                )}
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('guide.profile.years')}</label>
                                                <select
                                                    value={edit.experience_years}
                                                    onChange={(e) => setEdit((x) => ({ ...x, experience_years: Number(e.target.value) }))}
                                                    className="w-full p-3 border border-gray-300 dark:border-dark-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100"
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

                                {/* Portfolio */}
                                <div className="bg-white dark:bg-dark-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-dark-800">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('guide.dashboard.services')}</h3>
                                        <button
                                            onClick={() => setOpenPortfolioForm(true)}
                                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                                        >
                                            <Plus className="h-4 w-4" />
                                            <span>{t('guide.dashboard.addService')}</span>
                                        </button>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-4">
                                        {portfolio.map((s) => (
                                            <div key={s.id} className="border border-gray-200 dark:border-dark-800 rounded-lg p-4 bg-white dark:bg-dark-900">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center space-x-3">
                                                        <img src={s.image_url || "https://placehold.co/72x72"} alt={s.title || "Item"} className="w-16 h-16 object-cover rounded" />
                                                        <div>
                                                            <h4 className="font-medium text-gray-900 dark:text-white">{s.title ?? t('guide.service.item')}</h4>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">{t('guide.service.order', { n: s.order ?? 0 })}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <button title={t('guide.service.preview')} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                                            <Eye className="h-4 w-4" />
                                                        </button>
                                                        <button title={t('guide.dashboard.deleteService')} onClick={() => removePortfolio(s.id)} className="text-red-500 hover:text-red-600">
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="text-sm text-gray-500 dark:text-gray-400">{s.description ?? t('guide.service.noDesc')}</div>
                                            </div>
                                        ))}
                                        {!portfolio.length && <div className="text-sm text-gray-500 dark:text-gray-400">{t('guide.service.empty')}</div>}
                                    </div>

                                    {/* form modal */}
                                    {openPortfolioForm && (
                                        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
                                            <div className="bg-white dark:bg-dark-900 rounded-xl p-6 w-full max-w-lg border border-gray-200 dark:border-dark-800">
                                                <h4 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{t('guide.dashboard.addService')}</h4>
                                                <form onSubmit={submitPortfolio} className="space-y-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('guide.dashboard.serviceName')}</label>
                                                        <input value={pfTitle} onChange={(e) => setPfTitle(e.target.value)} className="w-full p-3 border border-gray-300 dark:border-dark-700 rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100" placeholder={t('guide.service.titlePh')} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('guide.dashboard.description')}</label>
                                                        <textarea value={pfDesc} onChange={(e) => setPfDesc(e.target.value)} className="w-full p-3 border border-gray-300 dark:border-dark-700 rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100" rows={3} placeholder={t('guide.service.descPh')} />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('guide.service.orderLabel')}</label>
                                                            <input type="number" value={pfOrder} onChange={(e) => setPfOrder(Number(e.target.value))} className="w-full p-3 border border-gray-300 dark:border-dark-700 rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100" />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('guide.service.imageReq')}</label>
                                                            <input type="file" accept="image/*" onChange={onPickPortfolioImage} className="w-full p-2 border border-gray-300 dark:border-dark-700 rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100" />
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-end gap-3 pt-2">
                                                        <button type="button" onClick={() => setOpenPortfolioForm(false)} className="px-4 py-2 border border-gray-300 dark:border-dark-700 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-800 text-gray-800 dark:text-gray-200">{t('guide.dashboard.cancel')}</button>
                                                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{t('guide.dashboard.saveService')}</button>
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
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('guide.dashboard.earnings')}</h2>
                                    <button className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2">
                                        <Wallet className="h-4 w-4" />
                                        <span>{t('guide.earn.withdraw', { amount: earnings.pending_payout })}</span>
                                    </button>
                                </div>

                                <div className="grid md:grid-cols-4 gap-6">
                                    <div className="bg-white dark:bg-dark-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-dark-800">
                                        <div className="flex items-center justify-between mb-4">
                                            <Wallet className="h-8 w-8 text-green-600" />
                                            <span className="text-xs text-green-600">+{earnings.growth_rate}%</span>
                                        </div>
                                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">${earnings.total_balance}</h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-300">{t('guide.earn.totalBalance')}</p>
                                    </div>
                                    <div className="bg-white dark:bg-dark-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-dark-800">
                                        <div className="flex items-center justify-between mb-4">
                                            <DollarSign className="h-8 w-8 text-blue-600" />
                                            <span className="text-xs text-blue-600">{t('guide.earn.thisMonthShort')}</span>
                                        </div>
                                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">${earnings.this_month}</h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-300">{t('guide.earn.monthly')}</p>
                                    </div>
                                    <div className="bg-white dark:bg-dark-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-dark-800">
                                        <div className="flex items-center justify-between mb-4">
                                            <TrendingUp className="h-8 w-8 text-purple-600" />
                                            <span className="text-xs text-purple-600">{t('guide.earn.average')}</span>
                                        </div>
                                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">${earnings.average_booking_value}</h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-300">{t('guide.earn.perBooking')}</p>
                                    </div>
                                    <div className="bg-white dark:bg-dark-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-dark-800">
                                        <div className="flex items-center justify-between mb-4">
                                            <Clock className="h-8 w-8 text-orange-600" />
                                            <span className="text-xs text-orange-600">{t('guide.earn.pendingShort')}</span>
                                        </div>
                                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">${earnings.pending_payout}</h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-300">{t('guide.earn.available')}</p>
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-dark-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-dark-800">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('guide.earn.transactions')}</h3>
                                        <button className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center space-x-1">
                                            <Download className="h-4 w-4" />
                                            <span>{t('guide.earn.export')}</span>
                                        </button>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-800">
                                            <thead className="bg-gray-50 dark:bg-dark-900">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('guide.earn.date')}</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('guide.earn.tourist')}</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('guide.earn.service')}</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('guide.earn.amount')}</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('guide.earn.status')}</th>
                                            </tr>
                                            </thead>
                                            <tbody className="bg-white dark:bg-dark-900 divide-y divide-gray-200 dark:divide-dark-800">
                                            {!transactions.length && (
                                                <tr><td colSpan={5} className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{t('guide.earn.noTx')}</td></tr>
                                            )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* REVIEWS */}
                        {activeTab === "reviews" && (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('guide.dashboard.reviews')}</h2>
                                    <button
                                        onClick={fetchMyReviews}
                                        className="px-4 py-2 border border-gray-300 dark:border-dark-700 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-800 text-gray-800 dark:text-gray-200"
                                    >
                                        {t('common.refresh')}
                                    </button>
                                </div>
                                <div className="bg-white dark:bg-dark-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-dark-800">
                                    {reviewsLoading ? (
                                        <div className="text-sm text-gray-500 dark:text-gray-400">{t('common.loading')}</div>
                                    ) : reviewsErr ? (
                                        <div className="text-sm text-red-600">{reviewsErr}</div>
                                    ) : reviews.length ? (
                                        <div className="space-y-4">
                                            {reviews.map((r) => (
                                                <div key={r.id} className="p-4 rounded-lg border border-gray-200 dark:border-dark-800">
                                                    <div className="flex items-center justify-between">
                                                        <div className="font-semibold text-gray-900 dark:text-white">
                                                            {(r.client?.first_name || "") + " " + (r.client?.last_name || "")}
                                                        </div>
                                                        <div className="text-yellow-600 dark:text-yellow-300 font-medium">
                                                            {Number(r.overall_rating || 0).toFixed(1)}★
                                                        </div>
                                                    </div>
                                                    {r.title && <div className="mt-1 text-gray-800 dark:text-gray-200">{r.title}</div>}
                                                    {r.comment && <div className="mt-1 text-gray-600 dark:text-gray-300">{r.comment}</div>}
                                                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
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
                            <div className="space-y-6">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('guide.nav.analytics')}</h2>
                                <div className="grid md:grid-cols-4 gap-6">
                                    <StatCard icon={Users} title={t('guide.stats.week')}   value={analytics.bookings_this_week ?? 0} color="blue" />
                                    <StatCard icon={Calendar} title={t('guide.stats.month')} value={analytics.bookings_this_month ?? 0} color="green" />
                                    <StatCard icon={Target} title={t('guide.stats.completion')} value={`${customerMe?.completion_rate ?? 0}%`} color="purple" />
                                    <StatCard icon={Activity} title={t('guide.stats.response')}   value={`${customerMe?.response_rate ?? 0}%`} color="orange" />
                                </div>

                                <div className="bg-white dark:bg-dark-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-dark-800">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">{t('guide.stats.popular')}</h3>
                                    <div className="space-y-4">
                                        {!analytics.popular_services?.length && <div className="text-sm text-gray-500 dark:text-gray-400">{t('guide.stats.noData')}</div>}
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-dark-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-dark-800">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">{t('guide.stats.monthlyPerf')}</h3>
                                    <div className="h-64 bg-gray-100 dark:bg-dark-800 rounded-lg flex items-center justify-center">
                                        <div className="text-center">
                                            <PieChart className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                                            <p className="text-gray-600 dark:text-gray-300">{t('guide.stats.chartPlaceholder')}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* SETTINGS */}
                        {activeTab === "settings" && (
                            <div className="space-y-6">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('guide.dashboard.settings')}</h2>
                                <div className="bg-white dark:bg-dark-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-dark-800">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">{t('guide.dashboard.changeProfilePicture')}</h3>
                                    <div className="flex items-center space-x-6">
                                        <div className="relative">
                                            <img
                                                src={uploadPreview || customerMe?.avatar_url || "https://placehold.co/96x96"}
                                                alt="Current profile"
                                                className="w-24 h-24 rounded-full object-cover border-4 border-gray-200 dark:border-dark-800"
                                            />
                                            <label className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-2 cursor-pointer hover:bg-blue-700 transition-colors">
                                                <Camera className="h-4 w-4 text-white" />
                                                <input type="file" accept="image/jpeg,image/png,image/gif" onChange={onPickAvatar} className="hidden" />
                                            </label>
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-medium text-gray-900 dark:text-white mb-2">{t('guide.dashboard.currentPhoto')}</h4>
                                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{t('guide.dashboard.photoRequirements')}</p>
                                            <div className="flex flex-wrap gap-3">
                                                {uploadPreview && (
                                                    <button onClick={saveAvatar} disabled={isUploadingImage} className={`px-4 py-2 rounded-lg ${isUploadingImage ? "bg-gray-300" : "bg-green-600 hover:bg-green-700"} text-white`}>
                                                        {isUploadingImage ? t('guide.dashboard.saving') : t('guide.dashboard.uploadNewPhoto')}
                                                    </button>
                                                )}
                                                {(customerMe?.avatar_url || uploadPreview) && (
                                                    <button onClick={removeAvatar} className="border border-gray-300 dark:border-dark-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-800 transition-colors">
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
