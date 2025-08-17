import React, { useState } from 'react';
import { FiMessageCircle, FiX, FiSend } from 'react-icons/fi';
import './ChatWidgets.css';

const ChatWidgets = ({ user, role, guides, requests, chatMessages, setChatMessages, onClose, selectedClient }) => {
  const [activeChatId, setActiveChatId] = useState(selectedClient || null);
  const [newMessage, setNewMessage] = useState('');

  const getChatPartner = (chat) => {
    if (role === 'Client') {
      const guide = guides.find(g => g.id === chat.guideId);
      return { id: guide?.id, name: guide?.name || 'Unknown Guide', image: guide?.image };
    } else {
      const request = requests.find(r => r.clientId === chat.clientId);
      return { id: request?.clientId, name: request?.clientName || 'Unknown Client', image: request?.clientPhoto };
    }
  };

  const handleSendMessage = (chatId) => {
    if (!newMessage.trim()) return;
    const updatedMessages = chatMessages.map(chat => 
      chat[role === 'Client' ? 'guideId' : 'clientId'] === chatId
        ? {
            ...chat,
            messages: [
              ...chat.messages,
              {
                id: `msg_${Date.now()}`,
                sender: role,
                text: newMessage,
                timestamp: new Date().toISOString(),
                status: 'sent'
              }
            ],
            unreadCount: role === 'Client' ? chat.unreadCount : chat.unreadCount + 1
          }
        : chat
    );
    setChatMessages(updatedMessages);
    setNewMessage('');
  };

  return (
    <div className="chat-widget">
      <div className="chat-widget-header">
        <h3>Chat</h3>
        <button onClick={onClose}><FiX size={20} /></button>
      </div>
      <div className="chat-widget-body">
        <div className="chat-widget-contacts">
          {chatMessages.map(chat => {
            const partner = getChatPartner(chat);
            return (
              <div
                key={partner.id}
                className={`chat-contact ${activeChatId === partner.id ? 'active' : ''}`}
                onClick={() => setActiveChatId(partner.id)}
              >
                <img src={partner.image} alt={partner.name} className="chat-contact-avatar" />
                <div>
                  <span>{partner.name}</span>
                  <small>{chat.lastMessage}</small>
                  {chat.unreadCount > 0 && <span className="chat-unread-count">{chat.unreadCount}</span>}
                </div>
              </div>
            );
          })}
        </div>
        {activeChatId && (
          <div className="chat-widget-messages">
            {chatMessages.find(chat => chat[role === 'Client' ? 'guideId' : 'clientId'] === activeChatId)?.messages.map(msg => (
              <div
                key={msg.id}
                className={`chat-message ${msg.sender === role ? 'sent' : 'received'}`}
              >
                <p>{msg.text}</p>
                <small>{new Date(msg.timestamp).toLocaleTimeString('uz-UZ')}</small>
              </div>
            ))}
            <div className="chat-input">
              <input
                type="text"
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                placeholder="Xabar yozing..."
              />
              <button onClick={() => handleSendMessage(activeChatId)}><FiSend /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatWidgets;