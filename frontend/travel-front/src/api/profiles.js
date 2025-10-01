// src/api/profiles.js
// Handles client/customer profiles, portfolio, verification docs, unavailability.
// IDs are UUIDs (user_id for profiles is user UUID).
// Avatar handling: Multipart form for uploads.

import api from './api';

export const getClients = async (params) => {
    // GET /profiles/clients/
    // Query params: page, page_size (pagination)
    // Response: List of client profiles
    // Each: id (uuid), user (short: id, full_name, email), full_name, email, profile_id (uuid), date_of_birth (date or null), preferred_contact (email/phone/chat), languages (list: id, name, code, native_name), avatar (file or null), avatar_url (string or null), created_at, updated_at
    // Auth: None (public for list/retrieve)
    return api.get('profiles/clients/', { params });
};

export const getClient = async (userId) => {
    // GET /profiles/clients/{user_id}/
    // Path params: user_id (uuid of user)
    // Response: Client profile details (same as list)
    // Auth: None (public)
    return api.get(`profiles/clients/${userId}/`);
};

export const createClient = async (data) => {
    // POST /profiles/clients/
    // Body fields for form (from ClientProfileCreateUpdateSerializer):
    // - date_of_birth: date (optional)
    // - preferred_contact: string (optional, email/phone/chat, default 'chat')
    // - languages: array of uuids (optional, language IDs)
    // - avatar: file (optional, image)
    // Response: Created profile
    // Auth: Required (token, only for clients)
    // Note: Triggers if no profile exists; role must be 'client'
    return api.post('profiles/clients/', data);
};

export const updateClient = async (userId, data) => {
    // PUT /profiles/clients/{user_id}/ (full update)
    // Path params: user_id (uuid)
    // Body: Same as create
    // Auth: Required (token, owner or admin)
    return api.put(`profiles/clients/${userId}/`, data);
};

export const partialUpdateClient = async (userId, data) => {
    // PATCH /profiles/clients/{user_id}/ (partial)
    // Same as PUT
    // Auth: Required (token, owner or admin)
    return api.patch(`profiles/clients/${userId}/`, data);
};

export const getMyClientProfile = async () => {
    // GET /profiles/clients/my/
    // Response: Current user's client profile
    // Auth: Required (token)
    return api.get('profiles/clients/my/');
};

export const updateMyClientProfile = async (data) => {
    // PUT or PATCH /profiles/clients/my/
    // Body: Same as create/update
    // Auth: Required (token)
    return api.put('profiles/clients/my/', data); // or patch for partial
};

export const getClientAvatar = async (userId) => {
    // GET /profiles/clients/{user_id}/avatar/
    // Response: { avatar_url: string or null }
    // Auth: Required (token, owner or admin)
    return api.get(`profiles/clients/${userId}/avatar/`);
};

