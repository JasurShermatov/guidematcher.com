// src/api/profiles.js
// Handles client/customer profiles, portfolio, verification docs, unavailability.
// IDs are UUIDs (user_id for profiles is user UUID).
// Avatar handling: Multipart form for uploads.

import api from './api';

export const getClients = async (params) => {
    return api.get('profiles/clients/', { params });
};

export const getClient = async (userId) => {
    return api.get(`profiles/clients/${userId}/`);
};

export const createClient = async (data) => {
    return api.post('profiles/clients/', data);
};

export const updateClient = async (userId, data) => {
    return api.put(`profiles/clients/${userId}/`, data);
};

export const partialUpdateClient = async (userId, data) => {
    return api.patch(`profiles/clients/${userId}/`, data);
};

export const getMyClientProfile = async () => {
    return api.get('profiles/clients/my/');
};

export const updateMyClientProfile = async (data) => {
    return api.put('profiles/clients/my/', data);
};

export const getClientAvatar = async (userId) => {
    return api.get(`profiles/clients/${userId}/avatar/`);
};

export const uploadClientAvatar = async (userId, formData) => {
    return api.put(`profiles/clients/${userId}/avatar/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
};

export const deleteClientAvatar = async (userId) => {
    return api.delete(`profiles/clients/${userId}/avatar/`);
};

// Customers
export const getCustomers = async (params) => {
    // Filter fix: qo'shimcha params qo'llab-quvvatlash
    return api.get('profiles/customers/', { params });
};

async function _tryGet(url, config) {
    try {
        const { data } = await api.get(url, config);
        return data ?? null;
    } catch {
        return null;
    }
}

export const getCustomer = async (idLike) => {
    const s = String(idLike);

    let data = await _tryGet(`profiles/customers/${encodeURIComponent(s)}/`);
    if (!data) data = await _tryGet(`profiles/customers/by-user/${encodeURIComponent(s)}/`);
    if (!data) data = await _tryGet(`profiles/customers/resolve/`, { params: { user: s } });

    return data;
};

export const createCustomer = async (data) => {
    return api.post('profiles/customers/', data);
};

export const updateCustomer = async (userId, data) => {
    return api.put(`profiles/customers/${userId}/`, data);
};

export const partialUpdateCustomer = async (userId, data) => {
    return api.patch(`profiles/customers/${userId}/`, data);
};

export const getMyCustomerProfile = async () => {
    return api.get('profiles/customers/my/');
};

// src/api/profiles.js
export const updateMyCustomerProfile = async (data) => {
    // Fayl yo‘q bo‘lsa JSON yuboramiz — bo‘sh array (masalan, languages: []) ham to‘g‘ri ketadi
    const hasFile =
        data instanceof FormData ||
        Object.values(data || {}).some(
            (v) => v instanceof File || v instanceof Blob
        );

    // JSON branch (eng barqaror: arrays va primitivlar to‘g‘ri ketadi)
    if (!hasFile && !(data instanceof FormData)) {
        return api.patch("profiles/customers/my/", data, {
            headers: { "Content-Type": "application/json" },
        });
    }

    // Multipart branch (fayl bo‘lsa yoki FormData berilgan bo‘lsa)
    const form =
        data instanceof FormData
            ? data
            : (() => {
                const f = new FormData();
                Object.entries(data || {}).forEach(([k, v]) => {
                    if (Array.isArray(v)) {
                        // DRF ko‘pincha bir xil kalitni takror-takror qabul qiladi:
                        // languages=1&languages=2&...
                        v.forEach((item) => f.append(k, item));
                    } else if (v !== undefined && v !== null) {
                        f.append(k, v);
                    }
                });
                return f;
            })();

    return api.patch("profiles/customers/my/", form);
};


// Portfolio
export const getPortfolios = async (params) => {
    return api.get('profiles/portfolio/', { params });
};

export const getPortfolio = async (id) => {
    return api.get(`profiles/portfolio/${id}/`);
};

export const createPortfolio = async (formData) => {
    return api.post('profiles/portfolio/', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
};

export const updatePortfolio = async (id, formData) => {
    return api.put(`profiles/portfolio/${id}/`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
};

export const partialUpdatePortfolio = async (id, formData) => {
    return api.patch(`profiles/portfolio/${id}/`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
};

export const deletePortfolio = async (id) => {
    return api.delete(`profiles/portfolio/${id}/`);
};

export const getMyPortfolios = async () => {
    return api.get('profiles/portfolio/my/');
};

// Verification Docs
export const getVerificationDocs = async (params) => {
    return api.get('profiles/verification-docs/', { params });
};

export const getVerificationDoc = async (id) => {
    return api.get(`profiles/verification-docs/${id}/`);
};

export const createVerificationDoc = async (formData) => {
    return api.post('profiles/verification-docs/', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
};

export const updateVerificationDoc = async (id, formData) => {
    return api.put(`profiles/verification-docs/${id}/`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
};

export const deleteVerificationDoc = async (id) => {
    return api.delete(`profiles/verification-docs/${id}/`);
};

export const getMyVerificationDocs = async () => {
    return api.get('profiles/verification-docs/my/');
};

// Unavailability
export const getUnavailabilities = async (params) => {
    return api.get('profiles/unavailability/', { params });
};

export const getUnavailability = async (id) => {
    return api.get(`profiles/unavailability/${id}/`);
};

export const createUnavailability = async (data) => {
    return api.post('profiles/unavailability/', data);
};

export const updateUnavailability = async (id, data) => {
    return api.put(`profiles/unavailability/${id}/`, data);
};

export const deleteUnavailability = async (id) => {
    return api.delete(`profiles/unavailability/${id}/`);
};

export const getMyUnavailabilities = async () => {
    return api.get('profiles/unavailability/my/');
};

// Avatars
export const getMyCustomerAvatar = async () => {
    return api.get(`profiles/customers/my/avatar/`);
};

export const uploadMyCustomerAvatar = async (fileOrFormData) => {
    const form = fileOrFormData instanceof FormData ? fileOrFormData : new FormData();
    if (!(fileOrFormData instanceof FormData)) form.append("avatar", fileOrFormData);
    return api.put("profiles/customers/my/avatar/", form, {
        headers: { "Content-Type": "multipart/form-data" },
    });
};

export const deleteMyCustomerAvatar = async () =>
    api.delete("profiles/customers/my/avatar/");

export const uploadMyClientAvatar = async (file) => {
    const fd = new FormData();
    fd.append('avatar', file);
    return api.patch('profiles/clients/my/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
};

export const deleteMyClientAvatar = async () => {
    const fd = new FormData();
    fd.append('avatar', '');
    return api.patch('profiles/clients/my/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
};

// Aliases
export const getCustomerById = async (id) => {
    const { data } = await api.get(`profiles/customers/${id}/`);
    return data;
};

export const getCustomerByUserUUID = async (uuid) => {
    const { data } = await api.get(`profiles/customers/by-user/${uuid}/`);
    return data;
};

export async function portfolioList(params) {
    const { data } = await api.get("/profiles/portfolio/", { params });
    return data;
}

export async function getPortfoliosByCustomer(userId) {
    const { data } = await api.get("/profiles/portfolio/", {
        params: { customer: userId },
    });
    return data;
}

export const resolveCustomerProfileId = async (idLike) => {
    const s = String(idLike);
    let d = await _tryGet(`profiles/customers/${encodeURIComponent(s)}/`);
    if (!d) d = await _tryGet(`profiles/customers/by-user/${encodeURIComponent(s)}/`);
    if (!d) d = await _tryGet(`profiles/customers/resolve/`, { params: { user: s } });

    const pk = d?.id || d?.profile_id || null;
    return pk ? String(pk) : null;
};