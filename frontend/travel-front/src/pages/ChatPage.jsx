import React, { useState } from 'react';
import {
    Send,
    Paperclip,
    Video,
    MoreVertical,
    Globe,
    Smile,
    X,
    FileText,
    Image as ImageIcon,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const ChatPage = () => {
    const { t } = useLanguage();

    const [message, setMessage] = useState('');
    const [selectedChat, setSelectedChat] = useState(1);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [filePreview, setFilePreview] = useState(null);

    // Common emojis for the picker
    const commonEmojis = [
        '😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇',
        '🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚',
        '😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🤩',
        '🥳','😏','😒','😞','😔','😟','😕','🙁','☹️','😣',
        '😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬',
        '🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗',
        '👍','👎','👌','🤞','✌️','🤟','🤘','👏','🙌','👐',
        '🤲','🤝','🙏','✍️','💪','🦾','🦿','🦵','🦶','👂',
        '🎉','🎊','🎈','🎁','🎀','🎂','🍰','🧁','🍭','🍬',
        '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔',
        '❣️','💕','💞','💓','💗','💖','💘','💝','💟','☮️'
    ];

    const [conversations, setConversations] = useState(() => {
        const saved = localStorage.getItem('chatConversations');
        return saved
            ? JSON.parse(saved)
            : [
                {
                    id: 1,
                    name: 'Elena Popova',
                    avatar:
                        'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
                    role: 'Guide',
                    lastMessage:
                        'Great! Looking forward to showing you around Prague!',
                    timestamp: '2m ago',
                    unread: 0,
                    online: true,
                    booking: 'Historical Tour - March 15, 2024',
                },
                {
                    id: 2,
                    name: 'Marco Silva',
                    avatar:
                        'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
                    role: 'Guide',
                    lastMessage:
                        'Perfect! The food tour will be amazing. See you at 2 PM.',
                    timestamp: '1h ago',
                    unread: 2,
                    online: false,
                    booking: 'Food Tour - March 20, 2024',
                },
                {
                    id: 3,
                    name: 'Sarah Johnson',
                    avatar:
                        'https://images.pexels.com/photos/1036623/pexels-photo-1036623.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
                    role: 'Tourist',
                    lastMessage: 'Thank you for the booking confirmation!',
                    timestamp: '3h ago',
                    unread: 0,
                    online: true,
                    booking: 'Photography Session - March 22, 2024',
                },
            ];
    });

    const [messages, setMessages] = useState(() => {
        const saved = localStorage.getItem('chatMessages');
        return saved
            ? JSON.parse(saved)
            : [
                {
                    id: 1,
                    sender: 'other',
                    content:
                        "Hello! I saw your booking for the historical tour. I'm excited to show you around Prague!",
                    timestamp: '10:30 AM',
                    type: 'text',
                },
                {
                    id: 2,
                    sender: 'me',
                    content:
                        "Hi Elena! We're so excited too. This is our first time in Prague. What should we expect for the tour?",
                    timestamp: '10:32 AM',
                    type: 'text',
                },
                {
                    id: 3,
                    sender: 'other',
                    content:
                        "We'll visit the Prague Castle, walk through the Old Town, and I'll share fascinating stories about Czech history. The tour will be about 3 hours.",
                    timestamp: '10:35 AM',
                    type: 'text',
                },
                {
                    id: 4,
                    sender: 'other',
                    content:
                        "Here's a photo of one of the stops we'll visit - the Astronomical Clock!",
                    timestamp: '10:36 AM',
                    type: 'image',
                    imageUrl:
                        'https://images.pexels.com/photos/2607544/pexels-photo-2607544.jpeg?auto=compress&cs=tinysrgb&w=300&h=200&fit=crop',
                },
                {
                    id: 5,
                    sender: 'me',
                    content:
                        'That looks amazing! Should we meet at the entrance of Prague Castle?',
                    timestamp: '10:40 AM',
                    type: 'text',
                },
                {
                    id: 6,
                    sender: 'other',
                    content:
                        "Actually, let's meet at the Old Town Square near the Astronomical Clock. It's easier to find and we can start from there. I'll be wearing a blue jacket and carrying a small Czech flag.",
                    timestamp: '10:42 AM',
                    type: 'text',
                },
                {
                    id: 7,
                    sender: 'me',
                    content:
                        'Perfect! See you there at 10 AM on March 15th. Looking forward to it!',
                    timestamp: '10:45 AM',
                    type: 'text',
                },
                {
                    id: 8,
                    sender: 'other',
                    content:
                        'Great! Looking forward to showing you around Prague!',
                    timestamp: '10:46 AM',
                    type: 'text',
                },
            ];
    });

    const currentChat = conversations.find((c) => c.id === selectedChat);

    const handleFileSelect = (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
            // Check file size (max 10MB)
            if (file.size > 10 * 1024 * 1024) {
                alert('File size must be less than 10MB');
                return;
            }

            setSelectedFile(file);

            // Create preview for images
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const res = ev && ev.target ? ev.target.result : null;
                    setFilePreview(res ? res.toString() : null);
                };
                reader.readAsDataURL(file);
            } else {
                setFilePreview(null);
            }
        }
    };

    const handleRemoveFile = () => {
        setSelectedFile(null);
        setFilePreview(null);
    };

    const handleEmojiSelect = (emoji) => {
        setMessage((prev) => prev + emoji);
        setShowEmojiPicker(false);
    };

    // Save to localStorage whenever data changes
    React.useEffect(() => {
        localStorage.setItem('chatConversations', JSON.stringify(conversations));
    }, [conversations]);

    React.useEffect(() => {
        localStorage.setItem('chatMessages', JSON.stringify(messages));
    }, [messages]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (message.trim() || selectedFile) {
            const newMessage = {
                id: messages.length + 1,
                sender: 'me',
                content:
                    message.trim() ||
                    (selectedFile ? `Sent ${selectedFile.name}` : ''),
                timestamp: new Date().toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                }),
                type: selectedFile
                    ? selectedFile.type.startsWith('image/')
                        ? 'image'
                        : 'file'
                    : 'text',
                ...(selectedFile &&
                    selectedFile.type.startsWith('image/') && {
                        imageUrl: filePreview,
                    }),
                ...(selectedFile &&
                    !selectedFile.type.startsWith('image/') && {
                        fileName: selectedFile.name,
                        fileSize: (selectedFile.size / 1024).toFixed(1) + ' KB',
                    }),
            };

            setMessages((prev) => [...prev, newMessage]);

            // Update conversation's last message
            const lastMessageText = selectedFile
                ? selectedFile.type.startsWith('image/')
                    ? '📷 Photo'
                    : `📎 ${selectedFile.name}`
                : message.trim();

            setConversations((prev) =>
                prev.map((conv) =>
                    conv.id === selectedChat
                        ? { ...conv, lastMessage: lastMessageText, timestamp: 'now' }
                        : conv
                )
            );

            setMessage('');
            setSelectedFile(null);
            setFilePreview(null);
        }
    };

    return (
        <div className="h-screen bg-gray-50 dark:bg-dark-950 pt-16 transition-colors">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex">
                {/* Chat Sidebar */}
                <div className="w-1/3 bg-white dark:bg-dark-900 border-r border-gray-200 dark:border-dark-800 flex flex-col transition-colors">
                    {/* Header */}
                    <div className="p-4 border-b border-gray-200 dark:border-dark-800">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                            {t('chat.title')}
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            {t('chat.description')}
                        </p>
                    </div>

                    {/* Search */}
                    <div className="p-4 border-b border-gray-200 dark:border-dark-800">
                        <input
                            type="text"
                            placeholder={t('chat.searchConversations')}
                            className="w-full p-3 border border-gray-300 dark:border-dark-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                        />
                    </div>

                    {/* Conversations List */}
                    <div className="flex-1 overflow-y-auto">
                        {conversations.map((chat) => (
                            <div
                                key={chat.id}
                                onClick={() => setSelectedChat(chat.id)}
                                className={`p-4 border-b border-gray-100 dark:border-dark-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-800 transition-colors ${
                                    selectedChat === chat.id
                                        ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500'
                                        : ''
                                }`}
                            >
                                <div className="flex items-start space-x-3">
                                    <div className="relative">
                                        <img
                                            src={chat.avatar}
                                            alt={chat.name}
                                            className="w-12 h-12 rounded-full object-cover"
                                        />
                                        {chat.online && (
                                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <h3 className="font-medium text-gray-900 dark:text-white truncate">
                                                {chat.name}
                                            </h3>
                                            <div className="flex items-center space-x-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {chat.timestamp}
                        </span>
                                                {chat.unread > 0 && (
                                                    <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                            {chat.unread}
                          </span>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                                            {chat.lastMessage}
                                        </p>
                                        <p className="text-xs text-blue-600 mt-1">{chat.booking}</p>
                                        <span
                                            className={`inline-block px-2 py-1 rounded-full text-xs mt-2 ${
                                                chat.role === 'Guide'
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-blue-100 text-blue-800'
                                            }`}
                                        >
                      {chat.role}
                    </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 flex flex-col">
                    {/* Chat Header */}
                    {currentChat && (
                        <div className="bg-white dark:bg-dark-900 p-4 border-b border-gray-200 dark:border-dark-800 flex items-center justify-between transition-colors">
                            <div className="flex items-center space-x-4">
                                <div className="relative">
                                    <img
                                        src={currentChat.avatar}
                                        alt={currentChat.name}
                                        className="w-10 h-10 rounded-full object-cover"
                                    />
                                    {currentChat.online && (
                                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 dark:text-white">
                                        {currentChat.name}
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        {currentChat.online
                                            ? t('chat.onlineNow')
                                            : t('chat.lastSeen') + ' 1h ago'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center space-x-3">
                                <button className="text-gray-600 dark:text-gray-400 hover:text-blue-600 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-800 transition-colors">
                                    <Video className="h-5 w-5" />
                                </button>
                                <button className="text-gray-600 dark:text-gray-400 hover:text-blue-600 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-800 transition-colors">
                                    <Globe className="h-5 w-5" />
                                </button>
                                <button className="text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-800 transition-colors">
                                    <MoreVertical className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-dark-950">
                        {/* Booking Info Card */}
                        {currentChat && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mx-auto max-w-md">
                                <div className="text-center">
                                    <h4 className="font-medium text-blue-900 mb-1">
                                        {t('chat.bookingDetails')}
                                    </h4>
                                    <p className="text-sm text-blue-700">{currentChat.booking}</p>
                                </div>
                            </div>
                        )}

                        {/* Messages */}
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`chat-bubble ${
                                        msg.sender === 'me'
                                            ? 'bg-blue-600 text-white rounded-l-lg rounded-tr-lg'
                                            : 'bg-white dark:bg-dark-800 text-gray-900 dark:text-white rounded-r-lg rounded-tl-lg border border-gray-200 dark:border-dark-700'
                                    } p-3 shadow-sm`}
                                >
                                    {msg.type === 'text' ? (
                                        <p className="text-sm">{msg.content}</p>
                                    ) : msg.type === 'image' ? (
                                        <div className="space-y-2">
                                            {msg.content && <p className="text-sm">{msg.content}</p>}
                                            <img
                                                src={msg.imageUrl}
                                                alt="Shared"
                                                className="rounded-lg max-w-xs cursor-pointer hover:opacity-90 transition-opacity"
                                            />
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <div className="flex items-center space-x-2">
                                                <FileText className="h-4 w-4" />
                                                <div>
                                                    <p className="text-sm font-medium">{msg.fileName}</p>
                                                    <p className="text-xs opacity-75">{msg.fileSize}</p>
                                                </div>
                                            </div>
                                            {msg.content && <p className="text-sm">{msg.content}</p>}
                                        </div>
                                    )}

                                    <p
                                        className={`text-xs mt-1 ${
                                            msg.sender === 'me' ? 'text-blue-100' : 'text-gray-500'
                                        }`}
                                    >
                                        {msg.timestamp}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Message Input */}
                    <form
                        onSubmit={handleSendMessage}
                        className="bg-white dark:bg-dark-900 border-t border-gray-200 dark:border-dark-800 p-4 transition-colors"
                    >
                        {/* File Preview */}
                        {selectedFile && (
                            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        {filePreview ? (
                                            <img
                                                src={filePreview}
                                                alt="Preview"
                                                className="w-12 h-12 object-cover rounded"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 bg-gray-200 dark:bg-dark-700 rounded flex items-center justify-center">
                                                <FileText className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                {selectedFile.name}
                                            </p>
                                            <p className="text-xs text-gray-600 dark:text-gray-400">
                                                {(selectedFile.size / 1024).toFixed(1)} KB
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleRemoveFile}
                                        className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Emoji Picker */}
                        {showEmojiPicker && (
                            <div className="mb-4 p-4 bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                <div className="grid grid-cols-10 gap-2">
                                    {commonEmojis.map((emoji, index) => (
                                        <button
                                            key={index}
                                            type="button"
                                            onClick={() => handleEmojiSelect(emoji)}
                                            className="text-xl hover:bg-gray-100 dark:hover:bg-dark-700 rounded p-1 transition-colors"
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex items-center space-x-3">
                            {/* File Upload */}
                            <label className="text-gray-600 dark:text-gray-400 hover:text-blue-600 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-800 transition-colors cursor-pointer">
                                <Paperclip className="h-5 w-5" />
                                <input
                                    type="file"
                                    className="hidden"
                                    onChange={handleFileSelect}
                                    accept="image/*,.pdf,.doc,.docx,.txt"
                                />
                            </label>

                            <div className="flex-1 relative">
                                <input
                                    type="text"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Type your message..."
                                    className="w-full p-3 pr-12 border border-gray-300 dark:border-dark-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                                />

                                {/* Emoji Button */}
                                <button
                                    type="button"
                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 dark:text-gray-400 hover:text-blue-600 transition-colors"
                                >
                                    <Smile className="h-5 w-5" />
                                </button>
                            </div>

                            <button
                                type="submit"
                                disabled={!message.trim() && !selectedFile}
                                className="bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <Send className="h-5 w-5" />
                            </button>
                        </div>

                        {/* AI Translation Notice */}
                        <div className="mt-2 text-center">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                <Globe className="inline h-3 w-3 mr-1" />
                                {t('chat.aiTranslation')}
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ChatPage;
