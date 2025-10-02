// src/api/bookings.js
import api from "./api";

/* =========================
   Availability (fallback)
   ========================= */

// 5) ✅ BACKEND: GET /bookings/bookings/<customer_profile_id>/check-availability/
export async function checkAvailabilityV5({ customer, start_date, end_date }) {
    return api.get(
        `bookings/bookings/${encodeURIComponent(String(customer))}/check-availability/`,
        { params: { start_date, end_date } }
    );
}

// 1) Legacy GET /bookings/availability/?customer=<pk>&start_date=&end_date=
export async function checkAvailabilityV1({ customer, start_date, end_date }) {
    return api.get("bookings/availability/", {
        params: { customer: String(customer), start_date, end_date },
    });
}

// 2) Legacy GET /bookings/availability/?customer_profile=<pk>&...
export async function checkAvailabilityV2({ customer, start_date, end_date }) {
    return api.get("bookings/availability/", {
        params: { customer_profile: String(customer), start_date, end_date },
    });
}

// 3) Legacy POST /bookings/check-availability/
export async function checkAvailabilityV3({ customer, start_date, end_date }) {
    return api.post("bookings/check-availability/", {
        customer: String(customer),
        start_date,
        end_date,
    });
}

// 4) Legacy GET /profiles/customers/<pk>/availability/?start_date=&end_date=
export async function checkAvailabilityV4({ customer, start_date, end_date }) {
    return api.get(
        `profiles/customers/${encodeURIComponent(String(customer))}/availability/`,
        { params: { start_date, end_date } }
    );
}

// Orchestrator (auto-fallback)
export async function checkAvailabilityAuto({ customer, start_date, end_date }) {
    const fns = [
        checkAvailabilityV5, // ← backend’dagi haqiqiy endpoint
        checkAvailabilityV1,
        checkAvailabilityV2,
        checkAvailabilityV3,
        checkAvailabilityV4,
    ];
    let lastErr;
    for (const fn of fns) {
        try {
            const res = await fn({ customer, start_date, end_date });
            const ok =
                res?.data?.is_available ??
                res?.data?.available ??
                res?.data?.ok ??
                false;
            return { ok: Boolean(ok), raw: res?.data };
        } catch (e) {
            lastErr = e;
            continue;
        }
    }
    throw lastErr || new Error("Availability endpoints not found");
}

/* =========================
   Bookings CRUD & actions
   ========================= */

export const getBookings = async (params) =>
    api.get("bookings/bookings/", { params });

export const getBooking = async (id) =>
    api.get(`bookings/bookings/${encodeURIComponent(String(id))}/`);

export const createBooking = async (payload) => {
    // Bo'sh/undefined maydonlarni olib tashlaymiz
    const body = Object.fromEntries(
        Object.entries(payload).filter(
            ([, v]) => v !== undefined && v !== null && v !== ""
        )
    );
    // country talab qilinadi — bo'sh bo'lsa server 400 qaytaradi
    const { data } = await api.post("bookings/bookings/", body, {
        headers: { "Content-Type": "application/json" },
    });
    return data;
};

export const updateBooking = async (id, data) =>
    api.put(`bookings/bookings/${encodeURIComponent(String(id))}/`, data);

export const deleteBooking = async (id) =>
    api.delete(`bookings/bookings/${encodeURIComponent(String(id))}/`);

export const getIncomingBookings = async () =>
    api.get("bookings/incoming/");

export const acceptBooking = async (id) =>
    api.post(`bookings/bookings/${encodeURIComponent(String(id))}/accept/`);

export const completeBooking = async (id) =>
    api.post(`bookings/bookings/${encodeURIComponent(String(id))}/complete/`);

export const cancelBooking = async (id, data) =>
    api.post(
        `bookings/bookings/${encodeURIComponent(String(id))}/cancel/`,
        data
    );

export const listBookings = async (params) =>
    api.get("bookings/bookings/", { params });

export const partialUpdateBooking = async (id, data) =>
    api.patch(`bookings/bookings/${encodeURIComponent(String(id))}/`, data);

export const actOnBooking = async (id, action, payload = {}) => {
    try {
        return await api.post(
            `bookings/bookings/${encodeURIComponent(String(id))}/${action}/`,
            payload
        );
    } catch (e) {
        if (e?.response?.status === 405 || e?.response?.status === 404) {
            const statusMap = {
                accept: "accepted",
                decline: "cancelled",
                complete: "completed",
            };
            return partialUpdateBooking(id, { status: statusMap[action], ...payload });
        }
        throw e;
    }
};
