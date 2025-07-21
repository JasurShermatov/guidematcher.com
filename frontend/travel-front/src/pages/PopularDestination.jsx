import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiStar, FiUsers, FiArrowLeft, FiArrowRight } from 'react-icons/fi';
import './HomePage.css';

const PopularDestination = () => {
  const navigate = useNavigate();

  const popularDestinations = [
    { name: 'Istanbul, Turkey', guides: 234, image: 'https://images.unsplash.com/photo-1602751584581-2e4f8243cc6d', rating: 4.8, price: 'From $25/day', highlights: ['Historical Tours', 'Local Cuisine', 'Shopping Guide'] },
    { name: 'Barcelona, Spain', guides: 189, image: 'https://images.unsplash.com/photo-1549972890-1e9d1e0e9e38', rating: 4.9, price: 'From $35/day', highlights: ['Architecture', 'Beach Tours', 'Art & Culture'] },
    { name: 'Tokyo, Japan', guides: 156, image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf', rating: 4.7, price: 'From $45/day', highlights: ['Modern Culture', 'Traditional Sites', 'Food Tours'] },
    { name: 'Paris, France', guides: 298, image: 'https://images.unsplash.com/photo-1502602898650-2c301a4391b1', rating: 4.8, price: 'From $40/day', highlights: ['Museums', 'Romance Tours', 'Fashion Districts'] },
    { name: 'Dubai, UAE', guides: 145, image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c', rating: 4.6, price: 'From $50/day', highlights: ['Luxury Tours', 'Desert Safari', 'Modern Marvels'] },
    { name: 'Rome, Italy', guides: 167, image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5', rating: 4.9, price: 'From $30/day', highlights: ['Ancient History', 'Vatican Tours', 'Culinary Tours'] }
  ];

  return (
    <div className="homepage">
      <section className="homepage-destinations-section homepage-section">
        <div className="homepage-container">
          <h2 className="homepage-section-title">All Popular Destinations</h2>
          <p className="homepage-section-subtitle">Discover all our top destinations with expert guides</p>
          <div className="homepage-destinations-grid">
            {popularDestinations.map((destination, index) => (
              <div key={index} className="homepage-destination-card">
                <div className="homepage-destination-image" style={{ backgroundImage: `url(${destination.image})` }}>
                  <div className="homepage-destination-overlay">
                    <button 
                      className="homepage-explore-btn" 
                      onClick={() => navigate('/find-guides', { state: { location: destination.name.split(',')[0].trim(), service: '' } })}
                      aria-label={`Find guides for ${destination.name}`}
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
            onClick={() => navigate('/')} 
            aria-label="Back to home page"
          >
            <FiArrowLeft /> Back to Home
          </button>
        </div>
      </section>
    </div>
  );
};

export default PopularDestination;