export const uploadClientAvatar = async (userId, formData) => {
    // PUT or PATCH /profiles/clients/{user_id}/avatar/
    // FormData fields:
    // - avatar: file (required, jpeg/png/gif, <5MB)
    // Response: { detail: string, avatar_url: string }
    // Auth: Required (token, owner or admin)
    // Use FormData in React: const formData = new FormData(); formData.append('avatar', file);
    return api.put(`profiles/clients/${userId}/avatar/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
};

export const deleteClientAvatar = async (userId) => {
    // DELETE /profiles/clients/{user_id}/avatar/
    // Response: { detail: string, avatar_url: null }
    // Auth: Required (token, owner or admin)
    return api.delete(`profiles/clients/${userId}/avatar/`);
};

// Similar for Customers (symmetric to clients, but more fields)
export const getCustomers = async (params) => {
    // GET /profiles/customers/
    // Query params: city (uuid), service_type (uuid), language (code string), min_rating (number), is_available (bool)
    // Response: List of customer profiles
    // Each: id (uuid), user (short), full_name, email, profile_id, country_name, professional_bio (string), years_of_experience (int >=0), service_types (list: id, name), city (uuid), city_name, service_areas (string), hourly_rate (decimal >=0 or null), daily_rate (decimal >=0 or null), currency (3 chars, default USD), languages (list), verification_status (pending/verified/rejected), verification_date (datetime or null), total_bookings (int), total_reviews (int), average_rating (decimal 0-5), is_available (bool), is_verified (bool), member_since (date), member_since_year (int), avatar (file or null), avatar_url, created_at, updated_at
    // Auth: None (public)
    return api.get('profiles/customers/', { params });
};

// Path param = CustomerProfile.id (PK, UUID)
async function _tryGet(url, config) {
    try {
        const { data } = await api.get(url, config);
        return data ?? null;
    } catch {
        return null;
    }
}

/** user UUID yoki profile PK berilishi mumkin */
export const getCustomer = async (idLike) => {
    const s = String(idLike);

    // 1) Agar profile PK bo‘lsa (backend shu pathni qo‘llasa) — ishlaydi
    let data = await _tryGet(`profiles/customers/${encodeURIComponent(s)}/`);
    // 2) USER UUID bo‘lsa — by-user/ bor bo‘lsa
    if (!data) data = await _tryGet(`profiles/customers/by-user/${encodeURIComponent(s)}/`);
    // 3) Resolver (?user=UUID) bor bo‘lsa
    if (!data) data = await _tryGet(`profiles/customers/resolve/`, { params: { user: s } });

    return data; // null bo‘lishi ham mumkin
};

export const createCustomer = async (data) => {
    // POST /profiles/customers/
    // Body fields (from CustomerProfileCreateUpdateSerializer):
    // - professional_bio: string (optional, default '')
    // - years_of_experience: int (optional, >=0, default 0)
    // - service_types: array of uuids (optional)
    // - city: uuid (optional, null ok)
    // - service_areas: string (optional, default '')
    // - hourly_rate: decimal (optional, >=0)
    // - daily_rate: decimal (optional, >=0)
    // - currency: string (3 chars, optional, default USD)
    // - languages: array of uuids (optional)
    // - is_available: bool (optional, default true)
    // - avatar: file (optional)
    // Response: Created
    // Auth: Required (token, only customers)
    return api.post('profiles/customers/', data);
};

export const updateCustomer = async (userId, data) => {
    // PUT /profiles/customers/{user_id}/
    // Same body as create
    // Auth: Required (owner or admin)
    return api.put(`profiles/customers/${userId}/`, data);
};

export const partialUpdateCustomer = async (userId, data) => {
    // PATCH /profiles/customers/{user_id}/
    // Auth: Required
    return api.patch(`profiles/customers/${userId}/`, data);
};

export const getMyCustomerProfile = async () => {
    // GET /profiles/customers/my/
    // Response: Current customer profile
    // Auth: Required
    return api.get('profiles/customers/my/');
};

// export const updateMyCustomerProfile = async (data) => {
//     // PUT/PATCH /profiles/customers/my/
//     // Same body
//     // Auth: Required
//     return api.put('profiles/customers/my/', data);
// };

// export const updateMyCustomerProfile = async (data) => {
//     // PATCH /profiles/customers/my/
//     // JSON qabul qiladi
//     return api.patch('profiles/customers/my/', data, {
//         headers: { 'Content-Type': 'application/json' },
//     });
// };

// Backend JSON emas, multipart qabul qiladi
export const updateMyCustomerProfile = async (data) => {
  let form;
  if (data instanceof FormData) {
    form = data;
  } else {
    form = new FormData();
    Object.entries(data || {}).forEach(([k, v]) => {
      if (Array.isArray(v)) {
        v.forEach((item) => form.append(k, item));
      } else if (v !== undefined && v !== null) {
        form.append(k, v);
      }
    });
  }
  return api.patch('profiles/customers/my/', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// Avatar for Customer (uses mixin, similar to client)
// export const getCustomerAvatar = async (userId) => {
//     // GET /profiles/customers/{user_id}/avatar/
//     // Response: { avatar_url }
//     // Auth: Required (owner/admin)
//     return api.get(`profiles/customers/${userId}/avatar/`);
// };

// export const uploadCustomerAvatar = async (userId, formData) => {
//     // PUT/PATCH /profiles/customers/{user_id}/avatar/
//     // FormData: avatar (file)
//     // Auth: Required
//     return api.put(`profiles/customers/${userId}/avatar/`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
// };

// export const deleteCustomerAvatar = async (userId) => {
//     // DELETE /profiles/customers/{user_id}/avatar/
//     // Auth: Required
//     return api.delete(`profiles/customers/${userId}/avatar/`);
// };

// Portfolio (owned by customer)
export const getPortfolios = async (params) => {
    // GET /profiles/portfolio/
    // Query params: page, etc.
    // Response: List { id (uuid), customer (uuid), customer_name, image (file), image_url, title (string), description (string), order (int), created_at }
    // Auth: Required (owner or admin for full list)
    return api.get('profiles/portfolio/', { params });
};

export const getPortfolio = async (id) => {
    // GET /profiles/portfolio/{id}/
    // Path: id (uuid)
    // Response: Details
    // Auth: Required
    return api.get(`profiles/portfolio/${id}/`);
};

export const createPortfolio = async (formData) => {
    // POST /profiles/portfolio/
    // FormData fields:
    // - image: file (required)
    // - title: string (optional)
    // - description: string (optional)
    // - order: int (optional, default 0)
    // Response: Created (customer auto-set to current)
    // Auth: Required (customer only)
    return api.post('profiles/portfolio/', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
};

export const updatePortfolio = async (id, formData) => {
    // PUT /profiles/portfolio/{id}/
    // Same fields
    // Auth: Required (owner/admin)
    return api.put(`profiles/portfolio/${id}/`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
};

export const partialUpdatePortfolio = async (id, formData) => {
    // PATCH /profiles/portfolio/{id}/
    return api.patch(`profiles/portfolio/${id}/`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
};

export const deletePortfolio = async (id) => {
    // DELETE /profiles/portfolio/{id}/
    // Auth: Required
    return api.delete(`profiles/portfolio/${id}/`);
};

export const getMyPortfolios = async () => {
    // GET /profiles/portfolio/my/
    // Response: List of own portfolios
    // Auth: Required (customer)
    return api.get('profiles/portfolio/my/');
};

// Verification Documents
export const getVerificationDocs = async (params) => {
    // GET /profiles/verification-docs/
    // Response: List { id, customer (uuid), customer_name, document_type (id_card/passport/license/certificate/other), file (file), description (string optional), is_verified (bool), verified_by (uuid or null), verified_by_name, verified_at (datetime or null), created_at }
    // Auth: Required (owner/admin)
    return api.get('profiles/verification-docs/', { params });
};

export const getVerificationDoc = async (id) => {
    // GET /profiles/verification-docs/{id}/
    // Auth: Required
    return api.get(`profiles/verification-docs/${id}/`);
};

export const createVerificationDoc = async (formData) => {
    // POST /profiles/verification-docs/
    // FormData:
    // - document_type: string (required, choices above)
    // - file: file (required)
    // - description: string (optional)
    // Response: Created (is_verified false initially)
    // Auth: Required (customer)
    return api.post('profiles/verification-docs/', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
};

export const updateVerificationDoc = async (id, formData) => {
    // PUT /profiles/verification-docs/{id}/
    // Same fields (admin can set is_verified, verified_by, etc.)
    // Auth: Required (owner/admin)
    return api.put(`profiles/verification-docs/${id}/`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
};

export const deleteVerificationDoc = async (id) => {
    // DELETE /profiles/verification-docs/{id}/
    // Auth: Required
    return api.delete(`profiles/verification-docs/${id}/`);
};

export const getMyVerificationDocs = async () => {
    // GET /profiles/verification-docs/my/
    // Auth: Required
    return api.get('profiles/verification-docs/my/');
};

// Unavailability
export const getUnavailabilities = async (params) => {
    // GET /profiles/unavailability/
    // Response: List { id, customer (uuid), customer_name, start_date (date), end_date (date), reason (string optional), created_at }
    // Auth: Required (owner/admin)
    return api.get('profiles/unavailability/', { params });
};

export const getUnavailability = async (id) => {
    // GET /profiles/unavailability/{id}/
    // Auth: Required
    return api.get(`profiles/unavailability/${id}/`);
};

export const createUnavailability = async (data) => {
    // POST /profiles/unavailability/
    // Body:
    // - start_date: date (required)
    // - end_date: date (required, >= start_date)
    // - reason: string (optional)
    // Validation: No overlap with existing
    // Response: Created
    // Auth: Required (customer)
    return api.post('profiles/unavailability/', data);
};

export const updateUnavailability = async (id, data) => {
    // PUT /profiles/unavailability/{id}/
    // Same body
    // Auth: Required
    return api.put(`profiles/unavailability/${id}/`, data);
};

export const deleteUnavailability = async (id) => {
    // DELETE /profiles/unavailability/{id}/
    // Auth: Required
    return api.delete(`profiles/unavailability/${id}/`);
};

export const getMyUnavailabilities = async () => {
    // GET /profiles/unavailability/my/
    // Auth: Required
    return api.get('profiles/unavailability/my/');
};

// ----

// BACKEND: avatar endpoint `my` ko‘rinishida ishlaydi
export const getMyCustomerAvatar = async () => {
    // GET /profiles/customers/my/avatar/
   return api.get(`profiles/customers/my/avatar/`);
};

// export const uploadMyCustomerAvatar = async (formData) => {
// // POST yoki PATCH /profiles/customers/my/avatar/  (DRF actionga qarab)
//    // Ko‘pchilikda POST qabul qilinadi; PATCH bo‘lsa pastdagini POSTdan PATCHga almashtiring.
//    return api.post(`profiles/customers/my/avatar/`, formData, {
//        headers: { 'Content-Type': 'multipart/form-data' },
//    });
// };

// Avatarni profile PATCH orqali yangilaymiz
export const uploadMyCustomerAvatar = async (fileOrFormData) => {
    const form = fileOrFormData instanceof FormData ? fileOrFormData : new FormData();
    if (!(fileOrFormData instanceof FormData)) form.append("avatar", fileOrFormData);
    // PUT /api/v1/profiles/customers/my/avatar/
    return api.put("profiles/customers/my/avatar/", form, {
        headers: { "Content-Type": "multipart/form-data" },
    });
};

// Ko‘p DRF loyihalarida rasmni bo‘sh qiymat bilan PATCH qilib o‘chiramiz
export const deleteMyCustomerAvatar = async () =>
    api.delete("profiles/customers/my/avatar/");

// ... mavjud import va funksiyalar yuqorida ...

// export const getMyClientProfile = async () => {
//     return api.get('profiles/clients/my/');
// };

// export const updateMyClientProfile = async (data) => {
//     // JSON yuborish uchun (client settings)
//     return api.put('profiles/clients/my/', data);
// };

// --- YANGI: avatarni "my" orqali boshqarish (client) ---
export const uploadMyClientAvatar = async (file) => {
    const fd = new FormData();
    fd.append('avatar', file);
    return api.patch('profiles/clients/my/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
};

export const deleteMyClientAvatar = async () => {
    // Ko‘p DRF loyihalarida bo‘sh avatar qiymati bilan tozalanadi
    const fd = new FormData();
    fd.append('avatar', '');
    return api.patch('profiles/clients/my/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
};

// ======

// --- Aliases for BookingPage.jsx ---

// Backendda /profiles/customers/{id}/  -> siz logs'da PK bilan ishlatayotganingiz ko'rinadi
export const getCustomerById = async (id) => {
    const { data } = await api.get(`profiles/customers/${id}/`);
    return data;
};

// Agar backendda user UUID bo'yicha alohida endpoint bo'lsa (by-user)
// Bo'lmasa, shu funksiya ishlamaydi; BookingPage fallbacki bor.
export const getCustomerByUserUUID = async (uuid) => {
    const { data } = await api.get(`profiles/customers/by-user/${uuid}/`);
    return data;
};

// BookingPage "portfolioList" deb chaqiradi — alias bering
// export const portfolioList = async (params = {}) => {
//     const { customer, ...rest } = params;
//     // Majburiy string: ilmiy ko‘rinishga o'tmasin
//     const safeCustomer = typeof customer === "undefined" || customer === null ? undefined : String(customer);
//     return api.get("profiles/portfolio/", { params: { customer: safeCustomer, ...rest } });
// };

// oldingi portfolioList ni shu bilan almashtiring:
export async function portfolioList(params) {
    // params.customer – bu USER UUID bo‘lsin!
    const { data } = await api.get("/profiles/portfolio/", { params });
    return data;
}

export async function getPortfoliosByCustomer(userId) {
    const { data } = await api.get("/profiles/portfolio/", {
        params: { customer: userId },   // 🔑 user_id yuborilyapti
    });
    return data;
}

export const resolveCustomerProfileId = async (idLike) => {
    const s = String(idLike);
    // to‘g‘ridan profil pk bilan urib ko‘ramiz
    let d = await _tryGet(`profiles/customers/${encodeURIComponent(s)}/`);
    // user UUID varianti
    if (!d) d = await _tryGet(`profiles/customers/by-user/${encodeURIComponent(s)}/`);
    if (!d) d = await _tryGet(`profiles/customers/resolve/`, { params: { user: s } });

    const pk = d?.id || d?.profile_id || null;
    return pk ? String(pk) : null;
};
