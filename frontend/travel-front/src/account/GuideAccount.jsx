import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DateTime } from 'https://cdn.jsdelivr.net/npm/luxon@3.4.4/+esm';
import { FiUser, FiMail, FiLogOut, FiSettings, FiMapPin, FiX, FiCheck, FiCalendar, FiStar, FiDollarSign, FiImage, FiCheckCircle, FiXCircle, FiEdit, FiCamera, FiUsers, FiMessageSquare } from 'react-icons/fi';
import './GuideAccount.css';

// Mock timezone mapping based on city/country
const getTimezone = (city, country) => {
  const mappings = {
    'Tashkent_Uzbekistan': 'Asia/Tashkent',
    // Add more mappings as needed
  };
  return mappings[`${city}_${country}`] || 'UTC';
};

const GuideAccount = ({ user, setUser, setIsAuthenticated }) => {
  const navigate = useNavigate();
  const localTimezone = useMemo(() => getTimezone(user?.city || 'Tashkent', user?.country || 'Uzbekistan'), [user?.city, user?.country]);

  const [profileForm, setProfileForm] = useState({
    bio: user?.bio || 'Experienced guide with a passion for sharing local culture and history.',
    experience: user?.experience || '5 years guiding tours in Uzbekistan and Central Asia.',
    services: user?.services || ['Historical', 'Cultural'],
    pricePerHour: user?.pricePerHour || 20,
    pricePerDay: user?.pricePerDay || 100,
    workHours: user?.workHours || '9:00 AM - 5:00 PM, Monday to Saturday',
    portfolio: user?.portfolio || [
      'https://images.unsplash.com/photo-1602751584581-2e4f8243cc6d',
      'https://images.unsplash.com/photo-1549972890-1e9d1e0e9e38'
    ],
    verificationStatus: user?.verificationStatus || 'Verified',
    languages: user?.languages || [{ language: 'English', level: 'Advanced' }, { language: 'Uzbek', level: 'Native' }],
    certificates: user?.certificates || ['English_C1_Certificate.pdf']
  });

  const [availability, setAvailability] = useState(
    Array.from({ length: 7 }, (_, i) => {
      const date = DateTime.now().setZone(localTimezone).plus({ days: i });
      return {
        date: date.toISODate(),
        isBusy: false,
        isVacation: false,
        hours: Array.from({ length: 9 }, (_, h) => ({ time: `${9 + h}:00`, available: true }))
      };
    })
  );

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showHoursModal, setShowHoursModal] = useState(null);
  const [requestsTab, setRequestsTab] = useState('pending');
  const [counterOffer, setCounterOffer] = useState({ requestId: null, date: '', price: '' });
  const [showCounterOfferModal, setShowCounterOfferModal] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [selectedChatClient, setSelectedChatClient] = useState(null);
  const [showChatModal, setShowChatModal] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [contracts, setContracts] = useState(user?.contracts || []);
  const [error, setError] = useState('');

  // Mock requests derived from contracts
  const requests = useMemo(() =>
    contracts.map(contract => ({
      id: contract.id,
      clientName: `Client ${contract.id}`,
      clientId: `client_${contract.id}`,
      date: contract.date,
      duration: contract.duration,
      travelers: contract.travelers,
      price: contract.price,
      status: contract.status
    })), [contracts]);

  // Request notifications
  useEffect(() => {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
      return;
    }

    Notification.requestPermission().then(permission => {
      if (permission !== 'granted') {
        console.warn('Notification permission denied');
      }
    });

    const interval = setInterval(() => {
      const now = DateTime.now().setZone(localTimezone);
      requests.forEach(request => {
        if (['Confirmed', 'Started'].includes(request.status)) {
          const requestDateTime = DateTime.fromISO(request.date, { zone: localTimezone });
          const minutesUntil = requestDateTime.diff(now, 'minutes').minutes;

          if (minutesUntil <= 30 && minutesUntil > 29.5) {
            new Notification(`Reminder: Tour #${request.id} in 30 minutes`, {
              body: `Client: ${request.clientName}, Date: ${requestDateTime.toLocaleString(DateTime.DATETIME_MED)}`,
              icon: 'https://via.placeholder.com/32'
            });
          } else if (minutesUntil <= 0 && minutesUntil > -0.5) {
            new Notification(`Tour #${request.id} is starting now!`, {
              body: `Client: ${request.clientName}, Date: ${requestDateTime.toLocaleString(DateTime.DATETIME_MED)}`,
              icon: 'https://via.placeholder.com/32'
            });
          }
        }
      });
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [requests, localTimezone]);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    if (!value.trim()) {
      setError(`${name} cannot be empty`);
      return;
    }
    if (name === 'services') {
      setProfileForm({ ...profileForm, [name]: value.split(',').map(s => s.trim()).filter(s => s) });
    } else if (name === 'languages' || name === 'languageLevels') {
      const values = value.split(',').map(v => v.trim()).filter(v => v);
      if (name === 'languages') {
        const updatedLanguages = values.map((lang, i) => ({
          language: lang,
          level: profileForm.languages[i]?.level || 'Intermediate'
        }));
        setProfileForm({ ...profileForm, languages: updatedLanguages });
      } else {
        const updatedLanguages = profileForm.languages.map((lang, i) => ({
          language: lang.language,
          level: values[i] || lang.level
        }));
        setProfileForm({ ...profileForm, languages: updatedLanguages });
      }
    } else if (name === 'pricePerHour' || name === 'pricePerDay') {
      if (value < 0) {
        setError(`${name} cannot be negative`);
        return;
      }
      setProfileForm({ ...profileForm, [name]: parseFloat(value) || 0 });
    } else {
      setProfileForm({ ...profileForm, [name]: value });
    }
    setError('');
  };

  const handlePortfolioAdd = (e) => {
    const url = e.target.value;
    if (url && /^https?:\/\/[^\s]+$/.test(url)) {
      setProfileForm({ ...profileForm, portfolio: [...profileForm.portfolio, url] });
      e.target.value = '';
      setError('');
    } else {
      setError('Invalid URL');
    }
  };

  const handlePortfolioRemove = (index) => {
    setProfileForm({
      ...profileForm,
      portfolio: profileForm.portfolio.filter((_, i) => i !== index)
    });
  };

  const handleCertificateAdd = (e) => {
    const fileName = e.target.files[0]?.name;
    if (fileName) {
      setProfileForm({
        ...profileForm,
        certificates: [...profileForm.certificates, fileName]
      });
      alert(`Certificate ${fileName} uploaded (mock)`);
      setError('');
    } else {
      setError('No file selected');
    }
  };

  const handleCertificateRemove = (index) => {
    setProfileForm({
      ...profileForm,
      certificates: profileForm.certificates.filter((_, i) => i !== index)
    });
  };

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    if (!profileForm.bio || !profileForm.experience || !profileForm.services.length ||
        !profileForm.workHours || !profileForm.languages.length) {
      setError('All fields are required');
      return;
    }
    setUser({ ...user, ...profileForm, contracts });
    setShowProfileModal(false);
    alert('Profile updated successfully!');
    setError('');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
    navigate('/');
  };

  const toggleAvailability = (date) => {
    setAvailability(
      availability.map(day =>
        day.date === date
          ? { ...day, isBusy: !day.isBusy && !day.isVacation }
          : day
      )
    );
  };

  const toggleVacation = (date) => {
    setAvailability(
      availability.map(day =>
        day.date === date
          ? { ...day, isVacation: !day.isVacation, isBusy: !day.isVacation ? false : day.isBusy }
          : day
      )
    );
  };

  const setHourlySchedule = (date, updatedHours) => {
    setAvailability(
      availability.map(day =>
        day.date === date ? { ...day, hours: updatedHours } : day
      )
    );
  };

  const handleRequestAction = (requestId, action, counterOfferData = null) => {
    let updatedContracts = contracts;
    let clientId = requests.find(r => r.id === requestId)?.clientId;
    if (action === 'accept') {
      updatedContracts = contracts.map(c =>
        c.id === requestId ? { ...c, status: 'Confirmed' } : c
      );
      setChatMessages([
        ...chatMessages.filter(c => c.clientId !== clientId),
        {
          clientId,
          requestId,
          messages: [
            ...(chatMessages.find(c => c.clientId === clientId)?.messages || []),
            {
              sender: 'Guide',
              text: `Request #${requestId} accepted.`,
              timestamp: DateTime.now().setZone(localTimezone).toISO()
            }
          ]
        }
      ]);
      alert('Request accepted');
    } else if (action === 'reject') {
      updatedContracts = contracts.map(c =>
        c.id === requestId ? { ...c, status: 'Rejected' } : c
      );
      setChatMessages([
        ...chatMessages.filter(c => c.clientId !== clientId),
        {
          clientId,
          requestId,
          messages: [
            ...(chatMessages.find(c => c.clientId === clientId)?.messages || []),
            {
              sender: 'Guide',
              text: `Request #${requestId} rejected.`,
              timestamp: DateTime.now().setZone(localTimezone).toISO()
            }
          ]
        }
      ]);
      alert('Request rejected');
    } else if (action === 'counter-offer') {
      if (!counterOfferData.date || !counterOfferData.price || counterOfferData.price < 0) {
        setError('Invalid counter-offer date or price');
        return;
      }
      updatedContracts = contracts.map(c =>
        c.id === requestId
          ? { ...c, date: counterOfferData.date, price: parseFloat(counterOfferData.price) }
          : c
      );
      setChatMessages([
        ...chatMessages.filter(c => c.clientId !== clientId),
        {
          clientId,
          requestId,
          messages: [
            ...(chatMessages.find(c => c.clientId === clientId)?.messages || []),
            {
              sender: 'Guide',
              text: `Counter-offer for Request #${requestId}: ${DateTime.fromISO(counterOfferData.date, { zone: localTimezone }).toLocaleString(DateTime.DATETIME_MED)}, $${counterOfferData.price}`,
              timestamp: DateTime.now().setZone(localTimezone).toISO()
            }
          ]
        }
      ]);
      alert(`Counter-offer sent: ${DateTime.fromISO(counterOfferData.date, { zone: localTimezone }).toLocaleString(DateTime.DATETIME_MED)}, $${counterOfferData.price}`);
      setShowCounterOfferModal(false);
      setError('');
    }
    setContracts(updatedContracts);
    setUser({ ...user, contracts: updatedContracts });
  };

  const handleChatMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChatClient) {
      setError('Message cannot be empty');
      return;
    }
    const request = requests.find(r => r.clientId === selectedChatClient);
    setChatMessages([
      ...chatMessages.filter(c => c.clientId !== selectedChatClient),
      {
        clientId: selectedChatClient,
        requestId: request?.id,
        messages: [
          ...(chatMessages.find(c => c.clientId === selectedChatClient)?.messages || []),
          {
            sender: 'Guide',
            text: newMessage,
            timestamp: DateTime.now().setZone(localTimezone).toISO()
          }
        ]
      }
    ]);
    // Simulate client response
    setTimeout(() => {
      setChatMessages(prev => [
        ...prev.filter(c => c.clientId !== selectedChatClient),
        {
          clientId: selectedChatClient,
          requestId: request?.id,
          messages: [
            ...prev.find(c => c.clientId === selectedChatClient)?.messages || [],
            {
              sender: 'Client',
              text: `Received: ${newMessage}`,
              timestamp: DateTime.now().setZone(localTimezone).toISO()
            }
          ]
        }
      ]);
    }, 1000);
    setNewMessage('');
    setError('');
  };

  const openChatForClient = (clientId, clientName) => {
    setSelectedChatClient(clientId);
    setShowChatModal(true);
  };

  const financialStats = useMemo(() => ({
    totalTours: contracts.length,
    completedTours: contracts.filter(c => c.status === 'Completed').length,
    averageRating:
      contracts.reduce((sum, c) => sum + (c.clientRating || 0), 0) /
      (contracts.filter(c => c.clientRating).length || 1),
    uniqueClients: new Set(contracts.map(c => c.guideId)).size
  }), [contracts]);

  return (
    <div className="guide-account">
      <div className="homepage-container">
        {error && <p className="guide-error" role="alert">{error}</p>}
        {/* Profile and Calendar */}
        <div className="guide-account-flex">
          <section className="guide-account-section guide-profile">
            <h2 className="homepage-section-title">Your Professional Profile</h2>
            <p className="homepage-section-subtitle">Manage your guide information</p>
            <div className="guide-profile-card card-gradient">
              <img
                src={user?.profilePicture || 'https://randomuser.me/api/portraits/men/75.jpg'}
                alt="Profile"
                className="guide-profile-image"
              />
              <div className="guide-profile-details">
                <p><FiUser /> <strong>Name:</strong> {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : 'Not set'}</p>
                <p><FiMail /> <strong>Email:</strong> {user?.email || 'No email'}</p>
                <p><FiMapPin /> <strong>Location:</strong> {user?.city || 'Not set'}, {user?.country || 'Not set'} ({localTimezone})</p>
                <p><FiStar /> <strong>Bio:</strong> {profileForm.bio || 'Not set'}</p>
                <p><FiStar /> <strong>Experience:</strong> {profileForm.experience || 'Not set'}</p>
                <p><FiMapPin /> <strong>Services:</strong> {profileForm.services.length ? profileForm.services.join(', ') : 'None'}</p>
                <p><FiDollarSign /> <strong>Pricing:</strong> ${profileForm.pricePerHour}/hr, ${profileForm.pricePerDay}/day</p>
                <p><FiCalendar /> <strong>Work Hours:</strong> {profileForm.workHours || 'Not set'}</p>
                <p><FiCheckCircle /> <strong>Verification:</strong> {profileForm.verificationStatus || 'Not verified'}</p>
                <p><FiStar /> <strong>Languages:</strong> {profileForm.languages.length ? profileForm.languages.map(l => `${l.language} (${l.level})`).join(', ') : 'None'}</p>
                <p><FiCheckCircle /> <strong>Certificates:</strong> {profileForm.certificates.length ? profileForm.certificates.join(', ') : 'None'}</p>
                <div className="portfolio-gallery">
                  {profileForm.portfolio.map((img, index) => (
                    <div key={index} className="portfolio-item">
                      <img src={img} alt={`Portfolio ${index + 1}`} />
                      <button
                        className="portfolio-remove-btn"
                        onClick={() => handlePortfolioRemove(index)}
                        aria-label={`Remove portfolio image ${index + 1}`}
                      >
                        <FiX />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="guide-profile-actions">
                  <button
                    className="homepage-btn homepage-btn-primary"
                    onClick={() => setShowProfileModal(true)}
                    aria-label="Edit profile"
                  >
                    <FiSettings /> Edit Profile
                  </button>
                  <button
                    className="homepage-btn homepage-btn-outline"
                    onClick={() => setShowVerificationModal(true)}
                    aria-label="Manage verification"
                  >
                    <FiCheckCircle /> Verification
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

          <section className="guide-account-section guide-calendar">
            <h2 className="homepage-section-title">Availability Calendar</h2>
            <p className="homepage-section-subtitle">Manage your availability (Times in {localTimezone})</p>
            <div className="calendar-grid card-gradient">
              {availability.map(day => {
                const isBooked = requests.some(
                  r => r.date === day.date && ['Pending', 'Confirmed', 'Started'].includes(r.status)
                );
                const localDate = DateTime.fromISO(day.date, { zone: localTimezone });
                return (
                  <div
                    key={day.date}
                    className={`calendar-day ${day.isBusy || isBooked ? 'busy' : ''} ${day.isVacation ? 'vacation' : ''}`}
                  >
                    <p>{localDate.toLocaleString({ weekday: 'short', day: 'numeric', month: 'short' })}</p>
                    <button
                      className="homepage-btn homepage-btn-outline"
                      onClick={() => toggleAvailability(day.date)}
                      aria-label={`Toggle availability for ${day.date}`}
                      disabled={day.isVacation || isBooked}
                    >
                      {day.isBusy || isBooked ? 'Busy' : 'Free'}
                    </button>
                    <button
                      className="homepage-btn homepage-btn-outline"
                      onClick={() => toggleVacation(day.date)}
                      aria-label={`Toggle vacation for ${day.date}`}
                    >
                      {day.isVacation ? 'Cancel Vacation' : 'Set Vacation'}
                    </button>
                    <button
                      className="homepage-btn homepage-btn-primary"
                      onClick={() => setShowHoursModal(day.date)}
                      aria-label={`Edit hours for ${day.date}`}
                      disabled={day.isVacation || isBooked}
                    >
                      <FiEdit /> Hours
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Requests and Financials/Chat */}
        <div className="guide-account-flex">
          <section className="guide-account-section guide-requests">
            <h2 className="homepage-section-title">Request Management</h2>
            <p className="homepage-section-subtitle">Manage client tour requests (Times in {localTimezone})</p>
            <div className="requests-tabs">
              <button
                className={`homepage-btn ${requestsTab === 'pending' ? 'homepage-btn-primary' : 'homepage-btn-outline'}`}
                onClick={() => setRequestsTab('pending')}
                aria-label="View pending requests"
              >
                Pending
              </button>
              <button
                className={`homepage-btn ${requestsTab === 'history' ? 'homepage-btn-primary' : 'homepage-btn-outline'}`}
                onClick={() => setRequestsTab('history')}
                aria-label="View request history"
              >
                History
              </button>
            </div>
            <div className="homepage-destinations-grid">
              {requests
                .filter(r => (requestsTab === 'pending' ? r.status === 'Pending' : r.status !== 'Pending'))
                .map(request => {
                  const requestDateTime = DateTime.fromISO(request.date, { zone: localTimezone });
                  return (
                    <div key={request.id} className="homepage-destination-card card-gradient">
                      <div className="guide-request-content">
                        <h3>Request #{request.id}</h3>
                        <p><FiUser /> Client: {request.clientName}</p>
                        <p><FiCalendar /> Date: {requestDateTime.toLocaleString(DateTime.DATETIME_MED)}</p>
                        <p><FiCalendar /> Duration: {request.duration}</p>
                        <p><FiUsers /> Travelers: {request.travelers.adults} Adults, {request.travelers.children} Children</p>
                        <p><FiDollarSign /> Price: ${request.price}</p>
                        <p><FiCheck /> Status: {request.status}</p>
                        {request.status === 'Pending' && (
                          <div className="guide-actions">
                            <button
                              className="homepage-btn homepage-btn-primary"
                              onClick={() => handleRequestAction(request.id, 'accept')}
                              aria-label={`Accept request ${request.id}`}
                            >
                              <FiCheckCircle /> Accept
                            </button>
                            <button
                              className="homepage-btn cancel-btn"
                              onClick={() => handleRequestAction(request.id, 'reject')}
                              aria-label={`Reject request ${request.id}`}
                            >
                              <FiXCircle /> Reject
                            </button>
                            <button
                              className="homepage-btn homepage-btn-outline"
                              onClick={() => {
                                setCounterOffer({ requestId: request.id, date: request.date, price: request.price });
                                setShowCounterOfferModal(true);
                              }}
                              aria-label={`Counter-offer for request ${request.id}`}
                            >
                              <FiEdit /> Counter-Offer
                            </button>
                            <button
                              className="homepage-btn homepage-btn-outline"
                              onClick={() => openChatForClient(request.clientId, request.clientName)}
                              aria-label={`Chat with ${request.clientName}`}
                            >
                              <FiMessageSquare /> Chat
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              {requests.filter(r => (requestsTab === 'pending' ? r.status === 'Pending' : r.status !== 'Pending')).length === 0 && (
                <p className="guide-account-empty">No {requestsTab === 'pending' ? 'pending requests' : 'request history'}.</p>
              )}
            </div>
          </section>

          <section className="guide-account-section guide-financials">
            <h2 className="homepage-section-title">Financial Report</h2>
            <p className="homepage-section-subtitle">View your performance stats</p>
            <div className="guide-financials-card card-gradient">
              <p><FiCalendar /> <strong>Total Tours:</strong> {financialStats.totalTours}</p>
              <p><FiCheck /> <strong>Completed Tours:</strong> {financialStats.completedTours}</p>
              <p><FiStar /> <strong>Average Rating:</strong> {financialStats.averageRating.toFixed(1)}</p>
              <p><FiUsers /> <strong>Unique Clients:</strong> {financialStats.uniqueClients}</p>
            </div>
          </section>

          <section className="guide-account-section guide-chat">
            <h2 className="homepage-section-title">Client Chat</h2>
            <p className="homepage-section-subtitle">Communicate with clients</p>
            <div className="guide-chat-card card-gradient">
              <select
                className="auth-input"
                value={selectedChatClient || ''}
                onChange={(e) => setSelectedChatClient(e.target.value)}
                aria-label="Select client to chat with"
              >
                <option value="" disabled>Select a client</option>
                {requests.map(request => (
                  <option key={request.clientId} value={request.clientId}>
                    {request.clientName} (Request #{request.id})
                  </option>
                ))}
              </select>
              <div className="chat-messages">
                {chatMessages.find(c => c.clientId === selectedChatClient)?.messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`chat-bubble ${msg.sender === 'Guide' ? 'guide-message' : 'client-message'}`}
                  >
                    <div className="chat-sender">
                      <span className="chat-sender-initials">
                        {msg.sender === 'Guide' ? user?.firstName?.[0] || 'G' : 'C'}
                      </span>
                      <strong>{msg.sender}:</strong>
                    </div>
                    <p>{msg.text}</p>
                    <span>{DateTime.fromISO(msg.timestamp, { zone: localTimezone }).toLocaleString(DateTime.DATETIME_SHORT)}</span>
                  </div>
                )) || <p className="guide-account-empty">No messages yet.</p>}
              </div>
              {selectedChatClient && (
                <form className="chat-input-form" onSubmit={handleChatMessage}>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="auth-input chat-input"
                    aria-label="Type a message"
                  />
                  <button type="submit" className="auth-submit-btn" aria-label="Send message">
                    <FiCheck /> Send
                  </button>
                </form>
              )}
            </div>
          </section>
        </div>

        {/* Profile Edit Modal */}
        {showProfileModal && (
          <div
            className="homepage-learn-more-overlay"
            onClick={() => setShowProfileModal(false)}
            role="dialog"
            aria-labelledby="profile-modal-title"
            aria-modal="true"
          >
            <div className="homepage-learn-more-modal" onClick={(e) => e.stopPropagation()}>
              <button
                className="homepage-learn-more-close-btn"
                onClick={() => setShowProfileModal(false)}
                aria-label="Close profile modal"
              >
                <FiX />
              </button>
              <div className="homepage-learn-more-content">
                <h2 id="profile-modal-title">Edit Profile</h2>
                {error && <p className="guide-error" role="alert">{error}</p>}
                <form className="auth-form" onSubmit={handleProfileSubmit}>
                  <div className="auth-form-group">
                    <label htmlFor="bio"><FiStar /> Bio</label>
                    <textarea
                      id="bio"
                      name="bio"
                      value={profileForm.bio}
                      onChange={handleProfileChange}
                      placeholder="Enter your bio"
                      className="auth-input"
                      rows="4"
                      aria-required="true"
                    />
                  </div>
                  <div className="auth-form-group">
                    <label htmlFor="experience"><FiStar /> Experience</label>
                    <textarea
                      id="experience"
                      name="experience"
                      value={profileForm.experience}
                      onChange={handleProfileChange}
                      placeholder="Enter your experience"
                      className="auth-input"
                      rows="4"
                      aria-required="true"
                    />
                  </div>
                  <div className="auth-form-group">
                    <label htmlFor="services"><FiMapPin /> Services (comma-separated)</label>
                    <input
                      id="services"
                      type="text"
                      name="services"
                      value={profileForm.services.join(', ')}
                      onChange={handleProfileChange}
                      placeholder="e.g., Historical, Cultural, Food"
                      className="auth-input"
                      aria-required="true"
                    />
                  </div>
                  <div className="auth-name-grid">
                    <div className="auth-form-group">
                      <label htmlFor="pricePerHour"><FiDollarSign /> Price per Hour</label>
                      <input
                        id="pricePerHour"
                        type="number"
                        name="pricePerHour"
                        value={profileForm.pricePerHour}
                        onChange={handleProfileChange}
                        min="0"
                        step="0.01"
                        className="auth-input"
                        aria-required="true"
                      />
                    </div>
                    <div className="auth-form-group">
                      <label htmlFor="pricePerDay"><FiDollarSign /> Price per Day</label>
                      <input
                        id="pricePerDay"
                        type="number"
                        name="pricePerDay"
                        value={profileForm.pricePerDay}
                        onChange={handleProfileChange}
                        min="0"
                        step="0.01"
                        className="auth-input"
                        aria-required="true"
                      />
                    </div>
                  </div>
                  <div className="auth-form-group">
                    <label htmlFor="workHours"><FiCalendar /> Work Hours</label>
                    <input
                      id="workHours"
                      type="text"
                      name="workHours"
                      value={profileForm.workHours}
                      onChange={handleProfileChange}
                      placeholder="e.g., 9:00 AM - 5:00 PM, Monday to Saturday"
                      className="auth-input"
                      aria-required="true"
                    />
                  </div>
                  <div className="auth-form-group">
                    <label htmlFor="languages"><FiStar /> Languages (comma-separated)</label>
                    <input
                      id="languages"
                      type="text"
                      name="languages"
                      value={profileForm.languages.map(l => l.language).join(', ')}
                      onChange={handleProfileChange}
                      placeholder="e.g., English, Uzbek, Russian"
                      className="auth-input"
                      aria-required="true"
                    />
                  </div>
                  <div className="auth-form-group">
                    <label htmlFor="languageLevels"><FiStar /> Language Levels (comma-separated)</label>
                    <input
                      id="languageLevels"
                      type="text"
                      name="languageLevels"
                      value={profileForm.languages.map(l => l.level).join(', ')}
                      onChange={handleProfileChange}
                      placeholder="e.g., Advanced, Native, Intermediate"
                      className="auth-input"
                      aria-required="true"
                    />
                  </div>
                  <div className="auth-form-group">
                    <label htmlFor="portfolio"><FiImage /> Add Portfolio Image URL</label>
                    <input
                      id="portfolio"
                      type="url"
                      onBlur={handlePortfolioAdd}
                      placeholder="Enter image URL"
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

        {/* Hourly Schedule Modal */}
        {showHoursModal && (
          <div
            className="homepage-learn-more-overlay"
            onClick={() => setShowHoursModal(null)}
            role="dialog"
            aria-labelledby="hours-modal-title"
            aria-modal="true"
          >
            <div className="modal-hours" onClick={(e) => e.stopPropagation()}>
              <button
                className="homepage-learn-more-close-btn"
                onClick={() => setShowHoursModal(null)}
                aria-label="Close hours modal"
              >
                <FiX />
              </button>
              <div className="homepage-learn-more-content">
                <h2 id="hours-modal-title">Set Hours for {DateTime.fromISO(showHoursModal, { zone: localTimezone }).toLocaleString(DateTime.DATE_MED)}</h2>
                <div className="hours-grid">
                  {availability.find(day => day.date === showHoursModal)?.hours.map((hour, index) => (
                    <label key={index} className="hour-checkbox">
                      <input
                        type="checkbox"
                        checked={hour.available}
                        onChange={() => {
                          const day = availability.find(d => d.date === showHoursModal);
                          const updatedHours = [...day.hours];
                          updatedHours[index] = { ...hour, available: !hour.available };
                          setHourlySchedule(showHoursModal, updatedHours);
                        }}
                        aria-label={`Toggle availability for ${hour.time}`}
                      />
                      {hour.time}
                    </label>
                  ))}
                </div>
                <button
                  className="auth-submit-btn"
                  onClick={() => setShowHoursModal(null)}
                  aria-label="Save hours"
                >
                  <FiCheck /> Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Counter-Offer Modal */}
        {showCounterOfferModal && (
          <div
            className="homepage-learn-more-overlay"
            onClick={() => setShowCounterOfferModal(false)}
            role="dialog"
            aria-labelledby="counter-offer-modal-title"
            aria-modal="true"
          >
            <div className="modal-counter-offer" onClick={(e) => e.stopPropagation()}>
              <button
                className="homepage-learn-more-close-btn"
                onClick={() => setShowCounterOfferModal(false)}
                aria-label="Close counter-offer modal"
              >
                <FiX />
              </button>
              <div className="homepage-learn-more-content">
                <h2 id="counter-offer-modal-title">Send Counter-Offer</h2>
                {error && <p className="guide-error" role="alert">{error}</p>}
                <div className="auth-form-group">
                  <label htmlFor="counter-date"><FiCalendar /> New Date</label>
                  <input
                    id="counter-date"
                    type="date"
                    value={counterOffer.date}
                    onChange={(e) => setCounterOffer({ ...counterOffer, date: e.target.value })}
                    className="auth-input"
                    aria-required="true"
                    min={DateTime.now().setZone(localTimezone).toISODate()}
                  />
                </div>
                <div className="auth-form-group">
                  <label htmlFor="counter-price"><FiDollarSign /> New Price</label>
                  <input
                    id="counter-price"
                    type="number"
                    value={counterOffer.price}
                    onChange={(e) => setCounterOffer({ ...counterOffer, price: e.target.value })}
                    min="0"
                    step="0.01"
                    className="auth-input"
                    aria-required="true"
                  />
                </div>
                <button
                  className="auth-submit-btn"
                  onClick={() => handleRequestAction(counterOffer.requestId, 'counter-offer', counterOffer)}
                  aria-label="Send counter-offer"
                >
                  <FiCheck /> Send
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Verification Modal */}
        {showVerificationModal && (
          <div
            className="homepage-learn-more-overlay"
            onClick={() => setShowVerificationModal(false)}
            role="dialog"
            aria-labelledby="verification-modal-title"
            aria-modal="true"
          >
            <div className="modal-verification" onClick={(e) => e.stopPropagation()}>
              <button
                className="homepage-learn-more-close-btn"
                onClick={() => setShowVerificationModal(false)}
                aria-label="Close verification modal"
              >
                <FiX />
              </button>
              <div className="homepage-learn-more-content">
                <h2 id="verification-modal-title">Verification Documents</h2>
                <p>Current Status: <strong>{profileForm.verificationStatus}</strong></p>
                <div className="auth-form-group">
                  <label htmlFor="verification-file"><FiCamera /> Upload Verification Document</label>
                  <input
                    id="verification-file"
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={() => alert('Verification document uploaded (mock)')}
                    className="auth-input"
                  />
                </div>
                <div className="auth-form-group">
                  <label htmlFor="certificate-file"><FiCamera /> Upload Language Certificate</label>
                  <input
                    id="certificate-file"
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleCertificateAdd}
                    className="auth-input"
                  />
                </div>
                <div className="certificate-list">
                  {profileForm.certificates.map((cert, index) => (
                    <div key={index} className="certificate-item">
                      <p>{cert}</p>
                      <button
                        className="portfolio-remove-btn"
                        onClick={() => handleCertificateRemove(index)}
                        aria-label={`Remove certificate ${cert}`}
                      >
                        <FiX />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  className="auth-submit-btn"
                  onClick={() => {
                    setProfileForm({ ...profileForm, verificationStatus: 'Pending Review' });
                    setShowVerificationModal(false);
                    alert('Verification document submitted (mock)');
                  }}
                  aria-label="Submit verification"
                >
                  <FiCheck /> Submit
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Chat Modal */}
        {showChatModal && (
          <div
            className="homepage-learn-more-overlay"
            onClick={() => setShowChatModal(false)}
            role="dialog"
            aria-labelledby="chat-modal-title"
            aria-modal="true"
          >
            <div className="modal-chat" onClick={(e) => e.stopPropagation()}>
              <button
                className="homepage-learn-more-close-btn"
                onClick={() => setShowChatModal(false)}
                aria-label="Close chat modal"
              >
                <FiX />
              </button>
              <div className="homepage-learn-more-content">
                <h2 id="chat-modal-title">Chat with {requests.find(r => r.clientId === selectedChatClient)?.clientName} (Request #{requests.find(r => r.clientId === selectedChatClient)?.id})</h2>
                <div className="chat-messages">
                  {chatMessages.find(c => c.clientId === selectedChatClient)?.messages.map((msg, index) => (
                    <div
                      key={index}
                      className={`chat-bubble ${msg.sender === 'Guide' ? 'guide-message' : 'client-message'}`}
                    >
                      <div className="chat-sender">
                        <span className="chat-sender-initials">
                          {msg.sender === 'Guide' ? user?.firstName?.[0] || 'G' : 'C'}
                        </span>
                        <strong>{msg.sender}:</strong>
                      </div>
                      <p>{msg.text}</p>
                      <span>{DateTime.fromISO(msg.timestamp, { zone: localTimezone }).toLocaleString(DateTime.DATETIME_SHORT)}</span>
                    </div>
                  )) || <p className="guide-account-empty">No messages yet.</p>}
                </div>
                <form className="chat-input-form" onSubmit={handleChatMessage}>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="auth-input chat-input"
                    aria-label="Type a message"
                  />
                  <button type="submit" className="auth-submit-btn" aria-label="Send message">
                    <FiCheck /> Send
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

export default GuideAccount;