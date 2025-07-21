import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiUser, FiMail, FiLogOut, FiSettings, FiMapPin, FiX, FiArrowRight, FiCheck, FiUsers, FiCalendar, FiStar, FiGlobe, FiMessageSquare, FiFilter, FiDollarSign, FiTrash2 } from 'react-icons/fi';
import './UserAccount.css';

const UserAccount = ({ user, setUser, setIsAuthenticated }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSettingsOpen, setIsSettingsOpen] = useState(location.state?.openSettings || false);
  const [settingsForm, setSettingsForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    country: user?.country || '',
    city: user?.city || '',
    profilePicture: user?.profilePicture || 'https://randomuser.me/api/portraits/men/75.jpg'
  });
  const [settingsError, setSettingsError] = useState('');
  const [selectedDestination, setSelectedDestination] = useState('');
  const [filter, setFilter] = useState({ name: '', minRating: '', language: '', maxPrice: '', tourType: '' });
  const [chatGuideId, setChatGuideId] = useState(null);
  const [chatMessages, setChatMessages] = useState({});
  const [newMessage, setNewMessage] = useState('');
  const [contracts, setContracts] = useState(user?.contracts || []);
  const [bookingDate, setBookingDate] = useState('');
  const [travelers, setTravelers] = useState({ adults: 1, children: 0 });
  const [showBookingSummary, setShowBookingSummary] = useState(null);
  const [isFilterOpen, setIsFilterOpen] = useState(true);

  // Mock data for bookings
  const bookings = user?.bookings || [
    { id: 1, tourName: user?.role === 'Customer' ? 'Guided Historical Tour' : 'Historical Istanbul Tour', date: '2025-08-01', status: 'Confirmed', guideId: user?.role === 'Customer' ? user.id : 1, travelers: { adults: 2, children: 1 } },
    { id: 2, tourName: user?.role === 'Customer' ? 'Cultural City Walk' : 'Barcelona Cultural Experience', date: '2025-09-15', status: 'Pending', guideId: user?.role === 'Customer' ? user.id : 2, travelers: { adults: 1, children: 0 } }
  ];

  // Mock data for favorite destinations
  const popularDestinations = [
    { name: 'Istanbul, Turkey', country: 'Turkey', guides: 234, image: 'https://images.unsplash.com/photo-1602751584581-2e4f8243cc6d', rating: 4.8, price: 'From $25/day', highlights: ['Historical Tours', 'Local Cuisine', 'Shopping Guide'] },
    { name: 'Barcelona, Spain', country: 'Spain', guides: 189, image: 'https://images.unsplash.com/photo-1549972890-1e9d1e0e9e38', rating: 4.9, price: 'From $35/day', highlights: ['Architecture', 'Beach Tours', 'Art & Culture'] },
    { name: 'Tokyo, Japan', country: 'Japan', guides: 156, image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf', rating: 4.7, price: 'From $45/day', highlights: ['Modern Culture', 'Traditional Sites', 'Food Tours'] },
    { name: 'Paris, France', country: 'France', guides: 298, image: 'https://images.unsplash.com/photo-1502602898650-2c301a4391b1', rating: 4.8, price: 'From $40/day', highlights: ['Museums', 'Romance Tours', 'Fashion Districts'] }
  ];

  const favorites = user?.favorites
    ? popularDestinations.filter(dest => user.favorites.includes(dest.name))
    : [popularDestinations[0], popularDestinations[3]];

  // Mock data for guides
  const guides = [
    { id: 1, name: 'Ahmed Yusuf', destination: 'Istanbul, Turkey', country: 'Turkey', languages: ['English', 'Turkish', 'Arabic'], rating: 4.8, pricePerHour: 20, pricePerDay: 100, pricePerWeek: 600, pricePerMonth: 2000, tourTypes: ['Historical', 'Cultural'], image: 'https://randomuser.me/api/portraits/men/1.jpg' },
    { id: 2, name: 'Maria Lopez', destination: 'Barcelona, Spain', country: 'Spain', languages: ['English', 'Spanish', 'Catalan'], rating: 4.9, pricePerHour: 25, pricePerDay: 120, pricePerWeek: 700, pricePerMonth: 2500, tourTypes: ['Cultural', 'Architecture'], image: 'https://randomuser.me/api/portraits/women/2.jpg' },
    { id: 3, name: 'Hiro Tanaka', destination: 'Tokyo, Japan', country: 'Japan', languages: ['English', 'Japanese'], rating: 4.7, pricePerHour: 30, pricePerDay: 150, pricePerWeek: 900, pricePerMonth: 3000, tourTypes: ['Food', 'Modern Culture'], image: 'https://randomuser.me/api/portraits/men/3.jpg' },
    { id: 4, name: 'Sophie Martin', destination: 'Paris, France', country: 'France', languages: ['English', 'French'], rating: 4.8, pricePerHour: 22, pricePerDay: 110, pricePerWeek: 650, pricePerMonth: 2200, tourTypes: ['Historical', 'Romance'], image: 'https://randomuser.me/api/portraits/women/4.jpg' }
  ];

  const handleSettingsChange = (e) => {
    setSettingsForm({ ...settingsForm, [e.target.name]: e.target.value });
    setSettingsError('');
  };

  const handleSettingsSubmit = (e) => {
    e.preventDefault();
    const { firstName, lastName, email, country, city, profilePicture } = settingsForm;
    if (!firstName || !lastName || !email) {
      setSettingsError('Please fill in all required fields');
      return;
    }
    if (user?.role === 'Customer' && (!country || !city)) {
      setSettingsError('Please fill in country and city');
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
      contracts
    });
    setIsSettingsOpen(false);
    window.history.replaceState({}, '', '/account');
    alert('Profile updated successfully!');
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

  const handleOpenChat = (guideId) => {
    setChatGuideId(guideId);
    if (!chatMessages[guideId]) {
      setChatMessages({ ...chatMessages, [guideId]: [] });
    }
  };

  const handleCloseChat = () => {
    setChatGuideId(null);
    setNewMessage('');
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    setChatMessages({
      ...chatMessages,
      [chatGuideId]: [
        ...(chatMessages[chatGuideId] || []),
        { sender: user?.role === 'Customer' ? 'Guide' : 'Client', text: newMessage, timestamp: new Date().toISOString() }
      ]
    });
    setNewMessage('');
  };

  const handleBookGuide = (guideId, duration) => {
    if (!bookingDate) {
      alert('Please select a booking date');
      return;
    }
    if (travelers.adults === 0 && travelers.children === 0) {
      alert('Please select at least one traveler');
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
      tourName: `Tour with ${guide.name} in ${guide.destination}`,
      date: bookingDate,
      status: 'Pending',
      guideId,
      travelers
    };
    setContracts([...contracts, newContract]);
    setUser({ ...user, contracts: [...contracts, newContract], bookings: [...(user?.bookings || []), newBooking] });
    setBookingDate('');
    setTravelers({ adults: 1, children: 0 });
    setShowBookingSummary(null);
    alert(`Booked ${guide.name} for ${duration} on ${bookingDate} for ${travelers.adults + travelers.children} travelers at $${totalPrice}`);
  };

  const handleCancelBooking = (bookingId) => {
    if (window.confirm('Are you sure you want to cancel this booking?')) {
      const updatedContracts = contracts.filter(c => c.id !== bookingId);
      const updatedBookings = bookings.filter(b => b.id !== bookingId);
      setContracts(updatedContracts);
      setUser({ ...user, contracts: updatedContracts, bookings: updatedBookings });
      alert('Booking cancelled successfully');
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
    alert(`Tour status updated to ${newStatus}`);
  };

  const handleReviewSubmit = (contractId, rating, comment) => {
    const updatedContracts = contracts.map(contract =>
      contract.id === contractId ? { ...contract, clientRating: rating, clientComment: comment } : contract
    );
    setContracts(updatedContracts);
    setUser({ ...user, contracts: updatedContracts });
    alert('Review submitted successfully!');
  };

  return (
    <div className="user-account">
      <div className="homepage-container">
        {/* Profile and Destination Selection */}
        <div className="user-account-flex">
          <section className="user-account-section user-account-profile">
            <h2 className="homepage-section-title">
              Welcome, {user?.firstName ? `${user.firstName} ${user.lastName}` : user?.username || 'User'}
            </h2>
            <div className="user-account-profile-card card-gradient">
              <img
                src={user?.profilePicture || 'https://randomuser.me/api/portraits/men/75.jpg'}
                alt="Profile"
                className="user-account-profile-image"
              />
              <div className="user-account-profile-details">
                <p><FiUser /> <strong>Role:</strong> {user?.role || 'Client'}</p>
                <p><FiUser /> <strong>Name:</strong> {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : 'Not set'}</p>
                <p><FiMail /> <strong>Email:</strong> {user?.email || 'No email'}</p>
                {user?.role === 'Customer' && (
                  <>
                    <p><FiGlobe /> <strong>Country:</strong> {user?.country || 'Not set'}</p>
                    <p><FiMapPin /> <strong>City:</strong> {user?.city || 'Not set'}</p>
                  </>
                )}
                <p><FiCalendar /> <strong>Joined:</strong> {user?.joinedDate || 'July 2025'}</p>
                <div className="user-account-profile-actions">
                  <button
                    className="homepage-btn homepage-btn-primary"
                    onClick={handleOpenSettings}
                    aria-label="Edit profile settings"
                  >
                    <FiSettings /> Edit Profile
                  </button>
                  <button
                    className="homepage-btn homepage-btn-outline"
                    onClick={handleLogout}
                    aria-label="Log out"
                  >
                    <FiLogOut /> Log Out
                  </button>
                </div>
              </div>
            </div>
          </section>

          {user?.role === 'Client' && (
            <section className="user-account-section user-account-destination">
              <h2 className="homepage-section-title">Select Your Destination</h2>
              <p className="homepage-section-subtitle">Choose a place to find guides</p>
              <div className="auth-form-group">
                <label htmlFor="destination-select">
                  <FiGlobe /> Destination
                </label>
                <select
                  id="destination-select"
                  value={selectedDestination}
                  onChange={handleDestinationChange}
                  className="auth-input"
                  aria-label="Select a destination"
                >
                  <option value="">Select a destination</option>
                  {popularDestinations.map(dest => (
                    <option key={dest.name} value={dest.name}>{dest.name}</option>
                  ))}
                </select>
              </div>
            </section>
          )}
        </div>

        {/* Guide Selection and Bookings */}
        <div className="user-account-flex">
          {user?.role === 'Client' && selectedDestination && (
            <section className="user-account-section user-account-guides">
              <h2 className="homepage-section-title">Available Guides in {selectedCountry}</h2>
              <p className="homepage-section-subtitle">Filter and select your guide</p>
              <button
                className="guide-filter-toggle homepage-btn homepage-btn-outline"
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                aria-label={isFilterOpen ? 'Hide filters' : 'Show filters'}
              >
                <FiFilter /> {isFilterOpen ? 'Hide Filters' : 'Show Filters'}
              </button>
              {isFilterOpen && (
                <div className="guide-filter">
                  <div className="auth-form-group">
                    <label htmlFor="filter-name"><FiUser /> Name</label>
                    <input
                      id="filter-name"
                      type="text"
                      name="name"
                      value={filter.name}
                      onChange={handleFilterChange}
                      placeholder="Search by name"
                      className="auth-input"
                    />
                  </div>
                  <div className="auth-form-group">
                    <label htmlFor="filter-minRating"><FiStar /> Min Rating</label>
                    <input
                      id="filter-minRating"
                      type="number"
                      name="minRating"
                      value={filter.minRating}
                      onChange={handleFilterChange}
                      placeholder="e.g., 4.5"
                      min="0"
                      max="5"
                      step="0.1"
                      className="auth-input"
                    />
                  </div>
                  <div className="auth-form-group">
                    <label htmlFor="filter-language"><FiGlobe /> Language</label>
                    <select
                      id="filter-language"
                      name="language"
                      value={filter.language}
                      onChange={handleFilterChange}
                      className="auth-input"
                    >
                      <option value="">Any</option>
                      <option value="English">English</option>
                      <option value="Turkish">Turkish</option>
                      <option value="Spanish">Spanish</option>
                      <option value="Japanese">Japanese</option>
                      <option value="French">French</option>
                      <option value="Arabic">Arabic</option>
                      <option value="Catalan">Catalan</option>
                    </select>
                  </div>
                  <div className="auth-form-group">
                    <label htmlFor="filter-maxPrice"><FiDollarSign /> Max Price/Day</label>
                    <input
                      id="filter-maxPrice"
                      type="number"
                      name="maxPrice"
                      value={filter.maxPrice}
                      onChange={handleFilterChange}
                      placeholder="e.g., 150"
                      min="0"
                      className="auth-input"
                    />
                  </div>
                  <div className="auth-form-group">
                    <label htmlFor="filter-tourType"><FiMapPin /> Tour Type</label>
                    <select
                      id="filter-tourType"
                      name="tourType"
                      value={filter.tourType}
                      onChange={handleFilterChange}
                      className="auth-input"
                    >
                      <option value="">Any</option>
                      <option value="Historical">Historical</option>
                      <option value="Cultural">Cultural</option>
                      <option value="Food">Food</option>
                      <option value="Architecture">Architecture</option>
                      <option value="Romance">Romance</option>
                      <option value="Modern Culture">Modern Culture</option>
                    </select>
                  </div>
                </div>
              )}
              <div className="auth-form-group">
                <label htmlFor="booking-date"><FiCalendar /> Booking Date</label>
                <input
                  id="booking-date"
                  type="date"
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="auth-input"
                  aria-label="Select booking date"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="auth-form-group">
                <label><FiUsers /> Travelers</label>
                <div className="auth-name-grid">
                  <div>
                    <label htmlFor="travelers-adults">Adults</label>
                    <input
                      id="travelers-adults"
                      type="number"
                      name="adults"
                      value={travelers.adults}
                      onChange={handleTravelersChange}
                      min="0"
                      className="auth-input"
                      aria-label="Number of adult travelers"
                    />
                  </div>
                  <div>
                    <label htmlFor="travelers-children">Children</label>
                    <input
                      id="travelers-children"
                      type="number"
                      name="children"
                      value={travelers.children}
                      onChange={handleTravelersChange}
                      min="0"
                      className="auth-input"
                      aria-label="Number of child travelers"
                    />
                  </div>
                </div>
              </div>
              <div className="homepage-destinations-grid">
                {filteredGuides.length > 0 ? (
                  filteredGuides.map(guide => (
                    <div key={guide.id} className="homepage-destination-card card-gradient">
                      <div className="homepage-destination-image" style={{ backgroundImage: `url(${guide.image})` }}>
                        <div className="homepage-destination-badge">
                          <FiStar /> {guide.rating}
                        </div>
                      </div>
                      <div className="homepage-destination-content">
                        <h3>{guide.name}</h3>
                        <p><FiMapPin /> {guide.destination}</p>
                        <p><FiStar /> Rating: {guide.rating}</p>
                        <p><FiGlobe /> Languages: {guide.languages.join(', ')}</p>
                        <p><FiUsers /> Tour Types: {guide.tourTypes.join(', ')}</p>
                        <p><FiDollarSign /> Prices: ${guide.pricePerHour}/hr, ${guide.pricePerDay}/day, ${guide.pricePerWeek}/week, ${guide.pricePerMonth}/month</p>
                        <div className="guide-actions">
                          <button
                            className="homepage-btn homepage-btn-primary"
                            onClick={() => handleOpenChat(guide.id)}
                            aria-label={`Chat with ${guide.name}`}
                          >
                            <FiMessageSquare /> Chat
                          </button>
                          <select
                            className="auth-input"
                            onChange={(e) => handleBookGuide(guide.id, e.target.value)}
                            aria-label={`Book ${guide.name}`}
                          >
                            <option value="">Book Guide</option>
                            <option value="hourly">Hourly (${guide.pricePerHour})</option>
                            <option value="daily">Daily (${guide.pricePerDay})</option>
                            <option value="weekly">Weekly (${guide.pricePerWeek})</option>
                            <option value="monthly">Monthly (${guide.pricePerMonth})</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="user-account-empty">No guides found for the selected filters.</p>
                )}
              </div>
            </section>
          )}

          <section className="user-account-section user-account-bookings">
            <h2 className="homepage-section-title">{user?.role === 'Customer' ? 'Your Guided Tours' : 'Your Bookings'}</h2>
            <p className="homepage-section-subtitle">
              {user?.role === 'Customer' ? 'Manage your guided tours' : 'View your past and upcoming trips'}
            </p>
            {bookings.length > 0 ? (
              <div className="homepage-destinations-grid">
                {bookings.map((booking) => {
                  const contract = contracts.find(c => c.id === booking.id);
                  return (
                    <div key={booking.id} className="homepage-destination-card card-gradient">
                      <div className="user-account-booking-content">
                        <h3>{booking.tourName}</h3>
                        <p><FiCalendar /> Date: {contract?.date || booking.date}</p>
                        {contract && (
                          <>
                            <p><FiCalendar /> Duration: <span className="booking-badge">{contract.duration}</span></p>
                            <p><FiUsers /> Travelers: {booking.travelers.adults} Adults, {booking.travelers.children} Children</p>
                          </>
                        )}
                        <div className="user-account-booking-status">
                          <FiCheck /> {booking.status}
                        </div>
                        {user?.role === 'Client' && booking.status === 'Pending' && (
                          <button
                            className="homepage-btn cancel-btn"
                            onClick={() => handleCancelBooking(booking.id)}
                            aria-label={`Cancel ${booking.tourName}`}
                          >
                            <FiTrash2 /> Cancel Booking
                          </button>
                        )}
                        {user?.role === 'Customer' && booking.status !== 'Completed' && (
                          <div className="guide-actions">
                            {booking.status === 'Pending' ? (
                              <button
                                className="homepage-btn homepage-btn-primary"
                                onClick={() => handleUpdateTourStatus(booking.id, 'Confirmed')}
                                aria-label={`Confirm ${booking.tourName}`}
                              >
                                <FiCheck /> Confirm
                              </button>
                            ) : booking.status === 'Confirmed' ? (
                              <button
                                className="homepage-btn homepage-btn-primary"
                                onClick={() => handleUpdateTourStatus(booking.id, 'Started')}
                                aria-label={`Mark ${booking.tourName} as Started`}
                              >
                                <FiCheck /> Mark as Started
                              </button>
                            ) : booking.status === 'Started' ? (
                              <button
                                className="homepage-btn homepage-btn-primary"
                                onClick={() => handleUpdateTourStatus(booking.id, 'Completed')}
                                aria-label={`Mark ${booking.tourName} as Completed`}
                              >
                                <FiCheck /> Mark as Completed
                              </button>
                            ) : null}
                          </div>
                        )}
                        {user?.role === 'Client' && booking.status === 'Completed' && !contract?.clientRating && (
                          <div className="auth-form-group">
                            <label>Rate Guide</label>
                            <select
                              className="auth-input"
                              onChange={(e) => handleReviewSubmit(booking.id, parseFloat(e.target.value), '')}
                              aria-label={`Rate guide for ${booking.tourName}`}
                            >
                              <option value="">Select rating</option>
                              {[1, 2, 3, 4, 5].map(r => (
                                <option key={r} value={r}>{r} Stars</option>
                              ))}
                            </select>
                            <input
                              type="text"
                              placeholder="Add a comment"
                              className="auth-input"
                              onBlur={(e) => {
                                const rating = contracts.find(c => c.id === booking.id)?.clientRating;
                                if (rating) handleReviewSubmit(booking.id, rating, e.target.value);
                              }}
                              aria-label={`Comment for ${booking.tourName}`}
                            />
                          </div>
                        )}
                        {contract?.clientRating && (
                          <div>
                            <p><FiStar /> Rating: {contract.clientRating}</p>
                            <p>Comment: {contract.clientComment || 'None'}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="user-account-empty">
                {user?.role === 'Customer' ? 'No guided tours yet. Add some!' : 'No bookings yet. Start exploring!'}
              </p>
            )}
          </section>
        </div>

        {/* Favorite Destinations Section */}
        <section className="user-account-section user-account-favorites">
          <h2 className="homepage-section-title">Favorite Destinations</h2>
          <p className="homepage-section-subtitle">
            {user?.role === 'Customer' ? 'Your preferred guiding locations' : 'Your saved places to explore'}
          </p>
          {favorites.length > 0 ? (
            <div className="homepage-destinations-grid">
              {favorites.map((destination, index) => (
                <div key={index} className="homepage-destination-card card-gradient">
                  <div className="homepage-destination-image" style={{ backgroundImage: `url(${destination.image})` }}>
                    <div className="homepage-destination-overlay">
                      <button
                        className="homepage-explore-btn"
                        onClick={() => handleExploreDestination(destination.name)}
                        aria-label={`Explore ${destination.name}`}
                      >
                        <FiArrowRight />
                      </button>
                    </div>
                    <div className="homepage-destination-badge">
                      <FiStar /> {destination.rating}
                    </div>
                  </div>
                  <div className="homepage-destination-content">
                    <h3>{destination.name}</h3>
                    <p>{destination.price}</p>
                    <div className="homepage-destination-meta">
                      <FiUsers /> {destination.guides} guides
                    </div>
                    <div className="homepage-destination-highlights">
                      {destination.highlights.map((highlight, idx) => (
                        <span key={idx} className="homepage-highlight-tag">{highlight}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="user-account-empty">
              {user?.role === 'Customer' ? 'No preferred locations yet. Add some!' : 'No favorite destinations yet. Add some from the homepage!'}
            </p>
          )}
        </section>

        {/* Chat Modal (Client Only) */}
        {user?.role === 'Client' && chatGuideId && (
          <div
            className="homepage-learn-more-overlay"
            onClick={handleCloseChat}
            role="dialog"
            aria-labelledby="chat-modal-title"
            aria-modal="true"
          >
            <div className="homepage-learn-more-modal" onClick={(e) => e.stopPropagation()}>
              <button
                className="homepage-learn-more-close-btn"
                onClick={handleCloseChat}
                aria-label="Close chat modal"
              >
                <FiX />
              </button>
              <div className="homepage-learn-more-content">
                <h2 id="chat-modal-title">Chat with {guides.find(g => g.id === chatGuideId)?.name}</h2>
                <div className="chat-messages">
                  {(chatMessages[chatGuideId] || []).map((msg, index) => (
                    <div key={index} className={`chat-bubble chat-bubble-${msg.sender.toLowerCase()}`}>
                      <p><strong>{msg.sender}:</strong> {msg.text}</p>
                      <small>{new Date(msg.timestamp).toLocaleString()}</small>
                    </div>
                  ))}
                </div>
                <div className="auth-form-group">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="auth-input"
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    aria-label="Type a message"
                  />
                  <button
                    className="auth-submit-btn"
                    onClick={handleSendMessage}
                    aria-label="Send message"
                  >
                    <FiArrowRight /> Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Booking Summary Modal */}
        {showBookingSummary && (
          <div
            className="homepage-learn-more-overlay"
            onClick={() => setShowBookingSummary(null)}
            role="dialog"
            aria-labelledby="booking-summary-title"
            aria-modal="true"
          >
            <div className="booking-summary-modal" onClick={(e) => e.stopPropagation()}>
              <button
                className="homepage-learn-more-close-btn"
                onClick={() => setShowBookingSummary(null)}
                aria-label="Close booking summary"
              >
                <FiX />
              </button>
              <div className="homepage-learn-more-content">
                <h2 id="booking-summary-title">Booking Summary</h2>
                <div className="booking-summary-details">
                  <p><strong>Guide:</strong> {guides.find(g => g.id === showBookingSummary.guideId)?.name}</p>
                  <p><strong>Destination:</strong> {guides.find(g => g.id === showBookingSummary.guideId)?.destination}</p>
                  <p><FiCalendar /> <strong>Date:</strong> {bookingDate}</p>
                  <p><FiCalendar /> <strong>Duration:</strong> {showBookingSummary.duration}</p>
                  <p><FiUsers /> <strong>Travelers:</strong> {travelers.adults} Adults, {travelers.children} Children</p>
                  <p><FiDollarSign /> <strong>Price per {showBookingSummary.duration}:</strong> ${showBookingSummary.price}</p>
                  <p><FiDollarSign /> <strong>Total Price:</strong> ${showBookingSummary.totalPrice}</p>
                </div>
                <div className="guide-actions">
                  <button
                    className="homepage-btn homepage-btn-primary"
                    onClick={confirmBooking}
                    aria-label="Confirm booking"
                  >
                    <FiCheck /> Confirm Booking
                  </button>
                  <button
                    className="homepage-btn homepage-btn-outline"
                    onClick={() => setShowBookingSummary(null)}
                    aria-label="Cancel booking"
                  >
                    <FiX /> Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Settings Modal */}
        {isSettingsOpen && (
          <div
            className="homepage-learn-more-overlay"
            onClick={handleCloseSettings}
            role="dialog"
            aria-labelledby="settings-modal-title"
            aria-modal="true"
          >
            <div className="homepage-learn-more-modal" onClick={(e) => e.stopPropagation()}>
              <button
                className="homepage-learn-more-close-btn"
                onClick={handleCloseSettings}
                aria-label="Close settings modal"
              >
                <FiX />
              </button>
              <div className="homepage-learn-more-content">
                <h2 id="settings-modal-title">Account Settings</h2>
                {settingsError && <p className="auth-error">{settingsError}</p>}
                <form className="auth-form" onSubmit={handleSettingsSubmit}>
                  <div className="auth-name-grid">
                    <div className="auth-form-group">
                      <label htmlFor="settings-firstName">
                        <FiUser /> First Name
                      </label>
                      <input
                        id="settings-firstName"
                        type="text"
                        name="firstName"
                        value={settingsForm.firstName}
                        onChange={handleSettingsChange}
                        placeholder="Enter your first name"
                        className="auth-input"
                        aria-required="true"
                      />
                    </div>
                    <div className="auth-form-group">
                      <label htmlFor="settings-lastName">
                        <FiUser /> Last Name
                      </label>
                      <input
                        id="settings-lastName"
                        type="text"
                        name="lastName"
                        value={settingsForm.lastName}
                        onChange={handleSettingsChange}
                        placeholder="Enter your last name"
                        className="auth-input"
                        aria-required="true"
                      />
                    </div>
                  </div>
                  <div className="auth-form-group">
                    <label htmlFor="settings-email">
                      <FiMail /> Email
                    </label>
                    <input
                      id="settings-email"
                      type="email"
                      name="email"
                      value={settingsForm.email}
                      onChange={handleSettingsChange}
                      placeholder="Enter your email"
                      className="auth-input"
                      aria-required="true"
                    />
                  </div>
                  {user?.role === 'Customer' && (
                    <div className="auth-location-grid">
                      <div className="auth-form-group">
                        <label htmlFor="settings-country">
                          <FiGlobe /> Country
                        </label>
                        <input
                          id="settings-country"
                          type="text"
                          name="country"
                          value={settingsForm.country}
                          onChange={handleSettingsChange}
                          placeholder="Enter your country"
                          className="auth-input"
                          aria-required="true"
                        />
                      </div>
                      <div className="auth-form-group">
                        <label htmlFor="settings-city">
                          <FiMapPin /> City
                        </label>
                        <input
                          id="settings-city"
                          type="text"
                          name="city"
                          value={settingsForm.city}
                          onChange={handleSettingsChange}
                          placeholder="Enter your city"
                          className="auth-input"
                          aria-required="true"
                        />
                      </div>
                    </div>
                  )}
                  <div className="auth-form-group">
                    <label htmlFor="settings-profilePicture">
                      <FiUser /> Profile Picture URL
                    </label>
                    <input
                      id="settings-profilePicture"
                      type="url"
                      name="profilePicture"
                      value={settingsForm.profilePicture}
                      onChange={handleSettingsChange}
                      placeholder="Enter profile picture URL"
                      className="auth-input"
                    />
                  </div>
                  <button type="submit" className="auth-submit-btn">
                    <FiCheck /> Save Changes
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserAccount;