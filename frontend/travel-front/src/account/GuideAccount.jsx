// src/account/GuideAccount.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    FiUser, FiImage, FiFileText,
    FiTrendingUp, FiCalendar, FiPlus, FiTrash2, FiSave, FiClock,
    FiUpload, FiSettings, FiDollarSign, FiX
} from "react-icons/fi";
import api from "./api";
import ChatWidgets from "./ChatWidgets";
import "./GuideAccount.css";

/* =======================
   Helpers (media URL & avatar API)
   ======================= */
const API_BASE = (process.env.REACT_APP_API_URL || "http://localhost:8000/api/v1/").replace(/\/+$/, "");
const BACKEND_ORIGIN = API_BASE.replace(/\/api\/v1\/?$/, ""); // → http://localhost:8000

const toAbsMedia = (url) => {
    if (!url) return "/placeholder-avatar.png";
    if (/^https?:\/\//i.test(url)) return url;
    if (url.startsWith("/media")) return BACKEND_ORIGIN + url;
    if (url.startsWith("media/")) return `${BACKEND_ORIGIN}/${url}`;
    return url;
};

// Header dagidek: GUIDE (customer) avatarini GET orqali olish
const fetchGuideAvatarUrl = async (userId) => {
    try {
        const { data } = await api.get(`profiles/customers/${userId}/avatar/`);
        return data?.avatar_url || null;
    } catch {
        return null;
    }
};

const Tab = {
    PROFILE: "profile",
    SERVICE: "service",
    STATS: "stats",
    BOOKINGS: "bookings",
    UNAVAIL: "unavail",
};

export default function GuideAccount() {
    const { t } = useTranslation();
    const [tab, setTab] = useState(Tab.PROFILE);

    const [initialLoading, setInitialLoading] = useState(true);
    const [savingProfile, setSavingProfile] = useState(false);
    const [savingService, setSavingService] = useState(false);
    const [uaSubmitting, setUaSubmitting] = useState(false);

    const [cities, setCities] = useState([]);
    const [me, setMe] = useState(null);
    const [userData, setUserData] = useState(null);
    const [profile, setProfile] = useState(null);

    // avatar
    const [avatarFile, setAvatarFile] = useState(null);
    const avatarInputRef = useRef();
    const [avatarUrl, setAvatarUrl] = useState(null); // 🔵 asosiy ko‘rsatiladigan avatar URL

    // bookings (guide sifatida)
    const [bookings, setBookings] = useState([]);

    // unavailability
    const [unavailabilities, setUnavailabilities] = useState([]);
    const [uaForm, setUaForm] = useState({ start_date: "", end_date: "", reason: "" });

    // Chat modal
    const [chatOpen, setChatOpen] = useState(false);
    const [chatPeerEmail, setChatPeerEmail] = useState(null);

    const stats = useMemo(
        () => ({
            totalBookings: profile?.total_bookings || 0,
            totalReviews: profile?.total_reviews || 0,
            averageRating: profile?.average_rating || 0,
            isAvailable: profile?.is_available ?? true,
        }),
        [profile]
    );

    /* =======================
       Initial load
       ======================= */
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const [meRes, myProfileRes, citiesRes, meUserRes] = await Promise.all([
                    api.get("accounts/me/"),
                    api.get("profiles/customers/my/"),
                    api.get("common/cities/"),
                    api.get("auth/users/me/"),
                ]);
                if (!mounted) return;

                setMe(meRes.data);
                setProfile(myProfileRes.data);
                setCities(citiesRes.data?.results || citiesRes.data || []);
                setUserData(meUserRes.data);

                // avatar URL ni serverdan alohida GET qiling (Header bilan mos)
                const uid = myProfileRes?.data?.user?.id;
                if (uid) {
                    const url = await fetchGuideAvatarUrl(uid);
                    setAvatarUrl(url);
                }

                // bookings
                const myBookings = await api.get("bookings/bookings/");
                setBookings(myBookings.data?.results || myBookings.data || []);

                // unavailability
                const myUAs = await api.get("profiles/unavailabilities/my/");
                setUnavailabilities(myUAs.data?.results || myUAs.data || []);
            } catch (e) {
                console.error(e);
            } finally {
                if (mounted) setInitialLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, []);

    /* =======================
       PROFILE (avatar & info)
       ======================= */
    const avatarSrc = toAbsMedia(
        avatarUrl ||
        profile?.avatar_url ||
        profile?.avatar ||
        profile?.user?.avatar_url ||
        profile?.user?.avatar
    );

    const handleAvatarUpload = async () => {
        if (!avatarFile || !profile?.user?.id) return;
        const fd = new FormData();
        fd.append("avatar", avatarFile);
        await api.put(
            `profiles/customers/${profile.user.id}/avatar/`,
            fd,
            { headers: { "Content-Type": "multipart/form-data" } } // 415 oldini oladi
        );

        // profil va avatar urlni yangilab oling
        const [refProfile, freshUrl] = await Promise.all([
            api.get("profiles/customers/my/"),
            fetchGuideAvatarUrl(profile.user.id),
        ]);
        setProfile(refProfile.data);
        setAvatarUrl(freshUrl);

        setAvatarFile(null);
        if (avatarInputRef.current) avatarInputRef.current.value = "";
    };

    // 415 xatolar uchun: JSON o‘rniga FormData yuboramiz
    const saveProfileInfo = async () => {
        setSavingProfile(true);
        try {
            const fd = new FormData();
            fd.append("professional_bio", profile?.professional_bio || "");
            fd.append("years_of_experience", String(profile?.years_of_experience ?? 0));
            fd.append("is_available", String(!!profile?.is_available));
            await api.patch("profiles/customers/my/", fd);
            const refreshed = await api.get("profiles/customers/my/");
            setProfile(refreshed.data);
        } catch (e) {
            console.error(e);
            alert(t("action_failed"));
        } finally {
            setSavingProfile(false);
        }
    };

    /* =======================
       SERVICE
       ======================= */
    const saveServiceInfo = async () => {
        setSavingService(true);
        try {
            const fd = new FormData();
            if (profile?.city) fd.append("city", String(profile.city));
            fd.append("service_areas", profile?.service_areas || "");
            if (profile?.hourly_rate !== undefined && profile?.hourly_rate !== null) {
                fd.append("hourly_rate", String(profile.hourly_rate));
            }
            if (profile?.daily_rate !== undefined && profile?.daily_rate !== null) {
                fd.append("daily_rate", String(profile.daily_rate));
            }
            fd.append("currency", (profile?.currency || "USD").toUpperCase());
            await api.patch("profiles/customers/my/", fd);
            const refreshed = await api.get("profiles/customers/my/");
            setProfile(refreshed.data);
        } catch (e) {
            console.error(e);
            alert(t("action_failed"));
        } finally {
            setSavingService(false);
        }
    };

    /* =======================
       UNAVAILABILITY
       ======================= */
    const addUnavailability = async (e) => {
        e.preventDefault();
        setUaSubmitting(true);
        try {
            await api.post("profiles/unavailabilities/", uaForm);
            const myUAs = await api.get("profiles/unavailabilities/my/");
            setUnavailabilities(myUAs.data?.results || myUAs.data || []);
            setUaForm({ start_date: "", end_date: "", reason: "" });
        } catch (e) {
            console.error(e);
        } finally {
            setUaSubmitting(false);
        }
    };

    const deleteUnavailability = async (id) => {
        try {
            await api.delete(`profiles/unavailabilities/${id}/`);
            const myUAs = await api.get("profiles/unavailabilities/my/");
            setUnavailabilities(myUAs.data?.results || myUAs.data || []);
        } catch (e) {
            console.error(e);
        }
    };

    /* =======================
       BOOKINGS (ACCEPT / CANCEL / CHAT)
       ======================= */
    const refreshBookings = async () => {
        const myBookings = await api.get("bookings/bookings/");
        setBookings(myBookings.data?.results || myBookings.data || []);
    };

    const acceptBooking = async (b) => {
        try {
            await api.post(`bookings/bookings/${b.id}/accept/`);
            await refreshBookings();
        } catch (e) {
            console.error(e);
            alert(t("action_failed"));
        }
    };

    const cancelBooking = async (b) => {
        try {
            await api.post(`bookings/bookings/${b.id}/cancel/`, {
                cancellation_reason: "Rejected by guide",
            });
            await refreshBookings();
        } catch (e) {
            console.error(e);
            alert(t("action_failed"));
        }
    };

    const openChatForBooking = async (b) => {
        try {
            const otherEmail = b?.client_profile?.user?.email;
            if (otherEmail) {
                await api.post("chat/conversations/", { user_email: otherEmail });
                setChatPeerEmail(otherEmail);
            } else {
                setChatPeerEmail(null);
            }
        } catch (e) {
            console.error(e);
            setChatPeerEmail(null);
        } finally {
            setChatOpen(true);
        }
    };

    /* =======================
       RENDER
       ======================= */
    if (initialLoading) {
        return (
            <div className="guide-account-loading">
                <FiClock /> {t("loading")}...
            </div>
        );
    }

    return (
        <div className="guide-account-wrapper">
            {/* Tabs */}
            <div className="guide-account-tabs">
                <button onClick={() => setTab(Tab.PROFILE)} className={tab===Tab.PROFILE?"active":""}><FiUser /> {t("profile")}</button>
                <button onClick={() => setTab(Tab.SERVICE)} className={tab===Tab.SERVICE?"active":""}><FiSettings /> {t("service")}</button>
                <button onClick={() => setTab(Tab.STATS)} className={tab===Tab.STATS?"active":""}><FiTrendingUp /> {t("stats")}</button>
                <button onClick={() => setTab(Tab.BOOKINGS)} className={tab===Tab.BOOKINGS?"active":""}><FiCalendar /> {t("bookings")}</button>
                <button onClick={() => setTab(Tab.UNAVAIL)} className={tab===Tab.UNAVAIL?"active":""}><FiClock /> {t("unavailability")}</button>
            </div>

            {/* PROFILE */}
            {tab === Tab.PROFILE && (
                <div className="guide-account-section">
                    <h3><FiUser /> {t("profile_information")}</h3>
                    <div className="guide-account-header">
                        <div className="guide-account-avatar">
                            <img
                                src={avatarSrc}
                                alt="avatar"
                                className="guide-account-avatar-img"
                                onError={(e)=>{ e.currentTarget.src="/placeholder-avatar.png"; }}
                            />
                            <label className="guide-account-avatar-upload-btn">
                                <FiUpload />
                                <input
                                    ref={avatarInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                                    style={{ display: "none" }}
                                />
                            </label>
                            <button className="guide-account-btn" disabled={!avatarFile} onClick={handleAvatarUpload}>
                                <FiImage /> {t("upload")}
                            </button>
                        </div>

                        <div className="guide-account-user">
                            <div className="guide-account-field">
                                <label>{t("first_name")}</label>
                                <input value={userData?.first_name || ""} readOnly />
                            </div>
                            <div className="guide-account-field">
                                <label>{t("last_name")}</label>
                                <input value={userData?.last_name || ""} readOnly />
                            </div>
                            <div className="guide-account-field">
                                <label>{t("email")}</label>
                                <input value={userData?.email || ""} readOnly />
                            </div>
                        </div>
                    </div>

                    <div className="guide-account-grid">
                        <div className="guide-account-field guide-account-col-2">
                            <label><FiFileText /> {t("bio")}</label>
                            <textarea
                                rows={4}
                                value={profile?.professional_bio || ""}
                                onChange={(e) => setProfile((p) => ({ ...p, professional_bio: e.target.value }))}
                            />
                        </div>
                        <div className="guide-account-field">
                            <label>{t("years_of_experience")}</label>
                            <input
                                type="number"
                                min={0}
                                value={profile?.years_of_experience ?? 0}
                                onChange={(e) => setProfile((p) => ({ ...p, years_of_experience: Number(e.target.value||0) }))}
                            />
                        </div>
                        <div className="guide-account-actions">
                            <button className="guide-account-btn primary" onClick={saveProfileInfo} disabled={savingProfile}>
                                <FiSave /> {savingProfile ? t("saving") : t("save_changes")}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* SERVICE */}
            {tab === Tab.SERVICE && (
                <div className="guide-account-section">
                    <h3><FiSettings /> {t("service_details")}</h3>
                    <div className="guide-account-grid">
                        <div className="guide-account-field">
                            <label>{t("country")}</label>
                            <input value={profile?.country_name || ""} readOnly />
                        </div>
                        <div className="guide-account-field">
                            <label>{t("city")}</label>
                            <select
                                value={profile?.city || ""}
                                onChange={(e)=>setProfile((p)=>({...p, city: e.target.value || null}))}
                            >
                                <option value="">{t("select_city")}</option>
                                {cities.map((c)=> <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="guide-account-field">
                            <label><FiDollarSign /> {t("hourly_rate")}</label>
                            <input type="number" min={0} step="0.01" value={profile?.hourly_rate ?? ""} onChange={(e)=>setProfile((p)=>({...p, hourly_rate: e.target.value}))}/>
                        </div>
                        <div className="guide-account-field">
                            <label><FiDollarSign /> {t("daily_rate")}</label>
                            <input type="number" min={0} step="0.01" value={profile?.daily_rate ?? ""} onChange={(e)=>setProfile((p)=>({...p, daily_rate: e.target.value}))}/>
                        </div>
                        <div className="guide-account-field">
                            <label>{t("currency")}</label>
                            <input value={(profile?.currency || "USD").toUpperCase()} onChange={(e)=>setProfile((p)=>({...p, currency: e.target.value.toUpperCase().slice(0,3)}))}/>
                        </div>
                        <div className="guide-account-field guide-account-col-2">
                            <label>{t("service_areas")}</label>
                            <textarea rows={3} value={profile?.service_areas || ""} onChange={(e)=>setProfile((p)=>({...p, service_areas: e.target.value}))}/>
                        </div>
                    </div>
                    <div className="guide-account-actions">
                        <button className="guide-account-btn primary" onClick={saveServiceInfo} disabled={savingService}>
                            <FiSave /> {savingService ? t("saving") : t("save_changes")}
                        </button>
                    </div>
                </div>
            )}

            {/* STATS */}
            {tab === Tab.STATS && (
                <div className="guide-account-section">
                    <h3><FiTrendingUp /> {t("my_stats")}</h3>
                    <div className="guide-account-stats">
                        <div className="guide-account-stat">
                            <div className="guide-account-stat-label">{t("bookings")}</div>
                            <div className="guide-account-stat-value">{stats.totalBookings}</div>
                        </div>
                        <div className="guide-account-stat">
                            <div className="guide-account-stat-label">{t("reviews")}</div>
                            <div className="guide-account-stat-value">{stats.totalReviews} ({Number(stats.averageRating).toFixed(2)}★)</div>
                        </div>
                        <div className="guide-account-stat">
                            <div className="guide-account-stat-label">{t("availability")}</div>
                            <div className="guide-account-stat-value">{stats.isAvailable ? t("available") : t("not_available")}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* BOOKINGS */}
            {tab === Tab.BOOKINGS && (
                <div className="guide-account-section">
                    <h3><FiCalendar /> {t("incoming_bookings")}</h3>
                    <div className="guide-account-table">
                        <div className="guide-account-table-head">
                            <div>{t("title")}</div>
                            <div>{t("client")}</div>
                            <div>{t("start_date")}</div>
                            <div>{t("end_date")}</div>
                            <div>{t("status")}</div>
                            <div>{t("actions")}</div>
                        </div>
                        {bookings.map((b)=>(
                            <div key={b.id} className="guide-account-table-row">
                                <div>{b.title || "-"}</div>
                                <div>{b?.client_profile?.user?.full_name || "-"}</div>
                                <div>{b.start_date}</div>
                                <div>{b.end_date}</div>
                                <div>{b.status}</div>
                                <div className="guide-account-actions-inline">
                                    {b.status === "pending" && (
                                        <>
                                            <button className="guide-account-btn" onClick={()=>acceptBooking(b)}>{t("accept")}</button>
                                            <button className="guide-account-btn danger" onClick={()=>cancelBooking(b)}>{t("reject")}</button>
                                        </>
                                    )}
                                    {b.status === "accepted" && (
                                        <button className="guide-account-btn" onClick={()=>openChatForBooking(b)}>
                                            {t("open_chat")}
                                        </button>
                                    )}
                                    {b.status === "cancelled" && <span>{t("cancelled")}</span>}
                                </div>
                            </div>
                        ))}
                        {bookings.length===0 && <div className="guide-account-empty">{t("no_bookings_yet")}</div>}
                    </div>
                </div>
            )}

            {/* UNAVAILABILITY */}
            {tab === Tab.UNAVAIL && (
                <div className="guide-account-section">
                    <h3><FiClock /> {t("unavailability")}</h3>
                    <form className="guide-account-unavail-form" onSubmit={addUnavailability}>
                        <div className="guide-account-field">
                            <label>{t("start_date")}</label>
                            <input type="date" value={uaForm.start_date} onChange={(e)=>setUaForm((f)=>({...f, start_date: e.target.value}))} required />
                        </div>
                        <div className="guide-account-field">
                            <label>{t("end_date")}</label>
                            <input type="date" value={uaForm.end_date} onChange={(e)=>setUaForm((f)=>({...f, end_date: e.target.value}))} required />
                        </div>
                        <div className="guide-account-field guide-account-col-2">
                            <label>{t("reason")}</label>
                            <input value={uaForm.reason} onChange={(e)=>setUaForm((f)=>({...f, reason: e.target.value}))} placeholder={t("optional")} />
                        </div>
                        <button className="guide-account-btn" disabled={uaSubmitting}><FiPlus /> {uaSubmitting ? t("adding") : t("add")}</button>
                    </form>

                    <div className="guide-account-table">
                        <div className="guide-account-table-head">
                            <div>{t("start_date")}</div>
                            <div>{t("end_date")}</div>
                            <div>{t("reason")}</div>
                            <div>{t("actions")}</div>
                        </div>
                        {unavailabilities.map((u)=>(
                            <div key={u.id} className="guide-account-table-row">
                                <div>{u.start_date}</div>
                                <div>{u.end_date}</div>
                                <div>{u.reason || "-"}</div>
                                <div>
                                    <button className="guide-account-icon-btn danger" onClick={()=>deleteUnavailability(u.id)} title={t("delete")}><FiTrash2 /></button>
                                </div>
                            </div>
                        ))}
                        {unavailabilities.length===0 && <div className="guide-account-empty">{t("no_unavailability")}</div>}
                    </div>
                </div>
            )}

            {/* CHAT MODAL */}
            {chatOpen && (
                <div className="guide-account-modal" role="dialog" aria-modal="true">
                    <div className="guide-account-modal-content guide-account-chat-modal">
                        <div className="guide-account-modal-bar">
                            <span>{t("chat")}</span>
                            <button
                                className="guide-account-icon-btn"
                                onClick={()=>{ setChatOpen(false); setChatPeerEmail(null); }}
                                title={t("close")}
                                aria-label={t("close")}
                            >
                                <FiX/>
                            </button>
                        </div>
                        <ChatWidgets initialPeerEmail={chatPeerEmail} />
                    </div>
                </div>
            )}
        </div>
    );
}
