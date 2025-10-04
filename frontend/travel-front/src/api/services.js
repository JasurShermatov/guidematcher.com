// src/api/services.js
import api from "./api";

/**
 * DRF javobini normalize qiladi:
 * - {results: [...]} yoki [...]
 */
function pickList(data) {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.results)) return data.results;
    return [];
}

/**
 * Xizmatlar ro'yxatini olish (fallback bilan).
 * @param {object} params Masalan: { customer: <user_uuid yoki profile_pk>, is_public: true, page_size: 50 }
 * @returns {Promise<Array>} xizmatlar ro'yxati
 */
export async function servicesList(params = {}) {
    // Ehtimoliy endpointlar: eng ko‘p uchraydigandan kam uchraydigacha
    const CANDIDATES = [
        // 1) Alohida "services" app bo'lsa:
        "services/",
        "services/items/",
        // 2) Profil ichida nested routelar bo'lsa:
        "profiles/services/",
        // 3) Marketplace/Catalog yondashuvi bo'lsa:
        "marketplace/services/",
        "catalog/services/",
        // 4) Customerga bog'langan nested:
        //    (masalan: profiles/customers/<uuid|pk>/services/)
    ];

    // Agar customer parametrlashgan bo'lsa, nested urinish ham qilib ko'ramiz:
    const customer = params.customer;
    const nestedCandidates = customer
        ? [
            `profiles/customers/${encodeURIComponent(customer)}/services/`,
            `profiles/customers/${encodeURIComponent(customer)}/my-services/`,
        ]
        : [];

    // 1) Global/norm yondashuvlar
    for (const url of CANDIDATES) {
        try {
            const { data } = await api.get(url, { params });
            const items = pickList(data);
            if (items.length) return items;
            // Bo'sh bo'lsa ham qaytarishimiz mumkin, lekin keyingisini ham sinab ko‘ramiz
            if (Array.isArray(data) || data?.results) return items;
        } catch (e) {
            // keyingisini sinaymiz
        }
    }

    // 2) Nested (customer ga bog'lab)
    for (const url of nestedCandidates) {
        try {
            const { data } = await api.get(url, { params });
            const items = pickList(data);
            if (items.length) return items;
            if (Array.isArray(data) || data?.results) return items;
        } catch (e) {}
    }

    // Umuman topilmasa bo‘sh ro‘yxat
    return [];
}

/**
 * Bitta xizmatni olish (fallback).
 * @param {string|number} id
 */
export async function getService(id) {
    const candidates = [
        `services/${encodeURIComponent(id)}/`,
        `services/items/${encodeURIComponent(id)}/`,
        `profiles/services/${encodeURIComponent(id)}/`,
        `marketplace/services/${encodeURIComponent(id)}/`,
        `catalog/services/${encodeURIComponent(id)}/`,
    ];
    for (const url of candidates) {
        try {
            const { data } = await api.get(url);
            if (data) return data;
        } catch (e) {}
    }
    return null;
}

// src/api/services.js

/**
 * Profil ma'lumotidan sintetik xizmatlar tuzib beradi.
 * Backendda alohida "services" endpoint bo'lmagan holatda ishlatiladi.
 *
 * @param {object} guide  CustomerProfile (API'dan olingan)
 * @returns {Array<{id:string,title:string,description:string,price:number|null,currency:string,duration_min:number|null,duration_max:number|null}>}
 */
export function buildServicesFromProfile(guide) {
    const out = [];
    if (!guide || typeof guide !== "object") return out;

    const currency = (guide.currency || "USD").toString().toUpperCase();
    const bio = guide.professional_bio || "Local guiding and assistance.";

    // 1) Soatlik xizmat
    if (guide.hourly_rate != null) {
        out.push({
            id: "syn-hourly",
            title: "Guiding (hourly)",
            description: bio,
            price: Number(guide.hourly_rate),
            currency,
            duration_min: 1,
            duration_max: null,
        });
    }

    // 2) Kunlik xizmat (bo‘lsa)
    if (guide.daily_rate != null) {
        out.push({
            id: "syn-daily",
            title: "Full-day guiding",
            description: "Full-day private guiding.",
            price: Number(guide.daily_rate),
            currency,
            duration_min: 8,
            duration_max: 10,
        });
    }

    // 3) Tajriba yo‘nalishlari — service_types bo‘lsa
    if (Array.isArray(guide.service_types) && guide.service_types.length) {
        guide.service_types.forEach((st, i) => {
            const name = (st?.name || String(st)).trim();
            if (!name) return;
            out.push({
                id: `syn-exp-${i}`,
                title: `Experience: ${name}`,
                description: `Personalized ${name.toLowerCase()} experience.`,
                price: guide.hourly_rate != null ? Number(guide.hourly_rate) : null,
                currency,
                duration_min: null,
                duration_max: null,
            });
        });
    }

    return out;
}

// Kelajakda backendda alohida endpoint paydo bo'lsa — shu modulga real GET funksiyani qo'shib,
// frontni o'zgartirmasdan ulab yuborish mumkin (masalan: fetchServicesFromApi()).

