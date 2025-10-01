// src/pages/TouristDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    Calendar, Clock, MapPin, Users, MessageCircle, Search,
    ChevronLeft, ChevronRight, XCircle, RefreshCw,
    User as UserIcon, Save, Trash, Camera, CheckCircle
} from "lucide-react";
import api from "../api/api";
import { getMe, patchMe } from "../api/users";
import { getMyClientProfile, uploadMyClientAvatar, deleteMyClientAvatar } from "../api/profiles";
import { actOnBooking } from "../api/bookings";
import * as chatApi from "../api/chat";

const BOOKINGS_URL = "bookings/bookings/";

async function safeGet(url, { params } = {}) {
    try {
        const { data } = await api.get(url, { params });
        return data ?? null;
    } catch (e) {
        console.error("GET failed:", url, e.response?.data || e.message);
        return null;
    }
}

/** UUID yoki har qanday identifikatordan CustomerProfile PK (raqamli string) ni aniqlash */
async function resolveCustomerPk(maybeId) {
    if (!maybeId) return null;
    const s = String(maybeId);
    if (/^\d+$/.test(s)) return s; // allaqachon raqam
    // UUID bo‘lsa — 2 ta ehtimoliy endpoint orqali profilni olib, PK ni qaytaramiz
    // const d1 = await safeGet(`profiles/customers/detail/${encodeURIComponent(s)}/`, { def: null });
    // const d = d1 || (await safeGet(`profiles/customers/${encodeURIComponent(s)}/`, { def: null }));

    // 1) To‘g‘ri publika endpoint (user UUID bilan)
    let d = await safeGet(`profiles/customers/${encodeURIComponent(s)}/`, { def: null });
    // 2) Agar bo‘lsa: by-user/ yoki resolve/?user=
    if (!d) d = await safeGet(`profiles/customers/by-user/${encodeURIComponent(s)}/`, { def: null });
    if (!d) d = await safeGet(`profiles/customers/resolve/`, { params: { user: s }, def: null });
    // (ixtiyoriy) 3) Nihoyat: eski noto‘g‘ri fallbackni butunlay olib tashla yoki oxiriga qoldir:
    // if (!d) d = await safeGet(`profiles/customers/detail/${encodeURIComponent(s)}/`, { def: null });


    // ✅ faqat ID (UUID) ni ustun qo'yamiz
    const id = d?.id || d?.profile_id;
    return id ? String(id) : null;
}

