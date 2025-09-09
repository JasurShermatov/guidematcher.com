// src/account/UserAccount.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    FiUser, FiMail, FiImage, FiMapPin, FiSearch, FiCalendar,
    FiSend, FiStar, FiUpload, FiSave, FiX, FiMessageSquare, FiShield
} from "react-icons/fi";
import api from "./api";
import ChatWidgets from "./ChatWidgets";
import './UserAccount.css';

const Tab = {
    PROFILE: "profile",
    SEARCH: "search",
    BOOKINGS: "bookings",
};

/* ---------- Avatar helperlar (Header dagi yondashuv bilan mos) ---------- */
const API_BASE = (process.env.REACT_APP_API_URL || "http://localhost:8000/api/v1/").replace(/\/+$/, "");
const BACKEND_ORIGIN = API_BASE.replace(/\/api\/v1\/?$/, ""); // http://localhost:8000

const toAbsMedia = (url) => {
    if (!url) return "/placeholder-avatar.png";
    if (/^https?:\/\//i.test(url)) return url;
    if (url.startsWith("/media")) return BACKEND_ORIGIN + url;
    if (url.startsWith("media/")) return `${BACKEND_ORIGIN}/${url}`;
    return url;
};

// CLIENT (user->client profile) avatarini GET orqali olish
const fetchClientAvatarUrl = async (userId) => {
    try {
        const { data } = await api.get(`profiles/clients/${userId}/avatar/`);
        return data?.avatar_url || null;
    } catch {
        return null;
    }
};

export default function UserAccount() {
    const { t } = useTranslation();
    const [tab, setTab] = useState(Tab.PROFILE);

    const [initialLoading, setInitialLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Profile (Client)
    const [profile, setProfile] = useState(null);
    const [avatarFile, setAvatarFile] = useState(null);
    const avatarRef = useRef();
    const [avatarUrl, setAvatarUrl] = useState(null); // 🔵 ko‘rsatiladigan avatar url

    // User (for names update via /auth/users/me)
    const [userData, setUserData] = useState(null);

    // Master data
    const [countries, setCountries] = useState([]);
    const [cities, setCities] = useState([]);

    // Search
    const [filters, setFilters] = useState({ country: "", city: "", rating: "" });
    const [guides, setGuides] = useState([]);
    const [searching, setSearching] = useState(false);

    const [saveSuccess, setSaveSuccess] = useState(false);

    // Booking modal
    const [bookingModalOpen, setBookingModalOpen] = useState(false);
    const [selectedGuide, setSelectedGuide] = useState(null);
    const [bookingForm, setBookingForm] = useState({
        title: "",
        description: "",
        country: "",
        city: "",
        start_date: "",
        end_date: "",
    });
    const [bookingSubmitting, setBookingSubmitting] = useState(false);

    // My bookings (as client)
    const [bookings, setBookings] = useState([]);

    // Review modal
    const [reviewOpen, setReviewOpen] = useState(false);
    const [reviewBooking, setReviewBooking] = useState(null);
    const [reviewForm, setReviewForm] = useState({
        overall_rating: 5,
        title: "",
        comment: "",
        communication_rating: 5,
        service_rating: 5,
        punctuality_rating: 5,
        value_rating: 5,
    });
    const [reviewSubmitting, setReviewSubmitting] = useState(false);

    // Chat modal
    const [chatOpen, setChatOpen] = useState(false);
    const [chatPeerEmail, setChatPeerEmail] = useState(null);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const [countriesRes, citiesRes, myClientRes, meUserRes] = await Promise.all([
                    api.get("common/countries/"),
                    api.get("common/cities/"),
                    api.get("profiles/clients/my/"),
                    api.get("auth/users/me/"),
                ]);
                if (!mounted) return;

                setCountries(countriesRes.data?.results || countriesRes.data || []);
                setCities(citiesRes.data?.results || citiesRes.data || []);
                setProfile(myClientRes.data);
                setUserData(meUserRes.data);

                // avatar URL ni alohida GET orqali oling
                const uid = myClientRes?.data?.user?.id;
                if (uid) {
                    const url = await fetchClientAvatarUrl(uid);
                    setAvatarUrl(url);
                }

                const myBookings = await api.get("bookings/bookings/");
                setBookings(myBookings.data?.results || myBookings.data || []);
            } catch (e) {
                console.error(e);
            } finally {
                if (mounted) setInitialLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, []);

    // ------- PROFILE -------
    const avatarSrc = toAbsMedia(
        avatarUrl ||
        profile?.avatar_url ||
        profile?.avatar ||
        profile?.user?.avatar_url ||
        profile?.user?.avatar
    );

    const saveProfile = async () => {
        setSaving(true);
        try {
            // 1) User names
            if (userData?.id) {
                await api.patch(`auth/users/${"me"}/`, {
                    first_name: userData.first_name,
                    last_name: userData.last_name,
                });
            }
            // 2) Avatar (FormData)
            if (avatarFile && profile?.user?.id) {
                const fd = new FormData();
                fd.append("avatar", avatarFile);
                await api.put(
                    `profiles/clients/${profile.user.id}/avatar/`,
                    fd,
                    { headers: { "Content-Type": "multipart/form-data" } } // 415 oldini oladi
                );
            }

            const [refProfile, refUser] = await Promise.all([
                api.get("profiles/clients/my/"),
                api.get("auth/users/me/"),
            ]);
            setProfile(refProfile.data);
            setUserData(refUser.data);

            // avatar GET orqali yangilansin:
            if (refProfile?.data?.user?.id) {
                const fresh = await fetchClientAvatarUrl(refProfile.data.user.id);
                setAvatarUrl(fresh);
            }

            setAvatarFile(null);
            if (avatarRef.current) avatarRef.current.value = "";

            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (e) {
            console.error(e);
            alert(t("action_failed"));
        } finally {
            setSaving(false);
        }
    };

    // Password via accounts/forgot-password → reset-password
    const [pwOpen, setPwOpen] = useState(false);
    const [pwEmailSent, setPwEmailSent] = useState(false);
    const [pwForm, setPwForm] = useState({ code: "", new_password: "" });

    const sendResetCode = async () => {
        try {
            await api.post("accounts/forgot-password/", { email: userData?.email });
            setPwEmailSent(true);
        } catch (e) {
            console.error(e);
            setPwEmailSent(false);
        }
    };
    const confirmReset = async () => {
        try {
            await api.post("accounts/reset-password/", {
                email: userData?.email,
                code: pwForm.code,
                new_password: pwForm.new_password,
            });
            setPwOpen(false);
            setPwEmailSent(false);
            setPwForm({ code: "", new_password: "" });
            alert(t("password_changed"));
        } catch (e) {
            console.error(e);
            alert(t("password_change_failed"));
        }
    };

    // ------- SEARCH & BOOK -------
    const doSearchGuides = async (e) => {
        e?.preventDefault?.();
        setSearching(true);
        try {
            const res = await api.get("profiles/customers/");
            let items = res.data?.results || res.data || [];
            if (filters.country) {
                items = items.filter((g) => (g.country_name || "").toLowerCase().includes(filters.country.toLowerCase()));
            }
            if (filters.city) {
                items = items.filter((g) => (g.city_name || "").toLowerCase().includes(filters.city.toLowerCase()));
            }
            if (filters.rating) {
                items = items.filter((g) => Number(g.average_rating || 0) >= Number(filters.rating));
            }
            setGuides(items);
        } catch (e) {
            console.error(e);
        } finally {
            setSearching(false);
        }
    };

    const openBooking = (guide) => {
        setSelectedGuide(guide);
        setBookingForm({
            title: "",
            description: "",
            country: guide.country_name || "",
            city: guide.city_name || "",
            start_date: "",
            end_date: "",
        });
        setBookingModalOpen(true);
    };

    const submitBooking = async () => {
        if (!selectedGuide) return;
        setBookingSubmitting(true);
        try {
            const payload = {
                customer_profile: selectedGuide.id,
                title: bookingForm.title,
                description: bookingForm.description,
                country: bookingForm.country,
                city: bookingForm.city,
                start_date: bookingForm.start_date,
                end_date: bookingForm.end_date,
            };
            await api.post("bookings/bookings/", payload);
            setBookingModalOpen(false);
            setSelectedGuide(null);
            alert(t("booking_request_sent"));
            const myBookings = await api.get("bookings/bookings/");
            setBookings(myBookings.data?.results || myBookings.data || []);
        } catch (e) {
            console.error(e);
            alert(t("booking_failed") + ": " + (e?.message || "Server error"));
        } finally {
            setBookingSubmitting(false);
        }
    };

    // ------- MY BOOKINGS -------
    const cancelBooking = async (b) => {
        try {
            // Modelda cancellation_reason yo‘qligi sabab body yubormaymiz
            await api.post(`bookings/bookings/${b.id}/cancel/`);
            const myBookings = await api.get("bookings/bookings/");
            setBookings(myBookings.data?.results || myBookings.data || []);
        } catch (e) {
            console.error(e);
            alert(t("cannot_cancel"));
        }
    };

    const canReview = (b) => b.status === "completed";

    const openReview = (b) => {
        setReviewBooking(b);
        setReviewForm({
            overall_rating: 5, title: "", comment: "",
            communication_rating: 5, service_rating: 5, punctuality_rating: 5, value_rating: 5
        });
        setReviewOpen(true);
    };

    const submitReview = async () => {
        if (!reviewBooking) return;
        setReviewSubmitting(true);
        try {
            await api.post("reviews/reviews/", {
                booking_id: reviewBooking.id,
                ...reviewForm,
            });
            setReviewOpen(false);
            setReviewBooking(null);
            alert(t("review_submitted"));
        } catch (e) {
            console.error(e);
            alert(t("review_failed"));
        } finally {
            setReviewSubmitting(false);
        }
    };

    if (initialLoading) {
        return <div className="user-account-loading">{t("loading")}...</div>;
    }

    return (
        <div className="user-account-wrapper">
            {/* Tabs */}
            <div className="user-account-tabs">
                <button onClick={()=>setTab(Tab.PROFILE)} className={tab===Tab.PROFILE?"active":""}><FiUser /> {t("profile")}</button>
                <button onClick={()=>setTab(Tab.SEARCH)} className={tab===Tab.SEARCH?"active":""}><FiSearch /> {t("search_and_book")}</button>
                <button onClick={()=>setTab(Tab.BOOKINGS)} className={tab===Tab.BOOKINGS?"active":""}><FiCalendar /> {t("my_bookings")}</button>
            </div>

            {/* PROFILE */}
            {tab === Tab.PROFILE && (
                <div className="user-account-section">
                    <h3><FiUser /> {t("profile_information")}</h3>
                    <div className="user-account-header">
                        <div className="user-account-avatar">
                            <img
                                src={avatarSrc}
                                alt="avatar"
                                className="user-account-avatar-img"
                                onError={(e)=>{ e.currentTarget.src="/placeholder-avatar.png"; }}
                            />
                            <label className="user-account-avatar-upload-btn">
                                <FiUpload />
                                <input
                                    ref={avatarRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={(e)=>setAvatarFile(e.target.files?.[0]||null)}
                                    style={{display:"none"}}
                                />
                            </label>
                        </div>
                        <div className="user-account-user">
                            <div className="user-account-field">
                                <label>{t("first_name")}</label>
                                <input value={userData?.first_name || ""} onChange={(e)=>setUserData((u)=>({...u, first_name: e.target.value}))}/>
                            </div>
                            <div className="user-account-field">
                                <label>{t("last_name")}</label>
                                <input value={userData?.last_name || ""} onChange={(e)=>setUserData((u)=>({...u, last_name: e.target.value}))}/>
                            </div>
                            <div className="user-account-field">
                                <label>{t("email")}</label>
                                <input value={userData?.email || ""} readOnly />
                            </div>
                            <div className="user-account-actions">
                                <button className="user-account-btn primary" onClick={saveProfile} disabled={saving}><FiSave /> {saving ? t("saving") : t("save_changes")}</button>
                            </div>
                        </div>
                    </div>

                    {/* Password modal */}
                    {pwOpen && (
                        <div className="user-account-modal">
                            <div className="user-account-modal-content">
                                <h4><FiShield /> {t("change_password")}</h4>
                                {!pwEmailSent ? (
                                    <>
                                        <p>{t("send_reset_code_to_email")} <strong>{userData?.email}</strong></p>
                                        <button className="user-account-btn" onClick={sendResetCode}>{t("send_code")}</button>
                                        <button className="user-account-btn" onClick={()=>setPwOpen(false)}>{t("close")}</button>
                                    </>
                                ) : (
                                    <>
                                        <div className="user-account-field">
                                            <label>{t("verification_code")}</label>
                                            <input value={pwForm.code} onChange={(e)=>setPwForm((f)=>({...f, code:e.target.value}))}/>
                                        </div>
                                        <div className="user-account-field">
                                            <label>{t("new_password")}</label>
                                            <input type="password" value={pwForm.new_password} onChange={(e)=>setPwForm((f)=>({...f, new_password:e.target.value}))}/>
                                        </div>
                                        <div className="user-account-actions">
                                            <button className="user-account-btn primary" onClick={confirmReset}>{t("confirm")}</button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {saveSuccess && (
                <div
                    className="user-account-alert success"
                    role="status"
                    aria-live="polite"
                    style={{
                        margin: "12px 0",
                        padding: "10px 12px",
                        borderRadius: 8,
                        background: "#e6f7e9",
                        color: "#0f5132",
                        border: "1px solid #badbcc",
                        fontSize: 14,
                    }}
                >
                    {t("changes_saved") || "Changes saved successfully"}
                </div>
            )}

            {/* SEARCH & BOOK */}
            {tab === Tab.SEARCH && (
                <div className="user-account-section">
                    <h3><FiSearch /> {t("find_guides")}</h3>
                    <form className="user-account-search" onSubmit={doSearchGuides}>
                        <div className="user-account-field">
                            <label>{t("country")}</label>
                            <input
                                placeholder={t("country")}
                                value={filters.country}
                                onChange={(e)=>setFilters((f)=>({...f, country: e.target.value}))}
                            />
                        </div>
                        <div className="user-account-field">
                            <label>{t("city")}</label>
                            <input
                                placeholder={t("city")}
                                value={filters.city}
                                onChange={(e)=>setFilters((f)=>({...f, city: e.target.value}))}
                            />
                        </div>
                        <div className="user-account-field">
                            <label>{t("min_rating")}</label>
                            <input
                                type="number"
                                min={0} max={5} step="0.1"
                                value={filters.rating}
                                onChange={(e)=>setFilters((f)=>({...f, rating: e.target.value}))}
                            />
                        </div>
                        <button className="user-account-btn" disabled={searching}><FiSearch /> {searching? t("searching"): t("search")}</button>
                    </form>

                    <div className="user-account-guides">
                        {guides.map((g)=>(
                            <div className="user-account-guide-card" key={g.id}>
                                <div className="user-account-guide-main">
                                    <img src={toAbsMedia(g.avatar) || "/placeholder-avatar.png"} alt="" className="user-account-guide-avatar"
                                         onError={(e)=>{ e.currentTarget.src="/placeholder-avatar.png"; }}/>
                                    <div className="user-account-guide-info">
                                        <div className="user-account-guide-name">{g.full_name}</div>
                                        <div className="user-account-guide-loc"><FiMapPin /> {g.country_name}{g.city_name?`, ${g.city_name}`:""}</div>
                                        <div className="user-account-guide-rating"><FiStar /> {Number(g.average_rating || 0).toFixed(2)} ({g.total_reviews || 0})</div>
                                    </div>
                                </div>
                                <div className="user-account-guide-actions">
                                    <button className="user-account-btn" onClick={()=>openBooking(g)}><FiCalendar /> {t("book")}</button>
                                </div>
                            </div>
                        ))}
                        {guides.length===0 && <div className="user-account-empty">{t("no_guides_found")}</div>}
                    </div>

                    {/* Booking modal */}
                    {bookingModalOpen && selectedGuide && (
                        <div className="user-account-modal">
                            <div className="user-account-modal-content">
                                <div className="user-account-modal-header">
                                    <h4><FiCalendar /> {t("create_booking")} — {selectedGuide.full_name}</h4>
                                    <button className="user-account-icon-btn" onClick={()=>setBookingModalOpen(false)}><FiX /></button>
                                </div>
                                <div className="user-account-grid">
                                    <div className="user-account-field user-account-col-2">
                                        <label>{t("title")}</label>
                                        <input value={bookingForm.title} onChange={(e)=>setBookingForm((f)=>({...f, title: e.target.value}))}/>
                                    </div>
                                    <div className="user-account-field user-account-col-2">
                                        <label>{t("description")}</label>
                                        <textarea rows={3} value={bookingForm.description} onChange={(e)=>setBookingForm((f)=>({...f, description: e.target.value}))}/>
                                    </div>
                                    <div className="user-account-field">
                                        <label>{t("country")}</label>
                                        <input value={bookingForm.country} onChange={(e)=>setBookingForm((f)=>({...f, country: e.target.value}))}/>
                                    </div>
                                    <div className="user-account-field">
                                        <label>{t("city")}</label>
                                        <input value={bookingForm.city} onChange={(e)=>setBookingForm((f)=>({...f, city: e.target.value}))}/>
                                    </div>
                                    <div className="user-account-field">
                                        <label>{t("start_date")}</label>
                                        <input type="date" value={bookingForm.start_date} onChange={(e)=>setBookingForm((f)=>({...f, start_date: e.target.value}))}/>
                                    </div>
                                    <div className="user-account-field">
                                        <label>{t("end_date")}</label>
                                        <input type="date" value={bookingForm.end_date} onChange={(e)=>setBookingForm((f)=>({...f, end_date: e.target.value}))}/>
                                    </div>
                                </div>
                                <div className="user-account-modal-actions">
                                    <button className="user-account-btn" onClick={submitBooking} disabled={bookingSubmitting}><FiSend /> {bookingSubmitting ? t("submitting") : t("submit")}</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* MY BOOKINGS */}
            {tab === Tab.BOOKINGS && (
                <div className="user-account-section">
                    <h3><FiCalendar /> {t("my_bookings")}</h3>
                    <div className="user-account-table">
                        <div className="user-account-table-head">
                            <div>{t("title")}</div>
                            <div>{t("guide")}</div>
                            <div>{t("start_date")}</div>
                            <div>{t("end_date")}</div>
                            <div>{t("status")}</div>
                            <div>{t("actions")}</div>
                        </div>
                        {bookings.map((b)=>(
                            <div key={b.id} className="user-account-table-row">
                                <div>{b.title || "-"}</div>
                                <div>{b?.customer_profile?.user?.full_name || "-"}</div>
                                <div>{b.start_date}</div>
                                <div>{b.end_date}</div>
                                <div>{b.status}</div>
                                <div className="user-account-actions-inline">
                                    {(b.status==="pending" || b.status==="accepted") && (
                                        <>
                                            {/* <button className="user-account-btn" onClick={()=>cancelBooking(b)}>{t("cancel")}</button> */}
                                            {b.status==="accepted" && (
                                                <button
                                                    className="user-account-btn"
                                                    onClick={()=>{
                                                        const email = b?.customer_profile?.user?.email;
                                                        setChatPeerEmail(email || null);
                                                        setChatOpen(true);
                                                    }}
                                                >
                                                    <FiMessageSquare /> {t("open_chat")}
                                                </button>
                                            )}
                                        </>
                                    )}
                                    {canReview(b) && (
                                        <button className="user-account-btn" onClick={()=>openReview(b)}><FiStar /> {t("write_review")}</button>
                                    )}
                                </div>
                            </div>
                        ))}
                        {bookings.length===0 && <div className="user-account-empty">{t("no_bookings_yet")}</div>}
                    </div>

                    {/* Review modal */}
                    {reviewOpen && reviewBooking && (
                        <div className="user-account-modal">
                            <div className="user-account-modal-content">
                                <div className="user-account-modal-header">
                                    <h4><FiStar /> {t("write_review")} — {reviewBooking?.customer_profile?.user?.full_name}</h4>
                                    <button className="user-account-icon-btn" onClick={()=>setReviewOpen(false)}><FiX /></button>
                                </div>
                                <div className="user-account-grid">
                                    <div className="user-account-field">
                                        <label>{t("overall_rating")}</label>
                                        <input type="number" min={1} max={5} value={reviewForm.overall_rating} onChange={(e)=>setReviewForm((f)=>({...f, overall_rating: Number(e.target.value) }))}/>
                                    </div>
                                    <div className="user-account-field user-account-col-2">
                                        <label>{t("title")}</label>
                                        <input value={reviewForm.title} onChange={(e)=>setReviewForm((f)=>({...f, title: e.target.value}))}/>
                                    </div>
                                    <div className="user-account-field user-account-col-2">
                                        <label>{t("comment")}</label>
                                        <textarea rows={3} value={reviewForm.comment} onChange={(e)=>setReviewForm((f)=>({...f, comment: e.target.value}))}/>
                                    </div>
                                    <div className="user-account-field">
                                        <label>{t("communication_rating")}</label>
                                        <input type="number" min={1} max={5} value={reviewForm.communication_rating} onChange={(e)=>setReviewForm((f)=>({...f, communication_rating: Number(e.target.value)}))}/>
                                    </div>
                                    <div className="user-account-field">
                                        <label>{t("service_rating")}</label>
                                        <input type="number" min={1} max={5} value={reviewForm.service_rating} onChange={(e)=>setReviewForm((f)=>({...f, service_rating: Number(e.target.value)}))}/>
                                    </div>
                                    <div className="user-account-field">
                                        <label>{t("punctuality_rating")}</label>
                                        <input type="number" min={1} max={5} value={reviewForm.punctuality_rating} onChange={(e)=>setReviewForm((f)=>({...f, punctuality_rating: Number(e.target.value)}))}/>
                                    </div>
                                    <div className="user-account-field">
                                        <label>{t("value_rating")}</label>
                                        <input type="number" min={1} max={5} value={reviewForm.value_rating} onChange={(e)=>setReviewForm((f)=>({...f, value_rating: Number(e.target.value)}))}/>
                                    </div>
                                </div>
                                <div className="user-account-modal-actions">
                                    <button className="user-account-btn" onClick={submitReview} disabled={reviewSubmitting}><FiSend /> {reviewSubmitting? t("submitting"): t("submit")}</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* 🔵 CHAT MODAL (routerga bog‘lanmagan) */}
            {chatOpen && (
                <div className="user-account-modal" role="dialog" aria-modal="true">
                    <div className="user-account-modal-content user-account-chat-modal">
                        <div className="user-account-modal-header">
                            <h4><FiMessageSquare /> {t("chat")}</h4>
                            <button className="user-account-icon-btn" onClick={()=>{ setChatOpen(false); setChatPeerEmail(null); }}>
                                <FiX />
                            </button>
                        </div>
                        <ChatWidgets initialPeerEmail={chatPeerEmail} />
                    </div>
                </div>
            )}

            {/* ✅ Doimiy Chat FAB (past-o‘ng burchakda) */}
            <button
                className="user-account-chat-fab"
                title={t("chat")}
                aria-label={t("chat")}
                onClick={() => { setChatPeerEmail(null); setChatOpen(true); }}
            >
                <FiMessageSquare />
            </button>
        </div>
    );
}
