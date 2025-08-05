import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiUser, FiMail, FiLogOut, FiSettings, FiMapPin, FiX, FiArrowRight, FiCheck, FiUsers, FiCalendar, FiStar, FiGlobe, FiFilter, FiDollarSign, FiTrash2, FiMenu, FiEdit, FiHeart, FiMessageCircle, FiPhone } from 'react-icons/fi';
import ChatWidgets from './ChatWidgets';
import './UserAccount.css';

const UserAccount = ({ user, setUser, setIsAuthenticated }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [theme, setTheme] = useState('default');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(location.state?.openSettings || false);
  const [settingsForm, setSettingsForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    country: user?.country || '',
    city: user?.city || '',
    profilePicture: user?.profilePicture || 'https://randomuser.me/api/portraits/men/75.jpg',
    phone: user?.phone || ''
  });
  const [settingsError, setSettingsError] = useState('');
  const [selectedDestination, setSelectedDestination] = useState('');
  const [filter, setFilter] = useState({ name: '', minRating: '', language: '', maxPrice: '', tourType: '' });
  const [contracts, setContracts] = useState(user?.contracts || []);
  const [bookingDate, setBookingDate] = useState('');
  const [travelers, setTravelers] = useState({ adults: 1, children: 0 });
  const [showBookingSummary, setShowBookingSummary] = useState(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      guideId: '1',
      lastMessage: 'Samarqand turi haqida ma\'lumot',
      unreadCount: 1,
      messages: [
        { id: 'msg_001', sender: 'Client', text: 'Salom! Samarqand turi haqida ma\'lumot?', timestamp: new Date(Date.now() - 3600000).toISOString(), status: 'read' },
        { id: 'msg_002', sender: 'Guide', text: 'Assalomu alaykum! Registon, Gur-Emir va boshqa joylar.', timestamp: new Date(Date.now() - 3300000).toISOString(), status: 'read' }
      ]
    }
  ]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme === 'auto' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme);
  }, [theme]);

  const bookings = user?.bookings || [
    { id: 1, tourName: 'Guided Historical Tour', date: '2025-08-01', status: 'Confirmed', guideId: user?.id || 1, travelers: { adults: 2, children: 1 }, price: 150, duration: 'daily' },
    { id: 2, tourName: 'Cultural City Walk', date: '2025-09-15', status: 'Pending', guideId: user?.id || 2, travelers: { adults: 1, children: 0 }, price: 120, duration: 'daily' }
  ];

  const popularDestinations = [
    { name: 'Istanbul, Turkey', country: 'Turkey', guides: 234, image: 'https://images.unsplash.com/photo-1602751584581-2e4f8243cc6d', rating: 4.8, price: 'From $25/day', highlights: ['Historical Tours', 'Local Cuisine'] },
    { name: 'Barcelona, Spain', country: 'Spain', guides: 189, image: 'https://images.unsplash.com/photo-1549972890-1e9d1e0e9e38', rating: 4.9, price: 'From $35/day', highlights: ['Architecture', 'Art & Culture'] }
  ];

  const favorites = user?.favorites ? popularDestinations.filter(dest => user.favorites.includes(dest.name)) : [popularDestinations[0]];

  const guides = [
    { id: 1, name: 'Ahmed Yusuf', destination: 'Istanbul, Turkey', country: 'Turkey', languages: ['English', 'Turkish'], rating: 4.8, pricePerDay: 100, tourTypes: ['Historical', 'Cultural'], image: 'https://randomuser.me/api/portraits/men/1.jpg', isOnline: true, experience: '5+ years' },
    { id: 2, name: 'Maria Lopez', destination: 'Barcelona, Spain', country: 'Spain', languages: ['English', 'Spanish'], rating: 4.9, pricePerDay: 120, tourTypes: ['Cultural', 'Architecture'], image: 'https://randomuser.me/api/portraits/women/2.jpg', isOnline: false, experience: '3+ years' }
  ];

  const handleSettingsChange = e => setSettingsForm({ ...settingsForm, [e.target.name]: e.target.value });
  const handleSettingsSubmit = e => {
    e.preventDefault();
    const { firstName, lastName, email, country, city, profilePicture, phone } = settingsForm;
    if (!firstName || !lastName || !email || (user?.role === 'Customer' && (!country || !city))) {
      setSettingsError('Barcha majburiy maydonlarni to\'ldiring');
      return;
    }
    setUser({ ...user, firstName, lastName, email, username: `${firstName} ${lastName}`, ...(user?.role === 'Customer' ? { country, city } : {}), profilePicture, phone, contracts });
    setIsSettingsOpen(false);
    window.history.replaceState({}, '', '/account');
    alert('Profil yangilandi!');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
    navigate('/');
  };

  const handleBookGuide = (guideId, duration) => {
    if (!bookingDate || (travelers.adults === 0 && travelers.children === 0)) {
      alert('Sana yoki sayohatchilarni tanlang');
      return;
    }
    const guide = guides.find(g => g.id === guideId);
    const price = duration === 'daily' ? guide.pricePerDay : 0;
    setShowBookingSummary({ guideId, duration, price, totalPrice: price * (travelers.adults + travelers.children) });
  };

  const confirmBooking = () => {
    const { guideId, duration, price } = showBookingSummary;
    const guide = guides.find(g => g.id === guideId);
    const newContract = { id: contracts.length + 1, guideId, guideName: guide.name, destination: guide.destination, duration, price: price * (travelers.adults + travelers.children), date: bookingDate, status: 'Pending', travelers };
    setContracts([...contracts, newContract]);
    setUser({ ...user, contracts: [...contracts, newContract], bookings: [...(user?.bookings || []), { id: newContract.id, tourName: `${guide.name} bilan ${guide.destination}da tur`, date: bookingDate, status: 'Pending', guideId, travelers }] });
    setBookingDate('');
    setTravelers({ adults: 1, children: 0 });
    setShowBookingSummary(null);
    alert(`${guide.name} bilan bron qilindi`);
  };

  const handleCancelBooking = bookingId => {
    if (window.confirm('Bronni bekor qilmoqchimisiz?')) {
      setContracts(contracts.filter(c => c.id !== bookingId));
      setUser({ ...user, contracts: contracts.filter(c => c.id !== bookingId), bookings: bookings.filter(b => b.id !== bookingId) });
      alert('Bron bekor qilindi');
    }
  };

  const handleReviewSubmit = (contractId, rating, comment) => {
    setContracts(contracts.map(c => c.id === contractId ? { ...c, clientRating: rating, clientComment: comment } : c));
    setUser({ ...user, contracts: contracts.map(c => c.id === contractId ? { ...c, clientRating: rating, clientComment: comment } : c) });
    alert('Sharh yuborildi!');
  };

  const filteredGuides = guides.filter(g => (
    (!selectedDestination || g.country === selectedDestination.split(',')[1]?.trim()) &&
    (!filter.name || g.name.toLowerCase().includes(filter.name.toLowerCase())) &&
    (!filter.minRating || g.rating >= parseFloat(filter.minRating)) &&
    (!filter.language || g.languages.includes(filter.language)) &&
    (!filter.maxPrice || g.pricePerDay <= parseFloat(filter.maxPrice)) &&
    (!filter.tourType || g.tourTypes.includes(filter.tourType))
  ));

  return (
    <div className="user-account">
      <button className="user-account-mobile-menu-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}><FiMenu size={24} /></button>
      <div className="user-account-container">
        <aside className={`user-account-sidebar ${isMobileMenuOpen ? 'user-account-sidebar-open' : ''}`}>
          <div className="user-account-sidebar-header">
            <img src={user?.profilePicture || 'https://randomuser.me/api/portraits/men/75.jpg'} alt="Profil" className="user-account-sidebar-avatar" />
            <h3>{user?.firstName ? `${user.firstName} ${user.lastName}` : 'Foydalanuvchi'}</h3>
            <p>{user?.role || 'Client'}</p>
          </div>
          <nav className="user-account-sidebar-nav">
            {['profile', 'bookings', ...(user?.role === 'Client' ? ['guides'] : []), 'favorites'].map(tab => (
              <button key={tab} className={`user-account-nav-item ${activeTab === tab ? 'user-account-nav-item-active' : ''}`} onClick={() => { setActiveTab(tab); setIsMobileMenuOpen(false); }}>
                {tab === 'profile' ? <FiUser size={20} /> : tab === 'bookings' ? <FiCalendar size={20} /> : tab === 'guides' ? <FiUsers size={20} /> : <FiHeart size={20} />}
                <span>{tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
              </button>
            ))}
            <button className="user-account-nav-item" onClick={() => setIsSettingsOpen(true)}><FiSettings size={20} /> Sozlamalar</button>
            <button className="user-account-nav-item" onClick={handleLogout}><FiLogOut size={20} /> Chiqish</button>
          </nav>
        </aside>

        <main className="user-account-main">
          {activeTab === 'profile' && (
            <div className="user-account-content">
              <h1>Mening Profilim</h1>
              <div className="user-account-profile-card">
                <div className="user-account-profile-header">
                  <img src={user?.profilePicture || 'https://randomuser.me/api/portraits/men/75.jpg'} alt="Profil" className="user-account-profile-image" />
                  <div>
                    <h2>{user?.firstName ? `${user.firstName} ${user.lastName}` : 'Foydalanuvchi'}</h2>
                    <p>{user?.role || 'Client'}</p>
                    <span className="user-account-status-indicator user-account-status-online">Online</span>
                  </div>
                  <button onClick={() => setIsSettingsOpen(true)}><FiEdit size={18} /></button>
                </div>
                <div className="user-account-profile-details">
                  <div><FiMail /> <span>Email</span> <span>{user?.email || 'Kiritilmagan'}</span></div>
                  {user?.phone && <div><FiPhone /> <span>Telefon</span> <span>{user.phone}</span></div>}
                  {user?.role === 'Customer' && (
                    <>
                      <div><FiGlobe /> <span>Mamlakat</span> <span>{user?.country || 'Kiritilmagan'}</span></div>
                      <div><FiMapPin /> <span>Shahar</span> <span>{user?.city || 'Kiritilmagan'}</span></div>
                    </>
                  )}
                  <div><FiCalendar /> <span>Qo'shilgan</span> <span>{user?.joinedDate || 'Iyul 2025'}</span></div>
                </div>
              </div>
              <div className="user-account-stats-grid">
                <div><FiCalendar /> <span>{bookings.length}</span> <span>Bronlar</span></div>
                <div><FiHeart /> <span>{favorites.length}</span> <span>Sevimlilar</span></div>
              </div>
            </div>
          )}

          {activeTab === 'bookings' && (
            <div className="user-account-content">
              <h1>{user?.role === 'Customer' ? 'Turlaringiz' : 'Bronlaringiz'}</h1>
              {bookings.length ? (
                <div className="user-account-bookings-grid">
                  {bookings.map(booking => (
                    <div key={booking.id} className="user-account-booking-card">
                      <div className="user-account-booking-header">
                        <h3>{booking.tourName}</h3>
                        <span className={`user-account-booking-status user-account-status-${booking.status.toLowerCase()}`}>
                          {booking.status === 'Confirmed' ? 'Tasdiqlangan' : booking.status === 'Pending' ? 'Kutilmoqda' : 'Yakunlangan'}
                        </span>
                      </div>
                      <div className="user-account-booking-details">
                        <div><FiCalendar /> Sana: {booking.date}</div>
                        <div><FiUsers /> Sayohatchilar: {booking.travelers.adults} Katta, {booking.travelers.children} Bola</div>
                        <div><FiDollarSign /> Narx: ${booking.price}</div>
                      </div>
                      {user?.role === 'Client' && booking.status === 'Pending' && (
                        <button className="user-account-btn user-account-btn-danger" onClick={() => handleCancelBooking(booking.id)}><FiTrash2 /> Bekor qilish</button>
                      )}
                      {user?.role === 'Client' && booking.status === 'Completed' && !contracts.find(c => c.id === booking.id)?.clientRating && (
                        <div className="user-account-rating-section">
                          <select onChange={e => handleReviewSubmit(booking.id, parseFloat(e.target.value), '')}>
                            <option value="">Bahoni tanlang</option>
                            {[1, 2, 3, 4, 5].map(r => <option key={r} value={r}>{r} Yulduz</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="user-account-empty-state"><FiCalendar size={48} /> <h3>Bronlar topilmadi</h3></div>
              )}
            </div>
          )}

          {activeTab === 'guides' && user?.role === 'Client' && (
            <div className="user-account-content">
              <h1>Gidlarni Toping</h1>
              <div className="user-account-destination-section">
                <select value={selectedDestination} onChange={e => setSelectedDestination(e.target.value)} className="user-account-select">
                  <option value="">Yo'nalishni tanlang</option>
                  {popularDestinations.map(dest => <option key={dest.name} value={dest.name}>{dest.name}</option>)}
                </select>
                {selectedDestination && (
                  <>
                    <div className="user-account-booking-form">
                      <div><label><FiCalendar /> Sana</label><input type="date" value={bookingDate} onChange={e => setBookingDate(e.target.value)} min={new Date().toISOString().split('T')[0]} /></div>
                      <div className="user-account-travelers-grid">
                        <div><label>Kattalar</label><input type="number" name="adults" value={travelers.adults} onChange={e => setTravelers({ ...travelers, [e.target.name]: Math.max(0, parseInt(e.target.value) || 0) })} min="0" /></div>
                        <div><label>Bolalar</label><input type="number" name="children" value={travelers.children} onChange={e => setTravelers({ ...travelers, [e.target.name]: Math.max(0, parseInt(e.target.value) || 0) })} min="0" /></div>
                      </div>
                    </div>
                    <button onClick={() => setIsFilterOpen(!isFilterOpen)}><FiFilter /> {isFilterOpen ? 'Yashirish' : 'Ko\'rsatish'}</button>
                    {isFilterOpen && (
                      <div className="user-account-filter-grid">
                        <div><label><FiUser /> Ism</label><input type="text" name="name" value={filter.name} onChange={e => setFilter({ ...filter, [e.target.name]: e.target.value })} /></div>
                        <div><label><FiStar /> Min reyting</label><input type="number" name="minRating" value={filter.minRating} onChange={e => setFilter({ ...filter, [e.target.name]: e.target.value })} min="0" max="5" step="0.1" /></div>
                        <div><label><FiGlobe /> Til</label><select name="language" value={filter.language} onChange={e => setFilter({ ...filter, [e.target.name]: e.target.value })}><option value="">Istalgan</option><option value="English">Ingliz</option><option value="Turkish">Turk</option><option value="Spanish">Ispan</option></select></div>
                        <div><label><FiDollarSign /> Max narx/kun</label><input type="number" name="maxPrice" value={filter.maxPrice} onChange={e => setFilter({ ...filter, [e.target.name]: e.target.value })} min="0" /></div>
                      </div>
                    )}
                    <h2>{selectedDestination.split(',')[1]?.trim()}da gidlar ({filteredGuides.length})</h2>
                    {filteredGuides.length ? (
                      <div className="user-account-guides-grid">
                        {filteredGuides.map(guide => (
                          <div key={guide.id} className="user-account-guide-card">
                            <div className="user-account-guide-header">
                              <img src={guide.image} alt={guide.name} className="user-account-guide-avatar" />
                              <div className={`user-account-online-status ${guide.isOnline ? 'user-account-online' : 'user-account-offline'}`}></div>
                              <div><h3>{guide.name}</h3><p><FiMapPin size={14} /> {guide.destination}</p><p><FiStar size={14} /> {guide.rating} • {guide.experience}</p></div>
                            </div>
                            <div><span>Tillar:</span> {guide.languages.map(lang => <span key={lang} className="user-account-language-tag">{lang}</span>)}</div>
                            <div><span>Tur turlari:</span> {guide.tourTypes.map(type => <span key={type} className="user-account-tour-tag">{type}</span>)}</div>
                            <div><span>Kunlik:</span> ${guide.pricePerDay}</div>
                            <select onChange={e => handleBookGuide(guide.id, e.target.value)}><option value="">Bron qilish</option><option value="daily">Kunlik (${guide.pricePerDay})</option></select>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="user-account-empty-state"><FiUsers size={48} /> <h3>Gidlar topilmadi</h3></div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {activeTab === 'favorites' && (
            <div className="user-account-content">
              <h1>Sevimli Joylar</h1>
              {favorites.length ? (
                <div className="user-account-destinations-grid">
                  {favorites.map((dest, i) => (
                    <div key={i} className="user-account-destination-card">
                      <div className="user-account-destination-image" style={{ backgroundImage: `url(${dest.image})` }}>
                        <button onClick={() => navigate('/find-guides', { state: { location: dest.name.split(',')[0].trim(), service: '' } })}><FiArrowRight /></button>
                        <div><FiStar /> {dest.rating}</div>
                      </div>
                      <h3>{dest.name}</h3>
                      <p>{dest.price}</p>
                      <div><FiUsers /> {dest.guides} gid</div>
                      <div>{dest.highlights.map((h, idx) => <span key={idx} className="user-account-highlight-tag">{h}</span>)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="user-account-empty-state"><FiHeart size={48} /> <h3>Sevimli joylar yo'q</h3></div>
              )}
            </div>
          )}
        </main>
      </div>

      {user?.role === 'Client' && (
        <>
          <button className="user-account-chat-btn" onClick={() => setIsChatOpen(!isChatOpen)}><FiMessageCircle size={24} /></button>
          <div className={`user-account-chat-widget ${isChatOpen ? '' : 'user-account-chat-widget-hidden'}`}>
            <ChatWidgets
              user={user}
              role="Client"
              guides={guides}
              chatMessages={chatMessages}
              setChatMessages={setChatMessages}
              onClose={() => setIsChatOpen(false)}
            />
          </div>
        </>
      )}

      {showBookingSummary && (
        <div className="user-account-modal-overlay" onClick={() => setShowBookingSummary(null)}>
          <div className="user-account-booking-summary-modal" onClick={e => e.stopPropagation()}>
            <h2>Bron Xulosasi <button onClick={() => setShowBookingSummary(null)}><FiX size={20} /></button></h2>
            <div className="user-account-booking-summary-details">
              <div><span>Gid:</span> {guides.find(g => g.id === showBookingSummary.guideId)?.name}</div>
              <div><span>Yo'nalish:</span> {guides.find(g => g.id === showBookingSummary.guideId)?.destination}</div>
              <div><span>Sana:</span> {bookingDate}</div>
              <div><span>Davomiyligi:</span> {showBookingSummary.duration}</div>
              <div><span>Sayohatchilar:</span> {travelers.adults} Katta, {travelers.children} Bola</div>
              <div><span>Jami:</span> ${showBookingSummary.totalPrice}</div>
            </div>
            <div className="user-account-modal-actions">
              <button className="user-account-btn user-account-btn-primary" onClick={confirmBooking}><FiCheck /> Tasdiqlash</button>
              <button className="user-account-btn user-account-btn-outline" onClick={() => setShowBookingSummary(null)}><FiX /> Bekor</button>
            </div>
          </div>
        </div>
      )}

      {isSettingsOpen && (
        <div className="user-account-modal-overlay" onClick={() => setIsSettingsOpen(false)}>
          <div className="user-account-settings-modal" onClick={e => e.stopPropagation()}>
            <h2>Sozlamalar <button onClick={() => setIsSettingsOpen(false)}><FiX size={20} /></button></h2>
            {settingsError && <div className="user-account-error-message">{settingsError}</div>}
            <form onSubmit={handleSettingsSubmit}>
              <div className="user-account-form-row">
                <div><label><FiUser /> Ism</label><input type="text" name="firstName" value={settingsForm.firstName} onChange={handleSettingsChange} placeholder="Ism" required /></div>
                <div><label><FiUser /> Familiya</label><input type="text" name="lastName" value={settingsForm.lastName} onChange={handleSettingsChange} placeholder="Familiya" required /></div>
              </div>
              <div><label><FiMail /> Email</label><input type="email" name="email" value={settingsForm.email} onChange={handleSettingsChange} placeholder="Email" required /></div>
              <div><label><FiPhone /> Telefon</label><input type="tel" name="phone" value={settingsForm.phone} onChange={handleSettingsChange} placeholder="Telefon" /></div>
              {user?.role === 'Customer' && (
                <div className="user-account-form-row">
                  <div><label><FiGlobe /> Mamlakat</label><input type="text" name="country" value={settingsForm.country} onChange={handleSettingsChange} placeholder="Mamlakat" required /></div>
                  <div><label><FiMapPin /> Shahar</label><input type="text" name="city" value={settingsForm.city} onChange={handleSettingsChange} placeholder="Shahar" required /></div>
                </div>
              )}
              <div><label><FiUser /> Profil rasmi URL</label><input type="url" name="profilePicture" value={settingsForm.profilePicture} onChange={handleSettingsChange} placeholder="Rasm URL" /></div>
              <div className="user-account-modal-actions">
                <button type="submit" className="user-account-btn user-account-btn-primary"><FiCheck /> Saqlash</button>
                <button type="button" className="user-account-btn user-account-btn-outline" onClick={() => setIsSettingsOpen(false)}><FiX /> Bekor</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserAccount;