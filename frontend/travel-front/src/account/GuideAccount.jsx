import React, { useState, useEffect } from "react";
// import { useTranslation } from "react-i18next";
import { t } from "../utils/translationFallback"; // Translation fallback
import {
    FiUser,
    FiMail,
    FiGlobe,
    FiEdit3,
    FiSave,
    FiX,
    FiCalendar,
    FiDollarSign,
    FiMapPin,
    FiCamera,
    FiLogOut,
    FiFlag,
    FiShield,
    FiPlus,
    FiTrash2,
    FiCheck,
    FiLoader,
    FiStar,
    FiBookOpen,
    FiClock,
    FiSettings,
    FiImage,
    FiFileText,
    FiToggleLeft,
    FiToggleRight,
    FiAward,
    FiTrendingUp
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import {
    getCustomerProfile,
    updateCustomerProfile,
    createCustomerProfile,
    getMyPortfolio,
    createPortfolioItem,
    updatePortfolioItem,
    deletePortfolioItem,
    getMyAvailability,
    createAvailability,
    updateAvailability,
    deleteAvailability,
    getMyDocuments,
    uploadDocument,
    deleteDocument,
    logoutUser,
    getCurrentUserShort,
    getLanguages,
    getServiceTypes,
    getCities
} from "../api/api";
import "./GuideAccount.css";

// Helper function to safely format numbers
const safeToFixed = (value, decimals = 1) => {
    if (value === null || value === undefined || value === '') {
        return "0.0";
    }
    const num = Number(value);
    if (isNaN(num)) {
        return "0.0";
    }
    return num.toFixed(decimals);
};

const GuideAccount = ({ user, setIsAuthenticated, setUser }) => {
    // const { t } = useTranslation(); // Commented out
    const navigate = useNavigate();

    // State management with localStorage persistence
    const [profile, setProfile] = useState(null);
    const [portfolio, setPortfolio] = useState([]);
    const [availability, setAvailability] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [isEditing, setIsEditing] = useState(() => {
        // localStorage'dan editing holatini yuklash
        return JSON.parse(localStorage.getItem("guideAccount_isEditing") || "false");
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [activeTab, setActiveTab] = useState(() => {
        // localStorage'dan active tab'ni yuklash
        return localStorage.getItem("guideAccount_activeTab") || "profile";
    });

    // Reference data
    const [languages, setLanguages] = useState([]);
    const [serviceTypes, setServiceTypes] = useState([]);
    const [cities, setCities] = useState([]);

    // Form data with localStorage persistence
    const [formData, setFormData] = useState(() => {
        // localStorage'dan form ma'lumotlarini yuklash
        const savedFormData = localStorage.getItem("guideAccount_formData");
        return savedFormData ? JSON.parse(savedFormData) : {
            professional_bio: "",
            years_of_experience: 0,
            service_types: [],
            city: null,
            service_areas: "",
            hourly_rate: "",
            daily_rate: "",
            currency: "USD",
            languages: [],
            is_available: true
        };
    });

    // Portfolio form with localStorage persistence
    const [portfolioForm, setPortfolioForm] = useState(() => {
        const savedPortfolioForm = localStorage.getItem("guideAccount_portfolioForm");
        return savedPortfolioForm ? JSON.parse(savedPortfolioForm) : {
            title: "",
            description: "",
            image: null,
            order: 0
        };
    });
    const [editingPortfolio, setEditingPortfolio] = useState(() => {
        const savedEditingPortfolio = localStorage.getItem("guideAccount_editingPortfolio");
        return savedEditingPortfolio ? JSON.parse(savedEditingPortfolio) : null;
    });

    // Availability form with localStorage persistence
    const [availabilityForm, setAvailabilityForm] = useState(() => {
        const savedAvailabilityForm = localStorage.getItem("guideAccount_availabilityForm");
        return savedAvailabilityForm ? JSON.parse(savedAvailabilityForm) : {
            date: "",
            is_available: true,
            start_time: "",
            end_time: "",
            note: ""
        };
    });
    const [editingAvailability, setEditingAvailability] = useState(() => {
        const savedEditingAvailability = localStorage.getItem("guideAccount_editingAvailability");
        return savedEditingAvailability ? JSON.parse(savedEditingAvailability) : null;
    });

    // Document upload form with localStorage persistence
    const [documentForm, setDocumentForm] = useState(() => {
        const savedDocumentForm = localStorage.getItem("guideAccount_documentForm");
        return savedDocumentForm ? JSON.parse(savedDocumentForm) : {
            document_type: "id_card",
            file: null,
            description: ""
        };
    });

    // State'larni localStorage'ga saqlash
    useEffect(() => {
        localStorage.setItem("guideAccount_isEditing", JSON.stringify(isEditing));
    }, [isEditing]);

    useEffect(() => {
        localStorage.setItem("guideAccount_activeTab", activeTab);
    }, [activeTab]);

    useEffect(() => {
        localStorage.setItem("guideAccount_formData", JSON.stringify(formData));
    }, [formData]);

    useEffect(() => {
        // Image faylini localStorage'ga saqlamaslik (faqat boshqa ma'lumotlarni saqlash)
        const portfolioFormWithoutImage = { ...portfolioForm };
        delete portfolioFormWithoutImage.image;
        localStorage.setItem("guideAccount_portfolioForm", JSON.stringify(portfolioFormWithoutImage));
    }, [portfolioForm]);

    useEffect(() => {
        localStorage.setItem("guideAccount_editingPortfolio", JSON.stringify(editingPortfolio));
    }, [editingPortfolio]);

    useEffect(() => {
        localStorage.setItem("guideAccount_availabilityForm", JSON.stringify(availabilityForm));
    }, [availabilityForm]);

    useEffect(() => {
        localStorage.setItem("guideAccount_editingAvailability", JSON.stringify(editingAvailability));
    }, [editingAvailability]);

    useEffect(() => {
        // File faylini localStorage'ga saqlamaslik
        const documentFormWithoutFile = { ...documentForm };
        delete documentFormWithoutFile.file;
        localStorage.setItem("guideAccount_documentForm", JSON.stringify(documentFormWithoutFile));
    }, [documentForm]);

    useEffect(() => {
        console.log("GuideAccount component mounted for user:", user);
        if (user) {
            loadAllData();
        }
    }, [user]);

    // Component unmount'da localStorage'ni tozalash (faqat logout holatida)
    useEffect(() => {
        return () => {
            // Agar foydalanuvchi logout qilgan bo'lsa, localStorage'ni tozalash
            const token = localStorage.getItem("access_token");
            if (!token) {
                clearLocalStorageState();
            }
        };
    }, []);

    const clearLocalStorageState = () => {
        localStorage.removeItem("guideAccount_isEditing");
        localStorage.removeItem("guideAccount_activeTab");
        localStorage.removeItem("guideAccount_formData");
        localStorage.removeItem("guideAccount_portfolioForm");
        localStorage.removeItem("guideAccount_editingPortfolio");
        localStorage.removeItem("guideAccount_availabilityForm");
        localStorage.removeItem("guideAccount_editingAvailability");
        localStorage.removeItem("guideAccount_documentForm");
    };

    const loadAllData = async () => {
        if (!user) {
            console.log("No user data available for loading data");
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            await Promise.all([
                loadProfile(),
                loadPortfolio(),
                loadAvailability(),
                loadDocuments(),
                loadReferenceData()
            ]);
        } catch (error) {
            console.error("Error loading data:", error);
            setError(t("profile.errors.load_failed") + ": " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const loadProfile = async () => {
        try {
            console.log("Loading customer profile...");
            const profileData = await getCustomerProfile();
            console.log("Customer profile loaded:", profileData);
            setProfile(profileData);

            // Agar editing holatida bo'lmasa, server ma'lumotlari bilan formData'ni yangilash
            if (!isEditing) {
                const newFormData = {
                    professional_bio: profileData.professional_bio || "",
                    years_of_experience: profileData.years_of_experience || 0,
                    service_types: profileData.service_types || [],
                    city: profileData.city || null,
                    service_areas: profileData.service_areas || "",
                    hourly_rate: profileData.hourly_rate || "",
                    daily_rate: profileData.daily_rate || "",
                    currency: profileData.currency || "USD",
                    languages: profileData.languages || [],
                    is_available: profileData.is_available !== undefined ? profileData.is_available : true
                };
                setFormData(newFormData);
            }
        } catch (error) {
            console.error("Error loading customer profile:", error);
            if (error.message.includes("Profile not found") || error.message.includes("404")) {
                console.log("No profile found, user can create one");
                setProfile(null);
            } else {
                throw error;
            }
        }
    };

    const loadPortfolio = async () => {
        try {
            console.log("Loading portfolio...");
            const portfolioData = await getMyPortfolio();
            console.log("Portfolio data loaded:", portfolioData);
            setPortfolio(portfolioData?.results || portfolioData || []);
        } catch (error) {
            console.error("Failed to load portfolio:", error);
            setPortfolio([]);
        }
    };

    const loadAvailability = async () => {
        try {
            console.log("Loading availability...");
            const availabilityData = await getMyAvailability();
            console.log("Availability data loaded:", availabilityData);
            setAvailability(availabilityData?.results || availabilityData || []);
        } catch (error) {
            console.error("Failed to load availability:", error);
            setAvailability([]);
        }
    };

    const loadDocuments = async () => {
        try {
            console.log("Loading documents...");
            const documentsData = await getMyDocuments();
            console.log("Documents data loaded:", documentsData);
            setDocuments(documentsData?.results || documentsData || []);
        } catch (error) {
            console.error("Failed to load documents:", error);
            setDocuments([]);
        }
    };

    const loadReferenceData = async () => {
        try {
            console.log("Loading reference data...");
            const [languagesData, serviceTypesData, citiesData] = await Promise.all([
                getLanguages(),
                getServiceTypes(),
                getCities()
            ]);
            console.log("Reference data loaded:", { languagesData, serviceTypesData, citiesData });

            setLanguages(languagesData?.results || languagesData || []);
            setServiceTypes(serviceTypesData?.results || serviceTypesData || []);
            setCities(citiesData?.results || citiesData || []);
        } catch (error) {
            console.error("Failed to load reference data:", error);
            // Set empty arrays to prevent crashes
            setLanguages([]);
            setServiceTypes([]);
            setCities([]);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        clearMessages();
    };

    const handleServiceTypeChange = (serviceTypeId) => {
        setFormData(prev => ({
            ...prev,
            service_types: prev.service_types.includes(serviceTypeId)
                ? prev.service_types.filter(id => id !== serviceTypeId)
                : [...prev.service_types, serviceTypeId]
        }));
    };

    const handleLanguageChange = (languageId) => {
        setFormData(prev => ({
            ...prev,
            languages: prev.languages.includes(languageId)
                ? prev.languages.filter(id => id !== languageId)
                : [...prev.languages, languageId]
        }));
    };

    const clearMessages = () => {
        setError("");
        setSuccess("");
    };

    const handleSaveProfile = async () => {
        try {
            setSaving(true);
            clearMessages();

            // Basic validation
            if (!formData.professional_bio.trim()) {
                setError(t("profile.validation.bio_required"));
                return;
            }

            let savedProfile;
            if (profile) {
                savedProfile = await updateCustomerProfile(formData);
            } else {
                savedProfile = await createCustomerProfile(formData);
            }

            setProfile(savedProfile);
            setIsEditing(false);
            setSuccess(t("profile.success.saved"));

            // localStorage'dan editing state'ni tozalash
            localStorage.removeItem("guideAccount_isEditing");
            localStorage.removeItem("guideAccount_formData");

            // Refresh user data
            const updatedUser = await getCurrentUserShort();
            setUser(updatedUser);
        } catch (error) {
            setError(error.message || t("profile.errors.save_failed"));
        } finally {
            setSaving(false);
        }
    };

    const handleCancelEdit = () => {
        if (profile) {
            setFormData({
                professional_bio: profile.professional_bio || "",
                years_of_experience: profile.years_of_experience || 0,
                service_types: profile.service_types || [],
                city: profile.city || null,
                service_areas: profile.service_areas || "",
                hourly_rate: profile.hourly_rate || "",
                daily_rate: profile.daily_rate || "",
                currency: profile.currency || "USD",
                languages: profile.languages || [],
                is_available: profile.is_available !== undefined ? profile.is_available : true
            });
        }
        setIsEditing(false);
        clearMessages();

        // localStorage'dan editing state'ni tozalash
        localStorage.removeItem("guideAccount_isEditing");
        localStorage.removeItem("guideAccount_formData");
    };

    const handleEdit = () => {
        setIsEditing(true);
        clearMessages();
    };

    // Portfolio management
    const handlePortfolioSubmit = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);
            clearMessages();

            const formDataToSend = new FormData();
            formDataToSend.append('title', portfolioForm.title);
            formDataToSend.append('description', portfolioForm.description);
            formDataToSend.append('order', portfolioForm.order);

            if (portfolioForm.image) {
                formDataToSend.append('image', portfolioForm.image);
            }

            if (editingPortfolio) {
                await updatePortfolioItem(editingPortfolio.id, formDataToSend);
                setSuccess("Portfolio item updated successfully");
            } else {
                await createPortfolioItem(formDataToSend);
                setSuccess("Portfolio item created successfully");
            }

            // Form'ni tozalash va localStorage'ni yangilash
            setPortfolioForm({ title: "", description: "", image: null, order: 0 });
            setEditingPortfolio(null);
            localStorage.removeItem("guideAccount_portfolioForm");
            localStorage.removeItem("guideAccount_editingPortfolio");

            await loadPortfolio();
        } catch (error) {
            setError(error.message || "Failed to save portfolio item");
        } finally {
            setSaving(false);
        }
    };

    const handleDeletePortfolio = async (id) => {
        if (window.confirm("Are you sure you want to delete this item?")) {
            try {
                await deletePortfolioItem(id);
                setSuccess("Portfolio item deleted successfully");
                await loadPortfolio();
            } catch (error) {
                setError(error.message || "Failed to delete portfolio item");
            }
        }
    };

    const handleEditPortfolio = (item) => {
        setEditingPortfolio(item);
        setPortfolioForm({
            title: item.title,
            description: item.description,
            image: null,
            order: item.order
        });
    };

    const handleCancelPortfolioEdit = () => {
        setEditingPortfolio(null);
        setPortfolioForm({ title: "", description: "", image: null, order: 0 });
        localStorage.removeItem("guideAccount_portfolioForm");
        localStorage.removeItem("guideAccount_editingPortfolio");
    };

    // Availability management
    const handleAvailabilitySubmit = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);
            clearMessages();

            if (editingAvailability) {
                await updateAvailability(editingAvailability.id, availabilityForm);
                setSuccess("Availability updated successfully");
            } else {
                await createAvailability(availabilityForm);
                setSuccess("Availability added successfully");
            }

            // Form'ni tozalash va localStorage'ni yangilash
            setAvailabilityForm({
                date: "",
                is_available: true,
                start_time: "",
                end_time: "",
                note: ""
            });
            setEditingAvailability(null);
            localStorage.removeItem("guideAccount_availabilityForm");
            localStorage.removeItem("guideAccount_editingAvailability");

            await loadAvailability();
        } catch (error) {
            setError(error.message || "Failed to save availability");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteAvailability = async (id) => {
        if (window.confirm(t("availability.confirm_delete"))) {
            try {
                await deleteAvailability(id);
                setSuccess(t("availability.success.deleted"));
                await loadAvailability();
            } catch (error) {
                setError(error.message || t("availability.errors.delete_failed"));
            }
        }
    };

    const handleEditAvailability = (item) => {
        setEditingAvailability(item);
        setAvailabilityForm({
            date: item.date,
            is_available: item.is_available,
            start_time: item.start_time || "",
            end_time: item.end_time || "",
            note: item.note || ""
        });
    };

    const handleCancelAvailabilityEdit = () => {
        setEditingAvailability(null);
        setAvailabilityForm({
            date: "",
            is_available: true,
            start_time: "",
            end_time: "",
            note: ""
        });
        localStorage.removeItem("guideAccount_availabilityForm");
        localStorage.removeItem("guideAccount_editingAvailability");
    };

    // Document management
    const handleDocumentSubmit = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);
            clearMessages();

            const formDataToSend = new FormData();
            formDataToSend.append('document_type', documentForm.document_type);
            formDataToSend.append('description', documentForm.description);
            if (documentForm.file) {
                formDataToSend.append('file', documentForm.file);
            }

            await uploadDocument(formDataToSend);
            setSuccess("Document uploaded successfully");

            // Form'ni tozalash va localStorage'ni yangilash
            setDocumentForm({
                document_type: "id_card",
                file: null,
                description: ""
            });
            localStorage.removeItem("guideAccount_documentForm");

            await loadDocuments();
        } catch (error) {
            setError(error.message || "Failed to upload document");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteDocument = async (id) => {
        if (window.confirm(t("documents.confirm_delete"))) {
            try {
                await deleteDocument(id);
                setSuccess(t("documents.success.deleted"));
                await loadDocuments();
            } catch (error) {
                setError(error.message || t("documents.errors.delete_failed"));
            }
        }
    };

    const handleLogout = async () => {
        try {
            await logoutUser();
        } catch (error) {
            console.error("Logout error:", error);
        } finally {
            // Har qanday holatda ham foydalanuvchini tizimdan chiqarish
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            localStorage.removeItem("user_data");
            clearLocalStorageState();
            setIsAuthenticated(false);
            setUser(null);
            navigate("/");
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        return date.toLocaleDateString();
    };

    const getVerificationStatusBadge = (status) => {
        const statusConfig = {
            verified: { class: "verified", icon: FiCheck, text: t("profile.verification.verified") },
            pending: { class: "pending", icon: FiClock, text: t("profile.verification.pending") },
            rejected: { class: "rejected", icon: FiX, text: t("profile.verification.rejected") }
        };

        const config = statusConfig[status] || statusConfig.pending;
        const Icon = config.icon;

        return (
            <span className={`verification-badge ${config.class}`}>
                <Icon />
                {config.text}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="account-container">
                <div className="account-loading">
                    <FiLoader className="loading-spinner" />
                    <p>{t("profile.loading")}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="account-container">
            <div className="account-header">
                <div className="account-header-content">
                    <div className="account-avatar-section">
                        <div className="account-avatar">
                            {user?.avatar ? (
                                <img src={user.avatar} alt="Avatar" />
                            ) : (
                                <FiUser />
                            )}
                            <button className="avatar-edit-btn">
                                <FiCamera />
                            </button>
                        </div>
                        <div className="account-user-info">
                            <h1>{user?.full_name || `${user?.first_name} ${user?.last_name}`}</h1>
                            <p className="user-role">
                                <FiShield />
                                {user?.role ? (
                                    user.role === 'customer' ? 'Guide' :
                                        user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase()
                                ) : "Guide"}
                            </p>
                            <p className="user-email">
                                <FiMail />
                                {user?.email}
                            </p>
                            {user?.country && (
                                <p className="user-location">
                                    <FiMapPin />
                                    {user.country}
                                </p>
                            )}
                            {profile && (
                                <div className="user-stats">
                                    <div className="stat">
                                        <FiStar />
                                        <span>{safeToFixed(profile.average_rating, 1)}</span>
                                    </div>
                                    <div className="stat">
                                        <FiBookOpen />
                                        <span>{profile.total_bookings || 0} {t("profile.stats.bookings")}</span>
                                    </div>
                                    {getVerificationStatusBadge(profile.verification_status)}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="account-actions">
                        {activeTab === "profile" && !isEditing ? (
                            <button
                                className="btn btn-primary"
                                onClick={handleEdit}
                            >
                                <FiEdit3 />
                                {t("profile.actions.edit")}
                            </button>
                        ) : activeTab === "profile" && isEditing ? (
                            <div className="edit-actions">
                                <button
                                    className="btn btn-success"
                                    onClick={handleSaveProfile}
                                    disabled={saving}
                                >
                                    {saving ? <FiLoader className="btn-spinner" /> : <FiSave />}
                                    {t("profile.actions.save")}
                                </button>
                                <button
                                    className="btn btn-outline"
                                    onClick={handleCancelEdit}
                                    disabled={saving}
                                >
                                    <FiX />
                                    {t("profile.actions.cancel")}
                                </button>
                            </div>
                        ) : null}
                        <button
                            className="btn btn-danger"
                            onClick={handleLogout}
                        >
                            <FiLogOut />
                            {t("profile.actions.logout")}
                        </button>
                    </div>
                </div>
            </div>

            {error && (
                <div className="alert alert-error">
                    <span>{error}</span>
                </div>
            )}

            {success && (
                <div className="alert alert-success">
                    <span>{success}</span>
                </div>
            )}

            {/* Tabs Navigation */}
            <div className="account-tabs">
                <button
                    className={`tab ${activeTab === "profile" ? "active" : ""}`}
                    onClick={() => setActiveTab("profile")}
                >
                    <FiUser />
                    {t("profile.tabs.profile")}
                </button>
                <button
                    className={`tab ${activeTab === "portfolio" ? "active" : ""}`}
                    onClick={() => setActiveTab("portfolio")}
                >
                    <FiImage />
                    {t("profile.tabs.portfolio")}
                </button>
                <button
                    className={`tab ${activeTab === "availability" ? "active" : ""}`}
                    onClick={() => setActiveTab("availability")}
                >
                    <FiCalendar />
                    {t("profile.tabs.availability")}
                </button>
                <button
                    className={`tab ${activeTab === "documents" ? "active" : ""}`}
                    onClick={() => setActiveTab("documents")}
                >
                    <FiFileText />
                    {t("profile.tabs.documents")}
                </button>
                <button
                    className={`tab ${activeTab === "stats" ? "active" : ""}`}
                    onClick={() => setActiveTab("stats")}
                >
                    <FiTrendingUp />
                    {t("profile.tabs.statistics")}
                </button>
            </div>

            <div className="account-content">
                {/* Profile Tab */}
                {activeTab === "profile" && (
                    <div className="account-sections">
                        {!profile && !isEditing ? (
                            <div className="no-profile">
                                <div className="no-profile-content">
                                    <FiUser className="no-profile-icon" />
                                    <h3>{t("profile.no_profile")}</h3>
                                    <p>{t("profile.no_profile_description")}</p>
                                    <button
                                        className="btn btn-primary"
                                        onClick={handleEdit}
                                    >
                                        <FiPlus />
                                        {t("profile.actions.create_profile")}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Basic Information */}
                                <div className="account-section">
                                    <div className="section-header">
                                        <h2>
                                            <FiUser />
                                            {t("profile.sections.basic_info")}
                                        </h2>
                                    </div>
                                    <div className="section-content">
                                        <div className="profile-fields">
                                            <div className="field-group">
                                                <label>
                                                    <FiFileText />
                                                    {t("profile.fields.professional_bio")}
                                                </label>
                                                {isEditing ? (
                                                    <textarea
                                                        name="professional_bio"
                                                        value={formData.professional_bio}
                                                        onChange={handleInputChange}
                                                        placeholder={t("profile.placeholders.professional_bio")}
                                                        className="form-textarea"
                                                        rows="4"
                                                    />
                                                ) : (
                                                    <p className="field-value">
                                                        {profile?.professional_bio || t("profile.not_set")}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="field-row">
                                                <div className="field-group">
                                                    <label>
                                                        <FiClock />
                                                        {t("profile.fields.years_experience")}
                                                    </label>
                                                    {isEditing ? (
                                                        <input
                                                            type="number"
                                                            name="years_of_experience"
                                                            value={formData.years_of_experience}
                                                            onChange={handleInputChange}
                                                            className="form-input"
                                                            min="0"
                                                        />
                                                    ) : (
                                                        <span className="field-value">
                                                            {profile?.years_of_experience || 0} {t("profile.years")}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="field-group">
                                                    <label>
                                                        <FiMapPin />
                                                        {t("profile.fields.city")}
                                                    </label>
                                                    {isEditing ? (
                                                        <select
                                                            name="city"
                                                            value={formData.city || ""}
                                                            onChange={handleInputChange}
                                                            className="form-select"
                                                        >
                                                            <option value="">{t("profile.select_city")}</option>
                                                            {cities.map(city => (
                                                                <option key={city.id} value={city.id}>
                                                                    {city.name}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <span className="field-value">
                                                            {profile?.city_name || t("profile.not_set")}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="field-group">
                                                <label>
                                                    <FiMapPin />
                                                    {t("profile.fields.service_areas")}
                                                </label>
                                                {isEditing ? (
                                                    <textarea
                                                        name="service_areas"
                                                        value={formData.service_areas}
                                                        onChange={handleInputChange}
                                                        placeholder={t("profile.placeholders.service_areas")}
                                                        className="form-textarea"
                                                        rows="2"
                                                    />
                                                ) : (
                                                    <p className="field-value">
                                                        {profile?.service_areas || t("profile.not_set")}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Services & Pricing */}
                                <div className="account-section">
                                    <div className="section-header">
                                        <h2>
                                            <FiDollarSign />
                                            {t("profile.sections.services_pricing")}
                                        </h2>
                                    </div>
                                    <div className="section-content">
                                        <div className="profile-fields">
                                            <div className="field-group">
                                                <label>
                                                    <FiSettings />
                                                    {t("profile.fields.service_types")}
                                                </label>
                                                {isEditing ? (
                                                    <div className="service-types-selector">
                                                        {serviceTypes.map(serviceType => (
                                                            <label key={serviceType.id} className="service-option">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={formData.service_types.includes(serviceType.id)}
                                                                    onChange={() => handleServiceTypeChange(serviceType.id)}
                                                                />
                                                                <span>{serviceType.name}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="service-tags">
                                                        {Array.isArray(profile?.service_types) && profile.service_types.length > 0 ? (
                                                            profile.service_types.map(serviceId => {
                                                                const service = serviceTypes.find(s => s.id === serviceId);
                                                                return service ? (
                                                                    <span key={serviceId} className="service-tag">
                                                                        {service.name}
                                                                    </span>
                                                                ) : null;
                                                            })
                                                        ) : (
                                                            <span className="field-value">{t("profile.not_set")}</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="field-row">
                                                <div className="field-group">
                                                    <label>
                                                        <FiDollarSign />
                                                        {t("profile.fields.hourly_rate")}
                                                    </label>
                                                    {isEditing ? (
                                                        <div className="price-input">
                                                            <input
                                                                type="number"
                                                                name="hourly_rate"
                                                                value={formData.hourly_rate}
                                                                onChange={handleInputChange}
                                                                className="form-input"
                                                                min="0"
                                                                step="0.01"
                                                            />
                                                            <span className="currency">{formData.currency}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="field-value">
                                                            {profile?.hourly_rate
                                                                ? `${profile.hourly_rate} ${profile.currency || 'USD'}`
                                                                : t("profile.not_set")
                                                            }
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="field-group">
                                                    <label>
                                                        <FiDollarSign />
                                                        {t("profile.fields.daily_rate")}
                                                    </label>
                                                    {isEditing ? (
                                                        <div className="price-input">
                                                            <input
                                                                type="number"
                                                                name="daily_rate"
                                                                value={formData.daily_rate}
                                                                onChange={handleInputChange}
                                                                className="form-input"
                                                                min="0"
                                                                step="0.01"
                                                            />
                                                            <span className="currency">{formData.currency}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="field-value">
                                                            {profile?.daily_rate
                                                                ? `${profile.daily_rate} ${profile.currency || 'USD'}`
                                                                : t("profile.not_set")
                                                            }
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="field-group">
                                                <label>
                                                    <FiGlobe />
                                                    {t("profile.fields.languages")}
                                                </label>
                                                {isEditing ? (
                                                    <div className="languages-selector">
                                                        {languages.map(language => (
                                                            <label key={language.id} className="language-option">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={formData.languages.includes(language.id)}
                                                                    onChange={() => handleLanguageChange(language.id)}
                                                                />
                                                                <span>{language.name}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="language-tags">
                                                        {Array.isArray(profile?.languages) && profile.languages.length > 0 ? (
                                                            profile.languages.map(langId => {
                                                                const language = languages.find(l => l.id === langId);
                                                                return language ? (
                                                                    <span key={langId} className="language-tag">
                                                                        {language.name}
                                                                    </span>
                                                                ) : null;
                                                            })
                                                        ) : (
                                                            <span className="field-value">{t("profile.not_set")}</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="field-group">
                                                <label>
                                                    <FiToggleRight />
                                                    {t("profile.fields.availability_status")}
                                                </label>
                                                {isEditing ? (
                                                    <label className="toggle-switch">
                                                        <input
                                                            type="checkbox"
                                                            name="is_available"
                                                            checked={formData.is_available}
                                                            onChange={handleInputChange}
                                                        />
                                                        <span className="toggle-slider">
                                                            {formData.is_available ? <FiToggleRight /> : <FiToggleLeft />}
                                                        </span>
                                                        <span className="toggle-label">
                                                            {formData.is_available
                                                                ? t("profile.available")
                                                                : t("profile.unavailable")
                                                            }
                                                        </span>
                                                    </label>
                                                ) : (
                                                    <span className={`availability-status ${profile?.is_available ? 'available' : 'unavailable'}`}>
                                                        {profile?.is_available
                                                            ? <FiCheck className="status-icon" />
                                                            : <FiX className="status-icon" />
                                                        }
                                                        {profile?.is_available
                                                            ? t("profile.available")
                                                            : t("profile.unavailable")
                                                        }
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Portfolio Tab */}
                {activeTab === "portfolio" && (
                    <div className="portfolio-section">
                        <div className="section-header">
                            <h2>
                                <FiImage />
                                {t("profile.tabs.portfolio")}
                            </h2>
                            <button
                                className="btn btn-primary"
                                onClick={() => {
                                    setEditingPortfolio(null);
                                    setPortfolioForm({ title: "", description: "", image: null, order: 0 });
                                    localStorage.removeItem("guideAccount_portfolioForm");
                                    localStorage.removeItem("guideAccount_editingPortfolio");
                                }}
                            >
                                <FiPlus />
                                {t("portfolio.add_item")}
                            </button>
                        </div>

                        {/* Portfolio Form */}
                        <div className="portfolio-form">
                            <form onSubmit={handlePortfolioSubmit}>
                                <div className="form-row">
                                    <div className="field-group">
                                        <label>{t("portfolio.fields.title")}</label>
                                        <input
                                            type="text"
                                            value={portfolioForm.title}
                                            onChange={(e) => setPortfolioForm(prev => ({...prev, title: e.target.value}))}
                                            className="form-input"
                                            required
                                        />
                                    </div>
                                    <div className="field-group">
                                        <label>{t("portfolio.fields.order")}</label>
                                        <input
                                            type="number"
                                            value={portfolioForm.order}
                                            onChange={(e) => setPortfolioForm(prev => ({...prev, order: parseInt(e.target.value) || 0}))}
                                            className="form-input"
                                            min="0"
                                        />
                                    </div>
                                </div>
                                <div className="field-group">
                                    <label>{t("portfolio.fields.description")}</label>
                                    <textarea
                                        value={portfolioForm.description}
                                        onChange={(e) => setPortfolioForm(prev => ({...prev, description: e.target.value}))}
                                        className="form-textarea"
                                        rows="3"
                                    />
                                </div>
                                <div className="field-group">
                                    <label>{t("portfolio.fields.image")}</label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => setPortfolioForm(prev => ({...prev, image: e.target.files[0]}))}
                                        className="form-input"
                                        required={!editingPortfolio}
                                    />
                                </div>
                                <div className="form-actions">
                                    <button type="submit" className="btn btn-success" disabled={saving}>
                                        {saving ? <FiLoader className="btn-spinner" /> : <FiSave />}
                                        {editingPortfolio ? t("portfolio.update") : t("portfolio.add")}
                                    </button>
                                    {editingPortfolio && (
                                        <button
                                            type="button"
                                            className="btn btn-outline"
                                            onClick={handleCancelPortfolioEdit}
                                        >
                                            <FiX />
                                            {t("portfolio.cancel")}
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>

                        {/* Portfolio Items */}
                        <div className="portfolio-grid">
                            {portfolio.map(item => (
                                <div key={item.id} className="portfolio-item">
                                    <div className="portfolio-image">
                                        <img src={item.image} alt={item.title} />
                                    </div>
                                    <div className="portfolio-content">
                                        <h4>{item.title}</h4>
                                        <p>{item.description}</p>
                                        <div className="portfolio-actions">
                                            <button
                                                className="btn btn-outline btn-sm"
                                                onClick={() => handleEditPortfolio(item)}
                                            >
                                                <FiEdit3 />
                                            </button>
                                            <button
                                                className="btn btn-danger btn-sm"
                                                onClick={() => handleDeletePortfolio(item.id)}
                                            >
                                                <FiTrash2 />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Availability Tab */}
                {activeTab === "availability" && (
                    <div className="availability-section">
                        <div className="section-header">
                            <h2>
                                <FiCalendar />
                                {t("profile.tabs.availability")}
                            </h2>
                        </div>

                        {/* Availability Form */}
                        <div className="availability-form">
                            <form onSubmit={handleAvailabilitySubmit}>
                                <div className="form-row">
                                    <div className="field-group">
                                        <label>{t("availability.fields.date")}</label>
                                        <input
                                            type="date"
                                            value={availabilityForm.date}
                                            onChange={(e) => setAvailabilityForm(prev => ({...prev, date: e.target.value}))}
                                            className="form-input"
                                            required
                                        />
                                    </div>
                                    <div className="field-group">
                                        <label>{t("availability.fields.status")}</label>
                                        <select
                                            value={availabilityForm.is_available}
                                            onChange={(e) => setAvailabilityForm(prev => ({...prev, is_available: e.target.value === 'true'}))}
                                            className="form-select"
                                        >
                                            <option value="true">{t("availability.available")}</option>
                                            <option value="false">{t("availability.unavailable")}</option>
                                        </select>
                                    </div>
                                </div>
                                {availabilityForm.is_available && (
                                    <div className="form-row">
                                        <div className="field-group">
                                            <label>{t("availability.fields.start_time")}</label>
                                            <input
                                                type="time"
                                                value={availabilityForm.start_time}
                                                onChange={(e) => setAvailabilityForm(prev => ({...prev, start_time: e.target.value}))}
                                                className="form-input"
                                            />
                                        </div>
                                        <div className="field-group">
                                            <label>{t("availability.fields.end_time")}</label>
                                            <input
                                                type="time"
                                                value={availabilityForm.end_time}
                                                onChange={(e) => setAvailabilityForm(prev => ({...prev, end_time: e.target.value}))}
                                                className="form-input"
                                            />
                                        </div>
                                    </div>
                                )}
                                <div className="field-group">
                                    <label>{t("availability.fields.note")}</label>
                                    <input
                                        type="text"
                                        value={availabilityForm.note}
                                        onChange={(e) => setAvailabilityForm(prev => ({...prev, note: e.target.value}))}
                                        className="form-input"
                                        placeholder={t("availability.note_placeholder")}
                                    />
                                </div>
                                <div className="form-actions">
                                    <button type="submit" className="btn btn-success" disabled={saving}>
                                        {saving ? <FiLoader className="btn-spinner" /> : <FiSave />}
                                        {editingAvailability ? t("availability.update") : t("availability.add")}
                                    </button>
                                    {editingAvailability && (
                                        <button
                                            type="button"
                                            className="btn btn-outline"
                                            onClick={handleCancelAvailabilityEdit}
                                        >
                                            <FiX />
                                            {t("availability.cancel")}
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>

                        {/* Availability List */}
                        <div className="availability-list">
                            {availability.map(item => (
                                <div key={item.id} className="availability-item">
                                    <div className="availability-date">
                                        <FiCalendar />
                                        <span>{formatDate(item.date)}</span>
                                    </div>
                                    <div className="availability-status">
                                        {item.is_available ? (
                                            <span className="status available">
                                                <FiCheck />
                                                {t("availability.available")}
                                            </span>
                                        ) : (
                                            <span className="status unavailable">
                                                <FiX />
                                                {t("availability.unavailable")}
                                            </span>
                                        )}
                                    </div>
                                    {item.is_available && (item.start_time || item.end_time) && (
                                        <div className="availability-time">
                                            <FiClock />
                                            <span>{item.start_time} - {item.end_time}</span>
                                        </div>
                                    )}
                                    {item.note && (
                                        <div className="availability-note">
                                            <p>{item.note}</p>
                                        </div>
                                    )}
                                    <div className="availability-actions">
                                        <button
                                            className="btn btn-outline btn-sm"
                                            onClick={() => handleEditAvailability(item)}
                                        >
                                            <FiEdit3 />
                                        </button>
                                        <button
                                            className="btn btn-danger btn-sm"
                                            onClick={() => handleDeleteAvailability(item.id)}
                                        >
                                            <FiTrash2 />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Documents Tab */}
                {activeTab === "documents" && (
                    <div className="documents-section">
                        <div className="section-header">
                            <h2>
                                <FiFileText />
                                {t("profile.tabs.documents")}
                            </h2>
                        </div>

                        {/* Document Upload Form */}
                        <div className="document-form">
                            <form onSubmit={handleDocumentSubmit}>
                                <div className="form-row">
                                    <div className="field-group">
                                        <label>{t("documents.fields.type")}</label>
                                        <select
                                            value={documentForm.document_type}
                                            onChange={(e) => setDocumentForm(prev => ({...prev, document_type: e.target.value}))}
                                            className="form-select"
                                        >
                                            <option value="id_card">{t("documents.types.id_card")}</option>
                                            <option value="passport">{t("documents.types.passport")}</option>
                                            <option value="license">{t("documents.types.license")}</option>
                                            <option value="certificate">{t("documents.types.certificate")}</option>
                                            <option value="other">{t("documents.types.other")}</option>
                                        </select>
                                    </div>
                                    <div className="field-group">
                                        <label>{t("documents.fields.file")}</label>
                                        <input
                                            type="file"
                                            onChange={(e) => setDocumentForm(prev => ({...prev, file: e.target.files[0]}))}
                                            className="form-input"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="field-group">
                                    <label>{t("documents.fields.description")}</label>
                                    <input
                                        type="text"
                                        value={documentForm.description}
                                        onChange={(e) => setDocumentForm(prev => ({...prev, description: e.target.value}))}
                                        className="form-input"
                                        placeholder={t("documents.description_placeholder")}
                                    />
                                </div>
                                <div className="form-actions">
                                    <button type="submit" className="btn btn-success" disabled={saving}>
                                        {saving ? <FiLoader className="btn-spinner" /> : <FiPlus />}
                                        {t("documents.upload")}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Documents List */}
                        <div className="documents-list">
                            {documents.map(doc => (
                                <div key={doc.id} className="document-item">
                                    <div className="document-info">
                                        <div className="document-type">
                                            <FiFileText />
                                            <span>{t(`documents.types.${doc.document_type}`)}</span>
                                        </div>
                                        <div className="document-description">
                                            <p>{doc.description}</p>
                                        </div>
                                        <div className="document-status">
                                            {doc.is_verified ? (
                                                <span className="status verified">
                                                    <FiCheck />
                                                    {t("documents.verified")}
                                                </span>
                                            ) : (
                                                <span className="status pending">
                                                    <FiClock />
                                                    {t("documents.pending")}
                                                </span>
                                            )}
                                        </div>
                                        <div className="document-date">
                                            <span>{formatDate(doc.created_at)}</span>
                                        </div>
                                    </div>
                                    <div className="document-actions">
                                        <a
                                            href={doc.file}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn btn-outline btn-sm"
                                        >
                                            <FiFileText />
                                            {t("documents.view")}
                                        </a>
                                        <button
                                            className="btn btn-danger btn-sm"
                                            onClick={() => handleDeleteDocument(doc.id)}
                                        >
                                            <FiTrash2 />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Statistics Tab */}
                {activeTab === "stats" && (
                    <div className="stats-section">
                        <div className="section-header">
                            <h2>
                                <FiTrendingUp />
                                {t("profile.tabs.statistics")}
                            </h2>
                        </div>

                        <div className="stats-grid">
                            <div className="stat-card">
                                <div className="stat-icon">
                                    <FiBookOpen />
                                </div>
                                <div className="stat-content">
                                    <h3>{profile?.total_bookings || 0}</h3>
                                    <p>{t("profile.stats.total_bookings")}</p>
                                </div>
                            </div>

                            <div className="stat-card">
                                <div className="stat-icon">
                                    <FiStar />
                                </div>
                                <div className="stat-content">
                                    <h3>{safeToFixed(profile?.average_rating, 1)}</h3>
                                    <p>{t("profile.stats.average_rating")}</p>
                                </div>
                            </div>

                            <div className="stat-card">
                                <div className="stat-icon">
                                    <FiFileText />
                                </div>
                                <div className="stat-content">
                                    <h3>{profile?.total_reviews || 0}</h3>
                                    <p>{t("profile.stats.total_reviews")}</p>
                                </div>
                            </div>

                            <div className="stat-card">
                                <div className="stat-icon">
                                    <FiCalendar />
                                </div>
                                <div className="stat-content">
                                    <h3>{formatDate(user?.date_joined)}</h3>
                                    <p>{t("profile.stats.member_since")}</p>
                                </div>
                            </div>

                            <div className="stat-card">
                                <div className="stat-icon">
                                    <FiShield />
                                </div>
                                <div className="stat-content">
                                    <h3>{getVerificationStatusBadge(profile?.verification_status)}</h3>
                                    <p>{t("profile.stats.verification_status")}</p>
                                </div>
                            </div>

                            <div className="stat-card">
                                <div className="stat-icon">
                                    <FiClock />
                                </div>
                                <div className="stat-content">
                                    <h3>{profile?.years_of_experience || 0}</h3>
                                    <p>{t("profile.stats.years_experience")}</p>
                                </div>
                            </div>
                        </div>

                        {/* Performance Metrics */}
                        <div className="performance-section">
                            <h3>{t("profile.stats.performance")}</h3>
                            <div className="performance-grid">
                                <div className="performance-item">
                                    <div className="performance-bar">
                                        <div className="performance-label">
                                            {t("profile.stats.profile_completion")}
                                        </div>
                                        <div className="progress-bar">
                                            <div
                                                className="progress-fill"
                                                style={{
                                                    width: profile ? '85%' : '20%'
                                                }}
                                            ></div>
                                        </div>
                                        <div className="performance-value">
                                            {profile ? '85%' : '20%'}
                                        </div>
                                    </div>
                                </div>

                                <div className="performance-item">
                                    <div className="performance-bar">
                                        <div className="performance-label">
                                            {t("profile.stats.response_rate")}
                                        </div>
                                        <div className="progress-bar">
                                            <div
                                                className="progress-fill"
                                                style={{ width: "92%" }}
                                            ></div>
                                        </div>
                                        <div className="performance-value">92%</div>
                                    </div>
                                </div>

                                <div className="performance-item">
                                    <div className="performance-bar">
                                        <div className="performance-label">
                                            {t("profile.stats.availability_rate")}
                                        </div>
                                        <div className="progress-bar">
                                            <div
                                                className="progress-fill"
                                                style={{ width: "78%" }}
                                            ></div>
                                        </div>
                                        <div className="performance-value">78%</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GuideAccount;