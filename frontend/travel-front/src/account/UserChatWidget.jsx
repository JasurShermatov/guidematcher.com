import React, { useState, useEffect, useRef } from 'react';
import { FiSend, FiX, FiUsers, FiMessageSquare } from 'react-icons/fi';
import './UserChatWidget.css';

const UserChatWidget = ({ user, guides, chatMessages, setChatMessages, handleOpenChat }) => {
  const [activeChat, setActiveChat] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const chatContainerRef = useRef(null);

  // Scroll to bottom of chat when messages update
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages, activeChat]);

  // Handle opening a chat with a guide
  const openChat = (guideId) => {
    if (!chatMessages[guideId]) {
      setChatMessages({
        ...chatMessages,
        [guideId]: []
      });
    }
    setActiveChat(guideId);
    handleOpenChat(guideId);
  };

  // Handle sending a message
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat) return;

    const newChatMessage = {
      id: (chatMessages[activeChat]?.length || 0) + 1,
      sender: user.id,
      content: newMessage.trim(),
      timestamp: new Date().toISOString()
    };

    setChatMessages({
      ...chatMessages,
      [activeChat]: [...(chatMessages[activeChat] || []), newChatMessage]
    });

    // Simulate guide response (for demo purposes)
    setTimeout(() => {
      const guide = guides.find(g => g.id === activeChat);
      if (guide) {
        const responseMessage = {
          id: (chatMessages[activeChat]?.length || 0) + 2,
          sender: guide.id,
          content: `Hi ${user.firstName}, thanks for your message! How can I assist you with your tour?`,
          timestamp: new Date().toISOString()
        };
        setChatMessages(prev => ({
          ...prev,
          [activeChat]: [...(prev[activeChat] || []), responseMessage]
        }));
      }
    }, 1000);

    setNewMessage('');
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="user-chat-widget">
      <div className="user-chat-widget-header">
        <h3 className="user-chat-widget-title">
          <FiMessageSquare /> Chats
        </h3>
        {activeChat && (
          <button
            className="user-chat-widget-close"
            onClick={() => setActiveChat(null)}
            aria-label="Close chat"
          >
            <FiX size={20} />
          </button>
        )}
      </div>

      {!activeChat ? (
        <div className="user-chat-widget-contacts">
          {guides.map(guide => (
            <div
              key={guide.id}
              className="user-chat-widget-contact"
              onClick={() => openChat(guide.id)}
            >
              <div className="user-chat-widget-contact-avatar-container">
                <img
                  src={guide.image}
                  alt={`${guide.name}'s avatar`}
                  className="user-chat-widget-contact-avatar"
                />
                <div className={`user-chat-widget-online-status ${guide.isOnline ? 'user-chat-widget-online' : 'user-chat-widget-offline'}`}></div>
              </div>
              <div className="user-chat-widget-contact-info">
                <h4 className="user-chat-widget-contact-name">{guide.name}</h4>
                <p className="user-chat-widget-contact-location">{guide.destination}</p>
                {chatMessages[guide.id]?.length > 0 && (
                  <p className="user-chat-widget-contact-last-message">
                    {chatMessages[guide.id][chatMessages[guide.id].length - 1].content.slice(0, 30) + '...'}
                  </p>
                )}
              </div>
            </div>
          ))}
          {guides.length === 0 && (
            <div className="user-chat-widget-empty">
              <FiUsers size={48} />
              <p>No guides available to chat with.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="user-chat-widget-chat">
          <div className="user-chat-widget-chat-header">
            <div className="user-chat-widget-contact-avatar-container">
              <img
                src={guides.find(g => g.id === activeChat)?.image}
                alt="Guide avatar"
                className="user-chat-widget-contact-avatar"
              />
              <div className={`user-chat-widget-online-status ${guides.find(g => g.id === activeChat)?.isOnline ? 'user-chat-widget-online' : 'user-chat-widget-offline'}`}></div>
            </div>
            <div className="user-chat-widget-chat-info">
              <h4 className="user-chat-widget-contact-name">
                {guides.find(g => g.id === activeChat)?.name}
              </h4>
              <p className="user-chat-widget-contact-location">
                {guides.find(g => g.id === activeChat)?.destination}
              </p>
            </div>
          </div>
          <div className="user-chat-widget-messages" ref={chatContainerRef}>
            {chatMessages[activeChat]?.map(message => (
              <div
                key={message.id}
                className={`user-chat-widget-message ${
                  message.sender === user.id
                    ? 'user-chat-widget-message-sent'
                    : 'user-chat-widget-message-received'
                }`}
              >
                <div className="user-chat-widget-message-content">
                  <p>{message.content}</p>
                  <span className="user-chat-widget-message-timestamp">
                    {formatTimestamp(message.timestamp)}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <form className="user-chat-widget-input-form" onSubmit={handleSendMessage}>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="user-chat-widget-input"
              aria-label="Type a message"
            />
            <button
              type="submit"
              className="user-chat-widget-send-btn"
              aria-label="Send message"
            >
              <FiSend />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default UserChatWidget;