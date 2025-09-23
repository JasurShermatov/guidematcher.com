import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Calendar, DollarSign, Star, Users, MessageCircle, Settings, Edit3, Eye, Clock, TrendingUp,
    MapPin, Upload, Camera, Wallet, PieChart, Activity, CheckCircle, AlertCircle,
    Plus, Filter, Download, BarChart3, Target, User as UserIcon
} from 'lucide-react';

const GuideDashboard = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const [showNotifications, setShowNotifications] = useState(false);
    const [selectedProfileImage, setSelectedProfileImage] = useState(null);
    const [isUploadingImage, setIsUploadingImage] = useState(false);

    // Sample data
    const guideProfile = {
        name: 'Elena Popova',
        avatar:
            'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop',
        rating: 4.9,
        totalReviews: 127,
        location: 'Prague, Czech Republic',
        verified: true,
        memberSince: '2019',
        languages: ['English', 'Czech', 'German'],
        responseRate: 98,
        completionRate: 99,
    };

    const todaySchedule = [
        {
            id: 1,
            time: '10:00 AM',
            tourist: 'John Smith',
            country: 'USA',
            service: 'Historical Tour',
            location: 'Old Town Square',
            duration: 3,
            status: 'confirmed',
        },
        {
            id: 2,
            time: '2:30 PM',
            tourist: 'Maria Garcia',
            country: 'Spain',
            service: 'Photography Session',
            location: 'Charles Bridge',
            duration: 2,
            status: 'confirmed',
        },
    ];

    const upcomingBookings = [
        {
            id: 1,
            tourist: {
                name: 'Sarah Johnson',
                avatar:
                    'https://images.pexels.com/photos/1036623/pexels-photo-1036623.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
                country: 'USA',
            },
            service: 'Historical Tour Guide',
            date: '2024-03-20',
            time: '10:00 AM',
            duration: 3,
            guests: 2,
            price: 90,
            status: 'pending',
            message:
                "Hi! We're visiting Prague for the first time and would love a historical tour.",
        },
        {
            id: 2,
            tourist: {
                name: 'Marco Rodriguez',
                avatar:
                    'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
                country: 'Mexico',
            },
            service: 'Photography Services',
            date: '2024-03-22',
            time: '2:00 PM',
            duration: 2,
            guests: 1,
            price: 90,
            status: 'confirmed',
        },
    ];

    const earnings = {
        totalBalance: 2450,
        thisMonth: 1250,
        lastMonth: 980,
        pendingPayout: 450,
        completedBookings: 23,
        averageBookingValue: 85,
        growthRate: 28,
    };

    const analytics = {
        bookingsThisWeek: 8,
        bookingsThisMonth: 23,
        popularServices: [
            { name: 'Historical Tours', bookings: 45, percentage: 35 },
            { name: 'Photography', bookings: 32, percentage: 25 },
            { name: 'Cultural Experience', bookings: 28, percentage: 22 },
            { name: 'Food Tours', bookings: 23, percentage: 18 },
        ],
        monthlyEarnings: [
            { month: 'Jan', amount: 850 },
            { month: 'Feb', amount: 980 },
            { month: 'Mar', amount: 1250 },
        ],
    };

    const notifications = [
        { id: 1, type: 'booking', message: 'New booking request from Sarah Johnson', time: '5 min ago', unread: true },
        { id: 2, type: 'payment', message: 'Payment received: $90', time: '1 hour ago', unread: true },
        { id: 3, type: 'review', message: 'New 5-star review from Marco', time: '2 hours ago', unread: false },
        { id: 4, type: 'reminder', message: 'Tour starts in 30 minutes', time: '3 hours ago', unread: false },
    ];

    const services = [
        { id: 1, name: 'Historical Tour Guide', price: 30, active: true, bookings: 45 },
        { id: 2, name: 'Photography Services', price: 45, active: true, bookings: 32 },
        { id: 3, name: 'Cultural Experience', price: 25, active: true, bookings: 28 },
        { id: 4, name: 'Food & Drink Tour', price: 35, active: false, bookings: 0 },
    ];

    const handleBookingAction = (bookingId, action) => {
        console.log(`${action} booking ${bookingId}`);
    };

    const handleProfileImageUpload = (event) => {
        const file = event.target.files && event.target.files[0];
        if (file) {
            // Validate file size (5MB limit)
            if (file.size > 5 * 1024 * 1024) {
                alert('File size must be less than 5MB');
                return;
            }

            // Validate file type
            if (!file.type.match(/^image\/(jpeg|jpg|png|gif)$/)) {
                alert('Please select a valid image file (JPG, PNG, or GIF)');
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const res = e && e.target ? e.target.result : null;
                setSelectedProfileImage(res ? res.toString() : null);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveProfileImage = () => {
        if (selectedProfileImage) {
            setIsUploadingImage(true);

            // Simulate upload process
            setTimeout(() => {
                // Update the guide profile avatar (note: this mutates sample object)
                guideProfile.avatar = selectedProfileImage;
                setSelectedProfileImage(null);
                setIsUploadingImage(false);
                alert('Profile picture updated successfully!');
            }, 1500);
        }
    };

    const handleRemoveProfileImage = () => {
        setSelectedProfileImage(null);
        guideProfile.avatar =
            'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop';
        alert('Profile picture removed successfully!');
    };

    const StatCard = ({ icon: Icon, title, value, subtitle, color = 'blue' }) => (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg bg-${color}-100`}>
                    <Icon className={`h-6 w-6 text-${color}-600`} />
                </div>
                <span className="text-xs text-gray-500">+12%</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">{value}</h3>
            <p className="text-sm text-gray-600">{title}</p>
            {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 pt-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Page Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Guide Dashboard</h1>
                    <p className="text-gray-600">Manage your bookings, profile, and earnings</p>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Sidebar Navigation */}
                    <div className="lg:w-64 flex-shrink-0">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                            <nav className="space-y-2">
                                {[
                                    { id: 'overview', label: 'Overview', icon: TrendingUp },
                                    { id: 'bookings', label: 'Bookings', icon: Calendar },
                                    { id: 'profile', label: 'Profile & Services', icon: UserIcon },
                                    { id: 'chat', label: 'Messages', icon: MessageCircle },
                                    { id: 'earnings', label: 'Earnings', icon: DollarSign },
                                    { id: 'reviews', label: 'Reviews', icon: Star },
                                    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
                                    { id: 'settings', label: 'Settings', icon: Settings },
                                ].map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => setActiveTab(item.id)}
                                            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                                                activeTab === item.id
                                                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                                                    : 'text-gray-700 hover:bg-gray-50'
                                            }`}
                                        >
                                            <Icon className="h-5 w-5" />
                                            <span className="font-medium">{item.label}</span>
                                        </button>
                                    );
                                })}
                            </nav>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1">
                        {/* Overview Tab */}
                        {activeTab === 'overview' && (
                            <div className="space-y-8">
                                {/* Welcome Section */}
                                <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-white">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h2 className="text-2xl font-bold mb-2">
                                                Welcome back, {guideProfile.name}!
                                            </h2>
                                            <p className="text-blue-100">
                                                You have {todaySchedule.length} tours scheduled for today
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-3xl font-bold">{guideProfile.rating}★</div>
                                            <p className="text-blue-100">Your Rating</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Quick Stats */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                    <StatCard
                                        icon={Calendar}
                                        title="Active Bookings"
                                        value={upcomingBookings.length}
                                        color="blue"
                                    />
                                    <StatCard
                                        icon={DollarSign}
                                        title="This Month"
                                        value={`$${earnings.thisMonth}`}
                                        subtitle={`+${earnings.growthRate}% from last month`}
                                        color="green"
                                    />
                                    <StatCard
                                        icon={Star}
                                        title="Average Rating"
                                        value={guideProfile.rating}
                                        subtitle={`${guideProfile.totalReviews} reviews`}
                                        color="yellow"
                                    />
                                    <StatCard
                                        icon={MessageCircle}
                                        title="Response Rate"
                                        value={`${guideProfile.responseRate}%`}
                                        subtitle="Last 30 days"
                                        color="purple"
                                    />
                                </div>

                                {/* Today's Schedule */}
                                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                        Today&apos;s Schedule
                                    </h3>
                                    {todaySchedule.length > 0 ? (
                                        <div className="space-y-4">
                                            {todaySchedule.map((appointment) => (
                                                <div
                                                    key={appointment.id}
                                                    className="flex items-center justify-between p-4 bg-blue-50 rounded-lg"
                                                >
                                                    <div className="flex items-center space-x-4">
                                                        <div className="text-center">
                                                            <div className="text-lg font-bold text-blue-600">
                                                                {appointment.time}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <h4 className="font-semibold text-gray-900">
                                                                {appointment.tourist}
                                                            </h4>
                                                            <p className="text-sm text-gray-600">
                                                                {appointment.service} • {appointment.duration}h
                                                            </p>
                                                            <p className="text-sm text-gray-500 flex items-center">
                                                                <MapPin className="h-3 w-3 mr-1" />
                                                                {appointment.location}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                              {appointment.status}
                            </span>
                                                        <Link to="/chat" className="text-blue-600 hover:text-blue-700">
                                                            <MessageCircle className="h-5 w-5" />
                                                        </Link>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-600 text-center py-8">
                                            No tours scheduled for today
                                        </p>
                                    )}
                                </div>

                                {/* Recent Booking Requests */}
                                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-semibold text-gray-900">
                                            Recent Booking Requests
                                        </h3>
                                        <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm">
                      {upcomingBookings.filter((b) => b.status === 'pending').length} pending
                    </span>
                                    </div>

                                    <div className="space-y-4">
                                        {upcomingBookings.slice(0, 3).map((booking) => (
                                            <div key={booking.id} className="border border-gray-200 rounded-lg p-4">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center space-x-3">
                                                        <img
                                                            src={booking.tourist.avatar}
                                                            alt={booking.tourist.name}
                                                            className="w-10 h-10 rounded-full object-cover"
                                                        />
                                                        <div>
                                                            <h4 className="font-semibold text-gray-900">
                                                                {booking.tourist.name}
                                                            </h4>
                                                            <p className="text-sm text-gray-600">{booking.service}</p>
                                                        </div>
                                                    </div>
                                                    <span className="text-lg font-bold text-blue-600">
                            ${booking.price}
                          </span>
                                                </div>
                                                <p className="text-sm text-gray-600 mb-3">
                                                    {booking.date} • {booking.duration}h • {booking.guests} guest(s)
                                                </p>
                                                {booking.status === 'pending' && (
                                                    <div className="flex space-x-2">
                                                        <button
                                                            onClick={() => handleBookingAction(booking.id, 'accept')}
                                                            className="flex-1 bg-green-600 text-white py-2 px-3 rounded-lg hover:bg-green-700 transition-colors text-sm"
                                                        >
                                                            Accept
                                                        </button>
                                                        <button
                                                            onClick={() => handleBookingAction(booking.id, 'decline')}
                                                            className="flex-1 border border-gray-300 text-gray-700 py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                                                        >
                                                            Decline
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Bookings Tab */}
                        {activeTab === 'bookings' && (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-2xl font-bold text-gray-900">Booking Management</h2>
                                    <div className="flex space-x-2">
                                        <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                                            <Filter className="h-4 w-4 mr-2 inline" />
                                            Filter
                                        </button>
                                        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                                            <Calendar className="h-4 w-4 mr-2 inline" />
                                            Calendar View
                                        </button>
                                    </div>
                                </div>

                                {/* Booking Requests */}
                                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Pending Requests</h3>
                                    <div className="space-y-4">
                                        {upcomingBookings
                                            .filter((b) => b.status === 'pending')
                                            .map((booking) => (
                                                <div key={booking.id} className="border border-gray-200 rounded-lg p-6">
                                                    <div className="flex items-start justify-between mb-4">
                                                        <div className="flex items-center space-x-4">
                                                            <img
                                                                src={booking.tourist.avatar}
                                                                alt={booking.tourist.name}
                                                                className="w-12 h-12 rounded-full object-cover"
                                                            />
                                                            <div>
                                                                <h4 className="font-semibold text-gray-900">
                                                                    {booking.tourist.name}
                                                                </h4>
                                                                <p className="text-sm text-gray-600">{booking.tourist.country}</p>
                                                                <p className="text-sm text-blue-600">{booking.service}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-2xl font-bold text-green-600">
                                                                ${booking.price}
                                                            </p>
                                                            <p className="text-sm text-gray-500">{booking.duration} hours</p>
                                                        </div>
                                                    </div>

                                                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                                                        <div>
                                                            <p className="text-sm text-gray-600">Date & Time</p>
                                                            <p className="font-medium">
                                                                {booking.date} at {booking.time}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm text-gray-600">Guests</p>
                                                            <p className="font-medium">{booking.guests} person(s)</p>
                                                        </div>
                                                    </div>

                                                    {booking.message && (
                                                        <div className="bg-gray-50 p-3 rounded-lg mb-4">
                                                            <p className="text-sm text-gray-700 italic">
                                                                &quot;{booking.message}&quot;
                                                            </p>
                                                        </div>
                                                    )}

                                                    <div className="flex space-x-3">
                                                        <button
                                                            onClick={() => handleBookingAction(booking.id, 'accept')}
                                                            className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium"
                                                        >
                                                            Accept Booking
                                                        </button>
                                                        <button
                                                            onClick={() => handleBookingAction(booking.id, 'decline')}
                                                            className="flex-1 border border-red-600 text-red-600 py-3 px-4 rounded-lg hover:bg-red-50 transition-colors font-medium"
                                                        >
                                                            Decline
                                                        </button>
                                                        <Link
                                                            to="/chat"
                                                            className="px-4 py-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                                                        >
                                                            <MessageCircle className="h-5 w-5" />
                                                        </Link>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                </div>

                                {/* Confirmed Bookings */}
                                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirmed Bookings</h3>
                                    <div className="space-y-4">
                                        {upcomingBookings
                                            .filter((b) => b.status === 'confirmed')
                                            .map((booking) => (
                                                <div
                                                    key={booking.id}
                                                    className="border border-green-200 bg-green-50 rounded-lg p-4"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center space-x-3">
                                                            <img
                                                                src={booking.tourist.avatar}
                                                                alt={booking.tourist.name}
                                                                className="w-10 h-10 rounded-full object-cover"
                                                            />
                                                            <div>
                                                                <h4 className="font-semibold text-gray-900">
                                                                    {booking.tourist.name}
                                                                </h4>
                                                                <p className="text-sm text-gray-600">{booking.service}</p>
                                                                <p className="text-sm text-gray-500">
                                                                    {booking.date} • {booking.time}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center space-x-2">
                              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                                Confirmed
                              </span>
                                                            <Link to="/chat" className="text-blue-600 hover:text-blue-700">
                                                                <MessageCircle className="h-5 w-5" />
                                                            </Link>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Profile & Services Tab */}
                        {activeTab === 'profile' && (
                            <div className="space-y-8">
                                <h2 className="text-2xl font-bold text-gray-900">Profile & Services</h2>

                                {/* Profile Information */}
                                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-lg font-semibold text-gray-900">Profile Information</h3>
                                        <button className="text-blue-600 hover:text-blue-700 flex items-center space-x-1">
                                            <Edit3 className="h-4 w-4" />
                                            <span>Edit</span>
                                        </button>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Profile Photo
                                                </label>
                                                <div className="flex items-center space-x-4">
                                                    <img
                                                        src={guideProfile.avatar}
                                                        alt="Profile"
                                                        className="w-20 h-20 rounded-full object-cover"
                                                    />
                                                    <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
                                                        <Camera className="h-4 w-4" />
                                                        <span>Change Photo</span>
                                                    </button>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Full Name
                                                </label>
                                                <input
                                                    type="text"
                                                    defaultValue={guideProfile.name}
                                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Location
                                                </label>
                                                <input
                                                    type="text"
                                                    defaultValue={guideProfile.location}
                                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                                                <textarea
                                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    rows={4}
                                                    defaultValue="Hello! I'm Elena, a passionate local guide with over 5 years of experience showing visitors the hidden gems of Prague."
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Languages
                                                </label>
                                                <input
                                                    type="text"
                                                    defaultValue={guideProfile.languages.join(', ')}
                                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Years of Experience
                                                </label>
                                                <select className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" defaultValue="5+ years">
                                                    <option>1-2 years</option>
                                                    <option>3-5 years</option>
                                                    <option>5+ years</option>
                                                    <option>10+ years</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Services Management */}``
                                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-lg font-semibold text-gray-900">My Services</h3>
                                        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
                                            <Plus className="h-4 w-4" />
                                            <span>Add Service</span>
                                        </button>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-4">
                                        {services.map((service) => (
                                            <div key={service.id} className="border border-gray-200 rounded-lg p-4">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center space-x-3">
                                                        <div
                                                            className={`w-3 h-3 rounded-full ${
                                                                service.active ? 'bg-green-500' : 'bg-gray-300'
                                                            }`}
                                                        ></div>
                                                        <div>
                                                            <h4 className="font-medium text-gray-900">{service.name}</h4>
                                                            <p className="text-sm text-gray-600">${service.price}/hour</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <button className="text-gray-600 hover:text-gray-700">
                                                            <Edit3 className="h-4 w-4" />
                                                        </button>
                                                        <button className="text-gray-600 hover:text-gray-700">
                                                            <Eye className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="text-sm text-gray-500">{service.bookings} bookings this month</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Media Gallery */}
                                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-lg font-semibold text-gray-900">Photo & Video Gallery</h3>
                                        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
                                            <Upload className="h-4 w-4" />
                                            <span>Upload Media</span>
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                                            <div key={i} className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                                                <Camera className="h-8 w-8 text-gray-400" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Earnings Tab */}
                        {activeTab === 'earnings' && (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-2xl font-bold text-gray-900">Earnings & Payments</h2>
                                    <button className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2">
                                        <Wallet className="h-4 w-4" />
                                        <span>Withdraw ${earnings.pendingPayout}</span>
                                    </button>
                                </div>

                                {/* Earnings Overview */}
                                <div className="grid md:grid-cols-4 gap-6">
                                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                                        <div className="flex items-center justify-between mb-4">
                                            <Wallet className="h-8 w-8 text-green-600" />
                                            <span className="text-xs text-green-600">+{earnings.growthRate}%</span>
                                        </div>
                                        <h3 className="text-2xl font-bold text-gray-900">${earnings.totalBalance}</h3>
                                        <p className="text-sm text-gray-600">Total Balance</p>
                                    </div>

                                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                                        <div className="flex items-center justify-between mb-4">
                                            <DollarSign className="h-8 w-8 text-blue-600" />
                                            <span className="text-xs text-blue-600">This month</span>
                                        </div>
                                        <h3 className="text-2xl font-bold text-gray-900">${earnings.thisMonth}</h3>
                                        <p className="text-sm text-gray-600">Monthly Earnings</p>
                                    </div>

                                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                                        <div className="flex items-center justify-between mb-4">
                                            <TrendingUp className="h-8 w-8 text-purple-600" />
                                            <span className="text-xs text-purple-600">Average</span>
                                        </div>
                                        <h3 className="text-2xl font-bold text-gray-900">${earnings.averageBookingValue}</h3>
                                        <p className="text-sm text-gray-600">Per Booking</p>
                                    </div>

                                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                                        <div className="flex items-center justify-between mb-4">
                                            <Clock className="h-8 w-8 text-orange-600" />
                                            <span className="text-xs text-orange-600">Pending</span>
                                        </div>
                                        <h3 className="text-2xl font-bold text-gray-900">${earnings.pendingPayout}</h3>
                                        <p className="text-sm text-gray-600">Available</p>
                                    </div>
                                </div>

                                {/* Earnings Chart */}
                                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-6">Earnings Trend</h3>
                                    <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                                        <div className="text-center">
                                            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                                            <p className="text-gray-600">Earnings chart visualization</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Transaction History */}
                                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-lg font-semibold text-gray-900">Transaction History</h3>
                                        <button className="text-blue-600 hover:text-blue-700 flex items-center space-x-1">
                                            <Download className="h-4 w-4" />
                                            <span>Export</span>
                                        </button>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tourist</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                            </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                            {[
                                                { date: '2024-03-15', tourist: 'John Smith', service: 'Historical Tour', amount: 90, status: 'completed' },
                                                { date: '2024-03-14', tourist: 'Maria Garcia', service: 'Photography', amount: 120, status: 'completed' },
                                                { date: '2024-03-13', tourist: 'David Wilson', service: 'Cultural Tour', amount: 75, status: 'pending' },
                                            ].map((transaction, index) => (
                                                <tr key={index}>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{transaction.date}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{transaction.tourist}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{transaction.service}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                        ${transaction.amount}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                                      transaction.status === 'completed'
                                          ? 'bg-green-100 text-green-800'
                                          : 'bg-yellow-100 text-yellow-800'
                                  }`}
                              >
                                {transaction.status}
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

                        {/* Analytics Tab */}
                        {activeTab === 'analytics' && (
                            <div className="space-y-6">
                                <h2 className="text-2xl font-bold text-gray-900">Analytics & Insights</h2>

                                {/* Performance Metrics */}
                                <div className="grid md:grid-cols-4 gap-6">
                                    <StatCard icon={Users} title="Bookings This Week" value={analytics.bookingsThisWeek} color="blue" />
                                    <StatCard icon={Calendar} title="Bookings This Month" value={analytics.bookingsThisMonth} color="green" />
                                    <StatCard icon={Target} title="Completion Rate" value={`${guideProfile.completionRate}%`} color="purple" />
                                    <StatCard icon={Activity} title="Response Rate" value={`${guideProfile.responseRate}%`} color="orange" />
                                </div>

                                {/* Popular Services */}
                                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-6">Most Popular Services</h3>
                                    <div className="space-y-4">
                                        {analytics.popularServices.map((service, index) => (
                                            <div key={index} className="flex items-center justify-between">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                                        <span className="text-blue-600 font-medium">{index + 1}</span>
                                                    </div>
                                                    <div>
                                                        <h4 className="font-medium text-gray-900">{service.name}</h4>
                                                        <p className="text-sm text-gray-600">{service.bookings} bookings</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-24 bg-gray-200 rounded-full h-2">
                                                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${service.percentage}%` }}></div>
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-900">{service.percentage}%</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Monthly Performance */}
                                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-6">Monthly Performance</h3>
                                    <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                                        <div className="text-center">
                                            <PieChart className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                                            <p className="text-gray-600">Performance analytics chart</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Reviews Tab */}
                        {activeTab === 'reviews' && (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-2xl font-bold text-gray-900">Reviews & Ratings</h2>
                                    <div className="flex items-center space-x-2">
                                        <Star className="h-5 w-5 text-yellow-400 fill-current" />
                                        <span className="font-bold text-lg">{guideProfile.rating}</span>
                                        <span className="text-gray-600">({guideProfile.totalReviews} reviews)</span>
                                    </div>
                                </div>

                                {/* Rating Overview */}
                                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-6">Rating Breakdown</h3>
                                    <div className="space-y-3">
                                        {[5, 4, 3, 2, 1].map((rating) => (
                                            <div key={rating} className="flex items-center space-x-3">
                                                <span className="text-sm font-medium w-8">{rating}★</span>
                                                <div className="flex-1 bg-gray-200 rounded-full h-2">
                                                    <div
                                                        className="bg-yellow-400 h-2 rounded-full"
                                                        style={{ width: `${rating === 5 ? 70 : rating === 4 ? 25 : 5}%` }}
                                                    ></div>
                                                </div>
                                                <span className="text-sm text-gray-600 w-12">
                          {rating === 5 ? '89' : rating === 4 ? '32' : rating === 3 ? '4' : rating === 2 ? '1' : '1'}
                        </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Recent Reviews */}
                                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-6">Recent Reviews</h3>
                                    <div className="space-y-6">
                                        {[
                                            {
                                                tourist: 'Sarah Johnson',
                                                rating: 5,
                                                date: '2 days ago',
                                                comment:
                                                    "Elena was absolutely fantastic! She showed us parts of Prague we never would have found on our own. Her English is perfect and she's incredibly knowledgeable about Czech history.",
                                                service: 'Historical Tour',
                                            },
                                            {
                                                tourist: 'Marco Rodriguez',
                                                rating: 5,
                                                date: '1 week ago',
                                                comment:
                                                    'Amazing photography session! Elena knows all the best spots for photos and helped us capture beautiful memories. Highly recommend!',
                                                service: 'Photography',
                                            },
                                            {
                                                tourist: 'Lisa Chen',
                                                rating: 4,
                                                date: '2 weeks ago',
                                                comment:
                                                    'Great cultural experience! Elena is very friendly and professional. The food tour was delicious and we learned so much about Czech culture.',
                                                service: 'Cultural Tour',
                                            },
                                        ].map((review, index) => (
                                            <div key={index} className="border-b border-gray-100 pb-6 last:border-b-0">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div>
                                                        <h4 className="font-semibold text-gray-900">{review.tourist}</h4>
                                                        <div className="flex items-center space-x-2 mt-1">
                                                            <div className="flex items-center">
                                                                {Array.from({ length: review.rating }).map((_, i) => (
                                                                    <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                                                                ))}
                                                            </div>
                                                            <span className="text-sm text-gray-500">{review.date}</span>
                                                        </div>
                                                    </div>
                                                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                            {review.service}
                          </span>
                                                </div>
                                                <p className="text-gray-700">{review.comment}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Settings Tab */}
                        {activeTab === 'settings' && (
                            <div className="space-y-6">
                                <h2 className="text-2xl font-bold text-gray-900">Settings</h2>

                                {/* Profile Picture Settings */}
                                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-6">Profile Picture</h3>
                                    <div className="flex items-center space-x-6">
                                        <div className="relative">
                                            <img
                                                src={selectedProfileImage || guideProfile.avatar}
                                                alt="Current profile"
                                                className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
                                            />
                                            <label className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-2 cursor-pointer hover:bg-blue-700 transition-colors">
                                                <Camera className="h-4 w-4 text-white" />
                                                <input
                                                    type="file"
                                                    accept="image/jpeg,image/jpg,image/png,image/gif"
                                                    onChange={handleProfileImageUpload}
                                                    className="hidden"
                                                />
                                            </label>
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-medium text-gray-900 mb-2">Update your profile picture</h4>
                                            <p className="text-sm text-gray-600 mb-4">
                                                Choose a clear, professional photo that represents you well. JPG, PNG or GIF. Max size 5MB.
                                            </p>

                                            {selectedProfileImage && (
                                                <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                                    <p className="text-sm text-blue-800 mb-2">
                                                        New profile picture selected. Click &quot;Save Changes&quot; to update.
                                                    </p>
                                                </div>
                                            )}

                                            <div className="flex flex-wrap gap-3">
                                                <label className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 cursor-pointer">
                                                    <Upload className="h-4 w-4" />
                                                    <span>Upload New Photo</span>
                                                    <input
                                                        type="file"
                                                        accept="image/jpeg,image/jpg,image/png,image/gif"
                                                        onChange={handleProfileImageUpload}
                                                        className="hidden"
                                                    />
                                                </label>

                                                {selectedProfileImage && (
                                                    <button
                                                        onClick={handleSaveProfileImage}
                                                        disabled={isUploadingImage}
                                                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
                                                    >
                                                        {isUploadingImage ? (
                                                            <>
                                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                                <span>Saving...</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <CheckCircle className="h-4 w-4" />
                                                                <span>Save Changes</span>
                                                            </>
                                                        )}
                                                    </button>
                                                )}

                                                <button
                                                    onClick={handleRemoveProfileImage}
                                                    className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                                                >
                                                    Remove Photo
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Account Settings */}
                                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-6">Account Settings</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                                            <input
                                                type="email"
                                                defaultValue="elena@example.com"
                                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                                            <input
                                                type="tel"
                                                defaultValue="+420 123 456 789"
                                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Change Password</label>
                                            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                                                Update Password
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Notification Preferences */}
                                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-6">Notification Preferences</h3>
                                    <div className="space-y-4">
                                        {[
                                            { label: 'New booking requests', checked: true },
                                            { label: 'Payment confirmations', checked: true },
                                            { label: 'New reviews', checked: true },
                                            { label: 'Tour reminders', checked: true },
                                            { label: 'Marketing emails', checked: false },
                                            { label: 'SMS notifications', checked: true },
                                        ].map((pref, index) => (
                                            <label key={index} className="flex items-center space-x-3">
                                                <input
                                                    type="checkbox"
                                                    defaultChecked={pref.checked}
                                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className="text-gray-700">{pref.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Verification */}
                                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-6">Verification & Security</h3>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                                            <div className="flex items-center space-x-3">
                                                <CheckCircle className="h-5 w-5 text-green-600" />
                                                <span className="text-green-800">Identity Verified</span>
                                            </div>
                                            <span className="text-green-600 text-sm">Completed</span>
                                        </div>
                                        <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
                                            <div className="flex items-center space-x-3">
                                                <AlertCircle className="h-5 w-5 text-yellow-600" />
                                                <span className="text-yellow-800">Professional License</span>
                                            </div>
                                            <button className="text-blue-600 hover:text-blue-700 text-sm">Upload</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>{/* /Main */}
                </div>
            </div>
        </div>
    );
};

export default GuideDashboard;
