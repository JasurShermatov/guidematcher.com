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

import { ThemeProvider } from "./context/ThemeContext";
import { LanguageProvider } from "./context/LanguageContext";

import Navbar from "./components/Navbar";
import LandingPage from "./pages/LandingPage";
import TouristDashboard from "./pages/TouristDashboard";
import GuideDashboard from "./pages/GuideDashboard";
import Footer from "./components/Footer";

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

            {/* Auth (forgot/reset ham AuthPage ichida) */}
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/auth/tourist" element={<AuthPage userType="tourist" />} />
            <Route path="/auth/guide" element={<AuthPage userType="guide" />} />

            {/* Dashboard root -> rolga qarab */}
            <Route path="/dashboard" element={<DashboardRedirect />} />

            {/* Element-level guardlar */}
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
