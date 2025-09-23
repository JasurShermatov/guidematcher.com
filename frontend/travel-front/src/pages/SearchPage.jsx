import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, MapPin, Star, Clock, DollarSign, Users, Globe } from 'lucide-react';
import GoogleMap from '../components/GoogleMap';
import { useLanguage } from '../context/LanguageContext';

const SearchPage = () => {
    const { t } = useLanguage();

    const [activeFilters, setActiveFilters] = useState({
        service: 'all',
        location: '',
        priceRange: [0, 100],
        rating: 0,
        availability: 'all',
        language: 'all'
    });

    const [showFilters, setShowFilters] = useState(false);

    const guides = [
        {
            id: 1,
            name: "Elena Popova",
            location: "Prague, Czech Republic",
            rating: 4.9,
            reviews: 127,
            services: ["Tour Guide", "Photographer", "Cultural Expert"],
            price: 30,
            availability: "Available Now",
            languages: ["English", "Czech", "German"],
            image: "https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop",
            verified: true,
            responseTime: "within 1 hour",
            lat: 50.0755,
            lng: 14.4378
        },
        {
            id: 2,
            name: "Marco Silva",
            location: "Lisbon, Portugal",
            rating: 4.8,
            reviews: 89,
            services: ["Food Guide", "Translator", "Local Expert"],
            price: 25,
            availability: "Available Today",
            languages: ["English", "Portuguese", "Spanish"],
            image: "https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop",
            verified: true,
            responseTime: "within 2 hours",
            lat: 38.7223,
            lng: -9.1393
        },
        {
            id: 3,
            name: "Aisha Okonkwo",
            location: "Lagos, Nigeria",
            rating: 5.0,
            reviews: 156,
            services: ["Business Fixer", "Cultural Guide", "Translator"],
            price: 20,
            availability: "Available Now",
            languages: ["English", "Yoruba", "French"],
            image: "https://images.pexels.com/photos/1036623/pexels-photo-1036623.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop",
            verified: true,
            responseTime: "within 30 minutes",
            lat: 6.5244,
            lng: 3.3792
        },
        {
            id: 4,
            name: "Chen Wei",
            location: "Shanghai, China",
            rating: 4.7,
            reviews: 203,
            services: ["Shopping Helper", "Business Guide", "Interpreter"],
            price: 35,
            availability: "Available Tomorrow",
            languages: ["English", "Mandarin", "Japanese"],
            image: "https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop",
            verified: true,
            responseTime: "within 1 hour",
            lat: 31.2304,
            lng: 121.4737
        }
    ];

    const serviceCategories = [
        t('search.allServices'), t('service.tourGuide'), t('service.translator'), t('service.photographer'), t('service.driver'),
        t('service.shoppingHelper'), t('service.foodGuide'), t('service.businessFixer'), t('service.culturalExpert'),
        t('service.localExpert'), t('service.interpreter'), t('service.eventPlanner'), t('service.airportTransfer')
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-dark-950 pt-8 transition-colors">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* Search Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">{t('search.title')}</h1>
                    <div className="flex flex-col lg:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-5 w-5" />
                            <input
                                type="text"
                                placeholder={t('search.placeholder')}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-dark-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                            />
                        </div>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="flex items-center space-x-2 px-6 py-3 border border-gray-300 dark:border-dark-700 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-800 transition-colors lg:w-auto w-full justify-center bg-white dark:bg-dark-900 text-gray-700 dark:text-gray-300"
                        >
                            <Filter className="h-5 w-5" />
                            <span>{t('search.filters')}</span>
                        </button>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">

                    {/* Filters Sidebar */}
                    <div className={`lg:w-1/4 ${showFilters ? 'block' : 'hidden lg:block'}`}>
                        <div className="search-filter p-6 sticky top-24 bg-white dark:bg-dark-900 border border-gray-200 dark:border-dark-700 rounded-2xl shadow-sm">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('search.filters')}</h3>

                            {/* Price Range */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {t('search.priceRange')}
                                </label>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="number"
                                        placeholder={t('common.min')}
                                        className="w-20 p-2 border border-gray-300 dark:border-dark-700 rounded-md text-sm bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100"
                                    />
                                    <span className="text-gray-500 dark:text-gray-400">-</span>
                                    <input
                                        type="number"
                                        placeholder={t('common.max')}
                                        className="w-20 p-2 border border-gray-300 dark:border-dark-700 rounded-md text-sm bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100"
                                    />
                                </div>
                            </div>

                            {/* Rating */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('search.minRating')}</label>
                                <div className="space-y-2">
                                    {[4.5, 4.0, 3.5].map(rating => (
                                        <label key={rating} className="flex items-center text-gray-700 dark:text-gray-300">
                                            <input type="radio" name="rating" className="mr-2" />
                                            <div className="flex items-center">
                                                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                                                <span className="ml-1">{rating}+ ({Math.floor(Math.random() * 500 + 100)})</span>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Availability */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('search.availability')}</label>
                                <div className="space-y-2">
                                    <label className="flex items-center text-gray-700 dark:text-gray-300">
                                        <input type="radio" name="availability" className="mr-2" defaultChecked />
                                        <span>{t('search.availableNow')}</span>
                                    </label>
                                    <label className="flex items-center text-gray-700 dark:text-gray-300">
                                        <input type="radio" name="availability" className="mr-2" />
                                        <span>{t('search.availableToday')}</span>
                                    </label>
                                    <label className="flex items-center text-gray-700 dark:text-gray-300">
                                        <input type="radio" name="availability" className="mr-2" />
                                        <span>{t('search.availableWeek')}</span>
                                    </label>
                                </div>
                            </div>

                            {/* Languages */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('search.languages')}</label>
                                <select className="w-full p-3 border border-gray-300 dark:border-dark-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100">
                                    <option>{t('search.anyLanguage')}</option>
                                    <option>English</option>
                                    <option>Spanish</option>
                                    <option>French</option>
                                    <option>German</option>
                                    <option>Chinese</option>
                                    <option>Japanese</option>
                                    <option>Arabic</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="lg:w-3/4">

                        {/* Map Section */}
                        <div className="mb-8">
                            <div className="map-container h-96 relative rounded-xl overflow-hidden shadow-lg">
                                <GoogleMap guides={guides} />
                            </div>
                        </div>

                        {/* Results Header */}
                        <div className="flex justify-between items-center mb-6">
                            <p className="text-gray-600 dark:text-gray-300">
                                <span className="font-semibold">{guides.length}</span> {t('search.guidesFound')}
                            </p>
                            <select className="p-2 border border-gray-300 dark:border-dark-700 rounded-lg bg-white dark:bg-dark-900 text-gray-900 dark:text-gray-100">
                                <option>{t('search.sortBy')}</option>
                                <option>{t('search.sortPrice')}</option>
                                <option>{t('search.sortPriceDesc')}</option>
                                <option>{t('search.sortRating')}</option>
                                <option>{t('search.sortReviews')}</option>
                            </select>
                        </div>

                        {/* Guide Cards */}
                        <div className="space-y-6">
                            {guides.map(guide => (
                                <div key={guide.id} className="guide-card bg-white dark:bg-dark-900 rounded-xl p-6 border border-gray-200 dark:border-dark-700 transition-colors">
                                    <div className="flex flex-col md:flex-row gap-6">

                                        {/* Guide Image */}
                                        <div className="md:w-48 flex-shrink-0">
                                            <div className="relative">
                                                <img
                                                    src={guide.image}
                                                    alt={guide.name}
                                                    className="w-full md:w-48 h-48 object-cover rounded-lg"
                                                />
                                                {guide.verified && (
                                                    <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                                                        ✓ {t('search.verified')}
                                                    </div>
                                                )}
                                                <div className="absolute bottom-2 right-2 bg-white rounded-full px-2 py-1 text-xs font-medium">
                                                    {guide.availability}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Guide Info */}
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{guide.name}</h3>
                                                    <p className="text-gray-600 dark:text-gray-300 flex items-center">
                                                        <MapPin className="h-4 w-4 mr-1" />
                                                        {guide.location}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <div className="flex items-center mb-1">
                                                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                                                        <span className="ml-1 font-medium">{guide.rating}</span>
                                                        <span className="text-gray-500 dark:text-gray-400 text-sm ml-1">({guide.reviews} reviews)</span>
                                                    </div>
                                                    <p className="text-2xl font-bold text-blue-600">${guide.price}/hour</p>
                                                </div>
                                            </div>

                                            {/* Services */}
                                            <div className="mb-4">
                                                <div className="flex flex-wrap gap-2">
                                                    {guide.services.map(service => (
                                                        <span
                                                            key={service}
                                                            className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                                                        >
                              {service}
                            </span>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Languages */}
                                            <div className="mb-4">
                                                <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center">
                                                    <Globe className="h-4 w-4 mr-1" />
                                                    {t('search.speaks')}: {guide.languages.join(', ')}
                                                </p>
                                            </div>

                                            {/* Response Time */}
                                            <div className="mb-4">
                                                <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center">
                                                    <Clock className="h-4 w-4 mr-1" />
                                                    {t('search.responds')} {guide.responseTime}
                                                </p>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex gap-3">
                                                <Link
                                                    to={`/guide/${guide.id}`}
                                                    className="flex-1 bg-blue-600 text-white text-center py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                                                >
                                                    {t('search.viewProfile')}
                                                </Link>
                                                <Link
                                                    to={`/booking/${guide.id}`}
                                                    className="flex-1 border border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400 text-center py-3 px-6 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors font-medium"
                                                >
                                                    {t('search.bookNow')}
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination */}
                        <div className="flex justify-center mt-12">
                            <div className="flex space-x-2">
                                <button className="px-4 py-2 border border-gray-300 dark:border-dark-700 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-800 bg-white dark:bg-dark-900 text-gray-700 dark:text-gray-300">{t('common.previous')}</button>
                                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg">1</button>
                                <button className="px-4 py-2 border border-gray-300 dark:border-dark-700 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-800 bg-white dark:bg-dark-900 text-gray-700 dark:text-gray-300">2</button>
                                <button className="px-4 py-2 border border-gray-300 dark:border-dark-700 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-800 bg-white dark:bg-dark-900 text-gray-700 dark:text-gray-300">3</button>
                                <button className="px-4 py-2 border border-gray-300 dark:border-dark-700 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-800 bg-white dark:bg-dark-900 text-gray-700 dark:text-gray-300">{t('common.next')}</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SearchPage;
