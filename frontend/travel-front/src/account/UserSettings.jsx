import React, { useState, useEffect } from 'react';
import { FiX, FiMail, FiUser, FiSave } from 'react-icons/fi';
import './UserSettings.css';

const UserSettings = ({ user, setUser, onClose }) => {
  const [form, setForm] = useState({ email: user?.email || '', username: user?.username || '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.email || !form.username) {
      setError('Please fill in all fields');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('Please enter a valid email address');
      return;
    }
    setIsLoading(true);
    // Mock update user data
    setTimeout(() => {
      setUser({ ...user, email: form.email, username: form.username });
      setIsLoading(false);
      onClose();
    }, 500);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="settings-overlay" onClick={onClose} role="dialog" aria-labelledby="settings-title" aria-modal="true">
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <button className="settings-close-btn" onClick={onClose} aria-label="Close settings modal">
          <FiX />
        </button>
        <div className="settings-content">
          <h2 id="settings-title">Edit Your TravMatch Profile</h2>
          {error && <p className="settings-error">{error}</p>}
          <form className="settings-form" onSubmit={handleSubmit}>
            <div className="settings-form-group">
              <label htmlFor="settings-email">
                <FiMail /> Email
              </label>
              <input
                id="settings-email"
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="Enter your email"
                className="settings-input"
                aria-required="true"
                disabled={isLoading}
              />
            </div>
            <div className="settings-form-group">
              <label htmlFor="settings-username">
                <FiUser /> Username
              </label>
              <input
                id="settings-username"
                type="text"
                name="username"
                value={form.username}
                onChange={handleChange}
                placeholder="Enter your username"
                className="settings-input"
                aria-required="true"
                disabled={isLoading}
              />
            </div>
            <div className="settings-form-actions">
              <button type="submit" className="settings-submit-btn" disabled={isLoading}>
                <FiSave /> {isLoading ? 'Saving...' : 'Save'}
              </button>
              <button type="button" className="settings-cancel-btn" onClick={onClose} disabled={isLoading}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UserSettings;