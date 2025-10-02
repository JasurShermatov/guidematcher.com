// src/api/auth.js
// Handles JWT login, refresh, verify, and Google auth.
// All are public (no token required for these).
// After successful login, store tokens: localStorage.setItem('access_token', response.data.access); etc.

import api from './api';

export const login = async (data) => {
    // POST /token/
    // Body fields for form:
    // - email: string (required, email format)
    // - password: string (required, min 8 chars, with digit/upper/lower as per validators)
    // Response: { access: string, refresh: string }
    // Auth: None (public)
    return api.post('token/', data);
};

export const refreshToken = async (data) => {
    // POST /token/refresh/
    // Body fields for form:
    // - refresh: string (required, your refresh token)
    // Response: { access: string }
    // Auth: None (public)
    return api.post('token/refresh/', data);
};

export const verifyToken = async (data) => {
    // POST /token/verify/
    // Body fields for form:
    // - token: string (required, access token to verify)
    // Response: {} (empty if valid)
    // Auth: None (public)
    return api.post('token/verify/', data);
};

export const googleLogin = async (data) => {
    // POST /auth/google/ (note: this is under /api/v1/auth/google/ but code has path("auth/google/") in users/urls.py, included in api_v1_patterns)
    // Body fields for form:
    // - id_token: string (required, Google OAuth ID token)
    // Response: { refresh: string, access: string }
    // Auth: None (public)
    // Validation: Backend verifies token; error if invalid/expired.
    return api.post('auth/google/', data);
};