import React, { useState, useEffect } from 'react';
import {
    User,
    MapPin,
    Star,
    Calendar,
    MessageSquare,
    Camera,
    Edit3,
    Save,
    X,
    Clock,
    CheckCircle,
    AlertCircle,
    Eye,
    TrendingUp,
    Heart,
    CreditCard,
    Settings,
    Bell
} from 'lucide-react';
import * as api from '../api/api';
import './UserAccount.css'

const UserAccount = () => {
    // State management
    const [currentUser, setCurrentUser] = useState(null);
    const [clientProfile, setClientProfile] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('profile');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Form data states
    const [profileData, setProfileData] = useState({});
    const [bookings, setBookings] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [conversations, setConversations] = useState([]);

    // Common data states
    const [countries, setCountries] = useState([]);
    const [languages, setLanguages] = useState([]);

    // Initialize data on component mount
    useEffect(() => {
        initializeData();
    }, []);

    const initializeData = async () => {
        try {
            setLoading(true);

            // Get current user info
            const user = await api.getCurrentUser();
            setCurrentUser(user);

            // Load common data
            await Promise.all([
                loadCountries(),
                loadLanguages()
            ]);

            // Load client profile
            await loadClientProfile();

            // Load other data based on active tab
            if (activeTab === 'bookings') {
                await loadBookings();
            } else if (activeTab === 'reviews') {
                await loadReviews();
            } else if (activeTab === 'messages') {
                await loadConversations();
            } else if (activeTab === 'notifications') {
                await loadNotifications();
            }

        } catch (err) {
            console.error('Error initializing data:', err);
            setError('Ma\'lumotlarni yuklashda xatolik yuz berdi');
        } finally {
            setLoading(false);
        }
    };

    // Load functions
    const loadClientProfile = async () => {
        try {
            const profile = await api.getClientProfile();
            setClientProfile(profile);
            setProfileData(profile || {});
        } catch (err) {
            console.error('Error loading client profile:', err);
            // If no profile exists, show create form
            if (err.message.includes('404') || err.message.includes('not found')) {
                setClientProfile(null);
                setProfileData({});
            }
        }
    };

    const loadCountries = async () => {
        try {
            const data = await api.getCountries();
            setCountries(data.results || data || []);
        } catch (err) {
            console.error('Error loading countries:', err);
        }
    };

    const loadLanguages = async () => {
        try {
            const data = await api.getLanguages();
            setLanguages(data.results || data || []);
        } catch (err) {
            console.error('Error loading languages:', err);
        }
    };

    const loadBookings = async () => {
        try {
            const data = await api.getClientBookings();
            setBookings(data.results || data || []);
        } catch (err) {
            console.error('Error loading bookings:', err);
        }
    };

    const loadReviews = async () => {
        try {
            const data = await api.getClientReviews();
            setReviews(data.results || data || []);
        } catch (err) {
            console.error('Error loading reviews:', err);
        }
    };

    const loadConversations = async () => {
        try {
            const data = await api.getClientChats();
            setConversations(data.results || data || []);
        } catch (err) {
            console.error('Error loading conversations:', err);
        }
    };

    const loadNotifications = async () => {
        try {
            const data = await api.getNotifications();
            setNotifications(data.results || data || []);
        } catch (err) {
            console.error('Error loading notifications:', err);
        }
    };

    // Profile management functions
    const handleProfileSave = async () => {
        try {
            setSaving(true);
            setError('');
            setSuccess('');

            if (clientProfile) {
                // Update existing profile
                await api.updateClientProfile(profileData);
                setSuccess('Profil muvaffaqiyatli yangilandi!');
            } else {
                // Create new profile
                await api.createClientProfile(profileData);
                setSuccess('Profil muvaffaqiyatli yaratildi!');
            }

            await loadClientProfile();
            setIsEditing(false);
        } catch (err) {
            console.error('Error saving profile:', err);
            setError(err.message || 'Profilni saqlashda xatolik yuz berdi');
        } finally {
            setSaving(false);
        }
    };

    // Booking management functions
    const handleBookingCancel = async (bookingId, reason = '') => {
        if (!window.confirm('Bu bookingni bekor qilishni xohlaysizmi?')) return;

        try {
            setSaving(true);
            await api.cancelBooking(bookingId, reason);
            setSuccess('Booking bekor qilindi!');
            await loadBookings();
        } catch (err) {
            console.error('Error canceling booking:', err);
            setError(err.message || 'Bookingni bekor qilishda xatolik');
        } finally {
            setSaving(false);
        }
    };

    // Review management functions
    const handleReviewSubmit = async (bookingId, reviewData) => {
        try {
            setSaving(true);
            await api.createReview({ ...reviewData, booking: bookingId });
            setSuccess('Review muvaffaqiyatli yuborildi!');
            await loadReviews();
            await loadBookings();
        } catch (err) {
            console.error('Error submitting review:', err);
            setError(err.message || 'Review yuborishda xatolik');
        } finally {
            setSaving(false);
        }
    };

    // Tab change handler
    const handleTabChange = async (tab) => {
        setActiveTab(tab);
        setError('');
        setSuccess('');

        // Load data for the selected tab
        if (tab === 'bookings') {
            await loadBookings();
        } else if (tab === 'reviews') {
            await loadReviews();
        } else if (tab === 'messages') {
            await loadConversations();
        } else if (tab === 'notifications') {
            await loadNotifications();
        }
    };

    // Utility functions
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('uz-UZ');
    };

    const formatCurrency = (amount, currency = 'USD') => {
        return new Intl.NumberFormat('uz-UZ', {
            style: 'currency',
            currency: currency
        }).format(amount);
    };

    const renderStars = (rating) => {
        return Array.from({ length: 5 }, (_, i) => (
            <Star
                key={i}
                className={`user-account-w-4 user-account-h-4 ${i < rating ? 'user-account-fill-yellow-400 user-account-text-yellow-400' : 'user-account-text-gray-300'}`}
            />
        ));
    };

    // Main render function
    if (loading) {
        return (
            <div className="user-account-min-h-screen user-account-bg-gray-50 user-account-flex user-account-items-center user-account-justify-center">
                <div className="user-account-text-center">
                    <div className="user-account-animate-spin user-account-rounded-full user-account-h-12 user-account-w-12 user-account-border-b-2 user-account-border-blue-600 user-account-mx-auto"></div>
                    <p className="user-account-mt-4 user-account-text-gray-600">Ma'lumotlar yuklanmoqda...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="user-account-min-h-screen user-account-bg-gray-50">
            {/* Header */}
            <div className="user-account-bg-white user-account-shadow-sm user-account-border-b">
                <div className="user-account-max-w-7xl user-account-mx-auto user-account-px-4 user-account-sm:px-6 user-account-lg:px-8">
                    <div className="user-account-flex user-account-justify-between user-account-items-center user-account-py-6">
                        <div className="user-account-flex user-account-items-center user-account-space-x-4">
                            <div className="user-account-relative">
                                <div className="user-account-w-16 user-account-h-16 user-account-bg-blue-600 user-account-rounded-full user-account-flex user-account-items-center user-account-justify-center user-account-text-white user-account-text-xl user-account-font-bold">
                                    {currentUser?.avatar ? (
                                        <img
                                            src={currentUser.avatar}
                                            alt="Avatar"
                                            className="user-account-w-16 user-account-h-16 user-account-rounded-full user-account-object-cover"
                                        />
                                    ) : (
                                        currentUser?.full_name?.charAt(0) || 'C'
                                    )}
                                </div>
                                <button className="user-account-absolute user-account--bottom-1 user-account--right-1 user-account-bg-blue-600 user-account-rounded-full user-account-p-1 user-account-text-white user-account-hover:bg-blue-700">
                                    <Camera className="user-account-w-3 user-account-h-3" />
                                </button>
                            </div>
                            <div>
                                <h1 className="user-account-text-2xl user-account-font-bold user-account-text-gray-900">
                                    {currentUser?.full_name || 'Client Account'}
                                </h1>
                                <p className="user-account-text-gray-600">{currentUser?.email}</p>
                                <div className="user-account-flex user-account-items-center user-account-mt-1 user-account-space-x-4">
                                    <div className="user-account-flex user-account-items-center user-account-space-x-1 user-account-text-sm user-account-text-gray-600">
                                        <MapPin className="user-account-w-4 user-account-h-4" />
                                        <span>{currentUser?.country_name || 'Location not set'}</span>
                                    </div>
                                    <div className="user-account-flex user-account-items-center user-account-space-x-1 user-account-text-green-600">
                                        <CheckCircle className="user-account-w-4 user-account-h-4" />
                                        <span className="user-account-text-sm">Verified Client</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Error/Success Messages */}
            {error && (
                <div className="user-account-max-w-7xl user-account-mx-auto user-account-px-4 user-account-sm:px-6 user-account-lg:px-8 user-account-mt-4">
                    <div className="user-account-bg-red-50 user-account-border user-account-border-red-200 user-account-text-red-700 user-account-px-4 user-account-py-3 user-account-rounded-md user-account-flex user-account-items-center">
                        <AlertCircle className="user-account-w-5 user-account-h-5 user-account-mr-2" />
                        {error}
                    </div>
                </div>
            )}

            {success && (
                <div className="user-account-max-w-7xl user-account-mx-auto user-account-px-4 user-account-sm:px-6 user-account-lg:px-8 user-account-mt-4">
                    <div className="user-account-bg-green-50 user-account-border user-account-border-green-200 user-account-text-green-700 user-account-px-4 user-account-py-3 user-account-rounded-md user-account-flex user-account-items-center">
                        <CheckCircle className="user-account-w-5 user-account-h-5 user-account-mr-2" />
                        {success}
                    </div>
                </div>
            )}

            {/* Navigation Tabs */}
            <div className="user-account-bg-white user-account-border-b">
                <div className="user-account-max-w-7xl user-account-mx-auto user-account-px-4 user-account-sm:px-6 user-account-lg:px-8">
                    <nav className="user-account-flex user-account-space-x-8">
                        {[
                            { id: 'profile', label: 'Profile', icon: User },
                            { id: 'bookings', label: 'My Bookings', icon: Calendar },
                            { id: 'reviews', label: 'My Reviews', icon: Star },
                            { id: 'messages', label: 'Messages', icon: MessageSquare },
                            { id: 'notifications', label: 'Notifications', icon: Bell }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => handleTabChange(tab.id)}
                                className={`user-account-py-4 user-account-px-1 user-account-border-b-2 user-account-font-medium user-account-text-sm user-account-flex user-account-items-center user-account-space-x-2 ${
                                    activeTab === tab.id
                                        ? 'user-account-border-blue-500 user-account-text-blue-600'
                                        : 'user-account-border-transparent user-account-text-gray-500 user-account-hover:text-gray-700 user-account-hover:border-gray-300'
                                }`}
                            >
                                <tab.icon className="user-account-w-4 user-account-h-4" />
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </nav>
                </div>
            </div>

            {/* Main Content */}
            <div className="user-account-max-w-7xl user-account-mx-auto user-account-px-4 user-account-sm:px-6 user-account-lg:px-8 user-account-py-8">
                {activeTab === 'profile' && (
                    <ClientProfileSection
                        clientProfile={clientProfile}
                        profileData={profileData}
                        setProfileData={setProfileData}
                        isEditing={isEditing}
                        setIsEditing={setIsEditing}
                        saving={saving}
                        onSave={handleProfileSave}
                        countries={countries}
                        languages={languages}
                    />
                )}

                {activeTab === 'bookings' && (
                    <BookingsSection
                        bookings={bookings}
                        onCancel={handleBookingCancel}
                        onReview={handleReviewSubmit}
                        saving={saving}
                    />
                )}

                {activeTab === 'reviews' && (
                    <ReviewsSection
                        reviews={reviews}
                        onEdit={async (id, reviewData) => {
                            try {
                                await api.updateReview(id, reviewData);
                                setSuccess('Review yangilandi!');
                                await loadReviews();
                            } catch (err) {
                                setError('Review yangilashda xatolik');
                            }
                        }}
                    />
                )}

                {activeTab === 'messages' && (
                    <MessagesSection
                        conversations={conversations}
                        onMarkAsRead={async (conversationId) => {
                            try {
                                await api.markMessagesAsRead(conversationId);
                                await loadConversations();
                            } catch (err) {
                                setError('Xabarlarni belgilashda xatolik');
                            }
                        }}
                    />
                )}

                {activeTab === 'notifications' && (
                    <NotificationsSection
                        notifications={notifications}
                        onMarkAsRead={async (id) => {
                            try {
                                await api.markNotificationAsRead(id);
                                await loadNotifications();
                            } catch (err) {
                                setError('Bildirishmani belgilashda xatolik');
                            }
                        }}
                        onMarkAllAsRead={async () => {
                            try {
                                await api.markAllNotificationsAsRead();
                                await loadNotifications();
                                setSuccess('Barcha bildirishmalar o\'qilgan deb belgilandi!');
                            } catch (err) {
                                setError('Bildirishmalarni belgilashda xatolik');
                            }
                        }}
                    />
                )}
            </div>
        </div>
    );
};

