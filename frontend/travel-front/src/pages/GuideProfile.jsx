import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Star, MapPin, Clock, Globe, Shield, MessageCircle, Award } from 'lucide-react';

const GuideProfile = () => {
    const { id } = useParams();

    const guide = {
        id: 1,
        name: 'Elena Popova',
        location: 'Prague, Czech Republic',
        rating: 4.9,
        reviews: 127,
        responseTime: 'within 1 hour',
        memberSince: '2019',
        languages: ['English', 'Czech', 'German'],
        avatar:
            'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
        verified: true,
        bio: "Hello! I'm Elena, a passionate local guide with over 5 years of experience showing visitors the hidden gems of Prague. I specialize in historical tours, photography services, and cultural experiences. I love sharing stories about Czech culture and helping travelers create unforgettable memories.",
        services: [
            { name: 'Historical Tour Guide', price: 30, duration: '2-4 hours', description: "Discover Prague's rich history with personalized tours" },
            { name: 'Photography Services', price: 45, duration: '1-3 hours', description: 'Professional photo sessions at iconic locations' },
            { name: 'Cultural Experience', price: 25, duration: '3-5 hours', description: 'Immerse yourself in local Czech culture and traditions' },
            { name: 'Food & Drink Tour', price: 35, duration: '3-4 hours', description: 'Taste authentic Czech cuisine and local specialties' }
        ],
        gallery: [
            'https://images.pexels.com/photos/2607544/pexels-photo-2607544.jpeg?auto=compress&cs=tinysrgb&w=300&h=200&fit=crop',
            'https://images.pexels.com/photos/1388030/pexels-photo-1388030.jpeg?auto=compress&cs=tinysrgb&w=300&h=200&fit=crop',
            'https://images.pexels.com/photos/338515/pexels-photo-338515.jpeg?auto=compress&cs=tinysrgb&w=300&h=200&fit=crop',
            'https://images.pexels.com/photos/1461974/pexels-photo-1461974.jpeg?auto=compress&cs=tinysrgb&w=300&h=200&fit=crop'
        ],
        availability: {
            today: true,
            thisWeek: ['Monday', 'Tuesday', 'Friday', 'Saturday'],
            nextWeek: ['Wednesday', 'Thursday', 'Friday', 'Sunday']
        }
    };

    const reviews = [
        {
            id: 1,
            author: 'Sarah Johnson',
            rating: 5,
            date: '2 weeks ago',
            comment:
                "Elena was absolutely fantastic! She showed us parts of Prague we never would have found on our own. Her English is perfect and she's incredibly knowledgeable about Czech history.",
            avatar:
                'https://images.pexels.com/photos/1036623/pexels-photo-1036623.jpeg?auto=compress&cs=tinysrgb&w=60&h=60&fit=crop'
        },
        {
            id: 2,
            author: 'Marco Rodriguez',
            rating: 5,
            date: '1 month ago',
            comment:
                'Amazing photography session! Elena knows all the best spots for photos and helped us capture beautiful memories. Highly recommend!',
            avatar:
                'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=60&h=60&fit=crop'
        },
        {
            id: 3,
            author: 'Lisa Chen',
            rating: 4,
            date: '2 months ago',
            comment:
                'Great cultural experience! Elena is very friendly and professional. The food tour was delicious and we learned so much about Czech culture.',
            avatar:
                'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=60&h=60&fit=crop'
        }
    ];

    return (
        <div className="min-h-screen bg-gray-50 pt-8">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Guide Header */}
                <div className="bg-white rounded-2xl p-8 mb-8 shadow-sm">
                    <div className="flex flex-col lg:flex-row gap-8">
                        {/* Guide Avatar & Basic Info */}
                        <div className="lg:w-1/3">
                            <div className="relative inline-block">
                                <img
                                    src={guide.avatar}
                                    alt={guide.name}
                                    className="w-48 h-48 rounded-2xl object-cover mx-auto lg:mx-0"
                                />
                                {guide.verified && (
                                    <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-2">
                                        <Shield className="h-4 w-4" />
                                    </div>
                                )}
                            </div>

                            <div className="mt-6 text-center lg:text-left">
                                <div className="flex items-center justify-center lg:justify-start space-x-2 mb-2">
                                    <Star className="h-5 w-5 text-yellow-400 fill-current" />
                                    <span className="font-bold text-lg">{guide.rating}</span>
                                    <span className="text-gray-600">({guide.reviews} reviews)</span>
                                </div>

                                <div className="space-y-2 text-sm text-gray-600">
                                    <p className="flex items-center justify-center lg:justify-start">
                                        <MapPin className="h-4 w-4 mr-2" />
                                        {guide.location}
                                    </p>
                                    <p className="flex items-center justify-center lg:justify-start">
                                        <Clock className="h-4 w-4 mr-2" />
                                        Responds {guide.responseTime}
                                    </p>
                                    <p className="flex items-center justify-center lg:justify-start">
                                        <Award className="h-4 w-4 mr-2" />
                                        Member since {guide.memberSince}
                                    </p>
                                    <p className="flex items-center justify-center lg:justify-start">
                                        <Globe className="h-4 w-4 mr-2" />
                                        {guide.languages.join(', ')}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Guide Details */}
                        <div className="lg:w-2/3">
                            <div className="flex flex-col lg:flex-row justify-between items-start mb-6">
                                <div>
                                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{guide.name}</h1>
                                    <p className="text-xl text-blue-600 font-medium">Professional Local Guide</p>
                                </div>

                                <div className="flex gap-3 mt-4 lg:mt-0">
                                    <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                                        <MessageCircle className="h-4 w-4" />
                                        <span>Message</span>
                                    </button>
                                    <Link
                                        to={`/booking/${guide.id}`}
                                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                                    >
                                        Book Now
                                    </Link>
                                </div>
                            </div>

                            <div className="mb-8">
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">About Me</h3>
                                <p className="text-gray-700 leading-relaxed">{guide.bio}</p>
                            </div>

                            {/* Quick Stats */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="text-center p-4 bg-blue-50 rounded-lg">
                                    <div className="text-2xl font-bold text-blue-600">{guide.reviews}</div>
                                    <div className="text-sm text-gray-600">Reviews</div>
                                </div>
                                <div className="text-center p-4 bg-green-50 rounded-lg">
                                    <div className="text-2xl font-bold text-green-600">98%</div>
                                    <div className="text-sm text-gray-600">Response Rate</div>
                                </div>
                                <div className="text-center p-4 bg-orange-50 rounded-lg">
                                    <div className="text-2xl font-bold text-orange-600">5+</div>
                                    <div className="text-sm text-gray-600">Years Experience</div>
                                </div>
                                <div className="text-center p-4 bg-purple-50 rounded-lg">
                                    <div className="text-2xl font-bold text-purple-600">3</div>
                                    <div className="text-sm text-gray-600">Languages</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Services */}
                <div className="bg-white rounded-2xl p-8 mb-8 shadow-sm">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">My Services</h2>
                    <div className="grid md:grid-cols-2 gap-6">
                        {guide.services.map((service, index) => (
                            <div key={index} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-3">
                                    <h3 className="text-lg font-semibold text-gray-900">{service.name}</h3>
                                    <span className="text-xl font-bold text-blue-600">${service.price}/hr</span>
                                </div>
                                <p className="text-gray-600 mb-3">{service.description}</p>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-500">Duration: {service.duration}</span>
                                    <Link
                                        to={`/booking/${guide.id}?service=${encodeURIComponent(service.name)}`}
                                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                                    >
                                        Book This Service
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Availability */}
                <div className="bg-white rounded-2xl p-8 mb-8 shadow-sm">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Availability</h2>
                    <div className="grid md:grid-cols-3 gap-6">
                        <div>
                            <h3 className="font-semibold text-gray-900 mb-3">Today</h3>
                            <div className="flex items-center space-x-2">
                                <div className={`w-3 h-3 rounded-full ${guide.availability.today ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                <span className="text-sm text-gray-600">
                  {guide.availability.today ? 'Available' : 'Busy'}
                </span>
                            </div>
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900 mb-3">This Week</h3>
                            <div className="space-y-1">
                                {guide.availability.thisWeek.map((day) => (
                                    <div key={day} className="flex items-center space-x-2">
                                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                        <span className="text-sm text-gray-600">{day}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900 mb-3">Next Week</h3>
                            <div className="space-y-1">
                                {guide.availability.nextWeek.map((day) => (
                                    <div key={day} className="flex items-center space-x-2">
                                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                        <span className="text-sm text-gray-600">{day}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Reviews */}
                <div className="bg-white rounded-2xl p-8 mb-8 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">Reviews ({guide.reviews})</h2>
                        <div className="flex items-center space-x-2">
                            <Star className="h-5 w-5 text-yellow-400 fill-current" />
                            <span className="font-bold">{guide.rating}</span>
                            <span className="text-gray-600">average</span>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {reviews.map((review) => (
                            <div key={review.id} className="border-b border-gray-100 pb-6 last:border-b-0">
                                <div className="flex items-start space-x-4">
                                    <img
                                        src={review.avatar}
                                        alt={review.author}
                                        className="w-12 h-12 rounded-full object-cover"
                                    />
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="font-semibold text-gray-900">{review.author}</h4>
                                            <span className="text-sm text-gray-500">{review.date}</span>
                                        </div>
                                        <div className="flex items-center mb-2">
                                            {Array.from({ length: review.rating }).map((_, i) => (
                                                <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                                            ))}
                                        </div>
                                        <p className="text-gray-700">{review.comment}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="text-center mt-6">
                        <button className="text-blue-600 hover:text-blue-700 font-medium">
                            View All Reviews
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GuideProfile;
