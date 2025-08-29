// CustomerDashboard.jsx (modified to ensure chat integration)
import React, { useState, useEffect } from 'react';
import {
    getCustomerProfile, createCustomerProfile, updateCustomerProfile,
    getMyBookings, acceptBooking, updateBookingDates, cancelBooking,
    getMyReviews, getMyPortfolio, createPortfolioItem, updatePortfolioItem, deletePortfolioItem,
    getMyAvailability, createAvailability, updateAvailability, deleteAvailability,
    getMyDocuments, uploadDocument, updateDocument, deleteDocument,
    getServiceTypes, getLanguages, getCities, getCountries,
    getMySchedule, logoutUser
} from '../api/api';
import ChatWidget from './ChatWidgets';
import './GuideAccount.css';

const CustomerDashboard = ({ user, setIsAuthenticated, setUser }) => {
    // State declarations
    const [profile, setProfile] = useState(null);
    const [bookings, setBookings] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [portfolio, setPortfolio] = useState([]);
    const [availability, setAvailability] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [schedule, setSchedule] = useState({ bookings: [], busy_dates: [], stats: {} });
    const [serviceTypes, setServiceTypes] = useState([]);
    const [languages, setLanguages] = useState([]);
    const [cities, setCities] = useState([]);
    const [countries, setCountries] = useState([]);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showProfileForm, setShowProfileForm] = useState(false);
    const [showPortfolioForm, setShowPortfolioForm] = useState(false);
    const [showAvailabilityForm, setShowAvailabilityForm] = useState(false);
    const [showDocumentForm, setShowDocumentForm] = useState(false);
    const [editingPortfolioItem, setEditingPortfolioItem] = useState(null);
    const [editingAvailability, setEditingAvailability] = useState(null);
    const [editingDocument, setEditingDocument] = useState(null);
    const [showChat, setShowChat] = useState(false);
    const [selectedUserForChat, setSelectedUserForChat] = useState(null);
    const [showBookingModal, setShowBookingModal] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState(null);

    // Form states
    const [profileForm, setProfileForm] = useState({
        professional_bio: '',
        years_of_experience: 0,
        service_types: [],
        city: '',
        country: '',
        service_areas: '',
        hourly_rate: '',
        daily_rate: '',
        currency: 'USD',
        languages: [],
        is_available: true
    });

    const [portfolioForm, setPortfolioForm] = useState({
        title: '',
        description: '',
        image: null,
        order: 0
    });

    const [availabilityForm, setAvailabilityForm] = useState({
        date: '',
        is_available: true,
        start_time: '',
        end_time: '',
        note: ''
    });

    const [documentForm, setDocumentForm] = useState({
        document_type: 'license',
        file: null,
        description: ''
    });

    const [bookingDatesForm, setBookingDatesForm] = useState({
        start_date: '',
        end_date: ''
    });

    // Initialize data on component mount
    useEffect(() => {
        initializeData();
    }, []);

    const initializeData = async () => {
        try {
            setLoading(true);
            const [serviceTypesData, languagesData, citiesData, countriesData] = await Promise.all([
                getServiceTypes().catch(() => ({ results: [] })),
                getLanguages().catch(() => ({ results: [] })),
                getCities().catch(() => ({ results: [] })),
                getCountries().catch(() => ({ results: [] }))
            ]);

            setServiceTypes(serviceTypesData.results || serviceTypesData || []);
            setLanguages(languagesData.results || languagesData || []);
            setCities(citiesData.results || citiesData || []);
            setCountries(countriesData.results || countriesData || []);

            try {
                const profileData = await getCustomerProfile();
                setProfile(profileData);
                setProfileForm({
                    professional_bio: profileData.professional_bio || '',
                    years_of_experience: profileData.years_of_experience || 0,
                    service_types: profileData.service_types || [],
                    city: profileData.city || '',
                    country: profileData.country || '',
                    service_areas: profileData.service_areas || '',
                    hourly_rate: profileData.hourly_rate || '',
                    daily_rate: profileData.daily_rate || '',
                    currency: profileData.currency || 'USD',
                    languages: profileData.languages || [],
                    is_available: profileData.is_available !== undefined ? profileData.is_available : true
                });

                await Promise.all([
                    loadBookings(),
                    loadReviews(),
                    loadPortfolio(),
                    loadAvailability(),
                    loadDocuments(),
                    loadSchedule()
                ]);
            } catch (profileError) {
                console.log('No profile found, user needs to create one');
                setShowProfileForm(true);
            }
        } catch (err) {
            console.error('Error initializing data:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Data loading functions
    const loadBookings = async () => {
        try {
            const data = await getMyBookings();
            setBookings(data.results || data || []);
        } catch (err) {
            console.error('Error loading bookings:', err);
        }
    };

    const loadReviews = async () => {
        try {
            const data = await getMyReviews();
            setReviews(data.results || data || []);
        } catch (err) {
            console.error('Error loading reviews:', err);
        }
    };

    const loadPortfolio = async () => {
        try {
            const data = await getMyPortfolio();
            setPortfolio(data.results || data || []);
        } catch (err) {
            console.error('Error loading portfolio:', err);
        }
    };

    const loadAvailability = async () => {
        try {
            const data = await getMyAvailability();
            setAvailability(data.results || data || []);
        } catch (err) {
            console.error('Error loading availability:', err);
        }
    };

    const loadDocuments = async () => {
        try {
            const data = await getMyDocuments();
            setDocuments(data.results || data || []);
        } catch (err) {
            console.error('Error loading documents:', err);
        }
    };

    const loadSchedule = async () => {
        try {
            const data = await getMySchedule();
            setSchedule(data);
        } catch (err) {
            console.error('Error loading schedule:', err);
        }
    };

    // Handler functions
    const handleLogout = async () => {
        try {
            await logoutUser();
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            setIsAuthenticated(false);
            setUser(null);
        } catch (err) {
            console.error('Logout error:', err);
            setError(err.message);
        }
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();

        if (!profileForm.professional_bio?.trim()) {
            setError('Professional bio is required');
            return;
        }

        if (!profileForm.years_of_experience || profileForm.years_of_experience < 0) {
            setError('Years of experience must be a positive number');
            return;
        }

        try {
            const formData = {
                professional_bio: profileForm.professional_bio.trim(),
                years_of_experience: parseInt(profileForm.years_of_experience) || 0,
                service_types: profileForm.service_types || [],
                city: profileForm.city || null,
                country: profileForm.country || '',
                service_areas: profileForm.service_areas?.trim() || '',
                hourly_rate: profileForm.hourly_rate ? parseFloat(profileForm.hourly_rate) : null,
                daily_rate: profileForm.daily_rate ? parseFloat(profileForm.daily_rate) : null,
                currency: profileForm.currency || 'USD',
                languages: profileForm.languages || [],
                is_available: profileForm.is_available
            };

            let result;
            if (profile) {
                result = await updateCustomerProfile(formData);
            } else {
                result = await createCustomerProfile(formData);
            }
            setProfile(result);
            setShowProfileForm(false);
            setError(null);
        } catch (err) {
            console.error('Profile submit error:', err);
            setError(err.message || 'Failed to save profile');
        }
    };

    const handlePortfolioSubmit = async (e) => {
        e.preventDefault();

        if (!portfolioForm.title?.trim()) {
            setError('Portfolio title is required');
            return;
        }

        try {
            const formData = {
                title: portfolioForm.title.trim(),
                description: portfolioForm.description?.trim() || '',
                image: portfolioForm.image,
                order: parseInt(portfolioForm.order) || 0
            };

            if (editingPortfolioItem) {
                await updatePortfolioItem(editingPortfolioItem.id, formData);
            } else {
                await createPortfolioItem(formData);
            }
            loadPortfolio();
            setShowPortfolioForm(false);
            setEditingPortfolioItem(null);
            setPortfolioForm({ title: '', description: '', image: null, order: 0 });
            setError(null);
        } catch (err) {
            console.error('Portfolio submit error:', err);
            setError(err.message || 'Failed to save portfolio item');
        }
    };

    const handleAvailabilitySubmit = async (e) => {
        e.preventDefault();

        if (!availabilityForm.date) {
            setError('Date is required');
            return;
        }

        try {
            const formData = {
                date: availabilityForm.date,
                is_available: availabilityForm.is_available,
                start_time: availabilityForm.start_time || null,
                end_time: availabilityForm.end_time || null,
                note: availabilityForm.note?.trim() || ''
            };

            if (editingAvailability) {
                await updateAvailability(editingAvailability.id, formData);
            } else {
                await createAvailability(formData);
            }
            loadAvailability();
            loadSchedule();
            setShowAvailabilityForm(false);
            setEditingAvailability(null);
            setAvailabilityForm({ date: '', is_available: true, start_time: '', end_time: '', note: '' });
            setError(null);
        } catch (err) {
            console.error('Availability submit error:', err);
            setError(err.message || 'Failed to save availability');
        }
    };

    const handleDocumentSubmit = async (e) => {
        e.preventDefault();

        if (!documentForm.file && !editingDocument) {
            setError('File is required');
            return;
        }

        try {
            const formData = {
                document_type: documentForm.document_type,
                file: documentForm.file,
                description: documentForm.description?.trim() || ''
            };

            if (editingDocument) {
                await updateDocument(editingDocument.id, formData);
            } else {
                await uploadDocument(formData);
            }
            loadDocuments();
            setShowDocumentForm(false);
            setEditingDocument(null);
            setDocumentForm({ document_type: 'license', file: null, description: '' });
            setError(null);
        } catch (err) {
            console.error('Document submit error:', err);
            setError(err.message || 'Failed to save document');
        }
    };

    const handleBookingAction = async (bookingId, action, data = {}) => {
        try {
            if (action === 'accept') {
                if (!data.start_date || !data.end_date) {
                    setError('Start date and end date are required');
                    return;
                }
                await acceptBooking(bookingId, data);
            } else if (action === 'update_dates') {
                if (!data.start_date || !data.end_date) {
                    setError('Start date and end date are required');
                    return;
                }
                await updateBookingDates(bookingId, data);
            } else if (action === 'cancel') {
                await cancelBooking(bookingId, { confirm: true, reason: 'Guide cancelled the booking' });
            }
            loadBookings();
            loadSchedule();
            setShowBookingModal(false);
            setSelectedBooking(null);
            setError(null);
        } catch (err) {
            console.error('Booking action error:', err);
            setError(err.message || 'Failed to process booking action');
        }
    };

    const handleDeletePortfolio = async (id) => {
        if (!window.confirm('Are you sure you want to delete this portfolio item?')) return;
        try {
            await deletePortfolioItem(id);
            loadPortfolio();
            setError(null);
        } catch (err) {
            console.error('Delete portfolio error:', err);
            setError(err.message || 'Failed to delete portfolio item');
        }
    };

    const handleDeleteAvailability = async (id) => {
        if (!window.confirm('Are you sure you want to delete this availability?')) return;
        try {
            await deleteAvailability(id);
            loadAvailability();
            loadSchedule();
            setError(null);
        } catch (err) {
            console.error('Delete availability error:', err);
            setError(err.message || 'Failed to delete availability');
        }
    };

    const handleDeleteDocument = async (id) => {
        if (!window.confirm('Are you sure you want to delete this document?')) return;
        try {
            await deleteDocument(id);
            loadDocuments();
            setError(null);
        } catch (err) {
            console.error('Delete document error:', err);
            setError(err.message || 'Failed to delete document');
        }
    };

    const handleChatWithClient = (booking) => {
        if (booking.client_details?.email) {
            setSelectedUserForChat(booking.client_details.email);
            setShowChat(true);
        }
    };

    const handleCloseChat = () => {
        setShowChat(false);
        setSelectedUserForChat(null);
    };

    const openBookingModal = (booking, action) => {
        setSelectedBooking({ ...booking, action });
        if (action === 'accept' || action === 'update_dates') {
            setBookingDatesForm({
                start_date: booking.start_date || '',
                end_date: booking.end_date || ''
            });
        }
        setShowBookingModal(true);
    };

    // Modal for booking actions
    const renderBookingModal = () => {
        if (!showBookingModal || !selectedBooking) return null;
        return (
            <div className="customer-dashboard-modal">
                <div className="customer-dashboard-modal-content">
                    <div className="customer-dashboard-modal-header">
                        <h3>{selectedBooking.action === 'accept' ? 'Accept Booking' : 'Update Booking Dates'}</h3>
                        <button
                            className="customer-dashboard-modal-close"
                            onClick={() => {
                                setShowBookingModal(false);
                                setSelectedBooking(null);
                                setError(null);
                            }}
                        >
                            ×
                        </button>
                    </div>
                    <form onSubmit={(e) => {
                        e.preventDefault();
                        handleBookingAction(selectedBooking.id, selectedBooking.action, bookingDatesForm);
                    }}>
                        <div className="customer-dashboard-form-group">
                            <label>Start Date *</label>
                            <input
                                type="date"
                                className="customer-dashboard-input"
                                value={bookingDatesForm.start_date}
                                onChange={(e) => setBookingDatesForm({ ...bookingDatesForm, start_date: e.target.value })}
                                required
                                min={new Date().toISOString().split('T')[0]}
                            />
                        </div>
                        <div className="customer-dashboard-form-group">
                            <label>End Date *</label>
                            <input
                                type="date"
                                className="customer-dashboard-input"
                                value={bookingDatesForm.end_date}
                                onChange={(e) => setBookingDatesForm({ ...bookingDatesForm, end_date: e.target.value })}
                                required
                                min={bookingDatesForm.start_date || new Date().toISOString().split('T')[0]}
                            />
                        </div>
                        <div className="customer-dashboard-modal-actions">
                            <button type="submit" className="customer-dashboard-btn customer-dashboard-btn-primary">
                                {selectedBooking.action === 'accept' ? 'Accept' : 'Update'}
                            </button>
                            <button
                                type="button"
                                className="customer-dashboard-btn customer-dashboard-btn-secondary"
                                onClick={() => {
                                    setShowBookingModal(false);
                                    setSelectedBooking(null);
                                    setError(null);
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    };

    // Portfolio form modal
    const renderPortfolioForm = () => {
        if (!showPortfolioForm) return null;
        return (
            <div className="customer-dashboard-modal">
                <div className="customer-dashboard-modal-content">
                    <div className="customer-dashboard-modal-header">
                        <h3>{editingPortfolioItem ? 'Edit Portfolio Item' : 'Add Portfolio Item'}</h3>
                        <button
                            className="customer-dashboard-modal-close"
                            onClick={() => {
                                setShowPortfolioForm(false);
                                setEditingPortfolioItem(null);
                                setPortfolioForm({ title: '', description: '', image: null, order: 0 });
                                setError(null);
                            }}
                        >
                            ×
                        </button>
                    </div>
                    <form onSubmit={handlePortfolioSubmit}>
                        <div className="customer-dashboard-form-group">
                            <label>Title *</label>
                            <input
                                type="text"
                                className="customer-dashboard-input"
                                value={portfolioForm.title}
                                onChange={(e) => setPortfolioForm({ ...portfolioForm, title: e.target.value })}
                                required
                                placeholder="Enter portfolio title"
                            />
                        </div>
                        <div className="customer-dashboard-form-group">
                            <label>Description</label>
                            <textarea
                                className="customer-dashboard-textarea"
                                value={portfolioForm.description}
                                onChange={(e) => setPortfolioForm({ ...portfolioForm, description: e.target.value })}
                                rows="3"
                                placeholder="Describe your work"
                            />
                        </div>
                        <div className="customer-dashboard-form-group">
                            <label>Image</label>
                            <input
                                type="file"
                                className="customer-dashboard-input"
                                accept="image/*"
                                onChange={(e) => setPortfolioForm({ ...portfolioForm, image: e.target.files[0] })}
                            />
                        </div>
                        <div className="customer-dashboard-form-group">
                            <label>Order</label>
                            <input
                                type="number"
                                className="customer-dashboard-input"
                                value={portfolioForm.order || 0}
                                onChange={(e) => setPortfolioForm({ ...portfolioForm, order: parseInt(e.target.value) || 0 })}
                                min="0"
                                placeholder="Display order (0 for first)"
                            />
                        </div>
                        <div className="customer-dashboard-modal-actions">
                            <button type="submit" className="customer-dashboard-btn customer-dashboard-btn-primary">
                                {editingPortfolioItem ? 'Update' : 'Add'}
                            </button>
                            <button
                                type="button"
                                className="customer-dashboard-btn customer-dashboard-btn-secondary"
                                onClick={() => {
                                    setShowPortfolioForm(false);
                                    setEditingPortfolioItem(null);
                                    setPortfolioForm({ title: '', description: '', image: null, order: 0 });
                                    setError(null);
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    };

    // Availability form modal
    const renderAvailabilityForm = () => {
        if (!showAvailabilityForm) return null;
        return (
            <div className="customer-dashboard-modal">
                <div className="customer-dashboard-modal-content">
                    <div className="customer-dashboard-modal-header">
                        <h3>{editingAvailability ? 'Edit Availability' : 'Add Availability'}</h3>
                        <button
                            className="customer-dashboard-modal-close"
                            onClick={() => {
                                setShowAvailabilityForm(false);
                                setEditingAvailability(null);
                                setAvailabilityForm({ date: '', is_available: true, start_time: '', end_time: '', note: '' });
                                setError(null);
                            }}
                        >
                            ×
                        </button>
                    </div>
                    <form onSubmit={handleAvailabilitySubmit}>
                        <div className="customer-dashboard-form-group">
                            <label>Date *</label>
                            <input
                                type="date"
                                className="customer-dashboard-input"
                                value={availabilityForm.date}
                                onChange={(e) => setAvailabilityForm({ ...availabilityForm, date: e.target.value })}
                                required
                                min={new Date().toISOString().split('T')[0]}
                            />
                        </div>
                        <div className="customer-dashboard-form-group">
                            <label className="customer-dashboard-checkbox-label">
                                <input
                                    type="checkbox"
                                    className="customer-dashboard-checkbox"
                                    checked={availabilityForm.is_available}
                                    onChange={(e) => setAvailabilityForm({ ...availabilityForm, is_available: e.target.checked })}
                                />
                                Available
                            </label>
                        </div>
                        <div className="customer-dashboard-form-row">
                            <div className="customer-dashboard-form-group">
                                <label>Start Time</label>
                                <input
                                    type="time"
                                    className="customer-dashboard-input"
                                    value={availabilityForm.start_time}
                                    onChange={(e) => setAvailabilityForm({ ...availabilityForm, start_time: e.target.value })}
                                />
                            </div>
                            <div className="customer-dashboard-form-group">
                                <label>End Time</label>
                                <input
                                    type="time"
                                    className="customer-dashboard-input"
                                    value={availabilityForm.end_time}
                                    onChange={(e) => setAvailabilityForm({ ...availabilityForm, end_time: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="customer-dashboard-form-group">
                            <label>Note</label>
                            <textarea
                                className="customer-dashboard-textarea"
                                value={availabilityForm.note}
                                onChange={(e) => setAvailabilityForm({ ...availabilityForm, note: e.target.value })}
                                rows="2"
                                placeholder="Optional note about availability"
                            />
                        </div>
                        <div className="customer-dashboard-modal-actions">
                            <button type="submit" className="customer-dashboard-btn customer-dashboard-btn-primary">
                                {editingAvailability ? 'Update' : 'Add'}
                            </button>
                            <button
                                type="button"
                                className="customer-dashboard-btn customer-dashboard-btn-secondary"
                                onClick={() => {
                                    setShowAvailabilityForm(false);
                                    setEditingAvailability(null);
                                    setAvailabilityForm({ date: '', is_available: true, start_time: '', end_time: '', note: '' });
                                    setError(null);
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    };

    // Document form modal
    const renderDocumentForm = () => {
        if (!showDocumentForm) return null;
        return (
            <div className="customer-dashboard-modal">
                <div className="customer-dashboard-modal-content">
                    <div className="customer-dashboard-modal-header">
                        <h3>{editingDocument ? 'Edit Document' : 'Upload Document'}</h3>
                        <button
                            className="customer-dashboard-modal-close"
                            onClick={() => {
                                setShowDocumentForm(false);
                                setEditingDocument(null);
                                setDocumentForm({ document_type: 'license', file: null, description: '' });
                                setError(null);
                            }}
                        >
                            ×
                        </button>
                    </div>
                    <form onSubmit={handleDocumentSubmit}>
                        <div className="customer-dashboard-form-group">
                            <label>Document Type *</label>
                            <select
                                className="customer-dashboard-select"
                                value={documentForm.document_type}
                                onChange={(e) => setDocumentForm({ ...documentForm, document_type: e.target.value })}
                                required
                            >
                                <option value="license">License</option>
                                <option value="certificate">Certificate</option>
                                <option value="id">ID Document</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div className="customer-dashboard-form-group">
                            <label>File {!editingDocument && '*'}</label>
                            <input
                                type="file"
                                className="customer-dashboard-input"
                                onChange={(e) => setDocumentForm({ ...documentForm, file: e.target.files[0] })}
                                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                required={!editingDocument}
                            />
                        </div>
                        <div className="customer-dashboard-form-group">
                            <label>Description</label>
                            <textarea
                                className="customer-dashboard-textarea"
                                value={documentForm.description}
                                onChange={(e) => setDocumentForm({ ...documentForm, description: e.target.value })}
                                rows="2"
                                placeholder="Brief description of the document"
                            />
                        </div>
                        <div className="customer-dashboard-modal-actions">
                            <button type="submit" className="customer-dashboard-btn customer-dashboard-btn-primary">
                                {editingDocument ? 'Update' : 'Upload'}
                            </button>
                            <button
                                type="button"
                                className="customer-dashboard-btn customer-dashboard-btn-secondary"
                                onClick={() => {
                                    setShowDocumentForm(false);
                                    setEditingDocument(null);
                                    setDocumentForm({ document_type: 'license', file: null, description: '' });
                                    setError(null);
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    };

    // Render loading state
    if (loading) {
        return (
            <div className="customer-dashboard-loading">
                <div className="customer-dashboard-spinner"></div>
                <p>Loading dashboard...</p>
            </div>
        );
    }

    // Main render
    return (
        <div className="customer-dashboard-container">
            {/* Header */}
            <div className="customer-dashboard-header">
                <div className="customer-dashboard-header-content">
                    <h1 className="customer-dashboard-title">Guide Dashboard</h1>
                    {user && (
                        <div className="customer-dashboard-user-info">
                            <span className="customer-dashboard-welcome">Welcome, {user.full_name}</span>
                            <button
                                className="customer-dashboard-chat-btn"
                                onClick={() => setShowChat(true)}
                            >
                                Messages
                            </button>
                            <button
                                className="customer-dashboard-logout-btn"
                                onClick={handleLogout}
                            >
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Error message */}
            {error && (
                <div className="customer-dashboard-error">
                    <p>{error}</p>
                    <button
                        onClick={() => setError(null)}
                        className="customer-dashboard-error-close"
                    >
                        ×
                    </button>
                </div>
            )}

            {/* Navigation */}
            <div className="customer-dashboard-navigation">
                {['dashboard', 'profile', 'bookings', 'portfolio', 'availability', 'schedule', 'documents', 'reviews'].map(tab => (
                    <button
                        key={tab}
                        className={`customer-dashboard-nav-btn ${activeTab === tab ? 'customer-dashboard-nav-active' : ''}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>

            {/* Main content */}
            <div className="customer-dashboard-content">
                {activeTab === 'dashboard' && (
                    <div className="customer-dashboard-overview">
                        <div className="customer-dashboard-stats">
                            <div className="customer-dashboard-stat-card">
                                <h3 className="customer-dashboard-stat-title">Total Bookings</h3>
                                <p className="customer-dashboard-stat-value">{bookings.length}</p>
                            </div>
                            <div className="customer-dashboard-stat-card">
                                <h3 className="customer-dashboard-stat-title">Pending Requests</h3>
                                <p className="customer-dashboard-stat-value">
                                    {bookings.filter(b => b.status === 'pending').length}
                                </p>
                            </div>
                            <div className="customer-dashboard-stat-card">
                                <h3 className="customer-dashboard-stat-title">Total Reviews</h3>
                                <p className="customer-dashboard-stat-value">{profile?.total_reviews || 0}</p>
                            </div>
                            <div className="customer-dashboard-stat-card">
                                <h3 className="customer-dashboard-stat-title">Average Rating</h3>
                                <p className="customer-dashboard-stat-value">{profile?.average_rating || 0}/5</p>
                            </div>
                        </div>
                        <div className="customer-dashboard-recent">
                            <h3 className="customer-dashboard-section-title">Recent Booking Requests</h3>
                            <div className="customer-dashboard-recent-bookings">
                                {bookings.slice(0, 5).map(booking => (
                                    <div key={booking.id} className="customer-dashboard-booking-card">
                                        <div className="customer-dashboard-booking-info">
                                            <h4 className="customer-dashboard-booking-title">{booking.title}</h4>
                                            <p className="customer-dashboard-booking-date">
                                                {new Date(booking.start_date).toLocaleDateString()} -
                                                {new Date(booking.end_date).toLocaleDateString()}
                                            </p>
                                            <span className={`customer-dashboard-booking-status customer-dashboard-status-${booking.status}`}>
                                                {booking.status}
                                            </span>
                                        </div>
                                        <div className="customer-dashboard-booking-actions">
                                            {booking.status === 'pending' && (
                                                <>
                                                    <button
                                                        className="customer-dashboard-btn customer-dashboard-btn-accept"
                                                        onClick={() => openBookingModal(booking, 'accept')}
                                                    >
                                                        Accept
                                                    </button>
                                                    <button
                                                        className="customer-dashboard-btn customer-dashboard-btn-cancel"
                                                        onClick={() => handleBookingAction(booking.id, 'cancel')}
                                                    >
                                                        Decline
                                                    </button>
                                                </>
                                            )}
                                            {booking.client_details && (
                                                <button
                                                    className="customer-dashboard-btn customer-dashboard-btn-secondary"
                                                    onClick={() => handleChatWithClient(booking)}
                                                >
                                                    Chat
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {profile && !profile.is_available && (
                            <div className="customer-dashboard-availability-warning">
                                <p>Your profile is currently set to unavailable. Clients cannot book your services.</p>
                                <button
                                    className="customer-dashboard-btn customer-dashboard-btn-primary"
                                    onClick={() => setActiveTab('profile')}
                                >
                                    Update Availability
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'profile' && (
                    <div className="customer-dashboard-profile">
                        {!profile || showProfileForm ? (
                            <div className="customer-dashboard-profile-form">
                                <h3 className="customer-dashboard-section-title">
                                    {profile ? 'Edit Profile' : 'Create Your Guide Profile'}
                                </h3>
                                <form onSubmit={handleProfileSubmit} className="customer-dashboard-form">
                                    <div className="customer-dashboard-form-group">
                                        <label className="customer-dashboard-label">Professional Bio *</label>
                                        <textarea
                                            className="customer-dashboard-textarea"
                                            value={profileForm.professional_bio}
                                            onChange={(e) => setProfileForm({ ...profileForm, professional_bio: e.target.value })}
                                            placeholder="Tell clients about your experience and expertise..."
                                            rows="4"
                                            required
                                        />
                                    </div>
                                    <div className="customer-dashboard-form-row">
                                        <div className="customer-dashboard-form-group">
                                            <label className="customer-dashboard-label">Years of Experience *</label>
                                            <input
                                                type="number"
                                                className="customer-dashboard-input"
                                                value={profileForm.years_of_experience || 0}
                                                onChange={(e) => setProfileForm({ ...profileForm, years_of_experience: parseInt(e.target.value) || 0 })}
                                                min="0"
                                                max="50"
                                                required
                                            />
                                        </div>
                                        <div className="customer-dashboard-form-group">
                                            <label className="customer-dashboard-label">City</label>
                                            <select
                                                className="customer-dashboard-select"
                                                value={profileForm.city}
                                                onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                                            >
                                                <option value="">Select City</option>
                                                {cities.map(city => (
                                                    <option key={city.id} value={city.id}>{city.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="customer-dashboard-form-group">
                                        <label className="customer-dashboard-label">Country</label>
                                        <select
                                            className="customer-dashboard-select"
                                            value={profileForm.country}
                                            onChange={(e) => setProfileForm({ ...profileForm, country: e.target.value })}
                                        >
                                            <option value="">Select Country</option>
                                            {countries.map(country => (
                                                <option key={country.id} value={country.code}>{country.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="customer-dashboard-form-group">
                                        <label className="customer-dashboard-label">Service Areas</label>
                                        <input
                                            type="text"
                                            className="customer-dashboard-input"
                                            value={profileForm.service_areas}
                                            onChange={(e) => setProfileForm({ ...profileForm, service_areas: e.target.value })}
                                            placeholder="Areas where you provide services (e.g., Downtown, Historical District)"
                                        />
                                    </div>
                                    <div className="customer-dashboard-form-group">
                                        <label className="customer-dashboard-label">Service Types</label>
                                        <div className="customer-dashboard-checkbox-group">
                                            {serviceTypes.map(service => (
                                                <label key={service.id} className="customer-dashboard-checkbox-label">
                                                    <input
                                                        type="checkbox"
                                                        className="customer-dashboard-checkbox"
                                                        checked={profileForm.service_types.includes(service.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setProfileForm({
                                                                    ...profileForm,
                                                                    service_types: [...profileForm.service_types, service.id]
                                                                });
                                                            } else {
                                                                setProfileForm({
                                                                    ...profileForm,
                                                                    service_types: profileForm.service_types.filter(id => id !== service.id)
                                                                });
                                                            }
                                                        }}
                                                    />
                                                    {service.name}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="customer-dashboard-form-row">
                                        <div className="customer-dashboard-form-group">
                                            <label className="customer-dashboard-label">Hourly Rate</label>
                                            <input
                                                type="number"
                                                className="customer-dashboard-input"
                                                value={profileForm.hourly_rate || ''}
                                                onChange={(e) => setProfileForm({ ...profileForm, hourly_rate: e.target.value })}
                                                placeholder="0"
                                                step="0.01"
                                                min="0"
                                            />
                                        </div>
                                        <div className="customer-dashboard-form-group">
                                            <label className="customer-dashboard-label">Daily Rate</label>
                                            <input
                                                type="number"
                                                className="customer-dashboard-input"
                                                value={profileForm.daily_rate || ''}
                                                onChange={(e) => setProfileForm({ ...profileForm, daily_rate: e.target.value })}
                                                placeholder="0"
                                                step="0.01"
                                                min="0"
                                            />
                                        </div>
                                        <div className="customer-dashboard-form-group">
                                            <label className="customer-dashboard-label">Currency</label>
                                            <select
                                                className="customer-dashboard-select"
                                                value={profileForm.currency}
                                                onChange={(e) => setProfileForm({ ...profileForm, currency: e.target.value })}
                                            >
                                                <option value="USD">USD</option>
                                                <option value="EUR">EUR</option>
                                                <option value="GBP">GBP</option>
                                                <option value="UZS">UZS</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="customer-dashboard-form-group">
                                        <label className="customer-dashboard-label">Languages</label>
                                        <div className="customer-dashboard-checkbox-group">
                                            {languages.map(language => (
                                                <label key={language.id} className="customer-dashboard-checkbox-label">
                                                    <input
                                                        type="checkbox"
                                                        className="customer-dashboard-checkbox"
                                                        checked={profileForm.languages.includes(language.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setProfileForm({
                                                                    ...profileForm,
                                                                    languages: [...profileForm.languages, language.id]
                                                                });
                                                            } else {
                                                                setProfileForm({
                                                                    ...profileForm,
                                                                    languages: profileForm.languages.filter(id => id !== language.id)
                                                                });
                                                            }
                                                        }}
                                                    />
                                                    {language.name}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="customer-dashboard-form-group">
                                        <label className="customer-dashboard-checkbox-label">
                                            <input
                                                type="checkbox"
                                                className="customer-dashboard-checkbox"
                                                checked={profileForm.is_available}
                                                onChange={(e) => setProfileForm({ ...profileForm, is_available: e.target.checked })}
                                            />
                                            Available for bookings
                                        </label>
                                    </div>
                                    <div className="customer-dashboard-form-actions">
                                        <button type="submit" className="customer-dashboard-btn customer-dashboard-btn-primary">
                                            {profile ? 'Update Profile' : 'Create Profile'}
                                        </button>
                                        {profile && (
                                            <button
                                                type="button"
                                                className="customer-dashboard-btn customer-dashboard-btn-secondary"
                                                onClick={() => setShowProfileForm(false)}
                                            >
                                                Cancel
                                            </button>
                                        )}
                                    </div>
                                </form>
                            </div>
                        ) : (
                            <div className="customer-dashboard-profile-view">
                                <div className="customer-dashboard-profile-header">
                                    <h3 className="customer-dashboard-section-title">Profile Information</h3>
                                    <button
                                        className="customer-dashboard-btn customer-dashboard-btn-primary"
                                        onClick={() => setShowProfileForm(true)}
                                    >
                                        Edit Profile
                                    </button>
                                </div>
                                <div className="customer-dashboard-profile-info">
                                    <div className="customer-dashboard-profile-field">
                                        <label className="customer-dashboard-profile-label">Bio:</label>
                                        <p className="customer-dashboard-profile-value">{profile.professional_bio}</p>
                                    </div>
                                    <div className="customer-dashboard-profile-field">
                                        <label className="customer-dashboard-profile-label">Experience:</label>
                                        <p className="customer-dashboard-profile-value">{profile.years_of_experience} years</p>
                                    </div>
                                    <div className="customer-dashboard-profile-field">
                                        <label className="customer-dashboard-profile-label">Rating:</label>
                                        <p className="customer-dashboard-profile-value">
                                            {profile.average_rating || 0}/5 ({profile.total_reviews || 0} reviews)
                                        </p>
                                    </div>
                                    <div className="customer-dashboard-profile-field">
                                        <label className="customer-dashboard-profile-label">Availability:</label>
                                        <p className="customer-dashboard-profile-value">
                                            {profile.is_available ? 'Available' : 'Not Available'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'bookings' && (
                    <div className="customer-dashboard-bookings">
                        <h3 className="customer-dashboard-section-title">My Bookings</h3>
                        <div className="customer-dashboard-bookings-list">
                            {bookings.map(booking => (
                                <div key={booking.id} className="customer-dashboard-booking-item">
                                    <div className="customer-dashboard-booking-details">
                                        <h4 className="customer-dashboard-booking-title">{booking.title}</h4>
                                        <p className="customer-dashboard-booking-dates">
                                            {new Date(booking.start_date).toLocaleDateString()} - {new Date(booking.end_date).toLocaleDateString()}
                                        </p>
                                        <p className="customer-dashboard-booking-description">{booking.description}</p>
                                        {booking.client_details && (
                                            <p className="customer-dashboard-booking-client">
                                                Client: {booking.client_details.full_name}
                                            </p>
                                        )}
                                        <span className={`customer-dashboard-booking-status customer-dashboard-status-${booking.status}`}>
                                            {booking.status}
                                        </span>
                                    </div>
                                    <div className="customer-dashboard-booking-actions">
                                        {booking.status === 'pending' && (
                                            <>
                                                <button
                                                    className="customer-dashboard-btn customer-dashboard-btn-accept"
                                                    onClick={() => openBookingModal(booking, 'accept')}
                                                >
                                                    Accept
                                                </button>
                                                <button
                                                    className="customer-dashboard-btn customer-dashboard-btn-cancel"
                                                    onClick={() => handleBookingAction(booking.id, 'cancel')}
                                                >
                                                    Decline
                                                </button>
                                            </>
                                        )}
                                        {booking.status === 'accepted' && (
                                            <button
                                                className="customer-dashboard-btn customer-dashboard-btn-secondary"
                                                onClick={() => openBookingModal(booking, 'update_dates')}
                                            >
                                                Update Dates
                                            </button>
                                        )}
                                        {booking.client_details && (
                                            <button
                                                className="customer-dashboard-btn customer-dashboard-btn-secondary"
                                                onClick={() => handleChatWithClient(booking)}
                                            >
                                                Chat with Client
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        {bookings.length === 0 && (
                            <div className="customer-dashboard-empty-state">
                                <p>No bookings yet. Make sure your profile is complete and available!</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'portfolio' && (
                    <div className="customer-dashboard-portfolio">
                        <div className="customer-dashboard-portfolio-header">
                            <h3 className="customer-dashboard-section-title">Portfolio</h3>
                            <button
                                className="customer-dashboard-btn customer-dashboard-btn-primary"
                                onClick={() => setShowPortfolioForm(true)}
                            >
                                Add Portfolio Item
                            </button>
                        </div>
                        <div className="customer-dashboard-portfolio-grid">
                            {portfolio.map(item => (
                                <div key={item.id} className="customer-dashboard-portfolio-item">
                                    {item.image_url && (
                                        <img
                                            src={item.image_url}
                                            alt={item.title}
                                            className="customer-dashboard-portfolio-image"
                                        />
                                    )}
                                    <div className="customer-dashboard-portfolio-content">
                                        <h4 className="customer-dashboard-portfolio-title">{item.title}</h4>
                                        <p className="customer-dashboard-portfolio-description">{item.description}</p>
                                        <div className="customer-dashboard-portfolio-actions">
                                            <button
                                                className="customer-dashboard-btn customer-dashboard-btn-small"
                                                onClick={() => {
                                                    setEditingPortfolioItem(item);
                                                    setPortfolioForm({
                                                        title: item.title,
                                                        description: item.description,
                                                        image: null,
                                                        order: item.order
                                                    });
                                                    setShowPortfolioForm(true);
                                                }}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                className="customer-dashboard-btn customer-dashboard-btn-small customer-dashboard-btn-danger"
                                                onClick={() => handleDeletePortfolio(item.id)}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {portfolio.length === 0 && (
                            <div className="customer-dashboard-empty-state">
                                <p>No portfolio items yet. Add some to showcase your work!</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'availability' && (
                    <div className="customer-dashboard-availability">
                        <div className="customer-dashboard-availability-header">
                            <h3 className="customer-dashboard-section-title">Availability</h3>
                            <button
                                className="customer-dashboard-btn customer-dashboard-btn-primary"
                                onClick={() => setShowAvailabilityForm(true)}
                            >
                                Add Availability
                            </button>
                        </div>
                        <div className="customer-dashboard-availability-list">
                            {availability.map(item => (
                                <div key={item.id} className="customer-dashboard-availability-item">
                                    <div className="customer-dashboard-availability-info">
                                        <h4 className="customer-dashboard-availability-date">
                                            {new Date(item.date).toLocaleDateString()}
                                        </h4>
                                        <p className="customer-dashboard-availability-time">
                                            {item.start_time && item.end_time ? `${item.start_time} - ${item.end_time}` : 'All day'}
                                        </p>
                                        {item.note && <p className="customer-dashboard-availability-note">{item.note}</p>}
                                        <span className={`customer-dashboard-availability-status ${item.is_available ? 'customer-dashboard-available' : 'customer-dashboard-unavailable'}`}>
                                            {item.is_available ? 'Available' : 'Unavailable'}
                                        </span>
                                    </div>
                                    <div className="customer-dashboard-availability-actions">
                                        <button
                                            className="customer-dashboard-btn customer-dashboard-btn-small"
                                            onClick={() => {
                                                setEditingAvailability(item);
                                                setAvailabilityForm({
                                                    date: item.date,
                                                    is_available: item.is_available,
                                                    start_time: item.start_time || '',
                                                    end_time: item.end_time || '',
                                                    note: item.note || ''
                                                });
                                                setShowAvailabilityForm(true);
                                            }}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            className="customer-dashboard-btn customer-dashboard-btn-small customer-dashboard-btn-danger"
                                            onClick={() => handleDeleteAvailability(item.id)}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {availability.length === 0 && (
                            <div className="customer-dashboard-empty-state">
                                <p>No availability set. Add your available dates!</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'schedule' && (
                    <div className="customer-dashboard-schedule">
                        <h3 className="customer-dashboard-section-title">My Schedule</h3>
                        <div className="customer-dashboard-schedule-stats">
                            <div className="customer-dashboard-stat-card">
                                <h4>Pending</h4>
                                <p>{schedule.stats?.pending || 0}</p>
                            </div>
                            <div className="customer-dashboard-stat-card">
                                <h4>Accepted</h4>
                                <p>{schedule.stats?.accepted || 0}</p>
                            </div>
                            <div className="customer-dashboard-stat-card">
                                <h4>Completed</h4>
                                <p>{schedule.stats?.completed || 0}</p>
                            </div>
                        </div>
                        <div className="customer-dashboard-busy-dates">
                            <h4>Busy Dates</h4>
                            <div className="customer-dashboard-dates-grid">
                                {schedule.busy_dates?.length > 0 ? (
                                    schedule.busy_dates.map((date, index) => (
                                        <span key={index} className="customer-dashboard-busy-date">
                                            {new Date(date).toLocaleDateString()}
                                        </span>
                                    ))
                                ) : (
                                    <p>No busy dates currently.</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'documents' && (
                    <div className="customer-dashboard-documents">
                        <div className="customer-dashboard-documents-header">
                            <h3 className="customer-dashboard-section-title">Verification Documents</h3>
                            <button
                                className="customer-dashboard-btn customer-dashboard-btn-primary"
                                onClick={() => setShowDocumentForm(true)}
                            >
                                Upload Document
                            </button>
                        </div>
                        <div className="customer-dashboard-documents-list">
                            {documents.map(doc => (
                                <div key={doc.id} className="customer-dashboard-document-item">
                                    <div className="customer-dashboard-document-info">
                                        <h4 className="customer-dashboard-document-type">{doc.document_type}</h4>
                                        <p className="customer-dashboard-document-description">{doc.description}</p>
                                        <span className={`customer-dashboard-document-status ${doc.is_verified ? 'verified' : 'pending'}`}>
                                            {doc.is_verified ? 'Verified' : 'Pending Verification'}
                                        </span>
                                    </div>
                                    <div className="customer-dashboard-document-actions">
                                        <button
                                            className="customer-dashboard-btn customer-dashboard-btn-small"
                                            onClick={() => {
                                                setEditingDocument(doc);
                                                setDocumentForm({
                                                    document_type: doc.document_type,
                                                    file: null,
                                                    description: doc.description
                                                });
                                                setShowDocumentForm(true);
                                            }}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            className="customer-dashboard-btn customer-dashboard-btn-small customer-dashboard-btn-danger"
                                            onClick={() => handleDeleteDocument(doc.id)}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {documents.length === 0 && (
                            <div className="customer-dashboard-empty-state">
                                <p>No documents uploaded yet. Add verification documents!</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'reviews' && (
                    <div className="customer-dashboard-reviews">
                        <h3 className="customer-dashboard-section-title">My Reviews</h3>
                        <div className="customer-dashboard-reviews-list">
                            {reviews.length > 0 ? (
                                reviews.map(review => (
                                    <div key={review.id} className="customer-dashboard-review-item">
                                        <div className="customer-dashboard-review-info">
                                            <div className="customer-dashboard-review-header">
                                                <h4 className="customer-dashboard-review-rating">
                                                    {'★'.repeat(review.rating || 0)}{'☆'.repeat(5 - (review.rating || 0))}
                                                    <span>({review.rating}/5)</span>
                                                </h4>
                                                <span className="customer-dashboard-review-date">
                                                    {new Date(review.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <p className="customer-dashboard-review-comment">{review.comment}</p>
                                            <p className="customer-dashboard-review-client">
                                                By {review.client_name || 'Anonymous Client'}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="customer-dashboard-empty-state">
                                    <p>No reviews yet. Keep providing great service!</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            {renderBookingModal()}
            {renderPortfolioForm()}
            {renderAvailabilityForm()}
            {renderDocumentForm()}

            {/* Chat Widget */}
            {showChat && (
                <ChatWidget
                    isOpen={showChat}
                    onClose={handleCloseChat}
                    selectedUserId={selectedUserForChat}
                    userRole="customer"
                />
            )}
        </div>
    );
};

export default CustomerDashboard;