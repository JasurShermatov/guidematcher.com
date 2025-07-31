import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import './App.css';
import Header from './components/common/Header';
import Footer from './components/common/Footer';
import HomePage from './pages/HomePage';
import Authentication from './auth/Authentication';
import UserAccount from './account/UserAccount';
import GuideAccount from './account/GuideAccount';
import FindGuide from './menues/FindGuide'; // Yangi FindGuide komponenti import qilindi
import { getCurrentUser } from './api/api';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  // Check authentication status on page load
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
            username: userData.full_name,
            email: userData.email,
            first_name: userData.first_name,
            last_name: userData.last_name,
            country: userData.country_name || "",
            city: userData.city || "",
          });
        } catch (error) {
          console.error("Failed to fetch user:", error);
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          setIsAuthenticated(false);
        }
      }
    };
    checkAuth();
  }, []);

  // Account component based on user role
  const AccountComponent = () => {
    if (!isAuthenticated || !user) return <HomePage />;
    // Render GuideAccount for Customer role, UserAccount for Client role
    return user.role === 'Customer' ? (
      <GuideAccount user={user} setIsAuthenticated={setIsAuthenticated} setUser={setUser} />
    ) : (
      <UserAccount user={user} setIsAuthenticated={setIsAuthenticated} setUser={setUser} />
    );
  };

  return (
    <BrowserRouter>
      <div className="App">
        <Header isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated} user={user} setUser={setUser} />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<Authentication setIsAuthenticated={setIsAuthenticated} setUser={setUser} />} />
            <Route path="/account" element={<AccountComponent />} />
            <Route path="/find-guides" element={<FindGuide user={user} />} /> {/* Yangi marshrut */}
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;