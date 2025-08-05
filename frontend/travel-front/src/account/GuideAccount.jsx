import React, { useState, useEffect, useMemo } from 'react';
import { FiUser, FiMail, FiStar, FiCheck, FiX, FiCalendar, FiDollarSign, FiImage, FiCheckCircle, FiUsers, FiClock, FiGlobe, FiEdit, FiMessageSquare, FiTrendingUp, FiHeart } from 'react-icons/fi';
import ChatWidgets from './ChatWidgets';
import './GuideAccount.css';

const GuideAccount = () => {
  const [theme, setTheme] = useState('default');
  const [chatOpen, setChatOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [user] = useState({
    id: 'guide_001',
    firstName: 'Ahmad',
    lastName: 'Karimov',
    email: 'ahmad.karimov@email.com',
    city: 'Tashkent',
    country: 'Uzbekistan',
    profilePicture: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    joinDate: '2023-01-15',
    totalTours: 156,
    rating: 4.8,
    responseTime: '2 soat ichida',
    isOnline: true
  });
  const [profileForm, setProfileForm] = useState({
    bio: 'O\'zbekistonning boy madaniyati va tarixini sevib, 7 yildan ortiq vaqt davomida xorijiy mehmonlarni qabul qilib kelaman.',
    experience: '7 yil davomida 1000+ xorijiy turistlarga xizmat ko\'rsatganman.',
    services: ['Tarixiy ekskursiyalar', 'Madaniy turizm'],
    languages: [{ language: 'O\'zbek', level: 'Ona tili' }, { language: 'Ingliz', level: 'C1' }],
    pricePerHour: 25,
    pricePerDay: 120,
    workHours: '08:00 - 18:00, Dushanba-Shanba',
    portfolio: ['https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=300&h=200&fit=crop'],
    verificationStatus: 'Tasdiqlangan'
  });
  const [requests, setRequests] = useState([
    {
      id: 'REQ001', clientName: 'John Smith', clientId: 'client_001', clientPhoto: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=50&h=50&fit=crop&crop=face',
      date: '2024-08-15T09:00', duration: '8 soat', travelers: { adults: 2, children: 0 }, price: 120, status: 'Kutilmoqda',
      serviceType: 'Samarqand shahri bo\'ylab to\'liq tur', notes: 'Registon va Gur-Emir maqbarasiga alohida e\'tibor', priority: 'high', isOnline: true
    },
    {
      id: 'REQ002', clientName: 'Maria Garcia', clientId: 'client_002', clientPhoto: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=50&h=50&fit=crop&crop=face',
      date: '2024-08-18T10:30', duration: '6 soat', travelers: { adults: 4, children: 2 }, price: 200, status: 'Tasdiqlangan',
      serviceType: 'Buxoro madaniy turi', notes: 'Bolalar bilan, qiziqarli hikoyalar kerak', priority: 'medium', isOnline: false
    }
  ]);
  const [availability] = useState(
    Array.from({ length: 7 }, (_, i) => ({
      date: new Date(Date.now() + i * 86400000).toISOString().split('T')[0],
      isBusy: i === 3, isVacation: i === 5,
      hours: Array.from({ length: 10 }, (_, h) => ({ time: `${8 + h}:00`, available: true }))
    }))
  );
  const [chatMessages, setChatMessages] = useState([
    {
      clientId: 'client_001', unreadCount: 2, lastMessage: 'Samarqand turi haqida batafsil ma\'lumot',
      messages: [
        { id: 'msg_001', sender: 'Client', text: 'Salom! Samarqand turi haqida ma\'lumot?', timestamp: new Date(Date.now() - 3600000).toISOString(), status: 'read' },
        { id: 'msg_002', sender: 'Guide', text: 'Assalomu alaykum! Registon, Gur-Emir va boshqa joylar.', timestamp: new Date(Date.now() - 3300000).toISOString(), status: 'read' }
      ]
    }
  ]);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showPortfolioModal, setShowPortfolioModal] = useState(false);
  const [activeTab, setActiveTab] = useState('yangi');
  const [showCounterOffer, setShowCounterOffer] = useState(false);
  const [counterOfferData, setCounterOfferData] = useState({ requestId: null, date: '', price: '' });
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme === 'auto' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme);
  }, [theme]);

  const stats = useMemo(() => ({
    totalTours: requests.filter(r => r.status === 'Yakunlangan').length,
    pendingRequests: requests.filter(r => r.status === 'Kutilmoqda').length,
    confirmedTours: requests.filter(r => r.status === 'Tasdiqlangan').length,
    averageRating: requests.filter(r => r.rating).reduce((sum, r) => sum + (r.rating || 0), 0) / (requests.filter(r => r.rating).length || 1),
    thisMonthEarnings: requests.filter(r => r.status === 'Yakunlangan').reduce((sum, r) => sum + r.price, 0),
    responseRate: 98,
    totalUnreadMessages: chatMessages.reduce((sum, chat) => sum + chat.unreadCount, 0)
  }), [requests, chatMessages]);

  const addNotification = (message, type) => {
    const id = Date.now();
    setNotifications(prev => [{ id, message, type }, ...prev.slice(0, 4)]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 5000);
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toDateString() === new Date().toDateString()
      ? date.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
      : date.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const handleRequestAction = (requestId, action, data = null) => {
    setRequests(prev => prev.map(req => req.id === requestId ? ({
      ...req,
      status: action === 'accept' ? 'Tasdiqlangan' : action === 'reject' ? 'Rad etilgan' : 'Counter taklif',
      ...(action === 'counter' && { date: data.date, price: data.price })
    }) : req));
    addNotification(`So'rov #${requestId} ${action === 'accept' ? 'qabul qilindi' : action === 'reject' ? 'rad etildi' : 'counter taklif yuborildi'}`, action === 'accept' ? 'success' : action === 'reject' ? 'error' : 'info');
  };

  return (
    <div className="guide-account">
      <div className="guide-account-notifications">
        {notifications.map(n => (
          <div key={n.id} className={`guide-account-notification guide-account-notification-${n.type}`}>
            <span>{n.message}</span>
            <button onClick={() => setNotifications(prev => prev.filter(n2 => n2.id !== n.id))}><FiX /></button>
          </div>
        ))}
      </div>

      <div className="guide-account-header">
        <div className="guide-account-header-content">
          <div className="guide-account-user-info">
            <img src={user.profilePicture} alt="Profile" className="guide-account-avatar" />
            <div className={`guide-account-status-indicator ${user.isOnline ? 'online' : 'offline'}`}></div>
            <div>
              <h1>{user.firstName} {user.lastName}</h1>
              <p>{user.city}, {user.country}</p>
              <div className="guide-account-rating"><FiStar /> {user.rating} ({user.totalTours} tur)</div>
            </div>
          </div>
          <div className="guide-account-quick-stats">
            <div className="guide-account-stat-item"><FiUsers /> {stats.pendingRequests} <small>Yangi</small></div>
            <div className="guide-account-stat-item"><FiCheckCircle /> {stats.confirmedTours} <small>Tasdiqlangan</small></div>
            <div className="guide-account-stat-item"><FiDollarSign /> ${stats.thisMonthEarnings} <small>Bu oy</small></div>
            <div className="guide-account-stat-item" onClick={() => setChatOpen(true)}><FiMessageSquare /> {stats.totalUnreadMessages} <small>Xabar</small></div>
          </div>
        </div>
      </div>

      <div className="guide-account-main">
        <div className="guide-account-sidebar">
          <div className="guide-account-card">
            <h3>Profil <button onClick={() => setShowProfileModal(true)}><FiEdit /></button></h3>
            <div className="guide-account-profile-details">
              <div><FiUser /><strong>Bio</strong><p>{profileForm.bio.slice(0, 100)}...</p></div>
              <div><FiGlobe /><strong>Tillar</strong><p>{profileForm.languages.map(l => l.language).join(', ')}</p></div>
              <div><FiDollarSign /><strong>Narx</strong><p>${profileForm.pricePerHour}/soat • ${profileForm.pricePerDay}/kun</p></div>
              <div><strong>Portfolio</strong>
                <div className="guide-account-portfolio-preview">
                  {profileForm.portfolio.slice(0, 3).map((img, i) => <img key={i} src={img} alt={`Portfolio ${i + 1}`} onClick={() => setShowPortfolioModal(true)} />)}
                  {profileForm.portfolio.length > 3 && <div className="guide-account-portfolio-more" onClick={() => setShowPortfolioModal(true)}>+{profileForm.portfolio.length - 3}</div>}
                </div>
              </div>
            </div>
          </div>

          <div className="guide-account-card">
            <h3>Statistika</h3>
            <div className="guide-account-stats-grid">
              <div><FiCheckCircle className="success" /><strong>{stats.totalTours}</strong><span>Turlar</span></div>
              <div><FiStar className="warning" /><strong>{stats.averageRating.toFixed(1)}</strong><span>Reyting</span></div>
              <div><FiTrendingUp className="primary" /><strong>{stats.responseRate}%</strong><span>Javob</span></div>
              <div><FiHeart className="danger" /><strong>156</strong><span>Takroriy</span></div>
            </div>
          </div>

          <div className="guide-account-card">
            <h3>Kalendar <button onClick={() => setShowCalendarModal(true)}><FiCalendar /></button></h3>
            <div className="guide-account-mini-calendar">
              {availability.slice(0, 7).map(day => (
                <div key={day.date} className={`guide-account-mini-day ${day.isBusy ? 'busy' : day.isVacation ? 'vacation' : ''}`}>
                  <span>{new Date(day.date).getDate()}</span>
                  <small>{new Date(day.date).toLocaleDateString('uz-UZ', { weekday: 'short' })}</small>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="guide-account-content">
          <div className="guide-account-card">
            <h3>So'rovlar</h3>
            <div className="guide-account-tabs">
              {['yangi', 'tasdiqlangan', 'tarix'].map(tab => (
                <button key={tab} className={activeTab === tab ? 'active' : ''} onClick={() => setActiveTab(tab)}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)} ({requests.filter(r => r.status === tab.charAt(0).toUpperCase() + tab.slice(1)).length})
                </button>
              ))}
            </div>
            <div className="guide-account-requests-list">
              {requests.filter(r => r.status === activeTab.charAt(0).toUpperCase() + activeTab.slice(1))
                .sort((a, b) => activeTab === 'yangi' ? ({ high: 3, medium: 2, low: 1 }[b.priority] - { high: 3, medium: 2, low: 1 }[a.priority]) : new Date(b.date) - new Date(a.date))
                .map(req => (
                  <div key={req.id} className={`guide-account-request-item ${req.priority === 'high' ? 'high-priority' : ''}`}>
                    <div className="guide-account-request-header">
                      <div className="guide-account-client-info">
                        <img src={req.clientPhoto} alt={req.clientName} />
                        <div className={`guide-account-client-status ${req.isOnline ? 'online' : 'offline'}`}></div>
                        <div>
                          <h4>{req.clientName}</h4>
                          <span>#{req.id}</span>
                          {!req.isOnline && <small>Oxirgi faollik: {formatTime(req.lastSeen)}</small>}
                        </div>
                      </div>
                      <div className={`guide-account-status guide-account-status-${req.status.toLowerCase().replace(' ', '-')}`}>{req.status}</div>
                    </div>
                    <div className="guide-account-request-details">
                      <div className="guide-account-request-info">
                        <div><FiCalendar /> {new Date(req.date).toLocaleDateString('uz-UZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                        <div><FiClock /> {req.duration}</div>
                        <div><FiUsers /> {req.travelers.adults} katta, {req.travelers.children} bola</div>
                        <div><FiDollarSign /> ${req.price}</div>
                      </div>
                      <div><strong>{req.serviceType}</strong>{req.notes && <p>{req.notes}</p>}</div>
                    </div>
                    {req.status === 'Kutilmoqda' && (
                      <div className="guide-account-request-actions">
                        <button className="guide-account-btn guide-account-btn-success" onClick={() => handleRequestAction(req.id, 'accept')}><FiCheck /> Qabul</button>
                        <button className="guide-account-btn guide-account-btn-danger" onClick={() => handleRequestAction(req.id, 'reject')}><FiX /> Rad</button>
                        <button className="guide-account-btn guide-account-btn-outline" onClick={() => { setCounterOfferData({ requestId: req.id, date: req.date.split('T')[0], price: req.price }); setShowCounterOffer(true); }}><FiEdit /> Counter</button>
                        <button className="guide-account-btn guide-account-btn-outline" onClick={() => { setSelectedClient(req.clientId); setChatOpen(true); }}><FiMessageSquare /> Chat</button>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
          <div className={`guide-account-chat-widget ${chatOpen ? '' : 'guide-account-chat-widget-hidden'}`}>
            <ChatWidgets
              user={user}
              role="Guide"
              requests={requests}
              chatMessages={chatMessages}
              setChatMessages={setChatMessages}
              onClose={() => setChatOpen(false)}
              selectedClient={selectedClient}
            />
          </div>
        </div>
      </div>

      {showProfileModal && (
        <div className="guide-account-modal-overlay" onClick={() => setShowProfileModal(false)}>
          <div className="guide-account-modal" onClick={e => e.stopPropagation()}>
            <h3>Profilni tahrirlash <button onClick={() => setShowProfileModal(false)}><FiX /></button></h3>
            <div className="guide-account-form-group">
              <label>Bio</label>
              <textarea value={profileForm.bio} onChange={e => setProfileForm({ ...profileForm, bio: e.target.value })} rows={4} />
            </div>
            <div className="guide-account-form-row">
              <div><label>Soatlik narx ($)</label><input type="number" value={profileForm.pricePerHour} onChange={e => setProfileForm({ ...profileForm, pricePerHour: Number(e.target.value) })} min="0" step="5" /></div>
              <div><label>Kunlik narx ($)</label><input type="number" value={profileForm.pricePerDay} onChange={e => setProfileForm({ ...profileForm, pricePerDay: Number(e.target.value) })} min="0" step="10" /></div>
            </div>
            <div className="guide-account-form-actions">
              <button className="guide-account-btn guide-account-btn-outline" onClick={() => setShowProfileModal(false)}>Bekor</button>
              <button className="guide-account-btn guide-account-btn-primary" onClick={() => { addNotification('Profil yangilandi', 'success'); setShowProfileModal(false); }}><FiCheck /> Saqlash</button>
            </div>
          </div>
        </div>
      )}

      {showCounterOffer && (
        <div className="guide-account-modal-overlay" onClick={() => setShowCounterOffer(false)}>
          <div className="guide-account-modal" onClick={e => e.stopPropagation()}>
            <h3>Counter Taklif <button onClick={() => setShowCounterOffer(false)}><FiX /></button></h3>
            <div className="guide-account-form-group">
              <label>Yangi sana</label>
              <input type="date" value={counterOfferData.date} onChange={e => setCounterOfferData({ ...counterOfferData, date: e.target.value })} min={new Date().toISOString().split('T')[0]} />
            </div>
            <div className="guide-account-form-group">
              <label>Yangi narx ($)</label>
              <input type="number" value={counterOfferData.price} onChange={e => setCounterOfferData({ ...counterOfferData, price: Number(e.target.value) })} min="0" step="5" />
            </div>
            <div className="guide-account-form-actions">
              <button className="guide-account-btn guide-account-btn-outline" onClick={() => setShowCounterOffer(false)}>Bekor</button>
              <button className="guide-account-btn guide-account-btn-primary" onClick={() => { handleRequestAction(counterOfferData.requestId, 'counter', counterOfferData); setShowCounterOffer(false); }}><FiCheck /> Yuborish</button>
            </div>
          </div>
        </div>
      )}

      {showPortfolioModal && (
        <div className="guide-account-modal-overlay" onClick={() => setShowPortfolioModal(false)}>
          <div className="guide-account-modal" onClick={e => e.stopPropagation()}>
            <h3>Portfolio <button onClick={() => setShowPortfolioModal(false)}><FiX /></button></h3>
            <div className="guide-account-portfolio-grid">
              {profileForm.portfolio.map((img, i) => (
                <div key={i} className="guide-account-portfolio-item">
                  <img src={img} alt={`Portfolio ${i + 1}`} />
                  <div className="guide-account-portfolio-overlay">
                    <button><FiImage /></button>
                  </div>
                </div>
              ))}
              <div className="guide-account-portfolio-add"><FiImage /> Yangi rasm</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuideAccount;