import React, { useState, useEffect, useRef, useCallback } from 'react';
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
    const [messagesLoading, setMessagesLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showUserSearch, setShowUserSearch] = useState(false);
    const [showBlockedUsers, setShowBlockedUsers] = useState(false);
    const [blockedUsers, setBlockedUsers] = useState([]);
    const [chatView, setChatView] = useState('conversations');
    const [isOnline, setIsOnline] = useState(false);
    const [typingUsers, setTypingUsers] = useState(new Set());
    const [isTyping, setIsTyping] = useState(false);
    const [wsConnectionStatus, setWsConnectionStatus] = useState('disconnected'); // disconnected, connecting, connected, error

    // Refs
    const messagesEndRef = useRef(null);
    const searchTimeoutRef = useRef(null);
    const wsRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const reconnectAttempts = useRef(0);
    const maxReconnectAttempts = 5;
    const isManualDisconnect = useRef(false);

    // WebSocket URL Configuration - FIXED VERSION
    const getWebSocketURL = useCallback(() => {
        const token = localStorage.getItem("access_token");
        if (!token) {
            console.error('No access token available for WebSocket connection');
            return null;
        }

        let wsHost;
        let protocol;

        // Protocol auto-detection
        if (window.location.protocol === 'https:') {
            protocol = 'wss:';
        } else {
            protocol = 'ws:';
        }

        // Host detection
        if (process.env.NODE_ENV === 'production') {
            // Production environment
            if (process.env.REACT_APP_WS_URL) {
                wsHost = process.env.REACT_APP_WS_URL;
            } else {
                // Auto-detect from current page
                wsHost = `${protocol}//${window.location.host}`;
            }
        } else {
            // Development environment
            if (process.env.REACT_APP_WS_URL) {
                wsHost = process.env.REACT_APP_WS_URL;
            } else {
                // Default development WebSocket URL
                wsHost = `${protocol}//localhost:8000`;
            }
        }

        // Clean trailing slash
        wsHost = wsHost.replace(/\/$/, '');

        // Create full WebSocket URL
        const fullWsURL = `${wsHost}/ws/chat/?token=${token}`;

        console.log('Generated WebSocket URL:', fullWsURL);
        return fullWsURL;
    }, []);

    // Initialize chat and WebSocket connection
    useEffect(() => {
        if (isOpen) {
            initializeChat();
            connectWebSocket();
        } else {
            disconnectWebSocket();
            cleanup();
        }

        return () => {
            cleanup();
        };
    }, [isOpen]);

    // Handle selected user for direct conversation
    useEffect(() => {
        if (selectedUserId && isOpen) {
            startConversationWithUser(selectedUserId);
        }
    }, [selectedUserId, isOpen]);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Handle active conversation change
    useEffect(() => {
        if (activeConversation) {
            joinConversationWS(activeConversation.id);
        }
    }, [activeConversation]);

    const cleanup = () => {
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        isManualDisconnect.current = true;
        disconnectWebSocket();
    };

    const initializeChat = async () => {
        try {
            setLoading(true);
            setError(null);

            // Load current user
            const userData = await getCurrentUser();
            setCurrentUser(userData);
            console.log('Current user loaded:', userData);

            // Load conversations and unread count
            await Promise.all([
                loadConversations(),
                loadUnreadCount()
            ]);

        } catch (err) {
            console.error('Error initializing chat:', err);
            setError(err.message || 'Failed to initialize chat');
        } finally {
            setLoading(false);
        }
    };

    // WebSocket Connection Management - IMPROVED VERSION
    const connectWebSocket = useCallback(() => {
        // Don't connect if manually disconnected
        if (isManualDisconnect.current) {
            console.log('Manual disconnect detected, not connecting WebSocket');
            return;
        }

        const wsURL = getWebSocketURL();
        if (!wsURL) {
            setError('Cannot create WebSocket connection: No access token');
            setWsConnectionStatus('error');
            return;
        }

        // Don't create new connection if already connected
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            console.log('WebSocket already connected');
            return;
        }

        try {
            console.log('🔌 Attempting WebSocket connection to:', wsURL);
            setWsConnectionStatus('connecting');

            // Close existing connection
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }

            // Create new WebSocket connection
            wsRef.current = new WebSocket(wsURL);

            // Connection timeout
            const connectionTimeout = setTimeout(() => {
                if (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING) {
                    console.error('❌ WebSocket connection timeout');
                    wsRef.current.close();
                    setWsConnectionStatus('error');
                    setError('WebSocket connection timeout');
                }
            }, 10000); // 10 seconds

            // Connection opened
            wsRef.current.onopen = () => {
                console.log('✅ WebSocket connected successfully');
                clearTimeout(connectionTimeout);
                setIsOnline(true);
                setWsConnectionStatus('connected');
                setError(null);
                reconnectAttempts.current = 0;

                // Clear any pending reconnection
                if (reconnectTimeoutRef.current) {
                    clearTimeout(reconnectTimeoutRef.current);
                    reconnectTimeoutRef.current = null;
                }

                // Send ping to keep connection alive
                const keepAlive = () => {
                    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                        wsRef.current.send(JSON.stringify({ type: 'ping' }));
                    }
                };

                // Ping every 30 seconds
                const pingInterval = setInterval(keepAlive, 30000);
                wsRef.current.pingInterval = pingInterval;
            };

            // Message received
            wsRef.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('📨 WebSocket message received:', data);
                    handleWebSocketMessage(data);
                } catch (err) {
                    console.error('❌ Error parsing WebSocket message:', err, event.data);
                }
            };

            // Connection closed
            wsRef.current.onclose = (event) => {
                console.log('🔌 WebSocket closed:', {
                    code: event.code,
                    reason: event.reason,
                    wasClean: event.wasClean
                });

                clearTimeout(connectionTimeout);
                setIsOnline(false);
                setWsConnectionStatus('disconnected');

                // Clear ping interval
                if (wsRef.current && wsRef.current.pingInterval) {
                    clearInterval(wsRef.current.pingInterval);
                }

                // Determine if reconnection should happen
                const shouldReconnect =
                    event.code !== 1000 && // Not normal closure
                    isOpen && // Chat widget is still open
                    !isManualDisconnect.current && // Not manually disconnected
                    reconnectAttempts.current < maxReconnectAttempts; // Haven't exceeded max attempts

                if (shouldReconnect) {
                    const delay = Math.min(Math.pow(2, reconnectAttempts.current) * 1000, 30000); // Exponential backoff, max 30s
                    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);

                    reconnectTimeoutRef.current = setTimeout(() => {
                        reconnectAttempts.current++;
                        setWsConnectionStatus('connecting');
                        connectWebSocket();
                    }, delay);
                } else if (reconnectAttempts.current >= maxReconnectAttempts) {
                    console.error('❌ Max reconnection attempts reached');
                    setWsConnectionStatus('error');
                    setError('Connection lost. Please refresh the page to reconnect.');
                }
            };

            // Connection error
            wsRef.current.onerror = (error) => {
                console.error('❌ WebSocket error:', error);
                clearTimeout(connectionTimeout);
                setIsOnline(false);
                setWsConnectionStatus('error');

                if (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING) {
                    setError('Failed to connect to chat server. Please check your connection.');
                }
            };

        } catch (err) {
            console.error('❌ Error creating WebSocket connection:', err);
            setIsOnline(false);
            setWsConnectionStatus('error');
            setError('Failed to create WebSocket connection: ' + err.message);
        }
    }, [getWebSocketURL, isOpen]);

    const disconnectWebSocket = () => {
        isManualDisconnect.current = true;

        // Clear all timeouts
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        // Close WebSocket connection
        if (wsRef.current) {
            console.log('🔌 Manually disconnecting WebSocket');
            wsRef.current.close(1000, 'Manual disconnect');
            wsRef.current = null;
        }

        setIsOnline(false);
        setWsConnectionStatus('disconnected');
    };

    // Enhanced WebSocket message handler
    const handleWebSocketMessage = (data) => {
        console.log('Processing WebSocket message:', data);

        switch (data.type) {
            case 'new_message':
                handleNewMessage(data.message);
                break;

            case 'message_updated':
                handleMessageUpdate(data.message);
                break;

            case 'message_read':
                handleMessageRead(data.message_id, data.user_id);
                break;

            case 'user_typing':
                handleUserTyping(data.user_id, data.conversation_id);
                break;

            case 'user_stop_typing':
                handleUserStopTyping(data.user_id);
                break;

            case 'user_online':
                handleUserOnlineStatus(data.user_id, true);
                break;

            case 'user_offline':
                handleUserOnlineStatus(data.user_id, false);
                break;

            case 'unread_count_updated':
                setUnreadCount(data.unread_count);
                break;

            case 'conversation_updated':
                loadConversations(); // Refresh conversations
                break;

            case 'conversation_joined':
                console.log('✅ Successfully joined conversation:', data.conversation_id);
                break;

            case 'pong':
                console.log('📡 Pong received - connection alive');
                break;

            case 'error':
                console.error('❌ WebSocket server error:', data.message);
                setError('Server error: ' + data.message);
                break;

            default:
                console.log('Unknown WebSocket message type:', data.type);
        }
    };

    // Join specific conversation via WebSocket
    const joinConversationWS = (conversationId) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            console.log('🏠 Joining conversation via WebSocket:', conversationId);
            wsRef.current.send(JSON.stringify({
                type: 'join_conversation',
                conversation_id: conversationId
            }));
        }
    };

    const handleNewMessage = (message) => {
        console.log('New message received:', message);

        // Add message if it belongs to current conversation
        if (activeConversation && message.conversation === activeConversation.id) {
            setMessages(prev => {
                // Check if message already exists to avoid duplicates
                const exists = prev.find(m => m.id === message.id);
                if (exists) return prev;

                return [...prev, message].sort((a, b) =>
                    new Date(a.created_at) - new Date(b.created_at)
                );
            });
        }

        // Update conversations list to show new message
        setConversations(prev => {
            return prev.map(conv => {
                if (conv.id === message.conversation) {
                    return {
                        ...conv,
                        last_message: message,
                        updated_at: message.created_at,
                        unread_count: message.is_mine ? conv.unread_count : (conv.unread_count || 0) + 1
                    };
                }
                return conv;
            });
        });

        // Show notification for new messages (not from current user)
        if (!message.is_mine && activeConversation?.id !== message.conversation) {
            showNotification('New message', message.content);
        }

        // Play notification sound
        if (!message.is_mine) {
            playNotificationSound();
        }
    };

    const handleMessageUpdate = (message) => {
        if (activeConversation && message.conversation === activeConversation.id) {
            setMessages(prev =>
                prev.map(m => m.id === message.id ? message : m)
            );
        }
    };

    const handleMessageDelete = (messageId) => {
        if (activeConversation) {
            // Reload messages to get updated delete status
            loadMessages(activeConversation.id);
        }
    };

    const handleMessageRead = (messageId, userId) => {
        // Update message read status if needed
        if (activeConversation && userId !== currentUser?.id) {
            setMessages(prev =>
                prev.map(m =>
                    m.id === messageId ? { ...m, is_read: true } : m
                )
            );
        }
    };

    const handleUserTyping = (userId, conversationId) => {
        if (activeConversation && conversationId === activeConversation.id && userId !== currentUser?.id) {
            setTypingUsers(prev => new Set(prev).add(userId));

            // Auto-remove typing status after 5 seconds
            setTimeout(() => {
                setTypingUsers(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(userId);
                    return newSet;
                });
            }, 5000);
        }
    };

    const handleUserStopTyping = (userId) => {
        setTypingUsers(prev => {
            const newSet = new Set(prev);
            newSet.delete(userId);
            return newSet;
        });
    };

    const handleUserOnlineStatus = (userId, isOnline) => {
        // Update user online status in conversations or other relevant places
        console.log(`User ${userId} is ${isOnline ? 'online' : 'offline'}`);
    };

    const showNotification = (title, body) => {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
                body: body.length > 50 ? body.substring(0, 50) + '...' : body,
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                tag: 'chat-message'
            });
        }
    };

    const playNotificationSound = () => {
        try {
            const audio = new Audio('/notification-sound.mp3');
            audio.volume = 0.3;
            audio.play().catch(e => console.log('Cannot play sound:', e));
        } catch (err) {
            console.log('Cannot play notification sound:', err);
        }
    };

    // Request notification permission on component mount
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().then(permission => {
                console.log('Notification permission:', permission);
            });
        }
    }, []);

    // Manual reconnect function
    const manualReconnect = () => {
        console.log('Manual reconnect requested');
        isManualDisconnect.current = false;
        reconnectAttempts.current = 0;
        connectWebSocket();
    };

    const loadConversations = async () => {
        try {
            console.log('Loading conversations...');
            const data = await getConversations();
            console.log('Conversations raw data:', data);

            const conversationsList = data.results || data || [];
            console.log('Conversations list:', conversationsList);

            setConversations(conversationsList);
        } catch (err) {
            console.error('Error loading conversations:', err);
            setError('Failed to load conversations');
        }
    };

    const loadMessages = async (conversationId) => {
        try {
            setMessagesLoading(true);
            setMessages([]);
            setError(null);

            console.log('Loading messages for conversation:', conversationId);

            const data = await getChatMessages(conversationId);
            console.log('Messages raw data:', data);

            const messagesList = data.results || data || [];
            console.log('Messages list:', messagesList);

            // Sort messages by creation time (oldest first, newest last)
            const sortedMessages = messagesList.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            console.log('Sorted messages:', sortedMessages);

            setMessages(sortedMessages);

            // Mark messages as read
            try {
                await markMessagesAsRead(conversationId);
                await loadUnreadCount();
            } catch (markReadError) {
                console.warn('Failed to mark messages as read:', markReadError);
            }

        } catch (err) {
            console.error('Error loading messages:', err);
            setError('Failed to load messages: ' + err.message);
        } finally {
            setMessagesLoading(false);
        }
    };

    const loadUnreadCount = async () => {
        try {
            const data = await getUnreadCount();
            console.log('Unread count data:', data);
            setUnreadCount(data.total_unread || 0);
        } catch (err) {
            console.error('Error loading unread count:', err);
        }
    };

    const loadBlockedUsers = async () => {
        try {
            const data = await getBlockedUsers();
            console.log('Blocked users data:', data);
            const blockedList = data.results || data || [];
            setBlockedUsers(blockedList);
        } catch (err) {
            console.error('Error loading blocked users:', err);
        }
    };

    // Enhanced message sending with WebSocket support
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeConversation || messagesLoading) return;

        const messageText = newMessage.trim();
        setNewMessage('');
        stopTyping();

        try {
            const messageData = {
                conversation: activeConversation.id,
                content: messageText
            };

            console.log('📤 Sending message:', messageData);

            // Send via API first (for persistence)
            const sentMessage = await sendMessage(messageData);
            console.log('✅ Message sent via API:', sentMessage);

            // Also send via WebSocket for real-time delivery
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({
                    type: 'chat_message',
                    content: messageText,
                    conversation_id: activeConversation.id
                }));
                console.log('📡 Message sent via WebSocket');
            } else {
                console.warn('⚠️ WebSocket not connected, message sent via API only');
            }

            // Optimistically add message to UI
            setMessages(prev => {
                const exists = prev.find(m => m.id === sentMessage.id);
                if (exists) return prev;
                return [...prev, { ...sentMessage, is_mine: true }].sort((a, b) =>
                    new Date(a.created_at) - new Date(b.created_at)
                );
            });

            // Update conversations list
            await loadConversations();

        } catch (err) {
            console.error('❌ Error sending message:', err);
            setError('Failed to send message: ' + (err.message || 'Unknown error'));
            setNewMessage(messageText); // Restore message text
        }
    };

    const handleInputChange = (e) => {
        setNewMessage(e.target.value);
        handleTyping();
    };

    // Enhanced typing handlers
    const handleTyping = () => {
        if (!activeConversation || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

        if (!isTyping) {
            setIsTyping(true);
            wsRef.current.send(JSON.stringify({
                type: 'typing_start',
                conversation_id: activeConversation.id
            }));
        }

        // Clear previous timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Stop typing after 2 seconds
        typingTimeoutRef.current = setTimeout(() => {
            stopTyping();
        }, 2000);
    };

    const stopTyping = () => {
        if (isTyping && activeConversation && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            setIsTyping(false);
            wsRef.current.send(JSON.stringify({
                type: 'typing_stop',
                conversation_id: activeConversation.id
            }));
        }

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }
    };

    const handleConversationSelect = async (conversation) => {
        console.log('Selected conversation:', conversation);
        setActiveConversation(conversation);
        setChatView('chat');
        setError(null);

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
                    console.log('User search results:', data);
                    const usersList = data.results || data || [];
                    setSearchResults(usersList);
                } catch (err) {
                    console.error('Error searching users:', err);
                    setSearchResults([]);
                }
            } else {
                setSearchResults([]);
            }
        }, 300);
    };

    const startConversationWithUser = async (userEmail) => {
        try {
            console.log('Starting conversation with user:', userEmail);
            setError(null);

            const conversationData = await createConversation({
                user_email: userEmail,
                message: ''
            });

            console.log('Conversation created/found:', conversationData);

            // Find or add the conversation to the list
            const existingConv = conversations.find(c => c.id === conversationData.id);
            if (!existingConv) {
                setConversations(prev => [conversationData, ...prev]);
            }

            setActiveConversation(conversationData);
            setChatView('chat');
            await loadMessages(conversationData.id);

        } catch (err) {
            console.error('Error starting conversation:', err);
            setError('Failed to start conversation: ' + (err.message || 'Unknown error'));
        }
    };

    const handleBlockUser = async (userEmail) => {
        try {
            await blockUser({ user_email: userEmail });
            setError('User blocked successfully');
            await loadConversations();
        } catch (err) {
            console.error('Error blocking user:', err);
            setError('Failed to block user: ' + (err.message || 'Unknown error'));
        }
    };

    const handleUnblockUser = async (userId) => {
        try {
            await unblockUser(userId);
            await loadBlockedUsers();
            setError('User unblocked successfully');
        } catch (err) {
            console.error('Error unblocking user:', err);
            setError('Failed to unblock user: ' + (err.message || 'Unknown error'));
        }
    };

    const handleMessageAction = async (messageId, action) => {
        try {
            console.log('Performing message action:', messageId, action);
            await messageAction(messageId, action);
            // Message update will be handled via WebSocket or manual reload
            if (activeConversation) {
                await loadMessages(activeConversation.id);
            }
        } catch (err) {
            console.error('Error performing message action:', err);
            setError('Failed to perform action: ' + (err.message || 'Unknown error'));
        }
    };

    // Utility functions
    const getLastMessagePreview = (conversation) => {
        console.log('Getting last message preview for conversation:', conversation);

        const lastMessage = conversation.last_message;

        if (!lastMessage) {
            return 'No messages yet';
        }

        if (typeof lastMessage === 'object' && lastMessage !== null) {
            const deleteStatus = lastMessage.delete_status;

            if (deleteStatus && deleteStatus.is_deleted) {
                return 'Message was deleted';
            }

            const content = lastMessage.content || '';
            if (content) {
                return content.length > 50 ? content.substring(0, 50) + '...' : content;
            }
        }

        if (typeof lastMessage === 'string') {
            return lastMessage.length > 50 ? lastMessage.substring(0, 50) + '...' : lastMessage;
        }

        return 'No messages yet';
    };

    const getMessageDisplay = (message) => {
        const deleteStatus = message.delete_status;

        if (deleteStatus && deleteStatus.is_deleted && !deleteStatus.is_visible) {
            let deletedText = 'This message was deleted';

            if (deleteStatus.deleted_for === 'sender' && message.is_mine) {
                deletedText = 'You deleted this message';
            } else if (deleteStatus.deleted_for === 'both') {
                deletedText = 'This message was deleted';
            }

            return {
                isDeleted: true,
                content: null,
                deletedText: deletedText
            };
        }

        return {
            isDeleted: false,
            content: message.content || 'Message',
            deletedText: null
        };
    };

    const shouldShowMessageActions = (message) => {
        const deleteStatus = message.delete_status;
        return message.is_mine &&
            (!deleteStatus || !deleteStatus.is_deleted || deleteStatus.is_visible);
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const formatTime = (dateString) => {
        try {
            return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (err) {
            console.error('Error formatting time:', err);
            return '';
        }
    };

    const formatDate = (dateString) => {
        try {
            return new Date(dateString).toLocaleDateString();
        } catch (err) {
            console.error('Error formatting date:', err);
            return '';
        }
    };

    // Connection status indicator
    const getConnectionStatusText = () => {
        switch (wsConnectionStatus) {
            case 'connecting':
                return 'Connecting...';
            case 'connected':
                return 'Connected';
            case 'disconnected':
                return 'Disconnected';
            case 'error':
                return 'Connection Error';
            default:
                return 'Unknown';
        }
    };

    const getConnectionStatusClass = () => {
        switch (wsConnectionStatus) {
            case 'connected':
                return 'connected';
            case 'connecting':
                return 'connecting';
            case 'disconnected':
            case 'error':
                return 'offline';
            default:
                return 'offline';
        }
    };

    if (!isOpen) return null;

    return (
        <div className="chat-widgets-container">
            <div className="chat-widgets-overlay" onClick={onClose}></div>

            <div className="chat-widgets-main">
                {/* Connection Status Indicator */}
                {wsConnectionStatus !== 'connected' && (
                    <div className={`chat-widgets-connection-status ${getConnectionStatusClass()}`}>
                        <span>⚠️ {getConnectionStatusText()}</span>
                        {wsConnectionStatus === 'error' && (
                            <button
                                onClick={manualReconnect}
                                className="chat-widgets-reconnect-btn"
                            >
                                Reconnect
                            </button>
                        )}
                    </div>
                )}

                <div className="chat-widgets-header">
                    <h3 className="chat-widgets-title">
                        {chatView === 'conversations' && 'Messages'}
                        {chatView === 'chat' && activeConversation && (
                            <>
                                {activeConversation.other_user?.full_name || 'Chat'}
                                {wsConnectionStatus !== 'connected' && (
                                    <span className="offline-indicator"> ({getConnectionStatusText().toLowerCase()})</span>
                                )}
                            </>
                        )}
                        {chatView === 'search' && 'Find Users'}
                        {chatView === 'blocked' && 'Blocked Users'}
                    </h3>

                    <div className="chat-widgets-header-actions">
                        {chatView !== 'conversations' && (
                            <button
                                className="chat-widgets-back-btn"
                                onClick={() => {
                                    setChatView('conversations');
                                    setActiveConversation(null);
                                    setMessages([]);
                                    setShowUserSearch(false);
                                    setShowBlockedUsers(false);
                                    setError(null);
                                    stopTyping();
                                }}
                            >
                                ← Back
                            </button>
                        )}

                        {chatView === 'conversations' && (
                            <>
                                <button
                                    className="chat-widgets-action-btn"
                                    onClick={() => {
                                        setChatView('search');
                                        setShowUserSearch(true);
                                        setSearchQuery('');
                                        setSearchResults([]);
                                    }}
                                >
                                    + New
                                </button>
                                <button
                                    className="chat-widgets-action-btn"
                                    onClick={() => {
                                        setChatView('blocked');
                                        setShowBlockedUsers(true);
                                        loadBlockedUsers();
                                    }}
                                >
                                    Blocked
                                </button>
                            </>
                        )}

                        <button className="chat-widgets-close-btn" onClick={onClose}>×</button>
                    </div>
                </div>

                {error && (
                    <div className="chat-widgets-error">
                        <p>{error}</p>
                        <button onClick={() => setError(null)} className="chat-widgets-error-close">×</button>
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
                                        onClick={() => {
                                            setChatView('search');
                                            setShowUserSearch(true);
                                        }}
                                    >
                                        Start a conversation
                                    </button>
                                </div>
                            ) : (
                                <div className="chat-widgets-conversations-list">
                                    {conversations.map(conversation => (
                                        <div
                                            key={conversation.id}
                                            className={`chat-widgets-conversation-item ${conversation.unread_count > 0 ? 'has-unread' : ''}`}
                                            onClick={() => handleConversationSelect(conversation)}
                                        >
                                            <div className="chat-widgets-conversation-avatar">
                                                {conversation.other_user?.avatar_url ? (
                                                    <img
                                                        src={conversation.other_user.avatar_url}
                                                        alt={conversation.other_user.full_name}
                                                        className="chat-widgets-avatar-image"
                                                        onError={(e) => {
                                                            e.target.style.display = 'none';
                                                            e.target.nextElementSibling.style.display = 'flex';
                                                        }}
                                                    />
                                                ) : null}
                                                <div
                                                    className={`chat-widgets-avatar-placeholder ${isOnline ? 'online' : ''}`}
                                                    style={{display: conversation.other_user?.avatar_url ? 'none' : 'flex'}}
                                                >
                                                    {conversation.other_user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                                                </div>
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
                                                        {getLastMessagePreview(conversation)}
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
                            <div className="chat-widgets-messages">
                                <div className="chat-widgets-messages-list">
                                    {messagesLoading ? (
                                        <div className="chat-widgets-loading">Loading messages...</div>
                                    ) : messages.length === 0 ? (
                                        <div className="chat-widgets-no-messages">
                                            <p>No messages yet. Start the conversation!</p>
                                        </div>
                                    ) : (
                                        <>
                                            {messages.map(message => {
                                                const messageDisplay = getMessageDisplay(message);

                                                return (
                                                    <div
                                                        key={message.id}
                                                        className={`chat-widgets-message ${message.is_mine ? 'chat-widgets-message-mine' : 'chat-widgets-message-other'} ${messageDisplay.isDeleted ? 'chat-widgets-message-deleted' : ''}`}
                                                    >
                                                        <div className="chat-widgets-message-content">
                                                            {messageDisplay.isDeleted ? (
                                                                <span className="chat-widgets-message-deleted-text">
                                                                    <em>{messageDisplay.deletedText}</em>
                                                                </span>
                                                            ) : (
                                                                <p className="chat-widgets-message-text">{messageDisplay.content}</p>
                                                            )}

                                                            <div className="chat-widgets-message-meta">
                                                                <span className="chat-widgets-message-time">
                                                                    {formatTime(message.created_at)}
                                                                </span>

                                                                {shouldShowMessageActions(message) && (
                                                                    <div className="chat-widgets-message-actions">
                                                                        <button
                                                                            className="chat-widgets-message-action"
                                                                            onClick={() => handleMessageAction(message.id, 'delete_sender')}
                                                                            title="Delete for me"
                                                                        >
                                                                            🗑️
                                                                        </button>
                                                                        <button
                                                                            className="chat-widgets-message-action"
                                                                            onClick={() => handleMessageAction(message.id, 'delete_both')}
                                                                            title="Delete for everyone"
                                                                        >
                                                                            🗑️🗑️
                                                                        </button>
                                                                    </div>
                                                                )}

                                                                {message.can_recover && message.is_mine && (
                                                                    <button
                                                                        className="chat-widgets-message-action chat-widgets-recover-btn"
                                                                        onClick={() => handleMessageAction(message.id, 'recover')}
                                                                        title="Recover message"
                                                                    >
                                                                        ↶ Recover
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                            {/* Typing Indicator */}
                                            {typingUsers.size > 0 && (
                                                <div className="chat-widgets-typing-indicator">
                                                    <div className="chat-widgets-typing-dots">
                                                        <span></span>
                                                        <span></span>
                                                        <span></span>
                                                    </div>
                                                    <span className="chat-widgets-typing-text">
                                                        {typingUsers.size === 1 ? 'typing...' : `${typingUsers.size} people typing...`}
                                                    </span>
                                                </div>
                                            )}
                                        </>
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>
                            </div>

                            <form onSubmit={handleSendMessage} className="chat-widgets-input-form">
                                <div className="chat-widgets-input-container">
                                    <input
                                        type="text"
                                        className="chat-widgets-input"
                                        placeholder={
                                            wsConnectionStatus !== 'connected'
                                                ? 'Connect to chat...'
                                                : 'Type a message...'
                                        }
                                        value={newMessage}
                                        onChange={handleInputChange}
                                        disabled={messagesLoading || wsConnectionStatus !== 'connected'}
                                    />
                                    <button
                                        type="submit"
                                        className="chat-widgets-send-btn"
                                        disabled={!newMessage.trim() || messagesLoading || wsConnectionStatus !== 'connected'}
                                        title={
                                            wsConnectionStatus !== 'connected'
                                                ? 'Not connected to chat server'
                                                : 'Send message'
                                        }
                                    >
                                        {wsConnectionStatus === 'connecting' ? '...' : 'Send'}
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
                                                            onError={(e) => {
                                                                e.target.style.display = 'none';
                                                                e.target.nextElementSibling.style.display = 'flex';
                                                            }}
                                                        />
                                                    ) : null}
                                                    <div
                                                        className="chat-widgets-avatar-placeholder"
                                                        style={{display: user.avatar_url ? 'none' : 'flex'}}
                                                    >
                                                        {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
                                                    </div>
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
                                                            onError={(e) => {
                                                                e.target.style.display = 'none';
                                                                e.target.nextElementSibling.style.display = 'flex';
                                                            }}
                                                        />
                                                    ) : null}
                                                    <div
                                                        className="chat-widgets-avatar-placeholder"
                                                        style={{display: blockedUser.blocked_user?.avatar_url ? 'none' : 'flex'}}
                                                    >
                                                        {blockedUser.blocked_user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                                                    </div>
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
                        {wsConnectionStatus !== 'connected' && (
                            <span className="chat-widgets-offline-note"> (updates when connected)</span>
                        )}
                    </div>
                )}

                {/* Debug Info (Development only) */}
                {process.env.NODE_ENV === 'development' && (
                    <div className="chat-widgets-debug-info">
                        <small>
                            WS: {wsConnectionStatus} |
                            Attempts: {reconnectAttempts.current} |
                            Online: {isOnline.toString()}
                        </small>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatWidgets;