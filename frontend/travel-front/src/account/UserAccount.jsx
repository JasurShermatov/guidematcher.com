import React, { useState, useEffect } from "react";
import { t } from "../utils/translationFallback";
import {
    FiUser,
    FiMail,
    FiGlobe,
    FiEdit3,
    FiSave,
    FiX,
    FiCalendar,
    FiPhone,
    FiMessageCircle,
    FiCamera,
    FiLogOut,
    FiMapPin,
    FiFlag,
    FiHeart,
    FiSettings,
    FiShield,
    FiPlus,
    FiTrash2,
    FiCheck,
    FiLoader
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import {
    getClientProfile,
    updateClientProfile,
    createClientProfile,
    logoutUser,
    getCurrentUserShort,
    getLanguages,
    getCountries
} from "../api/api";
import "./UserAccount.css";

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

const UserAccount = ({ user, setIsAuthenticated, setUser }) => {
    const navigate = useNavigate();

    // State management
    const [profile, setProfile] = useState(null);
    const [isEditing, setIsEditing] = useState(() => {
        return JSON.parse(localStorage.getItem("userAccount_isEditing") || "false");
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [languages, setLanguages] = useState([]);
    const [countries, setCountries] = useState([]);

    // Form data
    const [formData, setFormData] = useState(() => {
        const savedFormData = localStorage.getItem("userAccount_formData");
        return savedFormData ? JSON.parse(savedFormData) : {
            date_of_birth: "",
            preferred_contact: "chat",
            languages: []
        };
    });

    // User data state
    const [userData, setUserData] = useState({
        first_name: user?.first_name || "",
        last_name: user?.last_name || "",
        email: user?.email || "",
        country: user?.country || "",
        bio: user?.bio || "",
        avatar: user?.avatar || null
    });

    // Save to localStorage
    useEffect(() => {
        localStorage.setItem("userAccount_isEditing", JSON.stringify(isEditing));
    }, [isEditing]);

    useEffect(() => {
        localStorage.setItem("userAccount_formData", JSON.stringify(formData));
    }, [formData]);

    useEffect(() => {
        console.log("UserAccount component mounted for user:", user);
        loadProfile();
        loadInitialData();
    }, [user]);

    // Cleanup localStorage on logout
    useEffect(() => {
        return () => {
            const token = localStorage.getItem("access_token");
            if (!token) {
                localStorage.removeItem("userAccount_isEditing");
                localStorage.removeItem("userAccount_formData");
            }
        };
    }, []);

    const loadProfile = async () => {
        if (!user?.id) {
            console.log("No user ID available");
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            console.log("Fetching client profiles list...");
            const profileData = await getClientProfile(); // Uses GET /profiles/clients/ + filter in api.js

            if (profileData) {
                console.log("Client profile found:", profileData);
                setProfile(profileData);

                if (!isEditing) {
                    setFormData({
                        date_of_birth: profileData.date_of_birth || "",
                        preferred_contact: profileData.preferred_contact || "chat",
                        languages: Array.isArray(profileData.languages) ? profileData.languages : []
                    });
                }
            } else {
                console.log("No profile found, user can create one");
                setProfile(null);
                setFormData({
                    date_of_birth: "",
                    preferred_contact: "chat",
                    languages: []
                });
            }
        } catch (error) {
            console.error("Error loading client profile:", error);
            // Even if error, treat as no profile
            setProfile(null);
            setFormData({
                date_of_birth: "",
                preferred_contact: "chat",
                languages: []
            });
        } finally {
            setLoading(false);
        }
    };

    const loadInitialData = async () => {
        try {
            console.log("Loading initial data...");
            const [languagesData, countriesData] = await Promise.all([
                getLanguages(),
                getCountries()
            ]);

            setLanguages(languagesData?.results || languagesData || []);
            setCountries(countriesData?.results || countriesData || []);
        } catch (error) {
            console.error("Failed to load initial data:", error);
            setLanguages([]);
            setCountries([]);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        clearMessages();
    };

    const handleUserDataChange = (e) => {
        const { name, value } = e.target;
        setUserData(prev => ({ ...prev, [name]: value }));
        clearMessages();
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

    const handleSave = async () => {
        try {
            setSaving(true);
            clearMessages();

            if (!formData.preferred_contact) {
                setError(t("profile.validation.required_fields"));
                return;
            }

            let savedProfile;
            if (profile) {
                savedProfile = await updateClientProfile(formData);
            } else {
                savedProfile = await createClientProfile({
                    ...formData,
                    user: user.id  // muhim: backendga user ID ni uzatish
                });
            }

            setProfile(savedProfile);
            setIsEditing(false);
            setSuccess(t("profile.success.saved"));

            localStorage.removeItem("userAccount_isEditing");
            localStorage.removeItem("userAccount_formData");

            const updatedUser = await getCurrentUserShort();
            setUser(updatedUser);
        } catch (error) {
            setError(error.message || t("profile.errors.save_failed"));
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        if (profile) {
            setFormData({
                date_of_birth: profile.date_of_birth || "",
                preferred_contact: profile.preferred_contact || "chat",
                languages: profile.languages || []
            });
        }
        setIsEditing(false);
        clearMessages();
        localStorage.removeItem("userAccount_isEditing");
        localStorage.removeItem("userAccount_formData");
    };

    const handleEdit = () => {
        setIsEditing(true);
        clearMessages();
    };

    const handleLogout = async () => {
        try {
            await logoutUser();
        } catch (error) {
            console.error("Logout error:", error);
        } finally {
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            localStorage.removeItem("user_data");
            localStorage.removeItem("userAccount_isEditing");
            localStorage.removeItem("userAccount_formData");
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
                            {userData.avatar ? (
                                <img src={userData.avatar} alt="Avatar" />
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
                                    user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase()
                                ) : "Client"}
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
                        </div>
                    </div>
                    <div className="account-actions">
                        {!isEditing ? (
                            <button
                                className="btn btn-primary"
                                onClick={handleEdit}
                            >
                                <FiEdit3 />
                                {t("profile.actions.edit")}
                            </button>
                        ) : (
                            <div className="edit-actions">
                                <button
                                    className="btn btn-success"
                                    onClick={handleSave}
                                    disabled={saving}
                                >
                                    {saving ? <FiLoader className="btn-spinner" /> : <FiSave />}
                                    {t("profile.actions.save")}
                                </button>
                                <button
                                    className="btn btn-outline"
                                    onClick={handleCancel}
                                    disabled={saving}
                                >
                                    <FiX />
                                    {t("profile.actions.cancel")}
                                </button>
                            </div>
                        )}
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

            <div className="account-content">
                <div className="account-sections">
                    {/* Personal Information Section */}
                    <div className="account-section">
                        <div className="section-header">
                            <h2>
                                <FiUser />
                                {t("profile.sections.personal_info")}
                            </h2>
                        </div>
                        <div className="section-content">
                            {!profile && !isEditing ? (
                                <div className="no-profile">
                                    <p>{t("profile.no_profile")}</p>
                                    <button
                                        className="btn btn-primary"
                                        onClick={handleEdit}
                                    >
                                        <FiPlus />
                                        {t("profile.actions.create_profile")}
                                    </button>
                                </div>
                            ) : (
                                <div className="profile-fields">
                                    <div className="field-group">
                                        <label>
                                            <FiCalendar />
                                            {t("profile.fields.date_of_birth")}
                                        </label>
                                        {isEditing ? (
                                            <input
                                                type="date"
                                                name="date_of_birth"
                                                value={formData.date_of_birth}
                                                onChange={handleInputChange}
                                                className="form-input"
                                            />
                                        ) : (
                                            <span className="field-value">
                                                {profile?.date_of_birth
                                                    ? formatDate(profile.date_of_birth)
                                                    : t("profile.not_set")
                                                }
                                            </span>
                                        )}
                                    </div>

                                    <div className="field-group">
                                        <label>
                                            <FiMessageCircle />
                                            {t("profile.fields.preferred_contact")}
                                        </label>
                                        {isEditing ? (
                                            <select
                                                name="preferred_contact"
                                                value={formData.preferred_contact}
                                                onChange={handleInputChange}
                                                className="form-select"
                                            >
                                                <option value="email">{t("profile.contact_methods.email")}</option>
                                                <option value="phone">{t("profile.contact_methods.phone")}</option>
                                                <option value="chat">{t("profile.contact_methods.chat")}</option>
                                            </select>
                                        ) : (
                                            <span className="field-value">
                                                {t(`profile.contact_methods.${profile?.preferred_contact || 'chat'}`)}
                                            </span>
                                        )}
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
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Account Statistics */}
                    <div className="account-section">
                        <div className="section-header">
                            <h2>
                                <FiSettings />
                                {t("profile.sections.account_stats")}
                            </h2>
                        </div>
                        <div className="section-content">
                            <div className="stats-grid">
                                <div className="stat-item">
                                    <div className="stat-icon">
                                        <FiCalendar />
                                    </div>
                                    <div className="stat-info">
                                        <span className="stat-label">{t("profile.stats.member_since")}</span>
                                        <span className="stat-value">
                                            {formatDate(user?.date_joined)}
                                        </span>
                                    </div>
                                </div>
                                <div className="stat-item">
                                    <div className="stat-icon">
                                        <FiShield />
                                    </div>
                                    <div className="stat-info">
                                        <span className="stat-label">{t("profile.stats.verification")}</span>
                                        <span className={`stat-value ${user?.is_verified ? 'verified' : 'unverified'}`}>
                                            {user?.is_verified ? t("profile.verified") : t("profile.unverified")}
                                        </span>
                                    </div>
                                </div>
                                <div className="stat-item">
                                    <div className="stat-icon">
                                        <FiFlag />
                                    </div>
                                    <div className="stat-info">
                                        <span className="stat-label">{t("profile.stats.country")}</span>
                                        <span className="stat-value">
                                            {user?.country || t("profile.not_set")}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Profile Completion */}
                    <div className="account-section">
                        <div className="section-header">
                            <h2>
                                <FiCheck />
                                {t("profile.sections.completion")}
                            </h2>
                        </div>
                        <div className="section-content">
                            <div className="completion-info">
                                <div className="completion-bar">
                                    <div
                                        className="completion-fill"
                                        style={{ width: profile ? '80%' : '20%' }}
                                    ></div>
                                </div>
                                <p className="completion-text">
                                    {profile
                                        ? t("profile.completion.good")
                                        : t("profile.completion.incomplete")
                                    }
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserAccount;