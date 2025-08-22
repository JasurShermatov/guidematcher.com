import React, { useState, useEffect } from 'react';
import {
    User,
    MapPin,
    Star,
    Calendar,
    DollarSign,
    Camera,
    Edit3,
    Save,
    X,
    Plus,
    Trash2,
    Eye,
    EyeOff,
    Upload,
    FileText,
    Clock,
    TrendingUp,
    MessageSquare,
    AlertCircle,
    CheckCircle
} from 'lucide-react';
import * as api from '../api/api';
import './GuideAccount.css';

const GuideAccount = () => {
    // State management
    const [currentUser, setCurrentUser] = useState(null);
    const [customerProfile, setCustomerProfile] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('profile');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Form data states
    const [profileData, setProfileData] = useState({});
    const [portfolioItems, setPortfolioItems] = useState([]);
    const [availabilities, setAvailabilities] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [notifications, setNotifications] = useState([]);

    // Common data states
    const [countries, setCountries] = useState([]);
    const [cities, setCities] = useState([]);
    const [languages, setLanguages] = useState([]);
    const [serviceTypes, setServiceTypes] = useState([]);

    // Modal states
    const [showPortfolioModal, setShowPortfolioModal] = useState(false);
    const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
    const [showDocumentModal, setShowDocumentModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);

    // Initialize data on component mount
    useEffect(() => {
        initializeData();
    }, []);

    const initializeData = async () => {
        try {
            setLoading(true);
            setError(''); // Clear any previous errors

            // Check if we have a valid token
            const token = localStorage.getItem("access_token");
            if (!token) {
                setError('Tizimga kirishingiz kerak');
                return;
            }

            // Get current user info
            const user = await api.getCurrentUser();
            setCurrentUser(user);

            // Load common data
            await Promise.all([
                loadCountries(),
                loadLanguages(),
                loadServiceTypes()
            ]);

            // Load customer profile
            await loadCustomerProfile();

            // Load other data based on active tab
            if (activeTab === 'portfolio') {
                await loadPortfolio();
            } else if (activeTab === 'availability') {
                await loadAvailabilities();
            } else if (activeTab === 'documents') {
                await loadDocuments();
            } else if (activeTab === 'bookings') {
                await loadBookings();
            } else if (activeTab === 'reviews') {
                await loadReviews();
            } else if (activeTab === 'notifications') {
                await loadNotifications();
            }

        } catch (err) {
            console.error('Error initializing data:', err);
            setError('Ma\'lumotlarni yuklashda xatolik: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    // Load functions
    const loadCustomerProfile = async () => {
        try {
            const profile = await api.getCustomerProfile();
            setCustomerProfile(profile);
            setProfileData(profile || {});

            // Load cities for selected country
            if (profile?.user?.country) {
                await loadCities(profile.user.country);
            }
        } catch (err) {
            console.error('Error loading customer profile:', err);
            // If no profile exists or unauthorized, show create form
            if (err.message.includes('404') || err.message.includes('not found') || err.message.includes('Unauthorized')) {
                setCustomerProfile(null);
                setProfileData({});
            } else {
                setError('Profil ma\'lumotlarini yuklashda xatolik: ' + err.message);
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

    const loadCities = async (countryId) => {
        try {
            const data = await api.getCities(countryId);
            setCities(data.results || data || []);
        } catch (err) {
            console.error('Error loading cities:', err);
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

    const loadServiceTypes = async () => {
        try {
            const data = await api.getServiceTypes();
            setServiceTypes(data.results || data || []);
        } catch (err) {
            console.error('Error loading service types:', err);
        }
    };

    const loadPortfolio = async () => {
        try {
            const data = await api.getMyPortfolio();
            setPortfolioItems(data || []);
        } catch (err) {
            console.error('Error loading portfolio:', err);
        }
    };

    const loadAvailabilities = async () => {
        try {
            const data = await api.getMyAvailability();
            setAvailabilities(data || []);
        } catch (err) {
            console.error('Error loading availabilities:', err);
        }
    };

    const loadDocuments = async () => {
        try {
            const data = await api.getMyDocuments();
            setDocuments(data || []);
        } catch (err) {
            console.error('Error loading documents:', err);
        }
    };

    const loadBookings = async () => {
        try {
            const data = await api.getMyBookings();
            setBookings(data.results || data || []);
        } catch (err) {
            console.error('Error loading bookings:', err);
        }
    };

    const loadReviews = async () => {
        try {
            const data = await api.getMyReviews();
            setReviews(data.results || data || []);
        } catch (err) {
            console.error('Error loading reviews:', err);
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

            if (customerProfile) {
                // Update existing profile
                await api.updateCustomerProfile(profileData);
                setSuccess('Profil muvaffaqiyatli yangilandi!');
            } else {
                // Create new profile
                await api.createCustomerProfile(profileData);
                setSuccess('Profil muvaffaqiyatli yaratildi!');
            }

            await loadCustomerProfile();
            setIsEditing(false);
        } catch (err) {
            console.error('Error saving profile:', err);
            setError(err.message || 'Profilni saqlashda xatolik yuz berdi');
        } finally {
            setSaving(false);
        }
    };

    // Portfolio management functions
    const handlePortfolioSave = async (portfolioData) => {
        try {
            setSaving(true);
            setError('');

            if (editingItem) {
                await api.updatePortfolioItem(editingItem.id, portfolioData);
                setSuccess('Portfolio elementi yangilandi!');
            } else {
                await api.createPortfolioItem(portfolioData);
                setSuccess('Portfolio elementi qo\'shildi!');
            }

            await loadPortfolio();
            setShowPortfolioModal(false);
            setEditingItem(null);
        } catch (err) {
            console.error('Error saving portfolio item:', err);
            setError(err.message || 'Portfolio elementini saqlashda xatolik');
        } finally {
            setSaving(false);
        }
    };

    const handlePortfolioDelete = async (id) => {
        if (!window.confirm('Bu portfolio elementini o\'chirishni xohlaysizmi?')) return;

        try {
            setSaving(true);
            await api.deletePortfolioItem(id);
            setSuccess('Portfolio elementi o\'chirildi!');
            await loadPortfolio();
        } catch (err) {
            console.error('Error deleting portfolio item:', err);
            setError(err.message || 'Portfolio elementini o\'chirishda xatolik');
        } finally {
            setSaving(false);
        }
    };

    // Availability management functions
    const handleAvailabilitySave = async (availabilityData) => {
        try {
            setSaving(true);
            setError('');

            if (editingItem) {
                await api.updateAvailability(editingItem.id, availabilityData);
                setSuccess('Mavjudlik yangilandi!');
            } else {
                await api.createAvailability(availabilityData);
                setSuccess('Mavjudlik qo\'shildi!');
            }

            await loadAvailabilities();
            setShowAvailabilityModal(false);
            setEditingItem(null);
        } catch (err) {
            console.error('Error saving availability:', err);
            setError(err.message || 'Mavjudlikni saqlashda xatolik');
        } finally {
            setSaving(false);
        }
    };

    const handleAvailabilityDelete = async (id) => {
        if (!window.confirm('Bu mavjudlikni o\'chirishni xohlaysizmi?')) return;

        try {
            setSaving(true);
            await api.deleteAvailability(id);
            setSuccess('Mavjudlik o\'chirildi!');
            await loadAvailabilities();
        } catch (err) {
            console.error('Error deleting availability:', err);
            setError(err.message || 'Mavjudlikni o\'chirishda xatolik');
        } finally {
            setSaving(false);
        }
    };

    // Document management functions
    const handleDocumentUpload = async (documentData) => {
        try {
            setSaving(true);
            setError('');

            await api.uploadDocument(documentData);
            setSuccess('Hujjat yuklandi!');
            await loadDocuments();
            setShowDocumentModal(false);
        } catch (err) {
            console.error('Error uploading document:', err);
            setError(err.message || 'Hujjat yuklashda xatolik');
        } finally {
            setSaving(false);
        }
    };

    const handleDocumentDelete = async (id) => {
        if (!window.confirm('Bu hujjatni o\'chirishni xohlaysizmi?')) return;

        try {
            setSaving(true);
            await api.deleteDocument(id);
            setSuccess('Hujjat o\'chirildi!');
            await loadDocuments();
        } catch (err) {
            console.error('Error deleting document:', err);
            setError(err.message || 'Hujjatni o\'chirishda xatolik');
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
        if (tab === 'portfolio') {
            await loadPortfolio();
        } else if (tab === 'availability') {
            await loadAvailabilities();
        } else if (tab === 'documents') {
            await loadDocuments();
        } else if (tab === 'bookings') {
            await loadBookings();
        } else if (tab === 'reviews') {
            await loadReviews();
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
                className={`guide-account-w-4 guide-account-h-4 ${i < rating ? 'guide-account-fill-yellow-400 guide-account-text-yellow-400' : 'guide-account-text-gray-300'}`}
            />
        ));
    };

    // Main render function
    if (loading) {
        return (
            <div className="guide-account-min-h-screen guide-account-bg-gray-50 guide-account-flex guide-account-items-center guide-account-justify-center">
                <div className="guide-account-text-center">
                    <div className="guide-account-animate-spin guide-account-rounded-full guide-account-h-12 guide-account-w-12 guide-account-border-b-2 guide-account-border-blue-600 guide-account-mx-auto"></div>
                    <p className="guide-account-mt-4 guide-account-text-gray-600">Ma'lumotlar yuklanmoqda...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="guide-account-min-h-screen guide-account-bg-gray-50">
            {/* Header */}
            <div className="guide-account-bg-white guide-account-shadow-sm guide-account-border-b">
                <div className="guide-account-max-w-7xl guide-account-mx-auto guide-account-px-4 guide-account-sm:px-6 guide-account-lg:px-8">
                    <div className="guide-account-flex guide-account-justify-between guide-account-items-center guide-account-py-6">
                        <div className="guide-account-flex guide-account-items-center guide-account-space-x-4">
                            <div className="guide-account-relative">
                                <div className="guide-account-w-16 guide-account-h-16 guide-account-bg-blue-600 guide-account-rounded-full guide-account-flex guide-account-items-center guide-account-justify-center guide-account-text-white guide-account-text-xl guide-account-font-bold">
                                    {currentUser?.avatar ? (
                                        <img
                                            src={currentUser.avatar}
                                            alt="Avatar"
                                            className="guide-account-w-16 guide-account-h-16 guide-account-rounded-full guide-account-object-cover"
                                        />
                                    ) : (
                                        currentUser?.full_name?.charAt(0) || 'G'
                                    )}
                                </div>
                                <button className="guide-account-absolute guide-account--bottom-1 guide-account--right-1 guide-account-bg-blue-600 guide-account-rounded-full guide-account-p-1 guide-account-text-white guide-account-hover:bg-blue-700">
                                    <Camera className="guide-account-w-3 guide-account-h-3" />
                                </button>
                            </div>
                            <div>
                                <h1 className="guide-account-text-2xl guide-account-font-bold guide-account-text-gray-900">
                                    {customerProfile?.full_name || currentUser?.full_name || 'Guide Account'}
                                </h1>
                                <p className="guide-account-text-gray-600">
                                    {customerProfile?.professional_bio ?
                                        customerProfile.professional_bio.substring(0, 100) + '...' :
                                        'Professional Guide'
                                    }
                                </p>
                                <div className="guide-account-flex guide-account-items-center guide-account-mt-1 guide-account-space-x-4">
                                    {customerProfile?.average_rating && customerProfile.average_rating > 0 && (
                                        <div className="guide-account-flex guide-account-items-center guide-account-space-x-1">
                                            {renderStars(Math.round(customerProfile.average_rating))}
                                            <span className="guide-account-text-sm guide-account-text-gray-600">
                        ({Number(customerProfile.average_rating).toFixed(1)})
                      </span>
                                        </div>
                                    )}
                                    {customerProfile?.is_verified && (
                                        <div className="guide-account-flex guide-account-items-center guide-account-space-x-1 guide-account-text-green-600">
                                            <CheckCircle className="guide-account-w-4 guide-account-h-4" />
                                            <span className="guide-account-text-sm">Verified</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="guide-account-flex guide-account-items-center guide-account-space-x-3">
                            {customerProfile?.is_available ? (
                                <span className="guide-account-inline-flex guide-account-items-center guide-account-px-3 guide-account-py-1 guide-account-rounded-full guide-account-text-sm guide-account-font-medium guide-account-bg-green-100 guide-account-text-green-800">
                  <div className="guide-account-w-2 guide-account-h-2 guide-account-bg-green-400 guide-account-rounded-full guide-account-mr-2"></div>
                  Available
                </span>
                            ) : (
                                <span className="guide-account-inline-flex guide-account-items-center guide-account-px-3 guide-account-py-1 guide-account-rounded-full guide-account-text-sm guide-account-font-medium guide-account-bg-red-100 guide-account-text-red-800">
                  <div className="guide-account-w-2 guide-account-h-2 guide-account-bg-red-400 guide-account-rounded-full guide-account-mr-2"></div>
                  Unavailable
                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Error/Success Messages */}
            {error && (
                <div className="guide-account-max-w-7xl guide-account-mx-auto guide-account-px-4 guide-account-sm:px-6 guide-account-lg:px-8 guide-account-mt-4">
                    <div className="guide-account-bg-red-50 guide-account-border guide-account-border-red-200 guide-account-text-red-700 guide-account-px-4 guide-account-py-3 guide-account-rounded-md guide-account-flex guide-account-items-center">
                        <AlertCircle className="guide-account-w-5 guide-account-h-5 guide-account-mr-2" />
                        {error}
                    </div>
                </div>
            )}

            {success && (
                <div className="guide-account-max-w-7xl guide-account-mx-auto guide-account-px-4 guide-account-sm:px-6 guide-account-lg:px-8 guide-account-mt-4">
                    <div className="guide-account-bg-green-50 guide-account-border guide-account-border-green-200 guide-account-text-green-700 guide-account-px-4 guide-account-py-3 guide-account-rounded-md guide-account-flex guide-account-items-center">
                        <CheckCircle className="guide-account-w-5 guide-account-h-5 guide-account-mr-2" />
                        {success}
                    </div>
                </div>
            )}

            {/* Navigation Tabs */}
            <div className="guide-account-bg-white guide-account-border-b">
                <div className="guide-account-max-w-7xl guide-account-mx-auto guide-account-px-4 guide-account-sm:px-6 guide-account-lg:px-8">
                    <nav className="guide-account-flex guide-account-space-x-8">
                        {[
                            { id: 'profile', label: 'Profile', icon: User },
                            { id: 'portfolio', label: 'Portfolio', icon: Camera },
                            { id: 'availability', label: 'Availability', icon: Calendar },
                            { id: 'documents', label: 'Documents', icon: FileText },
                            { id: 'bookings', label: 'Bookings', icon: Calendar },
                            { id: 'reviews', label: 'Reviews', icon: Star },
                            { id: 'notifications', label: 'Notifications', icon: MessageSquare }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => handleTabChange(tab.id)}
                                className={`guide-account-py-4 guide-account-px-1 guide-account-border-b-2 guide-account-font-medium guide-account-text-sm guide-account-flex guide-account-items-center guide-account-space-x-2 ${
                                    activeTab === tab.id
                                        ? 'guide-account-border-blue-500 guide-account-text-blue-600'
                                        : 'guide-account-border-transparent guide-account-text-gray-500 guide-account-hover:text-gray-700 guide-account-hover:border-gray-300'
                                }`}
                            >
                                <tab.icon className="guide-account-w-4 guide-account-h-4" />
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </nav>
                </div>
            </div>

            {/* Main Content */}
            <div className="guide-account-max-w-7xl guide-account-mx-auto guide-account-px-4 guide-account-sm:px-6 guide-account-lg:px-8 guide-account-py-8">
                {activeTab === 'profile' && (
                    <ProfileSection
                        customerProfile={customerProfile}
                        profileData={profileData}
                        setProfileData={setProfileData}
                        isEditing={isEditing}
                        setIsEditing={setIsEditing}
                        saving={saving}
                        onSave={handleProfileSave}
                        countries={countries}
                        cities={cities}
                        languages={languages}
                        serviceTypes={serviceTypes}
                        onCountryChange={loadCities}
                    />
                )}

                {activeTab === 'portfolio' && (
                    <PortfolioSection
                        portfolioItems={portfolioItems}
                        onAdd={() => {
                            setEditingItem(null);
                            setShowPortfolioModal(true);
                        }}
                        onEdit={(item) => {
                            setEditingItem(item);
                            setShowPortfolioModal(true);
                        }}
                        onDelete={handlePortfolioDelete}
                        saving={saving}
                    />
                )}

                {activeTab === 'availability' && (
                    <AvailabilitySection
                        availabilities={availabilities}
                        onAdd={() => {
                            setEditingItem(null);
                            setShowAvailabilityModal(true);
                        }}
                        onEdit={(item) => {
                            setEditingItem(item);
                            setShowAvailabilityModal(true);
                        }}
                        onDelete={handleAvailabilityDelete}
                        saving={saving}
                    />
                )}

                {activeTab === 'documents' && (
                    <DocumentsSection
                        documents={documents}
                        onAdd={() => setShowDocumentModal(true)}
                        onDelete={handleDocumentDelete}
                        saving={saving}
                    />
                )}

                {activeTab === 'bookings' && (
                    <BookingsSection
                        bookings={bookings}
                        onStatusChange={async (id, status) => {
                            try {
                                await api.updateBookingStatus(id, status);
                                setSuccess('Booking holati yangilandi!');
                                await loadBookings();
                            } catch (err) {
                                setError(err.message || 'Booking holatini yangilashda xatolik');
                            }
                        }}
                    />
                )}

                {activeTab === 'reviews' && (
                    <ReviewsSection
                        reviews={reviews}
                        customerProfile={customerProfile}
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

            {/* Modals */}
            {showPortfolioModal && (
                <PortfolioModal
                    isOpen={showPortfolioModal}
                    onClose={() => {
                        setShowPortfolioModal(false);
                        setEditingItem(null);
                    }}
                    onSave={handlePortfolioSave}
                    editingItem={editingItem}
                    saving={saving}
                />
            )}

            {showAvailabilityModal && (
                <AvailabilityModal
                    isOpen={showAvailabilityModal}
                    onClose={() => {
                        setShowAvailabilityModal(false);
                        setEditingItem(null);
                    }}
                    onSave={handleAvailabilitySave}
                    editingItem={editingItem}
                    saving={saving}
                />
            )}

            {showDocumentModal && (
                <DocumentModal
                    isOpen={showDocumentModal}
                    onClose={() => setShowDocumentModal(false)}
                    onSave={handleDocumentUpload}
                    saving={saving}
                />
            )}
        </div>
    );
};

// Profile Section Component
const ProfileSection = ({
                            customerProfile,
                            profileData,
                            setProfileData,
                            isEditing,
                            setIsEditing,
                            saving,
                            onSave,
                            countries,
                            cities,
                            languages,
                            serviceTypes,
                            onCountryChange
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

    const handleCountryChange = (countryId) => {
        handleInputChange('country', countryId);
        onCountryChange(countryId);
    };

    if (!customerProfile && !isEditing) {
        return (
            <div className="guide-account-bg-white guide-account-rounded-lg guide-account-shadow guide-account-p-6 guide-account-text-center">
                <User className="guide-account-w-16 guide-account-h-16 guide-account-text-gray-400 guide-account-mx-auto guide-account-mb-4" />
                <h3 className="guide-account-text-lg guide-account-font-medium guide-account-text-gray-900 guide-account-mb-2">
                    Customer profili mavjud emas
                </h3>
                <p className="guide-account-text-gray-600 guide-account-mb-6">
                    Guide sifatida ishlash uchun customer profili yarating
                </p>
                <button
                    onClick={() => setIsEditing(true)}
                    className="guide-account-bg-blue-600 guide-account-text-white guide-account-px-6 guide-account-py-2 guide-account-rounded-md guide-account-hover:bg-blue-700 guide-account-transition-colors"
                >
                    Profil yaratish
                </button>
            </div>
        );
    }

    return (
        <div className="guide-account-guide-account-card">
            <div className="guide-account-guide-account-card-header">
                <h2 className="guide-account-guide-account-card-title">Profile Information</h2>
                {!isEditing ? (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="guide-account-guide-account-btn guide-account-guide-account-btn-text"
                    >
                        <Edit3 className="guide-account-guide-account-btn-icon" />
                        <span>Edit</span>
                    </button>
                ) : (
                    <div className="guide-account-guide-account-btn-group">
                        <button
                            onClick={onSave}
                            disabled={saving}
                            className="guide-account-guide-account-btn guide-account-guide-account-btn-primary"
                        >
                            <Save className="guide-account-guide-account-btn-icon" />
                            <span>{saving ? 'Saving...' : 'Save'}</span>
                        </button>
                        <button
                            onClick={() => setIsEditing(false)}
                            className="guide-account-guide-account-btn guide-account-guide-account-btn-secondary"
                        >
                            <X className="guide-account-guide-account-btn-icon" />
                            <span>Cancel</span>
                        </button>
                    </div>
                )}
            </div>

            <div className="guide-account-guide-account-card-content">
                <div className="guide-account-guide-account-form-grid">
                    {/* Professional Bio */}
                    <div className="guide-account-guide-account-form-group guide-account-guide-account-form-group-full">
                        <label className="guide-account-guide-account-form-label">
                            Professional Bio
                        </label>
                        {isEditing ? (
                            <textarea
                                value={profileData.professional_bio || ''}
                                onChange={(e) => handleInputChange('professional_bio', e.target.value)}
                                rows={4}
                                className="guide-account-guide-account-form-input guide-account-guide-account-form-textarea"
                                placeholder="Tell clients about your experience and expertise..."
                            />
                        ) : (
                            <p className="guide-account-guide-account-form-value">
                                {customerProfile?.professional_bio || 'Bio mavjud emas'}
                            </p>
                        )}
                    </div>

                    {/* Years of Experience */}
                    <div className="guide-account-guide-account-form-group">
                        <label className="guide-account-guide-account-form-label">
                            Years of Experience
                        </label>
                        {isEditing ? (
                            <input
                                type="number"
                                value={profileData.years_of_experience || ''}
                                onChange={(e) => handleInputChange('years_of_experience', parseInt(e.target.value))}
                                className="guide-account-guide-account-form-input"
                                placeholder="0"
                                min="0"
                            />
                        ) : (
                            <p className="guide-account-guide-account-form-value">
                                {customerProfile?.years_of_experience || 0} years
                            </p>
                        )}
                    </div>

                    {/* City */}
                    <div className="guide-account-guide-account-form-group">
                        <label className="guide-account-guide-account-form-label">
                            City
                        </label>
                        {isEditing ? (
                            <select
                                value={profileData.city || ''}
                                onChange={(e) => handleInputChange('city', e.target.value)}
                                className="guide-account-guide-account-form-input guide-account-guide-account-form-select"
                            >
                                <option value="">Select city</option>
                                {cities.map(city => (
                                    <option key={city.id} value={city.id}>
                                        {city.name}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <p className="guide-account-guide-account-form-value">
                                {customerProfile?.city_name || 'City not set'}
                            </p>
                        )}
                    </div>

                    {/* Service Areas */}
                    <div className="guide-account-guide-account-form-group">
                        <label className="guide-account-guide-account-form-label">
                            Service Areas
                        </label>
                        {isEditing ? (
                            <input
                                type="text"
                                value={profileData.service_areas || ''}
                                onChange={(e) => handleInputChange('service_areas', e.target.value)}
                                className="guide-account-guide-account-form-input"
                                placeholder="Tashkent, Samarkand, Bukhara..."
                            />
                        ) : (
                            <p className="guide-account-guide-account-form-value">
                                {customerProfile?.service_areas || 'Service areas not set'}
                            </p>
                        )}
                    </div>

                    {/* Hourly Rate */}
                    <div className="guide-account-guide-account-form-group">
                        <label className="guide-account-guide-account-form-label">
                            Hourly Rate
                        </label>
                        {isEditing ? (
                            <div className="guide-account-guide-account-form-input-group">
                                <input
                                    type="number"
                                    value={profileData.hourly_rate || ''}
                                    onChange={(e) => handleInputChange('hourly_rate', parseFloat(e.target.value))}
                                    className="guide-account-guide-account-form-input guide-account-guide-account-form-input-flex"
                                    placeholder="0.00"
                                    min="0"
                                    step="0.01"
                                />
                                <select
                                    value={profileData.currency || 'USD'}
                                    onChange={(e) => handleInputChange('currency', e.target.value)}
                                    className="guide-account-guide-account-form-input guide-account-guide-account-form-select"
                                >
                                    <option value="USD">USD</option>
                                    <option value="UZS">UZS</option>
                                    <option value="EUR">EUR</option>
                                </select>
                            </div>
                        ) : (
                            <p className="guide-account-guide-account-form-value">
                                {customerProfile?.hourly_rate ?
                                    `${customerProfile.hourly_rate} ${customerProfile.currency || 'USD'}/hour` :
                                    'Rate not set'
                                }
                            </p>
                        )}
                    </div>

                    {/* Service Types */}
                    <div className="guide-account-guide-account-form-group guide-account-guide-account-form-group-full">
                        <label className="guide-account-guide-account-form-label">
                            Service Types
                        </label>
                        {isEditing ? (
                            <div className="guide-account-guide-account-checkbox-grid">
                                {serviceTypes.map(service => (
                                    <label key={service.id} className="guide-account-guide-account-checkbox-item">
                                        <input
                                            type="checkbox"
                                            checked={(profileData.service_types || []).includes(service.id)}
                                            onChange={(e) => {
                                                const currentServices = profileData.service_types || [];
                                                if (e.target.checked) {
                                                    handleArrayChange('service_types', [...currentServices, service.id]);
                                                } else {
                                                    handleArrayChange('service_types', currentServices.filter(id => id !== service.id));
                                                }
                                            }}
                                            className="guide-account-guide-account-checkbox"
                                        />
                                        <span className="guide-account-guide-account-checkbox-label">{service.name}</span>
                                    </label>
                                ))}
                            </div>
                        ) : (
                            <div className="guide-account-guide-account-tags">
                                {customerProfile?.service_types?.map(service => (
                                    <span
                                        key={service.id}
                                        className="guide-account-guide-account-tag guide-account-guide-account-tag-blue"
                                    >
                                    {service.name}
                                </span>
                                )) || <span className="guide-account-guide-account-form-value-empty">No services selected</span>}
                            </div>
                        )}
                    </div>

                    {/* Languages */}
                    <div className="guide-account-guide-account-form-group guide-account-guide-account-form-group-full">
                        <label className="guide-account-guide-account-form-label">
                            Languages
                        </label>
                        {isEditing ? (
                            <div className="guide-account-guide-account-checkbox-grid guide-account-guide-account-checkbox-grid-wide">
                                {languages.map(language => (
                                    <label key={language.id} className="guide-account-guide-account-checkbox-item">
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
                                            className="guide-account-guide-account-checkbox"
                                        />
                                        <span className="guide-account-guide-account-checkbox-label">{language.name}</span>
                                    </label>
                                ))}
                            </div>
                        ) : (
                            <div className="guide-account-guide-account-tags">
                                {customerProfile?.languages?.map(language => (
                                    <span
                                        key={language.id}
                                        className="guide-account-guide-account-tag guide-account-guide-account-tag-green"
                                    >
                                    {language.name}
                                </span>
                                )) || <span className="guide-account-guide-account-form-value-empty">No languages selected</span>}
                            </div>
                        )}
                    </div>

                    {/* Availability Status */}
                    <div className="guide-account-guide-account-form-group">
                        <label className="guide-account-guide-account-form-label">
                            Availability Status
                        </label>
                        {isEditing ? (
                            <label className="guide-account-guide-account-checkbox-item">
                                <input
                                    type="checkbox"
                                    checked={profileData.is_available || false}
                                    onChange={(e) => handleInputChange('is_available', e.target.checked)}
                                    className="guide-account-guide-account-checkbox"
                                />
                                <span className="guide-account-guide-account-checkbox-label">Available for bookings</span>
                            </label>
                        ) : (
                            <p className={`guide-account-guide-account-form-value guide-account-guide-account-form-value-status ${customerProfile?.is_available ? 'guide-account-guide-account-text-success' : 'guide-account-guide-account-text-danger'}`}>
                                {customerProfile?.is_available ? 'Available' : 'Unavailable'}
                            </p>
                        )}
                    </div>

                    {/* Statistics */}
                    {customerProfile && (
                        <div className="guide-account-guide-account-form-group">
                            <label className="guide-account-guide-account-form-label">
                                Statistics
                            </label>
                            <div className="guide-account-guide-account-stats">
                                <div className="guide-account-guide-account-stat-item">
                                    <span className="guide-account-guide-account-stat-label">Total Bookings:</span>
                                    <span className="guide-account-guide-account-stat-value">{customerProfile.total_bookings || 0}</span>
                                </div>
                                <div className="guide-account-guide-account-stat-item">
                                    <span className="guide-account-guide-account-stat-label">Total Reviews:</span>
                                    <span className="guide-account-guide-account-stat-value">{customerProfile.total_reviews || 0}</span>
                                </div>
                                <div className="guide-account-guide-account-stat-item">
                                    <span className="guide-account-guide-account-stat-label">Average Rating:</span>
                                    <span className="guide-account-guide-account-stat-value">
                                    {customerProfile.average_rating && customerProfile.average_rating > 0 ?
                                        `${Number(customerProfile.average_rating).toFixed(1)}/5` :
                                        'No ratings yet'
                                    }
                                </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Portfolio Section Component
const PortfolioSection = ({ portfolioItems, onAdd, onEdit, onDelete, saving }) => {
    return (
        <div className="guide-account-space-y-6">
            <div className="guide-account-flex guide-account-justify-between guide-account-items-center">
                <h2 className="guide-account-text-lg guide-account-font-medium guide-account-text-gray-900">Portfolio</h2>
                <button
                    onClick={onAdd}
                    className="guide-account-flex guide-account-items-center guide-account-space-x-2 guide-account-bg-blue-600 guide-account-text-white guide-account-px-4 guide-account-py-2 guide-account-rounded-md guide-account-hover:bg-blue-700"
                >
                    <Plus className="guide-account-w-4 guide-account-h-4" />
                    <span>Add Item</span>
                </button>
            </div>

            {portfolioItems.length === 0 ? (
                <div className="guide-account-bg-white guide-account-rounded-lg guide-account-shadow guide-account-p-6 guide-account-text-center">
                    <Camera className="guide-account-w-16 guide-account-h-16 guide-account-text-gray-400 guide-account-mx-auto guide-account-mb-4" />
                    <h3 className="guide-account-text-lg guide-account-font-medium guide-account-text-gray-900 guide-account-mb-2">
                        No portfolio items yet
                    </h3>
                    <p className="guide-account-text-gray-600 guide-account-mb-6">
                        Showcase your work by adding photos and descriptions
                    </p>
                    <button
                        onClick={onAdd}
                        className="guide-account-bg-blue-600 guide-account-text-white guide-account-px-6 guide-account-py-2 guide-account-rounded-md guide-account-hover:bg-blue-700"
                    >
                        Add First Item
                    </button>
                </div>
            ) : (
                <div className="guide-account-grid guide-account-grid-cols-1 guide-account-md:grid-cols-2 guide-account-lg:grid-cols-3 guide-account-gap-6">
                    {portfolioItems.map((item) => (
                        <div key={item.id} className="guide-account-bg-white guide-account-rounded-lg guide-account-shadow guide-account-overflow-hidden">
                            {item.image && (
                                <img
                                    src={item.image}
                                    alt={item.title}
                                    className="guide-account-w-full guide-account-h-48 guide-account-object-cover"
                                />
                            )}
                            <div className="guide-account-p-4">
                                <h3 className="guide-account-font-medium guide-account-text-gray-900 guide-account-mb-2">{item.title}</h3>
                                <p className="guide-account-text-gray-600 guide-account-text-sm guide-account-mb-4">
                                    {item.description?.substring(0, 100)}
                                    {item.description?.length > 100 && '...'}
                                </p>
                                <div className="guide-account-flex guide-account-justify-between guide-account-items-center">
                  <span className="guide-account-text-xs guide-account-text-gray-500">
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                                    <div className="guide-account-flex guide-account-space-x-2">
                                        <button
                                            onClick={() => onEdit(item)}
                                            className="guide-account-text-blue-600 guide-account-hover:text-blue-800"
                                        >
                                            <Edit3 className="guide-account-w-4 guide-account-h-4" />
                                        </button>
                                        <button
                                            onClick={() => onDelete(item.id)}
                                            disabled={saving}
                                            className="guide-account-text-red-600 guide-account-hover:text-red-800 guide-account-disabled:opacity-50"
                                        >
                                            <Trash2 className="guide-account-w-4 guide-account-h-4" />
                                        </button>
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

// Availability Section Component
const AvailabilitySection = ({ availabilities, onAdd, onEdit, onDelete, saving }) => {
    return (
        <div className="guide-account-space-y-6">
            <div className="guide-account-flex guide-account-justify-between guide-account-items-center">
                <h2 className="guide-account-text-lg guide-account-font-medium guide-account-text-gray-900">Availability</h2>
                <button
                    onClick={onAdd}
                    className="guide-account-flex guide-account-items-center guide-account-space-x-2 guide-account-bg-blue-600 guide-account-text-white guide-account-px-4 guide-account-py-2 guide-account-rounded-md guide-account-hover:bg-blue-700"
                >
                    <Plus className="guide-account-w-4 guide-account-h-4" />
                    <span>Add Availability</span>
                </button>
            </div>

            {availabilities.length === 0 ? (
                <div className="guide-account-bg-white guide-account-rounded-lg guide-account-shadow guide-account-p-6 guide-account-text-center">
                    <Calendar className="guide-account-w-16 guide-account-h-16 guide-account-text-gray-400 guide-account-mx-auto guide-account-mb-4" />
                    <h3 className="guide-account-text-lg guide-account-font-medium guide-account-text-gray-900 guide-account-mb-2">
                        No availability set
                    </h3>
                    <p className="guide-account-text-gray-600 guide-account-mb-6">
                        Set your available dates and times for bookings
                    </p>
                    <button
                        onClick={onAdd}
                        className="guide-account-bg-blue-600 guide-account-text-white guide-account-px-6 guide-account-py-2 guide-account-rounded-md guide-account-hover:bg-blue-700"
                    >
                        Set Availability
                    </button>
                </div>
            ) : (
                <div className="guide-account-bg-white guide-account-rounded-lg guide-account-shadow guide-account-overflow-hidden">
                    <table className="guide-account-min-w-full guide-account-divide-y guide-account-divide-gray-200">
                        <thead className="guide-account-bg-gray-50">
                        <tr>
                            <th className="guide-account-px-6 guide-account-py-3 guide-account-text-left guide-account-text-xs guide-account-font-medium guide-account-text-gray-500 guide-account-uppercase guide-account-tracking-wider">
                                Date
                            </th>
                            <th className="guide-account-px-6 guide-account-py-3 guide-account-text-left guide-account-text-xs guide-account-font-medium guide-account-text-gray-500 guide-account-uppercase guide-account-tracking-wider">
                                Time
                            </th>
                            <th className="guide-account-px-6 guide-account-py-3 guide-account-text-left guide-account-text-xs guide-account-font-medium guide-account-text-gray-500 guide-account-uppercase guide-account-tracking-wider">
                                Status
                            </th>
                            <th className="guide-account-px-6 guide-account-py-3 guide-account-text-left guide-account-text-xs guide-account-font-medium guide-account-text-gray-500 guide-account-uppercase guide-account-tracking-wider">
                                Note
                            </th>
                            <th className="guide-account-px-6 guide-account-py-3 guide-account-text-left guide-account-text-xs guide-account-font-medium guide-account-text-gray-500 guide-account-uppercase guide-account-tracking-wider">
                                Actions
                            </th>
                        </tr>
                        </thead>
                        <tbody className="guide-account-bg-white guide-account-divide-y guide-account-divide-gray-200">
                        {availabilities.map((availability) => (
                            <tr key={availability.id}>
                                <td className="guide-account-px-6 guide-account-py-4 guide-account-whitespace-nowrap guide-account-text-sm guide-account-text-gray-900">
                                    {new Date(availability.date).toLocaleDateString()}
                                </td>
                                <td className="guide-account-px-6 guide-account-py-4 guide-account-whitespace-nowrap guide-account-text-sm guide-account-text-gray-900">
                                    {availability.start_time && availability.end_time
                                        ? `${availability.start_time} - ${availability.end_time}`
                                        : 'All day'
                                    }
                                </td>
                                <td className="guide-account-px-6 guide-account-py-4 guide-account-whitespace-nowrap">
                    <span className={`guide-account-inline-flex guide-account-items-center guide-account-px-3 guide-account-py-1 guide-account-rounded-full guide-account-text-sm guide-account-font-medium ${
                        availability.is_available
                            ? 'guide-account-bg-green-100 guide-account-text-green-800'
                            : 'guide-account-bg-red-100 guide-account-text-red-800'
                    }`}>
                      {availability.is_available ? 'Available' : 'Unavailable'}
                    </span>
                                </td>
                                <td className="guide-account-px-6 guide-account-py-4 guide-account-text-sm guide-account-text-gray-900">
                                    {availability.note || '-'}
                                </td>
                                <td className="guide-account-px-6 guide-account-py-4 guide-account-whitespace-nowrap guide-account-text-sm guide-account-text-gray-500">
                                    <div className="guide-account-flex guide-account-space-x-2">
                                        <button
                                            onClick={() => onEdit(availability)}
                                            className="guide-account-text-blue-600 guide-account-hover:text-blue-800"
                                        >
                                            <Edit3 className="guide-account-w-4 guide-account-h-4" />
                                        </button>
                                        <button
                                            onClick={() => onDelete(availability.id)}
                                            disabled={saving}
                                            className="guide-account-text-red-600 guide-account-hover:text-red-800 guide-account-disabled:opacity-50"
                                        >
                                            <Trash2 className="guide-account-w-4 guide-account-h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

// Documents Section Component
const DocumentsSection = ({ documents, onAdd, onDelete, saving }) => {
    const getDocumentIcon = (type) => {
        switch (type) {
            case 'ID':
                return <User className="guide-account-w-8 guide-account-h-8 guide-account-text-blue-600" />;
            case 'LICENSE':
                return <FileText className="guide-account-w-8 guide-account-h-8 guide-account-text-green-600" />;
            case 'CERTIFICATE':
                return <FileText className="guide-account-w-8 guide-account-h-8 guide-account-text-purple-600" />;
            default:
                return <FileText className="guide-account-w-8 guide-account-h-8 guide-account-text-gray-600" />;
        }
    };

    const getStatusColor = (isVerified) => {
        return isVerified ? 'guide-account-text-green-600' : 'guide-account-text-yellow-600';
    };

    return (
        <div className="guide-account-space-y-6">
            <div className="guide-account-flex guide-account-justify-between guide-account-items-center">
                <h2 className="guide-account-text-lg guide-account-font-medium guide-account-text-gray-900">Verification Documents</h2>
                <button
                    onClick={onAdd}
                    className="guide-account-flex guide-account-items-center guide-account-space-x-2 guide-account-bg-blue-600 guide-account-text-white guide-account-px-4 guide-account-py-2 guide-account-rounded-md guide-account-hover:bg-blue-700"
                >
                    <Upload className="guide-account-w-4 guide-account-h-4" />
                    <span>Upload Document</span>
                </button>
            </div>

            {documents.length === 0 ? (
                <div className="guide-account-bg-white guide-account-rounded-lg guide-account-shadow guide-account-p-6 guide-account-text-center">
                    <FileText className="guide-account-w-16 guide-account-h-16 guide-account-text-gray-400 guide-account-mx-auto guide-account-mb-4" />
                    <h3 className="guide-account-text-lg guide-account-font-medium guide-account-text-gray-900 guide-account-mb-2">
                        No documents uploaded
                    </h3>
                    <p className="guide-account-text-gray-600 guide-account-mb-6">
                        Upload verification documents to build trust with clients
                    </p>
                    <button
                        onClick={onAdd}
                        className="guide-account-bg-blue-600 guide-account-text-white guide-account-px-6 guide-account-py-2 guide-account-rounded-md guide-account-hover:bg-blue-700"
                    >
                        Upload First Document
                    </button>
                </div>
            ) : (
                <div className="guide-account-grid guide-account-grid-cols-1 guide-account-md:grid-cols-2 guide-account-lg:grid-cols-3 guide-account-gap-6">
                    {documents.map((document) => (
                        <div key={document.id} className="guide-account-bg-white guide-account-rounded-lg guide-account-shadow guide-account-p-6">
                            <div className="guide-account-flex guide-account-items-center guide-account-justify-between guide-account-mb-4">
                                {getDocumentIcon(document.document_type)}
                                <span className={`guide-account-text-sm guide-account-font-medium ${getStatusColor(document.is_verified)}`}>
                  {document.is_verified ? 'Verified' : 'Pending'}
                </span>
                            </div>
                            <h3 className="guide-account-font-medium guide-account-text-gray-900 guide-account-mb-2">
                                {document.document_type.replace('_', ' ')}
                            </h3>
                            <p className="guide-account-text-gray-600 guide-account-text-sm guide-account-mb-4">
                                {document.description || 'No description provided'}
                            </p>
                            <div className="guide-account-flex guide-account-justify-between guide-account-items-center">
                <span className="guide-account-text-xs guide-account-text-gray-500">
                  {new Date(document.created_at).toLocaleDateString()}
                </span>
                                <div className="guide-account-flex guide-account-space-x-2">
                                    {document.file && (
                                        <a
                                            href={document.file}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="guide-account-text-blue-600 guide-account-hover:text-blue-800"
                                        >
                                            <Eye className="guide-account-w-4 guide-account-h-4" />
                                        </a>
                                    )}
                                    <button
                                        onClick={() => onDelete(document.id)}
                                        disabled={saving}
                                        className="guide-account-text-red-600 guide-account-hover:text-red-800 guide-account-disabled:opacity-50"
                                    >
                                        <Trash2 className="guide-account-w-4 guide-account-h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// Bookings Section Component
const BookingsSection = ({ bookings, onStatusChange }) => {
    const getStatusColor = (status) => {
        switch (status) {
            case 'PENDING':
                return 'guide-account-bg-yellow-100 guide-account-text-yellow-800';
            case 'ACCEPTED':
                return 'guide-account-bg-green-100 guide-account-text-green-800';
            case 'COMPLETED':
                return 'guide-account-bg-blue-100 guide-account-text-blue-800';
            case 'CANCELLED':
                return 'guide-account-bg-red-100 guide-account-text-red-800';
            default:
                return 'guide-account-bg-gray-100 guide-account-text-gray-800';
        }
    };

    return (
        <div className="guide-account-space-y-6">
            <h2 className="guide-account-text-lg guide-account-font-medium guide-account-text-gray-900">My Bookings</h2>

            {bookings.length === 0 ? (
                <div className="guide-account-bg-white guide-account-rounded-lg guide-account-shadow guide-account-p-6 guide-account-text-center">
                    <Calendar className="guide-account-w-16 guide-account-h-16 guide-account-text-gray-400 guide-account-mx-auto guide-account-mb-4" />
                    <h3 className="guide-account-text-lg guide-account-font-medium guide-account-text-gray-900 guide-account-mb-2">
                        No bookings yet
                    </h3>
                    <p className="guide-account-text-gray-600">
                        Your bookings will appear here once clients start booking your services
                    </p>
                </div>
            ) : (
                <div className="guide-account-bg-white guide-account-rounded-lg guide-account-shadow guide-account-overflow-hidden">
                    <table className="guide-account-min-w-full guide-account-divide-y guide-account-divide-gray-200">
                        <thead className="guide-account-bg-gray-50">
                        <tr>
                            <th className="guide-account-px-6 guide-account-py-3 guide-account-text-left guide-account-text-xs guide-account-font-medium guide-account-text-gray-500 guide-account-uppercase guide-account-tracking-wider">
                                Client
                            </th>
                            <th className="guide-account-px-6 guide-account-py-3 guide-account-text-left guide-account-text-xs guide-account-font-medium guide-account-text-gray-500 guide-account-uppercase guide-account-tracking-wider">
                                Date Range
                            </th>
                            <th className="guide-account-px-6 guide-account-py-3 guide-account-text-left guide-account-text-xs guide-account-font-medium guide-account-text-gray-500 guide-account-uppercase guide-account-tracking-wider">
                                Status
                            </th>
                            <th className="guide-account-px-6 guide-account-py-3 guide-account-text-left guide-account-text-xs guide-account-font-medium guide-account-text-gray-500 guide-account-uppercase guide-account-tracking-wider">
                                Amount
                            </th>
                            <th className="guide-account-px-6 guide-account-py-3 guide-account-text-left guide-account-text-xs guide-account-font-medium guide-account-text-gray-500 guide-account-uppercase guide-account-tracking-wider">
                                Actions
                            </th>
                        </tr>
                        </thead>
                        <tbody className="guide-account-bg-white guide-account-divide-y guide-account-divide-gray-200">
                        {bookings.map((booking) => (
                            <tr key={booking.id}>
                                <td className="guide-account-px-6 guide-account-py-4 guide-account-whitespace-nowrap">
                                    <div className="guide-account-flex guide-account-items-center">
                                        <div className="guide-account-w-10 guide-account-h-10 guide-account-bg-gray-300 guide-account-rounded-full guide-account-flex guide-account-items-center guide-account-justify-center">
                                            {booking.client_profile?.user?.full_name?.charAt(0) || 'C'}
                                        </div>
                                        <div className="guide-account-ml-4">
                                            <div className="guide-account-text-sm guide-account-font-medium guide-account-text-gray-900">
                                                {booking.client_profile?.user?.full_name || 'Unknown Client'}
                                            </div>
                                            <div className="guide-account-text-sm guide-account-text-gray-500">
                                                {booking.client_profile?.user?.email}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="guide-account-px-6 guide-account-py-4 guide-account-whitespace-nowrap guide-account-text-sm guide-account-text-gray-900">
                                    {new Date(booking.start_date).toLocaleDateString()} -
                                    {new Date(booking.end_date).toLocaleDateString()}
                                </td>
                                <td className="guide-account-px-6 guide-account-py-4 guide-account-whitespace-nowrap">
                    <span className={`guide-account-inline-flex guide-account-items-center guide-account-px-3 guide-account-py-1 guide-account-rounded-full guide-account-text-sm guide-account-font-medium ${getStatusColor(booking.status)}`}>
                      {booking.status}
                    </span>
                                </td>
                                <td className="guide-account-px-6 guide-account-py-4 guide-account-whitespace-nowrap guide-account-text-sm guide-account-text-gray-900">
                                    ${booking.total_amount || 0}
                                </td>
                                <td className="guide-account-px-6 guide-account-py-4 guide-account-whitespace-nowrap guide-account-text-sm guide-account-text-gray-500">
                                    <div className="guide-account-flex guide-account-space-x-2">
                                        {booking.status === 'PENDING' && (
                                            <>
                                                <button
                                                    onClick={() => onStatusChange(booking.id, 'ACCEPTED')}
                                                    className="guide-account-text-green-600 guide-account-hover:text-green-800"
                                                >
                                                    Accept
                                                </button>
                                                <button
                                                    onClick={() => onStatusChange(booking.id, 'CANCELLED')}
                                                    className="guide-account-text-red-600 guide-account-hover:text-red-800"
                                                >
                                                    Decline
                                                </button>
                                            </>
                                        )}
                                        {booking.status === 'ACCEPTED' && (
                                            <button
                                                onClick={() => onStatusChange(booking.id, 'COMPLETED')}
                                                className="guide-account-text-blue-600 guide-account-hover:text-blue-800"
                                            >
                                                Mark Complete
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

// Reviews Section Component
const ReviewsSection = ({ reviews, customerProfile }) => {
    const renderStars = (rating) => {
        return Array.from({ length: 5 }, (_, i) => (
            <Star
                key={i}
                className={`guide-account-w-4 guide-account-h-4 ${i < rating ? 'guide-account-fill-yellow-400 guide-account-text-yellow-400' : 'guide-account-text-gray-300'}`}
            />
        ));
    };

    return (
        <div className="guide-account-space-y-6">
            <div className="guide-account-flex guide-account-justify-between guide-account-items-center">
                <h2 className="guide-account-text-lg guide-account-font-medium guide-account-text-gray-900">Customer Reviews</h2>
                {customerProfile && (
                    <div className="guide-account-text-right">
                        <div className="guide-account-flex guide-account-items-center guide-account-space-x-2">
                            {renderStars(Math.round(customerProfile.average_rating || 0))}
                            <span className="guide-account-text-lg guide-account-font-medium guide-account-text-gray-900">
                {customerProfile.average_rating?.toFixed(1) || '0.0'}
              </span>
                        </div>
                        <p className="guide-account-text-sm guide-account-text-gray-600">
                            {customerProfile.total_reviews || 0} reviews
                        </p>
                    </div>
                )}
            </div>

            {reviews.length === 0 ? (
                <div className="guide-account-bg-white guide-account-rounded-lg guide-account-shadow guide-account-p-6 guide-account-text-center">
                    <Star className="guide-account-w-16 guide-account-h-16 guide-account-text-gray-400 guide-account-mx-auto guide-account-mb-4" />
                    <h3 className="guide-account-text-lg guide-account-font-medium guide-account-text-gray-900 guide-account-mb-2">
                        No reviews yet
                    </h3>
                    <p className="guide-account-text-gray-600">
                        Complete your first booking to start receiving reviews
                    </p>
                </div>
            ) : (
                <div className="guide-account-space-y-4">
                    {reviews.map((review) => (
                        <div key={review.id} className="guide-account-bg-white guide-account-rounded-lg guide-account-shadow guide-account-p-6">
                            <div className="guide-account-flex guide-account-items-start guide-account-justify-between guide-account-mb-4">
                                <div className="guide-account-flex guide-account-items-center guide-account-space-x-3">
                                    <div className="guide-account-w-10 guide-account-h-10 guide-account-bg-gray-300 guide-account-rounded-full guide-account-flex guide-account-items-center guide-account-justify-center">
                                        {review.client?.full_name?.charAt(0) || 'C'}
                                    </div>
                                    <div>
                                        <h4 className="guide-account-font-medium guide-account-text-gray-900">
                                            {review.client?.full_name || 'Anonymous Client'}
                                        </h4>
                                        <div className="guide-account-flex guide-account-items-center guide-account-space-x-1">
                                            {renderStars(review.overall_rating)}
                                            <span className="guide-account-text-sm guide-account-text-gray-600">
                        {new Date(review.created_at).toLocaleDateString()}
                      </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {review.title && (
                                <h5 className="guide-account-font-medium guide-account-text-gray-900 guide-account-mb-2">{review.title}</h5>
                            )}

                            <p className="guide-account-text-gray-700 guide-account-mb-4">{review.comment}</p>

                            <div className="guide-account-grid guide-account-grid-cols-2 guide-account-md:grid-cols-4 guide-account-gap-4 guide-account-text-sm">
                                <div>
                                    <span className="guide-account-text-gray-600">Communication:</span>
                                    <div className="guide-account-flex guide-account-items-center guide-account-space-x-1">
                                        {renderStars(review.communication_rating)}
                                    </div>
                                </div>
                                <div>
                                    <span className="guide-account-text-gray-600">Service:</span>
                                    <div className="guide-account-flex guide-account-items-center guide-account-space-x-1">
                                        {renderStars(review.service_rating)}
                                    </div>
                                </div>
                                <div>
                                    <span className="guide-account-text-gray-600">Punctuality:</span>
                                    <div className="guide-account-flex guide-account-items-center guide-account-space-x-1">
                                        {renderStars(review.punctuality_rating)}
                                    </div>
                                </div>
                                <div>
                                    <span className="guide-account-text-gray-600">Value:</span>
                                    <div className="guide-account-flex guide-account-items-center guide-account-space-x-1">
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

// Notifications Section Component
const NotificationsSection = ({ notifications, onMarkAsRead, onMarkAllAsRead }) => {
    return (
        <div className="guide-account-space-y-6">
            <div className="guide-account-flex guide-account-justify-between guide-account-items-center">
                <h2 className="guide-account-text-lg guide-account-font-medium guide-account-text-gray-900">Notifications</h2>
                {notifications.some(n => !n.is_read) && (
                    <button
                        onClick={onMarkAllAsRead}
                        className="guide-account-text-blue-600 guide-account-hover:text-blue-800 guide-account-text-sm"
                    >
                        Mark all as read
                    </button>
                )}
            </div>

            {notifications.length === 0 ? (
                <div className="guide-account-bg-white guide-account-rounded-lg guide-account-shadow guide-account-p-6 guide-account-text-center">
                    <MessageSquare className="guide-account-w-16 guide-account-h-16 guide-account-text-gray-400 guide-account-mx-auto guide-account-mb-4" />
                    <h3 className="guide-account-text-lg guide-account-font-medium guide-account-text-gray-900 guide-account-mb-2">
                        No notifications
                    </h3>
                    <p className="guide-account-text-gray-600">
                        You'll receive notifications about bookings, messages, and more
                    </p>
                </div>
            ) : (
                <div className="guide-account-space-y-3">
                    {notifications.map((notification) => (
                        <div
                            key={notification.id}
                            className={`guide-account-bg-white guide-account-rounded-lg guide-account-shadow guide-account-p-4 guide-account-border-l-4 ${
                                notification.is_read ? 'guide-account-border-gray-300' : 'guide-account-border-blue-500'
                            }`}
                        >
                            <div className="guide-account-flex guide-account-items-start guide-account-justify-between">
                                <div className="guide-account-flex-1">
                                    <h4 className={`guide-account-font-medium ${
                                        notification.is_read ? 'guide-account-text-gray-700' : 'guide-account-text-gray-900'
                                    }`}>
                                        {notification.title}
                                    </h4>
                                    <p className={`guide-account-mt-1 guide-account-text-sm ${
                                        notification.is_read ? 'guide-account-text-gray-500' : 'guide-account-text-gray-700'
                                    }`}>
                                        {notification.message}
                                    </p>
                                    <p className="guide-account-mt-2 guide-account-text-xs guide-account-text-gray-500">
                                        {new Date(notification.created_at).toLocaleString()}
                                    </p>
                                </div>
                                {!notification.is_read && (
                                    <button
                                        onClick={() => onMarkAsRead(notification.id)}
                                        className="guide-account-ml-4 guide-account-text-blue-600 guide-account-hover:text-blue-800 guide-account-text-sm"
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

// Portfolio Modal Component
const PortfolioModal = ({ isOpen, onClose, onSave, editingItem, saving }) => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        image: null,
        order: 0
    });

    useEffect(() => {
        if (editingItem) {
            setFormData({
                title: editingItem.title || '',
                description: editingItem.description || '',
                image: null,
                order: editingItem.order || 0
            });
        } else {
            setFormData({
                title: '',
                description: '',
                image: null,
                order: 0
            });
        }
    }, [editingItem, isOpen]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    if (!isOpen) return null;

    return (
        <div className="guide-account-fixed guide-account-inset-0 guide-account-bg-black guide-account-bg-opacity-50 guide-account-flex guide-account-items-center guide-account-justify-center guide-account-z-50">
            <div className="guide-account-bg-white guide-account-rounded-lg guide-account-p-6 guide-account-w-full guide-account-max-w-md">
                <h3 className="guide-account-text-lg guide-account-font-medium guide-account-text-gray-900 guide-account-mb-4">
                    {editingItem ? 'Edit Portfolio Item' : 'Add Portfolio Item'}
                </h3>

                <form onSubmit={handleSubmit} className="guide-account-space-y-4">
                    <div>
                        <label className="guide-account-block guide-account-text-sm guide-account-font-medium guide-account-text-gray-700 guide-account-mb-2">
                            Title
                        </label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                            className="guide-account-w-full guide-account-border guide-account-border-gray-300 guide-account-rounded-md guide-account-px-3 guide-account-py-2 guide-account-focus:outline-none guide-account-focus:ring-2 guide-account-focus:ring-blue-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="guide-account-block guide-account-text-sm guide-account-font-medium guide-account-text-gray-700 guide-account-mb-2">
                            Description
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            rows={3}
                            className="guide-account-w-full guide-account-border guide-account-border-gray-300 guide-account-rounded-md guide-account-px-3 guide-account-py-2 guide-account-focus:outline-none guide-account-focus:ring-2 guide-account-focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="guide-account-block guide-account-text-sm guide-account-font-medium guide-account-text-gray-700 guide-account-mb-2">
                            Image
                        </label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setFormData(prev => ({ ...prev, image: e.target.files[0] }))}
                            className="guide-account-w-full guide-account-border guide-account-border-gray-300 guide-account-rounded-md guide-account-px-3 guide-account-py-2 guide-account-focus:outline-none guide-account-focus:ring-2 guide-account-focus:ring-blue-500"
                        />
                    </div>

                    <div className="guide-account-flex guide-account-justify-end guide-account-space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="guide-account-px-4 guide-account-py-2 guide-account-text-gray-700 guide-account-bg-gray-200 guide-account-rounded-md guide-account-hover:bg-gray-300"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="guide-account-px-4 guide-account-py-2 guide-account-bg-blue-600 guide-account-text-white guide-account-rounded-md guide-account-hover:bg-blue-700 guide-account-disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Availability Modal Component
const AvailabilityModal = ({ isOpen, onClose, onSave, editingItem, saving }) => {
    const [formData, setFormData] = useState({
        date: '',
        is_available: true,
        start_time: '',
        end_time: '',
        note: ''
    });

    useEffect(() => {
        if (editingItem) {
            setFormData({
                date: editingItem.date || '',
                is_available: editingItem.is_available ?? true,
                start_time: editingItem.start_time || '',
                end_time: editingItem.end_time || '',
                note: editingItem.note || ''
            });
        } else {
            setFormData({
                date: '',
                is_available: true,
                start_time: '',
                end_time: '',
                note: ''
            });
        }
    }, [editingItem, isOpen]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    if (!isOpen) return null;

    return (
        <div className="guide-account-fixed guide-account-inset-0 guide-account-bg-black guide-account-bg-opacity-50 guide-account-flex guide-account-items-center guide-account-justify-center guide-account-z-50">
            <div className="guide-account-bg-white guide-account-rounded-lg guide-account-p-6 guide-account-w-full guide-account-max-w-md">
                <h3 className="guide-account-text-lg guide-account-font-medium guide-account-text-gray-900 guide-account-mb-4">
                    {editingItem ? 'Edit Availability' : 'Add Availability'}
                </h3>

                <form onSubmit={handleSubmit} className="guide-account-space-y-4">
                    <div>
                        <label className="guide-account-block guide-account-text-sm guide-account-font-medium guide-account-text-gray-700 guide-account-mb-2">
                            Date
                        </label>
                        <input
                            type="date"
                            value={formData.date}
                            onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                            className="guide-account-w-full guide-account-border guide-account-border-gray-300 guide-account-rounded-md guide-account-px-3 guide-account-py-2 guide-account-focus:outline-none guide-account-focus:ring-2 guide-account-focus:ring-blue-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="guide-account-flex guide-account-items-center guide-account-space-x-3">
                            <input
                                type="checkbox"
                                checked={formData.is_available}
                                onChange={(e) => setFormData(prev => ({ ...prev, is_available: e.target.checked }))}
                                className="guide-account-rounded guide-account-border-gray-300 guide-account-text-blue-600 guide-account-focus:ring-blue-500"
                            />
                            <span className="guide-account-text-sm guide-account-text-gray-700">Available on this date</span>
                        </label>
                    </div>

                    <div className="guide-account-grid guide-account-grid-cols-2 guide-account-gap-4">
                        <div>
                            <label className="guide-account-block guide-account-text-sm guide-account-font-medium guide-account-text-gray-700 guide-account-mb-2">
                                Start Time
                            </label>
                            <input
                                type="time"
                                value={formData.start_time}
                                onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                                className="guide-account-w-full guide-account-border guide-account-border-gray-300 guide-account-rounded-md guide-account-px-3 guide-account-py-2 guide-account-focus:outline-none guide-account-focus:ring-2 guide-account-focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="guide-account-block guide-account-text-sm guide-account-font-medium guide-account-text-gray-700 guide-account-mb-2">
                                End Time
                            </label>
                            <input
                                type="time"
                                value={formData.end_time}
                                onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                                className="guide-account-w-full guide-account-border guide-account-border-gray-300 guide-account-rounded-md guide-account-px-3 guide-account-py-2 guide-account-focus:outline-none guide-account-focus:ring-2 guide-account-focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="guide-account-block guide-account-text-sm guide-account-font-medium guide-account-text-gray-700 guide-account-mb-2">
                            Note
                        </label>
                        <textarea
                            value={formData.note}
                            onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
                            rows={2}
                            className="guide-account-w-full guide-account-border guide-account-border-gray-300 guide-account-rounded-md guide-account-px-3 guide-account-py-2 guide-account-focus:outline-none guide-account-focus:ring-2 guide-account-focus:ring-blue-500"
                            placeholder="Optional note about availability"
                        />
                    </div>

                    <div className="guide-account-flex guide-account-justify-end guide-account-space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="guide-account-px-4 guide-account-py-2 guide-account-text-gray-700 guide-account-bg-gray-200 guide-account-rounded-md guide-account-hover:bg-gray-300"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="guide-account-px-4 guide-account-py-2 guide-account-bg-blue-600 guide-account-text-white guide-account-rounded-md guide-account-hover:bg-blue-700 guide-account-disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Document Modal Component
const DocumentModal = ({ isOpen, onClose, onSave, saving }) => {
    const [formData, setFormData] = useState({
        document_type: 'ID',
        file: null,
        description: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.file) {
            alert('Please select a file to upload');
            return;
        }
        onSave(formData);
    };

    if (!isOpen) return null;

    return (
        <div className="guide-account-fixed guide-account-inset-0 guide-account-bg-black guide-account-bg-opacity-50 guide-account-flex guide-account-items-center guide-account-justify-center guide-account-z-50">
            <div className="guide-account-bg-white guide-account-rounded-lg guide-account-p-6 guide-account-w-full guide-account-max-w-md">
                <h3 className="guide-account-text-lg guide-account-font-medium guide-account-text-gray-900 guide-account-mb-4">
                    Upload Verification Document
                </h3>

                <form onSubmit={handleSubmit} className="guide-account-space-y-4">
                    <div>
                        <label className="guide-account-block guide-account-text-sm guide-account-font-medium guide-account-text-gray-700 guide-account-mb-2">
                            Document Type
                        </label>
                        <select
                            value={formData.document_type}
                            onChange={(e) => setFormData(prev => ({ ...prev, document_type: e.target.value }))}
                            className="guide-account-w-full guide-account-border guide-account-border-gray-300 guide-account-rounded-md guide-account-px-3 guide-account-py-2 guide-account-focus:outline-none guide-account-focus:ring-2 guide-account-focus:ring-blue-500"
                        >
                            <option value="ID">ID Document</option>
                            <option value="LICENSE">License</option>
                            <option value="CERTIFICATE">Certificate</option>
                            <option value="OTHER">Other</option>
                        </select>
                    </div>

                    <div>
                        <label className="guide-account-block guide-account-text-sm guide-account-font-medium guide-account-text-gray-700 guide-account-mb-2">
                            File
                        </label>
                        <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => setFormData(prev => ({ ...prev, file: e.target.files[0] }))}
                            className="guide-account-w-full guide-account-border guide-account-border-gray-300 guide-account-rounded-md guide-account-px-3 guide-account-py-2 guide-account-focus:outline-none guide-account-focus:ring-2 guide-account-focus:ring-blue-500"
                            required
                        />
                        <p className="guide-account-text-xs guide-account-text-gray-500 guide-account-mt-1">
                            Supported formats: PDF, JPG, PNG (Max 25MB)
                        </p>
                    </div>

                    <div>
                        <label className="guide-account-block guide-account-text-sm guide-account-font-medium guide-account-text-gray-700 guide-account-mb-2">
                            Description
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            rows={3}
                            className="guide-account-w-full guide-account-border guide-account-border-gray-300 guide-account-rounded-md guide-account-px-3 guide-account-py-2 guide-account-focus:outline-none guide-account-focus:ring-2 guide-account-focus:ring-blue-500"
                            placeholder="Optional description of the document"
                        />
                    </div>

                    <div className="guide-account-flex guide-account-justify-end guide-account-space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="guide-account-px-4 guide-account-py-2 guide-account-text-gray-700 guide-account-bg-gray-200 guide-account-rounded-md guide-account-hover:bg-gray-300"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="guide-account-px-4 guide-account-py-2 guide-account-bg-blue-600 guide-account-text-white guide-account-rounded-md guide-account-hover:bg-blue-700 guide-account-disabled:opacity-50"
                        >
                            {saving ? 'Uploading...' : 'Upload'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default GuideAccount;