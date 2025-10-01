// src/pages/GuideDashboard.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Calendar, DollarSign, Star, Users, MessageCircle, Settings, Edit3, Eye,
    Clock, TrendingUp, MapPin, Camera, Wallet, PieChart, Activity, Plus,
    Filter, Download, BarChart3, Target, User as UserIcon, Trash2, X
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
    partialUpdateBooking,
} from "../api/bookings";
import { getLanguages, getCountries } from "../api/common";
import { getReviews } from "../api/reviews";

const DEF_EARNINGS = { total_balance: 0, this_month: 0, pending_payout: 0, average_booking_value: 0, growth_rate: 0 };
const DEF_ANALYTICS = { bookings_this_week: 0, bookings_this_month: 0, popular_services: [], monthly_earnings: [] };
const colorMap = {
    blue: { bg: "bg-blue-100", text: "text-blue-600" },
    green: { bg: "bg-green-100", text: "text-green-600" },
    yellow: { bg: "bg-yellow-100", text: "text-yellow-600" },
    purple: { bg: "bg-purple-100", text: "text-purple-600" },
    orange: { bg: "bg-orange-100", text: "text-orange-600" },
};
const StatCard = ({ icon: Icon, title, value, subtitle, color = "blue" }) => {
    const c = colorMap[color] || colorMap.blue;
    return (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${c.bg}`}>
                    <Icon className={`h-6 w-6 ${c.text}`} />
                </div>
                <span className="text-xs text-gray-500">+12%</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">{value}</h3>
            <p className="text-sm text-gray-600">{title}</p>
            {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
    );
};
export default function GuideDashboard() {
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
    // dashboards (placeholder)
    const [earnings] = useState(DEF_EARNINGS);
    const [analytics] = useState(DEF_ANALYTICS);
    // bookings (Guide view)
    const [pendingBookings, setPendingBookings] = useState([]);
    const [confirmedBookings, setConfirmedBookings] = useState([]);
    const [bookingLoading, setBookingLoading] = useState(false);
    const [bookingError, setBookingError] = useState(null);
    // Details & Decline modallari
    const [detailOpen, setDetailOpen] = useState(false);
    const [detail, setDetail] = useState(null);
    const [declineOpen, setDeclineOpen] = useState(false);
    const [declineId, setDeclineId] = useState(null);
    const [declineReason, setDeclineReason] = useState("");
    // schedule/transactions demo
    const todaySchedule = [];
    const transactions = [];
    const avgRating = useMemo(() => Number(customerMe?.average_rating || 0).toFixed(1), [customerMe]);
    const fullName = userMe?.full_name || "Your Name";
    // helpers
    const mapLanguagesToIds = (csv) => {
        const parts = (csv || "")
            .split(",")
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean);
        if (!parts.length) return [];
        return parts
            .map((v) => {
                const hit = allLanguages.find((l) => {
                    const fields = [
                        l?.name,
                        l?.code,
                        l?.native_name,
                        l?.title,
                        l?.iso2,
                        l?.iso_639_1,
                        l?.isoCode,
                    ]
                        .filter(Boolean)
                        .map(String)
                        .map((x) => x.toLowerCase());
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
            const fields = [
                c?.name,
                c?.code,
                c?.alpha2,
                c?.alpha3,
                c?.iso2,
                c?.iso3,
            ]
                .filter(Boolean)
                .map(String)
                .map((x) => x.toLowerCase());
            return fields.includes(v);
        });
        return hit?.id ?? null;
    };
    // Bookings helpers
    const normalizeBooking = (b) => ({
        id: b?.id,
        title: b?.title || "—",
        status: String(b?.status || b?.status_display || "").toLowerCase(), // 👈 fallback
        tourist_name: b?.client_name || b?.client?.full_name || b?.user?.full_name || "Tourist",
        start_date: b?.start_date,
        end_date: b?.end_date,
        location: b?.location || b?.city_name || b?.country_name || "",
        number_of_people: b?.number_of_people ?? b?.guests ?? 1, // 👈 guests fallback
        proposed_rate: b?.proposed_rate ?? b?.amount ?? null, // 👈 fallback
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
            setBookingError("Failed to load bookings");
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
            setReviewsErr("Failed to load reviews");
        } finally {
            setReviewsLoading(false);
        }
    };
// "reviews" tabiga o'tganda yuklab keling
    useEffect(() => {
        if (activeTab === "reviews") fetchMyReviews();
    }, [activeTab, customerMe?.id]);
    // init
    useEffect(() => {
        (async () => {
            try {
                // me (auth)
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
                // catalogs
                const [langs, countries] = await Promise.all([
                    getLanguages().then((r) => r.data ?? r).catch(() => []),
                    getCountries().then((r) => r.data ?? r).catch(() => []),
                ]);
                setAllLanguages(Array.isArray(langs) ? langs : langs?.results || []);
                setAllCountries(Array.isArray(countries) ? countries : countries?.results || []);
                // portfolio
                const ports = await getMyPortfolios().then((r) => r.data ?? r).catch(() => []);
                setPortfolio(Array.isArray(ports) ? ports : ports?.results || []);
                // guide bookings
                await fetchGuideBookings();
            } finally {
                setLoading(false);
            }
        })();
    }, []);
    // polling: bookings tab aktiv bo‘lsa 60s da bir yangilash
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
        if (f.size > 5 * 1024 * 1024) return alert("Max 5MB");
        if (!/^image\/(jpeg|png|gif)$/.test(f.type)) return alert("JPG/PNG/GIF tanlang");
        setUploadFile(f);
        const reader = new FileReader();
        reader.onload = (ev) => setUploadPreview(ev?.target?.result || null);
        reader.readAsDataURL(f);
    };
    const saveAvatar = async () => {
        if (!uploadFile) return;
        setIsUploadingImage(true);
        try {
            await uploadMyCustomerAvatar(uploadFile); // endi ichida o'zi FormData qiladi
            const c = await getMyCustomerProfile().then(r => r.data ?? r);
            setCustomerMe(c);
            setUploadFile(null);
            setUploadPreview(null);
            alert("Avatar updated");
        } catch {
            alert("Avatar upload failed");
        } finally {
            setIsUploadingImage(false);
        }
    };
    const removeAvatar = async () => {
        if (!userMe?.id) return;
        try {
            await deleteMyCustomerAvatar();
            const c = await getMyCustomerProfile().then((r) => r.data ?? r);
            setCustomerMe(c);
            setUploadFile(null);
            setUploadPreview(null);
        } catch {
            alert("Failed to remove avatar");
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
            if (Array.isArray(langIds) && langIds.length) {
                payload.languages = langIds;
            }
            await updateMyCustomerProfile(payload);
            const [u, c] = await Promise.all([
                getMe().then((r) => r.data ?? r),
                getMyCustomerProfile().then((r) => r.data ?? r),
            ]);
            setUserMe(u);
            setCustomerMe(c);
            alert("Profile saved");
        } catch (e) {
            alert("Failed to save profile");
        }
    };
    // portfolio form
    const onPickPortfolioImage = (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        if (f.size > 10 * 1024 * 1024) return alert("Max 10MB");
        setPfImage(f);
    };
    const submitPortfolio = async (e) => {
        e.preventDefault();
        if (!pfImage) return alert("Rasm talab qilinadi");
        try {
            const fd = new FormData();
            fd.append("image", pfImage);
            if (pfTitle) fd.append("title", pfTitle);
            if (pfDesc) fd.append("description", pfDesc);
            if (pfOrder) fd.append("order", String(pfOrder));
            const created = await createPortfolio(fd).then((r) => r.data ?? r);
            setPortfolio((xs) => [created, ...xs]);
            setPfTitle(""); setPfDesc(""); setPfOrder(0); setPfImage(null); setOpenPortfolioForm(false);
            alert("Portfolio item created");
        } catch (e) {
            alert("Portfolio create failed");
        }
    };
    const removePortfolio = async (id) => {
        if (!window.confirm("Delete this item?")) return;
        try {
            await deletePortfolio(id);
            setPortfolio((xs) => xs.filter((i) => i.id !== id));
        } catch {
            alert("Delete failed");
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
                if (nb.status === "confirmed") {
                    setConfirmedBookings((xs) => [nb, ...xs]);
                } else {
                    setConfirmedBookings((xs) => [{ ...nb, status: "confirmed" }, ...xs]);
                }
            } catch {
                setConfirmedBookings((xs) => [{ id, title: "—", status: "confirmed" }, ...xs]);
            }
        } catch {
            alert("Failed to accept booking");
        }
    };
    const openDeclineModal = (id) => {
        setDeclineId(id);
        setDeclineReason("");
        setDeclineOpen(true);
    };
    const confirmDecline = async () => {
        const id = declineId;
        setDeclineOpen(false);
        if (!id) return;
        // Optimistik: Pending’dan olib tashlaymiz
        const prev = [...pendingBookings];
        setPendingBookings(xs => xs.filter(b => b.id !== id));
        try {
            await actOnBooking(id, "decline", declineReason ? { reason: declineReason } : {});
        } catch (e) {
            // rollback
            setPendingBookings(prev);
            alert("Failed to decline booking");
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
            alert("Failed to mark as completed");
        }
    };
    const refreshBookings = async () => {
        await fetchGuideBookings();
        alert("Bookings refreshed");
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
    // Shunchaki Chat sahifasini ochamiz
    const openChat = () => navigate("/chat");
    const upcomingCount = useMemo(
        () => (pendingBookings?.length || 0) + (confirmedBookings?.length || 0),
        [pendingBookings, confirmedBookings]
    );
    if (loading) {
        return <div className="min-h-screen flex items-center justify-center text-gray-600">Loading…</div>;
    }
    return (
        <div className="min-h-screen bg-gray-50 pt-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Guide Dashboard</h1>
                    <p className="text-gray-600">Manage your bookings, profile, and earnings</p>
                </div>
                <div className="flex flex-col lg:flex-row gap-8">
                    <div className="lg:w-64 flex-shrink-0">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                            <nav className="space-y-2">
                                {[
                                    { id: "overview", label: "Overview", icon: TrendingUp },
                                    { id: "bookings", label: "Bookings", icon: Calendar },
                                    { id: "profile", label: "Profile & Services", icon: UserIcon },
                                    { id: "earnings", label: "Earnings", icon: DollarSign },
                                    { id: "reviews", label: "Reviews", icon: Star },
                                    { id: "analytics", label: "Analytics", icon: BarChart3 },
                                    { id: "settings", label: "Settings", icon: Settings },
                                ].map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => setActiveTab(item.id)}
                                        className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                                            activeTab === item.id
                                                ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                                                : "text-gray-700 hover:bg-gray-50"
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
                                            <h2 className="text-2xl font-bold mb-2">Welcome back, {fullName}!</h2>
                                            <p className="text-blue-100">You have {todaySchedule.length} tours scheduled for today</p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-3xl font-bold">{avgRating}★</div>
                                            <p className="text-blue-100">Your Rating</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                    <StatCard icon={Calendar} title="Active Bookings" value={upcomingCount} color="blue" />
                                    <StatCard icon={DollarSign} title="This Month" value={`$${earnings.this_month}`} subtitle={`+${earnings.growth_rate}% from last month`} color="green" />
                                    <StatCard icon={Star} title="Average Rating" value={avgRating} subtitle={`${customerMe?.total_reviews || 0} reviews`} color="yellow" />
                                    <StatCard icon={MessageCircle} title="Response Rate" value={`${customerMe?.response_rate || 0}%`} subtitle="Last 30 days" color="purple" />
                                </div>
                                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Schedule</h3>
                                    {todaySchedule.length ? (
                                        <div className="space-y-4">
                                            {todaySchedule.map((a) => (
                                                <div key={a.id} className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                                                    <div className="flex items-center space-x-4">
                                                        <div className="text-center">
                                                            <div className="text-lg font-bold text-blue-600">{a.time ?? "—"}</div>
                                                        </div>
                                                        <div>
                                                            <h4 className="font-semibold text-gray-900">{a.tourist_name ?? "Guest"}</h4>
                                                            <p className="text-sm text-gray-600">{a.service_name ?? "Service"} • {a.duration ?? 0}h</p>
                                                            <p className="text-sm text-gray-500 flex items-center">
                                                                <MapPin className="h-3 w-3 mr-1" /> {a.location ?? "—"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">{a.status ?? "scheduled"}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-600 text-center py-8">No tours scheduled for today</p>
                                    )}
                                </div>
                            </div>
                        )}
                        {/* BOOKINGS */}
                        {activeTab === "bookings" && (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-2xl font-bold text-gray-900">Booking Management</h2>
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={refreshBookings}
                                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                                        >
                                            Refresh
                                        </button>
                                    </div>
                                </div>
                                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Pending Requests</h3>
                                    {bookingLoading ? (
                                        <div className="text-sm text-gray-500">Loading…</div>
                                    ) : bookingError ? (
                                        <div className="text-sm text-red-600">{bookingError}</div>
                                    ) : pendingBookings.length ? (
                                        <div className="space-y-4">
                                            {pendingBookings.map((b) => (
                                                <div key={b.id} className="p-4 rounded-lg border border-gray-200 flex items-start justify-between">
                                                    <div className="space-y-1">
                                                        <div
                                                            className="font-semibold text-gray-900 cursor-pointer hover:underline"
                                                            onClick={() => openDetail(b.id)}
                                                        >
                                                            {b.title}
                                                        </div>
                                                        <div className="text-sm text-gray-600">
                                                            {b.tourist_name} • {b.number_of_people} people
                                                        </div>
                                                        <div className="text-sm text-gray-600">
                                                            {b.start_date} → {b.end_date}
                                                        </div>
                                                        {!!b.location && <div className="text-sm text-gray-500">📍 {b.location}</div>}
                                                        {!!b.message && <div className="text-sm text-gray-500">“{b.message}”</div>}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => handleAccept(b.id)}
                                                            className="px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
                                                        >
                                                            Accept
                                                        </button>
                                                        <button
                                                            onClick={() => openDeclineModal(b.id)}
                                                            className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
                                                        >
                                                            Decline
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-sm text-gray-500">No pending requests</div>
                                    )}
                                </div>
                                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirmed Bookings</h3>
                                    {bookingLoading ? (
                                        <div className="text-sm text-gray-500">Loading…</div>
                                    ) : confirmedBookings.length ? (
                                        <div className="space-y-4">
                                            {confirmedBookings.map((b) => (
                                                <div key={b.id} className="p-4 rounded-lg border border-gray-200 flex items-start justify-between">
                                                    <div className="space-y-1">
                                                        <div
                                                            className="font-semibold text-gray-900 cursor-pointer hover:underline"
                                                            onClick={() => openDetail(b.id)}
                                                        >
                                                            {b.title}
                                                        </div>
                                                        <div className="text-sm text-gray-600">
                                                            {b.tourist_name} • {b.number_of_people} people
                                                        </div>
                                                        <div className="text-sm text-gray-600">
                                                            {b.start_date} → {b.end_date}
                                                        </div>
                                                        {!!b.location && <div className="text-sm text-gray-500">📍 {b.location}</div>}
                                                        {!!b.proposed_rate && (
                                                            <div className="text-sm text-gray-700">
                                                                Offer: {b.proposed_rate} {b.currency}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={openChat}
                                                            className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
                                                        >
                                                            Chat
                                                        </button>
                                                        <button
                                                            onClick={() => handleComplete(b.id)}
                                                            className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                                                        >
                                                            Mark Completed
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-sm text-gray-500">No confirmed bookings</div>
                                    )}
                                </div>
                                {/* Decline modal */}
                                {declineOpen && (
                                    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
                                        <div className="bg-white rounded-xl p-6 w-full max-w-md">
                                            <div className="flex items-center justify-between mb-4">
                                                <h4 className="text-lg font-semibold">Decline request</h4>
                                                <button onClick={() => setDeclineOpen(false)} className="text-gray-500 hover:text-gray-700">
                                                    <X className="h-5 w-5" />
                                                </button>
                                            </div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
                                            <textarea
                                                rows={4}
                                                value={declineReason}
                                                onChange={(e) => setDeclineReason(e.target.value)}
                                                className="w-full p-3 border rounded-lg"
                                                placeholder="E.g., Not available on selected dates"
                                            />
                                            <div className="mt-4 flex items-center justify-end gap-3">
                                                <button onClick={() => setDeclineOpen(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
                                                <button onClick={confirmDecline} className="px-4 py-2 bg-red-600 text-white rounded-lg">Decline</button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {/* Booking detail modal */}
                                {detailOpen && (
                                    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
                                        <div className="bg-white rounded-xl p-6 w-full max-w-2xl">
                                            <div className="flex items-center justify-between mb-4">
                                                <h4 className="text-lg font-semibold">Booking details</h4>
                                                <button onClick={() => setDetailOpen(false)} className="text-gray-500 hover:text-gray-700">
                                                    <X className="h-5 w-5" />
                                                </button>
                                            </div>
                                            <div className="grid md:grid-cols-2 gap-4">
                                                <div>
                                                    <div className="text-sm text-gray-500">Title</div>
                                                    <div className="font-medium">{detail?.title}</div>
                                                </div>
                                                <div>
                                                    <div className="text-sm text-gray-500">Status</div>
                                                    <div className="font-medium capitalize">{detail?.status}</div>
                                                </div>
                                                <div>
                                                    <div className="text-sm text-gray-500">Tourist</div>
                                                    <div className="font-medium">{detail?.tourist_name}</div>
                                                </div>
                                                <div>
                                                    <div className="text-sm text-gray-500">Dates</div>
                                                    <div className="font-medium">{detail?.start_date} → {detail?.end_date}</div>
                                                </div>
                                                {detail?.location && (
                                                    <div className="md:col-span-2">
                                                        <div className="text-sm text-gray-500">Location</div>
                                                        <div className="font-medium">📍 {detail.location}</div>
                                                    </div>
                                                )}
                                                {detail?.message && (
                                                    <div className="md:col-span-2">
                                                        <div className="text-sm text-gray-500">Message</div>
                                                        <div className="font-medium">{detail.message}</div>
                                                    </div>
                                                )}
                                                {!!detail?.proposed_rate && (
                                                    <div>
                                                        <div className="text-sm text-gray-500">Offer</div>
                                                        <div className="font-medium">{detail.proposed_rate} {detail.currency}</div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="mt-6 flex items-center justify-end gap-3">
                                                {detail?.status === "pending" && (
                                                    <>
                                                        <button
                                                            onClick={() => { setDetailOpen(false); handleAccept(detail.id); }}
                                                            className="px-4 py-2 bg-green-600 text-white rounded-lg"
                                                        >
                                                            Accept
                                                        </button>
                                                        <button
                                                            onClick={() => { setDetailOpen(false); openDeclineModal(detail.id); }}
                                                            className="px-4 py-2 border rounded-lg"
                                                        >
                                                            Decline
                                                        </button>
                                                    </>
                                                )}
                                                {(detail?.status === "confirmed" || detail?.status === "accepted") && (
                                                    <>
                                                        <button
                                                            onClick={() => { setDetailOpen(false); openChat(); }}
                                                            className="px-4 py-2 border rounded-lg"
                                                        >
                                                            Chat
                                                        </button>
                                                        <button
                                                            onClick={() => { setDetailOpen(false); handleComplete(detail.id); }}
                                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
                                                        >
                                                            Mark Completed
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
                                <h2 className="text-2xl font-bold text-gray-900">Profile & Services</h2>
                                {/* Profile */}
                                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-lg font-semibold text-gray-900">Profile Information</h3>
                                        <button onClick={saveProfile} className="flex items-center space-x-1 px-4 py-2 rounded-lg transition-colors bg-blue-600 text-white hover:bg-blue-700">
                                            <Edit3 className="h-4 w-4" />
                                            <span>Save Profile</span>
                                        </button>
                                    </div>
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Profile Photo</label>
                                                <div className="flex items-center space-x-4">
                                                    <img
                                                        src={uploadPreview || customerMe?.avatar_url || "https://placehold.co/80x80"}
                                                        alt="Profile"
                                                        className="w-20 h-20 rounded-full object-cover"
                                                    />
                                                    <label className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 cursor-pointer">
                                                        <Camera className="h-4 w-4" />
                                                        <span>Change Photo</span>
                                                        <input type="file" accept="image/jpeg,image/png,image/gif" onChange={onPickAvatar} className="hidden" />
                                                    </label>
                                                    {uploadFile && (
                                                        <button onClick={saveAvatar} disabled={isUploadingImage} className={`px-4 py-2 rounded-lg ${isUploadingImage ? "bg-gray-300" : "bg-green-600 hover:bg-green-700"} text-white`}>
                                                            {isUploadingImage ? "Uploading..." : "Upload Photo"}
                                                        </button>
                                                    )}
                                                    {(customerMe?.avatar_url || uploadPreview) && (
                                                        <button onClick={removeAvatar} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                                                            Remove Photo
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                                                    <input
                                                        type="text"
                                                        value={edit.first_name}
                                                        onChange={(e) => setEdit((x) => ({ ...x, first_name: e.target.value }))}
                                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                                                    <input
                                                        type="text"
                                                        value={edit.last_name}
                                                        onChange={(e) => setEdit((x) => ({ ...x, last_name: e.target.value }))}
                                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Email (readonly)</label>
                                                <input type="email" value={edit.email} readOnly className="w-full p-3 border border-gray-200 bg-gray-50 rounded-lg text-gray-600" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Location (Country name or code)</label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. Uzbekistan or UZ"
                                                    value={edit.location}
                                                    onChange={(e) => setEdit((x) => ({ ...x, location: e.target.value }))}
                                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                                                <textarea
                                                    value={edit.bio}
                                                    onChange={(e) => setEdit((x) => ({ ...x, bio: e.target.value }))}
                                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    rows={4}
                                                    placeholder="Tell us about yourself and your experience..."
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Languages (comma separated)</label>
                                                <input
                                                    type="text"
                                                    value={edit.languages}
                                                    onChange={(e) => setEdit((x) => ({ ...x, languages: e.target.value }))}
                                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    placeholder="e.g. English, Russian, Uzbek"
                                                />
                                                {!!allLanguages.length ? (
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Known: {allLanguages.slice(0, 6).map((l) => l.code).join(", ")}
                                                        {allLanguages.length > 6 ? "…" : ""}
                                                    </p>
                                                ) : (
                                                    <p className="text-xs text-gray-400 mt-1">Language catalog not loaded.</p>
                                                )}
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Years of Experience</label>
                                                <select
                                                    value={edit.experience_years}
                                                    onChange={(e) => setEdit((x) => ({ ...x, experience_years: Number(e.target.value) }))}
                                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                >
                                                    <option value={0}>0</option>
                                                    <option value={1}>1-2 years</option>
                                                    <option value={3}>3-5 years</option>
                                                    <option value={5}>5+ years</option>
                                                    <option value={10}>10+ years</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {/* Portfolio */}
                                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-lg font-semibold text-gray-900">My Portfolio</h3>
                                        <button
                                            onClick={() => setOpenPortfolioForm(true)}
                                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                                        >
                                            <Plus className="h-4 w-4" />
                                            <span>Add Item</span>
                                        </button>
                                    </div>
                                    {/* grid */}
                                    <div className="grid md:grid-cols-2 gap-4">
                                        {portfolio.map((s) => (
                                            <div key={s.id} className="border border-gray-200 rounded-lg p-4">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center space-x-3">
                                                        <img src={s.image_url || "https://placehold.co/72x72"} alt={s.title || "Item"} className="w-16 h-16 object-cover rounded" />
                                                        <div>
                                                            <h4 className="font-medium text-gray-900">{s.title ?? "Item"}</h4>
                                                            <p className="text-xs text-gray-500">Order: {s.order ?? 0}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <button title="Preview" className="text-gray-400 hover:text-gray-600">
                                                            <Eye className="h-4 w-4" />
                                                        </button>
                                                        <button title="Delete" onClick={() => removePortfolio(s.id)} className="text-red-500 hover:text-red-600">
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="text-sm text-gray-500">{s.description ?? "No description"}</div>
                                            </div>
                                        ))}
                                        {!portfolio.length && <div className="text-sm text-gray-500">No portfolio items</div>}
                                    </div>
                                    {/* form modal */}
                                    {openPortfolioForm && (
                                        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
                                            <div className="bg-white rounded-xl p-6 w-full max-w-lg">
                                                <h4 className="text-lg font-semibold mb-4">Add Portfolio Item</h4>
                                                <form onSubmit={submitPortfolio} className="space-y-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                                                        <input value={pfTitle} onChange={(e) => setPfTitle(e.target.value)} className="w-full p-3 border rounded-lg" placeholder="e.g. Old Town Walk" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                                        <textarea value={pfDesc} onChange={(e) => setPfDesc(e.target.value)} className="w-full p-3 border rounded-lg" rows={3} placeholder="Short description…" />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
                                                            <input type="number" value={pfOrder} onChange={(e) => setPfOrder(Number(e.target.value))} className="w-full p-3 border rounded-lg" />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">Image *</label>
                                                            <input type="file" accept="image/*" onChange={onPickPortfolioImage} className="w-full p-2 border rounded-lg" />
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-end gap-3 pt-2">
                                                        <button type="button" onClick={() => setOpenPortfolioForm(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
                                                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg">Create</button>
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
                                    <h2 className="text-2xl font-bold text-gray-900">Earnings & Payments</h2>
                                    <button className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2">
                                        <Wallet className="h-4 w-4" />
                                        <span>Withdraw ${earnings.pending_payout}</span>
                                    </button>
                                </div>
                                <div className="grid md:grid-cols-4 gap-6">
                                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                                        <div className="flex items-center justify-between mb-4">
                                            <Wallet className="h-8 w-8 text-green-600" />
                                            <span className="text-xs text-green-600">+{earnings.growth_rate}%</span>
                                        </div>
                                        <h3 className="text-2xl font-bold text-gray-900">${earnings.total_balance}</h3>
                                        <p className="text-sm text-gray-600">Total Balance</p>
                                    </div>
                                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                                        <div className="flex items-center justify-between mb-4">
                                            <DollarSign className="h-8 w-8 text-blue-600" />
                                            <span className="text-xs text-blue-600">This month</span>
                                        </div>
                                        <h3 className="text-2xl font-bold text-gray-900">${earnings.this_month}</h3>
                                        <p className="text-sm text-gray-600">Monthly Earnings</p>
                                    </div>
                                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                                        <div className="flex items-center justify-between mb-4">
                                            <TrendingUp className="h-8 w-8 text-purple-600" />
                                            <span className="text-xs text-purple-600">Average</span>
                                        </div>
                                        <h3 className="text-2xl font-bold text-gray-900">${earnings.average_booking_value}</h3>
                                        <p className="text-sm text-gray-600">Per Booking</p>
                                    </div>
                                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                                        <div className="flex items-center justify-between mb-4">
                                            <Clock className="h-8 w-8 text-orange-600" />
                                            <span className="text-xs text-orange-600">Pending</span>
                                        </div>
                                        <h3 className="text-2xl font-bold text-gray-900">${earnings.pending_payout}</h3>
                                        <p className="text-sm text-gray-600">Available</p>
                                    </div>
                                </div>
                                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-lg font-semibold text-gray-900">Transaction History</h3>
                                        <button className="text-blue-600 hover:text-blue-700 flex items-center space-x-1">
                                            <Download className="h-4 w-4" />
                                            <span>Export</span>
                                        </button>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tourist</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                            </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                            {!transactions.length && (
                                                <tr><td colSpan={5} className="px-6 py-4 text-sm text-gray-500">No transactions</td></tr>
                                            )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
                        {activeTab === "reviews" && (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-2xl font-bold text-gray-900">My Reviews</h2>
                                    <button
                                        onClick={fetchMyReviews}
                                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                                    >
                                        Refresh
                                    </button>
                                </div>
                                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                                    {reviewsLoading ? (
                                        <div className="text-sm text-gray-500">Loading…</div>
                                    ) : reviewsErr ? (
                                        <div className="text-sm text-red-600">{reviewsErr}</div>
                                    ) : reviews.length ? (
                                        <div className="space-y-4">
                                            {reviews.map((r) => (
                                                <div key={r.id} className="p-4 rounded-lg border border-gray-200">
                                                    <div className="flex items-center justify-between">
                                                        <div className="font-semibold text-gray-900">
                                                            {(r.client?.first_name || "") + " " + (r.client?.last_name || "")}
                                                        </div>
                                                        <div className="text-yellow-600 font-medium">
                                                            {Number(r.overall_rating || 0).toFixed(1)}★
                                                        </div>
                                                    </div>
                                                    {r.title && <div className="mt-1 text-gray-800">{r.title}</div>}
                                                    {r.comment && <div className="mt-1 text-gray-600">{r.comment}</div>}
                                                    <div className="mt-2 text-xs text-gray-500">
                                                        {new Date(r.created_at).toLocaleString()}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-sm text-gray-500">No reviews yet</div>
                                    )}
                                </div>
                            </div>
                        )}
                        {/* ANALYTICS */}
                        {activeTab === "analytics" && (
                            <div className="space-y-6">
                                <h2 className="text-2xl font-bold text-gray-900">Analytics & Insights</h2>
                                <div className="grid md:grid-cols-4 gap-6">
                                    <StatCard icon={Users} title="Bookings This Week" value={analytics.bookings_this_week ?? 0} color="blue" />
                                    <StatCard icon={Calendar} title="Bookings This Month" value={analytics.bookings_this_month ?? 0} color="green" />
                                    <StatCard icon={Target} title="Completion Rate" value={`${customerMe?.completion_rate ?? 0}%`} color="purple" />
                                    <StatCard icon={Activity} title="Response Rate" value={`${customerMe?.response_rate ?? 0}%`} color="orange" />
                                </div>
                                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-6">Most Popular Services</h3>
                                    <div className="space-y-4">
                                        {!analytics.popular_services?.length && <div className="text-sm text-gray-500">No data</div>}
                                    </div>
                                </div>
                                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-6">Monthly Performance</h3>
                                    <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                                        <div className="text-center">
                                            <PieChart className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                                            <p className="text-gray-600">Performance analytics chart</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {/* SETTINGS */}
                        {activeTab === "settings" && (
                            <div className="space-y-6">
                                <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
                                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-6">Profile Picture</h3>
                                    <div className="flex items-center space-x-6">
                                        <div className="relative">
                                            <img
                                                src={uploadPreview || customerMe?.avatar_url || "https://placehold.co/96x96"}
                                                alt="Current profile"
                                                className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
                                            />
                                            <label className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-2 cursor-pointer hover:bg-blue-700 transition-colors">
                                                <Camera className="h-4 w-4 text-white" />
                                                <input type="file" accept="image/jpeg,image/png,image/gif" onChange={onPickAvatar} className="hidden" />
                                            </label>
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-medium text-gray-900 mb-2">Update your profile picture</h4>
                                            <p className="text-sm text-gray-600 mb-4">JPG, PNG, GIF • Max 5MB</p>
                                            <div className="flex flex-wrap gap-3">
                                                {uploadPreview && (
                                                    <button onClick={saveAvatar} disabled={isUploadingImage} className={`px-4 py-2 rounded-lg ${isUploadingImage ? "bg-gray-300" : "bg-green-600 hover:bg-green-700"} text-white`}>
                                                        {isUploadingImage ? "Uploading..." : "Upload Photo"}
                                                    </button>
                                                )}
                                                {(customerMe?.avatar_url || uploadPreview) && (
                                                    <button onClick={removeAvatar} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                                                        Remove Photo
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