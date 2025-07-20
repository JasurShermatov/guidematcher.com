import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiSearch, 
  FiMapPin, 
  FiUsers, 
  FiStar, 
  FiShield, 
  FiGlobe, 
  FiCamera, 
  FiMessageCircle, 
  FiHeart, 
  FiArrowRight, 
  FiCalendar, 
  FiCheck, 
  FiClock, 
  FiMail, 
  FiCompass,
  FiX 
} from 'react-icons/fi';
import './HomePage.css';
import desktopImage1 from '../images/desktop-image-1.jpeg';
import desktopImage2 from '../images/desktop-image-2.jpg';
import desktopImage3 from '../images/desktop-image-3.jpg';
import desktopImage4 from '../images/desktop-image-4.jpg';
import desktopImage5 from '../images/desktop-image-5.avif';

const HomePage = () => {
  const [searchLocation, setSearchLocation] = useState('');
  const [searchService, setSearchService] = useState('');
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [statsInView, setStatsInView] = useState(false);
  const [isLearnMoreOpen, setIsLearnMoreOpen] = useState(false);
  const [isDestinationModalOpen, setIsDestinationModalOpen] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const navigate = useNavigate();

  const popularDestinations = [
    { name: 'Istanbul, Turkey', guides: 234, image: 'https://images.unsplash.com/photo-1602751584581-2e4f8243cc6d', rating: 4.8, price: 'From $25/day', highlights: ['Historical Tours', 'Local Cuisine', 'Shopping Guide'] },
    { name: 'Barcelona, Spain', guides: 189, image: 'https://images.unsplash.com/photo-1549972890-1e9d1e0e9e38', rating: 4.9, price: 'From $35/day', highlights: ['Architecture', 'Beach Tours', 'Art & Culture'] },
    { name: 'Tokyo, Japan', guides: 156, image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf', rating: 4.7, price: 'From $45/day', highlights: ['Modern Culture', 'Traditional Sites', 'Food Tours'] },
    { name: 'Paris, France', guides: 298, image: 'https://images.unsplash.com/photo-1502602898650-2c301a4391b1', rating: 4.8, price: 'From $40/day', highlights: ['Museums', 'Romance Tours', 'Fashion Districts'] },
    { name: 'Dubai, UAE', guides: 145, image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c', rating: 4.6, price: 'From $50/day', highlights: ['Luxury Tours', 'Desert Safari', 'Modern Marvels'] },
    { name: 'Rome, Italy', guides: 167, image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5', rating: 4.9, price: 'From $30/day', highlights: ['Ancient History', 'Vatican Tours', 'Culinary Tours'] }
  ];

  const serviceTypes = [
    { name: 'City Tours', icon: <FiCompass />, description: 'Expert-guided city exploration', count: '2.5k+ guides' },
    { name: 'Language Support', icon: <FiMessageCircle />, description: 'Real-time translation services', count: '150+ languages' },
    { name: 'Photography', icon: <FiCamera />, description: 'Professional travel photography', count: '800+ photographers' },
    { name: 'Cultural Experiences', icon: <FiGlobe />, description: 'Authentic local activities', count: '1.2k+ experiences' }
  ];

  const features = [
    { icon: <FiShield />, title: 'Verified Guides', description: 'All guides are thoroughly vetted for safety.', stats: '99.8% Safety' },
    { icon: <FiStar />, title: 'Top Quality', description: 'High-rated experiences with verified reviews.', stats: '4.8★ Rating' },
    { icon: <FiGlobe />, title: 'Global Reach', description: 'Connect with guides in 150+ countries.', stats: '150+ Countries' },
    { icon: <FiClock />, title: 'Instant Booking', description: 'Book instantly with real-time availability.', stats: '24/7 Support' }
  ];

  const stats = [
    { number: '25,000+', label: 'Verified Guides', icon: <FiUsers /> },
    { number: '150+', label: 'Countries', icon: <FiGlobe /> },
    { number: '100K+', label: 'Happy Travelers', icon: <FiHeart /> },
    { number: '4.8', label: 'Average Rating', icon: <FiStar /> }
  ];

  const testimonials = [
    { name: 'Sarah Johnson', location: 'New York, USA', avatar: 'https://randomuser.me/api/portraits/women/44.jpg', rating: 5, text: 'Incredible experience in Istanbul! The guide showed me hidden gems.', tour: 'Historical Istanbul Tour' },
    { name: 'Marco Rodriguez', location: 'Madrid, Spain', avatar: 'https://randomuser.me/api/portraits/men/32.jpg', rating: 5, text: 'Tokyo photography tour was perfect! Amazing photos and cultural insights.', tour: 'Tokyo Photography Tour' },
    { name: 'Emma Wilson', location: 'London, UK', avatar: 'https://randomuser.me/api/portraits/women/65.jpg', rating: 5, text: 'Solo trip to Barcelona was a blast thanks to TravMatch!', tour: 'Barcelona Cultural Experience' }
  ];

  const steps = [
    { number: 1, title: 'Search & Browse', description: 'Find verified local guides.', icon: <FiSearch />, color: 'from-blue-500 to-cyan-500' },
    { number: 2, title: 'Connect & Plan', description: 'Chat with guides to plan your trip.', icon: <FiMessageCircle />, color: 'from-purple-500 to-pink-500' },
    { number: 3, title: 'Experience', description: 'Enjoy authentic local experiences.', icon: <FiHeart />, color: 'from-green-500 to-teal-500' }
  ];

  const heroImages = [
    desktopImage1,
    desktopImage2,
    desktopImage3,
    desktopImage4,
    desktopImage5
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [testimonials.length]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setStatsInView(entry.isIntersecting),
      { threshold: 0.5 }
    );
    const statsElement = document.querySelector('.homepage-stats-section');
    if (statsElement) observer.observe(statsElement);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isLearnMoreOpen) setIsLearnMoreOpen(false);
        if (isDestinationModalOpen) setIsDestinationModalOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isLearnMoreOpen, isDestinationModalOpen]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % heroImages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [heroImages.length]);

  const handleFindGuide = () => {
    navigate('/find-guides', { state: { location: searchLocation, service: searchService } });
  };

  const handleLearnMore = () => {
    setIsLearnMoreOpen(true);
  };

  const closeLearnMore = () => {
    setIsLearnMoreOpen(false);
  };

  const handleViewDestination = (destination) => {
    setSelectedDestination(destination);
    setIsDestinationModalOpen(true);
  };

  const closeDestinationModal = () => {
    setIsDestinationModalOpen(false);
    setSelectedDestination(null);
  };

  return (
    <div className="homepage">
      {/* Hero Section */}
      <section className="homepage-hero">
        <div className="homepage-hero-background" style={{ backgroundImage: `url(${heroImages[currentImageIndex]})` }}>
          <div className="homepage-hero-gradient"></div>
        </div>
        <div className="homepage-container homepage-hero-content">
          <div className="homepage-hero-text">
            <h1 className="homepage-hero-title">
              Discover the World with <span className="homepage-gradient-text">Trusted Guides</span>
            </h1>
            <p className="homepage-hero-description">
              Connect with verified local guides for authentic travel experiences in 150+ countries.
            </p>
            <div className="homepage-search-section">
              <div className="homepage-search-container">
                <div className="homepage-search-inputs">
                  <div className="homepage-search-input-group">
                    <FiMapPin className="homepage-search-icon" />
                    <input
                      type="text"
                      placeholder="Where are you traveling?"
                      value={searchLocation}
                      onChange={(e) => setSearchLocation(e.target.value)}
                      className="homepage-search-input"
                      aria-label="Search by city or country"
                    />
                  </div>
                  <div className="homepage-search-input-group">
                    <FiUsers className="homepage-search-icon" />
                    <input
                      type="text"
                      placeholder="What service do you need?"
                      value={searchService}
                      onChange={(e) => setSearchService(e.target.value)}
                      className="homepage-search-input"
                      aria-label="Search by service type"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleFindGuide();
                      }}
                    />
                    {searchService && (
                      <ul className="homepage-search-results" role="listbox" aria-label="Service type suggestions">
                        {serviceTypes
                          .filter((service) =>
                            service.name.toLowerCase().includes(searchService.toLowerCase())
                          )
                          .map((service, index) => (
                            <li
                              key={index}
                              className="homepage-search-result-item"
                              role="option"
                              tabIndex={0}
                              onClick={() => {
                                setSearchService(service.name);
                                handleFindGuide();
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  setSearchService(service.name);
                                  handleFindGuide();
                                }
                              }}
                            >
                              <span className="homepage-search-result-icon">{service.icon}</span>
                              <span>{service.name}</span>
                              <span className="homepage-search-result-count">{service.count}</span>
                            </li>
                          ))}
                      </ul>
                    )}
                  </div>
                  <button
                    className="homepage-search-btn"
                    onClick={handleFindGuide}
                    aria-label="Find your guide with current search"
                  >
                    Find Your Guide
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="homepage-hero-visual">
            <div className="homepage-hero-card homepage-guide-card">
              <div className="homepage-guide-preview">
                <img src="https://randomuser.me/api/portraits/men/75.jpg" alt="Guide" className="homepage-guide-avatar" />
                <div className="homepage-guide-info">
                  <h4>Ahmed K.</h4>
                  <p>Istanbul Expert</p>
                  <div className="homepage-rating">
                    {[...Array(5)].map((_, i) => <FiStar key={i} className="homepage-star homepage-filled" />)}
                    <span>4.9 (127)</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="homepage-hero-card homepage-booking-card">
              <div className="homepage-booking-preview">
                <h4>Istanbul Tour</h4>
                <div className="homepage-booking-details">
                  <span><FiCalendar /> Tomorrow, 10:00 AM</span>
                  <span><FiClock /> 4 hours</span>
                </div>
                <div className="homepage-booking-status"><FiCheck /> Confirmed</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className={`homepage-stats-section ${statsInView ? 'homepage-animate' : ''}`}>
        <div className="homepage-container">
          <div className="homepage-stats-grid">
            {stats.map((stat, index) => (
              <div key={index} className="homepage-stat-item" style={{ animationDelay: `${index * 0.2}s` }}>
                <div className="homepage-stat-icon">{stat.icon}</div>
                <div className="homepage-stat-number">{stat.number}</div>
                <div className="homepage-stat-label">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Destinations */}
      <section className="homepage-destinations-section homepage-section">
        <div className="homepage-container">
          <h2 className="homepage-section-title">Popular Destinations</h2>
          <p className="homepage-section-subtitle">Explore top destinations with expert guides</p>
          <div className="homepage-destinations-grid">
            {popularDestinations.map((destination, index) => (
              <div key={index} className="homepage-destination-card">
                <div className="homepage-destination-image" style={{ backgroundImage: `url(${destination.image})` }}>
                  <div className="homepage-destination-overlay">
                    <button 
                      className="homepage-explore-btn" 
                      onClick={() => handleViewDestination(destination)}
                      aria-label={`View details for ${destination.name}`}
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
          <button 
            className="homepage-btn homepage-btn-outline" 
            onClick={() => navigate('/popular-destinations')}
            aria-label="View all popular destinations"
          >
            View All Destinations
          </button>
          {isDestinationModalOpen && selectedDestination && (
            <div 
              className="homepage-destination-modal-overlay" 
              onClick={closeDestinationModal} 
              role="dialog" 
              aria-labelledby="destination-modal-title" 
              aria-modal="true"
            >
              <div className="homepage-destination-modal" onClick={(e) => e.stopPropagation()}>
                <button 
                  className="homepage-destination-modal-close-btn" 
                  onClick={closeDestinationModal} 
                  aria-label="Close destination details modal"
                >
                  <FiX />
                </button>
                <div className="homepage-destination-modal-content">
                  <img 
                    src={selectedDestination.image} 
                    alt={selectedDestination.name} 
                    className="homepage-destination-modal-image"
                  />
                  <h2 id="destination-modal-title">{selectedDestination.name}</h2>
                  <p className="homepage-destination-modal-price">{selectedDestination.price}</p>
                  <div className="homepage-destination-modal-meta">
                    <FiStar /> {selectedDestination.rating} • <FiUsers /> {selectedDestination.guides} guides
                  </div>
                  <div className="homepage-destination-modal-highlights">
                    <h3>Highlights</h3>
                    <ul>
                      {selectedDestination.highlights.map((highlight, idx) => (
                        <li key={idx}>{highlight}</li>
                      ))}
                    </ul>
                  </div>
                  <button 
                    className="homepage-btn homepage-btn-primary"
                    onClick={() => {
                      setSearchLocation(selectedDestination.name.split(',')[0].trim());
                      navigate('/find-guides', { state: { location: selectedDestination.name.split(',')[0].trim(), service: '' } });
                      closeDestinationModal();
                    }}
                    aria-label={`Find guides for ${selectedDestination.name}`}
                  >
                    Find Guides
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="homepage-features-section homepage-section">
        <div className="homepage-container">
          <h2 className="homepage-section-title">Why TravMatch?</h2>
          <p className="homepage-section-subtitle">Discover the benefits of traveling with us</p>
          <div className="homepage-features-grid">
            {features.map((feature, index) => (
              <div key={index} className="homepage-feature-card">
                <div className="homepage-feature-icon">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
                <div className="homepage-feature-stats">{feature.stats}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="homepage-how-it-works homepage-section">
        <div className="homepage-container">
          <h2 className="homepage-section-title">How It Works</h2>
          <p className="homepage-section-subtitle">Get started in 3 simple steps</p>
          <div className="homepage-steps-grid">
            {steps.map((step, index) => (
              <div key={index} className="homepage-step-card">
                <div className={`homepage-step-icon bg-gradient-to-r ${step.color}`}>{step.icon}</div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="homepage-testimonials-section homepage-section">
        <div className="homepage-container">
          <h2 className="homepage-section-title">What Travelers Say</h2>
          <p className="homepage-section-subtitle">Hear from our happy travelers</p>
          <div className="homepage-testimonials-grid">
            {testimonials.map((testimonial, index) => (
              <div key={index} className={`homepage-testimonial-card ${index === activeTestimonial ? 'homepage-active' : ''}`}>
                <p>"{testimonial.text}"</p>
                <div className="homepage-testimonial-author">
                  <img src={testimonial.avatar} alt={testimonial.name} className="homepage-author-avatar" />
                  <div>
                    <h5>{testimonial.name}</h5>
                    <span>{testimonial.location}</span>
                    <div className="homepage-tour-info"><FiMapPin /> {testimonial.tour}</div>
                  </div>
                </div>
                <div className="homepage-testimonial-rating">
                  {[...Array(testimonial.rating)].map((_, i) => <FiStar key={i} className="homepage-star homepage-filled" />)}
                </div>
              </div>
            ))}
          </div>
          <div className="homepage-testimonial-dots">
            {testimonials.map((_, index) => (
              <button
                key={index}
                className={`homepage-dot ${index === activeTestimonial ? 'homepage-active' : ''}`}
                onClick={() => setActiveTestimonial(index)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="homepage-cta-section">
        <div className="homepage-cta-background"></div>
        <div className="homepage-container">
          <div className="homepage-cta-content">
            <h2>Start Your Adventure</h2>
            <p>Join thousands of travelers for authentic experiences worldwide.</p>
            <div className="homepage-cta-buttons">
              <button className="homepage-btn homepage-btn-primary" onClick={handleFindGuide}>Find Your Guide</button>
              <button className="homepage-btn homepage-btn-outline" onClick={handleLearnMore}>Learn More</button>
            </div>
          </div>
        </div>
      </section>

      {/* Learn More Modal */}
      {isLearnMoreOpen && (
        <div className="homepage-learn-more-overlay" onClick={closeLearnMore} role="dialog" aria-labelledby="learn-more-title" aria-modal="true">
          <div className="homepage-learn-more-modal" onClick={(e) => e.stopPropagation()}>
            <div className="homepage-learn-more-content">
              <h2 id="learn-more-title">About TravMatch</h2>
              <p>
                TravMatch connects travelers with verified local guides to create authentic, unforgettable experiences in over 150 countries. Our mission is to make travel accessible, safe, and immersive by partnering with passionate locals who know their destinations inside out.
              </p>
              <h3>Why Choose TravMatch?</h3>
              <ul className="homepage-learn-more-list">
                <li><FiCheck /> <strong>Verified Guides:</strong> All guides are vetted for safety and expertise.</li>
                <li><FiCheck /> <strong>Global Reach:</strong> Explore 150+ countries with local experts.</li>
                <li><FiCheck /> <strong>Custom Experiences:</strong> Tailor your trip with personalized tours.</li>
                <li><FiCheck /> <strong>24/7 Support:</strong> Instant booking and round-the-clock assistance.</li>
              </ul>
              <h3>Our Vision</h3>
              <p>
                We believe travel is about connection, discovery, and stories. With TravMatch, you’re not just visiting a place—you’re living it through the eyes of a local.
              </p>
              <div className="homepage-learn-more-actions">
                <button className="homepage-btn homepage-btn-primary" onClick={handleFindGuide}>Find Your Guide Now</button>
                <button className="homepage-btn homepage-btn-outline" onClick={closeLearnMore}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;