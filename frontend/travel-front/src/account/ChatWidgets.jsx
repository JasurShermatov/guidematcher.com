import React, { useState, useEffect, useRef } from 'react';
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
    const [error, setError] = useState(null);
    const [showUserSearch, setShowUserSearch] = useState(false);
    const [showBlockedUsers, setShowBlockedUsers] = useState(false);
    const [blockedUsers, setBlockedUsers] = useState([]);
    const [chatView, setChatView] = useState('conversations'); // 'conversations', 'chat', 'search', 'blocked'

    const messagesEndRef = useRef(null);
    const searchTimeoutRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            initializeChat();
        }
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

            // Load current user
            const userData = await getCurrentUser();
            setCurrentUser(userData);

            // Load conversations and unread count
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

    const loadConversations = async () => {
        try {
            const data = await getConversations();
            setConversations(data.results || data);
        } catch (err) {
            console.error('Error loading conversations:', err);
        }
    };

    const loadMessages = async (conversationId) => {
        try {
            const data = await getChatMessages(conversationId);
            setMessages(data.results || data);

            // Mark messages as read
            await markMessagesAsRead(conversationId);
            loadUnreadCount();
        } catch (err) {
            console.error('Error loading messages:', err);
        }
    };

    const loadUnreadCount = async () => {
        try {
            const data = await getUnreadCount();
            setUnreadCount(data.total_unread || 0);
        } catch (err) {
            console.error('Error loading unread count:', err);
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

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeConversation) return;

        try {
            const messageData = {
                conversation: activeConversation.id,
                content: newMessage.trim()
            };

            const sentMessage = await sendMessage(messageData);
            setMessages(prev => [sentMessage, ...prev]);
            setNewMessage('');

            // Update conversation list
            loadConversations();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleConversationSelect = async (conversation) => {
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

            // Find or add the conversation to the list
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

    const handleMessageAction = async (messageId, action) => {
        try {
            await messageAction(messageId, action);
            // Reload messages to reflect changes
            if (activeConversation) {
                await loadMessages(activeConversation.id);
            }
        } catch (err) {
            setError(err.message);
        }
    };

    // Oxirgi xabar preview uchun funksiya
    const getLastMessagePreview = (lastMessage) => {
        if (!lastMessage) {
            return 'No messages yet';
        }

        // Agar delete_status mavjud bo'lmasa yoki 'visible' bo'lsa
        if (!lastMessage.delete_status || lastMessage.delete_status === 'visible') {
            return lastMessage.content || 'No messages yet';
        }

        // O'chirilgan xabarlar uchun
        if (lastMessage.delete_status === 'deleted_sender' ||
            lastMessage.delete_status === 'deleted_both' ||
            lastMessage.delete_status === 'deleted_receiver') {
            return 'Message was deleted';
        }

        return lastMessage.content || 'No messages yet';
    };

    // Message ko'rinishi uchun tekshirish funksiyasi
    const getMessageDisplay = (message) => {
        // Agar delete_status mavjud bo'lmasa yoki 'visible' bo'lsa, oddiy xabarni ko'rsatish
        if (!message.delete_status || message.delete_status === 'visible') {
            return {
                isDeleted: false,
                content: message.content,
                deletedText: null
            };
        }

        // O'chirilgan xabarlar uchun
        let deletedText = 'This message was deleted';

        if (message.delete_status === 'deleted_sender' && message.is_mine) {
            deletedText = 'You deleted this message';
        } else if (message.delete_status === 'deleted_both') {
            deletedText = 'This message was deleted';
        } else if (message.delete_status === 'deleted_receiver' && !message.is_mine) {
            // Agar qabul qiluvchi o'chirgan bo'lsa va bu men emas bo'lsam
            deletedText = 'This message was deleted';
        }

        return {
            isDeleted: true,
            content: null,
            deletedText: deletedText
        };
    };

    // Xabar actions ko'rsatish uchun tekshirish
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
                        {chatView === 'conversations' && 'Messages'}
                        {chatView === 'chat' && activeConversation && activeConversation.other_user?.full_name}
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
                                    setShowUserSearch(false);
                                    setShowBlockedUsers(false);
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

                    {/* Chat Messages View - TO'G'IRLANGAN QISM */}
                    {chatView === 'chat' && activeConversation && (
                        <div className="chat-widgets-chat">
                            <div className="chat-widgets-messages">
                                <div className="chat-widgets-messages-list">
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
                                    <div ref={messagesEndRef} />
                                </div>
                            </div>

                            <form onSubmit={handleSendMessage} className="chat-widgets-input-form">
                                <div className="chat-widgets-input-container">
                                    <input
                                        type="text"
                                        className="chat-widgets-input"
                                        placeholder="Type a message..."
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                    />
                                    <button
                                        type="submit"
                                        className="chat-widgets-send-btn"
                                        disabled={!newMessage.trim()}
                                    >
                                        Send
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