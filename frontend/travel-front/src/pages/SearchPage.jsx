// src/pages/SearchPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Search, ChevronLeft, ChevronRight, Star, Filter, Users } from "lucide-react";
import api from "../api/api";
import { getServiceTypes, getCities, getLanguages } from "../api/common";

async function safeGet(url, { params, def = null } = {}) {
    try {
        const { data } = await api.get(url, { params });
        return data ?? def;
    } catch (e) {
        console.error("GET failed:", url, e?.response?.data || e?.message);
        return def;
    }
}

function normalizeGuideCard(g) {
    return {
        id: g?.user_uuid || g?.user?.id || g?.id,  // detalga o'tishda shu uuid ishlatiladi
        full_name: g?.user_full_name || g?.full_name || "Guide",
        avatar_url: g?.avatar_url || null,
        city: g?.city_name || "",
        country: g?.country_name || "",
        rating: typeof g?.average_rating === "number" ? g.average_rating : null,
        total_reviews: g?.total_reviews || 0,
        languages: Array.isArray(g?.languages) ? g.languages.map((x) => x?.name).filter(Boolean) : [],
        professional_bio: g?.professional_bio || "",
        years_of_experience: g?.years_of_experience || 0,
        is_verified: g?.is_verified || false,
        is_available: g?.is_available || false,
    };
}

export default function SearchPage() {
    const navigate = useNavigate();

    const [isListLoading, setIsListLoading] = useState(false);
    const [listError, setListError] = useState("");
    const [guides, setGuides] = useState([]);
    const [total, setTotal] = useState(0);

    // Filters
    const [q, setQ] = useState("");
    const [filterServiceType, setFilterServiceType] = useState("");
    const [filterCity, setFilterCity] = useState("");
    const [filterLanguage, setFilterLanguage] = useState("");
    const [serviceTypes, setServiceTypes] = useState([]);
    const [cities, setCities] = useState([]);
    const [allLangs, setAllLangs] = useState([]);

    // Pagination
    const [page, setPage] = useState(1);
    const pageSize = 12;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    useEffect(() => {
        (async () => {
            const sts = await getServiceTypes().then((r) =>
                Array.isArray(r?.results) ? r.results : Array.isArray(r) ? r : []
            );
            setServiceTypes(sts);

            const cs = await getCities().then((r) =>
                Array.isArray(r?.results) ? r.results : Array.isArray(r) ? r : []
            );
            setCities(cs);

            const langs = await getLanguages().then((r) =>
                Array.isArray(r?.results) ? r.results : Array.isArray(r) ? r : []
            );
            setAllLangs(langs);
        })();
    }, []);

    const loadGuides = async () => {
        setIsListLoading(true);
        setListError("");
        try {
            const params = {
                page,
                page_size: pageSize,
                ordering: "-average_rating",
                is_public: true,                 // ko'p backendlarda kerak bo'ladi
            };
            if (q?.trim()) params.q = q.trim(); // agar backend 'search' kutsa, shuni 'search'ga almashtiring
            if (filterServiceType) params.service_type = filterServiceType; // ID
            if (filterCity) params.city = filterCity;                       // ID (agar 'city_id' bo'lsa, shu nomga o'zgartiring)
            if (filterLanguage) params.languages = filterLanguage;          // ko'p backendlarda 'languages' (emas bo' b o' 'language' qilib o'zgartiring)

            const data = await safeGet("profiles/customers/", { params, def: { results: [], count: 0 } });
            const results = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
            const items = results.map(normalizeGuideCard);
            const count = data?.count ?? items.length;
            setGuides(items);
            setTotal(count);
        } catch (e) {
            setListError("Failed to load guides");
        } finally {
            setIsListLoading(false);
        }
    };

    useEffect(() => {
        loadGuides();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page]);

    const onApplyFilters = (e) => {
        e?.preventDefault?.();
        setPage(1);
        loadGuides();
    };

    const clearFilters = () => {
        setQ("");
        setFilterServiceType("");
        setFilterCity("");
        setFilterLanguage("");
        setPage(1);
        loadGuides();
    };

    const goDetail = (id) => {
        if (!id) return;
        navigate(`/guides/${id}`);
    };

    return (
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl md:text-3xl font-bold">Find a guide</h1>
                <button onClick={loadGuides} className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50">
                    <Filter className="h-4 w-4" /> Apply filters
                </button>
            </div>

            <form onSubmit={onApplyFilters} className="bg-white border rounded-xl p-4 grid md:grid-cols-5 gap-3">
                <div className="md:col-span-2">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search by name, bio…"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            className="w-full p-3 pl-9 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                        <Search className="h-4 w-4 text-gray-400 absolute left-3 top-3.5" />
                    </div>
                </div>

                <div>
                    <select
                        value={filterCity}
                        onChange={(e) => setFilterCity(e.target.value)}
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">All cities</option>
                        {cities.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name} {c?.country?.code ? `(${c.country.code})` : ""}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <select
                        value={filterServiceType}
                        onChange={(e) => setFilterServiceType(e.target.value)}
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">All services</option>
                        {serviceTypes
                            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                            .map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name}
                                </option>
                            ))}
                    </select>
                </div>

                <div>
                    <select
                        value={filterLanguage}
                        onChange={(e) => setFilterLanguage(e.target.value)}
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">All languages</option>
                        {allLangs.slice(0, 100).map((l) => (
                            <option key={l.id} value={l.id}>
                                {l.name} {l.code ? `(${l.code})` : ""}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="md:col-span-5 flex flex-wrap gap-3 pt-2">
                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        Search
                    </button>
                    <button type="button" onClick={clearFilters} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
                        Clear
                    </button>
                </div>
            </form>

            <div className="bg-white border rounded-xl p-4">
                {isListLoading ? (
                    <div className="p-8 text-center text-gray-600">Loading…</div>
                ) : listError ? (
                    <div className="p-8 text-center text-red-600">{listError}</div>
                ) : guides.length ? (
                    <>
                        <div className="grid md:grid-cols-3 gap-4">
                            {guides.map((g) => (
                                <div key={g.id} className="border rounded-lg p-4 flex flex-col">
                                    <div className="flex items-center gap-3">
                                        {g.avatar_url ? (
                                            <img src={g.avatar_url} alt={g.full_name} className="w-12 h-12 rounded-full object-cover" />
                                        ) : (
                                            <div className="w-12 h-12 rounded-full bg-gray-200" />
                                        )}
                                        <div className="flex-1">
                                            <div className="font-semibold">{g.full_name}</div>
                                            <div className="text-sm text-gray-600 flex items-center gap-1">
                                                <MapPin className="h-3 w-3" />
                                                {g.city || g.country || "—"}
                                            </div>
                                        </div>
                                        {!!g.rating && (
                                            <div className="text-sm text-yellow-600 inline-flex items-center gap-1">
                                                <Star className="h-4 w-4 fill-current" />
                                                {Number(g.rating).toFixed(1)}
                                            </div>
                                        )}
                                    </div>

                                    {!!g.languages.length && (
                                        <div className="mt-3">
                                            <div className="text-xs text-gray-500">Languages</div>
                                            <div className="text-sm text-gray-700">
                                                {g.languages.slice(0, 5).join(", ")}
                                                {g.languages.length > 5 ? "…" : ""}
                                            </div>
                                        </div>
                                    )}
                                    <div className="mt-2 text-sm text-gray-600">
                                        Experience: {g.years_of_experience} years
                                    </div>
                                    <div className="mt-2 text-sm text-gray-600">
                                        {g.professional_bio.slice(0, 100)}...
                                    </div>
                                    <div className="mt-auto pt-4 flex items-center justify-between">
                                        <button
                                            onClick={() => goDetail(g.id)}
                                            className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                        >
                                            View profile
                                        </button>
                                        {!!g.total_reviews && (
                                            <div className="text-xs text-gray-600">{g.total_reviews} reviews</div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center justify-center gap-2 mt-6">
                            <button
                                disabled={page <= 1}
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                className={`px-3 py-2 border rounded-lg ${page <= 1 ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"}`}
                                title="Prev"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <div className="text-sm">
                                Page <span className="font-semibold">{page}</span> of{" "}
                                <span className="font-semibold">{totalPages}</span>
                            </div>
                            <button
                                disabled={page >= totalPages}
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                className={`px-3 py-2 border rounded-lg ${page >= totalPages ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"}`}
                                title="Next"
                            >
                                Next <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="p-8 text-center text-gray-600">No guides found</div>
                )}
            </div>
        </div>
    );
}