import React, { useState, useEffect, useMemo } from 'react';
import { FiUser, FiMail, FiLogOut, FiSettings, FiMapPin, FiX, FiCheck, FiCalendar, FiStar, FiDollarSign, FiImage, FiCheckCircle, FiUsers, FiClock, FiGlobe, FiAward, FiEdit, FiEye, FiMessageSquare, FiTrendingUp, FiHeart, FiPhone, FiDownload } from 'react-icons/fi';
import './GuideAccount.css';
import GuideChatWidget from './GuideChatWidget';

const GuideAccount = () => {
  // Theme state
  const [theme, setTheme] = useState('default');
  // Chat open state
  const [chatOpen, setChatOpen] = useState(false);
  // Selected client for chat
  const [selectedClient, setSelectedClient] = useState(null);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      root.setAttribute('data-theme', theme);
    }

    // Listen for system theme changes when in auto mode
    const handleSystemThemeChange = (e) => {
      if (theme === 'auto') {
        root.setAttribute('data-theme', e.matches ? 'dark' : 'light');
      }
    };

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', handleSystemThemeChange);

    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, [theme]);

  // Existing user state
  const [user, setUser] = useState({
    id: 'guide_001',
    firstName: 'Ahmad',
    lastName: 'Karimov',
    email: 'ahmad.karimov@email.com',
    phone: '+998901234567',
    city: 'Tashkent',
    country: 'Uzbekistan',
    profilePicture: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    joinDate: '2023-01-15',
    totalTours: 156,
    rating: 4.8,
    responseTime: '2 soat ichida',
    isOnline: true,
    lastSeen: new Date().toISOString()
  });

  // Existing profile form state
  const [profileForm, setProfileForm] = useState({
    bio: 'O\'zbekistonning boy madaniyati va tarixini sevib, 7 yildan ortiq vaqt davomida xorijiy mehmonlarni qabul qilib kelaman. Samarqand, Buxoro va Xiva shaharlarining har bir burchagini bilaman.',
    experience: '7 yil davomida 1000+ xorijiy turistlarga xizmat ko\'rsatganman. UNESCO merosi, madaniy turizm va mahalliy hunarmandchilik bo\'yicha mutaxassis.',
    services: ['Tarixiy ekskursiyalar', 'Madaniy turizm', 'Hunarmandchilik turlari', 'Gastronomik turizm'],
    languages: [
      { language: 'O\'zbek', level: 'Ona tili' },
      { language: 'Ingliz', level: 'C1' },
      { language: 'Rus', level: 'B2' },
      { language: 'Turk', level: 'A2' }
    ],
    pricePerHour: 25,
    pricePerDay: 120,
    workHours: '08:00 - 18:00, Dushanba-Shanba',
    portfolio: [
      'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=300&h=200&fit=crop',
      'https://images.unsplash.com/photo-1571841079840-1079c8b2e5b3?w=300&h=200&fit=crop',
      'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=200&fit=crop',
      'https://images.unsplash.com/photo-1542834281-0e6359ee7ba1?w=300&h=200&fit=crop'
    ],
    certificates: ['IELTS_Certificate.pdf', 'Tourism_License.pdf', 'First_Aid_Certificate.pdf'],
    verificationStatus: 'Tasdiqlangan',
    specializations: ['UNESCO merosi', 'Islom arxitekturasi', 'Mahalliy oshxona', 'Hunarmandchilik']
  });

  // Existing requests state
  const [requests, setRequests] = useState([
    {
      id: 'REQ001',
      clientName: 'John Smith',
      clientId: 'client_001',
      clientPhoto: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=50&h=50&fit=crop&crop=face',
      date: '2024-08-15T09:00',
      duration: '8 soat',
      travelers: { adults: 2, children: 0 },
      price: 120,
      status: 'Kutilmoqda',
      serviceType: 'Samarqand shahri bo\'ylab to\'liq tur',
      notes: 'Registon va Gur-Emir maqbarasiga alohida e\'tibor bering',
      priority: 'high',
      isOnline: true,
      lastSeen: new Date(Date.now() - 300000).toISOString()
    },
    {
      id: 'REQ002', 
      clientName: 'Maria Garcia',
      clientId: 'client_002',
      clientPhoto: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=50&h=50&fit=crop&crop=face',
      date: '2024-08-18T10:30',
      duration: '6 soat',
      travelers: { adults: 4, children: 2 },
      price: 200,
      status: 'Tasdiqlangan',
      serviceType: 'Buxoro madaniy turi',
      notes: 'Bolalar bilan, qiziqarli hikoyalar kerak',
      priority: 'medium',
      isOnline: false,
      lastSeen: new Date(Date.now() - 1800000).toISOString()
    },
    {
      id: 'REQ003',
      clientName: 'Zhang Wei',
      clientId: 'client_003', 
      clientPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&h=50&fit=crop&crop=face',
      date: '2024-08-12T14:00',
      duration: '4 soat',
      travelers: { adults: 1, children: 0 },
      price: 80,
      status: 'Yakunlangan',
      serviceType: 'Toshkent shahar turi',
      rating: 5,
      priority: 'low',
      isOnline: true,
      lastSeen: new Date().toISOString()
    },
    {
      id: 'REQ004',
      clientName: 'Emma Wilson',
      clientId: 'client_004',
      clientPhoto: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=50&h=50&fit=crop&crop=face',
      date: '2024-08-20T14:00',
      duration: '5 soat',
      travelers: { adults: 3, children: 1 },
      price: 150,
      status: 'Kutilmoqda',
      serviceType: 'Xiva tarixiy shahri turi',
      notes: 'Fotosurat uchun yaxshi joylarni ko\'rsating',
      priority: 'high',
      isOnline: false,
      lastSeen: new Date(Date.now() - 3600000).toISOString()
    }
  ]);

  // Existing calendar state
  const [availability, setAvailability] = useState(
    Array.from({ length: 14 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() + i);
      return {
        date: date.toISOString().split('T')[0],
        isBusy: i === 3 || i === 7,
        isVacation: i === 10,
        hours: Array.from({ length: 10 }, (_, h) => ({
          time: `${8 + h}:00`,
          available: true
        }))
      };
    })
  );

  // Existing chat messages state
  const [chatMessages, setChatMessages] = useState([
    {
      clientId: 'client_001',
      unreadCount: 2,
      lastMessage: 'Samarqand turi haqida batafsil ma\'lumot bering',
      lastMessageTime: new Date(Date.now() - 300000).toISOString(),
      messages: [
        { 
          id: 'msg_001',
          sender: 'Client', 
          text: 'Salom! Samarqand turi haqida ma\'lumot olsam bo\'ladimi?', 
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          status: 'read'
        },
        { 
          id: 'msg_002',
          sender: 'Guide', 
          text: 'Assalomu alaykum! Albatta, men Samarqandning barcha diqqatga sazovor joylarini ko\'rsataman. Registon maydoni, Gur-Emir maqbarasi, Bibi-Xonim masjidi va boshqa ko\'plab ajoyib joylar.', 
          timestamp: new Date(Date.now() - 3300000).toISOString(),
          status: 'read'
        },
        { 
          id: 'msg_003',
          sender: 'Client', 
          text: 'Ajoyib! Narxi qancha bo\'ladi?', 
          timestamp: new Date(Date.now() - 1800000).toISOString(),
          status: 'read'
        },
        { 
          id: 'msg_004',
          sender: 'Guide', 
          text: '8 soatlik to\'liq tur uchun $120. Bu narxga transport, gid xizmati va barcha kirish chiptalari kiradi.', 
          timestamp: new Date(Date.now() - 1500000).toISOString(),
          status: 'read'
        },
        { 
          id: 'msg_005',
          sender: 'Client', 
          text: 'Samarqand turi haqida batafsil ma\'lumot bering', 
          timestamp: new Date(Date.now() - 300000).toISOString(),
          status: 'delivered'
        }
      ]
    },
    {
      clientId: 'client_002',
      unreadCount: 0,
      lastMessage: 'Rahmat, kutib qolamiz!',
      lastMessageTime: new Date(Date.now() - 1800000).toISOString(),
      messages: [
        { 
          id: 'msg_006',
          sender: 'Client', 
          text: 'Buxoro safari tayyormi?', 
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          status: 'read'
        },
        { 
          id: 'msg_007',
          sender: 'Guide', 
          text: 'Ha, hammasi tayyor! Ertaga 10:30 da uchrashamiz.', 
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          status: 'read'
        },
        { 
          id: 'msg_008',
          sender: 'Client', 
          text: 'Rahmat, kutib qolamiz!', 
          timestamp: new Date(Date.now() - 1800000).toISOString(),
          status: 'read'
        }
      ]
    },
    {
      clientId: 'client_004',
      unreadCount: 1,
      lastMessage: 'Xiva turiga qachon boramiz?',
      lastMessageTime: new Date(Date.now() - 900000).toISOString(),
      messages: [
        { 
          id: 'msg_009',
          sender: 'Client', 
          text: 'Salom! Xiva turi haqida gaplashish mumkinmi?', 
          timestamp: new Date(Date.now() - 1800000).toISOString(),
          status: 'read'
        },
        { 
          id: 'msg_010',
          sender: 'Guide', 
          text: 'Assalomu alaykum! Albatta, Xiva - bu ajoyib tarixiy shahar. Qachon bormoqchisiz?', 
          timestamp: new Date(Date.now() - 1500000).toISOString(),
          status: 'read'
        },
        { 
          id: 'msg_011',
          sender: 'Client', 
          text: 'Xiva turiga qachon boramiz?', 
          timestamp: new Date(Date.now() - 900000).toISOString(),
          status: 'delivered'
        }
      ]
    }
  ]);

  // Existing other UI states
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showPortfolioModal, setShowPortfolioModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [activeTab, setActiveTab] = useState('yangi');
  const [showCounterOffer, setShowCounterOffer] = useState(false);
  const [counterOfferData, setCounterOfferData] = useState({ requestId: null, date: '', price: '' });
  const [notifications, setNotifications] = useState([]);

  // Existing statistics
  const stats = useMemo(() => ({
    totalTours: requests.filter(r => r.status === 'Yakunlangan').length,
    pendingRequests: requests.filter(r => r.status === 'Kutilmoqda').length,
    confirmedTours: requests.filter(r => r.status === 'Tasdiqlangan').length,
    averageRating: requests.filter(r => r.rating).reduce((sum, r) => sum + r.rating, 0) / requests.filter(r => r.rating).length || 0,
    thisMonthEarnings: requests.filter(r => r.status === 'Yakunlangan').reduce((sum, r) => sum + r.price, 0),
    responseRate: 98,
    totalUnreadMessages: chatMessages.reduce((sum, chat) => sum + chat.unreadCount, 0)
  }), [requests, chatMessages]);

  // Existing notification handler
  const addNotification = (message, type) => {
    const notification = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date().toISOString()
    };
    setNotifications(prev => [notification, ...prev.slice(0, 4)]);
    
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
  };

  // Format time for last seen
  const formatTime = (timestamp) => {
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

  // Handle opening chat
  const openChat = (clientId) => {
    setSelectedClient(clientId);
    setChatOpen(true);
  };

  // Existing request actions
  const handleRequestAction = (requestId, action, data = null) => {
    setRequests(prev => prev.map(req => {
      if (req.id === requestId) {
        switch (action) {
          case 'accept':
            addNotification(`So'rov #${requestId} qabul qilindi`, 'success');
            return { ...req, status: 'Tasdiqlangan' };
          case 'reject':
            addNotification(`So'rov #${requestId} rad etildi`, 'error');
            return { ...req, status: 'Rad etilgan' };
          case 'counter':
            addNotification(`Counter taklif yuborildi #${requestId}`, 'info');
            return { ...req, date: data.date, price: data.price, status: 'Counter taklif' };
          default:
            return req;
        }
      }
      return req;
    }));
  };

  return (
    <div className="guide-account">
      {/* Notifications */}
      <div className="guide-account-notifications">
        {notifications.map(notification => (
          <div key={notification.id} className={`guide-account-notification guide-account-notification-${notification.type}`}>
            <span>{notification.message}</span>
            <button onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}>
              <FiX />
            </button>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="guide-account-header">
        <div className="guide-account-header-content">
          <div className="guide-account-user-info">
            <div className="guide-account-avatar-container">
              <img src={user.profilePicture} alt="Profile" className="guide-account-avatar" />
              <div className={`guide-account-status-indicator ${user.isOnline ? 'online' : 'offline'}`}></div>
            </div>
            <div>
              <h1>{user.firstName} {user.lastName}</h1>
              <p className="guide-account-subtitle">Professional Guide • {user.city}, {user.country}</p>
              <div className="guide-account-rating">
                <FiStar className="guide-account-star" />
                <span>{user.rating}</span>
                <span>({user.totalTours} tur)</span>
              </div>
            </div>
          </div>
          <div className="guide-account-header-actions">
            <div className="guide-account-quick-stats">
              <div className="guide-account-stat-item">
                <FiUsers />
                <span>{stats.pendingRequests}</span>
                <small>Yangi so'rov</small>
              </div>
              <div className="guide-account-stat-item">
                <FiCheckCircle />
                <span>{stats.confirmedTours}</span>
                <small>Tasdiqlangan</small>
              </div>
              <div className="guide-account-stat-item">
                <FiDollarSign />
                <span>${stats.thisMonthEarnings}</span>
                <small>Bu oy</small>
              </div>
              <div className="guide-account-stat-item" onClick={() => setChatOpen(true)}>
                <FiMessageSquare />
                <span>{stats.totalUnreadMessages}</span>
                <small>Yangi xabar</small>
                {stats.totalUnreadMessages > 0 && <div className="guide-account-notification-dot"></div>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="guide-account-main">
        {/* Left Sidebar */}
        <div className="guide-account-sidebar">
          <div className="guide-account-card">
            <div className="guide-account-card-header">
              <h3>Professional Profil</h3>
              <button onClick={() => setShowProfileModal(true)} className="guide-account-edit-btn">
                <FiEdit />
              </button>
            </div>
            <div className="guide-account-profile-details">
              <div className="guide-account-profile-item">
                <FiUser />
                <div>
                  <strong>Bio</strong>
                  <p>{profileForm.bio.substring(0, 100)}...</p>
                </div>
              </div>
              <div className="guide-account-profile-item">
                <FiAward />
                <div>
                  <strong>Tajriba</strong>
                  <p>{profileForm.experience.substring(0, 80)}...</p>
                </div>
              </div>
              <div className="guide-account-profile-item">
                <FiGlobe />
                <div>
                  <strong>Tillar</strong>
                  <p>{profileForm.languages.map(l => l.language).join(', ')}</p>
                </div>
              </div>
              <div className="guide-account-profile-item">
                <FiDollarSign />
                <div>
                  <strong>Narxlar</strong>
                  <p>${profileForm.pricePerHour}/soat • ${profileForm.pricePerDay}/kun</p>
                </div>
              </div>
              <div className="guide-account-profile-portfolio">
                <strong>Portfolio</strong>
                <div className="guide-account-portfolio-preview">
                  {profileForm.portfolio.slice(0, 3).map((img, index) => (
                    <img key={index} src={img} alt={`Portfolio ${index + 1}`} onClick={() => setShowPortfolioModal(true)} />
                  ))}
                  {profileForm.portfolio.length > 3 && (
                    <div className="guide-account-portfolio-more" onClick={() => setShowPortfolioModal(true)}>
                      +{profileForm.portfolio.length - 3}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="guide-account-card">
            <div className="guide-account-card-header">
              <h3>Statistika</h3>
            </div>
            <div className="guide-account-stats-grid">
              <div className="guide-account-stat">
                <FiCheckCircle className="guide-account-stat-icon success" />
                <div>
                  <strong>{stats.totalTours}</strong>
                  <span>Yakunlangan turlar</span>
                </div>
              </div>
              <div className="guide-account-stat">
                <FiStar className="guide-account-stat-icon warning" />
                <div>
                  <strong>{stats.averageRating.toFixed(1)}</strong>
                  <span>O'rtacha reyting</span>
                </div>
              </div>
              <div className="guide-account-stat">
                <FiTrendingUp className="guide-account-stat-icon primary" />
                <div>
                  <strong>{stats.responseRate}%</strong>
                  <span>Javob berish darajasi</span>
                </div>
              </div>
              <div className="guide-account-stat">
                <FiHeart className="guide-account-stat-icon danger" />
                <div>
                  <strong>156</strong>
                  <span>Takroriy mijozlar</span>
                </div>
              </div>
            </div>
          </div>

          <div className="guide-account-card">
            <div className="guide-account-card-header">
              <h3>Tezkor Kalendar</h3>
              <button onClick={() => setShowCalendarModal(true)} className="guide-account-edit-btn">
                <FiCalendar />
              </button>
            </div>
            <div className="guide-account-mini-calendar">
              {availability.slice(0, 7).map(day => (
                <div 
                  key={day.date} 
                  className={`guide-account-mini-day ${day.isBusy ? 'busy' : ''} ${day.isVacation ? 'vacation' : ''}`}
                >
                  <span>{new Date(day.date).getDate()}</span>
                  <small>{new Date(day.date).toLocaleDateString('uz-UZ', { weekday: 'short' })}</small>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="guide-account-content">
          <div className="guide-account-card">
            <div className="guide-account-card-header">
              <h3>So'rovlar Boshqaruvi</h3>
              <div className="guide-account-tabs">
                <button 
                  className={`guide-account-tab ${activeTab === 'yangi' ? 'active' : ''}`}
                  onClick={() => setActiveTab('yangi')}
                >
                  Yangi ({requests.filter(r => r.status === 'Kutilmoqda').length})
                </button>
                <button 
                  className={`guide-account-tab ${activeTab === 'tasdiqlangan' ? 'active' : ''}`}
                  onClick={() => setActiveTab('tasdiqlangan')}
                >
                  Tasdiqlangan ({requests.filter(r => r.status === 'Tasdiqlangan').length})
                </button>
                <button 
                  className={`guide-account-tab ${activeTab === 'tarix' ? 'active' : ''}`}
                  onClick={() => setActiveTab('tarix')}
                >
                  Tarix ({requests.filter(r => r.status === 'Yakunlangan').length})
                </button>
              </div>
            </div>
            
            <div className="guide-account-requests-list">
              {requests
                .filter(req => {
                  if (activeTab === 'yangi') return req.status === 'Kutilmoqda';
                  if (activeTab === 'tasdiqlangan') return req.status === 'Tasdiqlangan';
                  if (activeTab === 'tarix') return req.status === 'Yakunlangan';
                  return false;
                })
                .sort((a, b) => {
                  if (activeTab === 'yangi') {
                    const priorityOrder = { high: 3, medium: 2, low: 1 };
                    return priorityOrder[b.priority] - priorityOrder[a.priority];
                  }
                  return new Date(b.date) - new Date(a.date);
                })
                .map(request => (
                  <div key={request.id} className={`guide-account-request-item ${request.priority === 'high' ? 'high-priority' : ''}`}>
                    <div className="guide-account-request-header">
                      <div className="guide-account-client-info">
                        <div className="guide-account-client-avatar-container">
                          <img src={request.clientPhoto} alt={request.clientName} />
                          <div className={`guide-account-client-status ${request.isOnline ? 'online' : 'offline'}`}></div>
                        </div>
                        <div>
                          <h4>{request.clientName}</h4>
                          <span className="guide-account-request-id">#{request.id}</span>
                          {!request.isOnline && (
                            <small className="guide-account-last-seen">
                              Oxirgi faollik: {formatTime(request.lastSeen)}
                            </small>
                          )}
                        </div>
                      </div>
                      <div className="guide-account-request-meta">
                        <div className={`guide-account-status guide-account-status-${request.status.toLowerCase().replace(' ', '-')}`}>
                          {request.status}
                        </div>
                        {request.priority && (
                          <div className={`guide-account-priority guide-account-priority-${request.priority}`}>
                            {request.priority === 'high' ? 'Yuqori' : request.priority === 'medium' ? 'O\'rta' : 'Past'}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="guide-account-request-details">
                      <div className="guide-account-request-info">
                        <div className="guide-account-info-item">
                          <FiCalendar />
                          <span>{new Date(request.date).toLocaleDateString('uz-UZ', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}</span>
                        </div>
                        <div className="guide-account-info-item">
                          <FiClock />
                          <span>{request.duration}</span>
                        </div>
                        <div className="guide-account-info-item">
                          <FiUsers />
                          <span>{request.travelers.adults} katta, {request.travelers.children} bola</span>
                        </div>
                        <div className="guide-account-info-item">
                          <FiDollarSign />
                          <span>${request.price}</span>
                        </div>
                      </div>
                      
                      <div className="guide-account-service-type">
                        <strong>{request.serviceType}</strong>
                        {request.notes && <p>{request.notes}</p>}
                        {request.rating && (
                          <div className="guide-account-rating">
                            <FiStar />
                            <span>{request.rating}/5</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {request.status === 'Kutilmoqda' && (
                      <div className="guide-account-request-actions">
                        <button 
                          className="guide-account-btn guide-account-btn-success"
                          onClick={() => handleRequestAction(request.id, 'accept')}
                        >
                          <FiCheck /> Qabul qilish
                        </button>
                        <button 
                          className="guide-account-btn guide-account-btn-danger"
                          onClick={() => handleRequestAction(request.id, 'reject')}
                        >
                          <FiX /> Rad etish
                        </button>
                        <button 
                          className="guide-account-btn guide-account-btn-outline"
                          onClick={() => {
                            setCounterOfferData({ requestId: request.id, date: request.date.split('T')[0], price: request.price });
                            setShowCounterOffer(true);
                          }}
                        >
                          <FiEdit /> Counter taklif
                        </button>
                        <button 
                          className="guide-account-btn guide-account-btn-outline"
                          onClick={() => openChat(request.clientId)}
                        >
                          <FiMessageSquare /> Chat
                        </button>
                      </div>
                    )}
                    
                    {request.status === 'Tasdiqlangan' && (
                      <div className="guide-account-request-actions">
                        <button 
                          className="guide-account-btn guide-account-btn-outline"
                          onClick={() => openChat(request.clientId)}
                        >
                          <FiMessageSquare /> Mijoz bilan chat
                        </button>
                        <button className="guide-account-btn guide-account-btn-primary">
                          <FiMapPin /> Yo'nalishni ko'rish
                        </button>
                        <button className="guide-account-btn guide-account-btn-outline">
                          <FiPhone /> Qo'ng'iroq qilish
                        </button>
                      </div>
                    )}

                    {request.status === 'Yakunlangan' && (
                      <div className="guide-account-request-actions">
                        <button 
                          className="guide-account-btn guide-account-btn-outline"
                          onClick={() => openChat(request.clientId)}
                        >
                          <FiMessageSquare /> Xabar yuborish
                        </button>
                        <button className="guide-account-btn guide-account-btn-outline">
                          <FiDownload /> Hisobotni yuklab olish
                        </button>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>

          {/* Chat Widget */}
          <GuideChatWidget
            chatMessages={chatMessages}
            setChatMessages={setChatMessages}
            requests={requests}
            openChat={openChat}
            stats={stats}
            chatOpen={chatOpen}
            setChatOpen={setChatOpen}
            selectedClient={selectedClient}
          />
        </div>
      </div>

      {/* Modals */}
      {showProfileModal && (
        <div className="guide-account-modal-overlay" onClick={() => setShowProfileModal(false)}>
          <div className="guide-account-modal guide-account-modal-large" onClick={e => e.stopPropagation()}>
            <div className="guide-account-modal-header">
              <h3>Profilni tahrirlash</h3>
              <button onClick={() => setShowProfileModal(false)}>
                <FiX />
              </button>
            </div>
            <div className="guide-account-modal-content">
              <div className="guide-account-form-group">
                <label>Bio</label>
                <textarea 
                  value={profileForm.bio}
                  onChange={(e) => setProfileForm({...profileForm, bio: e.target.value})}
                  rows={4}
                  placeholder="O'zingiz haqingizda qisqacha ma'lumot..."
                />
              </div>
              <div className="guide-account-form-group">
                <label>Tajriba</label>
                <textarea 
                  value={profileForm.experience}
                  onChange={(e) => setProfileForm({...profileForm, experience: e.target.value})}
                  rows={3}
                  placeholder="Professional tajribangizni tasvirlab bering..."
                />
              </div>
              <div className="guide-account-form-row">
                <div className="guide-account-form-group">
                  <label>Soatlik narx ($)</label>
                  <input 
                    type="number"
                    value={profileForm.pricePerHour}
                    onChange={(e) => setProfileForm({...profileForm, pricePerHour: Number(e.target.value)})}
                    min="0"
                    step="5"
                  />
                </div>
                <div className="guide-account-form-group">
                  <label>Kunlik narx ($)</label>
                  <input 
                    type="number"
                    value={profileForm.pricePerDay}
                    onChange={(e) => setProfileForm({...profileForm, pricePerDay: Number(e.target.value)})}
                    min="0"
                    step="10"
                  />
                </div>
              </div>
              <div className="guide-account-form-group">
                <label>Ish vaqti</label>
                <input 
                  type="text"
                  value={profileForm.workHours}
                  onChange={(e) => setProfileForm({...profileForm, workHours: e.target.value})}
                  placeholder="Masalan: 08:00 - 18:00, Dushanba-Shanba"
                />
              </div>
              <div className="guide-account-form-actions">
                <button 
                  className="guide-account-btn guide-account-btn-outline"
                  onClick={() => setShowProfileModal(false)}
                >
                  Bekor qilish
                </button>
                <button 
                  className="guide-account-btn guide-account-btn-primary" 
                  onClick={() => {
                    addNotification('Profil muvaffaqiyatli yangilandi', 'success');
                    setShowProfileModal(false);
                  }}
                >
                  <FiCheck /> Saqlash
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCounterOffer && (
        <div className="guide-account-modal-overlay" onClick={() => setShowCounterOffer(false)}>
          <div className="guide-account-modal" onClick={e => e.stopPropagation()}>
            <div className="guide-account-modal-header">
              <h3>Counter Taklif</h3>
              <button onClick={() => setShowCounterOffer(false)}>
                <FiX />
              </button>
            </div>
            <div className="guide-account-modal-content">
              <div className="guide-account-form-group">
                <label>Yangi sana</label>
                <input 
                  type="date"
                  value={counterOfferData.date}
                  onChange={(e) => setCounterOfferData({...counterOfferData, date: e.target.value})}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="guide-account-form-group">
                <label>Yangi narx ($)</label>
                <input 
                  type="number"
                  value={counterOfferData.price}
                  onChange={(e) => setCounterOfferData({...counterOfferData, price: Number(e.target.value)})}
                  min="0"
                  step="5"
                />
              </div>
              <div className="guide-account-form-actions">
                <button 
                  className="guide-account-btn guide-account-btn-outline"
                  onClick={() => setShowCounterOffer(false)}
                >
                  Bekor qilish
                </button>
                <button 
                  className="guide-account-btn guide-account-btn-primary"
                  onClick={() => {
                    handleRequestAction(counterOfferData.requestId, 'counter', counterOfferData);
                    setShowCounterOffer(false);
                  }}
                >
                  <FiCheck /> Yuborish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPortfolioModal && (
        <div className="guide-account-modal-overlay" onClick={() => setShowPortfolioModal(false)}>
          <div className="guide-account-modal guide-account-modal-large" onClick={e => e.stopPropagation()}>
            <div className="guide-account-modal-header">
              <h3>Portfolio</h3>
              <button onClick={() => setShowPortfolioModal(false)}>
                <FiX />
              </button>
            </div>
            <div className="guide-account-modal-content">
              <div className="guide-account-portfolio-grid">
                {profileForm.portfolio.map((img, index) => (
                  <div key={index} className="guide-account-portfolio-item">
                    <img src={img} alt={`Portfolio ${index + 1}`} />
                    <div className="guide-account-portfolio-overlay">
                      <button className="guide-account-portfolio-view">
                        <FiEye />
                      </button>
                      <button className="guide-account-portfolio-delete">
                        <FiX />
                      </button>
                    </div>
                  </div>
                ))}
                <div className="guide-account-portfolio-add">
                  <FiImage />
                  <span>Yangi rasm qo'shish</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuideAccount;