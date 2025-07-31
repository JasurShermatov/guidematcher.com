import React, { useState, useEffect, useRef } from 'react';
import { FiSend, FiX, FiMessageSquare, FiPaperclip, FiSmile, FiSearch } from 'react-icons/fi';
import './GuideChatWidget.css';

const GuideChatWidget = ({ chatMessages, setChatMessages, requests, openChat, stats }) => {
  const [isChatOpen, setChatOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const chatEndRef = useRef(null);

  // Scroll to bottom of chat when messages change or client is selected
  useEffect(() => {
    if (selectedClient && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedClient, chatMessages]);

  // Mark messages as read when chat is opened
  useEffect(() => {
    if (selectedClient) {
      setChatMessages(prev =>
        prev.map(chat =>
          chat.clientId === selectedClient
            ? {
                ...chat,
                unreadCount: 0,
                messages: chat.messages.map(msg =>
                  msg.status === 'delivered' ? { ...msg, status: 'read' } : msg
                ),
              }
            : chat
        )
      );
    }
  }, [selectedClient, setChatMessages]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedClient) return;

    const newMsg = {
      id: `msg_${Date.now()}`,
      sender: 'Guide',
      text: newMessage,
      timestamp: new Date().toISOString(),
      status: 'sent',
    };

    setChatMessages(prev =>
      prev.map(chat =>
        chat.clientId === selectedClient
          ? {
              ...chat,
              messages: [...chat.messages, newMsg],
              lastMessage: newMessage,
              lastMessageTime: newMsg.timestamp,
            }
          : chat
      )
    );

    setNewMessage('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    return isToday
      ? date.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
      : date.toLocaleDateString('uz-UZ', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        });
  };

  const getClientName = (clientId) => {
    const request = requests.find(req => req.clientId === clientId);
    return request ? request.clientName : 'Unknown Client';
  };

  const getClientPhoto = (clientId) => {
    const request = requests.find(req => req.clientId === clientId);
    return request ? request.clientPhoto : 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=50&h=50&fit=crop&crop=face';
  };

  return (
    <div className={`guide-chat-widget ${isChatOpen ? 'open' : ''}`}>
      <div className="guide-chat-toggle" onClick={() => setChatOpen(!isChatOpen)}>
        <FiMessageSquare />
        {stats.totalUnreadMessages > 0 && (
          <span className="guide-chat-badge">{stats.totalUnreadMessages}</span>
        )}
      </div>

      <div className="guide-chat-container">
        <div className="guide-chat-sidebar">
          <div className="guide-chat-header">
            <h3>Xabarlar</h3>
            <button onClick={() => setChatOpen(false)}>
              <FiX />
            </button>
          </div>
          <div className="guide-chat-search">
            <FiSearch />
            <input type="text" placeholder="Mijozni qidirish..." />
          </div>
          <div className="guide-chat-list">
            {chatMessages.map(chat => (
              <div
                key={chat.clientId}
                className={`guide-chat-item ${selectedClient === chat.clientId ? 'active' : ''}`}
                onClick={() => {
                  setSelectedClient(chat.clientId);
                  openChat(chat.clientId);
                }}
              >
                <div className="guide-chat-avatar-container">
                  <img src={getClientPhoto(chat.clientId)} alt={getClientName(chat.clientId)} />
                  <div
                    className={`guide-chat-status ${
                      requests.find(req => req.clientId === chat.clientId)?.isOnline
                        ? 'online'
                        : 'offline'
                    }`}
                  ></div>
                </div>
                <div className="guide-chat-info">
                  <div className="guide-chat-name-row">
                    <h4>{getClientName(chat.clientId)}</h4>
                    <span>{formatMessageTime(chat.lastMessageTime)}</span>
                  </div>
                  <p>{chat.lastMessage.substring(0, 50)}{chat.lastMessage.length > 50 ? '...' : ''}</p>
                  {chat.unreadCount > 0 && (
                    <span className="guide-chat-unread">{chat.unreadCount}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="guide-chat-main">
          {selectedClient ? (
            <>
              <div className="guide-chat-main-header">
                <div className="guide-chat-client-info">
                  <img
                    src={getClientPhoto(selectedClient)}
                    alt={getClientName(selectedClient)}
                  />
                  <div>
                    <h3>{getClientName(selectedClient)}</h3>
                    <span>
                      {requests.find(req => req.clientId === selectedClient)?.isOnline
                        ? 'Online'
                        : `Oxirgi faollik: ${formatMessageTime(
                            requests.find(req => req.clientId === selectedClient)?.lastSeen
                          )}`}
                    </span>
                  </div>
                </div>
                <button onClick={() => setSelectedClient(null)}>
                  <FiX />
                </button>
              </div>
              <div className="guide-chat-messages">
                {chatMessages
                  .find(chat => chat.clientId === selectedClient)
                  ?.messages.map(message => (
                    <div
                      key={message.id}
                      className={`guide-chat-message ${
                        message.sender === 'Guide' ? 'sent' : 'received'
                      }`}
                    >
                      <div className="guide-chat-message-content">
                        <p>{message.text}</p>
                        <div className="guide-chat-message-meta">
                          <span>{formatMessageTime(message.timestamp)}</span>
                          {message.sender === 'Guide' && (
                            <span className={`guide-chat-message-status ${message.status}`}>
                              {message.status === 'sent' ? 'Yuborildi' : 'O\'qildi'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                <div ref={chatEndRef} />
              </div>
              <div className="guide-chat-input">
                <button className="guide-chat-action-btn">
                  <FiPaperclip />
                </button>
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Xabar yozing..."
                  rows={2}
                />
                <button
                  className="guide-chat-send-btn"
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                >
                  <FiSend />
                </button>
              </div>
            </>
          ) : (
            <div className="guide-chat-empty">
              <FiMessageSquare />
              <p>Mijozni tanlang va suhbatni boshlang</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GuideChatWidget;