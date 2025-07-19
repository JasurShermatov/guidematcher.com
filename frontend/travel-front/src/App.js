import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useState } from 'react';
import './App.css';
import Header from './components/common/Header';
import Footer from './components/common/Footer';
import HomePage from './pages/HomePage';
import PopularDestination from './pages/PopularDestination';
import FindGuide from './menues/FindGuide';
import Authentication from './auth/Authentication';
import UserAccount from './account/UserAccount';
import GuideAccount from './account/GuideAccount';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  // Determine which account component to render based on user.role
  const AccountComponent = () => {
    if (!isAuthenticated || !user) return <HomePage />;
    if (user.role === 'Client') return <UserAccount user={user} setIsAuthenticated={setIsAuthenticated} />;
    if (user.role === 'Customer') return <GuideAccount user={user} setUser={setUser} setIsAuthenticated={setIsAuthenticated} />;
    return <HomePage />;
  };

  return (
    <BrowserRouter>
      <div className="App">
        <Header isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated} setUser={setUser} />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<AccountComponent />} />
            <Route path="/find-guides" element={<FindGuide isAuthenticated={isAuthenticated} />} />
            <Route path="/popular-destinations" element={<PopularDestination />} />
            <Route path="/login" element={<Authentication setIsAuthenticated={setIsAuthenticated} setUser={setUser} />} />
            <Route path="/account" element={<AccountComponent />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;