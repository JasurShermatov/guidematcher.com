import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next'; // Import useTranslation hook
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
    const { t } = useTranslation(); // Initialize translation hook
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
            name: t('home.destinations.istanbul.name'),
            guides: 234,
            image: 'https://images.unsplash.com/photo-1602751584581-2e4f8243cc6d',
            rating: 4.8,
            price: t('home.destinations.istanbul.price'),
            highlights: t('home.destinations.istanbul.highlights', { returnObjects: true })
        },
        {
            name: t('home.destinations.barcelona.name'),
            guides: 189,
            image: 'https://images.unsplash.com/photo-1549972890-1e9d1e0e9e38',
            rating: 4.9,
            price: t('home.destinations.barcelona.price'),
            highlights: t('home.destinations.barcelona.highlights', { returnObjects: true })
        },
        {
            name: t('home.destinations.tokyo.name'),
            guides: 156,
            image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf',
            rating: 4.7,
            price: t('home.destinations.tokyo.price'),
            highlights: t('home.destinations.tokyo.highlights', { returnObjects: true })
        },
        {
            name: t('home.destinations.paris.name'),
            guides: 298,
            image: 'https://images.unsplash.com/photo-1502602898650-2c301a4391b1',
            rating: 4.8,
            price: t('home.destinations.paris.price'),
            highlights: t('home.destinations.paris.highlights', { returnObjects: true })
        },
        {
            name: t('home.destinations.dubai.name'),
            guides: 145,
            image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c',
            rating: 4.6,
            price: t('home.destinations.dubai.price'),
            highlights: t('home.destinations.dubai.highlights', { returnObjects: true })
        },
        {
            name: t('home.destinations.rome.name'),
            guides: 167,
            image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5',
            rating: 4.9,
            price: t('home.destinations.rome.price'),
            highlights: t('home.destinations.rome.highlights', { returnObjects: true })
        }
    ];

    const serviceTypes = [
        {
            name: t('home.services.city_tours.name'),
            icon: <FiCompass />,
            description: t('home.services.city_tours.description'),
            count: t('home.services.city_tours.count')
        },
        {
            name: t('home.services.language_support.name'),
            icon: <FiMessageCircle />,
            description: t('home.services.language_support.description'),
            count: t('home.services.language_support.count')
        },
        {
            name: t('home.services.photography.name'),
            icon: <FiCamera />,
            description: t('home.services.photography.description'),
            count: t('home.services.photography.count')
        },
        {
            name: t('home.services.cultural_experiences.name'),
            icon: <FiGlobe />,
            description: t('home.services.cultural_experiences.description'),
            count: t('home.services.cultural_experiences.count')
        }
    ];

    const features = [
        {
            icon: <FiShield />,
            title: t('home.features.verified_guides.title'),
            description: t('home.features.verified_guides.description'),
            stats: t('home.features.verified_guides.stats')
        },
        {
            icon: <FiStar />,
            title: t('home.features.top_quality.title'),
            description: t('home.features.top_quality.description'),
            stats: t('home.features.top_quality.stats')
        },
        {
            icon: <FiGlobe />,
            title: t('home.features.global_reach.title'),
            description: t('home.features.global_reach.description'),
            stats: t('home.features.global_reach.stats')
        },
        {
            icon: <FiClock />,
            title: t('home.features.instant_booking.title'),
            description: t('home.features.instant_booking.description'),
            stats: t('home.features.instant_booking.stats')
        }
    ];

    const stats = [
        { number: '25,000+', label: t('home.stats.verified_guides'), icon: <FiUsers /> },
        { number: '150+', label: t('home.stats.countries'), icon: <FiGlobe /> },
        { number: '100K+', label: t('home.stats.happy_travelers'), icon: <FiHeart /> },
        { number: '4.8', label: t('home.stats.average_rating'), icon: <FiStar /> }
    ];

    const testimonials = [
        {
            name: t('home.testimonials.sarah.name'),
            location: t('home.testimonials.sarah.location'),
            avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
            rating: 5,
            text: t('home.testimonials.sarah.text'),
            tour: t('home.testimonials.sarah.tour')
        },
        {
            name: t('home.testimonials.marco.name'),
            location: t('home.testimonials.marco.location'),
            avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
            rating: 5,
            text: t('home.testimonials.marco.text'),
            tour: t('home.testimonials.marco.tour')
        },
        {
            name: t('home.testimonials.emma.name'),
            location: t('home.testimonials.emma.location'),
            avatar: 'https://randomuser.me/api/portraits/women/65.jpg',
            rating: 5,
            text: t('home.testimonials.emma.text'),
            tour: t('home.testimonials.emma.tour')
        }
    ];

    const steps = [
        {
            number: 1,
            title: t('home.steps.search_browse.title'),
            description: t('home.steps.search_browse.description'),
            icon: <FiSearch />,
            color: 'from-blue-500 to-cyan-500'
        },
        {
            number: 2,
            title: t('home.steps.connect_plan.title'),
            description: t('home.steps.connect_plan.description'),
            icon: <FiMessageCircle />,
            color: 'from-purple-500 to-pink-500'
        },
        {
            number: 3,
            title: t('home.steps.experience.title'),
            description: t('home.steps.experience.description'),
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
                            {t('home.hero.title')} <span className="homepage-gradient-text">{t('home.hero.title_highlight')}</span>
                        </h1>
                        <p className="homepage-hero-description">{t('home.hero.description')}</p>
                        <div className="homepage-search-section">
                            <div className="homepage-search-container">
                                <div className="homepage-search-inputs">
                                    <div className="homepage-search-input-group">
                                        <FiMapPin className="homepage-search-icon" />
                                        <input
                                            type="text"
                                            placeholder={t('home.search.location_placeholder')}
                                            value={searchLocation}
                                            onChange={(e) => setSearchLocation(e.target.value)}
                                            className="homepage-search-input"
                                            aria-label={t('home.search.location_aria')}
                                        />
                                    </div>
                                    <div className="homepage-search-input-group">
                                        <FiUsers className="homepage-search-icon" />
                                        <input
                                            type="text"
                                            placeholder={t('home.search.service_placeholder')}
                                            value={searchService}
                                            onChange={(e) => setSearchService(e.target.value)}
                                            className="homepage-search-input"
                                            aria-label={t('home.search.service_aria')}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleFindGuide();
                                            }}
                                        />
                                        {searchService && (
                                            <ul className="homepage-search-results" role="listbox" aria-label={t('home.search.results_aria')}>
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
                                        aria-label={t('home.search.button_aria')}
                                    >
                                        {t('home.search.button')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="homepage-hero-visual">
                        <div className="homepage-hero-card homepage-guide-card">
                            <div className="homepage-guide-preview">
                                <img src="https://randomuser.me/api/portraits/men/75.jpg" alt={t('home.hero.guide_alt')} className="homepage-guide-avatar" />
                                <div className="homepage-guide-info">
                                    <h4>{t('home.hero.guide_name')}</h4>
                                    <p>{t('home.hero.guide_expert')}</p>
                                    <div className="homepage-rating">
                                        {[...Array(5)].map((_, i) => <FiStar key={i} className="homepage-star homepage-filled" />)}
                                        <span>{t('home.hero.guide_rating')}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="homepage-hero-card homepage-booking-card">
                            <div className="homepage-booking-preview">
                                <h4>{t('home.hero.tour_name')}</h4>
                                <div className="homepage-booking-details">
                                    <span><FiCalendar /> {t('home.hero.tour_date')}</span>
                                    <span><FiClock /> {t('home.hero.tour_duration')}</span>
                                </div>
                                <div className="homepage-booking-status"><FiCheck /> {t('home.hero.tour_status')}</div>
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
                    <h2 className="homepage-section-title">{t('home.destinations.title')}</h2>
                    <p className="homepage-section-subtitle">{t('home.destinations.subtitle')}</p>
                    <div className="homepage-destinations-grid">
                        {popularDestinations.map((destination, index) => (
                            <div key={index} className="homepage-destination-card">
                                <div className="homepage-destination-image" style={{ backgroundImage: `url(${destination.image})` }}>
                                    <div className="homepage-destination-overlay">
                                        <button
                                            className="homepage-explore-btn"
                                            onClick={() => handleViewDestination(destination)}
                                            aria-label={t('home.destinations.explore_aria', { name: destination.name })}
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
                                        <FiUsers /> {t('home.destinations.guides_count', { count: destination.guides })}
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
                        aria-label={t('home.destinations.view_all_aria')}
                    >
                        {t('home.destinations.view_all')}
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
                                    aria-label={t('home.destinations.modal.close_aria')}
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
                                        <FiStar /> {selectedDestination.rating} • <FiUsers /> {t('home.destinations.guides_count', { count: selectedDestination.guides })}
                                    </div>
                                    <div className="homepage-destination-modal-highlights">
                                        <h3>{t('home.destinations.modal.highlights')}</h3>
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
                                        aria-label={t('home.destinations.modal.find_guides_aria', { name: selectedDestination.name })}
                                    >
                                        {t('home.destinations.modal.find_guides')}
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
                    <h2 className="homepage-section-title">{t('home.features.title')}</h2>
                    <p className="homepage-section-subtitle">{t('home.features.subtitle')}</p>
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
                    <h2 className="homepage-section-title">{t('home.steps.title')}</h2>
                    <p className="homepage-section-subtitle">{t('home.steps.subtitle')}</p>
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
                    <h2 className="homepage-section-title">{t('home.testimonials.title')}</h2>
                    <p className="homepage-section-subtitle">{t('home.testimonials.subtitle')}</p>
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
                                aria-label={t('home.testimonials.dot_aria', { index: index + 1 })}
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
                        <h2>{t('home.cta.title')}</h2>
                        <p>{t('home.cta.description')}</p>
                        <div className="homepage-cta-buttons">
                            <button className="homepage-btn homepage-btn-primary" onClick={handleFindGuide}>
                                {t('home.cta.find_guide')}
                            </button>
                            <button className="homepage-btn homepage-btn-outline" onClick={handleLearnMore}>
                                {t('home.cta.learn_more')}
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
                            <h2 id="learn-more-title">{t('home.learn_more.title')}</h2>
                            <p>{t('home.learn_more.description')}</p>
                            <h3>{t('home.learn_more.why_title')}</h3>
                            <ul className="homepage-learn-more-list">
                                <li><FiCheck /> <strong>{t('home.learn_more.features.verified_guides.title')}</strong> {t('home.learn_more.features.verified_guides.description')}</li>
                                <li><FiCheck /> <strong>{t('home.learn_more.features.global_reach.title')}</strong> {t('home.learn_more.features.global_reach.description')}</li>
                                <li><FiCheck /> <strong>{t('home.learn_more.features.custom_experiences.title')}</strong> {t('home.learn_more.features.custom_experiences.description')}</li>
                                <li><FiCheck /> <strong>{t('home.learn_more.features.support.title')}</strong> {t('home.learn_more.features.support.description')}</li>
                            </ul>
                            <h3>{t('home.learn_more.vision_title')}</h3>
                            <p>{t('home.learn_more.vision_description')}</p>
                            <div className="homepage-learn-more-actions">
                                <button
                                    className="homepage-btn homepage-btn-primary"
                                    onClick={handleFindGuide}
                                >
                                    {t('home.learn_more.find_guide')}
                                </button>
                                <button
                                    className="homepage-btn homepage-btn-outline"
                                    onClick={closeLearnMore}
                                >
                                    {t('home.learn_more.close')}
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