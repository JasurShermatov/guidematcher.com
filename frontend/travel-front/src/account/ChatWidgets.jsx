// ChatWidgets.jsx (fully shaped with WebSocket and booking actions)
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import {
    getConversations,
    getChatMessages,
    sendMessage,
    markMessagesAsRead,
    createConversation,
    getUnreadCount,
    searchUsers,
    blockUser,
    unblockUser,
    getBlockedUsers,
    messageAction,
    getCurrentUser,
    acceptBookingInChat,
    updateBookingInChat,
    cancelBookingInChat
} from '../api/api';
import './ChatWidgets.css';

// WebSocket hook for real-time messaging
const useWebSocket = (conversationId, user, callbacks) => {
    const [ws, setWs] = useState(null);
    const [isConnected, setIsConnected] = useState(false);

    const wsRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const isConnectingRef = useRef(false);
    const shouldConnectRef = useRef(true);

    const maxReconnectAttempts = 2;
    const baseReconnectDelay = 3000;

    const cleanup = useCallback(() => {
        shouldConnectRef.current = false;
        isConnectingRef.current = false;

        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        if (wsRef.current) {
            wsRef.current.onopen = null;
            wsRef.current.onclose = null;
            wsRef.current.onmessage = null;
            wsRef.current.onerror = null;

            if (wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.close(1000, 'Component cleanup');
            }

            wsRef.current = null;
        }

        setWs(null);
        setIsConnected(false);
    }, []);

    const connect = useCallback(() => {
        if (isConnectingRef.current || !shouldConnectRef.current) {
            return;
        }

        if (!conversationId || !user) {
            return;
        }

        const token = localStorage.getItem('access_token');
        if (!token) {
            return;
        }

        isConnectingRef.current = true;

        try {
            const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsHost = process.env.REACT_APP_WS_HOST || 'localhost:8000';
            const wsUrl = `${wsProtocol}//${wsHost}/ws/chat/${conversationId}/?token=${token}`;

            const websocket = new WebSocket(wsUrl);
            wsRef.current = websocket;

            websocket.onopen = () => {
                setIsConnected(true);
                setWs(websocket);
                isConnectingRef.current = false;
            };

            websocket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    const { onMessage, onMessageRead, onMessageAction, onTyping, onUserOnline, onUserOffline } = callbacks;

                    switch (data.type) {
                        case 'chat_message':
                            onMessage?.(data.message);
                            break;
                        case 'message_read':
                            onMessageRead?.(data.message_id, data.user_id);
                            break;
                        case 'message_action':
                            onMessageAction?.(data.message_id, data.action, data.message);
                            break;
                        case 'typing_indicator':
                            onTyping?.(data.user_name, data.is_typing);
                            break;
                        case 'user_online':
                            onUserOnline?.(data.user_name);
                            break;
                        case 'user_offline':
                            onUserOffline?.(data.user_name);
                            break;
                        default:
                            break;
                    }
                } catch (err) {
                    console.error('Error parsing WebSocket message:', err);
                }
            };

            websocket.onclose = (event) => {
                setIsConnected(false);
                setWs(null);
                isConnectingRef.current = false;

                if (wsRef.current === websocket) {
                    wsRef.current = null;
                }

                if (shouldConnectRef.current && event.code !== 1000 && event.code !== 1001 && event.code !== 1005) {
                    if (event.code === 4001 || event.code === 4003) {
                        return;
                    }

                    reconnectTimeoutRef.current = setTimeout(() => {
                        if (shouldConnectRef.current) {
                            connect();
                        }
                    }, baseReconnectDelay);
                }
            };

            websocket.onerror = (error) => {
                console.error('WebSocket error:', error);
                isConnectingRef.current = false;
            };

        } catch (err) {
            console.error('Failed to create WebSocket:', err);
            isConnectingRef.current = false;
        }
    }, [conversationId, user, callbacks]);

    const sendWebSocketMessage = useCallback((message) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            try {
                wsRef.current.send(JSON.stringify(message));
                return true;
            } catch (err) {
                console.error('Error sending WebSocket message:', err);
                return false;
            }
        }
        return false;
    }, []);

    useEffect(() => {
        shouldConnectRef.current = true;

        if (conversationId && user) {
            connect();
        }

        return cleanup;
    }, [conversationId, user, connect, cleanup]);

    return { isConnected, sendWebSocketMessage, cleanup };
};

