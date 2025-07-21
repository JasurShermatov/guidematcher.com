import React, { useState, useEffect } from 'react';
import { FiSearch, FiX, FiStar, FiGlobe, FiMessageSquare, FiFilter } from 'react-icons/fi';
import './FindGuide.css';

const FindGuide = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGuide, setSelectedGuide] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState({
    country: '',
    city: '',
    services: [],
    priceMin: '',
    priceMax: '',
    minRating: '',
    languages: [],
    onlineOnly: false,
    verifiedOnly: false,
  });
  const [isAuthenticated] = useState(false); // Mock: Assume user is not authenticated
  const [isFilterOpen, setIsFilterOpen] = useState(false); // For mobile filter toggle

  const guides = [
    {
      id: 1,
      name: 'John Doe',
      country: 'Uzbekistan',
      location: 'Tashkent, Uzbekistan',
      description: 'Explore the ancient Silk Road with a local expert.',
      image: 'placeholder',
      bio: 'John is a seasoned guide with 10 years of experience leading tours across Uzbekistan’s historic sites.',
      languages: ['English', 'Russian', 'Uzbek'],
      services: ['City Tours', 'Historical Sites', 'Cultural Experiences'],
      pricePerHour: 30,
      rating: 4.8,
      isOnline: true,
      isVerified: true,
      contact: { email: 'john.doe@travmatch.com', phone: '+998 90 123 4567' },
      reviews: [
        { rating: 5, comment: 'Amazing guide! Very knowledgeable.', user: 'Alice' },
        { rating: 4, comment: 'Great experience, highly recommend.', user: 'Bob' },
      ],
    },
    {
      id: 2,
      name: 'Aisha Khan',
      country: 'Uzbekistan',
      location: 'Samarkand, Uzbekistan',
      description: 'Discover the historic Registan with a knowledgeable guide.',
      image: 'placeholder',
      bio: 'Aisha specializes in Samarkand’s rich history and architecture, offering personalized tours.',
      languages: ['English', 'Russian', 'Persian'],
      services: ['Registan Tours', 'Cultural Workshops', 'Food Tours'],
      pricePerHour: 25,
      rating: 4.9,
      isOnline: false,
      isVerified: true,
      contact: { email: 'aisha.khan@travmatch.com', phone: '+998 91 234 5678' },
      reviews: [{ rating: 5, comment: 'Aisha made our trip unforgettable!', user: 'Clara' }],
    },
    {
      id: 3,
      name: 'Maria Lopez',
      country: 'Uzbekistan',
      location: 'Bukhara, Uzbekistan',
      description: 'Uncover hidden gems in Bukhara’s old town.',
      image: 'placeholder',
      bio: 'Maria is passionate about Bukhara’s medieval heritage and local traditions.',
      languages: ['English', 'Spanish', 'Uzbek'],
      services: ['Old Town Tours', 'Craft Workshops', 'Night Tours'],
      pricePerHour: 20,
      rating: 4.7,
      isOnline: true,
      isVerified: false,
      contact: { email: 'maria.lopez@travmatch.com', phone: '+998 92 345 6789' },
      reviews: [
        { rating: 4, comment: 'Wonderful insights into Bukhara.', user: 'David' },
        { rating: 5, comment: 'Maria is fantastic!', user: 'Emma' },
      ],
    },
  ];

  const handleSearch = (e) => {
    e.preventDefault();
    console.log('Searching with query:', searchQuery, 'Filters:', filters);
    // Add API call or filtering logic here
  };

  const handleFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      if (name === 'services' || name === 'languages') {
        setFilters((prev) => ({
          ...prev,
          [name]: checked
            ? [...prev[name], value]
            : prev[name].filter((item) => item !== value),
        }));
      } else {
        setFilters((prev) => ({ ...prev, [name]: checked }));
      }
    } else {
      setFilters((prev) => ({ ...prev, [name]: value }));
    }
  };

  const resetFilters = () => {
    setFilters({
      country: '',
      city: '',
      services: [],
      priceMin: '',
      priceMax: '',
      minRating: '',
      languages: [],
      onlineOnly: false,
      verifiedOnly: false,
    });
    setIsFilterOpen(false);
  };

  const filteredGuides = guides.filter((guide) => {
    const matchesSearch = searchQuery
      ? guide.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        guide.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        guide.services.some((service) =>
          service.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : true;
    const matchesCountry = filters.country
      ? guide.country.toLowerCase().includes(filters.country.toLowerCase())
      : true;
    const matchesCity = filters.city
      ? guide.location.toLowerCase().includes(filters.city.toLowerCase())
      : true;
    const matchesServices = filters.services.length
      ? filters.services.every((service) => guide.services.includes(service))
      : true;
    const matchesPrice =
      (filters.priceMin ? guide.pricePerHour >= parseFloat(filters.priceMin) : true) &&
      (filters.priceMax ? guide.pricePerHour <= parseFloat(filters.priceMax) : true);
    const matchesRating = filters.minRating
      ? guide.rating >= parseFloat(filters.minRating)
      : true;
    const matchesLanguages = filters.languages.length
      ? filters.languages.every((lang) => guide.languages.includes(lang))
      : true;
    const matchesOnline = filters.onlineOnly ? guide.isOnline : true;
    const matchesVerified = filters.verifiedOnly ? guide.isVerified : true;

    return (
      matchesSearch &&
      matchesCountry &&
      matchesCity &&
      matchesServices &&
      matchesPrice &&
      matchesRating &&
      matchesLanguages &&
      matchesOnline &&
      matchesVerified
    );
  });

  const handleViewProfile = (guideId) => {
    setIsLoading(true);
    setTimeout(() => {
      const guide = guides.find((g) => g.id === guideId);
      setSelectedGuide(guide);
      setIsModalOpen(true);
      setIsLoading(false);
    }, 500);
  };

  const handleBookNow = () => {
    if (!isAuthenticated) {
      alert('Please log in or register to book a guide.');
    } else {
      console.log('Booking guide:', selectedGuide.name);
      // Placeholder for booking logic
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedGuide(null);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isModalOpen) {
        closeModal();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  return (
    <div className="find-guide-page">
      <section className="find-guide-hero-section" role="banner">
        <div className="find-guide-hero-content">
          <h1 className="find-guide-hero-title">Find Your Local Guide</h1>
          <p className="find-guide-hero-subtitle">Connect with experts for unforgettable travel experiences</p>
          <form className="find-guide-search-form" onSubmit={handleSearch} role="search">
            <div className="find-guide-search-container">
              <FiSearch className="find-guide-search-icon" aria-hidden="true" />
              <input
                type="text"
                placeholder="Search by location, activity, or guide name"
                className="find-guide-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search for guides"
              />
              <button type="submit" className="find-guide-search-btn">Search</button>
            </div>
          </form>
          <button
            className="find-guide-filter-toggle"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            aria-expanded={isFilterOpen}
            aria-controls="filter-container"
          >
            <FiFilter /> Filters {isFilterOpen ? '(Hide)' : '(Show)'}
          </button>
          <div
            className={`find-guide-filter-container ${isFilterOpen ? 'open' : ''}`}
            id="filter-container"
            role="form"
            aria-label="Guide filters"
          >
            <div className="find-guide-filter-header">
              <h3 className="find-guide-filter-title">Filter Guides</h3>
              <button className="find-guide-filter-reset" onClick={resetFilters}>
                Reset Filters
              </button>
            </div>
            <div className="find-guide-filter-grid">
              <div className="find-guide-filter-group">
                <label htmlFor="country">Country</label>
                <input
                  type="text"
                  id="country"
                  name="country"
                  placeholder="e.g., Uzbekistan"
                  value={filters.country}
                  onChange={handleFilterChange}
                  className="find-guide-filter-input"
                />
              </div>
              <div className="find-guide-filter-group">
                <label htmlFor="city">City/Region</label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  placeholder="e.g., Tashkent"
                  value={filters.city}
                  onChange={handleFilterChange}
                  className="find-guide-filter-input"
                />
              </div>
              <div className="find-guide-filter-group">
                <label>Services</label>
                <div className="find-guide-filter-checkboxes">
                  {['City Tours', 'Historical Sites', 'Cultural Experiences', 'Food Tours'].map((service) => (
                    <label key={service} className="find-guide-checkbox-label">
                      <input
                        type="checkbox"
                        name="services"
                        value={service}
                        checked={filters.services.includes(service)}
                        onChange={handleFilterChange}
                      />
                      {service}
                    </label>
                  ))}
                </div>
              </div>
              <div className="find-guide-filter-group">
                <label>Price Range ($/hour)</label>
                <div className="find-guide-price-range">
                  <input
                    type="number"
                    name="priceMin"
                    placeholder="Min"
                    value={filters.priceMin}
                    onChange={handleFilterChange}
                    className="find-guide-filter-input"
                    aria-label="Minimum price per hour"
                  />
                  <input
                    type="number"
                    name="priceMax"
                    placeholder="Max"
                    value={filters.priceMax}
                    onChange={handleFilterChange}
                    className="find-guide-filter-input"
                    aria-label="Maximum price per hour"
                  />
                </div>
              </div>
              <div className="find-guide-filter-group">
                <label htmlFor="minRating">Minimum Rating</label>
                <select
                  id="minRating"
                  name="minRating"
                  value={filters.minRating}
                  onChange={handleFilterChange}
                  className="find-guide-filter-input"
                >
                  <option value="">Any</option>
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <option key={rating} value={rating}>{rating} Stars</option>
                  ))}
                </select>
              </div>
              <div className="find-guide-filter-group">
                <label>Languages</label>
                <div className="find-guide-filter-checkboxes">
                  {['English', 'Russian', 'Uzbek', 'Persian', 'Spanish'].map((lang) => (
                    <label key={lang} className="find-guide-checkbox-label">
                      <input
                        type="checkbox"
                        name="languages"
                        value={lang}
                        checked={filters.languages.includes(lang)}
                        onChange={handleFilterChange}
                      />
                      {lang}
                    </label>
                  ))}
                </div>
              </div>
              <div className="find-guide-filter-group">
                <label className="find-guide-checkbox-label">
                  <input
                    type="checkbox"
                    name="onlineOnly"
                    checked={filters.onlineOnly}
                    onChange={handleFilterChange}
                  />
                  Online Only
                </label>
                <label className="find-guide-checkbox-label">
                  <input
                    type="checkbox"
                    name="verifiedOnly"
                    checked={filters.verifiedOnly}
                    onChange={handleFilterChange}
                  />
                  Verified Only
                </label>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="find-guide-guides-section" role="region" aria-label="Guide listings">
        <h2 className="find-guide-section-title">Explore Our Guides</h2>
        <div className="find-guide-guides-grid">
          {filteredGuides.map((guide) => (
            <div key={guide.id} className="find-guide-guide-card" role="article">
              <div className={`find-guide-guide-image ${guide.image}`} aria-hidden="true"></div>
              <div className="find-guide-guide-info">
                <h3 className="find-guide-guide-name">{guide.name}</h3>
                <p className="find-guide-guide-location">{guide.location}</p>
                <p className="find-guide-guide-description">{guide.description}</p>
                <p className="find-guide-guide-rating">
                  {guide.rating} <FiStar className="find-guide-star" aria-hidden="true" />
                  {guide.isVerified && (
                    <span className="find-guide-verified-badge" aria-label="Verified guide">
                      ✓
                    </span>
                  )}
                </p>
                <button
                  className="find-guide-guide-btn"
                  onClick={() => handleViewProfile(guide.id)}
                  aria-label={`View profile of ${guide.name}`}
                >
                  View Profile
                </button>
              </div>
            </div>
          ))}
          {filteredGuides.length === 0 && (
            <p className="find-guide-no-results">No guides match your criteria.</p>
          )}
        </div>
      </section>

      {isModalOpen && selectedGuide && (
        <div
          className="find-guide-modal-overlay"
          onClick={closeModal}
          role="dialog"
          aria-labelledby="modal-title"
          aria-modal="true"
        >
          <div className="find-guide-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="find-guide-modal-close"
              onClick={closeModal}
              aria-label="Close profile modal"
            >
              <FiX />
            </button>
            {isLoading ? (
              <div className="find-guide-modal-loading">Loading...</div>
            ) : (
              <div className="find-guide-modal-content">
                <div className={`find-guide-modal-image ${selectedGuide.image}`} aria-hidden="true"></div>
                <h2 className="find-guide-modal-name" id="modal-title">
                  {selectedGuide.name}
                  {selectedGuide.isVerified && (
                    <span className="find-guide-verified-badge" aria-label="Verified guide">
                      ✓
                    </span>
                  )}
                </h2>
                <p className="find-guide-modal-location">{selectedGuide.location}</p>
                <p className="find-guide-modal-bio">{selectedGuide.bio}</p>
                <div className="find-guide-modal-details">
                  <h3>Languages</h3>
                  <ul className="find-guide-modal-languages">
                    {selectedGuide.languages.map((lang, index) => (
                      <li key={index}>{lang}</li>
                    ))}
                  </ul>
                  <h3>Services</h3>
                  <ul className="find-guide-modal-services">
                    {selectedGuide.services.map((service, index) => (
                      <li key={index}>{service}</li>
                    ))}
                  </ul>
                  <h3>Price</h3>
                  <p>${selectedGuide.pricePerHour}/hour</p>
                  <h3>Rating</h3>
                  <p className="find-guide-modal-rating">
                    {selectedGuide.rating}{' '}
                    <FiStar className="find-guide-star" aria-hidden="true" />
                  </p>
                  <h3>Contact</h3>
                  <p>
                    Email:{' '}
                    <a href={`mailto:${selectedGuide.contact.email}`}>
                      {selectedGuide.contact.email}
                    </a>
                  </p>
                  <p>Phone: {selectedGuide.contact.phone}</p>
                  <h3>Status</h3>
                  <p>{selectedGuide.isOnline ? 'Online' : 'Offline'}</p>
                  <p>{selectedGuide.isVerified ? 'Verified' : 'Not Verified'}</p>
                  <h3>Reviews</h3>
                  <div className="find-guide-modal-reviews">
                    {selectedGuide.reviews.map((review, index) => (
                      <div key={index} className="find-guide-modal-review">
                        <div className="find-guide-modal-rating">
                          {Array(Math.round(review.rating)).fill().map((_, i) => (
                            <FiStar key={i} className="find-guide-star" aria-hidden="true" />
                          ))}
                        </div>
                        <p>{review.comment}</p>
                        <p className="find-guide-modal-reviewer">— {review.user}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <button className="find-guide-modal-btn" onClick={handleBookNow}>
                  Book Now
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FindGuide;