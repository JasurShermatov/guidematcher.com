import React, { useState, useEffect, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
import { getCurrentUserShort } from "./api/api";

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authChecked, setAuthChecked] = useState(false);

    useEffect(() => {
        checkAuth();
    }, []);

    // Add this useEffect to persist user data (including role) to localStorage whenever user changes
    useEffect(() => {
        if (isAuthenticated && user) {
            localStorage.setItem("user_data", JSON.stringify(user));
        }
    }, [isAuthenticated, user]);

    const checkAuth = async () => {
        const token = localStorage.getItem("access_token");

        if (token) {
            try {
                console.log("Checking authentication...");

                // Avval localStorage'dan user ma'lumotlarini yuklash
                const savedUserData = localStorage.getItem("user_data");
                let previousRole = null;
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
                    }
                }

                // Server'dan fresh ma'lumotlarni olish
                const userData = await getCurrentUserShort();
                console.log("Fresh user data from server:", userData);

                // User ma'lumotlarini normalize qilish
                const normalizedUser = {
                    id: userData.id,
                    role: userData.role || previousRole || "Client",
                    username: userData.username || userData.full_name || `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || "User",
                    email: userData.email,
                    first_name: userData.first_name || "",
                    last_name: userData.last_name || "",
                    full_name: userData.full_name || `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || "",
                    country: userData.country?.name || userData.country || "",
                    city: userData.city || "",
                    avatar: userData.avatar || null,
                    profile_id: userData.profile_id || null,
                    is_verified: userData.is_verified || false,
                    date_joined: userData.date_joined || null
                };

                console.log("Normalized user data:", normalizedUser);

                setIsAuthenticated(true);
                setUser(normalizedUser);

                // Fresh ma'lumotlarni localStorage'ga saqlash (useEffect orqali avtomatik saqlanadi)
            } catch (error) {
                console.error("Failed to fetch user:", error);
                // Noto'g'ri tokenlarni tozalash
                localStorage.removeItem("access_token");
                localStorage.removeItem("refresh_token");
                localStorage.removeItem("user_data");
                setIsAuthenticated(false);
                setUser(null);
            }
        } else {
            setIsAuthenticated(false);
            setUser(null);
            localStorage.removeItem("user_data");
        }

        setLoading(false);
        setAuthChecked(true);
    };

    // Authentication holatini yangilash funksiyasi
    const updateAuthState = (authStatus, userData = null) => {
        console.log("Updating auth state:", { authStatus, userData });
        setIsAuthenticated(authStatus);
        setUser(userData);

        if (authStatus && userData) {
            // Authenticated holatida user ma'lumotlarini saqlash (useEffect orqali avtomatik)
        } else {
            // Logout holatida barcha ma'lumotlarni tozalash
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            localStorage.removeItem("user_data");
            // Account-specific localStorage'larni ham tozalash
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

        // Role ga qarab to'g'ri component'ni qaytarish
        const userRole = user.role?.toLowerCase();

        // Customer va Guide rollarini aniqroq aniqlash
        if (userRole === "customer" || userRole === "guide") {
            console.log("Rendering GuideAccount for role:", userRole);
            return (
                <GuideAccount
                    user={user}
                    setIsAuthenticated={(status) => updateAuthState(status, status ? user : null)}
                    setUser={setUser}
                />
            );
        } else if (userRole === "client" || userRole === "user" || !userRole) {
            console.log("Rendering UserAccount for role:", userRole);
            return (
                <UserAccount
                    user={user}
                    setIsAuthenticated={(status) => updateAuthState(status, status ? user : null)}
                    setUser={setUser}
                />
            );
        } else {
            // Default case - Client sifatida qaraymiz
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

    // Loading holatida
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
        <Suspense fallback={
            <div className="app-loading">
                <div className="loading-spinner"></div>
                <p>Loading...</p>
            </div>
        }>
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

                            {/* Authentication route - agar authenticated bo'lsa account'ga yo'naltirish */}
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

                            {/* Main account route */}
                            <Route
                                path="/account"
                                element={
                                    <ProtectedRoute isAuthenticated={isAuthenticated}>
                                        <AccountComponent />
                                    </ProtectedRoute>
                                }
                            />

                            {/* Role-specific routes - yo'naltirish uchun */}
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

                            {/* Find guides route */}
                            <Route
                                path="/find-guides"
                                element={<FindGuide user={user} />}
                            />

                            {/* 404 yo'naltirish */}
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </main>
                    <Footer />

                    {/* Debug Helper - faqat development da ko'rsatish */}
                    {process.env.NODE_ENV === 'development' && (
                        <DebugHelper user={user} isAuthenticated={isAuthenticated} />
                    )}
                </div>
            </BrowserRouter>
        </Suspense>
    );
}

export default App;