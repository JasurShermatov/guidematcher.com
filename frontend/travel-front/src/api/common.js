// src/api/common.js
// Handles countries, cities, languages, service-types.
// Mostly public reads; admin for writes (permissions: ReadOnlyOrAdmin).
// IDs are UUIDs (strings).

import api from './api';

export const getCountries = async (params) => {
    // GET /common/countries/
    // Query params: search (name/code), ordering (name)
    // Response: List { id (uuid), code (2 chars), name, flag (emoji), is_active (bool), created_at, updated_at }
    // Auth: None (public, active only; admin sees all)
    return api.get('common/countries/', { params });
};

export const createCountry = async (data) => {
    // POST /common/countries/
    // Body fields for form (from CountrySerializer):
    // - code: string (required, 2 chars uppercase, unique)
    // - name: string (required)
    // - flag: string (optional, emoji)
    // - is_active: bool (optional, default true)
    // Response: Created { id, code, name, flag, is_active, created_at, updated_at }
    // Auth: Required (token, admin only)
    return api.post('common/countries/', data);
};

export const getCountry = async (id) => {
    // GET /common/countries/{id}/
    // Path params: id (uuid)
    // Response: Details
    // Auth: None (public if active)
    return api.get(`common/countries/${id}/`);
};

export const updateCountry = async (id, data) => {
    // PUT /common/countries/{id}/ (full update)
    // Body: Same as create
    // Auth: Required (admin)
    return api.put(`common/countries/${id}/`, data);
};

export const partialUpdateCountry = async (id, data) => {
    // PATCH /common/countries/{id}/ (partial)
    // Body: Partial fields
    // Auth: Required (admin)
    return api.patch(`common/countries/${id}/`, data);
};

export const deleteCountry = async (id) => {
    // DELETE /common/countries/{id}/
    // Response: 204
    // Auth: Required (admin)
    return api.delete(`common/countries/${id}/`);
};

export const getCities = async (params) => {
    // GET /common/cities/
    // Query params: country (uuid), search (name/country name/code), ordering (name)
    // Response: List { id (uuid), name, country (full: id, code, name, flag, is_active, created_at, updated_at), is_active, created_at, updated_at }
    // Auth: None
    return api.get('common/cities/', { params });
};

export const createCity = async (data) => {
    // POST /common/cities/
    // Body fields (from CitySerializer):
    // - country: uuid (required)
    // - name: string (required, unique per country)
    // - is_active: bool (optional, default true)
    // Response: Created
    // Auth: Required (admin)
    return api.post('common/cities/', data);
};

export const getCity = async (id) => {
    // GET /common/cities/{id}/
    // Response: Details
    // Auth: None
    return api.get(`common/cities/${id}/`);
};

export const updateCity = async (id, data) => {
    // PUT /common/cities/{id}/
    // Body: Same
    // Auth: Required (admin)
    return api.put(`common/cities/${id}/`, data);
};

export const partialUpdateCity = async (id, data) => {
    // PATCH /common/cities/{id}/
    // Auth: Required (admin)
    return api.patch(`common/cities/${id}/`, data);
};

export const deleteCity = async (id) => {
    // DELETE /common/cities/{id}/
    // Auth: Required (admin)
    return api.delete(`common/cities/${id}/`);
};

export const getLanguages = async (params) => {
    // GET /common/languages/
    // Query params: search (name/code/native_name), ordering (name)
    // Response: List { id (uuid), code (5 chars), name, native_name, is_active, created_at, updated_at }
    // Auth: None
    return api.get('common/languages/', { params });
};

export const createLanguage = async (data) => {
    // POST /common/languages/
    // Body:
    // - code: string (required, 5 chars lowercase, unique)
    // - name: string (required)
    // - native_name: string (optional)
    // - is_active: bool (optional, default true)
    // Auth: Required (admin)
    return api.post('common/languages/', data);
};

export const getLanguage = async (id) => {
    // GET /common/languages/{id}/
    // Auth: None
    return api.get(`common/languages/${id}/`);
};

export const updateLanguage = async (id, data) => {
    // PUT /common/languages/{id}/
    // Auth: Required (admin)
    return api.put(`common/languages/${id}/`, data);
};

export const partialUpdateLanguage = async (id, data) => {
    // PATCH /common/languages/{id}/
    // Auth: Required (admin)
    return api.patch(`common/languages/${id}/`, data);
};

export const deleteLanguage = async (id) => {
    // DELETE /common/languages/{id}/
    // Auth: Required (admin)
    return api.delete(`common/languages/${id}/`);
};

export const getServiceTypes = async (params) => {
    // GET /common/service-types/
    // Query params: search (name/description), ordering (order/name)
    // Response: List { id (uuid), name, description, icon (string), order (int), is_active, created_at, updated_at }
    // Auth: None
    return api.get('common/service-types/', { params });
};

export const createServiceType = async (data) => {
    // POST /common/service-types/
    // Body:
    // - name: string (required, unique)
    // - description: string (optional)
    // - icon: string (optional)
    // - order: int (optional, default 0)
    // - is_active: bool (optional, default true)
    // Auth: Required (admin)
    return api.post('common/service-types/', data);
};

export const getServiceType = async (id) => {
    // GET /common/service-types/{id}/
    // Auth: None
    return api.get(`common/service-types/${id}/`);
};

export const updateServiceType = async (id, data) => {
    // PUT /common/service-types/{id}/
    // Auth: Required (admin)
    return api.put(`common/service-types/${id}/`, data);
};

export const partialUpdateServiceType = async (id, data) => {
    // PATCH /common/service-types/{id}/
    // Auth: Required (admin)
    return api.patch(`common/service-types/${id}/`, data);
};

export const deleteServiceType = async (id) => {
    // DELETE /common/service-types/{id}/
    // Auth: Required (admin)
    return api.delete(`common/service-types/${id}/`);
};