const ChatWidget = ({ isOpen, onClose, selectedUserId = null, userRole = 'client' }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [conversations, setConversations] = useState([]);
    const [activeConversation, setActiveConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [chatView, setChatView] = useState('conversations');
    const [typingIndicator, setTypingIndicator] = useState('');
    const [onlineStatus, setOnlineStatus] = useState('');
    const [blockedUsers, setBlockedUsers] = useState([]);
    const [isSending, setIsSending] = useState(false);
    const [showAcceptModal, setShowAcceptModal] = useState(false);
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [selectedBookingId, setSelectedBookingId] = useState(null);
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [cancelReason, setCancelReason] = useState('');

    const messagesEndRef = useRef(null);
    const searchTimeoutRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const inputRef = useRef(null);

    // Moved all function definitions before useEffects
    const loadConversations = useCallback(async () => {
        try {
            const data = await getConversations();
            setConversations(data.results || data);
        } catch (err) {
            console.error('Error loading conversations:', err);
        }
    }, []);

    const loadUnreadCount = useCallback(async () => {
        try {
            const data = await getUnreadCount();
            setUnreadCount(data.total_unread || 0);
        } catch (err) {
            console.error('Error loading unread count:', err);
        }
    }, []);

    const initializeChat = useCallback(async () => {
        try {
            setLoading(true);

            const userData = await getCurrentUser();
            setCurrentUser(userData);

            await Promise.all([
                loadConversations(),
                loadUnreadCount()
            ]);

        } catch (err) {
            console.error('Error initializing chat:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [loadConversations, loadUnreadCount]);

    const loadMessages = useCallback(async (conversationId) => {
        try {
            const data = await getChatMessages(conversationId);
            setMessages(data.results || data);

            await markMessagesAsRead(conversationId);
            loadUnreadCount();
        } catch (err) {
            console.error('Error loading messages:', err);
        }
    }, [loadUnreadCount]);

    const loadBlockedUsers = useCallback(async () => {
        try {
            const data = await getBlockedUsers();
            setBlockedUsers(data.results || data);
        } catch (err) {
            console.error('Error loading blocked users:', err);
        }
    }, []);

    const handleConversationSelect = useCallback(async (conversation) => {
        if (activeConversation?.id !== conversation.id) {
            cleanup();
        }

        setActiveConversation(conversation);
        setChatView('chat');
        await loadMessages(conversation.id);
    }, [activeConversation, loadMessages]);

    const handleUserSearch = useCallback(async (query) => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        searchTimeoutRef.current = setTimeout(async () => {
            if (query.length >= 2) {
                try {
                    const data = await searchUsers(query);
                    setSearchResults(data.results || []);
                } catch (err) {
                    console.error('Error searching users:', err);
                }
            } else {
                setSearchResults([]);
            }
        }, 300);
    }, []);

    const startConversationWithUser = useCallback(async (userEmail) => {
        try {
            const conversationData = await createConversation({
                user_email: userEmail,
                message: ''
            });

            const existingConv = conversations.find(c => c.id === conversationData.id);
            if (!existingConv) {
                setConversations(prev => [conversationData, ...prev]);
            }

            setActiveConversation(conversationData);
            setChatView('chat');
            await loadMessages(conversationData.id);

        } catch (err) {
            setError(err.message);
        }
    }, [conversations, loadMessages]);

    const handleBlockUser = useCallback(async (userEmail) => {
        try {
            await blockUser(userEmail, { user_email: userEmail });
            setError('User blocked successfully');
            loadConversations();
        } catch (err) {
            setError(err.message);
        }
    }, [loadConversations]);

    const handleUnblockUser = useCallback(async (userId) => {
        try {
            await unblockUser(userId);
            loadBlockedUsers();
            setError('User unblocked successfully');
        } catch (err) {
            setError(err.message);
        }
    }, [loadBlockedUsers]);

    const performMessageAction = useCallback(async (messageId, action) => {
        try {
            const webSocketSent = sendWebSocketMessage({
                type: 'message_action',
                message_id: messageId,
                action: action
            });

            if (!webSocketSent) {
                await messageAction(messageId, action);
                if (activeConversation) {
                    await loadMessages(activeConversation.id);
                }
            }
        } catch (err) {
            setError(err.message);
        }
    }, [activeConversation, loadMessages, sendWebSocketMessage]);

    const handleInputChange = useCallback((e) => {
        const value = e.target.value;
        setNewMessage(value);

        if (isConnected && value.trim()) {
            sendWebSocketMessage({
                type: 'typing',
                is_typing: true
            });

            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
                sendWebSocketMessage({
                    type: 'typing',
                    is_typing: false
                });
            }, 1000);
        }
    }, [isConnected, sendWebSocketMessage]);

    const markMessageAsRead = useCallback((messageId) => {
        if (isConnected) {
            sendWebSocketMessage({
                type: 'message_read',
                message_id: messageId
            });
        }
    }, [isConnected, sendWebSocketMessage]);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    const formatTime = useCallback((dateString) => {
        return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }, []);

    const formatDate = useCallback((dateString) => {
        return new Date(dateString).toLocaleDateString();
    }, []);

    const handleClose = useCallback(() => {
        cleanup();
        onClose();
    }, [cleanup, onClose]);

    const handleBackToConversations = useCallback(() => {
        cleanup();
        setChatView('conversations');
        setActiveConversation(null);
    }, [cleanup]);

    const handleSendMessage = useCallback(async (e) => {
        e.preventDefault();

        if (!newMessage.trim() || !activeConversation || isSending) {
            return;
        }

        const content = newMessage.trim();
        setNewMessage('');
        setIsSending(true);

        try {
            const webSocketSent = sendWebSocketMessage({
                type: 'chat_message',
                content: content
            });

            if (!webSocketSent) {
                const messageData = {
                    conversation: activeConversation.id,
                    content: content
                };

                const sentMessage = await sendMessage(messageData);
                setMessages(prev => [...prev, sentMessage]);

                setTimeout(() => {
                    loadConversations();
                    loadUnreadCount();
                }, 100);
            }

        } catch (err) {
            console.error('Error sending message:', err);
            setError(err.message);
            setNewMessage(content);
        } finally {
            setIsSending(false);

            if (inputRef.current) {
                inputRef.current.focus();
            }
        }
    }, [activeConversation, isSending, newMessage, sendWebSocketMessage, loadConversations, loadUnreadCount]);

    const openAcceptModal = useCallback((bookingId) => {
        setSelectedBookingId(bookingId);
        setShowAcceptModal(true);
    }, []);

    const openUpdateModal = useCallback((bookingId) => {
        setSelectedBookingId(bookingId);
        setShowUpdateModal(true);
    }, []);

    const openCancelModal = useCallback((bookingId) => {
        setSelectedBookingId(bookingId);
        setShowCancelModal(true);
    }, []);

    const handleAccept = useCallback(async () => {
        try {
            await acceptBookingInChat(activeConversation.id, selectedBookingId, {
                start_date: startDate.toISOString().split('T')[0],
                end_date: endDate.toISOString().split('T')[0]
            });
            await loadMessages(activeConversation.id);
            setShowAcceptModal(false);
        } catch (err) {
            setError(err.message);
        }
    }, [activeConversation, selectedBookingId, startDate, endDate, loadMessages]);

    const handleUpdate = useCallback(async () => {
        try {
            await updateBookingInChat(activeConversation.id, selectedBookingId, {
                start_date: startDate.toISOString().split('T')[0],
                end_date: endDate.toISOString().split('T')[0]
            });
            await loadMessages(activeConversation.id);
            setShowUpdateModal(false);
        } catch (err) {
            setError(err.message);
        }
    }, [activeConversation, selectedBookingId, startDate, endDate, loadMessages]);

    const handleCancel = useCallback(async () => {
        try {
            await cancelBookingInChat(activeConversation.id, selectedBookingId, {
                confirm: true,
                reason: cancelReason
            });
            await loadMessages(activeConversation.id);
            setShowCancelModal(false);
            setCancelReason('');
        } catch (err) {
            setError(err.message);
        }
    }, [activeConversation, selectedBookingId, cancelReason, loadMessages]);

    const webSocketCallbacks = useMemo(() => ({
        onMessage: (message) => {
            setMessages(prev => {
                const messageExists = prev.some(m => m.id === message.id);
                if (messageExists) return prev;
                return [...prev, message];
            });

            setTimeout(() => {
                loadConversations();
                loadUnreadCount();
            }, 100);
        },

        onMessageRead: (messageId, userId) => {
            if (userId !== currentUser?.id) {
                setMessages(prev => prev.map(msg =>
                    msg.id === messageId ? { ...msg, is_read: true, read_at: new Date().toISOString() } : msg
                ));
            }
        },

        onMessageAction: (messageId, action, messageData) => {
            setMessages(prev => prev.map(msg =>
                msg.id === messageId ? messageData : msg
            ));
        },

        onTyping: (userName, isTyping) => {
            if (isTyping) {
                setTypingIndicator(`${userName} is typing...`);
                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = setTimeout(() => {
                    setTypingIndicator('');
                }, 3000);
            } else {
                setTypingIndicator('');
            }
        },

        onUserOnline: (userName) => {
            setOnlineStatus(`${userName} is online`);
            setTimeout(() => setOnlineStatus(''), 3000);
        },

        onUserOffline: (userName) => {
            setOnlineStatus(`${userName} went offline`);
            setTimeout(() => setOnlineStatus(''), 3000);
        }
    }), [currentUser, loadConversations, loadUnreadCount]);

    const { isConnected, sendWebSocketMessage, cleanup } = useWebSocket(
        activeConversation?.id,
        currentUser,
        webSocketCallbacks
    );

    // Now useEffects after all functions
    useEffect(() => {
        if (isOpen) {
            initializeChat();
        } else {
            cleanup();
        }
    }, [isOpen, cleanup, initializeChat]);

    useEffect(() => {
        if (selectedUserId && isOpen) {
            startConversationWithUser(selectedUserId);
        }
    }, [selectedUserId, isOpen, startConversationWithUser]);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, []);

    if (!isOpen) return null;

    return (
        <div className="chat-widget-container">
            <div className="chat-widget-overlay" onClick={handleClose}></div>

            <div className="chat-widget-main">
                <div className="chat-widget-header">
                    <h3 className="chat-widget-title">
                        {chatView === 'conversations' && 'Messages'}
                        {chatView === 'chat' && activeConversation && activeConversation.other_user?.full_name}
                        {chatView === 'search' && 'Find Users'}
                        {chatView === 'blocked' && 'Blocked Users'}
                    </h3>

                    <div className="chat-widget-header-actions">
                        {chatView === 'chat' && (
                            <div className={`chat-widget-connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
                                <span className="chat-widget-status-dot"></span>
                                <span className="chat-widget-status-text">
                                    {isConnected ? 'Live' : 'Offline'}
                                </span>
                            </div>
                        )}

                        {chatView !== 'conversations' && (
                            <button
                                className="chat-widget-back-btn"
                                onClick={handleBackToConversations}
                            >
                                ← Back
                            </button>
                        )}

                        {chatView === 'conversations' && (
                            <>
                                <button
                                    className="chat-widget-action-btn"
                                    onClick={() => setChatView('search')}
                                >
                                    + New New
                                </button>
                                <button
                                    className="chat-widget-action-btn"
                                    onClick={() => {
                                        setChatView('blocked');
                                        loadBlockedUsers();
                                    }}
                                >
                                    Blocked
                                </button>
                            </>
                        )}

                        <button className="chat-widget-close-btn" onClick={handleClose}>×</button>
                    </div>
                </div>

                {error && (
                    <div className="chat-widget-error">
                        <p>{error}</p>
                        <button onClick={() => setError(null)} className="chat-widget-error-close">×</button>
                    </div>
                )}

                {onlineStatus && (
                    <div className="chat-widget-status-indicator chat-widget-online">
                        {onlineStatus}
                    </div>
                )}

                <div className="chat-widget-content">
                    {chatView === 'conversations' && (
                        <div className="chat-widget-conversations">
                            {loading ? (
                                <div className="chat-widget-loading">Loading conversations...</div>
                            ) : conversations.length === 0 ? (
                                <div className="chat-widget-empty">
                                    <p>No conversations yet</p>
                                    <button
                                        className="chat-widget-btn chat-widget-btn-primary"
                                        onClick={() => setChatView('search')}
                                    >
                                        Start a conversation
                                    </button>
                                </div>
                            ) : (
                                <div className="chat-widget-conversations-list">
                                    {conversations.map(conversation => (
                                        <div
                                            key={conversation.id}
                                            className="chat-widget-conversation-item"
                                            onClick={() => handleConversationSelect(conversation)}
                                        >
                                            <div className="chat-widget-conversation-avatar">
                                                {conversation.other_user?.avatar ? (
                                                    <img
                                                        src={conversation.other_user.avatar}
                                                        alt={conversation.other_user.full_name}
                                                        className="chat-widget-avatar-image"
                                                    />
                                                ) : (
                                                    <div className="chat-widget-avatar-placeholder">
                                                        {conversation.other_user?.full_name?.charAt(0) || 'U'}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="chat-widget-conversation-info">
                                                <div className="chat-widget-conversation-header">
                                                    <h4 className="chat-widget-conversation-name">
                                                        {conversation.other_user?.full_name || 'Unknown User'}
                                                    </h4>
                                                    <span className="chat-widget-conversation-time">
                                                        {formatTime(conversation.updated_at)}
                                                    </span>
                                                </div>

                                                <div className="chat-widget-conversation-preview">
                                                    <p className="chat-widget-last-message">
                                                        {conversation.last_message?.content || 'No messages yet'}
                                                    </p>
                                                    {conversation.unread_count > 0 && (
                                                        <span className="chat-widget-unread-badge">
                                                            {conversation.unread_count}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {chatView === 'chat' && activeConversation && (
                        <div className="chat-widget-chat">
                            {typingIndicator && (
                                <div className="chat-widget-typing-indicator">
                                    <div className="chat-widget-typing-dots">
                                        <span></span>
                                        <span></span>
                                        <span></span>
                                    </div>
                                    <span className="chat-widget-typing-text">{typingIndicator}</span>
                                </div>
                            )}

                            <div className="chat-widget-messages">
                                <div className="chat-widget-messages-list">
                                    {messages.map(message => (
                                        <div
                                            key={message.id}
                                            className={`chat-widget-message ${message.is_mine ? 'chat-widget-message-mine' : 'chat-widget-message-other'}`}
                                            onClick={() => {
                                                if (!message.is_mine && !message.is_read) {
                                                    markMessageAsRead(message.id);
                                                }
                                            }}
                                        >
                                            <div className="chat-widget-message-content">
                                                {message.delete_status?.is_deleted ? (
                                                    <span className="chat-widget-message-deleted">
                                                        {message.delete_status.deleted_for === 'sender' && message.is_mine ?
                                                            'You deleted this message' : 'This message was deleted'}
                                                    </span>
                                                ) : (
                                                    <div>
                                                        <p className="chat-widget-message-text">{message.content}</p>

                                                        {message.message_type === 'booking' && message.metadata && (
                                                            <div className="chat-widget-booking-message">
                                                                <div className="chat-widget-booking-actions">
                                                                    {message.metadata.action === 'created' && userRole === 'customer' && (
                                                                        <>
                                                                            <button
                                                                                className="chat-widget-btn chat-widget-btn-small chat-widget-btn-primary"
                                                                                onClick={() => openAcceptModal(message.metadata.booking_id)}
                                                                            >
                                                                                Accept
                                                                            </button>
                                                                            <button
                                                                                className="chat-widget-btn chat-widget-btn-small chat-widget-btn-danger"
                                                                                onClick={() => openCancelModal(message.metadata.booking_id)}
                                                                            >
                                                                                Decline
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                    {message.metadata.action === 'accepted' && userRole === 'customer' && (
                                                                        <button
                                                                            className="chat-widget-btn chat-widget-btn-small chat-widget-btn-primary"
                                                                            onClick={() => openUpdateModal(message.metadata.booking_id)}
                                                                        >
                                                                            Update Dates
                                                                        </button>
                                                                    )}
                                                                    {(message.metadata.action === 'created' || message.metadata.action === 'accepted') && (
                                                                        <button
                                                                            className="chat-widget-btn chat-widget-btn-small chat-widget-btn-danger"
                                                                            onClick={() => openCancelModal(message.metadata.booking_id)}
                                                                        >
                                                                            Cancel
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                <div className="chat-widget-message-meta">
                                                    <span className="chat-widget-message-time">
                                                        {formatTime(message.created_at)}
                                                    </span>
                                                    {message.is_mine && (
                                                        <span className="chat-widget-message-status">
                                                            {message.is_read ? '✓✓' : '✓'}
                                                        </span>
                                                    )}
                                                    {message.is_mine && (
                                                        <div className="chat-widget-message-actions">
                                                            {!message.delete_status?.is_deleted && (
                                                                <>
                                                                    <button
                                                                        className="chat-widget-message-action"
                                                                        onClick={() => performMessageAction(message.id, 'delete_sender')}
                                                                    >
                                                                        Delete for me
                                                                    </button>
                                                                    <button
                                                                        className="chat-widget-message-action"
                                                                        onClick={() => performMessageAction(message.id, 'delete_both')}
                                                                    >
                                                                        Delete for everyone
                                                                    </button>
                                                                </>
                                                            )}
                                                            {message.can_recover && (
                                                                <button
                                                                    className="chat-widget-message-action"
                                                                    onClick={() => performMessageAction(message.id, 'recover')}
                                                                >
                                                                    Recover
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <div ref={messagesEndRef} />
                                </div>
                            </div>

                            <form onSubmit={handleSendMessage} className="chat-widget-input-form">
                                <div className="chat-widget-input-container">
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        className="chat-widget-input"
                                        placeholder="Type a message..."
                                        value={newMessage}
                                        onChange={handleInputChange}
                                        disabled={isSending}
                                        autoComplete="off"
                                    />
                                    <button
                                        type="submit"
                                        className="chat-widget-send-btn"
                                        disabled={!newMessage.trim() || isSending}
                                    >
                                        {isSending ? '⌛' : '📤'}
                                    </button>
                                </div>
                            </form>

                            <div className="chat-widget-chat-actions">
                                <button
                                    className="chat-widget-action-btn chat-widget-block-btn"
                                    onClick={() => {
                                        if (activeConversation?.other_user?.email) {
                                            handleBlockUser(activeConversation.other_user.email);
                                        }
                                    }}
                                >
                                    Block User
                                </button>
                            </div>
                        </div>
                    )}

                    {chatView === 'search' && (
                        <div className="chat-widget-search">
                            <div className="chat-widget-search-input">
                                <input
                                    type="text"
                                    className="chat-widget-input"
                                    placeholder="Search users by name or email..."
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        handleUserSearch(e.target.value);
                                    }}
                                />
                            </div>

                            <div className="chat-widget-search-results">
                                {searchQuery.length < 2 ? (
                                    <p className="chat-widget-search-hint">Enter at least 2 characters to search</p>
                                ) : searchResults.length === 0 ? (
                                    <p className="chat-widget-no-results">No users found</p>
                                ) : (
                                    <div className="chat-widget-users-list">
                                        {searchResults.map(user => (
                                            <div
                                                key={user.id}
                                                className="chat-widget-user-item"
                                                onClick={() => startConversationWithUser(user.email)}
                                            >
                                                <div className="chat-widget-user-avatar">
                                                    {user.avatar_url ? (
                                                        <img
                                                            src={user.avatar_url}
                                                            alt={user.full_name}
                                                            className="chat-widget-avatar-image"
                                                        />
                                                    ) : (
                                                        <div className="chat-widget-avatar-placeholder">
                                                            {user.full_name?.charAt(0) || 'U'}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="chat-widget-user-info">
                                                    <h4 className="chat-widget-user-name">{user.full_name}</h4>
                                                    <p className="chat-widget-user-email">{user.email}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {chatView === 'blocked' && (
                        <div className="chat-widget-blocked">
                            {blockedUsers.length === 0 ? (
                                <p className="chat-widget-no-blocked">No blocked users</p>
                            ) : (
                                <div className="chat-widget-blocked-list">
                                    {blockedUsers.map(blockedUser => (
                                        <div key={blockedUser.id} className="chat-widget-blocked-item">
                                            <div className="chat-widget-blocked-user-info">
                                                <div className="chat-widget-user-avatar">
                                                    {blockedUser.blocked_user?.avatar_url ? (
                                                        <img
                                                            src={blockedUser.blocked_user.avatar_url}
                                                            alt={blockedUser.blocked_user.full_name}
                                                            className="chat-widget-avatar-image"
                                                        />
                                                    ) : (
                                                        <div className="chat-widget-avatar-placeholder">
                                                            {blockedUser.blocked_user?.full_name?.charAt(0) || 'U'}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="chat-widget-user-info">
                                                    <h4 className="chat-widget-user-name">
                                                        {blockedUser.blocked_user?.full_name}
                                                    </h4>
                                                    <p className="chat-widget-user-email">
                                                        {blockedUser.blocked_user?.email}
                                                    </p>
                                                    <span className="chat-widget-blocked-date">
                                                        Blocked on {formatDate(blockedUser.created_at)}
                                                    </span>
                                                </div>
                                            </div>

                                            <button
                                                className="chat-widget-btn chat-widget-btn-unblock"
                                                onClick={() => handleUnblockUser(blockedUser.blocked_user.id)}
                                            >
                                                Unblock
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {unreadCount > 0 && chatView === 'conversations' && (
                    <div className="chat-widget-unread-total">
                        Total unread: {unreadCount}
                    </div>
                )}

                {showAcceptModal && (
                    <div className="chat-widget-modal">
                        <h3>Accept Booking</h3>
                        <DatePicker selected={startDate} onChange={date => setStartDate(date)} selectsStart startDate={startDate} />
                        <DatePicker selected={endDate} onChange={date => setEndDate(date)} selectsEnd startDate={startDate} endDate={endDate} minDate={startDate} />
                        <button onClick={handleAccept}>Confirm Accept</button>
                        <button onClick={() => setShowAcceptModal(false)}>Close</button>
                    </div>
                )}

                {showUpdateModal && (
                    <div className="chat-widget-modal">
                        <h3>Update Dates</h3>
                        <DatePicker selected={startDate} onChange={date => setStartDate(date)} selectsStart startDate={startDate} />
                        <DatePicker selected={endDate} onChange={date => setEndDate(date)} selectsEnd startDate={startDate} endDate={endDate} minDate={startDate} />
                        <button onClick={handleUpdate}>Confirm Update</button>
                        <button onClick={() => setShowUpdateModal(false)}>Close</button>
                    </div>
                )}

                {showCancelModal && (
                    <div className="chat-widget-modal">
                        <h3>Cancel Booking</h3>
                        <textarea
                            placeholder="Reason (optional)"
                            value={cancelReason}
                            onChange={e => setCancelReason(e.target.value)}
                        />
                        <button onClick={handleCancel}>Confirm Cancel</button>
                        <button onClick={() => setShowCancelModal(false)}>Close</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatWidget;