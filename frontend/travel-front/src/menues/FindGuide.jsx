import React, { useState, useEffect } from 'react';
import { FiSearch, FiFilter, FiStar, FiMapPin, FiUsers, FiMessageCircle } from 'react-icons/fi';
import './FindGuide.css';

const FindGuide = ({ user }) => {
  const [guides, setGuides] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    location: '',
    language: '',
    rating: 0,
  });
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Mock data (API'dan kelishi mumkin)
  useEffect(() => {
    // Bu yerda haqiqiy API chaqiruvi bo'ladi
    const mockGuides = [
      {
        id: 1,
        name: 'John Doe',
        location: 'Tashkent, Uzbekistan',
        languages: ['English', 'Uzbek', 'Russian'],
        rating: 4.8,
        tours: ['City Tour', 'Historical Sites'],
        price: 50,
        image: 'https://via.placeholder.com/150',
        isOnline: true,
      },
      {
        id: 2,
        name: 'Anna Smith',
        location: 'Samarkand, Uzbekistan',
        languages: ['English', 'Spanish'],
        rating: 4.5,
        tours: ['Cultural Tour', 'Silk Road'],
        price: 60,
        image: 'https://via.placeholder.com/150',
        isOnline: false,
      },
    ];
    setGuides(mockGuides);
  }, []);

  // Qidiruv va filtrlar bo'yicha yo'riqnomalarni filtrlash
  const filteredGuides = guides.filter(guide => {
    const matchesSearch = guide.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          guide.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLocation = filters.location ? guide.location.toLowerCase().includes(filters.location.toLowerCase()) : true;
    const matchesLanguage = filters.language ? guide.languages.some(lang => 
      lang.toLowerCase().includes(filters.language.toLowerCase())) : true;
    const matchesRating = filters.rating ? guide.rating >= filters.rating : true;

    return matchesSearch && matchesLocation && matchesLanguage && matchesRating;
  });

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const toggleFilter = () => {
    setIsFilterOpen(!isFilterOpen);
  };

  const handleBookGuide = (guideId) => {
    if (!user) {
      alert('Please sign in to book a guide.');
      return;
    }
    // Bu yerda yo'riqnoma band qilish logikasi bo'ladi
    console.log(`Booking guide with ID: ${guideId}`);
  };

  return (
    <div className="find-guide">
      <div className="find-guide-container">
        <header className="find-guide-header">
          <h1 className="find-guide-title">Find Your Perfect Guide</h1>
          <p className="find-guide-subtitle">Explore local experts to make your trip unforgettable</p>
        </header>

        <div className="find-guide-search-section">
          <div className="find-guide-search-bar">
            <FiSearch className="find-guide-search-icon" />
            <input
              type="text"
              placeholder="Search by name or location..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="find-guide-search-input"
            />
          </div>
          <button className="find-guide-filter-toggle" onClick={toggleFilter}>
            <FiFilter />
            <span>Filters</span>
          </button>
        </div>

        {isFilterOpen && (
          <div className="find-guide-filter-section">
            <div className="find-guide-filter-grid">
              <div className="find-guide-form-group">
                <label htmlFor="location">Location</label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  placeholder="Enter location"
                  value={filters.location}
                  onChange={handleFilterChange}
                  className="find-guide-input"
                />
              </div>
              <div className="find-guide-form-group">
                <label htmlFor="language">Language</label>
                <input
                  type="text"
                  id="language"
                  name="language"
                  placeholder="Enter language"
                  value={filters.language}
                  onChange={handleFilterChange}
                  className="find-guide-input"
                />
              </div>
              <div className="find-guide-form-group">
                <label htmlFor="rating">Minimum Rating</label>
                <select
                  id="rating"
                  name="rating"
                  value={filters.rating}
                  onChange={handleFilterChange}
                  className="find-guide-select"
                >
                  <option value={0}>All Ratings</option>
                  <option value={4}>4+ Stars</option>
                  <option value={4.5}>4.5+ Stars</option>
                  <option value={5}>5 Stars</option>
                </select>
              </div>
            </div>
          </div>
        )}

        <div className="find-guide-grid">
          {filteredGuides.length > 0 ? (
            filteredGuides.map(guide => (
              <div key={guide.id} className="find-guide-card">
                <div className="find-guide-card-header">
                  <div className="find-guide-avatar-container">
                    <img
                      src={guide.image}
                      alt={guide.name}
                      className="find-guide-avatar"
                    />
                    <span
                      className={`find-guide-online-status ${
                        guide.isOnline ? 'find-guide-online' : 'find-guide-offline'
                      }`}
                    ></span>
                  </div>
                  <div className="find-guide-info">
                    <h3 className="find-guide-name">{guide.name}</h3>
                    <p className="find-guide-location">
                      <FiMapPin /> {guide.location}
                    </p>
                    <div className="find-guide-rating">
                      <FiStar /> {guide.rating.toFixed(1)}
                    </div>
                  </div>
                </div>
                <div className="find-guide-details">
                  <div className="find-guide-languages">
                    <strong>Languages:</strong>
                    <div className="find-guide-language-tags">
                      {guide.languages.map((lang, index) => (
                        <span key={index} className="find-guide-language-tag">{lang}</span>
                      ))}
                    </div>
                  </div>
                  <div className="find-guide-tours">
                    <strong>Tours:</strong>
                    <div className="find-guide-tour-tags">
                      {guide.tours.map((tour, index) => (
                        <span key={index} className="find-guide-tour-tag">{tour}</span>
                      ))}
                    </div>
                  </div>
                  <div className="find-guide-price">
                    <strong>Price:</strong> ${guide.price}/hour
                  </div>
                </div>
                <div className="find-guide-actions">
                  <button
                    className="find-guide-btn find-guide-book-btn"
                    onClick={() => handleBookGuide(guide.id)}
                  >
                    Book Now
                  </button>
                  <button className="find-guide-btn find-guide-message-btn">
                    <FiMessageCircle /> Message
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="find-guide-empty-state">
              <FiUsers size={48} />
              <h3>No Guides Found</h3>
              <p>Try adjusting your search or filters to find more guides.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FindGuide;