// Client Profile Section Component
const ClientProfileSection = ({
                                  clientProfile,
                                  profileData,
                                  setProfileData,
                                  isEditing,
                                  setIsEditing,
                                  saving,
                                  onSave,
                                  countries,
                                  languages
                              }) => {
    const handleInputChange = (field, value) => {
        setProfileData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleArrayChange = (field, values) => {
        setProfileData(prev => ({
            ...prev,
            [field]: values
        }));
    };

    if (!clientProfile && !isEditing) {
        return (
            <div className="user-account-bg-white user-account-rounded-lg user-account-shadow user-account-p-6 user-account-text-center">
                <User className="user-account-w-16 user-account-h-16 user-account-text-gray-400 user-account-mx-auto user-account-mb-4" />
                <h3 className="user-account-text-lg user-account-font-medium user-account-text-gray-900 user-account-mb-2">
                    Client profili mavjud emas
                </h3>
                <p className="user-account-text-gray-600 user-account-mb-6">
                    To'liq imkoniyatlardan foydalanish uchun client profili yarating
                </p>
                <button
                    onClick={() => setIsEditing(true)}
                    className="user-account-bg-blue-600 user-account-text-white user-account-px-6 user-account-py-2 user-account-rounded-md user-account-hover:bg-blue-700 user-account-transition-colors"
                >
                    Profil yaratish
                </button>
            </div>
        );
    }

    return (
        <div className="user-account-space-y-6">
            {/* Profile Information */}
            <div className="user-account-bg-white user-account-rounded-lg user-account-shadow">
                <div className="user-account-px-6 user-account-py-4 user-account-border-b user-account-border-gray-200 user-account-flex user-account-justify-between user-account-items-center">
                    <h2 className="user-account-text-lg user-account-font-medium user-account-text-gray-900">Profile Information</h2>
                    {!isEditing ? (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="user-account-flex user-account-items-center user-account-space-x-2 user-account-text-blue-600 user-account-hover:text-blue-800"
                        >
                            <Edit3 className="user-account-w-4 user-account-h-4" />
                            <span>Edit</span>
                        </button>
                    ) : (
                        <div className="user-account-flex user-account-space-x-2">
                            <button
                                onClick={onSave}
                                disabled={saving}
                                className="user-account-flex user-account-items-center user-account-space-x-2 user-account-bg-blue-600 user-account-text-white user-account-px-4 user-account-py-2 user-account-rounded-md user-account-hover:bg-blue-700 user-account-disabled:opacity-50"
                            >
                                <Save className="user-account-w-4 user-account-h-4" />
                                <span>{saving ? 'Saving...' : 'Save'}</span>
                            </button>
                            <button
                                onClick={() => setIsEditing(false)}
                                className="user-account-flex user-account-items-center user-account-space-x-2 user-account-bg-gray-300 user-account-text-gray-700 user-account-px-4 user-account-py-2 user-account-rounded-md user-account-hover:bg-gray-400"
                            >
                                <X className="user-account-w-4 user-account-h-4" />
                                <span>Cancel</span>
                            </button>
                        </div>
                    )}
                </div>

                <div className="user-account-p-6">
                    <div className="user-account-grid user-account-grid-cols-1 user-account-md:grid-cols-2 user-account-gap-6">
                        {/* Date of Birth */}
                        <div>
                            <label className="user-account-block user-account-text-sm user-account-font-medium user-account-text-gray-700 user-account-mb-2">
                                Date of Birth
                            </label>
                            {isEditing ? (
                                <input
                                    type="date"
                                    value={profileData.date_of_birth || ''}
                                    onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                                    className="user-account-w-full user-account-border user-account-border-gray-300 user-account-rounded-md user-account-px-3 user-account-py-2 user-account-focus:outline-none user-account-focus:ring-2 user-account-focus:ring-blue-500"
                                />
                            ) : (
                                <p className="user-account-text-gray-900">
                                    {clientProfile?.date_of_birth ?
                                        new Date(clientProfile.date_of_birth).toLocaleDateString() :
                                        'Date of birth not set'
                                    }
                                </p>
                            )}
                        </div>

                        {/* Preferred Contact */}
                        <div>
                            <label className="user-account-block user-account-text-sm user-account-font-medium user-account-text-gray-700 user-account-mb-2">
                                Preferred Contact Method
                            </label>
                            {isEditing ? (
                                <select
                                    value={profileData.preferred_contact || 'EMAIL'}
                                    onChange={(e) => handleInputChange('preferred_contact', e.target.value)}
                                    className="user-account-w-full user-account-border user-account-border-gray-300 user-account-rounded-md user-account-px-3 user-account-py-2 user-account-focus:outline-none user-account-focus:ring-2 user-account-focus:ring-blue-500"
                                >
                                    <option value="EMAIL">Email</option>
                                    <option value="PHONE">Phone</option>
                                    <option value="WHATSAPP">WhatsApp</option>
                                    <option value="TELEGRAM">Telegram</option>
                                </select>
                            ) : (
                                <p className="user-account-text-gray-900">
                                    {clientProfile?.preferred_contact || 'Email'}
                                </p>
                            )}
                        </div>

                        {/* Languages */}
                        <div className="user-account-md:col-span-2">
                            <label className="user-account-block user-account-text-sm user-account-font-medium user-account-text-gray-700 user-account-mb-2">
                                Languages
                            </label>
                            {isEditing ? (
                                <div className="user-account-grid user-account-grid-cols-2 user-account-md:grid-cols-4 user-account-gap-2">
                                    {languages.map(language => (
                                        <label key={language.id} className="user-account-flex user-account-items-center user-account-space-x-2">
                                            <input
                                                type="checkbox"
                                                checked={(profileData.languages || []).includes(language.id)}
                                                onChange={(e) => {
                                                    const currentLanguages = profileData.languages || [];
                                                    if (e.target.checked) {
                                                        handleArrayChange('languages', [...currentLanguages, language.id]);
                                                    } else {
                                                        handleArrayChange('languages', currentLanguages.filter(id => id !== language.id));
                                                    }
                                                }}
                                                className="user-account-rounded user-account-border-gray-300 user-account-text-blue-600 user-account-focus:ring-blue-500"
                                            />
                                            <span className="user-account-text-sm user-account-text-gray-700">{language.name}</span>
                                        </label>
                                    ))}
                                </div>
                            ) : (
                                <div className="user-account-flex user-account-flex-wrap user-account-gap-2">
                                    {clientProfile?.languages?.map(language => (
                                        <span
                                            key={language.id}
                                            className="user-account-inline-flex user-account-items-center user-account-px-3 user-account-py-1 user-account-rounded-full user-account-text-sm user-account-font-medium user-account-bg-blue-100 user-account-text-blue-800"
                                        >
                                            {language.name}
                                        </span>
                                    )) || <span className="user-account-text-gray-500">No languages selected</span>}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Bookings Section Component
const BookingsSection = ({ bookings, onCancel, onReview, saving }) => {
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [reviewingBooking, setReviewingBooking] = useState(null);

    const getStatusColor = (status) => {
        switch (status) {
            case 'PENDING':
                return 'user-account-bg-yellow-100 user-account-text-yellow-800';
            case 'ACCEPTED':
                return 'user-account-bg-green-100 user-account-text-green-800';
            case 'COMPLETED':
                return 'user-account-bg-blue-100 user-account-text-blue-800';
            case 'CANCELLED':
                return 'user-account-bg-red-100 user-account-text-red-800';
            default:
                return 'user-account-bg-gray-100 user-account-text-gray-800';
        }
    };

    const canCancel = (booking) => {
        return booking.status === 'PENDING' || booking.status === 'ACCEPTED';
    };

    const canReview = (booking) => {
        return booking.status === 'COMPLETED' && !booking.has_review;
    };

    return (
        <div className="user-account-space-y-6">
            <div className="user-account-flex user-account-justify-between user-account-items-center">
                <h2 className="user-account-text-lg user-account-font-medium user-account-text-gray-900">My Bookings</h2>
                <div className="user-account-flex user-account-space-x-2">
                    <select className="user-account-border user-account-border-gray-300 user-account-rounded-md user-account-px-3 user-account-py-2 user-account-text-sm user-account-focus:outline-none user-account-focus:ring-2 user-account-focus:ring-blue-500">
                        <option value="">All Bookings</option>
                        <option value="PENDING">Pending</option>
                        <option value="ACCEPTED">Accepted</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="CANCELLED">Cancelled</option>
                    </select>
                </div>
            </div>

            {bookings.length === 0 ? (
                <div className="user-account-bg-white user-account-rounded-lg user-account-shadow user-account-p-6 user-account-text-center">
                    <Calendar className="user-account-w-16 user-account-h-16 user-account-text-gray-400 user-account-mx-auto user-account-mb-4" />
                    <h3 className="user-account-text-lg user-account-font-medium user-account-text-gray-900 user-account-mb-2">
                        No bookings yet
                    </h3>
                    <p className="user-account-text-gray-600 user-account-mb-6">
                        Start exploring and book your first guide experience
                    </p>
                    <button className="user-account-bg-blue-600 user-account-text-white user-account-px-6 user-account-py-2 user-account-rounded-md user-account-hover:bg-blue-700">
                        Browse Guides
                    </button>
                </div>
            ) : (
                <div className="user-account-space-y-4">
                    {bookings.map((booking) => (
                        <div key={booking.id} className="user-account-bg-white user-account-rounded-lg user-account-shadow user-account-p-6">
                            <div className="user-account-flex user-account-items-start user-account-justify-between">
                                <div className="user-account-flex-1">
                                    <div className="user-account-flex user-account-items-center user-account-space-x-3 user-account-mb-3">
                                        <div className="user-account-w-12 user-account-h-12 user-account-bg-gray-300 user-account-rounded-full user-account-flex user-account-items-center user-account-justify-center">
                                            {booking.customer_profile?.user?.full_name?.charAt(0) || 'G'}
                                        </div>
                                        <div>
                                            <h3 className="user-account-font-medium user-account-text-gray-900">
                                                {booking.customer_profile?.user?.full_name || 'Guide Name'}
                                            </h3>
                                            <p className="user-account-text-sm user-account-text-gray-600">
                                                {booking.customer_profile?.city_name || 'Location'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="user-account-grid user-account-grid-cols-1 user-account-md:grid-cols-3 user-account-gap-4 user-account-mb-4">
                                        <div>
                                            <span className="user-account-text-sm user-account-text-gray-600">Date Range:</span>
                                            <p className="user-account-font-medium">
                                                {new Date(booking.start_date).toLocaleDateString()} -
                                                {new Date(booking.end_date).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="user-account-text-sm user-account-text-gray-600">Duration:</span>
                                            <p className="user-account-font-medium">{booking.duration_days || 1} days</p>
                                        </div>
                                        <div>
                                            <span className="user-account-text-sm user-account-text-gray-600">Total Amount:</span>
                                            <p className="user-account-font-medium user-account-text-green-600">
                                                ${booking.total_amount || 0}
                                            </p>
                                        </div>
                                    </div>

                                    {booking.description && (
                                        <div className="user-account-mb-4">
                                            <span className="user-account-text-sm user-account-text-gray-600">Description:</span>
                                            <p className="user-account-text-gray-900">{booking.description}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="user-account-ml-6 user-account-text-right">
                                    <span className={`user-account-inline-flex user-account-items-center user-account-px-3 user-account-py-1 user-account-rounded-full user-account-text-sm user-account-font-medium ${getStatusColor(booking.status)}`}>
                                        {booking.status}
                                    </span>

                                    <div className="user-account-mt-3 user-account-space-y-2">
                                        {canCancel(booking) && (
                                            <button
                                                onClick={() => onCancel(booking.id)}
                                                disabled={saving}
                                                className="user-account-block user-account-w-full user-account-text-red-600 user-account-hover:text-red-800 user-account-disabled:opacity-50 user-account-text-sm"
                                            >
                                                Cancel Booking
                                            </button>
                                        )}

                                        {canReview(booking) && (
                                            <button
                                                onClick={() => {
                                                    setReviewingBooking(booking);
                                                    setShowReviewModal(true);
                                                }}
                                                className="user-account-block user-account-w-full user-account-text-blue-600 user-account-hover:text-blue-800 user-account-text-sm"
                                            >
                                                Write Review
                                            </button>
                                        )}

                                        <button className="user-account-block user-account-w-full user-account-text-gray-600 user-account-hover:text-gray-800 user-account-text-sm">
                                            View Details
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Review Modal */}
            {showReviewModal && reviewingBooking && (
                <ReviewModal
                    isOpen={showReviewModal}
                    onClose={() => {
                        setShowReviewModal(false);
                        setReviewingBooking(null);
                    }}
                    booking={reviewingBooking}
                    onSubmit={(reviewData) => {
                        onReview(reviewingBooking.id, reviewData);
                        setShowReviewModal(false);
                        setReviewingBooking(null);
                    }}
                    saving={saving}
                />
            )}
        </div>
    );
};

// Reviews Section Component
const ReviewsSection = ({ reviews, onEdit }) => {
    const renderStars = (rating) => {
        return Array.from({ length: 5 }, (_, i) => (
            <Star
                key={i}
                className={`user-account-w-4 user-account-h-4 ${i < rating ? 'user-account-fill-yellow-400 user-account-text-yellow-400' : 'user-account-text-gray-300'}`}
            />
        ));
    };

    return (
        <div className="user-account-space-y-6">
            <h2 className="user-account-text-lg user-account-font-medium user-account-text-gray-900">My Reviews</h2>

            {reviews.length === 0 ? (
                <div className="user-account-bg-white user-account-rounded-lg user-account-shadow user-account-p-6 user-account-text-center">
                    <Star className="user-account-w-16 user-account-h-16 user-account-text-gray-400 user-account-mx-auto user-account-mb-4" />
                    <h3 className="user-account-text-lg user-account-font-medium user-account-text-gray-900 user-account-mb-2">
                        No reviews written yet
                    </h3>
                    <p className="user-account-text-gray-600">
                        Complete bookings and write reviews to help other travelers
                    </p>
                </div>
            ) : (
                <div className="user-account-space-y-4">
                    {reviews.map((review) => (
                        <div key={review.id} className="user-account-bg-white user-account-rounded-lg user-account-shadow user-account-p-6">
                            <div className="user-account-flex user-account-items-start user-account-justify-between user-account-mb-4">
                                <div className="user-account-flex user-account-items-center user-account-space-x-3">
                                    <div className="user-account-w-10 user-account-h-10 user-account-bg-gray-300 user-account-rounded-full user-account-flex user-account-items-center user-account-justify-center">
                                        {review.customer?.full_name?.charAt(0) || 'G'}
                                    </div>
                                    <div>
                                        <h4 className="user-account-font-medium user-account-text-gray-900">
                                            {review.customer?.full_name || 'Guide Name'}
                                        </h4>
                                        <div className="user-account-flex user-account-items-center user-account-space-x-1">
                                            {renderStars(review.overall_rating)}
                                            <span className="user-account-text-sm user-account-text-gray-600">
                                                {new Date(review.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => onEdit(review.id, review)}
                                    className="user-account-text-blue-600 user-account-hover:text-blue-800 user-account-text-sm"
                                >
                                    Edit
                                </button>
                            </div>

                            {review.title && (
                                <h5 className="user-account-font-medium user-account-text-gray-900 user-account-mb-2">{review.title}</h5>
                            )}

                            <p className="user-account-text-gray-700 user-account-mb-4">{review.comment}</p>

                            <div className="user-account-grid user-account-grid-cols-2 user-account-md:grid-cols-4 user-account-gap-4 user-account-text-sm">
                                <div>
                                    <span className="user-account-text-gray-600">Communication:</span>
                                    <div className="user-account-flex user-account-items-center user-account-space-x-1">
                                        {renderStars(review.communication_rating)}
                                    </div>
                                </div>
                                <div>
                                    <span className="user-account-text-gray-600">Service:</span>
                                    <div className="user-account-flex user-account-items-center user-account-space-x-1">
                                        {renderStars(review.service_rating)}
                                    </div>
                                </div>
                                <div>
                                    <span className="user-account-text-gray-600">Punctuality:</span>
                                    <div className="user-account-flex user-account-items-center user-account-space-x-1">
                                        {renderStars(review.punctuality_rating)}
                                    </div>
                                </div>
                                <div>
                                    <span className="user-account-text-gray-600">Value:</span>
                                    <div className="user-account-flex user-account-items-center user-account-space-x-1">
                                        {renderStars(review.value_rating)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// Messages Section Component
const MessagesSection = ({ conversations, onMarkAsRead }) => {
    return (
        <div className="user-account-space-y-6">
            <h2 className="user-account-text-lg user-account-font-medium user-account-text-gray-900">Messages</h2>

            {conversations.length === 0 ? (
                <div className="user-account-bg-white user-account-rounded-lg user-account-shadow user-account-p-6 user-account-text-center">
                    <MessageSquare className="user-account-w-16 user-account-h-16 user-account-text-gray-400 user-account-mx-auto user-account-mb-4" />
                    <h3 className="user-account-text-lg user-account-font-medium user-account-text-gray-900 user-account-mb-2">
                        No conversations yet
                    </h3>
                    <p className="user-account-text-gray-600">
                        Start chatting with guides when you make bookings
                    </p>
                </div>
            ) : (
                <div className="user-account-bg-white user-account-rounded-lg user-account-shadow user-account-divide-y user-account-divide-gray-200">
                    {conversations.map((conversation) => (
                        <div key={conversation.id} className="user-account-p-4 user-account-hover:bg-gray-50 user-account-cursor-pointer">
                            <div className="user-account-flex user-account-items-center user-account-space-x-3">
                                <div className="user-account-w-10 user-account-h-10 user-account-bg-gray-300 user-account-rounded-full user-account-flex user-account-items-center user-account-justify-center">
                                    {conversation.other_user?.full_name?.charAt(0) || 'G'}
                                </div>
                                <div className="user-account-flex-1 user-account-min-w-0">
                                    <h4 className="user-account-font-medium user-account-text-gray-900 user-account-truncate">
                                        {conversation.other_user?.full_name || 'Guide'}
                                    </h4>
                                    <p className="user-account-text-sm user-account-text-gray-600 user-account-truncate">
                                        {conversation.last_message?.content || 'No messages yet'}
                                    </p>
                                </div>
                                <div className="user-account-text-right">
                                    <p className="user-account-text-xs user-account-text-gray-500">
                                        {conversation.last_message?.created_at &&
                                            new Date(conversation.last_message.created_at).toLocaleDateString()
                                        }
                                    </p>
                                    {conversation.unread_count > 0 && (
                                        <span className="user-account-inline-flex user-account-items-center user-account-justify-center user-account-w-5 user-account-h-5 user-account-bg-blue-600 user-account-text-white user-account-text-xs user-account-font-medium user-account-rounded-full">
                                            {conversation.unread_count}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// Notifications Section Component
const NotificationsSection = ({ notifications, onMarkAsRead, onMarkAllAsRead }) => {
    return (
        <div className="user-account-space-y-6">
            <div className="user-account-flex user-account-justify-between user-account-items-center">
                <h2 className="user-account-text-lg user-account-font-medium user-account-text-gray-900">Notifications</h2>
                {notifications.some(n => !n.is_read) && (
                    <button
                        onClick={onMarkAllAsRead}
                        className="user-account-text-blue-600 user-account-hover:text-blue-800 user-account-text-sm"
                    >
                        Mark all as read
                    </button>
                )}
            </div>

            {notifications.length === 0 ? (
                <div className="user-account-bg-white user-account-rounded-lg user-account-shadow user-account-p-6 user-account-text-center">
                    <Bell className="user-account-w-16 user-account-h-16 user-account-text-gray-400 user-account-mx-auto user-account-mb-4" />
                    <h3 className="user-account-text-lg user-account-font-medium user-account-text-gray-900 user-account-mb-2">
                        No notifications
                    </h3>
                    <p className="user-account-text-gray-600">
                        You'll receive notifications about bookings, messages, and more
                    </p>
                </div>
            ) : (
                <div className="user-account-space-y-3">
                    {notifications.map((notification) => (
                        <div
                            key={notification.id}
                            className={`user-account-bg-white user-account-rounded-lg user-account-shadow user-account-p-4 user-account-border-l-4 ${
                                notification.is_read ? 'user-account-border-gray-300' : 'user-account-border-blue-500'
                            }`}
                        >
                            <div className="user-account-flex user-account-items-start user-account-justify-between">
                                <div className="user-account-flex-1">
                                    <h4 className={`user-account-font-medium ${
                                        notification.is_read ? 'user-account-text-gray-700' : 'user-account-text-gray-900'
                                    }`}>
                                        {notification.title}
                                    </h4>
                                    <p className={`user-account-mt-1 user-account-text-sm ${
                                        notification.is_read ? 'user-account-text-gray-500' : 'user-account-text-gray-700'
                                    }`}>
                                        {notification.message}
                                    </p>
                                    <p className="user-account-mt-2 user-account-text-xs user-account-text-gray-500">
                                        {new Date(notification.created_at).toLocaleString()}
                                    </p>
                                </div>
                                {!notification.is_read && (
                                    <button
                                        onClick={() => onMarkAsRead(notification.id)}
                                        className="user-account-ml-4 user-account-text-blue-600 user-account-hover:text-blue-800 user-account-text-sm"
                                    >
                                        Mark as read
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// Review Modal Component
const ReviewModal = ({ isOpen, onClose, booking, onSubmit, saving }) => {
    const [formData, setFormData] = useState({
        overall_rating: 5,
        communication_rating: 5,
        service_rating: 5,
        punctuality_rating: 5,
        value_rating: 5,
        title: '',
        comment: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    const renderStarRating = (field, label) => {
        return (
            <div>
                <label className="user-account-block user-account-text-sm user-account-font-medium user-account-text-gray-700 user-account-mb-2">
                    {label}
                </label>
                <div className="user-account-flex user-account-space-x-1">
                    {Array.from({ length: 5 }, (_, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, [field]: i + 1 }))}
                            className="user-account-focus:outline-none"
                        >
                            <Star
                                className={`user-account-w-6 user-account-h-6 ${
                                    i < formData[field]
                                        ? 'user-account-fill-yellow-400 user-account-text-yellow-400'
                                        : 'user-account-text-gray-300 user-account-hover:text-yellow-400'
                                }`}
                            />
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    if (!isOpen) return null;

    return (
        <div className="user-account-fixed user-account-inset-0 user-account-bg-black user-account-bg-opacity-50 user-account-flex user-account-items-center user-account-justify-center user-account-z-50">
            <div className="user-account-bg-white user-account-rounded-lg user-account-p-6 user-account-w-full user-account-max-w-2xl user-account-max-h-screen user-account-overflow-y-auto">
                <h3 className="user-account-text-lg user-account-font-medium user-account-text-gray-900 user-account-mb-4">
                    Write Review for {booking.customer_profile?.user?.full_name}
                </h3>

                <form onSubmit={handleSubmit} className="user-account-space-y-6">
                    {/* Rating Fields */}
                    <div className="user-account-grid user-account-grid-cols-1 user-account-md:grid-cols-2 user-account-gap-6">
                        {renderStarRating('overall_rating', 'Overall Rating')}
                        {renderStarRating('communication_rating', 'Communication')}
                        {renderStarRating('service_rating', 'Service Quality')}
                        {renderStarRating('punctuality_rating', 'Punctuality')}
                        {renderStarRating('value_rating', 'Value for Money')}
                    </div>

                    {/* Title */}
                    <div>
                        <label className="user-account-block user-account-text-sm user-account-font-medium user-account-text-gray-700 user-account-mb-2">
                            Review Title
                        </label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                            className="user-account-w-full user-account-border user-account-border-gray-300 user-account-rounded-md user-account-px-3 user-account-py-2 user-account-focus:outline-none user-account-focus:ring-2 user-account-focus:ring-blue-500"
                            placeholder="Brief summary of your experience"
                        />
                    </div>

                    {/* Comment */}
                    <div>
                        <label className="user-account-block user-account-text-sm user-account-font-medium user-account-text-gray-700 user-account-mb-2">
                            Detailed Review
                        </label>
                        <textarea
                            value={formData.comment}
                            onChange={(e) => setFormData(prev => ({ ...prev, comment: e.target.value }))}
                            rows={4}
                            className="user-account-w-full user-account-border user-account-border-gray-300 user-account-rounded-md user-account-px-3 user-account-py-2 user-account-focus:outline-none user-account-focus:ring-2 user-account-focus:ring-blue-500"
                            placeholder="Share your experience with other travelers..."
                            required
                        />
                    </div>

                    <div className="user-account-flex user-account-justify-end user-account-space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="user-account-px-4 user-account-py-2 user-account-text-gray-700 user-account-bg-gray-200 user-account-rounded-md user-account-hover:bg-gray-300"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="user-account-px-4 user-account-py-2 user-account-bg-blue-600 user-account-text-white user-account-rounded-md user-account-hover:bg-blue-700 user-account-disabled:opacity-50"
                        >
                            {saving ? 'Submitting...' : 'Submit Review'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UserAccount;