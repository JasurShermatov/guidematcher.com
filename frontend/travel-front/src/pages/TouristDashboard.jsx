import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MessageCircle, Star, MapPin, Clock, Heart, CreditCard, Settings } from 'lucide-react';

const TouristDashboard = () => {
    const [activeTab, setActiveTab] = useState('bookings');

    const upcomingBookings = [
        {
            id: 1,
            guide: {
                name: "Elena Popova",
                avatar: "https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop",
                rating: 4.9
            },
            service: "Historical Tour Guide",
            date: "2024-03-15",
            time: "10:00 AM",
            duration: 3,
            location: "Prague, Czech Republic",
            status: "confirmed",
            total: 90
        },
        {
            id: 2,
            guide: {
                name: "Marco Silva",
                avatar: "https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop",
                rating: 4.8
            },
            service: "Food Guide",
            date: "2024-03-20",
            time: "2:00 PM",
            duration: 4,
            location: "Lisbon, Portugal",
            status: "pending",
            total: 100
        }
    ];

    const pastBookings = [
        {
            id: 3,
            guide: {
                name: "Aisha Okonkwo",
                avatar: "https://images.pexels.com/photos/1036623/pexels-photo-1036623.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop",
                rating: 5.0
            },
            service: "Cultural Guide",
            date: "2024-02-28",
            time: "9:00 AM",
            duration: 6,
            location: "Lagos, Nigeria",
            status: "completed",
            total: 120,
            reviewed: false
        }
    ];

    const favoriteGuides = [
        {
            id: 1,
            name: "Elena Popova",
            location: "Prague, Czech Republic",
            rating: 4.9,
            reviews: 127,
            avatar: "https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop",
            services: ["Tour Guide", "Photographer"]
        },
        {
            id: 2,
            name: "Yuki Tanaka",
            location: "Tokyo, Japan",
            rating: 5.0,
            reviews: 89,
            avatar: "https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop",
            services: ["Shopping Helper", "Translator"]
        }
    ];

    const paymentHistory = [
        {
            id: 1,
            date: "2024-02-28",
            description: "Cultural Guide - Aisha Okonkwo",
            amount: 120,
            status: "completed"
        },
        {
            id: 2,
            date: "2024-02-15",
            description: "Photography Tour - Chen Wei",
            amount: 180,
            status: "completed"
        },
        {
            id: 3,
            date: "2024-03-15",
            description: "Historical Tour - Elena Popova",
            amount: 90,
            status: "pending"
        }
    ];

    const renderBookingCard = (booking, isPast = false) => (
        <div key={booking.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-4">
                    <img
                        src={booking.guide.avatar}
                        alt={booking.guide.name}
                        className="w-12 h-12 rounded-full object-cover"
                    />
                    <div>
                        <h3 className="font-semibold text-gray-900">{booking.guide.name}</h3>
                        <div className="flex items-center text-sm text-gray-600">
                            <Star className="h-3 w-3 text-yellow-400 fill-current mr-1" />
                            <span>{booking.guide.rating}</span>
                        </div>
                    </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                        booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                }`}>
          {booking.status}
        </span>
            </div>

            <div className="space-y-2 mb-4">
                <p className="font-medium text-gray-900">{booking.service}</p>
                <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="h-4 w-4 mr-1" />
                    <span>{booking.location}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-1" />
                    <span>{booking.date} at {booking.time}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                    <Clock className="h-4 w-4 mr-1" />
                    <span>{booking.duration} hours</span>
                </div>
            </div>

            <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-blue-600">${booking.total}</span>
                <div className="flex space-x-2">
                    <Link
                        to="/chat"
                        className="text-blue-600 hover:text-blue-700 p-2 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                        <MessageCircle className="h-4 w-4" />
                    </Link>
                    {isPast && !booking.reviewed && (
                        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm">
                            Leave Review
                        </button>
                    )}
                    {!isPast && (
                        <Link
                            to={`/guide/${booking.guide.name.toLowerCase().replace(' ', '-')}`}
                            className="text-gray-600 hover:text-gray-700 text-sm underline"
                        >
                            View Guide
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 pt-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">My Dashboard</h1>
                    <p className="text-gray-600">Manage your bookings, guides, and travel experiences</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-xl p-6 shadow-sm">
                        <div className="flex items-center">
                            <Calendar className="h-8 w-8 text-blue-600" />
                            <div className="ml-4">
                                <p className="text-sm text-gray-600">Upcoming Bookings</p>
                                <p className="text-2xl font-bold text-gray-900">{upcomingBookings.length}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-6 shadow-sm">
                        <div className="flex items-center">
                            <Star className="h-8 w-8 text-yellow-500" />
                            <div className="ml-4">
                                <p className="text-sm text-gray-600">Reviews Given</p>
                                <p className="text-2xl font-bold text-gray-900">12</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-6 shadow-sm">
                        <div className="flex items-center">
                            <Heart className="h-8 w-8 text-red-500" />
                            <div className="ml-4">
                                <p className="text-sm text-gray-600">Favorite Guides</p>
                                <p className="text-2xl font-bold text-gray-900">{favoriteGuides.length}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-6 shadow-sm">
                        <div className="flex items-center">
                            <CreditCard className="h-8 w-8 text-green-600" />
                            <div className="ml-4">
                                <p className="text-sm text-gray-600">Total Spent</p>
                                <p className="text-2xl font-bold text-gray-900">$420</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="border-b border-gray-200 mb-8">
                    <nav className="-mb-px flex space-x-8">
                        {[
                            { id: 'bookings', label: 'My Bookings', icon: Calendar },
                            { id: 'favorites', label: 'Favorite Guides', icon: Heart },
                            { id: 'payments', label: 'Payment History', icon: CreditCard },
                            { id: 'settings', label: 'Account Settings', icon: Settings }
                        ].map(tab => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
                                        activeTab === tab.id
                                            ? 'border-blue-500 text-blue-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                                >
                                    <Icon className="h-4 w-4" />
                                    <span>{tab.label}</span>
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* Tab Content */}
                {activeTab === 'bookings' && (
                    <div className="space-y-8">

                        {/* Upcoming Bookings */}
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 mb-4">Upcoming Bookings</h2>
                            {upcomingBookings.length > 0 ? (
                                <div className="grid gap-6">
                                    {upcomingBookings.map(booking => renderBookingCard(booking))}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                    <p className="text-gray-600">No upcoming bookings</p>
                                    <Link
                                        to="/search"
                                        className="mt-4 inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        Find a Guide
                                    </Link>
                                </div>
                            )}
                        </div>

                        {/* Past Bookings */}
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 mb-4">Past Bookings</h2>
                            {pastBookings.length > 0 ? (
                                <div className="grid gap-6">
                                    {pastBookings.map(booking => renderBookingCard(booking, true))}
                                </div>
                            ) : (
                                <p className="text-gray-600 text-center py-8">No past bookings</p>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'favorites' && (
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-900">Favorite Guides</h2>
                            <Link
                                to="/search"
                                className="text-blue-600 hover:text-blue-700 font-medium"
                            >
                                Discover More Guides →
                            </Link>
                        </div>

                        {favoriteGuides.length > 0 ? (
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {favoriteGuides.map(guide => (
                                    <div key={guide.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                                        <div className="text-center mb-4">
                                            <img
                                                src={guide.avatar}
                                                alt={guide.name}
                                                className="w-20 h-20 rounded-full object-cover mx-auto mb-3"
                                            />
                                            <h3 className="font-semibold text-gray-900 mb-1">{guide.name}</h3>
                                            <div className="flex items-center justify-center text-sm text-gray-600 mb-2">
                                                <Star className="h-3 w-3 text-yellow-400 fill-current mr-1" />
                                                <span>{guide.rating} ({guide.reviews} reviews)</span>
                                            </div>
                                            <p className="text-sm text-gray-600 flex items-center justify-center">
                                                <MapPin className="h-3 w-3 mr-1" />
                                                {guide.location}
                                            </p>
                                        </div>

                                        <div className="mb-4">
                                            <div className="flex flex-wrap justify-center gap-1">
                                                {guide.services.map(service => (
                                                    <span
                                                        key={service}
                                                        className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs"
                                                    >
                            {service}
                          </span>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex space-x-2">
                                            <Link
                                                to={`/guide/${guide.id}`}
                                                className="flex-1 bg-blue-600 text-white text-center py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                                            >
                                                View Profile
                                            </Link>
                                            <Link
                                                to={`/booking/${guide.id}`}
                                                className="flex-1 border border-blue-600 text-blue-600 text-center py-2 px-4 rounded-lg hover:bg-blue-50 transition-colors text-sm"
                                            >
                                                Book Now
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <Heart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                <p className="text-gray-600 mb-4">No favorite guides yet</p>
                                <Link
                                    to="/search"
                                    className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    Discover Guides
                                </Link>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'payments' && (
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 mb-6">Payment History</h2>

                        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Date
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Description
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Amount
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                    </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                    {paymentHistory.map(payment => (
                                        <tr key={payment.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {payment.date}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {payment.description}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                ${payment.amount}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              payment.status === 'completed' ? 'bg-green-100 text-green-800' :
                                  'bg-yellow-100 text-yellow-800'
                          }`}>
                            {payment.status}
                          </span>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 mb-6">Account Settings</h2>

                        <div className="grid lg:grid-cols-2 gap-8">
                            {/* Profile Settings */}
                            <div className="bg-white rounded-lg p-6 shadow-sm">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                                        <input
                                            type="text"
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            placeholder="John Doe"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                                        <input
                                            type="email"
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            placeholder="john@example.com"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                                        <input
                                            type="tel"
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            placeholder="+1 (555) 123-4567"
                                        />
                                    </div>
                                    <button className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors">
                                        Update Profile
                                    </button>
                                </div>
                            </div>

                            {/* Preferences */}
                            <div className="bg-white rounded-lg p-6 shadow-sm">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Preferences</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Language</label>
                                        <select className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                            <option>English</option>
                                            <option>Spanish</option>
                                            <option>French</option>
                                            <option>German</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                                        <select className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                            <option>USD ($)</option>
                                            <option>EUR (€)</option>
                                            <option>GBP (£)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="block text-sm font-medium text-gray-700">Notifications</label>
                                        <div className="space-y-2">
                                            <label className="flex items-center">
                                                <input type="checkbox" className="mr-2" defaultChecked />
                                                <span className="text-sm text-gray-700">Email notifications</span>
                                            </label>
                                            <label className="flex items-center">
                                                <input type="checkbox" className="mr-2" defaultChecked />
                                                <span className="text-sm text-gray-700">SMS notifications</span>
                                            </label>
                                            <label className="flex items-center">
                                                <input type="checkbox" className="mr-2" />
                                                <span className="text-sm text-gray-700">Marketing emails</span>
                                            </label>
                                        </div>
                                    </div>
                                    <button className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors">
                                        Save Preferences
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TouristDashboard;