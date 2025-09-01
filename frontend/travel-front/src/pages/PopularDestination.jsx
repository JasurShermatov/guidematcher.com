import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiStar, FiUsers, FiArrowLeft, FiArrowRight } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import './HomePage.css';

const PopularDestination = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const popularDestinations = [
        {
            name: t('homepage.popular_destinations.istanbul.name'),
            guides: 234,
            image: 'https://images.unsplash.com/photo-1602751584581-2e4f8243cc6d',
            rating: 4.8,
            price: t('homepage.popular_destinations.istanbul.price'),
            highlights: [
                t('homepage.popular_destinations.istanbul.highlights.hagia_sophia'),
                t('homepage.popular_destinations.istanbul.highlights.blue_mosque'),
                t('homepage.popular_destinations.istanbul.highlights.bosphorus_cruise'),
                t('homepage.popular_destinations.istanbul.highlights.grand_bazaar')
            ]
        },
        {
            name: t('homepage.popular_destinations.barcelona.name'),
            guides: 189,
            image: 'https://images.unsplash.com/photo-1549972890-1e9d1e0e9e38',
            rating: 4.9,
            price: t('homepage.popular_destinations.barcelona.price'),
            highlights: [
                t('homepage.popular_destinations.barcelona.highlights.sagrada_familia'),
                t('homepage.popular_destinations.barcelona.highlights.park_guell'),
                t('homepage.popular_destinations.barcelona.highlights.gothic_quarter'),
                t('homepage.popular_destinations.barcelona.highlights.la_rambla')
            ]
        },
        {
            name: t('homepage.popular_destinations.tokyo.name'),
            guides: 156,
            image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf',
            rating: 4.7,
            price: t('homepage.popular_destinations.tokyo.price'),
            highlights: [
                t('homepage.popular_destinations.tokyo.highlights.shibuya_crossing'),
                t('homepage.popular_destinations.tokyo.highlights.tokyo_skytree'),
                t('homepage.popular_destinations.tokyo.highlights.asakusa_temple'),
                t('homepage.popular_destinations.tokyo.highlights.tsukiji_market')
            ]
        },
        {
            name: t('homepage.popular_destinations.paris.name'),
            guides: 298,
            image: 'https://images.unsplash.com/photo-1502602898650-2c301a4391b1',
            rating: 4.8,
            price: t('homepage.popular_destinations.paris.price'),
            highlights: [
                t('homepage.popular_destinations.paris.highlights.eiffel_tower'),
                t('homepage.popular_destinations.paris.highlights.louvre_museum'),
                t('homepage.popular_destinations.paris.highlights.notre_dame'),
                t('homepage.popular_destinations.paris.highlights.montmartre')
            ]
        },
        {
            name: t('homepage.popular_destinations.dubai.name'),
            guides: 145,
            image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c',
            rating: 4.6,
            price: t('homepage.popular_destinations.dubai.price'),
            highlights: [
                t('homepage.popular_destinations.dubai.highlights.burj_khalifa'),
                t('homepage.popular_destinations.dubai.highlights.dubai_mall'),
                t('homepage.popular_destinations.dubai.highlights.desert_safari'),
                t('homepage.popular_destinations.dubai.highlights.palm_jumeirah')
            ]
        },
        {
            name: t('homepage.popular_destinations.rome.name'),
            guides: 167,
            image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5',
            rating: 4.9,
            price: t('homepage.popular_destinations.rome.price'),
            highlights: [
                t('homepage.popular_destinations.rome.highlights.colosseum'),
                t('homepage.popular_destinations.rome.highlights.roman_forum'),
                t('homepage.popular_destinations.rome.highlights.pantheon'),
                t('homepage.popular_destinations.rome.highlights.vatican_city')
            ]
        }
    ];

    return (
        <div className="homepage">
            <section className="homepage-destinations-section homepage-section">
                <div className="homepage-container">
                    <h2 className="homepage-section-title">{t('homepage.popular_destinations.title')}</h2>
                    <p className="homepage-section-subtitle">{t('homepage.popular_destinations.subtitle')}</p>
                    <div className="homepage-destinations-grid">
                        {popularDestinations.map((destination, index) => (
                            <div key={index} className="homepage-destination-card">
                                <div className="homepage-destination-image" style={{ backgroundImage: `url(${destination.image})` }}>
                                    <div className="homepage-destination-overlay">
                                        <button
                                            className="homepage-explore-btn"
                                            onClick={() => navigate('/find-guides', { state: { location: destination.name.split(',')[0].trim(), service: '' } })}
                                            aria-label={`${t('homepage.popular_destinations.find_guides_in')} ${destination.name}`}
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
                                        <FiUsers /> {destination.guides} {t('homepage.destination_modal.guides')}
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
                        aria-label={t('homepage.popular_destinations.back_to_home')}
                    >
                        <FiArrowLeft /> {t('homepage.popular_destinations.back_to_home')}
                    </button>
                </div>
            </section>
        </div>
    );
};

export default PopularDestination;