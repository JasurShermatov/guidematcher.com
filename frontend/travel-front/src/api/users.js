// src/api/users.js
// Handles users CRUD and profiles.
// Permissions: List/retrieve public for some; create/update/delete require auth and owner/admin.
// IDs are UUIDs (strings).

import api from './api';

export const getUsers = async (params) => {
    // GET /users/
    // Query params:
    // - page: integer (optional, pagination)
    // - page_size: integer (optional, default 20)
    // Response: Paginated list of users { count, next, previous, results: [...] }
    // Each result fields: id (uuid), email, first_name, last_name, full_name, avatar (url or null), bio, role (client/customer/admin/superadmin), is_verified (bool), country (uuid or null), country_name, date_joined, profile_id (uuid or null)
    // Auth: Required (token)
    return api.get('users/', { params });
};

export const getUser = async (id) => {
    // GET /users/{id}/ or /users/me/ (use 'me' for current user)
    // Path params: id (uuid string or 'me')
    // Response: User details (same fields as list)
    // Auth: Required (token)
    return api.get(`users/${id}/`);
};

export const createUser = async (data) => {
    // POST /users/
    // Body fields for form (from RegisterSerializer):
    // - email: string (required, unique email)
    // - first_name: string (required)
    // - last_name: string (required)
    // - password: string (required, validated: min 8, digit, upper, lower)
    // - role: string (required, 'client' or 'customer' lowercase)
    // - country: uuid (optional, country ID)
    // Response: Created user (id, email, first_name, last_name, role, country, profile_id)
    // Auth: Required (token, admin only likely)
    // Note: Triggers profile creation signal (ClientProfile or CustomerProfile based on role)
    return api.post('users/', data);
};

export const updateUser = async (id, data) => {
    // PUT /users/{id}/ (full update)
    // Path params: id (uuid or 'me')
    // Body fields for form (from ProfileSerializer, read_only: id, email, role, is_verified, full_name, country_name, date_joined, profile_id):
    // - first_name: string (optional)
    // - last_name: string (optional)
    // - avatar: file (optional, image: jpeg/png/gif, <5MB)
    // - bio: string (optional)
    // - country: uuid (optional)
    // Response: Updated user
    // Auth: Required (token, owner or admin)
    return api.put(`users/${id}/`, data);
};

export const partialUpdateUser = async (id, data) => {
    // PATCH /users/{id}/ (partial update)
    // Same as PUT, but fields optional.
    // Auth: Required (token, owner or admin)
    return api.patch(`users/${id}/`, data);
};

export const deleteUser = async (id) => {
    // DELETE /users/{id}/
    // Path params: id (uuid)
    // Response: 204 No Content
    // Auth: Required (token, admin only)
    return api.delete(`users/${id}/`);
};

export const getShortUser = async () => {
    // GET /users/short/ (logged-in user's short info)
    // Response: { id: uuid, full_name: string, avatar: url or null }
    // Auth: Required (token)
    return api.get('users/short/');
};

export const getCustomerDetail = async (id) => {
    // GET /profiles/customers/{id}/ (customer profile by UUID)
    // Path params: id (uuid)
    // Response: User details with profile (same as getUser)
    // Auth: Required (token, admin or own if customer)
    return api.get(`profiles/customers/${id}/`);
};

/** ---------------------------------------------------------
 *  NEW: Backend’dagi "me" endpointlari: /auth/users/me/
 *  Eslatma: /users/me/ yo‘q, 404 beradi. Shuning uchun
 *  joriy foydalanuvchini olish/ozgartirish uchun shularni ishlating.
 * --------------------------------------------------------- */

export const getMe = async () => api.get('auth/users/me/');
export const patchMe = async (data) =>
    api.patch('auth/users/me/', data, { headers: { 'Content-Type': 'application/json' } });
