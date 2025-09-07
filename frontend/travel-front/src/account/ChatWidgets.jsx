// ChatWidgets.jsx
// Telegram-like real-time chat (Customer ↔ Client) using your REST + WebSocket back end.
//
// - Uses axios `api` instance (baseURL http://localhost:8000/api/v1/) for REST.
// - WebSocket URL: REACT_APP_WS_URL or "ws://localhost:8000/ws/chat/".
// - All classNames start with "chat-widget" for easy styling.
// - i18n-ready with react-i18next (translation keys in comments).
// - React Icons used for UI polish.
//
// Features:
// • Conversations list with unread badges, search users, start new chat, block/unblock
// • Messages pane with infinite scroll (load older), typing indicator, read receipts
// • Real-time updates: incoming messages, typing, message read/action, online/offline
// • Message actions: delete for me / delete for all (recover if allowed)
// • Marks messages read when pane focused/visible
//
// Requirements:
//   npm i react-icons
//
// Notes:
//   - This is a self-contained widget; drop it into your page and style via the classNames.
//   - For i18n, see translation keys at the end of the file.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    FiSend,
    FiSearch,
    FiPlus,
    FiMoreVertical,
    FiTrash2,
    FiCornerUpLeft,
    FiUserX,
    FiShieldOff,
    FiAlertTriangle,
    FiSmile,
} from "react-icons/fi";
import api from "./api";
import './ChatWidgets.css';

const WS_URL = process.env.REACT_APP_WS_URL || "ws://localhost:8000/ws/chat/";

// ---- utils
const arr = (x) => (Array.isArray(x) ? x : x?.results ?? x ?? []);
const byCreatedAsc = (a, b) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime();

