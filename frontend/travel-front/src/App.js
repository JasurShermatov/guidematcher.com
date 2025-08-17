import React, { useState, useEffect, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";
import Header from "./components/common/Header";
import Footer from "./components/common/Footer";
import HomePage from "./pages/HomePage";
import Authentication from "./auth/Authentication";
import UserAccount from "./account/UserAccount";
import GuideAccount from "./account/GuideAccount";
import FindGuide from "./menues/FindGuide";
import ProtectedRoute from "./components/common/ProtectedRoute";
import { getCurrentUser } from "./api/api";

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null);

    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem("access_token");
            if (token) {
                try {
                    const userData = await getCurrentUser();
                    setIsAuthenticated(true);
                    setUser({
                        id: userData.id,
                        role: userData.role,
                        username: `${userData.first_name} ${userData.last_name}`,
                        email: userData.email,
                        first_name: userData.first_name,
                        last_name: userData.last_name,
                        country: userData.country?.name || userData.country || "",
                        city: userData.city || "",
                    });
                } catch (error) {
                    console.error("Failed to fetch user:", error);
                    localStorage.removeItem("access_token");
                    localStorage.removeItem("refresh_token");
                    setIsAuthenticated(false);
                    setUser(null);
                }
            } else {
                setIsAuthenticated(false);
                setUser(null);
            }
        };
        checkAuth();
    }, []);

    const AccountComponent = () => {
        if (!user) return null;

        // Role ga qarab to'g'ri component'ni qaytarish
        if (user.role === "Customer" || user.role === "Guide") {
            return <GuideAccount user={user} setIsAuthenticated={setIsAuthenticated} setUser={setUser} />;
        } else {
            return <UserAccount user={user} setIsAuthenticated={setIsAuthenticated} setUser={setUser} />;
        }
    };

    return (
        <Suspense fallback={<div>Loading...</div>}>
            <BrowserRouter>
                <div className="App">
                    <Header
                        isAuthenticated={isAuthenticated}
                        setIsAuthenticated={setIsAuthenticated}
                        user={user}
                        setUser={setUser}
                    />
                    <main className="main-content">
                        <Routes>
                            <Route path="/" element={<HomePage />} />
                            <Route
                                path="/login"
                                element={<Authentication setIsAuthenticated={setIsAuthenticated} setUser={setUser} />}
                            />
                            <Route
                                path="/account"
                                element={
                                    <ProtectedRoute isAuthenticated={isAuthenticated}>
                                        <AccountComponent />
                                    </ProtectedRoute>
                                }
                            />
                            <Route path="/find-guides" element={<FindGuide user={user} />} />
                        </Routes>
                    </main>
                    <Footer />
                </div>
            </BrowserRouter>
        </Suspense>
    );
}

export default App;