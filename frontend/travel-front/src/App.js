import React, { useState, useEffect, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { I18nextProvider } from 'react-i18next'; // Import I18nextProvider
import i18n from './i18n'; // Import the i18next instance
import "./App.css";
import Header from "./components/common/Header";
import Footer from "./components/common/Footer";
import HomePage from "./pages/HomePage";
import Authentication from "./auth/Authentication";
import UserAccount from "./account/UserAccount";
import GuideAccount from "./account/GuideAccount";
import FindGuide from "./menues/FindGuide";
import ProtectedRoute from "./components/common/ProtectedRoute";
import DebugHelper from "./components/common/DebugHelper";
import { getCurrentUser } from "./api/api";

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authChecked, setAuthChecked] = useState(false);

    useEffect(() => {
        checkAuth();
    }, []);

    useEffect(() => {
        if (isAuthenticated && user) {
            localStorage.setItem("user_data", JSON.stringify(user));
        }
    }, [isAuthenticated, user]);

    const checkAuth = async () => {
        const token = localStorage.getItem("access_token");
        if (token) {
            let savedUserData = null;
            let previousRole = null;

            try {
                console.log("Checking authentication...");
                savedUserData = localStorage.getItem("user_data");
                if (savedUserData) {
                    try {
                        const parsedUser = JSON.parse(savedUserData);
                        console.log("User data from localStorage:", parsedUser);
                        setUser(parsedUser);
                        setIsAuthenticated(true);
                        previousRole = parsedUser.role;
                    } catch (e) {
                        console.error("Error parsing saved user data:", e);
                        localStorage.removeItem("user_data");
                        savedUserData = null;
                    }
                }

                const userData = await getCurrentUser();
                console.log("Fresh user data from server:", userData);

                const normalizedUser = {
                    id: userData.id,
                    role: userData.role || previousRole || "Client",
                    username: userData.username || userData.full_name || `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || "User",
                    email: userData.email,
                    first_name: userData.first_name || "",
                    last_name: userData.last_name || "",
                    full_name: userData.full_name || `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || "",
                    country: userData.country?.name || userData.country || "",
                    country_name: userData.country_name || userData.country?.name || "",
                    city: userData.city || "",
                    avatar: userData.avatar || null,
                    profile_id: userData.profile_id || null,
                    is_verified: userData.is_verified || false,
                    date_joined: userData.date_joined || null,
                };

                console.log("Normalized user data:", normalizedUser);
                setIsAuthenticated(true);
                setUser(normalizedUser);
            } catch (error) {
                console.error("Failed to fetch user:", error);
                if (savedUserData && previousRole) {
                    console.log("Using cached user data due to server error");
                    try {
                        const parsedUser = JSON.parse(savedUserData);
                        setIsAuthenticated(true);
                        setUser(parsedUser);
                    } catch (parseError) {
                        console.error("Error parsing cached user data:", parseError);
                        localStorage.removeItem("access_token");
                        localStorage.removeItem("refresh_token");
                        localStorage.removeItem("user_data");
                        setIsAuthenticated(false);
                        setUser(null);
                    }
                } else {
                    localStorage.removeItem("access_token");
                    localStorage.removeItem("refresh_token");
                    localStorage.removeItem("user_data");
                    setIsAuthenticated(false);
                    setUser(null);
                }
            }
        } else {
            setIsAuthenticated(false);
            setUser(null);
            localStorage.removeItem("user_data");
        }

        setLoading(false);
        setAuthChecked(true);
    };

    const updateAuthState = (authStatus, userData = null) => {
        console.log("Updating auth state:", { authStatus, userData });
        setIsAuthenticated(authStatus);
        setUser(userData);

        if (authStatus && userData) {
            // Authenticated state, user data is saved via useEffect
        } else {
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            localStorage.removeItem("user_data");
            localStorage.removeItem("userAccount_isEditing");
            localStorage.removeItem("userAccount_formData");
            localStorage.removeItem("guideAccount_isEditing");
            localStorage.removeItem("guideAccount_activeTab");
            localStorage.removeItem("guideAccount_formData");
            localStorage.removeItem("guideAccount_portfolioForm");
            localStorage.removeItem("guideAccount_editingPortfolio");
            localStorage.removeItem("guideAccount_availabilityForm");
            localStorage.removeItem("guideAccount_editingAvailability");
            localStorage.removeItem("guideAccount_documentForm");
        }
    };

    const AccountComponent = () => {
        if (!user) {
            console.log("No user data available");
            return (
                <div className="account-loading">
                    <div className="loading-spinner"></div>
                    <p>Loading user data...</p>
                </div>
            );
        }

        console.log("Rendering account component for user:", user);
        console.log("User role:", user.role);

        const userRole = user.role?.toLowerCase();
        if (userRole === "customer") {
            console.log("Rendering GuideAccount for role:", userRole);
            return (
                <GuideAccount
                    user={user}
                    setIsAuthenticated={(status) => updateAuthState(status, status ? user : null)}
                    setUser={setUser}
                />
            );
        } else if (userRole === "client") {
            console.log("Rendering UserAccount for role:", userRole);
            return (
                <UserAccount
                    user={user}
                    setIsAuthenticated={(status) => updateAuthState(status, status ? user : null)}
                    setUser={setUser}
                />
            );
        } else {
            console.log("Unknown role, defaulting to UserAccount:", user.role);
            return (
                <UserAccount
                    user={user}
                    setIsAuthenticated={(status) => updateAuthState(status, status ? user : null)}
                    setUser={setUser}
                />
            );
        }
    };

    if (loading || !authChecked) {
        return (
            <div className="app-loading">
                <div className="app-loading-container">
                    <div className="loading-spinner"></div>
                    <p>Loading application...</p>
                </div>
            </div>
        );
    }

    return (
        <I18nextProvider i18n={i18n}> {/* Wrap with I18nextProvider */}
            <Suspense
                fallback={
                    <div className="app-loading">
                        <div className="loading-spinner"></div>
                        <p>Loading...</p>
                    </div>
                }
            >
                <BrowserRouter>
                    <div className="App">
                        <Header
                            isAuthenticated={isAuthenticated}
                            setIsAuthenticated={setIsAuthenticated}
                            user={user}
                            setUser={setUser}
                            updateAuthState={updateAuthState}
                        />
                        <main className="main-content">
                            <Routes>
                                <Route path="/" element={<HomePage />} />
                                <Route
                                    path="/login"
                                    element={
                                        isAuthenticated ? (
                                            <Navigate to="/account" replace />
                                        ) : (
                                            <Authentication
                                                setIsAuthenticated={setIsAuthenticated}
                                                setUser={setUser}
                                            />
                                        )
                                    }
                                />
                                <Route
                                    path="/register"
                                    element={
                                        isAuthenticated ? (
                                            <Navigate to="/account" replace />
                                        ) : (
                                            <Authentication
                                                setIsAuthenticated={setIsAuthenticated}
                                                setUser={setUser}
                                            />
                                        )
                                    }
                                />
                                <Route
                                    path="/account"
                                    element={
                                        <ProtectedRoute isAuthenticated={isAuthenticated}>
                                            <AccountComponent />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/user-account"
                                    element={
                                        <ProtectedRoute isAuthenticated={isAuthenticated}>
                                            <Navigate to="/account" replace />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/admin-account"
                                    element={
                                        <ProtectedRoute isAuthenticated={isAuthenticated}>
                                            <Navigate to="/account" replace />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/find-guides"
                                    element={<FindGuide user={user} />}
                                />
                                <Route path="*" element={<Navigate to="/" replace />} />
                            </Routes>
                        </main>
                        <Footer />
                        {process.env.NODE_ENV === 'development' && (
                            <DebugHelper user={user} isAuthenticated={isAuthenticated} />
                        )}
                    </div>
                </BrowserRouter>
            </Suspense>
        </I18nextProvider>
    );
}

export default App;