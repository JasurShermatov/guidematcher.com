import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiSearch, FiFilter, FiStar, FiMapPin, FiUsers } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { getCustomerProfiles, getCountries, getCities, getLanguages, createBooking } from '../api/api';
import './FindGuide.css';

// Simple debounce function
const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
};

const FindGuide = ({ user }) => {
    const { t, i18n } = useTranslation('translation'); // Specify namespace explicitly
    const [guides, setGuides] = useState([]);
    const [countries, setCountries] = useState([]);
    const [cities, setCities] = useState([]);
    const [languages, setLanguages] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState({
        country: '',
        city: '',
        language: '',
        rating: 0,
    });
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    // Debugging: Log current language
    useEffect(() => {
        console.log('Current language:', i18n.language);
        console.log('Available translations:', i18n.options.resources[i18n.language]?.translation?.find_guide);
    }, [i18n.language]);

    // Handle pending booking after login
    useEffect(() => {
        const { pendingBookGuideUserId } = location.state || {};
        if (user && pendingBookGuideUserId) {
            console.log('Attempting auto-booking for userId:', pendingBookGuideUserId);
            handleAutoBooking(pendingBookGuideUserId);
        }
    }, [user, location.state]);

    // Fetch countries and languages on mount
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                setIsLoading(true);
                const [countriesData, languagesData] = await Promise.all([
                    getCountries(),
                    getLanguages(),
                ]);
                console.log('Fetched countries:', countriesData);
                console.log('Fetched languages:', languagesData);
                setCountries(Array.isArray(countriesData) ? countriesData : []);
                setLanguages(Array.isArray(languagesData) ? languagesData : []);
            } catch (err) {
                console.error('Error fetching initial data:', err);
                setError(t('find_guide.errors.fetch_data', { defaultValue: 'An error occurred while fetching data' }));
            } finally {
                setIsLoading(false);
            }
        };
        fetchInitialData();
    }, [t]);

    // Fetch cities when country changes
    useEffect(() => {
        if (filters.country) {
            console.log('Fetching cities for country:', filters.country);
            setIsLoading(true);
            getCities(filters.country)
                .then(data => {
                    console.log('Fetched cities:', data);
                    setCities(Array.isArray(data) ? data : []);
                })
                .catch(err => {
                    console.error('Error fetching cities:', err);
                    setError(t('find_guide.errors.fetch_cities', { defaultValue: 'An error occurred while fetching cities' }));
                    setCities([]);
                })
                .finally(() => setIsLoading(false));
        } else {
            setCities([]);
        }
    }, [filters.country, t]);

    // Fetch guides based on search and filters
    const fetchGuides = useCallback(
        debounce(async () => {
            try {
                setIsLoading(true);
                const params = {};
                if (searchQuery) params.q = searchQuery;
                if (filters.country) params.country = filters.country;
                if (filters.city) params.city = filters.city;
                if (filters.language) params.language = filters.language;
                if (filters.rating) params.min_rating = filters.rating;
                params.is_available = true;
                params.limit = 100;
                params.offset = 0;

                console.log('Fetching guides with params:', params);
                const data = await getCustomerProfiles(params);
                console.log('Fetched guides raw data:', data);

                let guidesData = Array.isArray(data) ? data : (data.results || []);

                if (!Array.isArray(guidesData)) {
                    console.error('API response is not an array:', guidesData);
                    setError(t('find_guide.errors.fetch_guides', { defaultValue: 'An error occurred while fetching guides' }));
                    setGuides([]);
                    return;
                }

                const mappedGuides = guidesData.map(profile => {
                    const rating = typeof profile.average_rating === 'number' && !isNaN(profile.average_rating)
                        ? profile.average_rating
                        : 0;

                    if (!profile.average_rating) {
                        console.warn('Invalid or missing average_rating for profile:', profile);
                    }

                    return {
                        id: profile.id || profile.profile_id || null,
                        name: profile.full_name || t('find_guide.unknown_guide', { defaultValue: 'Unknown Guide' }),
                        location: profile.city_name
                            ? `${profile.city_name}, ${profile.country_name || t('find_guide.unknown_location', { defaultValue: 'Unknown' })}`
                            : profile.country_name || t('find_guide.unknown_location', { defaultValue: 'Unknown Location' }),
                        languages: Array.isArray(profile.languages) ? profile.languages.map(l => l.name || t('find_guide.unknown_language', { defaultValue: 'Unknown' })) : [],
                        rating: rating,
                        tours: Array.isArray(profile.service_types) ? profile.service_types.map(s => s.name || t('find_guide.unknown_tour', { defaultValue: 'Unknown' })) : [],
                        price: profile.hourly_rate || 0,
                        image: profile.user?.avatar || 'https://placehold.co/150x150',
                        isOnline: profile.is_available || false,
                        userId: profile.user?.id || null,
                    };
                });
                console.log('Mapped guides:', mappedGuides);
                setGuides(mappedGuides);
                if (mappedGuides.length === 0) {
                    setError(t('find_guide.errors.no_guides', { defaultValue: 'No guides found matching your criteria' }));
                } else {
                    setError('');
                }
            } catch (err) {
                console.error('Error fetching guides:', err);
                setError(t('find_guide.errors.fetch_guides', { defaultValue: 'An error occurred while fetching guides' }));
                setGuides([]);
            } finally {
                setIsLoading(false);
            }
        }, 500),
        [searchQuery, filters, t]
    );

    useEffect(() => {
        console.log('useEffect triggered with searchQuery:', searchQuery, 'filters:', filters);
        fetchGuides();
    }, [fetchGuides]);

    const handleSearchChange = (e) => {
        setSearchQuery(e.target.value);
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        console.log('Filter changed:', { name, value });
        setFilters(prev => ({ ...prev, [name]: value }));
        if (name === 'country') {
            setFilters(prev => ({ ...prev, city: '' }));
        }
    };

    const toggleFilter = () => {
        setIsFilterOpen(!isFilterOpen);
    };

    const handleAutoBooking = async (guideUserId) => {
        try {
            console.log('Auto-booking guide with userId:', guideUserId);
            await createBooking({ customer: guideUserId });
            alert(t('find_guide.success_booking', { defaultValue: 'Booking created successfully' }));
            navigate('/my-bookings', { replace: true });
        } catch (err) {
            console.error('Auto-booking failed:', err);
            setError(t('find_guide.errors.booking_failed', { defaultValue: 'Failed to create booking' }));
        }
    };

    const handleBookGuide = async (guide) => {
        if (!user) {
            console.log('User not logged in, redirecting to login with guide userId:', guide.userId);
            navigate('/login', { state: { pendingBookGuideUserId: guide.userId } });
            return;
        }
        try {
            console.log('Booking guide with userId:', guide.userId);
            await createBooking({ customer: guide.userId });
            alert(t('find_guide.success_booking', { defaultValue: 'Booking created successfully' }));
            navigate('/my-bookings');
        } catch (err) {
            console.error('Booking failed:', err);
            setError(t('find_guide.errors.booking_failed', { defaultValue: 'Failed to create booking' }));
        }
    };

    const handleMessageGuide = (guide) => {
        if (!user) {
            console.log('User not logged in, redirecting to login for messaging');
            navigate('/login');
            return;
        }
        console.log('Navigating to chat with guide userId:', guide.userId);
        navigate(`/chat/${guide.userId}`);
    };

    return (
        <div className="find-guide">
            <div className="find-guide-container">
                <header className="find-guide-header">
                    <h1 className="find-guide-title">{t('find_guide.title', { defaultValue: 'Find a Guide' })}</h1>
                    <p className="find-guide-subtitle">{t('find_guide.subtitle', { defaultValue: 'Discover the best local guides for your next adventure' })}</p>
                </header>
                <div className="find-guide-search-section">
                    <div className="find-guide-search-bar">
                        <FiSearch className="find-guide-search-icon" />
                        <input
                            type="text"
                            placeholder={t('find_guide.search_placeholder', { defaultValue: 'Search guides by name or keyword' })}
                            value={searchQuery}
                            onChange={handleSearchChange}
                            className="find-guide-search-input"
                            aria-label={t('find_guide.search_aria_label', { defaultValue: 'Search guides' })}
                        />
                    </div>
                    <button
                        className="find-guide-filter-toggle"
                        onClick={toggleFilter}
                        aria-label={t('find_guide.toggle_filters', { defaultValue: 'Toggle filters' })}
                    >
                        <FiFilter />
                        <span>{t('find_guide.filters', { defaultValue: 'Filters' })}</span>
                    </button>
                </div>
                {error && <p className="find-guide-error">{error}</p>}
                {isLoading && <p className="find-guide-loading">{t('find_guide.loading', { defaultValue: 'Loading...' })}</p>}
                {isFilterOpen && (
                    <div className="find-guide-filter-section">
                        <div className="find-guide-filter-grid">
                            <div className="find-guide-form-group">
                                <label htmlFor="country">{t('find_guide.country', { defaultValue: 'Country' })}</label>
                                <select
                                    id="country"
                                    name="country"
                                    value={filters.country}
                                    onChange={handleFilterChange}
                                    className="find-guide-select"
                                    aria-label={t('find_guide.select_country', { defaultValue: 'Select country' })}
                                >
                                    <option value="">{t('find_guide.all_countries', { defaultValue: 'All Countries' })}</option>
                                    {countries.map(country => (
                                        <option key={country.id} value={country.id}>
                                            {country.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="find-guide-form-group">
                                <label htmlFor="city">{t('find_guide.city', { defaultValue: 'City' })}</label>
                                <select
                                    id="city"
                                    name="city"
                                    value={filters.city}
                                    onChange={handleFilterChange}
                                    className="find-guide-select"
                                    disabled={!filters.country}
                                    aria-label={t('find_guide.select_city', { defaultValue: 'Select city' })}
                                >
                                    <option value="">{t('find_guide.all_cities', { defaultValue: 'All Cities' })}</option>
                                    {cities.map(city => (
                                        <option key={city.id} value={city.id}>
                                            {city.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="find-guide-form-group">
                                <label htmlFor="language">{t('find_guide.language', { defaultValue: 'Language' })}</label>
                                <select
                                    id="language"
                                    name="language"
                                    value={filters.language}
                                    onChange={handleFilterChange}
                                    className="find-guide-select"
                                    aria-label={t('find_guide.select_language', { defaultValue: 'Select language' })}
                                >
                                    <option value="">{t('find_guide.all_languages', { defaultValue: 'All Languages' })}</option>
                                    {languages.map(lang => (
                                        <option key={lang.id} value={lang.id}>
                                            {lang.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="find-guide-form-group">
                                <label htmlFor="rating">{t('find_guide.minimum_rating', { defaultValue: 'Minimum Rating' })}</label>
                                <select
                                    id="rating"
                                    name="rating"
                                    value={filters.rating}
                                    onChange={handleFilterChange}
                                    className="find-guide-select"
                                    aria-label={t('find_guide.select_rating', { defaultValue: 'Select minimum rating' })}
                                >
                                    <option value={0}>{t('find_guide.all_ratings', { defaultValue: 'All Ratings' })}</option>
                                    <option value={4}>{t('find_guide.4_stars', { defaultValue: '4 Stars' })}</option>
                                    <option value={4.5}>{t('find_guide.4_5_stars', { defaultValue: '4.5 Stars' })}</option>
                                    <option value={5}>{t('find_guide.5_stars', { defaultValue: '5 Stars' })}</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}
                <div className="find-guide-grid">
                    {guides.length > 0 ? (
                        guides.map(guide => (
                            <div key={guide.id} className="find-guide-card">
                                <div className="find-guide-card-header">
                                    <div className="find-guide-avatar-container">
                                        <img
                                            src={guide.image}
                                            alt={guide.name}
                                            className="find-guide-avatar"
                                            onError={(e) => { e.target.src = 'https://placehold.co/150x150'; }}
                                        />
                                        <span
                                            className={`find-guide-online-status ${guide.isOnline ? 'find-guide-online' : 'find-guide-offline'}`}
                                        ></span>
                                    </div>
                                    <div className="find-guide-info">
                                        <h3 className="find-guide-name">{guide.name}</h3>
                                        <p className="find-guide-location">
                                            <FiMapPin /> {guide.location}
                                        </p>
                                        <div className="find-guide-rating">
                                            <FiStar /> {guide.rating === 0 ? t('find_guide.no_rating', { defaultValue: 'N/A' }) : guide.rating.toFixed(1)}
                                        </div>
                                    </div>
                                </div>
                                <div className="find-guide-details">
                                    <div className="find-guide-languages">
                                        <strong>{t('find_guide.languages', { defaultValue: 'Languages' })}</strong>
                                        <div className="find-guide-language-tags">
                                            {guide.languages.length > 0 ? (
                                                guide.languages.map((lang, index) => (
                                                    <span key={index} className="find-guide-language-tag">{lang}</span>
                                                ))
                                            ) : (
                                                <span className="find-guide-language-tag">{t('find_guide.none', { defaultValue: 'None' })}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="find-guide-tours">
                                        <strong>{t('find_guide.tours', { defaultValue: 'Tours' })}</strong>
                                        <div className="find-guide-tour-tags">
                                            {guide.tours.length > 0 ? (
                                                guide.tours.map((tour, index) => (
                                                    <span key={index} className="find-guide-tour-tag">{tour}</span>
                                                ))
                                            ) : (
                                                <span className="find-guide-tour-tag">{t('find_guide.none', { defaultValue: 'None' })}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="find-guide-price">
                                        <strong>{t('find_guide.price', { defaultValue: 'Price' })}</strong> ${guide.price.toFixed(2)}/{t('find_guide.hour', { defaultValue: 'hour' })}
                                    </div>
                                </div>
                                <div className="find-guide-actions">
                                    <button
                                        className="find-guide-btn find-guide-book-btn"
                                        onClick={() => handleBookGuide(guide)}
                                        disabled={!guide.userId || isLoading}
                                        aria-label={`${t('find_guide.book_now', { defaultValue: 'Book Now' })} ${guide.name}`}
                                    >
                                        {t('find_guide.book_now', { defaultValue: 'Book Now' })}
                                    </button>
                                    <button
                                        className="find-guide-btn find-guide-message-btn"
                                        onClick={() => handleMessageGuide(guide)}
                                        disabled={!guide.userId || isLoading}
                                        aria-label={`${t('find_guide.message_guide', { defaultValue: 'Message' })} ${guide.name}`}
                                    >
                                        {t('find_guide.message_guide', { defaultValue: 'Message' })}
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="find-guide-empty-state">
                            <FiUsers size={48} />
                            <h3>{t('find_guide.no_guides', { defaultValue: 'No Guides Found' })}</h3>
                            <p>{t('find_guide.no_guides_description', { defaultValue: 'Try adjusting your search or filters to find available guides.' })}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FindGuide;