import React, {useState, useEffect, useRef, useCallback, useMemo} from 'react';
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
    getCurrentUser
} from '../api/api';
import './ChatWidgets.css';

// Improved WebSocket hook with better connection management
const useWebSocket = (conversationId, user, callbacks) => {
    const [ws, setWs] = useState(null);
    const [isConnected, setIsConnected] = useState(false);

    const wsRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const isConnectingRef = useRef(false);
    const shouldConnectRef = useRef(true);

    const maxReconnectAttempts = 2; // Reduced attempts
    const baseReconnectDelay = 3000; // Increased delay

    const cleanup = useCallback(() => {
        console.log('🧹 Cleaning up WebSocket connection...');

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
        // Prevent multiple simultaneous connections
        if (isConnectingRef.current || !shouldConnectRef.current) {
            console.log('⏸️ Connection blocked - already connecting or not allowed');
            return;
        }

        if (!conversationId || !user) {
            console.log('❌ Cannot connect: missing conversation ID or user');
            return;
        }

        const token = localStorage.getItem('access_token');
        if (!token) {
            console.log('❌ Cannot connect: no access token');
            return;
        }

        isConnectingRef.current = true;

        try {
            const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsHost = process.env.REACT_APP_WS_HOST || 'localhost:8000';
            const wsUrl = `${wsProtocol}//${wsHost}/ws/chat/${conversationId}/?token=${token}`;

            console.log('🔌 Attempting WebSocket connection to:', wsUrl);

            const websocket = new WebSocket(wsUrl);
            wsRef.current = websocket;

            websocket.onopen = () => {
                console.log('✅ WebSocket connected successfully to conversation:', conversationId);
                setIsConnected(true);
                setWs(websocket);
                isConnectingRef.current = false;
            };

            websocket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('📨 WebSocket message received:', data.type, data);

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
                            console.log('❓ Unknown WebSocket message type:', data.type);
                    }
                } catch (err) {
                    console.error('❌ Error parsing WebSocket message:', err);
                }
            };

            websocket.onclose = (event) => {
                console.log('🔌 WebSocket closed:', event.code, event.reason);
                setIsConnected(false);
                setWs(null);
                isConnectingRef.current = false;

                if (wsRef.current === websocket) {
                    wsRef.current = null;
                }

                // Only reconnect on unexpected closures (not user-initiated)
                if (shouldConnectRef.current && event.code !== 1000 && event.code !== 1001 && event.code !== 1005) {
                    // Don't reconnect on auth errors
                    if (event.code === 4001 || event.code === 4003) {
                        console.error('🚫 Authentication failed - not reconnecting');
                        return;
                    }

                    console.log('🔄 Attempting to reconnect in 3 seconds...');
                    reconnectTimeoutRef.current = setTimeout(() => {
                        if (shouldConnectRef.current) {
                            connect();
                        }
                    }, baseReconnectDelay);
                }
            };

            websocket.onerror = (error) => {
                console.error('❌ WebSocket error:', error);
                isConnectingRef.current = false;
            };

        } catch (err) {
            console.error('❌ Failed to create WebSocket:', err);
            isConnectingRef.current = false;
        }
    }, [conversationId, user, callbacks]);

    const sendWebSocketMessage = useCallback((message) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            try {
                wsRef.current.send(JSON.stringify(message));
                console.log('📤 Message sent via WebSocket:', message.type);
                return true;
            } catch (err) {
                console.error('❌ Error sending WebSocket message:', err);
                return false;
            }
        }
        console.log('📵 WebSocket not connected, cannot send message');
        return false;
    }, []);

    // Effect to handle connection
    useEffect(() => {
        shouldConnectRef.current = true;

        if (conversationId && user) {
            connect();
        }

        return cleanup;
    }, [conversationId, user, connect, cleanup]);

    return { isConnected, sendWebSocketMessage, cleanup };
};

const ChatWidgets = ({ isOpen, onClose, selectedUserId = null, userRole = 'client' }) => {
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

    const messagesEndRef = useRef(null);
    const searchTimeoutRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const inputRef = useRef(null);

    // Separate functions to avoid infinite loops
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

    // WebSocket message handlers - FIXED to prevent infinite loops
    const webSocketCallbacks = useMemo(() => ({
        onMessage: (message) => {
            console.log('📥 New message received via WebSocket:', message.id);

            // Add message to current conversation
            setMessages(prev => {
                const messageExists = prev.some(m => m.id === message.id);
                if (messageExists) return prev;
                return [...prev, message];
            });

            // Update conversations without causing reconnection
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
            console.log('🔄 Message action via WebSocket:', messageId, action);
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

    // WebSocket connection
    const { isConnected, sendWebSocketMessage, cleanup } = useWebSocket(
        activeConversation?.id,
        currentUser,
        webSocketCallbacks
    );

    useEffect(() => {
        if (isOpen) {
            initializeChat();
        } else {
            // Clean up when chat is closed
            cleanup();
        }
    }, [isOpen, cleanup]);

    useEffect(() => {
        if (selectedUserId && isOpen) {
            startConversationWithUser(selectedUserId);
        }
    }, [selectedUserId, isOpen]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Cleanup timeouts on unmount
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

    const initializeChat = async () => {
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
    };

    const loadMessages = async (conversationId) => {
        try {
            const data = await getChatMessages(conversationId);
            setMessages(data.results || data);

            await markMessagesAsRead(conversationId);
            loadUnreadCount();
        } catch (err) {
            console.error('Error loading messages:', err);
        }
    };

    const loadBlockedUsers = async () => {
        try {
            const data = await getBlockedUsers();
            setBlockedUsers(data.results || data);
        } catch (err) {
            console.error('Error loading blocked users:', err);
        }
    };

    // Message sending function
    const handleSendMessage = async (e) => {
        e.preventDefault();

        if (!newMessage.trim() || !activeConversation || isSending) {
            return;
        }

        const content = newMessage.trim();
        setNewMessage(''); // Clear input immediately
        setIsSending(true);

        try {
            // Try WebSocket first for real-time experience
            const webSocketSent = sendWebSocketMessage({
                type: 'chat_message',
                content: content
            });

            if (!webSocketSent) {
                // Fallback to HTTP API
                console.log('📡 WebSocket not available, using HTTP API');
                const messageData = {
                    conversation: activeConversation.id,
                    content: content
                };

                const sentMessage = await sendMessage(messageData);

                // Add message to UI immediately
                setMessages(prev => [...prev, sentMessage]);

                // Update conversations list
                setTimeout(() => {
                    loadConversations();
                    loadUnreadCount();
                }, 100);
            }

        } catch (err) {
            console.error('Error sending message:', err);
            setError(err.message);
            setNewMessage(content); // Restore message on error
        } finally {
            setIsSending(false);

            // Focus back to input
            if (inputRef.current) {
                inputRef.current.focus();
            }
        }
    };

    const handleConversationSelect = async (conversation) => {
        // Clean up previous connection before switching
        if (activeConversation?.id !== conversation.id) {
            cleanup();
        }

        setActiveConversation(conversation);
        setChatView('chat');
        await loadMessages(conversation.id);
    };

    const handleUserSearch = async (query) => {
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
    };

    const startConversationWithUser = async (userEmail) => {
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
    };

    const handleBlockUser = async (userEmail) => {
        try {
            await blockUser({ user_email: userEmail });
            setError('User blocked successfully');
            loadConversations();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleUnblockUser = async (userId) => {
        try {
            await unblockUser(userId);
            loadBlockedUsers();
            setError('User unblocked successfully');
        } catch (err) {
            setError(err.message);
        }
    };

    const performMessageAction = async (messageId, action) => {
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
    };

    // Input change handler
    const handleInputChange = (e) => {
        const value = e.target.value;
        setNewMessage(value);

        // Send typing indicator via WebSocket (throttled)
        if (isConnected && value.trim()) {
            sendWebSocketMessage({
                type: 'typing',
                is_typing: true
            });

            // Clear typing after 1 second of inactivity
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
                sendWebSocketMessage({
                    type: 'typing',
                    is_typing: false
                });
            }, 1000);
        }
    };

    const markMessageAsRead = (messageId) => {
        if (isConnected) {
            sendWebSocketMessage({
                type: 'message_read',
                message_id: messageId
            });
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const formatTime = (dateString) => {
        return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString();
    };

    const handleClose = () => {
        cleanup(); // Clean up WebSocket when closing
        onClose();
    };

    const handleBackToConversations = () => {
        cleanup(); // Clean up WebSocket when leaving chat
        setChatView('conversations');
        setActiveConversation(null);
    };

    if (!isOpen) return null;

    return (
        <div className="chat-widgets-container">
            <div className="chat-widgets-overlay" onClick={handleClose}></div>

            <div className="chat-widgets-main">
                <div className="chat-widgets-header">
                    <h3 className="chat-widgets-title">
                        {chatView === 'conversations' && 'Messages'}
                        {chatView === 'chat' && activeConversation && activeConversation.other_user?.full_name}
                        {chatView === 'search' && 'Find Users'}
                        {chatView === 'blocked' && 'Blocked Users'}
                    </h3>

                    <div className="chat-widgets-header-actions">
                        {/* Connection Status */}
                        {chatView === 'chat' && (
                            <div className={`chat-widgets-connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
                                <span className="status-dot"></span>
                                <span className="status-text">
                                    {isConnected ? 'Live' : 'Offline'}
                                </span>
                            </div>
                        )}

                        {chatView !== 'conversations' && (
                            <button
                                className="chat-widgets-back-btn"
                                onClick={handleBackToConversations}
                            >
                                ← Back
                            </button>
                        )}

                        {chatView === 'conversations' && (
                            <>
                                <button
                                    className="chat-widgets-action-btn"
                                    onClick={() => setChatView('search')}
                                >
                                    + New
                                </button>
                                <button
                                    className="chat-widgets-action-btn"
                                    onClick={() => {
                                        setChatView('blocked');
                                        loadBlockedUsers();
                                    }}
                                >
                                    Blocked
                                </button>
                            </>
                        )}

                        <button className="chat-widgets-close-btn" onClick={handleClose}>×</button>
                    </div>
                </div>

                {error && (
                    <div className="chat-widgets-error">
                        <p>{error}</p>
                        <button onClick={() => setError(null)} className="chat-widgets-error-close">×</button>
                    </div>
                )}

                {/* Status indicators */}
                {onlineStatus && (
                    <div className="chat-widgets-status-indicator online">
                        {onlineStatus}
                    </div>
                )}

                <div className="chat-widgets-content">
                    {/* Conversations List View */}
                    {chatView === 'conversations' && (
                        <div className="chat-widgets-conversations">
                            {loading ? (
                                <div className="chat-widgets-loading">Loading conversations...</div>
                            ) : conversations.length === 0 ? (
                                <div className="chat-widgets-empty">
                                    <p>No conversations yet</p>
                                    <button
                                        className="chat-widgets-btn chat-widgets-btn-primary"
                                        onClick={() => setChatView('search')}
                                    >
                                        Start a conversation
                                    </button>
                                </div>
                            ) : (
                                <div className="chat-widgets-conversations-list">
                                    {conversations.map(conversation => (
                                        <div
                                            key={conversation.id}
                                            className="chat-widgets-conversation-item"
                                            onClick={() => handleConversationSelect(conversation)}
                                        >
                                            <div className="chat-widgets-conversation-avatar">
                                                {conversation.other_user?.avatar ? (
                                                    <img
                                                        src={conversation.other_user.avatar}
                                                        alt={conversation.other_user.full_name}
                                                        className="chat-widgets-avatar-image"
                                                    />
                                                ) : (
                                                    <div className="chat-widgets-avatar-placeholder">
                                                        {conversation.other_user?.full_name?.charAt(0) || 'U'}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="chat-widgets-conversation-info">
                                                <div className="chat-widgets-conversation-header">
                                                    <h4 className="chat-widgets-conversation-name">
                                                        {conversation.other_user?.full_name || 'Unknown User'}
                                                    </h4>
                                                    <span className="chat-widgets-conversation-time">
                                                        {formatTime(conversation.updated_at)}
                                                    </span>
                                                </div>

                                                <div className="chat-widgets-conversation-preview">
                                                    <p className="chat-widgets-last-message">
                                                        {conversation.last_message?.content || 'No messages yet'}
                                                    </p>
                                                    {conversation.unread_count > 0 && (
                                                        <span className="chat-widgets-unread-badge">
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

                    {/* Chat Messages View */}
                    {chatView === 'chat' && activeConversation && (
                        <div className="chat-widgets-chat">
                            {/* Typing indicator */}
                            {typingIndicator && (
                                <div className="chat-widgets-typing-indicator">
                                    <div className="typing-dots">
                                        <span></span>
                                        <span></span>
                                        <span></span>
                                    </div>
                                    <span className="typing-text">{typingIndicator}</span>
                                </div>
                            )}

                            <div className="chat-widgets-messages">
                                <div className="chat-widgets-messages-list">
                                    {messages.map(message => (
                                        <div
                                            key={message.id}
                                            className={`chat-widgets-message ${message.is_mine ? 'chat-widgets-message-mine' : 'chat-widgets-message-other'}`}
                                            onClick={() => {
                                                if (!message.is_mine && !message.is_read) {
                                                    markMessageAsRead(message.id);
                                                }
                                            }}
                                        >
                                            <div className="chat-widgets-message-content">
                                                {message.delete_status?.is_deleted ? (
                                                    <span className="chat-widgets-message-deleted">
                                                        {message.delete_status.deleted_for === 'sender' && message.is_mine ? 'You deleted this message' : 'This message was deleted'}
                                                    </span>
                                                ) : (
                                                    <p className="chat-widgets-message-text">{message.content}</p>
                                                )}

                                                <div className="chat-widgets-message-meta">
                                                    <span className="chat-widgets-message-time">
                                                        {formatTime(message.created_at)}
                                                    </span>
                                                    {message.is_mine && (
                                                        <span className="chat-widgets-message-status">
                                                            {message.is_read ? '✓✓' : '✓'}
                                                        </span>
                                                    )}
                                                    {message.is_mine && (
                                                        <div className="chat-widgets-message-actions">
                                                            {!message.delete_status?.is_deleted && (
                                                                <>
                                                                    <button
                                                                        className="chat-widgets-message-action"
                                                                        onClick={() => performMessageAction(message.id, 'delete_sender')}
                                                                    >
                                                                        Delete for me
                                                                    </button>
                                                                    <button
                                                                        className="chat-widgets-message-action"
                                                                        onClick={() => performMessageAction(message.id, 'delete_both')}
                                                                    >
                                                                        Delete for everyone
                                                                    </button>
                                                                </>
                                                            )}
                                                            {message.can_recover && (
                                                                <button
                                                                    className="chat-widgets-message-action"
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

                            <form onSubmit={handleSendMessage} className="chat-widgets-input-form">
                                <div className="chat-widgets-input-container">
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        className="chat-widgets-input"
                                        placeholder="Type a message..."
                                        value={newMessage}
                                        onChange={handleInputChange}
                                        disabled={isSending}
                                        autoComplete="off"
                                    />
                                    <button
                                        type="submit"
                                        className="chat-widgets-send-btn"
                                        disabled={!newMessage.trim() || isSending}
                                    >
                                        {isSending ? '⌛' : '📤'}
                                    </button>
                                </div>
                            </form>

                            <div className="chat-widgets-chat-actions">
                                <button
                                    className="chat-widgets-action-btn chat-widgets-block-btn"
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

                    {/* User Search View */}
                    {chatView === 'search' && (
                        <div className="chat-widgets-search">
                            <div className="chat-widgets-search-input">
                                <input
                                    type="text"
                                    className="chat-widgets-input"
                                    placeholder="Search users by name or email..."
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        handleUserSearch(e.target.value);
                                    }}
                                />
                            </div>

                            <div className="chat-widgets-search-results">
                                {searchQuery.length < 2 ? (
                                    <p className="chat-widgets-search-hint">Enter at least 2 characters to search</p>
                                ) : searchResults.length === 0 ? (
                                    <p className="chat-widgets-no-results">No users found</p>
                                ) : (
                                    <div className="chat-widgets-users-list">
                                        {searchResults.map(user => (
                                            <div
                                                key={user.id}
                                                className="chat-widgets-user-item"
                                                onClick={() => startConversationWithUser(user.email)}
                                            >
                                                <div className="chat-widgets-user-avatar">
                                                    {user.avatar_url ? (
                                                        <img
                                                            src={user.avatar_url}
                                                            alt={user.full_name}
                                                            className="chat-widgets-avatar-image"
                                                        />
                                                    ) : (
                                                        <div className="chat-widgets-avatar-placeholder">
                                                            {user.full_name?.charAt(0) || 'U'}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="chat-widgets-user-info">
                                                    <h4 className="chat-widgets-user-name">{user.full_name}</h4>
                                                    <p className="chat-widgets-user-email">{user.email}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Blocked Users View */}
                    {chatView === 'blocked' && (
                        <div className="chat-widgets-blocked">
                            {blockedUsers.length === 0 ? (
                                <p className="chat-widgets-no-blocked">No blocked users</p>
                            ) : (
                                <div className="chat-widgets-blocked-list">
                                    {blockedUsers.map(blockedUser => (
                                        <div key={blockedUser.id} className="chat-widgets-blocked-item">
                                            <div className="chat-widgets-blocked-user-info">
                                                <div className="chat-widgets-user-avatar">
                                                    {blockedUser.blocked_user?.avatar_url ? (
                                                        <img
                                                            src={blockedUser.blocked_user.avatar_url}
                                                            alt={blockedUser.blocked_user.full_name}
                                                            className="chat-widgets-avatar-image"
                                                        />
                                                    ) : (
                                                        <div className="chat-widgets-avatar-placeholder">
                                                            {blockedUser.blocked_user?.full_name?.charAt(0) || 'U'}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="chat-widgets-user-info">
                                                    <h4 className="chat-widgets-user-name">
                                                        {blockedUser.blocked_user?.full_name}
                                                    </h4>
                                                    <p className="chat-widgets-user-email">
                                                        {blockedUser.blocked_user?.email}
                                                    </p>
                                                    <span className="chat-widgets-blocked-date">
                                                        Blocked on {formatDate(blockedUser.created_at)}
                                                    </span>
                                                </div>
                                            </div>

                                            <button
                                                className="chat-widgets-btn chat-widgets-btn-unblock"
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

                {/* Unread Count Badge */}
                {unreadCount > 0 && chatView === 'conversations' && (
                    <div className="chat-widgets-unread-total">
                        Total unread: {unreadCount}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatWidgets;