// src/account/ChatWidgets.jsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    FiSend,
    FiSearch,
    FiUser,
    FiMessageSquare,
    FiCheckCircle,
    FiCircle,
} from "react-icons/fi";
import api from "./api";
import "./ChatWidgets.css";

/* ============ MEDIA URL HELPERS (Header/UserAccount bilan mos) ============ */
const API_BASE = (process.env.REACT_APP_API_URL || "http://localhost:8000/api/v1/").replace(/\/+$/, "");
const BACKEND_ORIGIN =
    API_BASE.replace(/\/api\/v1\/?$/, "") ||
    (typeof window !== "undefined" ? window.location.origin : "http://localhost:8000");

const PLACEHOLDER = "/placeholder-avatar.png";

const toAbsMedia = (url) => {
    if (!url) return PLACEHOLDER;
    if (/^https?:\/\//i.test(url)) return url;
    if (url.startsWith("/media")) return BACKEND_ORIGIN + url;
    if (url.startsWith("media/")) return `${BACKEND_ORIGIN}/${url}`;
    return url;
};

const getUserInlineAvatar = (user) =>
    toAbsMedia(user?.avatar_url || user?.avatar || "");

/* ===================== WebSocket (per-conversation) ===================== */
const WS_ORIGIN = process.env.REACT_APP_WS_ORIGIN || "ws://localhost:8000";

/**
 * Har bir active conversation uchun alohida WS ulanish
 * ws://HOST/ws/chat/<conversationId>/?token=...
 */
function useConversationSocket(conversationId) {
    const [socket, setSocket] = useState(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        if (!conversationId) return;
        const token = localStorage.getItem("access_token") || "";
        const ws = new WebSocket(
            `${WS_ORIGIN}/ws/chat/${conversationId}/?token=${encodeURIComponent(token)}`
        );

        ws.onopen = () => setReady(true);
        ws.onclose = () => setReady(false);

        setSocket(ws);
        return () => {
            try {
                ws.close();
            } catch {}
        };
    }, [conversationId]);

    return { socket, ready };
}

