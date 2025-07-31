import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FiUser,
  FiMail,
  FiLogOut,
  FiSettings,
  FiMapPin,
  FiX,
  FiArrowRight,
  FiCheck,
  FiUsers,
  FiCalendar,
  FiStar,
  FiGlobe,
  FiFilter,
  FiDollarSign,
  FiTrash2,
  FiMenu,
  FiEdit,
  FiHeart,
  FiClock,
  FiPhone,
  FiMessageCircle
} from 'react-icons/fi';
import UserChatWidget from './UserChatWidget';
import './UserAccount.css';

const UserAccount = ({ user, setUser, setIsAuthenticated }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Theme state
  const [theme, setTheme] = useState('default');

  // Chat widget visibility state
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Listen for theme changes
  useEffect(() => {
    const handleThemeChange = (event) => {
      const newTheme = event.detail?.theme || 'default';
      setTheme(newTheme);
      document.documentElement.setAttribute('data-theme', newTheme.toLowerCase());
      if (newTheme.toLowerCase() === 'auto') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
      }
    };

    window.addEventListener('themeChange', handleThemeChange);
    if (theme.toLowerCase() === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    }

    return () => window.removeEventListener('themeChange', handleThemeChange);
  }, [theme]);

  // State management
  const [isSettingsOpen, setIsSettingsOpen] = useState(location.state?.openSettings || false);
  const [settingsForm, setSettingsForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    country: user?.country || '',
    city: user?.city || '',
    profilePicture: user?.profilePicture || 'https://randomuser.me/api/portraits/men/75.jpg',
    phone: user?.phone || '',
    bio: user?.bio || ''
  });
  const [settingsError, setSettingsError] = useState('');
  const [selectedDestination, setSelectedDestination] = useState('');
  const [filter, setFilter] = useState({
    name: '',
    minRating: '',
    language: '',
    maxPrice: '',
    tourType: ''
  });
  const [contracts, setContracts] = useState(user?.contracts || []);
  const [bookingDate, setBookingDate] = useState('');
  const [travelers, setTravelers] = useState({ adults: 1, children: 0 });
  const [showBookingSummary, setShowBookingSummary] = useState(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState({});

  // Mock data
  const bookings = user?.bookings || [
    {
      id: 1,
      tourName: user?.role === 'Customer' ? 'Guided Historical Tour' : 'Historical Istanbul Tour',
      date: '2025-08-01',
      status: 'Confirmed',
      guideId: user?.role === 'Customer' ? user.id : 1,
      travelers: { adults: 2, children: 1 },
      price: 150,
      duration: 'daily'
    },
    {
      id: 2,
      tourName: user?.role === 'Customer' ? 'Cultural City Walk' : 'Barcelona Cultural Experience',
      date: '2025-09-15',
      status: 'Pending',
      guideId: user?.role === 'Customer' ? user.id : 2,
      travelers: { adults: 1, children: 0 },
      price: 120,
      duration: 'daily'
    }
  ];

  const popularDestinations = [
    {
      name: 'Istanbul, Turkey',
      country: 'Turkey',
      guides: 234,
      image: 'https://images.unsplash.com/photo-1602751584581-2e4f8243cc6d',
      rating: 4.8,
      price: 'From $25/day',
      highlights: ['Historical Tours', 'Local Cuisine', 'Shopping Guide']
    },
    {
      name: 'Barcelona, Spain',
      country: 'Spain',
      guides: 189,
      image: 'https://images.unsplash.com/photo-1549972890-1e9d1e0e9e38',
      rating: 4.9,
      price: 'From $35/day',
      highlights: ['Architecture', 'Beach Tours', 'Art & Culture']
    },
    {
      name: 'Tokyo, Japan',
      country: 'Japan',
      guides: 156,
      image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf',
      rating: 4.7,
      price: 'From $45/day',
      highlights: ['Modern Culture', 'Traditional Sites', 'Food Tours']
    },
    {
      name: 'Paris, France',
      country: 'France',
      guides: 298,
      image: 'https://images.unsplash.com/photo-1502602898650-2c301a4391b1',
      rating: 4.8,
      price: 'From $40/day',
      highlights: ['Museums', 'Romance Tours', 'Fashion Districts']
    }
  ];

  const favorites = user?.favorites
    ? popularDestinations.filter(dest => user.favorites.includes(dest.name))
    : [popularDestinations[0], popularDestinations[3]];

  const guides = [
    {
      id: 1,
      name: 'Ahmed Yusuf',
      destination: 'Istanbul, Turkey',
      country: 'Turkey',
      languages: ['English', 'Turkish', 'Arabic'],
      rating: 4.8,
      pricePerHour: 20,
      pricePerDay: 100,
      pricePerWeek: 600,
      pricePerMonth: 2000,
      tourTypes: ['Historical', 'Cultural'],
      image: 'https://randomuser.me/api/portraits/men/1.jpg',
      isOnline: true,
      experience: '5+ years'
    },
    {
      id: 2,
      name: 'Maria Lopez',
      destination: 'Barcelona, Spain',
      country: 'Spain',
      languages: ['English', 'Spanish', 'Catalan'],
      rating: 4.9,
      pricePerHour: 25,
      pricePerDay: 120,
      pricePerWeek: 700,
      pricePerMonth: 2500,
      tourTypes: ['Cultural', 'Architecture'],
      image: 'https://randomuser.me/api/portraits/women/2.jpg',
      isOnline: false,
      experience: '3+ years'
    },
    {
      id: 3,
      name: 'Hiro Tanaka',
      destination: 'Tokyo, Japan',
      country: 'Japan',
      languages: ['English', 'Japanese'],
      rating: 4.7,
      pricePerHour: 30,
      pricePerDay: 150,
      pricePerWeek: 900,
      pricePerMonth: 3000,
      tourTypes: ['Food', 'Modern Culture'],
      image: 'https://randomuser.me/api/portraits/men/3.jpg',
      isOnline: true,
      experience: '7+ years'
    },
    {
      id: 4,
      name: 'Sophie Martin',
      destination: 'Paris, France',
      country: 'France',
      languages: ['English', 'French'],
      rating: 4.8,
      pricePerHour: 22,
      pricePerDay: 110,
      pricePerWeek: 650,
      pricePerMonth: 2200,
      tourTypes: ['Historical', 'Romance'],
      image: 'https://randomuser.me/api/portraits/women/4.jpg',
      isOnline: true,
      experience: '4+ years'
    }
  ];

  // Event handlers
  const handleSettingsChange = (e) => {
    setSettingsForm({ ...settingsForm, [e.target.name]: e.target.value });
    setSettingsError('');
  };

  const handleSettingsSubmit = (e) => {
    e.preventDefault();
    const { firstName, lastName, email, country, city, profilePicture, phone, bio } = settingsForm;
    if (!firstName || !lastName || !email) {
      setSettingsError('Iltimos, barcha majburiy maydonlarni to\'ldiring');
      return;
    }
    if (user?.role === 'Customer' && (!country || !city)) {
      setSettingsError('Iltimos, mamlakat va shaharni kiriting');
      return;
    }
    setUser({
      ...user,
      firstName,
      lastName,
      email,
      username: `${firstName} ${lastName}`,
      ...(user?.role === 'Customer' ? { country, city } : {}),
      profilePicture,
      phone,
      bio,
      contracts
    });
    setIsSettingsOpen(false);
    window.history.replaceState({}, '', '/account');
    alert('Profil muvaffaqiyatli yangilandi!');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
    navigate('/');
  };

  const handleOpenSettings = () => {
    setIsSettingsOpen(true);
  };

  const handleCloseSettings = () => {
    setIsSettingsOpen(false);
    setSettingsError('');
    window.history.replaceState({}, '', '/account');
  };

  const handleExploreDestination = (destinationName) => {
    navigate('/find-guides', { state: { location: destinationName.split(',')[0].trim(), service: '' } });
  };

  const handleDestinationChange = (e) => {
    setSelectedDestination(e.target.value);
    setBookingDate('');
    setTravelers({ adults: 1, children: 0 });
  };

  const handleFilterChange = (e) => {
    setFilter({ ...filter, [e.target.name]: e.target.value });
  };

  const handleTravelersChange = (e) => {
    setTravelers({ ...travelers, [e.target.name]: Math.max(0, parseInt(e.target.value) || 0) });
  };

  const selectedCountry = selectedDestination ? selectedDestination.split(',')[1]?.trim() : '';
  const filteredGuides = guides.filter(guide => {
    const matchesCountry = selectedCountry ? guide.country === selectedCountry : true;
    const matchesName = filter.name ? guide.name.toLowerCase().includes(filter.name.toLowerCase()) : true;
    const matchesRating = filter.minRating ? guide.rating >= parseFloat(filter.minRating) : true;
    const matchesLanguage = filter.language ? guide.languages.includes(filter.language) : true;
    const matchesPrice = filter.maxPrice ? guide.pricePerDay <= parseFloat(filter.maxPrice) : true;
    const matchesTourType = filter.tourType ? guide.tourTypes.includes(filter.tourType) : true;
    return matchesCountry && matchesName && matchesRating && matchesLanguage && matchesPrice && matchesTourType;
  });

  const handleBookGuide = (guideId, duration) => {
    if (!bookingDate) {
      alert('Iltimos, bron qilish sanasini tanlang');
      return;
    }
    if (travelers.adults === 0 && travelers.children === 0) {
      alert('Iltimos, kamida bitta sayohatchini tanlang');
      return;
    }
    const guide = guides.find(g => g.id === guideId);
    const price = duration === 'hourly' ? guide.pricePerHour :
                  duration === 'daily' ? guide.pricePerDay :
                  duration === 'weekly' ? guide.pricePerWeek : guide.pricePerMonth;
    const totalPrice = price * (travelers.adults + travelers.children);
    setShowBookingSummary({ guideId, duration, price, totalPrice });
  };

  const confirmBooking = () => {
    const { guideId, duration, price } = showBookingSummary;
    const guide = guides.find(g => g.id === guideId);
    const totalPrice = price * (travelers.adults + travelers.children);
    const newContract = {
      id: contracts.length + 1,
      guideId,
      guideName: guide.name,
      destination: guide.destination,
      duration,
      price: totalPrice,
      date: bookingDate,
      status: 'Pending',
      clientRating: null,
      clientComment: '',
      travelers
    };
    const newBooking = {
      id: contracts.length + 1,
      tourName: `${guide.name} bilan ${guide.destination}da tur`,
      date: bookingDate,
      status: 'Pending',
      guideId,
      travelers
    };
    setContracts([...contracts, newContract]);
    setUser({
      ...user,
      contracts: [...contracts, newContract],
      bookings: [...(user?.bookings || []), newBooking]
    });
    setBookingDate('');
    setTravelers({ adults: 1, children: 0 });
    setShowBookingSummary(null);
    alert(`${guide.name} ${duration} uchun ${bookingDate} sanasida ${travelers.adults + travelers.children} sayohatchiga $${totalPrice} narxda bron qilindi`);
  };

  const handleCancelBooking = (bookingId) => {
    if (window.confirm('Haqiqatan ham ushbu bronni bekor qilmoqchimisiz?')) {
      const updatedContracts = contracts.filter(c => c.id !== bookingId);
      const updatedBookings = bookings.filter(b => b.id !== bookingId);
      setContracts(updatedContracts);
      setUser({ ...user, contracts: updatedContracts, bookings: updatedBookings });
      alert('Bron muvaffaqiyatli bekor qilindi');
    }
  };

  const handleUpdateTourStatus = (contractId, newStatus) => {
    const updatedContracts = contracts.map(contract =>
      contract.id === contractId ? { ...contract, status: newStatus } : contract
    );
    const updatedBookings = bookings.map(booking =>
      booking.id === contractId ? { ...booking, status: newStatus } : booking
    );
    setContracts(updatedContracts);
    setUser({ ...user, contracts: updatedContracts, bookings: updatedBookings });
    alert(`Tur holati ${newStatus}ga yangilandi`);
  };

  const handleReviewSubmit = (contractId, rating, comment) => {
    const updatedContracts = contracts.map(contract =>
      contract.id === contractId ? { ...contract, clientRating: rating, clientComment: comment } : contract
    );
    setContracts(updatedContracts);
    setUser({ ...user, contracts: updatedContracts });
    alert('Sharh muvaffaqiyatli yuborildi!');
  };

  const toggleChatWidget = () => {
    setIsChatOpen(!isChatOpen);
  };

  return (
    <div className="user-account">
      {/* Mobile Menu Button */}
      <button
        className="user-account-mobile-menu-btn"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        aria-label="Menu"
      >
        <FiMenu size={24} />
      </button>

      <div className="user-account-container">
        {/* Sidebar Navigation */}
        <aside className={`user-account-sidebar ${isMobileMenuOpen ? 'user-account-sidebar-open' : ''}`}>
          <div className="user-account-sidebar-header">
            <img
              src={user?.profilePicture || 'https://randomuser.me/api/portraits/men/75.jpg'}
              alt="Profil rasmi"
              className="user-account-sidebar-avatar"
            />
            <h3 className="user-account-sidebar-name">
              {user?.firstName ? `${user.firstName} ${user.lastName}` : user?.username || 'Foydalanuvchi'}
            </h3>
            <p className="user-account-sidebar-role">{user?.role || 'Client'}</p>
          </div>

          <nav className="user-account-sidebar-nav">
            <button
              className={`user-account-nav-item ${activeTab === 'profile' ? 'user-account-nav-item-active' : ''}`}
              onClick={() => {
                setActiveTab('profile');
                setIsMobileMenuOpen(false);
              }}
            >
              <FiUser size={20} />
              <span>Profil</span>
            </button>

            <button
              className={`user-account-nav-item ${activeTab === 'bookings' ? 'user-account-nav-item-active' : ''}`}
              onClick={() => {
                setActiveTab('bookings');
                setIsMobileMenuOpen(false);
              }}
            >
              <FiCalendar size={20} />
              <span>Bronlar</span>
            </button>

            {user?.role === 'Client' && (
              <button
                className={`user-account-nav-item ${activeTab === 'guides' ? 'user-account-nav-item-active' : ''}`}
                onClick={() => {
                  setActiveTab('guides');
                  setIsMobileMenuOpen(false);
                }}
              >
                <FiUsers size={20} />
                <span>Gidlar</span>
              </button>
            )}

            <button
              className={`user-account-nav-item ${activeTab === 'favorites' ? 'user-account-nav-item-active' : ''}`}
              onClick={() => {
                setActiveTab('favorites');
                setIsMobileMenuOpen(false);
              }}
            >
              <FiHeart size={20} />
              <span>Sevimlilar</span>
            </button>

            <button
              className="user-account-nav-item"
              onClick={handleOpenSettings}
            >
              <FiSettings size={20} />
              <span>Sozlamalar</span>
            </button>

            <button
              className="user-account-nav-item user-account-nav-logout"
              onClick={handleLogout}
            >
              <FiLogOut size={20} />
              <span>Chiqish</span>
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="user-account-main">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="user-account-content">
              <div className="user-account-content-header">
                <h1 className="user-account-title">Mening Profilim</h1>
                <p className="user-account-subtitle">Shaxsiy ma'lumotlaringizni boshqaring</p>
              </div>

              <div className="user-account-profile-section">
                <div className="user-account-profile-card">
                  <div className="user-account-profile-header">
                    <img
                      src={user?.profilePicture || 'https://randomuser.me/api/portraits/men/75.jpg'}
                      alt="Profil rasmi"
                      className="user-account-profile-image"
                    />
                    <div className="user-account-profile-info">
                      <h2 className="user-account-profile-name">
                        {user?.firstName ? `${user.firstName} ${user.lastName}` : user?.username || 'Foydalanuvchi'}
                      </h2>
                      <p className="user-account-profile-role">{user?.role || 'Client'}</p>
                      <div className="user-account-profile-status">
                        <span className="user-account-status-indicator user-account-status-online"></span>
                        Online
                      </div>
                    </div>
                    <button
                      className="user-account-edit-btn"
                      onClick={handleOpenSettings}
                      aria-label="Profilni tahrirlash"
                    >
                      <FiEdit size={18} />
                    </button>
                  </div>

                  <div className="user-account-profile-details">
                    <div className="user-account-detail-item">
                      <div className="user-account-detail-icon">
                        <FiMail />
                      </div>
                      <div className="user-account-detail-content">
                        <span className="user-account-detail-label">Email</span>
                        <span className="user-account-detail-value">{user?.email || 'Email kiritilmagan'}</span>
                      </div>
                    </div>

                    {user?.phone && (
                      <div className="user-account-detail-item">
                        <div className="user-account-detail-icon">
                          <FiPhone />
                        </div>
                        <div className="user-account-detail-content">
                          <span className="user-account-detail-label">Telefon</span>
                          <span className="user-account-detail-value">{user.phone}</span>
                        </div>
                      </div>
                    )}

                    {user?.role === 'Customer' && (
                      <>
                        <div className="user-account-detail-item">
                          <div className="user-account-detail-icon">
                            <FiGlobe />
                          </div>
                          <div className="user-account-detail-content">
                            <span className="user-account-detail-label">Mamlakat</span>
                            <span className="user-account-detail-value">{user?.country || 'Kiritilmagan'}</span>
                          </div>
                        </div>

                        <div className="user-account-detail-item">
                          <div className="user-account-detail-icon">
                            <FiMapPin />
                          </div>
                          <div className="user-account-detail-content">
                            <span className="user-account-detail-label">Shahar</span>
                            <span className="user-account-detail-value">{user?.city || 'Kiritilmagan'}</span>
                          </div>
                        </div>
                      </>
                    )}

                    <div className="user-account-detail-item">
                      <div className="user-account-detail-icon">
                        <FiCalendar />
                      </div>
                      <div className="user-account-detail-content">
                        <span className="user-account-detail-label">Qo'shilgan sana</span>
                        <span className="user-account-detail-value">{user?.joinedDate || 'Iyul 2025'}</span>
                      </div>
                    </div>

                    {user?.bio && (
                      <div className="user-account-detail-item user-account-detail-bio">
                        <div className="user-account-detail-content">
                          <span className="user-account-detail-label">Bio</span>
                          <span className="user-account-detail-value">{user.bio}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="user-account-stats-grid">
                  <div className="user-account-stat-card">
                    <div className="user-account-stat-icon">
                      <FiCalendar />
                    </div>
                    <div className="user-account-stat-content">
                      <span className="user-account-stat-number">{bookings.length}</span>
                      <span className="user-account-stat-label">Jami bronlar</span>
                    </div>
                  </div>

                  <div className="user-account-stat-card">
                    <div className="user-account-stat-icon">
                      <FiHeart />
                    </div>
                    <div className="user-account-stat-content">
                      <span className="user-account-stat-number">{favorites.length}</span>
                      <span className="user-account-stat-label">Sevimli joylar</span>
                    </div>
                  </div>

                  <div className="user-account-stat-card">
                    <div className="user-account-stat-icon">
                      <FiUsers />
                    </div>
                    <div className="user-account-stat-content">
                      <span className="user-account-stat-number">{Object.keys(chatMessages).length}</span>
                      <span className="user-account-stat-label">Aktiv chatlar</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bookings Tab */}
          {activeTab === 'bookings' && (
            <div className="user-account-content">
              <div className="user-account-content-header">
                <h1 className="user-account-title">
                  {user?.role === 'Customer' ? 'Sizning Turlaringiz' : 'Sizning Bronlaringiz'}
                </h1>
                <p className="user-account-subtitle">
                  {user?.role === 'Customer' ? 'Gid turlaringizni boshqaring' : 'O\'tgan va kelayotgan sayohatlaringizni ko\'ring'}
                </p>
              </div>

              {bookings.length > 0 ? (
                <div className="user-account-bookings-grid">
                  {bookings.map((booking) => {
                    const contract = contracts.find(c => c.id === booking.id);
                    return (
                      <div key={booking.id} className="user-account-booking-card">
                        <div className="user-account-booking-header">
                          <h3 className="user-account-booking-title">{booking.tourName}</h3>
                          <span className={`user-account-booking-status user-account-status-${booking.status.toLowerCase()}`}>
                            {booking.status === 'Confirmed' ? 'Tasdiqlangan' :
                             booking.status === 'Pending' ? 'Kutilmoqda' :
                             booking.status === 'Completed' ? 'Yakunlangan' : booking.status}
                          </span>
                        </div>

                        <div className="user-account-booking-details">
                          <div className="user-account-booking-detail">
                            <FiCalendar />
                            <span>Sana: {contract?.date || booking.date}</span>
                          </div>

                          {contract && (
                            <div className="user-account-booking-detail">
                              <FiClock />
                              <span>Davomiyligi: {contract.duration}</span>
                            </div>
                          )}

                          <div className="user-account-booking-detail">
                            <FiUsers />
                            <span>Sayohatchilar: {booking.travelers.adults} Kattalar, {booking.travelers.children} Bolalar</span>
                          </div>

                          {contract && (
                            <div className="user-account-booking-detail">
                              <FiDollarSign />
                              <span>Narx: ${contract.price}</span>
                            </div>
                          )}
                        </div>

                        <div className="user-account-booking-actions">
                          {user?.role === 'Client' && booking.status === 'Pending' && (
                            <button
                              className="user-account-btn user-account-btn-danger"
                              onClick={() => handleCancelBooking(booking.id)}
                              aria-label={`${booking.tourName}ni bekor qilish`}
                            >
                              <FiTrash2 /> Bekor qilish
                            </button>
                          )}

                          {user?.role === 'Customer' && booking.status !== 'Completed' && (
                            <>
                              {booking.status === 'Pending' ? (
                                <button
                                  className="user-account-btn user-account-btn-primary"
                                  onClick={() => handleUpdateTourStatus(booking.id, 'Confirmed')}
                                  aria-label={`${booking.tourName}ni tasdiqlash`}
                                >
                                  <FiCheck /> Tasdiqlash
                                </button>
                              ) : booking.status === 'Confirmed' ? (
                                <button
                                  className="user-account-btn user-account-btn-primary"
                                  onClick={() => handleUpdateTourStatus(booking.id, 'Started')}
                                  aria-label={`${booking.tourName}ni boshlangan deb belgilash`}
                                >
                                  <FiCheck /> Boshlandi
                                </button>
                              ) : booking.status === 'Started' ? (
                                <button
                                  className="user-account-btn user-account-btn-primary"
                                  onClick={() => handleUpdateTourStatus(booking.id, 'Completed')}
                                  aria-label={`${booking.tourName}ni yakunlangan deb belgilash`}
                                >
                                  <FiCheck /> Yakunlandi
                                </button>
                              ) : null}
                            </>
                          )}

                          {user?.role === 'Client' && booking.status === 'Completed' && !contract?.clientRating && (
                            <div className="user-account-rating-section">
                              <select
                                className="user-account-select"
                                onChange={(e) => handleReviewSubmit(booking.id, parseFloat(e.target.value), '')}
                                aria-label={`${booking.tourName} uchun gidni baholash`}
                              >
                                <option value="">Bahoni tanlang</option>
                                {[1, 2, 3, 4, 5].map(r => (
                                  <option key={r} value={r}>{r} Yulduz</option>
                                ))}
                              </select>
                              <input
                                type="text"
                                placeholder="Izoh qo'shing"
                                className="user-account-input"
                                onBlur={(e) => {
                                  const rating = contracts.find(c => c.id === booking.id)?.clientRating;
                                  if (rating) handleReviewSubmit(booking.id, rating, e.target.value);
                                }}
                                aria-label={`${booking.tourName} uchun izoh`}
                              />
                            </div>
                          )}

                          {contract?.clientRating && (
                            <div className="user-account-rating-display">
                              <div className="user-account-rating-stars">
                                <FiStar /> {contract.clientRating}
                              </div>
                              {contract.clientComment && (
                                <p className="user-account-rating-comment">{contract.clientComment}</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="user-account-empty-state">
                  <FiCalendar size={48} />
                  <h3>Bronlar topilmadi</h3>
                  <p>{user?.role === 'Customer' ? 'Hali gid turlari yo\'q. Qo\'shing!' : 'Hali bronlar yo\'q. Sayohatni boshlang!'}</p>
                </div>
              )}
            </div>
          )}

          {/* Guides Tab */}
          {activeTab === 'guides' && user?.role === 'Client' && (
            <div className="user-account-content">
              <div className="user-account-content-header">
                <h1 className="user-account-title">Gidlarni Toping</h1>
                <p className="user-account-subtitle">O'zingizga mos gidni tanlang</p>
              </div>

              <div className="user-account-destination-section">
                <div className="user-account-form-group">
                  <label htmlFor="destination-select">
                    <FiGlobe /> Yo'nalishni tanlang
                  </label>
                  <select
                    id="destination-select"
                    value={selectedDestination}
                    onChange={handleDestinationChange}
                    className="user-account-select"
                    aria-label="Yo'nalishni tanlang"
                  >
                    <option value="">Yo'nalishni tanlang</option>
                    {popularDestinations.map(dest => (
                      <option key={dest.name} value={dest.name}>{dest.name}</option>
                    ))}
                  </select>
                </div>

                {selectedDestination && (
                  <>
                    <div className="user-account-booking-form">
                      <div className="user-account-form-group">
                        <label htmlFor="booking-date">
                          <FiCalendar /> Bron qilish sanasi
                        </label>
                        <input
                          id="booking-date"
                          type="date"
                          value={bookingDate}
                          onChange={(e) => setBookingDate(e.target.value)}
                          className="user-account-input"
                          aria-label="Bron qilish sanasini tanlang"
                          min={new Date().toISOString().split('T')[0]}
                        />
                      </div>

                      <div className="user-account-form-group">
                        <label><FiUsers /> Sayohatchilar</label>
                        <div className="user-account-travelers-grid">
                          <div>
                            <label htmlFor="travelers-adults">Kattalar</label>
                            <input
                              id="travelers-adults"
                              type="number"
                              name="adults"
                              value={travelers.adults}
                              onChange={handleTravelersChange}
                              min="0"
                              className="user-account-input"
                              aria-label="Kattalar soni"
                            />
                          </div>
                          <div>
                            <label htmlFor="travelers-children">Bolalar</label>
                            <input
                              id="travelers-children"
                              type="number"
                              name="children"
                              value={travelers.children}
                              onChange={handleTravelersChange}
                              min="0"
                              className="user-account-input"
                              aria-label="Bolalar soni"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="user-account-filter-section">
                      <button
                        className="user-account-filter-toggle"
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        aria-label={isFilterOpen ? 'Filtrlarni yashirish' : 'Filtrlarni ko\'rsatish'}
                      >
                        <FiFilter /> {isFilterOpen ? 'Filtrlarni yashirish' : 'Filtrlarni ko\'rsatish'}
                      </button>

                      {isFilterOpen && (
                        <div className="user-account-filter-grid">
                          <div className="user-account-form-group">
                            <label htmlFor="filter-name"><FiUser /> Ism</label>
                            <input
                              id="filter-name"
                              type="text"
                              name="name"
                              value={filter.name}
                              onChange={handleFilterChange}
                              placeholder="Ism bo'yicha qidirish"
                              className="user-account-input"
                            />
                          </div>

                          <div className="user-account-form-group">
                            <label htmlFor="filter-minRating"><FiStar /> Minimal reyting</label>
                            <input
                              id="filter-minRating"
                              type="number"
                              name="minRating"
                              value={filter.minRating}
                              onChange={handleFilterChange}
                              placeholder="masalan, 4.5"
                              min="0"
                              max="5"
                              step="0.1"
                              className="user-account-input"
                            />
                          </div>

                          <div className="user-account-form-group">
                            <label htmlFor="filter-language"><FiGlobe /> Til</label>
                            <select
                              id="filter-language"
                              name="language"
                              value={filter.language}
                              onChange={handleFilterChange}
                              className="user-account-select"
                            >
                              <option value="">Istalgan</option>
                              <option value="English">Ingliz tili</option>
                              <option value="Turkish">Turk tili</option>
                              <option value="Spanish">Ispan tili</option>
                              <option value="Japanese">Yapon tili</option>
                              <option value="French">Fransuz tili</option>
                              <option value="Arabic">Arab tili</option>
                              <option value="Catalan">Katalan tili</option>
                            </select>
                          </div>

                          <div className="user-account-form-group">
                            <label htmlFor="filter-maxPrice"><FiDollarSign /> Maksimal narx/kun</label>
                            <input
                              id="filter-maxPrice"
                              type="number"
                              name="maxPrice"
                              value={filter.maxPrice}
                              onChange={handleFilterChange}
                              placeholder="masalan, 150"
                              min="0"
                              className="user-account-input"
                            />
                          </div>

                          <div className="user-account-form-group">
                            <label htmlFor="filter-tourType"><FiMapPin /> Tur turi</label>
                            <select
                              id="filter-tourType"
                              name="tourType"
                              value={filter.tourType}
                              onChange={handleFilterChange}
                              className="user-account-select"
                            >
                              <option value="">Istalgan</option>
                              <option value="Historical">Tarixiy</option>
                              <option value="Cultural">Madaniy</option>
                              <option value="Food">Ovqat</option>
                              <option value="Architecture">Me'morchilik</option>
                              <option value="Romance">Romantik</option>
                              <option value="Modern Culture">Zamonaviy madaniyat</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="user-account-guides-section">
                      <h2 className="user-account-section-title">
                        {selectedCountry}da mavjud gidlar ({filteredGuides.length})
                      </h2>

                      {filteredGuides.length > 0 ? (
                        <div className="user-account-guides-grid">
                          {filteredGuides.map(guide => (
                            <div key={guide.id} className="user-account-guide-card">
                              <div className="user-account-guide-header">
                                <div className="user-account-guide-avatar-container">
                                  <img
                                    src={guide.image}
                                    alt={`${guide.name}ning rasmi`}
                                    className="user-account-guide-avatar"
                                  />
                                  <div className={`user-account-online-status ${guide.isOnline ? 'user-account-online' : 'user-account-offline'}`}></div>
                                </div>
                                <div className="user-account-guide-info">
                                  <h3 className="user-account-guide-name">{guide.name}</h3>
                                  <p className="user-account-guide-location">
                                    <FiMapPin size={14} /> {guide.destination}
                                  </p>
                                  <div className="user-account-guide-rating">
                                    <FiStar size={14} />
                                    <span>{guide.rating}</span>
                                    <span className="user-account-guide-experience">• {guide.experience}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="user-account-guide-details">
                                <div className="user-account-guide-languages">
                                  <span className="user-account-detail-label">Tillar:</span>
                                  <div className="user-account-language-tags">
                                    {guide.languages.map(lang => (
                                      <span key={lang} className="user-account-language-tag">{lang}</span>
                                    ))}
                                  </div>
                                </div>

                                <div className="user-account-guide-tours">
                                  <span className="user-account-detail-label">Tur turlari:</span>
                                  <div className="user-account-tour-tags">
                                    {guide.tourTypes.map(type => (
                                      <span key={type} className="user-account-tour-tag">{type}</span>
                                    ))}
                                  </div>
                                </div>

                                <div className="user-account-guide-pricing">
                                  <div className="user-account-price-item">
                                    <span>Soatlik:</span>
                                    <span>${guide.pricePerHour}</span>
                                  </div>
                                  <div className="user-account-price-item">
                                    <span>Kunlik:</span>
                                    <span>${guide.pricePerDay}</span>
                                  </div>
                                  <div className="user-account-price-item">
                                    <span>Haftalik:</span>
                                    <span>${guide.pricePerWeek}</span>
                                  </div>
                                  <div className="user-account-price-item">
                                    <span>Oylik:</span>
                                    <span>${guide.pricePerMonth}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="user-account-guide-actions">
                                <button
                                  className="user-account-btn user-account-btn-outline"
                                  onClick={() => {
                                    setActiveTab('guides');
                                    setIsChatOpen(true);
                                  }}
                                  aria-label={`${guide.name} bilan chat`}
                                >
                                  <FiUsers /> Chat
                                </button>
                                <select
                                  className="user-account-select user-account-booking-select"
                                  onChange={(e) => handleBookGuide(guide.id, e.target.value)}
                                  aria-label={`${guide.name}ni bron qilish`}
                                >
                                  <option value="">Bron qilish</option>
                                  <option value="hourly">Soatlik (${guide.pricePerHour})</option>
                                  <option value="daily">Kunlik (${guide.pricePerDay})</option>
                                  <option value="weekly">Haftalik (${guide.pricePerWeek})</option>
                                  <option value="monthly">Oylik (${guide.pricePerMonth})</option>
                                </select>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="user-account-empty-state">
                          <FiUsers size={48} />
                          <h3>Gidlar topilmadi</h3>
                          <p>Tanlangan filtrlar uchun gidlar mavjud emas.</p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Favorites Tab */}
          {activeTab === 'favorites' && (
            <div className="user-account-content">
              <div className="user-account-content-header">
                <h1 className="user-account-title">Sevimli Joylar</h1>
                <p className="user-account-subtitle">
                  {user?.role === 'Customer' ? 'Sizning afzal ko\'rgan gidlik joylaringiz' : 'Sizning saqlangan sayohat joylari'}
                </p>
              </div>

              {favorites.length > 0 ? (
                <div className="user-account-destinations-grid">
                  {favorites.map((destination, index) => (
                    <div key={index} className="user-account-destination-card">
                      <div
                        className="user-account-destination-image"
                        style={{ backgroundImage: `url(${destination.image})` }}
                      >
                        <div className="user-account-destination-overlay">
                          <button
                            className="user-account-explore-btn"
                            onClick={() => handleExploreDestination(destination.name)}
                            aria-label={`${destination.name}ni o'rganish`}
                          >
                            <FiArrowRight />
                          </button>
                        </div>
                        <div className="user-account-destination-badge">
                          <FiStar /> {destination.rating}
                        </div>
                      </div>
                      <div className="user-account-destination-content">
                        <h3 className="user-account-destination-title">{destination.name}</h3>
                        <p className="user-account-destination-price">{destination.price}</p>
                        <div className="user-account-destination-meta">
                          <FiUsers /> {destination.guides} gid
                        </div>
                        <div className="user-account-destination-highlights">
                          {destination.highlights.map((highlight, idx) => (
                            <span key={idx} className="user-account-highlight-tag">{highlight}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="user-account-empty-state">
                  <FiHeart size={48} />
                  <h3>Sevimli joylar yo'q</h3>
                  <p>{user?.role === 'Customer' ? 'Hali afzal ko\'rgan joylar yo\'q. Qo\'shing!' : 'Sevimli joylar yo\'q. Bosh sahifadan qo\'shing!'}</p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Chat Button and Widget */}
      {user?.role === 'Client' && (
        <>
          <button
            className="user-account-chat-btn"
            onClick={toggleChatWidget}
            aria-label={isChatOpen ? 'Chatni yopish' : 'Chatni ochish'}
          >
            <FiMessageCircle size={24} />
          </button>
          <div className={`user-account-chat-widget ${isChatOpen ? '' : 'user-account-chat-widget-hidden'}`}>
            <UserChatWidget
              user={user}
              guides={guides}
              chatMessages={chatMessages}
              setChatMessages={setChatMessages}
              onClose={toggleChatWidget}
            />
          </div>
        </>
      )}

      {/* Booking Summary Modal */}
      {showBookingSummary && (
        <div
          className="user-account-modal-overlay"
          onClick={() => setShowBookingSummary(null)}
          role="dialog"
          aria-labelledby="booking-summary-title"
          aria-modal="true"
        >
          <div className="user-account-booking-summary-modal" onClick={(e) => e.stopPropagation()}>
            <div className="user-account-modal-header">
              <h2 id="booking-summary-title" className="user-account-modal-title">Bron Qilish Xulosasi</h2>
              <button
                className="user-account-modal-close-btn"
                onClick={() => setShowBookingSummary(null)}
                aria-label="Modalni yopish"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="user-account-modal-content">
              <div className="user-account-booking-summary-details">
                <div className="user-account-summary-item">
                  <span className="user-account-summary-label">Gid:</span>
                  <span className="user-account-summary-value">
                    {guides.find(g => g.id === showBookingSummary.guideId)?.name}
                  </span>
                </div>
                <div className="user-account-summary-item">
                  <span className="user-account-summary-label">Yo'nalish:</span>
                  <span className="user-account-summary-value">
                    {guides.find(g => g.id === showBookingSummary.guideId)?.destination}
                  </span>
                </div>
                <div className="user-account-summary-item">
                  <span className="user-account-summary-label">Sana:</span>
                  <span className="user-account-summary-value">{bookingDate}</span>
                </div>
                <div className="user-account-summary-item">
                  <span className="user-account-summary-label">Davomiyligi:</span>
                  <span className="user-account-summary-value">{showBookingSummary.duration}</span>
                </div>
                <div className="user-account-summary-item">
                  <span className="user-account-summary-label">Sayohatchilar:</span>
                  <span className="user-account-summary-value">
                    {travelers.adults} Kattalar, {travelers.children} Bolalar
                  </span>
                </div>
                <div className="user-account-summary-item">
                  <span className="user-account-summary-label">Narx ({showBookingSummary.duration}):</span>
                  <span className="user-account-summary-value">${showBookingSummary.price}</span>
                </div>
                <div className="user-account-summary-item user-account-summary-total">
                  <span className="user-account-summary-label">Jami narx:</span>
                  <span className="user-account-summary-value">${showBookingSummary.totalPrice}</span>
                </div>
              </div>

              <div className="user-account-modal-actions">
                <button
                  className="user-account-btn user-account-btn-primary"
                  onClick={confirmBooking}
                  aria-label="Bronni tasdiqlash"
                >
                  <FiCheck /> Bronni tasdiqlash
                </button>
                <button
                  className="user-account-btn user-account-btn-outline"
                  onClick={() => setShowBookingSummary(null)}
                  aria-label="Bekor qilish"
                >
                  <FiX /> Bekor qilish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div
          className="user-account-modal-overlay"
          onClick={handleCloseSettings}
          role="dialog"
          aria-labelledby="settings-modal-title"
          aria-modal="true"
        >
          <div className="user-account-settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="user-account-modal-header">
              <h2 id="settings-modal-title" className="user-account-modal-title">Hisob Sozlamalari</h2>
              <button
                className="user-account-modal-close-btn"
                onClick={handleCloseSettings}
                aria-label="Sozlamalarni yopish"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="user-account-modal-content">
              {settingsError && (
                <div className="user-account-error-message">{settingsError}</div>
              )}

              <form className="user-account-settings-form" onSubmit={handleSettingsSubmit}>
                <div className="user-account-form-row">
                  <div className="user-account-form-group">
                    <label htmlFor="settings-firstName">
                      <FiUser /> Ism
                    </label>
                    <input
                      id="settings-firstName"
                      type="text"
                      name="firstName"
                      value={settingsForm.firstName}
                      onChange={handleSettingsChange}
                      placeholder="Ismingizni kiriting"
                      className="user-account-input"
                      aria-required="true"
                    />
                  </div>
                  <div className="user-account-form-group">
                    <label htmlFor="settings-lastName">
                      <FiUser /> Familiya
                    </label>
                    <input
                      id="settings-lastName"
                      type="text"
                      name="lastName"
                      value={settingsForm.lastName}
                      onChange={handleSettingsChange}
                      placeholder="Familiyangizni kiriting"
                      className="user-account-input"
                      aria-required="true"
                    />
                  </div>
                </div>

                <div className="user-account-form-group">
                  <label htmlFor="settings-email">
                    <FiMail /> Email
                  </label>
                  <input
                    id="settings-email"
                    type="email"
                    name="email"
                    value={settingsForm.email}
                    onChange={handleSettingsChange}
                    placeholder="Emailingizni kiriting"
                    className="user-account-input"
                    aria-required="true"
                  />
                </div>

                <div className="user-account-form-group">
                  <label htmlFor="settings-phone">
                    <FiPhone /> Telefon raqami
                  </label>
                  <input
                    id="settings-phone"
                    type="tel"
                    name="phone"
                    value={settingsForm.phone}
                    onChange={handleSettingsChange}
                    placeholder="Telefon raqamingizni kiriting"
                    className="user-account-input"
                  />
                </div>

                {user?.role === 'Customer' && (
                  <div className="user-account-form-row">
                    <div className="user-account-form-group">
                      <label htmlFor="settings-country">
                        <FiGlobe /> Mamlakat
                      </label>
                      <input
                        id="settings-country"
                        type="text"
                        name="country"
                        value={settingsForm.country}
                        onChange={handleSettingsChange}
                        placeholder="Mamlakatni kiriting"
                        className="user-account-input"
                        aria-required="true"
                      />
                    </div>
                    <div className="user-account-form-group">
                      <label htmlFor="settings-city">
                        <FiMapPin /> Shahar
                      </label>
                      <input
                        id="settings-city"
                        type="text"
                        name="city"
                        value={settingsForm.city}
                        onChange={handleSettingsChange}
                        placeholder="Shaharni kiriting"
                        className="user-account-input"
                        aria-required="true"
                      />
                    </div>
                  </div>
                )}

                <div className="user-account-form-group">
                  <label htmlFor="settings-profilePicture">
                    <FiUser /> Profil rasmi URL
                  </label>
                  <input
                    id="settings-profilePicture"
                    type="url"
                    name="profilePicture"
                    value={settingsForm.profilePicture}
                    onChange={handleSettingsChange}
                    placeholder="Profil rasmi URL kiriting"
                    className="user-account-input"
                  />
                </div>

                <div className="user-account-form-group">
                  <label htmlFor="settings-bio">
                    <FiEdit /> Bio
                  </label>
                  <textarea
                    id="settings-bio"
                    name="bio"
                    value={settingsForm.bio}
                    onChange={handleSettingsChange}
                    placeholder="O'zingiz haqingizda qisqacha..."
                    className="user-account-textarea"
                    rows="4"
                  />
                </div>

                <div className="user-account-modal-actions">
                  <button type="submit" className="user-account-btn user-account-btn-primary">
                    <FiCheck /> O'zgarishlarni saqlash
                  </button>
                  <button
                    type="button"
                    className="user-account-btn user-account-btn-outline"
                    onClick={handleCloseSettings}
                  >
                    <FiX /> Bekor qilish
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {isMobileMenuOpen && (
        <div
          className="user-account-mobile-overlay"
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}
    </div>
  );
};

export default UserAccount;