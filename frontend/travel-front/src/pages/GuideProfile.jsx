import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    Calendar, MapPin, MessageCircle, Users,
    CheckCircle2, AlertCircle, ChevronLeft
} from "lucide-react";
import { getCustomer as getCustomerProfile, portfolioList } from "../api/profiles";
import { checkAvailabilityAuto } from "../api/bookings";
import api from "../api/api";

const UUID_RX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isUUID = (v) => UUID_RX.test(String(v || ""));

async function safeGet(url, { params, def = null } = {}) {
    try {
        const { data } = await api.get(url, { params });
        return data ?? def;
    } catch (e) {
        console.error("GET failed:", url, e?.response?.data || e?.message);
        return def;
    }
}

/** UUID → CustomerProfile PK resolver */
async function resolveCustomerPk(maybeId) {
    if (!maybeId) return null;
    const s = String(maybeId);
    if (/^\d+$/.test(s)) return s;

    const candidates = [
      `profiles/customers/${s}/`,                // ✅ birinchi
      `profiles/customers/by-user/${s}/`,
      `profiles/customers/user/${s}/`,
      // `profiles/customers/detail/${s}/`,      // ❌ olib tashlang (yoki oxiriga)
    ];


    let d = await safeGet(`profiles/customers/${encodeURIComponent(s)}/`);
    if (!d) d = await safeGet(`profiles/customers/by-user/${encodeURIComponent(s)}/`);
    if (!d) d = await safeGet(`profiles/customers/resolve/`, { params: { user: s } });

    const id = d?.id || d?.profile_id || null;
    return id ? String(id) : null;

    // resolver endpoint bo‘lsa:
    const tryResolveParam = async () =>
        safeGet(`profiles/customers/resolve/`, { params: { user: s }, def: null });

    for (const url of candidates) {
        const d =
            url.endsWith("/resolve/")
                ? await tryResolveParam()
                : await safeGet(url, { def: null });
        if (d) {
            const pk = d?.profile_id || d?.id;
            if (pk) return String(pk);
        }
    }
    return null;
}

export default function GuideProfile() {
    const { id } = useParams(); // user UUID (public)
    const navigate = useNavigate();

    const [guide, setGuide] = useState(null);
    const [portfolio, setPortfolio] = useState([]);
    const [loading, setLoading] = useState(Boolean(id));

    // Booking form
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [guests, setGuests] = useState(1);
    const [note, setNote] = useState("");

    const [checkingAvailability, setCheckingAvailability] = useState(false);
    const [availabilityOk, setAvailabilityOk] = useState(null);
    const [creating, setCreating] = useState(false);
    const [result, setResult] = useState({ ok: null, msg: "" });

    const [customerPk, setCustomerPk] = useState(null)

    useEffect(() => {
        if (!id || !isUUID(id)) {
            setGuide(null);
            setLoading(false);
            return;
        }
        (async () => {
            setLoading(true);
            try {
                // 1. Public profilni olish
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

                // 2. UUID → portfolio chaqiruvi
                if (guideData?.user_id) {
                    const pRes = await portfolioList({ customer: guideData.user_id }).catch(() => ({ results: [] }));
                    setPortfolio(
                        Array.isArray(pRes?.results) ? pRes.results : Array.isArray(pRes) ? pRes : []
                    );
                } else {
                    setPortfolio([]);
                }
            } finally {
                setLoading(false);
            }
        })();
    }, [id]);


    const fullName = useMemo(
        () => guide?.user_full_name || guide?.full_name || "Guide",
        [guide]
    );
    const locationText = useMemo(
        () => guide?.city_name || guide?.country_name || guide?.city || "—",
        [guide]
    );
    const languageText = useMemo(
        () => (guide?.languages || []).map((l) => l.name).join(", "),
        [guide]
    );

    const bookingTargetId = isUUID(id) ? id : (isUUID(guide?.user_id) ? guide.user_id : null);
    const canBook = Boolean(bookingTargetId);
    const openChat = () => navigate(`/chat?user=${encodeURIComponent(String(id))}`);

    const handleCheckAvailability = async () => {
        let pk = customerPk;
        if (!pk) {
            pk = await resolveCustomerPk(id); // user UUID -> profile ID
            setCustomerPk(pk);
        }
        if (!pk) return alert("Guide profile not resolved yet.");
        if (!startDate || !endDate) return alert("Choose start and end dates first.");

        setCheckingAvailability(true);
        try {
            const { ok } = await checkAvailabilityAuto({
                customer: String(pk),
                start_date: startDate,
                end_date: endDate,
            });
            setAvailabilityOk(ok);
            alert(ok ? "Guide is available for these dates." : "Guide is not available for these dates.");
        } catch {
            alert("Failed to check availability.");
        } finally {
            setCheckingAvailability(false);
        }
    };

    const submitBooking = async (e) => {
        e.preventDefault();
        if (!canBook) {
            setResult({ ok: false, msg: "Guide ID aniqlanmadi. Sahifani yangilang yoki qayta urinib ko‘ring." });
            return;
        }
        if (!startDate || !endDate) {
            setResult({ ok: false, msg: "Please select start and end dates" });
            return;
        }
        if (new Date(startDate) > new Date(endDate)) {
            setResult({ ok: false, msg: "End date must be after start date" });
            return;
        }
        if (availabilityOk === false) {
            setResult({ ok: false, msg: "Guide is not available. Please check availability first." });
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

        // ✅ Har doim PK bilan booking sahifasiga
        // navigate(`/booking/${encodeURIComponent(bookingTargetId)}?${params.toString()}`);

        const profileId = await resolveCustomerPk(bookingTargetId);  // user UUID -> profile UUID
        if (!profileId) {
          setResult({ ok: false, msg: "Guide profile not resolved yet." });
          return;
        }
        navigate(`/booking/${encodeURIComponent(profileId)}?${params.toString()}`);

        setCreating(false);
        setResult({ ok: true, msg: "Redirecting to booking form…" });
    };

    if (loading)
        return <div className="min-h-screen grid place-items-center text-gray-600">Loading…</div>;
    if (!guide)
        return <div className="min-h-screen grid place-items-center text-gray-600">Guide not found</div>;

    return (
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
            <button
                onClick={() => navigate("/search")}
                className="inline-flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
            >
                <ChevronLeft className="h-4 w-4" /> Back to results
            </button>

            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                <img
                    src={guide?.avatar_url || guide?.user?.avatar_url || "https://placehold.co/120"}
                    alt="avatar"
                    className="w-24 h-24 rounded-full object-cover border"
                />
                <div className="flex-1">
                    <h1 className="text-3xl font-bold">{fullName}</h1>
                    <div className="mt-1 text-gray-600 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-4 w-4" />
                {locationText}
            </span>
                        {!!guide?.average_rating && (
                            <span className="text-yellow-600 font-medium">
                {Number(guide.average_rating).toFixed(1)}★
              </span>
                        )}
                        {!!guide?.total_reviews && (
                            <span className="text-gray-500">{guide.total_reviews} reviews</span>
                        )}
                    </div>
                    {!!languageText && <div className="text-sm text-gray-600 mt-1">{languageText}</div>}
                    <div className="mt-3">
                        <button
                            onClick={openChat}
                            className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
                        >
                            <MessageCircle className="h-4 w-4" /> Chat with {guide?.first_name || "guide"}
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg border p-5">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Book this guide</h2>
                    {guide?.is_available === false && (
                        <span className="text-sm text-red-600">Currently unavailable</span>
                    )}
                </div>
                <form onSubmit={submitBooking} className="grid md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start date</label>
                        <div className="relative">
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                required
                            />
                            <Calendar className="h-4 w-4 text-gray-400 absolute right-3 top-3.5" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">End date</label>
                        <div className="relative">
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                required
                            />
                            <Calendar className="h-4 w-4 text-gray-400 absolute right-3 top-3.5" />
                        </div>
                    </div>
                    <div>
                        <button
                            type="button"
                            onClick={handleCheckAvailability}
                            disabled={checkingAvailability}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            {checkingAvailability ? "Checking..." : "Check Availability"}
                        </button>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Guests</label>
                        <div className="relative">
                            <input
                                type="number"
                                min={1}
                                value={guests}
                                onChange={(e) => setGuests(Number(e.target.value) || 1)}
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                required
                            />
                            <Users className="h-4 w-4 text-gray-400 absolute right-3 top-3.5" />
                        </div>
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Message to the guide (optional)
                        </label>
                        <textarea
                            rows={4}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Tell a bit about your plan, preferences, schedule…"
                        />
                    </div>
                    {result.ok === true && (
                        <div className="md:col-span-2 flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
                            <CheckCircle2 className="h-5 w-5" />
                            <span>{result.msg}</span>
                        </div>
                    )}
                    {result.ok === false && (
                        <div className="md:col-span-2 flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                            <AlertCircle className="h-5 w-5" />
                            <span>{result.msg}</span>
                        </div>
                    )}
                    <div className="md:col-span-2">
                        <button
                            type="submit"
                            disabled={creating || availabilityOk === false || !canBook}
                            className={`px-5 py-3 rounded-lg text-white transition-colors ${
                                creating ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                            }`}
                        >
                            {creating ? "Preparing…" : "Request booking"}
                        </button>
                    </div>
                </form>
            </div>

            <div className="bg-white rounded-lg border p-5">
                <div className="font-semibold mb-2">Portfolio</div>
                <div className="grid gap-4">
                    {portfolio.map((item) => (
                        <div key={item.id} className="border rounded-lg p-4">
                            {item.image_url && (
                                <img
                                    src={item.image_url}
                                    alt={item.title}
                                    className="w-full h-32 object-cover rounded-lg mb-2"
                                />
                            )}
                            <h3 className="font-semibold">{item.title}</h3>
                            <p className="text-sm text-gray-600">{item.description}</p>
                        </div>
                    ))}
                    {!portfolio?.length && <div className="text-sm text-gray-500">No portfolio items</div>}
                </div>
            </div>
        </div>
    );
}