/* ===================== Chat Widget ===================== */
export default function ChatWidgets({ initialPeerEmail = null }) {
    const { t } = useTranslation();
    const [me, setMe] = useState(null); // accounts/me
    const [conversations, setConversations] = useState([]);
    const [activeConv, setActiveConv] = useState(null);
    const [messages, setMessages] = useState([]);
    const [composer, setComposer] = useState("");
    const [loadingConv, setLoadingConv] = useState(true);
    const [loadingMsg, setLoadingMsg] = useState(false);
    const [query, setQuery] = useState("");

    const listRef = useRef();

    // Avatar KESH: userId -> absolute url (useRef: set qilganda re-render bo‘lmaydi)
    const avatarCacheRef = useRef({});

    const normalizeRole = (role) =>
        (role || "").toString().trim().toLowerCase(); // "Client" | "client" -> "client"

    // Mening rolimni olish
    useEffect(() => {
        (async () => {
            try {
                const { data } = await api.get("accounts/me/");
                // me.role ni barqaror qilish
                const role = normalizeRole(data?.role);
                setMe({ ...data, role });
            } catch (e) {
                console.error(e);
            }
        })();
    }, []);

    // Parentdan peer yuborilsa, suhbatni create/get
    useEffect(() => {
        (async () => {
            if (!initialPeerEmail) return;
            try {
                await api.post("chat/conversations/", { user_email: initialPeerEmail });
                // create/get dan keyin ro‘yxat yangilansin
                fetchConversationsRef.current?.();
            } catch (e) {
                console.error(e);
            }
        })();
    }, [initialPeerEmail]);

    // Peer avatarini profil endpointidan olish (kesh bilan)
    const fetchPeerAvatarUrl = useCallback(
        async (peerUserId) => {
            if (!peerUserId) return PLACEHOLDER;

            // Kesh
            if (avatarCacheRef.current[peerUserId]) {
                return avatarCacheRef.current[peerUserId];
            }

            // client -> peers are "customers"
            // customer -> peers are "clients"
            const role = normalizeRole(me?.role);
            const primary =
                role === "client" ? "profiles/customers" : "profiles/clients";
            const fallback =
                role === "client" ? "profiles/clients" : "profiles/customers";

            const tryOne = async (base) => {
                try {
                    const { data } = await api.get(
                        `${base}/${encodeURIComponent(peerUserId)}/avatar/`
                    );
                    const abs = toAbsMedia(data?.avatar_url || data?.avatar || "");
                    return abs || PLACEHOLDER;
                } catch {
                    return null;
                }
            };

            let url = await tryOne(primary);
            if (!url) url = await tryOne(fallback);

            // Har qanday holatda keshga yozamiz (yo‘q bo‘lsa placeholder)
            avatarCacheRef.current[peerUserId] = url || PLACEHOLDER;
            return avatarCacheRef.current[peerUserId];
        },
        [me?.role]
    );

    // activeConvId va peerId
    const activeConvId = activeConv?.id;
    const activePeerId = activeConv?.other_user?.id;

    // Suhbatlar ro‘yxatini olish
    const fetchConversations = useCallback(async () => {
        setLoadingConv(true);
        try {
            const res = await api.get("chat/conversations/");
            let items = res.data?.results || res.data || [];

            // Qidiruv
            const q = (query || "").toLowerCase().trim();
            if (q) {
                items = items.filter((c) => {
                    const name = c.other_user?.full_name || c.other_user?.email || "";
                    return name.toLowerCase().includes(q);
                });
            }

            // Inline avatarlar bilan darhol ko‘rsatamiz
            const withInline = items.map((c) => ({
                ...c,
                _other_avatar: getUserInlineAvatar(c.other_user || {}),
            }));
            setConversations(withInline);

            // Yetishmayotgan avatarlarni fon’da olib, repaint
            Promise.all(
                withInline.map(async (c) => {
                    const uid = c.other_user?.id;
                    if (!uid) return null;

                    const inlineIsEmpty =
                        !c._other_avatar ||
                        c._other_avatar.includes("placeholder-avatar.png");

                    const cached = avatarCacheRef.current[uid];
                    if (cached && !inlineIsEmpty) return null;

                    const fresh = await fetchPeerAvatarUrl(uid);
                    if (fresh) c._other_avatar = fresh;
                    return null;
                })
            ).then(() => {
                setConversations((prev) =>
                    prev.map((x) => {
                        const updated = withInline.find((y) => y.id === x.id);
                        return updated || x;
                    })
                );
            });

            // activeConv pin
            if (!activeConvId && withInline.length > 0) {
                setActiveConv(withInline[0]);
            } else if (activeConvId) {
                const updated = withInline.find((x) => x.id === activeConvId);
                if (updated) setActiveConv(updated);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingConv(false);
        }
    }, [activeConvId, query, fetchPeerAvatarUrl]);

    // fetchConversations'ni refga qo‘yib WS ichidan ham chaqira olish
    const fetchConversationsRef = useRef(null);
    useEffect(() => {
        fetchConversationsRef.current = fetchConversations;
    }, [fetchConversations]);

    // Qidiruv/dep o‘zgarsa debounce bilan ro‘yxatni olish
    useEffect(() => {
        const id = setTimeout(() => {
            fetchConversations();
        }, 300);
        return () => clearTimeout(id);
    }, [fetchConversations]);

    // Xabarlarni yuklash
    const loadMessages = useCallback(
        async (convId) => {
            if (!convId) return;
            setLoadingMsg(true);
            try {
                const res = await api.get(`chat/conversations/${convId}/messages/`);
                const items = res.data?.results || res.data || [];
                setMessages(items.reverse());

                // o‘qilgan deb belgilash
                api.post(`chat/conversations/${convId}/mark-read/`).catch(() => {});

                // Header avatari uchun ham profil endpointidan yangilash
                if (
                    activePeerId &&
                    (!avatarCacheRef.current[activePeerId] ||
                        avatarCacheRef.current[activePeerId].includes("placeholder"))
                ) {
                    await fetchPeerAvatarUrl(activePeerId);
                }

                // Pastga scroll
                setTimeout(() => {
                    if (listRef.current)
                        listRef.current.scrollTop = listRef.current.scrollHeight;
                }, 0);
            } catch (e) {
                console.error(e);
            } finally {
                setLoadingMsg(false);
            }
        },
        [activePeerId, fetchPeerAvatarUrl]
    );

    useEffect(() => {
        if (activeConvId) loadMessages(activeConvId);
    }, [activeConvId, loadMessages]);

    // ✅ Per-conversation WebSocket
    const { socket } = useConversationSocket(activeConvId);

    // WS event handlerlari
    useEffect(() => {
        if (!socket) return;

        socket.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data);

                // 1) Yangi backend eventlari
                if (data.type === "chat_message") {
                    const m = data.message;
                    if (String(m.conversation) === String(activeConvId)) {
                        setMessages((prev) => [...prev, m]);
                        setTimeout(() => {
                            if (listRef.current)
                                listRef.current.scrollTop = listRef.current.scrollHeight;
                        }, 0);
                        api.post(`chat/conversations/${activeConvId}/mark-read/`).catch(() => {});
                    } else {
                        fetchConversationsRef.current?.();
                    }
                } else if (data.type === "message_read") {
                    // ixtiyoriy: holatni yangilash
                } else if (data.type === "message_action") {
                    // ixtiyoriy: delete/recover holatlari
                } else if (data.type === "typing_indicator") {
                    // ixtiyoriy
                } else if (data.type === "user_online" || data.type === "user_offline") {
                    // ixtiyoriy
                }

                // 2) Orqaga moslik
                if (data.type === "message.created") {
                    const m = data.message;
                    if (m.conversation === activeConvId) {
                        setMessages((prev) => [...prev, m]);
                        setTimeout(() => {
                            if (listRef.current)
                                listRef.current.scrollTop = listRef.current.scrollHeight;
                        }, 0);
                        api.post(`chat/conversations/${activeConvId}/mark-read/`).catch(() => {});
                    } else {
                        fetchConversationsRef.current?.();
                    }
                } else if (data.type === "conversation.updated") {
                    fetchConversationsRef.current?.();
                }
            } catch (err) {
                console.error(err);
            }
        };
    }, [socket, activeConvId]);

    const sendMessage = async () => {
        const content = (composer || "").trim();
        if (!content || !activeConvId) return;
        try {
            // const res = await api.post("chat/messages/send/", {
            //     conversation: activeConvId,
            //     content,
            // });
            // setMessages((prev) => [...prev, res.data]);
            await api.post("chat/messages/send/", { conversation: activeConvId, content });
            setComposer("");
            setTimeout(() => {
                if (listRef.current)
                    listRef.current.scrollTop = listRef.current.scrollHeight;
            }, 0);
        } catch (e) {
            console.error(e);
        }
    };

    const roleLabel = () => {
        if (!me?.role) return "";
        return normalizeRole(me.role) === "client" ? t("my_guides") : t("my_clients");
        // client foydalanuvchi uchun “my_guides”, customer (guide) foydalanuvchi uchun “my_clients”
    };

    // Header uchun yakuniy avatar: kesh -> inline -> placeholder
    const activePeerInline = getUserInlineAvatar(activeConv?.other_user || {});
    const cachedPeer = activePeerId ? avatarCacheRef.current[activePeerId] : null;
    const activePeerAvatar =
        toAbsMedia(cachedPeer) ||
        activePeerInline ||
        PLACEHOLDER;

    return (
        <div className="chat-widget-wrapper">
            {/* Sidebar */}
            <div className="chat-widget-sidebar">
                <div className="chat-widget-sidebar-header">
                    <FiMessageSquare /> {t("conversations")} —{" "}
                    <span className="chat-widget-role">{roleLabel()}</span>
                </div>
                <div className="chat-widget-sidebar-search">
                    <FiSearch />
                    <input
                        placeholder={t("search")}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>

                <div className="chat-widget-conv-list">
                    {loadingConv && (
                        <div className="chat-widget-loading">{t("loading")}...</div>
                    )}
                    {!loadingConv &&
                        conversations.map((c) => (
                            <div
                                key={c.id}
                                className={`chat-widget-conv-item ${activeConvId === c.id ? "active" : ""}`}
                                onClick={() => setActiveConv(c)}
                            >
                                <img
                                    src={toAbsMedia(
                                        avatarCacheRef.current[c?.other_user?.id] || c._other_avatar
                                    )}
                                    alt={c.other_user?.full_name || c.other_user?.email || "avatar"}
                                    className="chat-widget-avatar"
                                    onError={(e) => {
                                        e.currentTarget.src = PLACEHOLDER;
                                    }}
                                />
                                <div className="chat-widget-conv-meta">
                                    <div className="chat-widget-conv-top">
                                        <div className="chat-widget-conv-name">
                                            {c.other_user?.full_name || c.other_user?.email}
                                        </div>
                                        {c.unread_count > 0 && (
                                            <span className="chat-widget-badge">{c.unread_count}</span>
                                        )}
                                    </div>
                                    <div className="chat-widget-conv-last">
                                        {c.last_message?.content || ""}
                                    </div>
                                </div>
                            </div>
                        ))}
                    {!loadingConv && conversations.length === 0 && (
                        <div className="chat-widget-empty">{t("no_conversations")}</div>
                    )}
                </div>
            </div>

            {/* Panel */}
            <div className="chat-widget-panel">
                {!activeConv ? (
                    <div className="chat-widget-empty">{t("select_conversation")}</div>
                ) : (
                    <>
                        <div className="chat-widget-panel-header">
                            <img
                                src={activePeerAvatar}
                                className="chat-widget-avatar"
                                alt={
                                    activeConv.other_user?.full_name ||
                                    activeConv.other_user?.email ||
                                    "avatar"
                                }
                                onError={(e) => {
                                    e.currentTarget.src = PLACEHOLDER;
                                }}
                            />
                            <div className="chat-widget-peer">
                                <div className="chat-widget-peer-name">
                                    <FiUser />{" "}
                                    {activeConv.other_user?.full_name || activeConv.other_user?.email}
                                </div>
                                <div className="chat-widget-peer-sub">
                                    <FiCircle /> {t("online")}
                                </div>
                            </div>
                        </div>

                        <div className="chat-widget-message-list" ref={listRef}>
                            {loadingMsg && (
                                <div className="chat-widget-loading">{t("loading")}...</div>
                            )}
                            {!loadingMsg &&
                                messages.map((m) => (
                                    <div
                                        key={m.id}
                                        className={`chat-widget-message ${m.is_mine ? "mine" : "theirs"}`}
                                    >
                                        <div className="chat-widget-bubble">
                                            <div className="chat-widget-content">{m.content}</div>
                                            <div className="chat-widget-meta">
                        <span>
                          {new Date(m.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                          })}
                        </span>
                                                {m.is_mine && (
                                                    <span className="chat-widget-status">
                            {m.is_read ? <FiCheckCircle /> : <FiCircle />}
                          </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                        </div>

                        <div className="chat-widget-composer">
                            <input
                                placeholder={t("type_a_message")}
                                value={composer}
                                onChange={(e) => setComposer(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        sendMessage();
                                    }
                                }}
                            />
                            <button
                                className="chat-widget-send"
                                onClick={sendMessage}
                                title={t("send")}
                            >
                                <FiSend />
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
