import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import {
    UserProvider,
    RequireRole,
    DashboardRedirect,
    ROLE_GUIDE,
    ROLE_TOURIST,
} from "./context/UserContext";
import AuthPage from "./pages/AuthPage";

// Yangi importlar:
import BookingPage from "./pages/BookingPage";
import ChatPage from "./pages/ChatPage";
import SearchPage from "./pages/SearchPage";

import { ThemeProvider } from "./context/ThemeContext";
import { LanguageProvider } from "./context/LanguageContext";

import Navbar from "./components/Navbar";
import LandingPage from "./pages/LandingPage";
import TouristDashboard from "./pages/TouristDashboard";
import GuideDashboard from "./pages/GuideDashboard";
import Footer from "./components/Footer";

import GuideProfile from "./pages/GuideProfile";

/** Layout: dashboard yo‘llarida Footer ko‘rinmaydi */
function AppShell({ children }) {
    const location = useLocation();
    const isDashboard = location.pathname.startsWith("/dashboard");
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-dark-950 transition-colors">
            <Navbar />
            <main className="pt-16">{children}</main>
            <Toaster position="top-right" />
            {!isDashboard && <Footer />}
        </div>
    );
}

function AppRoutes() {
    return (
        <Routes>
            <Route path="/" element={<LandingPage />} />

            {/* Siz hozir combined komponentdan foydalangansiz: /search -> GuideProfile (listing + detail) */}
            <Route path="/search" element={<SearchPage />} />
            <Route path="/guides/:id" element={<GuideProfile />} />
            {/*<Route path="/booking/:id" element={<BookingPage />} />*/}


            {/* Auth */}
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/auth/tourist" element={<AuthPage userType="tourist" />} />
            <Route path="/auth/guide" element={<AuthPage userType="guide" />} />

            {/* Dashboard root */}
            <Route path="/dashboard" element={<DashboardRedirect />} />

            {/* Dashboardlar */}
            <Route
                path="/dashboard/guide"
                element={
                    <RequireRole roles={[ROLE_GUIDE]}>
                        <GuideDashboard />
                    </RequireRole>
                }
            />
            <Route
                path="/dashboard/tourist"
                element={
                    <RequireRole roles={[ROLE_TOURIST]}>
                        <TouristDashboard />
                    </RequireRole>
                }
            />

            {/* >>> Qo‘shimcha kerak bo‘ladigan route’lar <<< */}
            <Route
                path="/booking/:id"
                element={
                    <RequireRole roles={[ROLE_TOURIST]}>
                        <BookingPage />
                    </RequireRole>
                }
            />
            <Route
                path="/chat"
                element={
                    <RequireRole roles={[ROLE_GUIDE, ROLE_TOURIST]}>
                        <ChatPage />
                    </RequireRole>
                }
            />

            {/* 404 */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

export default function App() {
    return (
        <ThemeProvider>
            <LanguageProvider>
                <UserProvider>
                    <Router>
                        <AppShell>
                            <AppRoutes />
                        </AppShell>
                    </Router>
                </UserProvider>
            </LanguageProvider>
        </ThemeProvider>
    );
}