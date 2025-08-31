import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
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
    connectWebSocket,
    closeWebSocket,
    sendTypingIndicator,
} from '../api/api';
import './ChatWidgets.css';

const ChatWidgets = ({ isOpen, onClose, selectedUserId = null, userRole = 'client' }) => {
    const { t } = useTranslation();
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
    const [showUserSearch, setShowUserSearch] = useState(false);
    const [showBlockedUsers, setShowBlockedUsers] = useState(false);
    const [blockedUsers, setBlockedUsers] = useState([]);
    const [chatView, setChatView] = useState('conversations');
    const [wsStatus, setWsStatus] = useState('disconnected');
    const [typingUsers, setTypingUsers] = useState([]);
    const [onlineUsers, setOnlineUsers] = useState([]);

    const messagesEndRef = useRef(null);
    const searchTimeoutRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            initializeChat();
        }
        return () => {
            if (activeConversation) {
                closeWebSocket(activeConversation.id);
            }
        };
    }, [isOpen]);

    useEffect(() => {
        if (selectedUserId && isOpen) {
            startConversationWithUser(selectedUserId);
        }
    }, [selectedUserId, isOpen]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

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
            setError(t('chat.errors.initialize_failed'));
        } finally {
            setLoading(false);
        }
    };

    const loadConversations = async () => {
        try {
            const data = await getConversations();
            setConversations(data.results || data);
        } catch (err) {
            console.error('Error loading conversations:', err);
            setError(t('chat.errors.load_conversations_failed'));
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
            setError(t('chat.errors.load_messages_failed'));
        }
    };

    const loadUnreadCount = async () => {
        try {
            const data = await getUnreadCount();
            setUnreadCount(data.total_unread || 0);
        } catch (err) {
            console.error('Error loading unread count:', err);
            setError(t('chat.errors.load_unread_count_failed'));
        }
    };

    const loadBlockedUsers = async () => {
        try {
            const data = await getBlockedUsers();
            setBlockedUsers(data.results || data);
        } catch (err) {
            console.error('Error loading blocked users:', err);
            setError(t('chat.errors.load_blocked_users_failed'));
        }
    };

    const setupWebSocket = (conversationId) => {
        connectWebSocket(
            conversationId,
            (data) => {
                if (data.type === 'chat_message') {
                    setMessages(prev => [data.message, ...prev]);
                    loadConversations();
                    loadUnreadCount();
                } else if (data.type === 'message_action') {
                    setMessages(prev => prev.map(msg => msg.id === data.message_id ? { ...msg, ...data.message } : msg));
                } else if (data.type === 'message_read') {
                    setMessages(prev => prev.map(msg => msg.id === data.message_id ? { ...msg, is_read: true, read_at: new Date().toISOString() } : msg));
                } else if (data.type === 'typing_indicator') {
                    if (data.is_typing) {
                        setTypingUsers(prev => [...new Set([...prev, data.user_name])]);
                    } else {
                        setTypingUsers(prev => prev.filter(name => name !== data.user_name));
                    }
                } else if (data.type === 'user_online') {
                    setOnlineUsers(prev => [...new Set([...prev, data.user_name])]);
                } else if (data.type === 'user_offline') {
                    setOnlineUsers(prev => prev.filter(name => name !== data.user_name));
                }
            },
            () => setWsStatus('connected'),
            () => setWsStatus('disconnected'),
            (err) => {
                setError(t('chat.errors.websocket_error', { message: err.message }));
                setWsStatus('error');
            }
        );
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeConversation) return;
        try {
            const optimisticMessage = await sendMessage({
                conversation: activeConversation.id,
                content: newMessage.trim()
            });
            setMessages(prev => [optimisticMessage, ...prev]);
            setNewMessage('');
            loadConversations();
        } catch (err) {
            setError(t('chat.errors.send_message_failed'));
        }
    };

    const handleMessageChange = (e) => {
        setNewMessage(e.target.value);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        sendTypingIndicator(activeConversation.id, true);
        typingTimeoutRef.current = setTimeout(() => {
            sendTypingIndicator(activeConversation.id, false);
        }, 3000);
    };

    const handleConversationSelect = async (conversation) => {
        setActiveConversation(conversation);
        setChatView('chat');
        setTypingUsers([]);
        setOnlineUsers([]);
        await loadMessages(conversation.id);
        setupWebSocket(conversation.id);
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
                    setError(t('chat.errors.search_users_failed'));
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
            setupWebSocket(conversationData.id);
        } catch (err) {
            setError(t('chat.errors.create_conversation_failed'));
        }
    };

    const handleBlockUser = async (userEmail) => {
        try {
            await blockUser({ user_email: userEmail });
            setError(t('chat.success.user_blocked'));
            loadConversations();
        } catch (err) {
            setError(t('chat.errors.block_user_failed'));
        }
    };

    const handleUnblockUser = async (userId) => {
        try {
            await unblockUser(userId);
            loadBlockedUsers();
            setError(t('chat.success.user_unblocked'));
        } catch (err) {
            setError(t('chat.errors.unblock_user_failed'));
        }
    };

    const handleMessageAction = async (messageId, action) => {
        try {
            await messageAction(activeConversation.id, messageId, action);
            if (activeConversation) {
                await loadMessages(activeConversation.id);
            }
        } catch (err) {
            setError(t('chat.errors.message_action_failed'));
        }
    };

    const getLastMessagePreview = (lastMessage) => {
        if (!lastMessage) {
            return t('chat.conversations.no_messages');
        }

        if (lastMessage.delete_status && lastMessage.delete_status !== 'visible') {
            if (lastMessage.content) {
                return lastMessage.content;
            }
            return t('chat.conversations.message_deleted');
        }

        return lastMessage.content || t('chat.conversations.no_messages');
    };

    const getMessageDisplay = (message) => {
        return {
            isDeleted: message.delete_status && message.delete_status !== 'visible',
            content: message.content || t('chat.chat.no_content'),
            deleteStatus: message.delete_status,
            showDeletedInfo: message.delete_status && message.delete_status !== 'visible'
        };
    };

    const getDeletedStatusText = (deleteStatus, isMine) => {
        if (!deleteStatus || deleteStatus === 'visible') return null;

        switch (deleteStatus) {
            case 'deleted_sender':
                return isMine ? t('chat.chat.deleted_by_sender_mine') : t('chat.chat.deleted_by_sender_other');
            case 'deleted_receiver':
                return isMine ? t('chat.chat.deleted_by_receiver_mine') : t('chat.chat.deleted_by_receiver_other');
            case 'deleted_both':
                return t('chat.chat.deleted_for_everyone');
            default:
                return t('chat.chat.message_deleted');
        }
    };

    const shouldShowMessageActions = (message) => {
        return message.is_mine && (!message.delete_status || message.delete_status === 'visible');
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

    if (!isOpen) return null;

    return (
        <div className="chat-widgets-container">
            <div className="chat-widgets-overlay" onClick={onClose}></div>

            <div className="chat-widgets-main">
                <div className="chat-widgets-header">
                    <h3 className="chat-widgets-title">
                        {chatView === 'conversations' && t('chat.title.messages')}
                        {chatView === 'chat' && activeConversation && activeConversation.other_user?.full_name}
                        {chatView === 'search' && t('chat.title.search_users')}
                        {chatView === 'blocked' && t('chat.title.blocked_users')}
                    </h3>

                    <div className="chat-widgets-header-actions">
                        {chatView !== 'conversations' && (
                            <button
                                className="chat-widgets-back-btn"
                                onClick={() => {
                                    setChatView('conversations');
                                    setActiveConversation(null);
                                    setShowUserSearch(false);
                                    setShowBlockedUsers(false);
                                }}
                            >
                                {t('chat.actions.back')}
                            </button>
                        )}

                        {chatView === 'conversations' && (
                            <>
                                <button
                                    className="chat-widgets-action-btn"
                                    onClick={() => {
                                        setChatView('search');
                                        setShowUserSearch(true);
                                    }}
                                >
                                    {t('chat.actions.new_conversation')}
                                </button>
                                <button
                                    className="chat-widgets-action-btn"
                                    onClick={() => {
                                        setChatView('blocked');
                                        setShowBlockedUsers(true);
                                        loadBlockedUsers();
                                    }}
                                >
                                    {t('chat.actions.blocked_users')}
                                </button>
                            </>
                        )}

                        {chatView === 'chat' && (
                            <span className={`chat-widgets-status ${wsStatus}`}>
                                {wsStatus === 'connected' ? t('chat.status.online') : t('chat.status.offline')}
                            </span>
                        )}

                        <button className="chat-widgets-close-btn" onClick={onClose}>{t('chat.actions.close')}</button>
                    </div>
                </div>

                {error && (
                    <div className="chat-widgets-error">
                        <p>{error}</p>
                        <button onClick={() => setError(null)} className="chat-widgets-error-close">{t('chat.actions.close_error')}</button>
                    </div>
                )}

                <div className="chat-widgets-content">
                    {chatView === 'conversations' && (
                        <div className="chat-widgets-conversations">
                            {loading ? (
                                <div className="chat-widgets-loading">{t('chat.conversations.loading')}</div>
                            ) : conversations.length === 0 ? (
                                <div className="chat-widgets-empty">
                                    <p>{t('chat.conversations.no_conversations')}</p>
                                    <button
                                        className="chat-widgets-btn chat-widgets-btn-primary"
                                        onClick={() => {
                                            setChatView('search');
                                            setShowUserSearch(true);
                                        }}
                                    >
                                        {t('chat.conversations.start_conversation')}
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
                                                        {conversation.other_user?.full_name?.charAt(0) || t('chat.conversations.unknown_user_initial')}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="chat-widgets-conversation-info">
                                                <div className="chat-widgets-conversation-header">
                                                    <h4 className="chat-widgets-conversation-name">
                                                        {conversation.other_user?.full_name || t('chat.conversations.unknown_user')}
                                                    </h4>
                                                    <span className="chat-widgets-conversation-time">
                                                        {formatTime(conversation.updated_at)}
                                                    </span>
                                                </div>

                                                <div className="chat-widgets-conversation-preview">
                                                    <p className="chat-widgets-last-message">
                                                        {getLastMessagePreview(conversation.last_message)}
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

                    {chatView === 'chat' && activeConversation && (
                        <div className="chat-widgets-chat">
                            <div className="chat-widgets-status-bar">
                                {onlineUsers.length > 0 && <span>{t('chat.chat.online_users', { users: onlineUsers.join(', ') })}</span>}
                                {typingUsers.length > 0 && <span>{t('chat.chat.typing_users', { users: typingUsers.join(', ') })}</span>}
                            </div>
                            <div className="chat-widgets-messages">
                                <div className="chat-widgets-messages-list">
                                    {messages.map(message => {
                                        const messageDisplay = getMessageDisplay(message);
                                        const deletedStatusText = getDeletedStatusText(messageDisplay.deleteStatus, message.is_mine);

                                        return (
                                            <div
                                                key={message.id}
                                                className={`chat-widgets-message ${message.is_mine ? 'chat-widgets-message-mine' : 'chat-widgets-message-other'} ${messageDisplay.isDeleted ? 'chat-widgets-message-deleted' : ''}`}
                                            >
                                                <div className="chat-widgets-message-content">
                                                    <div className="chat-widgets-message-text-wrapper">
                                                        <p className="chat-widgets-message-text">{messageDisplay.content}</p>
                                                        {messageDisplay.showDeletedInfo && deletedStatusText && (
                                                            <span className="chat-widgets-message-deleted-info">
                                                                <small><em>{deletedStatusText}</em></small>
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="chat-widgets-message-meta">
                                                        <span className="chat-widgets-message-time">
                                                            {formatTime(message.created_at)}
                                                        </span>
                                                        {shouldShowMessageActions(message) && (
                                                            <div className="chat-widgets-message-actions">
                                                                <button
                                                                    className="chat-widgets-message-action"
                                                                    onClick={() => handleMessageAction(message.id, 'delete_sender')}
                                                                    title={t('chat.chat.actions.delete_for_me')}
                                                                >
                                                                    🗑️
                                                                </button>
                                                                <button
                                                                    className="chat-widgets-message-action"
                                                                    onClick={() => handleMessageAction(message.id, 'delete_both')}
                                                                    title={t('chat.chat.actions.delete_for_everyone')}
                                                                >
                                                                    🗑️🗑️
                                                                </button>
                                                            </div>
                                                        )}
                                                        {message.can_recover && message.is_mine && (
                                                            <button
                                                                className="chat-widgets-message-action chat-widgets-recover-btn"
                                                                onClick={() => handleMessageAction(message.id, 'recover')}
                                                                title={t('chat.chat.actions.recover')}
                                                            >
                                                                {t('chat.chat.actions.recover')}
                                                            </button>
                                                        )}
                                                        {message.is_read && <span className="chat-widgets-read-status">{t('chat.chat.read_status')}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div ref={messagesEndRef} />
                                </div>
                            </div>

                            <form onSubmit={handleSendMessage} className="chat-widgets-input-form">
                                <div className="chat-widgets-input-container">
                                    <input
                                        type="text"
                                        className="chat-widgets-input"
                                        placeholder={t('chat.chat.input_placeholder')}
                                        value={newMessage}
                                        onChange={handleMessageChange}
                                    />
                                    <button
                                        type="submit"
                                        className="chat-widgets-send-btn"
                                        disabled={!newMessage.trim()}
                                    >
                                        {t('chat.chat.actions.send')}
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
                                    {t('chat.chat.actions.block_user')}
                                </button>
                            </div>
                        </div>
                    )}

                    {chatView === 'search' && (
                        <div className="chat-widgets-search">
                            <div className="chat-widgets-search-input">
                                <input
                                    type="text"
                                    className="chat-widgets-input"
                                    placeholder={t('chat.search.placeholder')}
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        handleUserSearch(e.target.value);
                                    }}
                                />
                            </div>

                            <div className="chat-widgets-search-results">
                                {searchQuery.length < 2 ? (
                                    <p className="chat-widgets-search-hint">{t('chat.search.hint')}</p>
                                ) : searchResults.length === 0 ? (
                                    <p className="chat-widgets-no-results">{t('chat.search.no_results')}</p>
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
                                                            {user.full_name?.charAt(0) || t('chat.search.unknown_user_initial')}
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

                    {chatView === 'blocked' && (
                        <div className="chat-widgets-blocked">
                            {blockedUsers.length === 0 ? (
                                <p className="chat-widgets-no-blocked">{t('chat.blocked.no_blocked_users')}</p>
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
                                                            {blockedUser.blocked_user?.full_name?.charAt(0) || t('chat.blocked.unknown_user_initial')}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="chat-widgets-user-info">
                                                    <h4 className="chat-widgets-user-name">
                                                        {blockedUser.blocked_user?.full_name || t('chat.blocked.unknown_user')}
                                                    </h4>
                                                    <p className="chat-widgets-user-email">
                                                        {blockedUser.blocked_user?.email}
                                                    </p>
                                                    <span className="chat-widgets-blocked-date">
                                                        {t('chat.blocked.blocked_on', { date: formatDate(blockedUser.created_at) })}
                                                    </span>
                                                </div>
                                            </div>

                                            <button
                                                className="chat-widgets-btn chat-widgets-btn-unblock"
                                                onClick={() => handleUnblockUser(blockedUser.blocked_user.id)}
                                            >
                                                {t('chat.blocked.actions.unblock')}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {unreadCount > 0 && chatView === 'conversations' && (
                    <div className="chat-widgets-unread-total">
                        {t('chat.conversations.total_unread', { count: unreadCount })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatWidgets;