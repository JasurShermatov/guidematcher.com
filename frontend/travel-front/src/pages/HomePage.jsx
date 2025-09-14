// src/pages/HomePage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
    FiCheck,
    FiClock,
    FiX, FiCompass
} from 'react-icons/fi';
import './HomePage.css';

// Hero slider rasmlari (sizdagi kabi)
import desktopImage1 from '../images/desktop-image-1.jpeg';
import desktopImage2 from '../images/desktop-image-2.jpg';
import desktopImage3 from '../images/desktop-image-3.jpg';
import desktopImage4 from '../images/desktop-image-4.jpg';
import desktopImage5 from '../images/desktop-image-5.avif';

// Popular destinations uchun LOKAL rasmlar
import istanbulImage from '../images/istanbul.jpeg';
import barcelonaImage from '../images/barcelona.jpeg';
import tokyoImage from '../images/tokyo.jpeg';
import parisImage from '../images/paris.jpeg';
import dubaiImage from '../images/dubai.jpeg';
import romeImage from '../images/rome.jpeg';

const HomePage = () => {
    const { t } = useTranslation();
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
        {
            name: t('homepage.popular_destinations.istanbul.name'),
            guides: 234,
            image: istanbulImage,
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
            image: barcelonaImage,
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
            image: tokyoImage,
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
            image: parisImage,
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
            image: dubaiImage,
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
            image: romeImage,
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

    const serviceTypes = [
        {
            name: t('homepage.service_types.city_tours.name'),
            icon: <FiCompass />,
            description: t('homepage.service_types.city_tours.description'),
            count: t('homepage.service_types.city_tours.count')
        },
        {
            name: t('homepage.service_types.language_support.name'),
            icon: <FiMessageCircle />,
            description: t('homepage.service_types.language_support.description'),
            count: t('homepage.service_types.language_support.count')
        },
        {
            name: t('homepage.service_types.photography_tours.name'),
            icon: <FiCamera />,
            description: t('homepage.service_types.photography_tours.description'),
            count: t('homepage.service_types.photography_tours.count')
        },
        {
            name: t('homepage.service_types.cultural_experiences.name'),
            icon: <FiGlobe />,
            description: t('homepage.service_types.cultural_experiences.description'),
            count: t('homepage.service_types.cultural_experiences.count')
        }
    ];

    const features = [
        {
            icon: <FiShield />,
            title: t('homepage.features.verified_guides.title'),
            description: t('homepage.features.verified_guides.description'),
            stats: t('homepage.features.verified_guides.stats')
        },
        {
            icon: <FiStar />,
            title: t('homepage.features.top_quality.title'),
            description: t('homepage.features.top_quality.description'),
            stats: t('homepage.features.top_quality.stats')
        },
        {
            icon: <FiGlobe />,
            title: t('homepage.features.global_reach.title'),
            description: t('homepage.features.global_reach.description'),
            stats: t('homepage.features.global_reach.stats')
        },
        {
            icon: <FiClock />,
            title: t('homepage.features.instant_booking.title'),
            description: t('homepage.features.instant_booking.description'),
            stats: t('homepage.features.instant_booking.stats')
        }
    ];

    const stats = [
        { number: '1000+', label: t('homepage.stats.verified_guides'), icon: <FiUsers /> },
        { number: '50+', label: t('homepage.stats.countries'), icon: <FiGlobe /> },
        { number: '10K+', label: t('homepage.stats.happy_travelers'), icon: <FiHeart /> },
        { number: '4.8', label: t('homepage.stats.average_rating'), icon: <FiStar /> }
    ];

    const testimonials = [
        {
            name: t('homepage.testimonials.sarah.name'),
            location: t('homepage.testimonials.sarah.location'),
            avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
            rating: 5,
            text: t('homepage.testimonials.sarah.text'),
            tour: t('homepage.testimonials.sarah.tour')
        },
        {
            name: t('homepage.testimonials.marco.name'),
            location: t('homepage.testimonials.marco.location'),
            avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
            rating: 5,
            text: t('homepage.testimonials.marco.text'),
            tour: t('homepage.testimonials.marco.tour')
        },
        {
            name: t('homepage.testimonials.emma.name'),
            location: t('homepage.testimonials.emma.location'),
            avatar: 'https://randomuser.me/api/portraits/women/65.jpg',
            rating: 5,
            text: t('homepage.testimonials.emma.text'),
            tour: t('homepage.testimonials.emma.tour')
        }
    ];

    const steps = [
        {
            number: 1,
            title: t('homepage.steps.search_browse.title'),
            description: t('homepage.steps.search_browse.description'),
            icon: <FiSearch />,
            color: 'from-blue-500 to-cyan-500'
        },
        {
            number: 2,
            title: t('homepage.steps.connect_plan.title'),
            description: t('homepage.steps.connect_plan.description'),
            icon: <FiMessageCircle />,
            color: 'from-purple-500 to-pink-500'
        },
        {
            number: 3,
            title: t('homepage.steps.experience.title'),
            description: t('homepage.steps.experience.description'),
            icon: <FiHeart />,
            color: 'from-green-500 to-teal-500'
        }
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
                            {t('homepage.hero.title')} <span className="homepage-gradient-text">{t('homepage.hero.gradient_text')}</span>
                        </h1>
                        <p className="homepage-hero-description">{t('homepage.hero.description')}</p>
                        <div className="homepage-search-section">
                            <div className="homepage-search-container">
                                <div className="homepage-search-inputs">
                                    <div className="homepage-search-input-group">
                                        <FiMapPin className="homepage-search-icon" />
                                        <input
                                            type="text"
                                            placeholder={t('homepage.search.location_placeholder')}
                                            value={searchLocation}
                                            onChange={(e) => setSearchLocation(e.target.value)}
                                            className="homepage-search-input"
                                            aria-label="Search by location"
                                        />
                                    </div>
                                    <div className="homepage-search-input-group">
                                        <FiUsers className="homepage-search-icon" />
                                        <input
                                            type="text"
                                            placeholder={t('homepage.search.service_placeholder')}
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
                                        aria-label="Find a guide"
                                    >
                                        {t('homepage.search.find_guide')}
                                    </button>
                                </div>
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
                    <h2 className="homepage-section-title">{t('homepage.popular_destinations.title')}</h2>
                    <p className="homepage-section-subtitle">{t('homepage.popular_destinations.subtitle')}</p>
                    <div className="homepage-destinations-grid">
                        {popularDestinations.map((destination, index) => (
                            <div key={index} className="homepage-destination-card">
                                <div className="homepage-destination-image" style={{ backgroundImage: `url(${destination.image})` }}>
                                    <div className="homepage-destination-overlay">
                                        <button
                                            className="homepage-explore-btn"
                                            onClick={() => handleViewDestination(destination)}
                                            aria-label={`${t('homepage.popular_destinations.explore')} ${destination.name}`}
                                        >
                                            <FiArrowRight />
                                        </button>
                                    </div>
                                </div>
                                <div className="homepage-destination-content">
                                    <h3>{destination.name}</h3>
                                    <div className="homepage-destination-highlights">
                                        {destination.highlights.map((highlight, idx) => (
                                            <span key={idx} className="homepage-highlight-tag">{highlight}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    {/*<button*/}
                    {/*    className="homepage-btn homepage-btn-outline"*/}
                    {/*    onClick={() => navigate('/popular-destinations')}*/}
                    {/*    aria-label={t('homepage.popular_destinations.view_all')}*/}
                    {/*>*/}
                    {/*    {t('homepage.popular_destinations.view_all')}*/}
                    {/*</button>*/}
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
                                    aria-label={t('homepage.destination_modal.close')}
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
                                        <FiStar /> {selectedDestination.rating} • <FiUsers /> {selectedDestination.guides} {t('homepage.destination_modal.guides')}
                                    </div>
                                    <div className="homepage-destination-modal-highlights">
                                        <h3>{t('homepage.destination_modal.highlights')}</h3>
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
                                        aria-label={`${t('homepage.destination_modal.find_guides_in')} ${selectedDestination.name}`}
                                    >
                                        {t('homepage.destination_modal.find_guides')}
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
                    <h2 className="homepage-section-title">{t('homepage.features.title')}</h2>
                    <p className="homepage-section-subtitle">{t('homepage.features.subtitle')}</p>
                    <div className="homepage-features-grid">
                        {features.map((feature, index) => (
                            <div key={index} className="homepage-feature-card">
                                <div className="homepage-feature-icon">{feature.icon}</div>
                                <h3>{feature.title}</h3>
                                <p>{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="homepage-cta-section">
                <div className="homepage-cta-background"></div>
                <div className="homepage-container">
                    <div className="homepage-cta-content">
                        <h2>{t('homepage.cta.title')}</h2>
                        <p>{t('homepage.cta.description')}</p>
                        <div className="homepage-cta-buttons">
                            <button className="homepage-btn homepage-btn-primary" onClick={handleFindGuide}>
                                {t('homepage.cta.find_guide')}
                            </button>
                            <button className="homepage-btn homepage-btn-outline" onClick={handleLearnMore}>
                                {t('homepage.cta.learn_more')}
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Learn More Modal */}
            {isLearnMoreOpen && (
                <div
                    className="homepage-learn-more-overlay"
                    onClick={closeLearnMore}
                    role="dialog"
                    aria-labelledby="learn-more-title"
                    aria-modal="true"
                >
                    <div className="homepage-learn-more-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="homepage-learn-more-content">
                            <h2 id="learn-more-title">{t('homepage.learn_more.title')}</h2>
                            <p>{t('homepage.learn_more.description')}</p>
                            <h3>{t('homepage.learn_more.why_travel_with_us')}</h3>
                            <ul className="homepage-learn-more-list">
                                <li><FiCheck /> <strong>{t('homepage.learn_more.verified_guides')}</strong> {t('homepage.learn_more.verified_guides_desc')}</li>
                                <li><FiCheck /> <strong>{t('homepage.learn_more.global_reach')}</strong> {t('homepage.learn_more.global_reach_desc')}</li>
                                <li><FiCheck /> <strong>{t('homepage.learn_more.custom_experiences')}</strong> {t('homepage.learn_more.custom_experiences_desc')}</li>
                                <li><FiCheck /> <strong>{t('homepage.learn_more.support')}</strong> {t('homepage.learn_more.support_desc')}</li>
                            </ul>
                            <h3>{t('homepage.learn_more.our_vision')}</h3>
                            <p>{t('homepage.learn_more.our_vision_desc')}</p>
                            <div className="homepage-learn-more-actions">
                                <button
                                    className="homepage-btn homepage-btn-primary"
                                    onClick={handleFindGuide}
                                >
                                    {t('homepage.learn_more.find_guide')}
                                </button>
                                <button
                                    className="homepage-btn homepage-btn-outline"
                                    onClick={closeLearnMore}
                                >
                                    {t('homepage.learn_more.close')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HomePage;