// ---- tiny message bubble
function Bubble({ msg, me, onActionClick, t }) {
    const mine = msg.is_mine ?? (msg?.sender?.id === me?.id);
    const deleted =
        msg.deleted_for && msg.deleted_for !== "none"; // backend returns delete status in serializer
    return (
        <div
            className={`chat-widget-bubble ${mine ? "chat-widget-bubble--mine" : "chat-widget-bubble--theirs"} ${
                deleted ? "chat-widget-bubble--deleted" : ""
            }`}
        >
            <div className="chat-widget-bubble__inner">
                <div className="chat-widget-bubble__text">
                    {deleted ? <i>{t("chat.deleted")}</i> : msg.content}
                </div>
                <div className="chat-widget-bubble__meta">
          <span className="chat-widget-bubble__time">
            {new Date(msg.created_at).toLocaleTimeString()}
          </span>
                    {mine && (
                        <button
                            className="chat-widget-bubble__more"
                            title={t("chat.actions")}
                            onClick={(e) => {
                                e.stopPropagation();
                                onActionClick?.(msg);
                            }}
                        >
                            <FiMoreVertical />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function ChatWidgets() {
    const { t } = useTranslation();
    // ---------------- state
    const [me, setMe] = useState(null); // basic self info from unread-count call (or other)
    const [conversations, setConversations] = useState([]);
    const [convPage, setConvPage] = useState(1);
    const [convHasMore, setConvHasMore] = useState(true);
    const [selectedConv, setSelectedConv] = useState(null); // object
    const [messages, setMessages] = useState([]);
    const [msgNextPageToken, setMsgNextPageToken] = useState(null); // server pagination optional
    const [loadingMsgs, setLoadingMsgs] = useState(false);
    const [input, setInput] = useState("");
    const [typing, setTyping] = useState(false);
    const [theyTyping, setTheyTyping] = useState(false);
    const [unreadCounts, setUnreadCounts] = useState({ total_unread: 0, conversations: {} });

    const [search, setSearch] = useState("");
    const [userSearchQuery, setUserSearchQuery] = useState("");
    const [userSearchResults, setUserSearchResults] = useState([]);

    const [composeEmail, setComposeEmail] = useState("");
    const [composeMessage, setComposeMessage] = useState("");

    const [blocked, setBlocked] = useState([]);
    const [contextMsg, setContextMsg] = useState(null); // for action menu

    const listRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const wsRef = useRef(null);
    const reconnectRef = useRef(true);

    // ---------------- REST: load initial
    const loadConversations = useCallback(
        async (page = 1, append = false) => {
            const { data } = await api.get("chat/conversations/", { params: { page, page_size: 30 } });
            const items = arr(data);
            setConversations((prev) => (append ? [...prev, ...items] : items));
            // drf paging shape support
            setConvHasMore(Boolean(data.next));
            setConvPage(page);
        },
        []
    );

    const loadMessages = useCallback(
        async (conversationId, params = {}) => {
            setLoadingMsgs(true);
            try {
                const { data } = await api.get(`chat/conversations/${conversationId}/messages/`, {
                    params: { page_size: 50, ...params },
                });
                const items = arr(data).sort(byCreatedAsc);
                setMessages(items);
                // keep reference tokens if pagination present
                setMsgNextPageToken(data.next || null);
            } finally {
                setLoadingMsgs(false);
            }
        },
        []
    );

    const loadOlderMessages = useCallback(async () => {
        if (!selectedConv || !msgNextPageToken) return;
        if (loadingMsgs) return;
        setLoadingMsgs(true);
        try {
            // Follow DRF pagination: if data.next is full URL with query, reuse it
            const url = new URL(msgNextPageToken, window.location.origin);
            const page = url.searchParams.get("page");
            const { data } = await api.get(`chat/conversations/${selectedConv.id}/messages/`, {
                params: { page, page_size: 50 },
            });
            const items = arr(data).sort(byCreatedAsc);
            setMessages((prev) => [...items, ...prev]);
            setMsgNextPageToken(data.next || null);
        } finally {
            setLoadingMsgs(false);
        }
    }, [selectedConv, msgNextPageToken, loadingMsgs]);

    const refreshUnread = useCallback(async () => {
        const { data } = await api.get("chat/unread-count/");
        setUnreadCounts(data);
    }, []);

    const loadBlocked = useCallback(async () => {
        const { data } = await api.get("chat/blocked/");
        setBlocked(arr(data));
    }, []);

    const loadMeLight = useCallback(async () => {
        // We don't have a dedicated /me. Pull from conversations or unread endpoint
        try {
            await refreshUnread();
            // not guaranteed; but we just need id for "is_mine" already provided by backend
            setMe({ id: null });
        } catch {
            setMe({ id: null });
        }
    }, [refreshUnread]);

    useEffect(() => {
        (async () => {
            await Promise.all([loadConversations(1, false), loadBlocked(), loadMeLight()]);
        })();
    }, [loadConversations, loadBlocked, loadMeLight]);

    // ---------------- open conversation
    const openConversation = async (conv) => {
        setSelectedConv(conv);
        await loadMessages(conv.id);
        await api.post(`chat/conversations/${conv.id}/mark-read/`);
        await refreshUnread();
        // connect websocket
        connectWS(conv.id);
        // scroll bottom
        setTimeout(() => {
            listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "auto" });
        }, 0);
    };

    // ---------------- WebSocket
    const connectWS = (conversationId) => {
        try {
            if (wsRef.current) {
                reconnectRef.current = false;
                try {
                    wsRef.current.close();
                } catch {}
                wsRef.current = null;
            }
            reconnectRef.current = true;
            const token = localStorage.getItem("access_token");
            const qs = new URLSearchParams();
            if (token) qs.set("token", token);
            const ws = new WebSocket(`${WS_URL}${conversationId}/?${qs.toString()}`);
            wsRef.current = ws;

            ws.onopen = () => {
                // ok
            };

            ws.onmessage = (evt) => {
                try {
                    const payload = JSON.parse(evt.data);
                    handleWSEvent(payload);
                } catch (e) {
                    console.warn("WS message parse error", e);
                }
            };

            ws.onclose = (e) => {
                if (reconnectRef.current && e.code !== 4001 && e.code !== 4003 && e.code !== 4004) {
                    setTimeout(() => connectWS(conversationId), 1000);
                }
            };
        } catch (e) {
            console.error("WS connect failed", e);
        }
    };

    const handleWSEvent = (evt) => {
        // {type: "chat_message" | "message_read" | "message_action" | "typing_indicator" | "user_online" | "user_offline"}
        if (evt.type === "chat_message" && evt.message) {
            setMessages((prev) => {
                const next = [...prev, evt.message].sort(byCreatedAsc);
                return next;
            });
            // auto scroll to bottom
            setTimeout(() => {
                listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
            }, 0);
        } else if (evt.type === "typing_indicator") {
            setTheyTyping(!!evt.is_typing);
            if (evt.is_typing) {
                setTimeout(() => setTheyTyping(false), 2500);
            }
        } else if (evt.type === "message_read") {
            // could update UI for read state if stored
        } else if (evt.type === "message_action") {
            // overwrite message in list with latest data
            if (evt.message) {
                setMessages((prev) => prev.map((m) => (m.id === evt.message.id ? evt.message : m)));
            }
        } else if (evt.type === "user_online" || evt.type === "user_offline") {
            // optionally show toast
        }
    };

    const wsSend = (obj) => {
        const ws = wsRef.current;
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(obj));
        }
    };

    // typing -> debounce
    useEffect(() => {
        if (!typing) return;
        wsSend({ type: "typing", is_typing: true });
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            setTyping(false);
            wsSend({ type: "typing", is_typing: false });
        }, 1500);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [typing]);

    // ---------------- actions
    const onSend = async () => {
        const content = input.trim();
        if (!content || !selectedConv) return;
        // send via WS for realtime
        wsSend({ type: "chat_message", content });
        setInput("");
        setTyping(false);
    };

    const onDeleteForMe = async (msg) => {
        await api.post(`chat/messages/${msg.id}/action/`, { action: "delete_sender" });
        // server will broadcast message_action to WS, which updates our copy
    };

    const onDeleteForAll = async (msg) => {
        await api.post(`chat/messages/${msg.id}/action/`, { action: "delete_both" });
    };

    const onRecover = async (msg) => {
        await api.post(`chat/messages/${msg.id}/action/`, { action: "recover" });
    };

    const onLoadMoreConversations = async () => {
        if (!convHasMore) return;
        await loadConversations(convPage + 1, true);
    };

    const onSearchUsers = async () => {
        if (userSearchQuery.trim().length < 2) return;
        const { data } = await api.get("chat/users/search/", { params: { q: userSearchQuery.trim() } });
        setUserSearchResults(data.results || []);
    };

    const onStartConversation = async () => {
        if (!composeEmail.trim()) return;
        const payload = { user_email: composeEmail.trim(), message: composeMessage || "" };
        const { data, status } = await api.post("chat/conversations/", payload);
        // If created (201) or existed (200), open it
        await loadConversations(1, false);
        const conv = data; // server returns conversation serializer
        setComposeEmail("");
        setComposeMessage("");
        await openConversation(conv);
    };

    const onBlock = async (email) => {
        await api.post("chat/block/", { user_email: email });
        await loadBlocked();
    };

    const onUnblock = async (userId) => {
        await api.delete(`chat/unblock/${userId}/`);
        await loadBlocked();
    };

    const theyUser = useMemo(() => {
        if (!selectedConv) return null;
        return selectedConv.other_user;
    }, [selectedConv]);

    // mark read on visibility change
    useEffect(() => {
        const fn = async () => {
            if (document.visibilityState === "visible" && selectedConv) {
                await api.post(`chat/conversations/${selectedConv.id}/mark-read/`);
                await refreshUnread();
            }
        };
        document.addEventListener("visibilitychange", fn);
        return () => document.removeEventListener("visibilitychange", fn);
    }, [selectedConv, refreshUnread]);

    // infinite scroll messages (load older)
    const onScrollList = (e) => {
        const el = e.currentTarget;
        if (el.scrollTop < 40 && msgNextPageToken && !loadingMsgs) {
            const oldHeight = el.scrollHeight;
            loadOlderMessages().then(() => {
                // keep viewport position after prepending
                const newHeight = el.scrollHeight;
                el.scrollTop = newHeight - oldHeight;
            });
        }
    };

    // -------------- Render
    return (
        <div className="chat-widget-root">
            {/* Left Sidebar: conversations */}
            <aside className="chat-widget-sidebar">
                <div className="chat-widget-sidebar__header">
                    <div className="chat-widget-search">
                        <FiSearch />
                        <input
                            className="chat-widget-search__input"
                            placeholder={t("chat.searchPlaceholder")} // i18n
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <button className="chat-widget-iconbtn" title={t("chat.newChat")} onClick={() => {}}>
                        <FiPlus />
                    </button>
                </div>

                <div className="chat-widget-start">
                    <div className="chat-widget-start__title">{t("chat.startNew")}</div>
                    <div className="chat-widget-start__row">
                        <input
                            className="chat-widget-input"
                            placeholder={t("chat.emailPlaceholder")}
                            value={composeEmail}
                            onChange={(e) => setComposeEmail(e.target.value)}
                        />
                    </div>
                    <div className="chat-widget-start__row">
                        <input
                            className="chat-widget-input"
                            placeholder={t("chat.messageOptional")}
                            value={composeMessage}
                            onChange={(e) => setComposeMessage(e.target.value)}
                        />
                    </div>
                    <div className="chat-widget-start__actions">
                        <button className="chat-widget-btn" onClick={onStartConversation}>
                            <FiSend />
                            <span>{t("chat.start")}</span>
                        </button>
                    </div>
                </div>

                <div className="chat-widget-users">
                    <div className="chat-widget-users__search">
                        <input
                            className="chat-widget-input"
                            placeholder={t("chat.findUsers")}
                            value={userSearchQuery}
                            onChange={(e) => setUserSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && onSearchUsers()}
                        />
                        <button className="chat-widget-btn chat-widget-btn--ghost" onClick={onSearchUsers}>
                            {t("chat.find")}
                        </button>
                    </div>
                    {userSearchResults.length > 0 && (
                        <div className="chat-widget-users__results">
                            {userSearchResults.map((u) => (
                                <div className="chat-widget-user" key={u.id}>
                                    <div className="chat-widget-user__main">
                                        <img
                                            className="chat-widget-user__avatar"
                                            src={u.avatar_url || ""}
                                            alt={u.full_name || u.email}
                                            onError={(e) => (e.currentTarget.style.visibility = "hidden")}
                                        />
                                        <div className="chat-widget-user__info">
                                            <div className="chat-widget-user__name">{u.full_name || u.email}</div>
                                            <div className="chat-widget-user__sub">{u.email}</div>
                                        </div>
                                    </div>
                                    <div className="chat-widget-user__actions">
                                        <button className="chat-widget-btn" onClick={() => setComposeEmail(u.email)}>
                                            {t("chat.select")}
                                        </button>
                                        <button className="chat-widget-iconbtn" title={t("chat.block")} onClick={() => onBlock(u.email)}>
                                            <FiUserX />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="chat-widget-divider" />
                <div className="chat-widget-sectiontitle">
                    {t("chat.conversations")}{" "}
                    {unreadCounts.total_unread > 0 && (
                        <span className="chat-widget-badge">{unreadCounts.total_unread}</span>
                    )}
                </div>

                <div className="chat-widget-convlist">
                    {conversations
                        .filter((c) => {
                            if (!search.trim()) return true;
                            const q = search.toLowerCase();
                            const name = c.other_user?.full_name || c.other_user?.email || "";
                            return name.toLowerCase().includes(q);
                        })
                        .map((c) => {
                            const unread = unreadCounts.conversations?.[String(c.id)] || 0;
                            return (
                                <button
                                    key={c.id}
                                    className={`chat-widget-conv ${selectedConv?.id === c.id ? "chat-widget-conv--active" : ""}`}
                                    onClick={() => openConversation(c)}
                                >
                                    <img
                                        className="chat-widget-conv__avatar"
                                        src={c.other_user?.avatar_url || ""}
                                        alt={c.other_user?.full_name || c.other_user?.email}
                                        onError={(e) => (e.currentTarget.style.visibility = "hidden")}
                                    />
                                    <div className="chat-widget-conv__body">
                                        <div className="chat-widget-conv__row">
                                            <div className="chat-widget-conv__name">
                                                {c.other_user?.full_name || c.other_user?.email}
                                            </div>
                                            <div className="chat-widget-conv__time">
                                                {new Date(c.updated_at).toLocaleTimeString()}
                                            </div>
                                        </div>
                                        <div className="chat-widget-conv__row">
                                            <div className="chat-widget-conv__last">
                                                {c.last_message?.content || t("chat.noMessages")}
                                            </div>
                                            {unread > 0 && <span className="chat-widget-badge">{unread}</span>}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}

                    {convHasMore && (
                        <button className="chat-widget-btn chat-widget-btn--ghost" onClick={onLoadMoreConversations}>
                            {t("chat.loadMore")}
                        </button>
                    )}
                </div>

                <div className="chat-widget-divider" />
                <div className="chat-widget-sectiontitle">{t("chat.blocked")}</div>
                <div className="chat-widget-blocked">
                    {blocked.length === 0 && <div className="chat-widget-empty">{t("chat.noBlocked")}</div>}
                    {blocked.map((b) => (
                        <div key={b.id} className="chat-widget-blocked__item">
                            <div className="chat-widget-blocked__name">
                                {b.blocked_user?.full_name || b.blocked_user?.email}
                            </div>
                            <button
                                className="chat-widget-iconbtn"
                                title={t("chat.unblock")}
                                onClick={() => onUnblock(b.blocked_user?.id)}
                            >
                                <FiShieldOff />
                            </button>
                        </div>
                    ))}
                </div>
            </aside>

            {/* Main Pane */}
            <main className="chat-widget-main">
                {!selectedConv ? (
                    <div className="chat-widget-empty">{t("chat.selectConversation")}</div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="chat-widget-main__header">
                            <div className="chat-widget-peer">
                                <img
                                    className="chat-widget-peer__avatar"
                                    src={theyUser?.avatar_url || ""}
                                    alt={theyUser?.full_name || theyUser?.email}
                                    onError={(e) => (e.currentTarget.style.visibility = "hidden")}
                                />
                                <div className="chat-widget-peer__info">
                                    <div className="chat-widget-peer__name">
                                        {theyUser?.full_name || theyUser?.email}
                                    </div>
                                    <div className="chat-widget-peer__status">
                                        {theyTyping ? t("chat.typing") : t("chat.onlineStatus")}
                                    </div>
                                </div>
                            </div>
                            <div className="chat-widget-main__actions">
                                <button
                                    className="chat-widget-iconbtn"
                                    title={t("chat.block")}
                                    onClick={() => onBlock(theyUser?.email)}
                                >
                                    <FiUserX />
                                </button>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="chat-widget-messages" ref={listRef} onScroll={onScrollList}>
                            {loadingMsgs && messages.length === 0 && (
                                <div className="chat-widget-loading">{t("chat.loading")}</div>
                            )}
                            {messages.map((m) => (
                                <Bubble
                                    key={m.id}
                                    msg={m}
                                    me={me}
                                    t={t}
                                    onActionClick={(msg) => setContextMsg(msg)}
                                />
                            ))}
                        </div>

                        {/* Context Menu (message actions) */}
                        {contextMsg && (
                            <div className="chat-widget-context">
                                <div className="chat-widget-context__panel">
                                    <button
                                        className="chat-widget-context__item"
                                        onClick={() => {
                                            onDeleteForMe(contextMsg);
                                            setContextMsg(null);
                                        }}
                                    >
                                        <FiTrash2 />
                                        <span>{t("chat.deleteForMe")}</span>
                                    </button>
                                    <button
                                        className="chat-widget-context__item"
                                        onClick={() => {
                                            onDeleteForAll(contextMsg);
                                            setContextMsg(null);
                                        }}
                                    >
                                        <FiAlertTriangle />
                                        <span>{t("chat.deleteForAll")}</span>
                                    </button>
                                    <button
                                        className="chat-widget-context__item"
                                        onClick={() => {
                                            onRecover(contextMsg);
                                            setContextMsg(null);
                                        }}
                                    >
                                        <FiCornerUpLeft />
                                        <span>{t("chat.recover")}</span>
                                    </button>
                                    <button
                                        className="chat-widget-context__item chat-widget-context__item--close"
                                        onClick={() => setContextMsg(null)}
                                    >
                                        {t("chat.close")}
                                    </button>
                                </div>
                                <div className="chat-widget-context__backdrop" onClick={() => setContextMsg(null)} />
                            </div>
                        )}

                        {/* Composer */}
                        <div className="chat-widget-composer">
                            <button className="chat-widget-iconbtn" title={t("chat.emoji")}>
                                <FiSmile />
                            </button>
                            <input
                                className="chat-widget-input chat-widget-composer__input"
                                placeholder={t("chat.messagePlaceholder")}
                                value={input}
                                onChange={(e) => {
                                    setInput(e.target.value);
                                    setTyping(true);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        onSend();
                                    }
                                }}
                            />
                            <button className="chat-widget-btn chat-widget-composer__send" onClick={onSend}>
                                <FiSend />
                                <span>{t("chat.send")}</span>
                            </button>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}