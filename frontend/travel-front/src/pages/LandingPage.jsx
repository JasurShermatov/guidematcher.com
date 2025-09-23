import React from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, Star, Clock, Shield, Globe, Camera, Car, ShoppingBag, Users, Play, ArrowRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const LandingPage = () => {
    const { t } = useLanguage();

    const topGuides = [
        {
            id: 1,
            name: "Maria Rodriguez",
            location: "Barcelona, Spain",
            rating: 4.9,
            reviews: 156,
            services: ["Tour Guide", "Translator", "Photographer"],
            price: "$35/hour",
            image: "https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop"
        },
        {
            id: 2,
            name: "Ahmed Hassan",
            location: "Cairo, Egypt",
            rating: 4.8,
            reviews: 203,
            services: ["Tour Guide", "Fixer", "Cultural Expert"],
            price: "$25/hour",
            image: "https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop"
        },
        {
            id: 3,
            name: "Yuki Tanaka",
            location: "Tokyo, Japan",
            rating: 5.0,
            reviews: 89,
            services: ["Shopping Helper", "Translator", "Food Guide"],
            price: "$40/hour",
            image: "https://images.pexels.com/photos/1036623/pexels-photo-1036623.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop"
        }
    ];

    const popularServices = [
        { name: t('service.tourGuide'), icon: <MapPin className="h-6 w-6" />, count: "2,500+ guides" },
        { name: t('service.translator'), icon: <Globe className="h-6 w-6" />, count: "1,800+ guides" },
        { name: t('service.photographer'), icon: <Camera className="h-6 w-6" />, count: "950+ guides" },
        { name: t('service.driver'), icon: <Car className="h-6 w-6" />, count: "1,200+ guides" },
        { name: t('service.shoppingHelper'), icon: <ShoppingBag className="h-6 w-6" />, count: "650+ guides" },
        { name: t('service.groupTours'), icon: <Users className="h-6 w-6" />, count: "300+ guides" }
    ];

    const featuredCities = [
        { name: "Paris", country: "France", guides: 150, image: "https://images.pexels.com/photos/338515/pexels-photo-338515.jpeg?auto=compress&cs=tinysrgb&w=300&h=200&fit=crop" },
        { name: "Tokyo", country: "Japan", guides: 120, image: "https://images.pexels.com/photos/248195/pexels-photo-248195.jpeg?auto=compress&cs=tinysrgb&w=300&h=200&fit=crop" },
        { name: "New York", country: "USA", guides: 200, image: "https://images.pexels.com/photos/290386/pexels-photo-290386.jpeg?auto=compress&cs=tinysrgb&w=300&h=200&fit=crop" },
        { name: "Barcelona", country: "Spain", guides: 95, image: "https://images.pexels.com/photos/1388030/pexels-photo-1388030.jpeg?auto=compress&cs=tinysrgb&w=300&h=200&fit=crop" }
    ];

    return (
        <div className="min-h-screen">
            {/* Hero Section */}
            <section className="relative overflow-hidden py-12" style={{
                backgroundImage: 'url(https://images.pexels.com/photos/1371360/pexels-photo-1371360.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
            }}>
                {/* Dark overlay for text readability */}
                <div className="absolute inset-0 bg-black/40"></div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20">
                    <div className="grid lg:grid-cols-2 gap-12 items-center relative z-10">

                        {/* Left Side - Content & Search */}
                        <div className="space-y-8">
                            <div className="space-y-6">
                                <h1 className="text-5xl lg:text-6xl font-bold text-white leading-tight">
                                    {t('landing.hero.title')}
                                    <span className="text-blue-300 block">{t('landing.hero.subtitle')}</span>
                                </h1>
                                <p className="text-xl text-gray-100 leading-relaxed">
                                    {t('landing.hero.description')}
                                </p>
                            </div>

                            {/* Search Form */}
                            {/* Search Form (side-by-side on md+) */}
                            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
                                <div className="space-y-4 md:space-y-0 md:flex md:items-stretch md:gap-4">
                                    {/* Input */}
                                    <div className="relative flex-1">
                                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder={t('landing.hero.whereTo')}
                                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>

                                    {/* Button */}
                                    <Link
                                        to="/search"
                                        className="w-full md:w-auto bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium inline-flex items-center justify-center"
                                    >
                                        {t('landing.hero.searchGuides')}
                                    </Link>
                                </div>
                            </div>


                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-6">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-blue-300">10,000+</div>
                                    <div className="text-sm text-gray-200">{t('landing.hero.verifiedGuides')}</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-blue-300">150+</div>
                                    <div className="text-sm text-gray-200">{t('landing.hero.countries')}</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-blue-300">4.9★</div>
                                    <div className="text-sm text-gray-200">{t('landing.hero.averageRating')}</div>
                                </div>
                            </div>
                        </div>

                        {/* Right Side - Interactive Images */}
                        <div className="relative">
                            {/* Main Featured Image */}
                            <div className="relative group cursor-pointer">
                                <img
                                    src="https://images.pexels.com/photos/338515/pexels-photo-338515.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop"
                                    alt="Paris Experience"
                                    className="w-full h-96 object-cover rounded-2xl shadow-lg group-hover:shadow-xl transition-shadow"
                                />
                                <div className="absolute inset-0 bg-black/20 rounded-2xl group-hover:bg-black/10 transition-colors"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="bg-white/90 backdrop-blur-sm rounded-full p-4 group-hover:scale-110 transition-transform">
                                        <Play className="h-8 w-8 text-blue-600" />
                                    </div>
                                </div>
                            </div>


                            <div className="absolute -bottom-4 -left-4 bg-white rounded-xl p-4 shadow-lg animate-float animation-delay-2000">
                                <div className="text-center">
                                    <div className="text-lg font-bold text-blue-600">50+</div>
                                    <p className="text-xs text-gray-600">Services</p>
                                </div>
                            </div>

                            <div className="absolute top-1/2 -left-6 bg-white rounded-xl p-3 shadow-lg animate-float animation-delay-3000">
                                <div className="flex items-center space-x-2">
                                    <Globe className="h-5 w-5 text-green-600" />
                                    <span className="text-sm font-medium">24/7</span>
                                </div>
                            </div>

                            {/* Background Decorative Elements */}
                            <div className="absolute -z-10 top-10 right-10 w-32 h-32 bg-blue-100 rounded-full blur-3xl opacity-50"></div>
                            <div className="absolute -z-10 bottom-10 left-10 w-24 h-24 bg-orange-100 rounded-full blur-2xl opacity-50"></div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Top Guides Section */}
            <section className="py-20 bg-white dark:bg-dark-900 transition-colors">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">{t('landing.topGuides.title')}</h2>
                        <p className="text-xl text-gray-600 dark:text-gray-300">{t('landing.topGuides.description')}</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {topGuides.map(guide => (
                            <Link
                                key={guide.id}
                                to={`/guide/${guide.id}`}
                                className="guide-card bg-white dark:bg-dark-800 rounded-2xl overflow-hidden transition-colors"
                            >
                                <div className="relative">
                                    <img
                                        src={guide.image}
                                        alt={guide.name}
                                        className="w-full h-64 object-cover"
                                    />
                                    <div className="absolute top-4 right-4 bg-white rounded-full px-3 py-1 flex items-center space-x-1">
                                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                                        <span className="text-sm font-medium">{guide.rating}</span>
                                    </div>
                                </div>

                                <div className="p-6">
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{guide.name}</h3>
                                    <p className="text-gray-600 dark:text-gray-300 mb-3 flex items-center">
                                        <MapPin className="h-4 w-4 mr-1" />
                                        {guide.location}
                                    </p>
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {guide.services.map(service => (
                                            <span key={service} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                        {service}
                      </span>
                                        ))}
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-lg font-bold text-blue-600">{guide.price}</span>
                                        <span className="text-sm text-gray-500 dark:text-gray-400">{guide.reviews} reviews</span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* Popular Services */}
            <section className="py-20 bg-gray-50 dark:bg-dark-950 transition-colors">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">{t('landing.services.title')}</h2>
                        <p className="text-xl text-gray-600 dark:text-gray-300">{t('landing.services.description')}</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                        {popularServices.map(service => (
                            <div key={service.name} className="service-card bg-white dark:bg-dark-900 rounded-xl p-6 text-center cursor-pointer transition-colors">
                                <div className="text-blue-600 mb-4 flex justify-center">
                                    {service.icon}
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{service.name}</h3>
                                <p className="text-gray-600 dark:text-gray-300">{service.count}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Featured Cities */}
            <section className="py-20 bg-white dark:bg-dark-900 transition-colors">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">{t('landing.cities.title')}</h2>
                        <p className="text-xl text-gray-600 dark:text-gray-300">{t('landing.cities.description')}</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {featuredCities.map(city => (
                            <div key={city.name} className="group cursor-pointer">
                                <div className="relative overflow-hidden rounded-xl">
                                    <img
                                        src={city.image}
                                        alt={city.name}
                                        className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-300"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                                    <div className="absolute bottom-4 left-4 text-white">
                                        <h3 className="text-lg font-bold">{city.name}</h3>
                                        <p className="text-sm opacity-90">{city.country}</p>
                                        <p className="text-xs opacity-75">{city.guides} guides available</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-20 bg-blue-600 dark:bg-blue-800 transition-colors">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold text-white mb-4">{t('landing.features.title')}</h2>
                        <p className="text-xl text-blue-100 dark:text-blue-200">{t('landing.features.description')}</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="text-center text-white">
                            <Shield className="h-12 w-12 mx-auto mb-4" />
                            <h3 className="text-xl font-bold mb-3">{t('landing.features.verified')}</h3>
                            <p className="text-blue-100 dark:text-blue-200">{t('landing.features.verifiedDesc')}</p>
                        </div>
                        <div className="text-center text-white">
                            <Clock className="h-12 w-12 mx-auto mb-4" />
                            <h3 className="text-xl font-bold mb-3">{t('landing.features.support')}</h3>
                            <p className="text-blue-100 dark:text-blue-200">{t('landing.features.supportDesc')}</p>
                        </div>
                        <div className="text-center text-white">
                            <Globe className="h-12 w-12 mx-auto mb-4" />
                            <h3 className="text-xl font-bold mb-3">{t('landing.features.global')}</h3>
                            <p className="text-blue-100 dark:text-blue-200">{t('landing.features.globalDesc')}</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-white dark:bg-dark-900 transition-colors">
                <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
                    <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">{t('landing.cta.title')}</h2>
                    <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
                        {t('landing.cta.description')}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            to="/search"
                            className="bg-blue-600 text-white px-8 py-4 rounded-lg hover:bg-blue-700 transition-colors text-lg font-medium"
                        >
                            {t('landing.cta.findGuide')}
                        </Link>
                        <Link
                            to="/auth"
                            className="border border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400 px-8 py-4 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-lg font-medium"
                        >
                            {t('landing.cta.becomeGuide')}
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default LandingPage;