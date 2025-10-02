// src/pages/ChatPage.jsx
// (fixed: correct sticky offsets, mobile-safe height, full i18n)
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Send, MoreVertical, Smile, ArrowLeft, Search } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import * as chatApi from "../api/chat";
import { getAccess } from "../api/api";
import { useSearchParams } from "react-router-dom";

/** ================= WS (same-origin, Nginx proxy) ================ */
const WS_BASE = (process.env.REACT_APP_WS_ORIGIN ?? "/ws/").replace(/\/+$/, "/");
function buildWsUrl(convId, token) {
    const isHttps = window.location.protocol === "https:";
    const proto = isHttps ? "wss" : "ws";
    const host = window.location.host;
    return `${proto}://${host}${WS_BASE}chat/${convId}/?token=${encodeURIComponent(token)}`;
}
const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 15000];

/** ================= Helpers ================= */
const isNearBottom = (el, threshold = 120) => {
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
};
function decodeJwtUserId(token) {
    try {
        const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
        return payload.user_id || payload.sub || payload.id || null;
    } catch {
        return null;
    }
}
function getInitials(nameLike) {
    const s = String(nameLike || "").trim();
    if (!s) return "U";
    const parts = s.split(/\s+/).slice(0, 2);
    const letters = parts.map((p) => p[0]).join("");
    return (letters || "U").toUpperCase();
}
function normalizeUrl(u) {
    if (!u) return null;
    try {
        const url = new URL(u, window.location.origin);
        const badHost = /(^backend(\:\d+)?$)|(^localhost\:8000$)/i.test(url.host);
        if (badHost) return `${window.location.origin}${url.pathname}${url.search}`;
        return url.toString();
    } catch {
        if (String(u).startsWith("/")) return `${window.location.origin}${u}`;
        return u;
    }
}
function cacheBust(url, key) {
    if (!url) return url;
    const v = String(key || Date.now());
    try {
        const u = new URL(url);
        if (!u.searchParams.has("v")) u.searchParams.set("v", v);
        return u.toString();
    } catch {
        const sep = url.includes("?") ? "&" : "?";
        return `${url}${sep}v=${encodeURIComponent(v)}`;
    }
}

/** GuideProfile dagidek: avatar_url || avatar || user.avatar_url */
function pickAnyAvatarUrl(userLike, bustKey) {
    if (!userLike) return null;
    const raw =
        userLike.avatar_url ||
        userLike.avatar ||
        (userLike.user ? userLike.user.avatar_url || userLike.user.avatar : null);
    if (!raw) return null;
    return cacheBust(normalizeUrl(raw), bustKey);
}

/** Reusable Avatar */
const UserAvatar = ({ src, name, size = 40, className = "" }) => {
    const [broken, setBroken] = useState(false);
    const initials = getInitials(name);
    const base =
        "rounded-full object-cover bg-gray-200 dark:bg-dark-700 text-gray-700 dark:text-gray-200 flex items-center justify-center select-none";
    if (!src || broken) {
        return (
            <div className={`${base} ${className}`} style={{ width: size, height: size }} title={name}>
                <span className="font-semibold">{initials}</span>
            </div>
        );
    }
    return (
        <img
            src={src}
            alt={name}
            onError={() => setBroken(true)}
            className={`${base} ${className}`}
            style={{ width: size, height: size }}
        />
    );
};

const TypingDots = () => (
    <div className="inline-flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.2s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.1s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" />
    </div>
);