function normalizeBooking(b) {
    const status = (b?.status || b?.status_display || "pending").toString().toLowerCase();
    const cp = b?.customer_profile || {};
    const cpUser = cp?.user || {};

    const customerUserId =
        cpUser?.id ||
        b?.customer_profile_user ||
        b?.customer_user ||
        b?.customer ||
        b?.customer_id ||
        null;

    const customerProfileId =
        cp?.id ||
        b?.customer_profile_id ||
        (typeof b?.customer_profile === "string" ? b.customer_profile : null) ||
        null;

    const avatar =
        b?.customer_avatar ||
        b?.guide?.avatar_url ||
        b?.provider_avatar ||
        cp?.avatar_url ||
        cpUser?.avatar_url ||
        b?.customer_avatar_url ||
        null;

    const customerName =
        b?.customer_name ||
        cpUser?.full_name ||
        cp?.full_name ||
        (cpUser?.first_name && cpUser?.last_name ? `${cpUser.first_name} ${cpUser.last_name}` : "") ||
        "";

    return {
        id: b?.id, // Booking PK (UUID)
        title: b?.title || b?.service_name || "Booking",
        status,
        status_display: b?.status_display || (status[0]?.toUpperCase() + status.slice(1)),
        date: b?.date || b?.start_date || b?.start || b?.start_datetime?.slice(0, 10) || "—",
        time: b?.time || b?.start_time || (b?.start_datetime
            ? new Date(b.start_datetime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : ""),
        end_date: b?.end_date || b?.end || "—",
        guests: Number(b?.guests || b?.guest_count || b?.number_of_people || 0),
        duration: Number(b?.duration_hours || b?.duration || 0),
        price: b?.price || b?.amount || b?.total_price || 0,
        city: b?.city_name || b?.city || b?.location || "",
        // 🔑 biz ishlatadigan maydonlar:
        customer_user: customerUserId,           // chat uchun USER UUID (bo‘lsa)
        customer_profile_id: customerProfileId,  // review/book-again uchun PROFILE PK
        customer_name: customerName,
        customer_avatar: avatar,
    };
}

function statusBadgeClass(status) {
    const s = (status || "").toLowerCase();
    if (s === "pending") return "bg-yellow-100 text-yellow-700";
    if (s === "accepted" || s === "confirmed") return "bg-blue-100 text-blue-700";
    if (s === "completed") return "bg-green-100 text-green-700";
    if (s === "cancelled" || s === "canceled" || s === "rejected") return "bg-red-100 text-red-700";
    return "bg-gray-100 text-gray-700";
}

function BookingCard({ item, onCancel, onComplete, onOpenChat, onBookAgain, onWriteReview }) {
    const isConfirmed = ["accepted", "confirmed"].includes(String(item.status).toLowerCase());
    const isCompleted = String(item.status).toLowerCase() === "completed";
    return (
        <div className="bg-white border rounded-lg p-4">
            <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                    <img
                        src={item.customer_avatar || "https://placehold.co/64x64"}
                        alt={item.customer_name || "Guide"}
                        className="w-12 h-12 rounded-lg object-cover"
                    />
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900">{item.title}</h3>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadgeClass(item.status)}`}>
                {item.status_display}
              </span>
                        </div>
                        <div className="mt-1 text-sm text-gray-600 flex flex-wrap gap-4">
                            <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>{item.date}</span>
                                {item.time && <span>• {item.time}</span>}
                            </div>
                            {!!item.duration && (
                                <div className="flex items-center gap-1">
                                    <Clock className="h-4 w-4" />
                                    <span>{item.duration} h</span>
                                </div>
                            )}
                            {!!item.guests && (
                                <div className="flex items-center gap-1">
                                    <Users className="h-4 w-4" />
                                    <span>{item.guests} guest(s)</span>
                                </div>
                            )}
                            {item.city && (
                                <div className="flex items-center gap-1">
                                    <MapPin className="h-4 w-4" />
                                    <span>{item.city}</span>
                                </div>
                            )}
                            {!!item.price && <div className="font-medium">${item.price}</div>}
                        </div>
                        {item.customer_name && (
                            <div className="text-sm text-gray-500 mt-1">Guide: {item.customer_name}</div>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {item.customer_user && (
                        <button
                            onClick={() => onOpenChat(item.customer_user)}
                            className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 flex items-center gap-1"
                            title="Open chat"
                        >
                            <MessageCircle className="h-4 w-4" />
                            Chat
                        </button>
                    )}
                    {item.customer_user && (
                        <button
                            onClick={() => onBookAgain(item.customer_user)}
                            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            title="Book again"
                        >
                            Book again
                        </button>
                    )}
                    {["pending", "accepted", "confirmed"].includes((item.status || "").toLowerCase()) && (
                        <button
                            onClick={() => onCancel(item.id)}
                            className="px-3 py-1.5 text-sm border border-red-600 text-red-600 rounded-lg hover:bg-red-50"
                            title="Cancel booking"
                        >
                            Cancel
                        </button>
                    )}
                    {isConfirmed && (
                        <button
                            onClick={() => onComplete(item.id)}
                            className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                            title="Mark as complete"
                        >
                            Complete
                        </button>
                    )}
                    {isCompleted && item.customer_profile_id && (
                        <button
                            onClick={() => onWriteReview(item)}
                            className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50"
                            title="Write review"
                        >
                            Write review
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function TouristDashboard() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState("bookings");

    /** BOOKINGS */
    const [loading, setLoading] = useState(true);
    const [list, setList] = useState([]);
    const [pageInfo, setPageInfo] = useState({ next: null, previous: null, count: 0, page: 1 });
    const [cancelingId, setCancelingId] = useState(null);
    const [completingId, setCompletingId] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);

    const loadBookings = async (page = 1) => {
        setLoading(true);
        try {
            const params = { as: "client", page };
            const data = await safeGet(BOOKINGS_URL, { params });
            let items = [], next = null, previous = null, count = 0;
            if (Array.isArray(data)) {
                items = data;
            } else if (data && Array.isArray(data.results)) {
                items = data.results; next = data.next || null; previous = data.previous || null; count = Number(data.count || 0);
            }
            setList(items.map(normalizeBooking));
            setPageInfo({ next, previous, count, page });
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => { loadBookings(1); }, [refreshKey]);

    const upcoming = useMemo(
        () => list.filter((b) => ["pending", "accepted"].includes((b.status || "").toLowerCase())),
        [list]
    );
    const past = useMemo(
        () => list.filter((b) => ["completed", "cancelled", "canceled", "rejected"].includes((b.status || "").toLowerCase())),
        [list]
    );

    const handleCancel = async (id) => {
        if (!id) return;
        if (!window.confirm("Cancel this booking?")) return;
        setCancelingId(id);
        const ok = await actOnBooking(id, "cancel");
        setCancelingId(null);
        if (ok) {
            setList((xs) => xs.map((b) => (b.id === id ? { ...b, status: "cancelled", status_display: "Cancelled" } : b)));
        } else {
            alert("Failed to cancel booking");
        }
    };

    const handleComplete = async (id) => {
        if (!id) return;
        if (!window.confirm("Mark this booking as complete?")) return;
        setCompletingId(id);
        const ok = await actOnBooking(id, "complete");
        setCompletingId(null);
        if (ok) {
            setList((xs) => xs.map((b) => (b.id === id ? { ...b, status: "completed", status_display: "Completed" } : b)));
        } else {
            alert("Failed to complete booking");
        }
    };

    const openChatWithGuide = async (customerUserId) => {
        try {
            navigate(`/chat?user=${customerUserId}`);
            const res = await chatApi.createConversation({
                user_id: String(customerUserId),
                message: "Hello!",
            }).then(r => r?.data ?? r);
            if (res?.id) return navigate(`/chat?c=${res.id}`);
            // fallback: agar backend "mavjud" conv ID qaytarmasa
            navigate(`/chat?user=${customerUserId}`);
        } catch {
            alert("Failed to open chat");
        }
    };

    /*** 🔧 TUZATILDI: Endi har doim CustomerProfile PK bilan /booking/:pk ga o‘tamiz ***/
    const bookAgain = async (item) => {
        const pk = item?.customer_profile_id;
        if (!pk) return alert("Could not resolve guide profile");
        navigate(`/booking/${encodeURIComponent(pk)}`);
    };


    // Completed booking → BookingPage (review)
    const openWriteReview = (item) => {
        const bookingId = item?.id;
        const profilePk = item?.customer_profile_id;
        if (!bookingId || !profilePk) {
            alert("Could not resolve review target");
            return;
        }
        navigate(`/booking/${encodeURIComponent(profilePk)}?booking_id=${encodeURIComponent(String(bookingId))}`);
    };

    const goSearch = () => navigate("/search");

    /** PROFILE (user + client profile/avatar) */
    const [meForm, setMeForm] = useState({ first_name: "", last_name: "", email: "", phone: "" });
    const [savingMe, setSavingMe] = useState(false);
    const [clientProfile, setClientProfile] = useState(null);
    const [uploadPreview, setUploadPreview] = useState(null);
    const [uploadFile, setUploadFile] = useState(null);
    const [isUploadingImage, setIsUploadingImage] = useState(false);

    const loadProfileBundle = async () => {
        const meRes = await getMe().catch(() => ({ data: null }));
        const me = meRes?.data ?? meRes;
        setMeForm({
            first_name: me?.first_name || "",
            last_name: me?.last_name || "",
            email: me?.email || "",
            phone: me?.phone || me?.phone_number || "",
        });
        const cpRes = await getMyClientProfile().catch(() => ({ data: null }));
        const cp = cpRes?.data ?? cpRes;
        setClientProfile(cp);
    };

    const saveMe = async () => {
        setSavingMe(true);
        const ok = await patchMe({
            first_name: meForm.first_name || "",
            last_name: meForm.last_name || "",
            phone: meForm.phone || undefined,
        });
        setSavingMe(false);
        if (ok) {
            await loadProfileBundle();
            alert("Profile saved");
        } else {
            alert("Failed to save profile");
        }
    };

    const onPickAvatar = (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        if (f.size > 5 * 1024 * 1024) return alert("Max 5MB");
        if (!/^image\/(jpeg|png|gif|webp)$/.test(f.type)) return alert("JPG/PNG/GIF/WEBP tanlang");
        setUploadFile(f);
        const reader = new FileReader();
        reader.onload = (ev) => setUploadPreview(ev?.target?.result || null);
        reader.readAsDataURL(f);
    };

    const saveAvatar = async () => {
        if (!uploadFile) return;
        setIsUploadingImage(true);
        try {
            await uploadMyClientAvatar(uploadFile);
            await loadProfileBundle();
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
        try {
            await deleteMyClientAvatar();
            await loadProfileBundle();
            setUploadFile(null);
            setUploadPreview(null);
            alert("Avatar removed");
        } catch {
            alert("Failed to remove avatar");
        }
    };

    useEffect(() => {
        if (activeTab === "profile") loadProfileBundle();
    }, [activeTab]);

    /** UI */
    if (loading && activeTab === "bookings") {
        return (
            <div className="min-h-screen bg-gray-50 pt-16 grid place-items-center text-gray-600">
                Loading…
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pt-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Dashboard</h1>
                        <p className="text-gray-600">Manage your bookings and profile</p>
                    </div>
                    {activeTab === "bookings" && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setRefreshKey((k) => k + 1)}
                                className="px-3 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2"
                                title="Refresh"
                            >
                                <RefreshCw className="h-4 w-4" />
                                Refresh
                            </button>
                            <button
                                onClick={() => navigate("/search")}
                                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                            >
                                <Search className="h-4 w-4" />
                                Find Guides
                            </button>
                        </div>
                    )}
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200 mb-8">
                    <nav className="-mb-px flex space-x-8">
                        {[
                            { id: "bookings", label: "My Bookings" },
                            { id: "profile", label: "Profile" },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                                    activeTab === tab.id
                                        ? "border-blue-500 text-blue-600"
                                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* ---------- BOOKINGS ---------- */}
                {activeTab === "bookings" && (
                    <div className="space-y-10">
                        {/* Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-4">
                            <div className="bg-white rounded-xl p-6 shadow-sm">
                                <div className="text-sm text-gray-600">Upcoming Bookings</div>
                                <div className="text-2xl font-bold text-gray-900">{upcoming.length}</div>
                            </div>
                            <div className="bg-white rounded-xl p-6 shadow-sm">
                                <div className="text-sm text-gray-600">Past Bookings</div>
                                <div className="text-2xl font-bold text-gray-900">{past.length}</div>
                            </div>
                            <div className="bg-white rounded-xl p-6 shadow-sm">
                                <div className="text-sm text-gray-600">Total</div>
                                <div className="text-2xl font-bold text-gray-900">{list.length}</div>
                            </div>
                            <div className="bg-white rounded-xl p-6 shadow-sm">
                                <div className="text-sm text-gray-600">Status</div>
                                <div className="text-2xl font-bold text-gray-900">OK</div>
                            </div>
                        </div>

                        {/* Upcoming */}
                        <section>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-gray-900">Upcoming Bookings</h2>
                                {pageInfo?.count ? (
                                    <div className="text-sm text-gray-500">
                                        Page {pageInfo.page} {pageInfo.count ? `• Total ${pageInfo.count}` : ""}
                                    </div>
                                ) : null}
                            </div>
                            {upcoming.length ? (
                                <div className="grid gap-4">
                                    {upcoming.map((b) => (
                                        <BookingCard
                                            key={b.id}
                                            item={b}
                                            onCancel={handleCancel}
                                            onComplete={handleComplete}
                                            onOpenChat={() => openChatWithGuide(b.customer_user)}
                                            onBookAgain={() => bookAgain(b)}           // <-- item b
                                            onWriteReview={openWriteReview}  // <-- <-- item b
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-white border rounded-lg p-6 text-gray-600">
                                    No upcoming bookings.{" "}
                                    <button onClick={goSearch} className="text-blue-600 hover:underline">
                                        Find a guide
                                    </button>{" "}
                                    and plan your next tour!
                                </div>
                            )}
                        </section>

                        {/* Past */}
                        <section>
                            <h2 className="text-xl font-bold text-gray-900 mb-4">Past Bookings</h2>
                            {past.length ? (
                                <div className="grid gap-4">
                                    {past.map((b) => (
                                        <BookingCard
                                            key={b.id}
                                            item={b}
                                            onCancel={handleCancel}
                                            onComplete={handleComplete}
                                            onOpenChat={() => openChatWithGuide(b.customer_user)}
                                            onBookAgain={() => bookAgain(b)}           // <- item b
                                            onWriteReview={() => openWriteReview(b)}   // <- item b
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-white border rounded-lg p-6 text-gray-600">No past bookings</div>
                            )}
                        </section>

                        {/* Pagination */}
                        {(pageInfo.previous || pageInfo.next) && (
                            <div className="flex items-center justify-center gap-3">
                                <button
                                    disabled={!pageInfo.previous}
                                    onClick={() => loadBookings(Math.max(1, pageInfo.page - 1))}
                                    className="px-3 py-2 border rounded-lg disabled:opacity-50 flex items-center gap-1"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    Prev
                                </button>
                                <span className="text-sm text-gray-600">Page {pageInfo.page}</span>
                                <button
                                    disabled={!pageInfo.next}
                                    onClick={() => loadBookings(pageInfo.page + 1)}
                                    className="px-3 py-2 border rounded-lg disabled:opacity-50 flex items-center gap-1"
                                >
                                    Next
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* ---------- PROFILE ---------- */}
                {activeTab === "profile" && (
                    <div className="bg-white rounded-lg p-6 border max-w-3xl">
                        <div className="flex items-center gap-3 mb-6">
                            <UserIcon className="h-5 w-5 text-gray-500" />
                            <h2 className="text-lg font-semibold">Profile</h2>
                        </div>

                        {/* Avatar */}
                        <div className="flex items-start gap-4 mb-6">
                            <div className="relative">
                                <img
                                    src={uploadPreview || clientProfile?.avatar_url || "https://placehold.co/96x96"}
                                    alt="avatar"
                                    className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
                                />
                                <label className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-2 cursor-pointer hover:bg-blue-700 transition-colors">
                                    <Camera className="h-4 w-4 text-white" />
                                    <input type="file" accept="image/*" onChange={onPickAvatar} className="hidden" />
                                </label>
                            </div>
                            <div className="flex-1">
                                <div className="text-sm text-gray-600 mb-2">JPG, PNG, GIF, WEBP • Max 5MB</div>
                                <div className="flex flex-wrap gap-3">
                                    {uploadPreview && (
                                        <button
                                            onClick={saveAvatar}
                                            disabled={isUploadingImage}
                                            className={`px-4 py-2 rounded-lg text-white ${isUploadingImage ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"}`}
                                        >
                                            {isUploadingImage ? "Uploading..." : "Upload Photo"}
                                        </button>
                                    )}
                                    {(clientProfile?.avatar_url || uploadPreview) && (
                                        <button
                                            onClick={removeAvatar}
                                            className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2"
                                        >
                                            <Trash className="h-4 w-4" />
                                            Remove Photo
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* User fields */}
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-gray-700 mb-1">First name</label>
                                <input
                                    type="text"
                                    value={meForm.first_name}
                                    onChange={(e) => setMeForm((x) => ({ ...x, first_name: e.target.value }))}
                                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-700 mb-1">Last name</label>
                                <input
                                    type="text"
                                    value={meForm.last_name}
                                    onChange={(e) => setMeForm((x) => ({ ...x, last_name: e.target.value }))}
                                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-700 mb-1">Email (readonly)</label>
                                <input
                                    type="email"
                                    readOnly
                                    value={meForm.email}
                                    className="w-full p-3 border rounded-lg bg-gray-50 text-gray-600"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-700 mb-1">Phone</label>
                                <input
                                    type="tel"
                                    value={meForm.phone}
                                    onChange={(e) => setMeForm((x) => ({ ...x, phone: e.target.value }))}
                                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end mt-6">
                            <button
                                onClick={saveMe}
                                disabled={savingMe}
                                className={`px-4 py-2 rounded-lg text-white flex items-center gap-2 ${
                                    savingMe ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
                                }`}
                            >
                                <Save className="h-4 w-4" />
                                {savingMe ? "Saving…" : "Save changes"}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Cancel overlay */}
            {cancelingId && (
                <div className="fixed inset-0 bg-black/30 grid place-items-center z-50">
                    <div className="bg-white px-6 py-4 rounded-xl shadow-md flex items-center gap-3">
                        <XCircle className="h-5 w-5 text-red-600" />
                        <span className="text-sm">Cancelling booking…</span>
                    </div>
                </div>
            )}
            {/* Complete overlay */}
            {completingId && (
                <div className="fixed inset-0 bg-black/30 grid place-items-center z-50">
                    <div className="bg-white px-6 py-4 rounded-xl shadow-md flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="text-sm">Completing booking…</span>
                    </div>
                </div>
            )}
        </div>
    );
}