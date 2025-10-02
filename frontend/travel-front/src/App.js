import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import {
    UserProvider,
    RequireRole,
    DashboardRedirect,
    ROLE_GUIDE,
    ROLE_TOURIST,
} from "./context/UserContext";

import { ThemeProvider } from "./context/ThemeContext";
import { LanguageProvider } from "./context/LanguageContext";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

/** === LAZY PAGES (route-based code splitting) === */
const LandingPage = lazy(() => import("./pages/LandingPage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const BookingPage = lazy(() => import("./pages/BookingPage"));
const ChatPage = lazy(() => import("./pages/ChatPage"));
const TouristDashboard = lazy(() => import("./pages/TouristDashboard"));
const GuideDashboard = lazy(() => import("./pages/GuideDashboard"));
const GuideProfile = lazy(() => import("./pages/GuideProfile"));

function AppShell({ children }) {
    const location = useLocation();
    const isDashboard = location.pathname.startsWith("/dashboard");
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-dark-950 transition-colors">
            <Navbar />
            <main className="pt-16">
                <Suspense fallback={<div className="p-8 text-center text-gray-600">Loading…</div>}>
                    {children}
                </Suspense>
            </main>
            <Toaster position="top-right" />
            {!isDashboard && <Footer />}
        </div>
    );
}

function AppRoutes() {
    return (
        <Routes>
            <Route path="/" element={<LandingPage />} />

            {/* Bitta komponent: /guides (qidiruv) va /guides/:id (profil) */}
            <Route path="/guides" element={<GuideProfile />} />
            <Route path="/guides/:id" element={<GuideProfile />} />

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
