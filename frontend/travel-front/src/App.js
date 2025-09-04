import React, { useState, useEffect, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';
import axios from "axios";
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

// API Configuration
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000/api/v1/";

const api = axios.create({
    baseURL: API_URL,
    headers: { "Content-Type": "application/json" },
    withCredentials: false,
});

// Token Interceptor
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`, {
        headers: config.headers,
        data: config.data,
    });
    return config;
});

// Token Refresh Interceptor
api.interceptors.response.use(
    (response) => {
        console.log(`API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
            status: response.status,
            data: response.data,
        });
        return response;
    },
    async (error) => {
        console.error(`API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message,
        });
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                const refreshToken = localStorage.getItem("refresh_token");
                if (!refreshToken) {
                    throw new Error("No refresh token available");
                }
                const refreshResponse = await api.post("token/refresh/", {
                    refresh: refreshToken,
                });
                const newAccessToken = refreshResponse.data.access_token || refreshResponse.data.access;
                localStorage.setItem("access_token", newAccessToken);
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                console.error("Token refresh failed:", refreshError);
                localStorage.removeItem("access_token");
                localStorage.removeItem("refresh_token");
                return Promise.reject(refreshError);
            }
        }
        let errorMessage = "Unknown error occurred";
        if (error.response?.data) {
            const data = error.response.data;
            errorMessage =
                data.detail ||
                data.message ||
                data.error ||
                (data.email && data.email[0]) ||
                (data.code && data.code[0]) ||
                (data.non_field_errors && data.non_field_errors[0]) ||
                JSON.stringify(data);
        } else if (error.message) {
            errorMessage = error.message;
        }
        return Promise.reject(new Error(errorMessage));
    }
);

// API Function for fetching current user
const getCurrentUser = async () => {
    console.log("Getting current user info...");
    try {
        const response = await api.get("auth/users/me/");
        return response.data;
    } catch (error) {
        console.error("Failed to fetch current user:", error);
        throw error;
    }
};

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
        <I18nextProvider i18n={i18n}>
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