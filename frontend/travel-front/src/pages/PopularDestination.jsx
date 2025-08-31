import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiStar, FiUsers, FiArrowLeft, FiArrowRight } from 'react-icons/fi';
import './HomePage.css';

const PopularDestination = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const popularDestinations = [
        {
            name: t('popular_destinations.istanbul.name'),
            guides: 234,
            image: 'https://images.unsplash.com/photo-1602751584581-2e4f8243cc6d',
            rating: 4.8,
            price: t('popular_destinations.istanbul.price'),
            highlights: t('popular_destinations.istanbul.highlights', { returnObjects: true })
        },
        {
            name: t('popular_destinations.barcelona.name'),
            guides: 189,
            image: 'https://images.unsplash.com/photo-1549972890-1e9d1e0e9e38',
            rating: 4.9,
            price: t('popular_destinations.barcelona.price'),
            highlights: t('popular_destinations.barcelona.highlights', { returnObjects: true })
        },
        {
            name: t('popular_destinations.tokyo.name'),
            guides: 156,
            image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf',
            rating: 4.7,
            price: t('popular_destinations.tokyo.price'),
            highlights: t('popular_destinations.tokyo.highlights', { returnObjects: true })
        },
        {
            name: t('popular_destinations.paris.name'),
            guides: 298,
            image: 'https://images.unsplash.com/photo-1502602898650-2c301a4391b1',
            rating: 4.8,
            price: t('popular_destinations.paris.price'),
            highlights: t('popular_destinations.paris.highlights', { returnObjects: true })
        },
        {
            name: t('popular_destinations.dubai.name'),
            guides: 145,
            image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c',
            rating: 4.6,
            price: t('popular_destinations.dubai.price'),
            highlights: t('popular_destinations.dubai.highlights', { returnObjects: true })
        },
        {
            name: t('popular_destinations.rome.name'),
            guides: 167,
            image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5',
            rating: 4.9,
            price: t('popular_destinations.rome.price'),
            highlights: t('popular_destinations.rome.highlights', { returnObjects: true })
        }
    ];

    return (
        <div className="homepage">
            <section className="homepage-destinations-section homepage-section">
                <div className="homepage-container">
                    <h2 className="homepage-section-title">{t('popular_destinations.title')}</h2>
                    <p className="homepage-section-subtitle">{t('popular_destinations.subtitle')}</p>
                    <div className="homepage-destinations-grid">
                        {popularDestinations.map((destination, index) => (
                            <div key={index} className="homepage-destination-card">
                                <div className="homepage-destination-image" style={{ backgroundImage: `url(${destination.image})` }}>
                                    <div className="homepage-destination-overlay">
                                        <button
                                            className="homepage-explore-btn"
                                            onClick={() => navigate('/find-guides', { state: { location: destination.name.split(',')[0].trim(), service: '' } })}
                                            aria-label={t('popular_destinations.find_guides_aria', { name: destination.name })}
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
                        aria-label={t('popular_destinations.back_to_home_aria')}
                    >
                        <FiArrowLeft /> {t('popular_destinations.back_to_home')}
                    </button>
                </div>
            </section>
        </div>
    );
};

export default PopularDestination;