/** ================= Page ================= */
const ChatPage = () => {
    const { t } = useLanguage();
    const [searchParams] = useSearchParams();

    // UI
    const [message, setMessage] = useState("");
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [query, setQuery] = useState("");

    // Data
    const [conversations, setConversations] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [convLoading, setConvLoading] = useState(true);
    const [msgLoading, setMsgLoading] = useState(false);
    const [msgError, setMsgError] = useState("");

    // Pagination
    const [msgPage, setMsgPage] = useState(1);
    const [hasNextMsgs, setHasNextMsgs] = useState(false);

    // Typing
    const [isOtherTyping, setIsOtherTyping] = useState(false);
    const typingTimeoutRef = useRef(null);

    // WS
    const wsRef = useRef(null);
    const reconnectAttemptRef = useRef(0);
    const pingTimerRef = useRef(null);
    const wsConvRef = useRef(null);
    const wsUrlRef = useRef(null);

    // Layout
    const [isMobile, setIsMobile] = useState(() => window.matchMedia("(max-width: 1023px)").matches);
    const [showListMobile, setShowListMobile] = useState(true);

    // Scroll
    const listRef = useRef(null);

    /** ===== Mobile-safe 100vh + safe-area & navbar offset ===== */
    useEffect(() => {
        const setVh = () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty("--app-vh", `${vh}px`);
            // iOS safe-areas
            document.documentElement.style.setProperty("--safe-top", "env(safe-area-inset-top, 0px)");
            document.documentElement.style.setProperty("--safe-bottom", "env(safe-area-inset-bottom, 0px)");
        };
        setVh();
        window.addEventListener("resize", setVh);
        window.addEventListener("orientationchange", setVh);
        return () => {
            window.removeEventListener("resize", setVh);
            window.removeEventListener("orientationchange", setVh);
        };
    }, []);

    // If you have a fixed top navbar ~64px (h-16), we account for it
    const WRAPPER_STYLE = {
        // Height excludes the fixed navbar + safe-area top
        height: "calc(var(--app-vh, 1vh) * 100 - var(--top-offset, 0px))",
        // 4rem (64px) + safe-area top
        ["--top-offset"]: "calc(4rem + var(--safe-top, 0px))",
        ["--safe-bottom"]: "var(--safe-bottom, 0px)",
    };

    useEffect(() => {
        const m = window.matchMedia("(max-width: 1023px)");
        const handler = () => setIsMobile(m.matches);
        m.addEventListener?.("change", handler);
        return () => m.removeEventListener?.("change", handler);
    }, []);

    const commonEmojis = useMemo(
        () => [
            "😀","😁","😂","🤣","😊","😉","😍","🥰","😘","😜","🤓","😎","🤩","🥳","😏","😢","😭","👍","👌","✌️","👏","🙌","🙏","💪","🎉","❤️","💔",
        ],
        []
    );

    /** ===== Helpers ===== */
    const myUserId = useMemo(() => decodeJwtUserId(getAccess() || ""), []);

    const normalizeMsg = (m) => {
        const mine =
            m?.is_mine ??
            (m?.sender?.id && myUserId ? String(m.sender.id) === String(myUserId) : false);
        const senderName = m?.sender?.full_name || m?.sender?.email || t("chat.user");
        const senderAvatar = pickAnyAvatarUrl(
            m?.sender,
            m?.sender?.avatar_updated_at || m?.created_at
        );
        return {
            id: m.id,
            sender: mine ? "me" : "other",
            content: m.content,
            timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            type: "text",
            is_read: !!m.is_read,
            senderName,
            senderAvatar,
        };
    };

    const appendIncomingMessage = (msg) => {
        const atBottom = isNearBottom(listRef.current);
        setMessages((prev) => (prev.some((x) => x.id === msg.id) ? prev : [...prev, normalizeMsg(msg)]));
        queueMicrotask(() => {
            if (atBottom && listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
        });
    };

    const pickName = (chat) => chat?.other_user?.full_name || chat?.other_user?.email || t("chat.user");
    const pickHeaderAvatar = (chat) =>
        pickAnyAvatarUrl(chat?.other_user, chat?.other_user?.avatar_updated_at || chat?.updated_at);

    /** ================= WebSocket ================= */
    const openWebSocket = (convId) => {
        const token = getAccess();
        if (!token) return;

        const url = buildWsUrl(convId, token);
        if (
            wsRef.current &&
            wsRef.current.readyState <= 1 &&
            wsConvRef.current === convId &&
            wsUrlRef.current === url
        ) {
            return;
        }
        if (wsRef.current) {
            try {
                wsRef.current.close();
            } catch {}
            wsRef.current = null;
        }
        if (pingTimerRef.current) {
            clearInterval(pingTimerRef.current);
            pingTimerRef.current = null;
        }

        const ws = new WebSocket(url);
        wsRef.current = ws;
        wsConvRef.current = convId;
        wsUrlRef.current = url;

        ws.onopen = () => {
            reconnectAttemptRef.current = 0;
            pingTimerRef.current = setInterval(() => {
                if (ws.readyState === 1) {
                    try {
                        ws.send(JSON.stringify({ type: "ping" }));
                    } catch {}
                }
            }, 25000);
        };

        ws.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data);
                const type = data.type;
                const msg = data.message || data.payload || data.msg || null;

                if (type === "chat_message" || type === "message" || type === "new_message") {
                    const conv = msg?.conversation ?? data.conversation ?? data.conversation_id;
                    if (Number(conv) === Number(convId) && msg) appendIncomingMessage(msg);
                    return;
                }
                if (type === "typing_indicator" || type === "typing") {
                    setIsOtherTyping(Boolean(data.is_typing));
                    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                    typingTimeoutRef.current = setTimeout(() => setIsOtherTyping(false), 2500);
                }
            } catch {
                /* ignore */
            }
        };

        ws.onclose = (e) => {
            if (pingTimerRef.current) {
                clearInterval(pingTimerRef.current);
                pingTimerRef.current = null;
            }
            const shouldReconnect = ![1000, 1001].includes(e.code);
            if (shouldReconnect) {
                const n = reconnectAttemptRef.current;
                const delay = RECONNECT_DELAYS[Math.min(n, RECONNECT_DELAYS.length - 1)];
                reconnectAttemptRef.current = n + 1;
                setTimeout(() => {
                    if (selectedChat === convId) openWebSocket(convId);
                }, delay);
            }
        };

        ws.onerror = () => {
            try {
                ws.close();
            } catch {}
        };
    };

    const sendTyping = () => {
        const ws = wsRef.current;
        if (ws && ws.readyState === 1) {
            try {
                ws.send(JSON.stringify({ type: "typing", is_typing: true }));
            } catch {}
        }
    };

    /** ================= Load conversations ================= */
    useEffect(() => {
        (async () => {
            setConvLoading(true);
            try {
                const res = await chatApi.getConversations().then((r) => r?.data ?? r);
                const items = Array.isArray(res?.results) ? res.results : Array.isArray(res) ? res : [];

                // avatar_url || avatar || user.avatar_url — GuideProfile bilan bir xil
                const normalized = items.map((it) => ({
                    ...it,
                    other_user: {
                        ...it.other_user,
                        avatar_url: pickAnyAvatarUrl(
                            it.other_user,
                            it?.other_user?.avatar_updated_at || it?.updated_at
                        ),
                    },
                }));

                setConversations(normalized);

                const c = searchParams.get("c");
                const userId = searchParams.get("user");

                let initial = null;
                if (c && normalized.find((x) => String(x.id) === String(c))) initial = Number(c);
                else if (userId) {
                    const found = normalized.find((x) => String(x?.other_user?.id) === String(userId));
                    if (found?.id) initial = found.id;
                } else if (!selectedChat && normalized.length) {
                    initial = normalized[0].id;
                }
                if (initial) {
                    setSelectedChat(initial);
                    if (isMobile) setShowListMobile(false);
                }
            } catch {
                setConversations([]);
            } finally {
                setConvLoading(false);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const openChat = (id) => {
        setSelectedChat(id);
        if (isMobile) setShowListMobile(false);
    };
    const goBackToList = () => {
        if (isMobile) setShowListMobile(true);
    };

    /** ================= Load messages & WS ================= */
    useEffect(() => {
        if (!selectedChat) return;

        (async () => {
            setMsgLoading(true);
            setMsgError("");
            setMessages([]);
            setMsgPage(1);
            setHasNextMsgs(false);

            try {
                const res = await chatApi.getMessages(selectedChat, { page: 1 }).then((r) => r?.data ?? r);
                const arr = Array.isArray(res?.results) ? res.results : Array.isArray(res) ? res : [];
                const asc = [...arr].reverse();
                setMessages(asc.map(normalizeMsg));
                setHasNextMsgs(Boolean(res?.next));

                chatApi.markMessagesRead(selectedChat).catch(() => {});
                openWebSocket(selectedChat);

                queueMicrotask(() => {
                    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
                });
            } catch {
                setMsgError(t("chat.errLoadMessages"));
            } finally {
                setMsgLoading(false);
            }
        })();

        return () => {
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            setIsOtherTyping(false);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedChat, t]);

    /** ================= Load older ================= */
    const [loadingOlderLock, setLoadingOlderLock] = useState(false);
    const loadOlder = async () => {
        if (!hasNextMsgs || msgLoading || loadingOlderLock) return;
        setLoadingOlderLock(true);

        const container = listRef.current;
        const oldScrollHeight = container?.scrollHeight ?? 0;

        const nextPage = msgPage + 1;
        setMsgLoading(true);
        try {
            const res = await chatApi.getMessages(selectedChat, { page: nextPage }).then((r) => r?.data ?? r);
            const arr = Array.isArray(res?.results) ? res.results : Array.isArray(res) ? res : [];
            const olderAsc = [...arr].reverse().map(normalizeMsg);
            setMessages((prev) => [...olderAsc, ...prev]);
            setHasNextMsgs(Boolean(res?.next));
            setMsgPage(nextPage);

            // joyini saqlash
            queueMicrotask(() => {
                if (container) {
                    const newScrollHeight = container.scrollHeight;
                    container.scrollTop = newScrollHeight - oldScrollHeight;
                }
            });
        } catch {
            /* ignore */
        } finally {
            setMsgLoading(false);
            setLoadingOlderLock(false);
        }
    };

    /** ================= Send message ================= */
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!selectedChat) return;
        if (!message.trim()) return;

        const content = message.trim();

        const optimistic = {
            id: `tmp-${Date.now()}`,
            sender: "me",
            content,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            type: "text",
            is_read: false,
            senderName: t("chat.me"),
            senderAvatar: null, // WS kelgach to‘liq ma’lumot bilan yangilanadi
        };

        const atBottom = isNearBottom(listRef.current);
        setMessages((prev) => [...prev, optimistic]);

        queueMicrotask(() => {
            if (atBottom && listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
        });

        try {
            await chatApi.createMessage({ conversation: selectedChat, content });
            // haqiqiy xabar WS orqali keladi
        } catch {
            setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
            alert(t("chat.errSend"));
        } finally {
            setMessage("");
        }
    };

    // Typing
    useEffect(() => {
        if (!message) return;
        const id = setTimeout(() => sendTyping(), 200);
        return () => clearTimeout(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [message]);

    // Tab visible → WS tekshirish
    useEffect(() => {
        const onVis = () => {
            const ws = wsRef.current;
            if (document.visibilityState === "visible" && selectedChat) {
                if (!ws || ws.readyState > 1) openWebSocket(selectedChat);
            }
        };
        document.addEventListener("visibilitychange", onVis);
        return () => document.removeEventListener("visibilitychange", onVis);
    }, [selectedChat]);

    // Unmount – WS yopish
    useEffect(() => {
        return () => {
            if (pingTimerRef.current) {
                clearInterval(pingTimerRef.current);
                pingTimerRef.current = null;
            }
            if (wsRef.current) {
                try {
                    wsRef.current.close(1000, "component unmount");
                } catch {}
                wsRef.current = null;
            }
        };
    }, []);

    /** ================= Render ================= */
    const filteredConvs = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return conversations;
        return conversations.filter((c) =>
            (pickName(c) || "").toLowerCase().includes(q) ||
            (c.last_message?.content || "").toLowerCase().includes(q)
        );
    }, [conversations, query]);

    const current = conversations.find((c) => c.id === selectedChat) || null;

    return (
        <div
            className="bg-gray-50 dark:bg-dark-950 transition-colors"
            style={WRAPPER_STYLE}
        >
            <div className="mx-auto h-full flex lg:max-w-7xl lg:px-8 lg:flex-row flex-col">
                {/* ======= Sidebar (contacts) ======= */}
                <div
                    className={`bg-white dark:bg-dark-900 border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-dark-800 flex-shrink-0 flex flex-col transition-all duration-200 min-h-0 ${
                        isMobile ? (showListMobile ? "block" : "hidden") : "block"
                    } ${isMobile ? "w-full" : "w-1/3"}`}
                >
                    {/* Sticky header under navbar */}
                    <div className="sticky top-[var(--top-offset)] z-10 p-4 bg-white dark:bg-dark-900 border-b border-gray-200 dark:border-dark-800">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t("chat.title")}</h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{t("chat.description")}</p>
                        <div className="mt-3 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder={t("chat.searchConversations")}
                                className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-dark-700 bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto min-h-0">
                        {convLoading ? (
                            <div className="p-4 text-center text-gray-500 dark:text-gray-400">{t("common.loading")}</div>
                        ) : filteredConvs.length ? (
                            filteredConvs.map((chat) => {
                                const name = pickName(chat);
                                const avatar = pickHeaderAvatar(chat);
                                return (
                                    <div
                                        key={chat.id}
                                        onClick={() => openChat(chat.id)}
                                        className={`p-4 border-b border-gray-100 dark:border-dark-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-800 transition-colors ${
                                            selectedChat === chat.id && !isMobile
                                                ? "bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500"
                                                : ""
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <UserAvatar src={avatar} name={name} size={48} className="w-12 h-12" />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <h3 className="font-medium text-gray-900 dark:text-white truncate">{name}</h3>
                                                    <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(chat.updated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                                                        {Number(chat.unread_count) > 0 && (
                                                            <span className="bg-blue-600 text-white text-xs rounded-full min-w-5 h-5 px-1.5 flex items-center justify-center">
                                {chat.unread_count}
                              </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                                                    {chat.last_message?.content || "—"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="p-6 text-center text-gray-500 dark:text-gray-400">{t("chat.noConversations")}</div>
                        )}
                    </div>
                </div>

                {/* ======= Chat area ======= */}
                <div
                    className={`flex-1 flex flex-col min-h-0 ${
                        isMobile ? (showListMobile ? "hidden" : "flex") : "flex"
                    }`}
                >
                    {current ? (
                        <>
                            {/* Header (sticky) */}
                            <div className="sticky top-[var(--top-offset)] z-10 bg-white dark:bg-dark-900 p-3 lg:p-4 border-b border-gray-200 dark:border-dark-800 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {isMobile && (
                                        <button
                                            onClick={goBackToList}
                                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-800 text-gray-700 dark:text-gray-300"
                                            aria-label={t("chat.back")}
                                        >
                                            <ArrowLeft className="w-5 h-5" />
                                        </button>
                                    )}

                                    <UserAvatar
                                        src={pickHeaderAvatar(current)}
                                        name={pickName(current)}
                                        size={40}
                                        className="w-10 h-10"
                                    />
                                    <div>
                                        <h3 className="font-semibold text-gray-900 dark:text-white">{pickName(current)}</h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {isOtherTyping ? <TypingDots /> : t("chat.onlineNow")}
                                        </p>
                                    </div>
                                </div>

                                <button className="text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-800" aria-label={t("chat.more")}>
                                    <MoreVertical className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Messages (fills available space, scrollable) */}
                            <div
                                ref={listRef}
                                className="flex-1 overflow-y-auto p-3 lg:p-4 space-y-4 bg-gray-50 dark:bg-dark-950 min-h-0 overscroll-contain"
                            >
                                {hasNextMsgs && (
                                    <div className="text-center">
                                        <button
                                            onClick={loadOlder}
                                            disabled={msgLoading}
                                            className="px-3 py-1 text-sm border rounded-lg bg-white dark:bg-dark-900 border-gray-200 dark:border-dark-700 hover:bg-gray-50 dark:hover:bg-dark-800 disabled:opacity-50"
                                        >
                                            {msgLoading ? t("common.loading") : t("chat.loadOlder")}
                                        </button>
                                    </div>
                                )}

                                {msgLoading && !messages.length ? (
                                    <div className="text-center text-gray-500 dark:text-gray-400">{t("common.loading")}</div>
                                ) : msgError ? (
                                    <div className="text-center text-red-600">{msgError}</div>
                                ) : (
                                    messages.map((msg) => (
                                        <div
                                            key={msg.id}
                                            className={`flex items-start gap-2 ${msg.sender === "me" ? "justify-end" : "justify-start"}`}
                                        >
                                            {msg.sender !== "me" && (
                                                <UserAvatar
                                                    src={msg.senderAvatar}
                                                    name={msg.senderName}
                                                    size={32}
                                                    className="w-8 h-8 mt-2"
                                                />
                                            )}
                                            <div
                                                className={`${
                                                    msg.sender === "me"
                                                        ? "bg-blue-600 text-white rounded-l-xl rounded-tr-xl"
                                                        : "bg-white dark:bg-dark-800 text-gray-900 dark:text-white rounded-r-xl rounded-tl-xl border border-gray-200 dark:border-dark-700"
                                                } px-3 py-2 shadow-sm max-w-[80%]`}
                                            >
                                                <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                                                <p
                                                    className={`text-[10px] mt-1 ${
                                                        msg.sender === "me" ? "text-blue-100" : "text-gray-500 dark:text-gray-400"
                                                    }`}
                                                >
                                                    {msg.timestamp}
                                                </p>
                                            </div>
                                            {msg.sender === "me" && (
                                                <UserAvatar
                                                    src={msg.senderAvatar}
                                                    name={msg.senderName}
                                                    size={32}
                                                    className="w-8 h-8 mt-2"
                                                />
                                            )}
                                        </div>
                                    ))
                                )}

                                {isOtherTyping && (
                                    <div className="flex justify-start items-start gap-2">
                                        <UserAvatar
                                            src={pickHeaderAvatar(current)}
                                            name={pickName(current)}
                                            size={32}
                                            className="w-8 h-8 mt-2"
                                        />
                                        <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-r-xl rounded-tl-xl px-3 py-2">
                                            <TypingDots />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Composer (sticky at bottom, safe-area aware) */}
                            <div className="sticky bottom-[var(--safe-bottom)] z-10 bg-white/95 dark:bg-dark-900/95 backdrop-blur supports-[backdrop-filter]:bg-white/70 border-t border-gray-200 dark:border-dark-800">
                                <form onSubmit={handleSendMessage} className="p-3 lg:p-4 relative">
                                    {/* Emoji picker anchored above composer */}
                                    {showEmojiPicker && (
                                        <div className="absolute bottom-full mb-2 left-0 right-0 max-h-56 overflow-y-auto p-3 bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-lg shadow-xl">
                                            <div className="grid grid-cols-10 gap-2">
                                                {commonEmojis.map((emoji, i) => (
                                                    <button
                                                        key={i}
                                                        type="button"
                                                        onClick={() => {
                                                            setMessage((prev) => prev + emoji);
                                                            setShowEmojiPicker(false);
                                                            sendTyping();
                                                        }}
                                                        className="text-xl hover:bg-gray-100 dark:hover:bg-dark-700 rounded p-1"
                                                        aria-label={t("chat.insertEmoji")}
                                                    >
                                                        {emoji}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 relative">
                                            <input
                                                type="text"
                                                value={message}
                                                onChange={(e) => setMessage(e.target.value)}
                                                placeholder={t("chat.typeMessage")}
                                                className="w-full pr-12 pl-3 py-3 rounded-lg border border-gray-300 dark:border-dark-700 bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowEmojiPicker((s) => !s)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400 hover:text-blue-600"
                                                aria-label={t("chat.emojis")}
                                            >
                                                <Smile className="h-5 w-5" />
                                            </button>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={!message.trim()}
                                            className="bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                            aria-label={t("chat.send")}
                                        >
                                            <Send className="h-5 w-5" />
                                        </button>
                                    </div>

                                    <div className="mt-2 text-center">
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{t("chat.rtcEnabled")}</p>
                                    </div>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div
                            className={`flex-1 min-h-0 ${isMobile ? "hidden" : "flex"} items-center justify-center text-gray-500 dark:text-gray-400`}
                        >
                            {t("chat.selectConversation")}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChatPage;
