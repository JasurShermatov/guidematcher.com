import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Calendar, CheckCircle, Clock, MapPin, Star as StarIcon } from "lucide-react";

import * as bookingsApi from "../api/bookings";
import * as profilesApi from "../api/profiles";
import * as reviewsApi from "../api/reviews";
import api from "../api/api";
import { useLanguage } from "../context/LanguageContext";

/** ---------- helpers ---------- */
const UUID_RX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isUUID = (v) => UUID_RX.test(String(v || ""));

const safeGet = async (url, { def = null, params } = {}) => {
    try {
        const { data } = await api.get(url, { params });
        return data ?? def;
    } catch {
        return def;
    }
};

const stepVariants = {
    hidden: { opacity: 0, x: 50 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -50 },
};

/** Stars (review) */
function Stars({ value = 0, onChange }) {
    return (
        <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
                <button
                    key={n}
                    type="button"
                    onClick={() => onChange?.(n)}
                    className={`p-1 rounded ${n <= value ? "text-yellow-500" : "text-gray-300 dark:text-dark-600"} hover:scale-105 transition`}
                    title={`${n} star${n > 1 ? "s" : ""}`}
                >
                    <StarIcon className={`${n <= value ? "fill-current" : ""} h-5 w-5`} />
                </button>
            ))}
        </div>
    );
}

export default function BookingPage() {
    const { t } = useLanguage();
    const { id } = useParams(); // profile UUID
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const [guide, setGuide] = useState(null);
    const [portfolio, setPortfolio] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Forma
    const [bookingData, setBookingData] = useState({
        customer_profile: null,
        service_type: null,
        title: "",
        description: "",
        country: "", // REQUIRED
        city: "",
        start_date: "",
        end_date: "",
        start_time: "",
        duration_hours: "",
        proposed_rate: "",
        rate_type: "",
        currency: "USD",
        number_of_people: 1,
    });
    const [checking, setChecking] = useState(false);

    // Review
    const [reviewBookingId, setReviewBookingId] = useState(null);
    const [reviewAllowed, setReviewAllowed] = useState(false);
    const [reviewForm, setReviewForm] = useState({ overall_rating: 0, comment: "" });
    const [postingReview, setPostingReview] = useState(false);

    const selectedService = useMemo(() => {
        if (!bookingData.title) return null;
        return portfolio.find((s) => s?.title === bookingData.title) || null;
    }, [bookingData.title, portfolio]);

    useEffect(() => {
        (async () => {
            setIsLoading(true);

            if (!id || !isUUID(id)) {
                setIsLoading(false);
                toast.error(t("booking.errInvalidGuide"));
                return;
            }
            let g = await profilesApi.getCustomer(id).catch(() => null);
            if (!g) {
                setIsLoading(false);
                toast.error(t("booking.errGuideNotFound"));
                return;
            }
            const avatar_url = g?.avatar_url || g?.user?.avatar_url || null;
            setGuide({
                ...g,
                avatar_url,
                _profile_id: g?.id || g?.profile_id || String(id),
                _user_uuid: g?.user?.id || g?.user_id || null,
            });
            setBookingData((prev) => ({
                ...prev,
                customer_profile: String(g.id),
                city: prev.city || g.city || "",
                country: prev.country || g.country || g.country_name || "",
            }));

            // Portfolio
            let p = [];
            try {
                const res = await profilesApi.portfolioList(
                    g?._user_uuid ? { customer: String(g._user_uuid) } : {}
                );
                p = Array.isArray(res?.results) ? res.results : Array.isArray(res) ? res : [];
            } catch {
                p = [];
            }
            setPortfolio(p);

            // Query’dan prefill
            const svc = searchParams.get("service");
            const start_date = searchParams.get("start_date");
            const end_date = searchParams.get("end_date");
            const guests =
                searchParams.get("guests") ||
                searchParams.get("people") ||
                searchParams.get("number_of_people");
            const description = searchParams.get("description") || searchParams.get("note") || "";
            const country = searchParams.get("country");

            if (svc) {
                const item = p.find((x) => (x.title || "").toLowerCase() === svc.toLowerCase());
                setBookingData((prev) => ({
                    ...prev,
                    title: item?.title || svc,
                    service_type: item?.service_type || item?.id || null,
                    currency: item?.currency || prev.currency || "USD",
                    proposed_rate: item?.hourly_rate ?? item?.daily_rate ?? prev.proposed_rate ?? "",
                    rate_type: item?.hourly_rate ? "hourly" : item?.daily_rate ? "daily" : prev.rate_type || "",
                }));
            }
            setBookingData((prev) => ({
                ...prev,
                start_date: start_date || prev.start_date || "",
                end_date: end_date || prev.end_date || "",
                number_of_people: guests ? Number(guests) : prev.number_of_people || 1,
                description: description || prev.description || "",
                country: country || prev.country || "",
            }));

            // Review (?booking_id=...)
            const reviewId = searchParams.get("booking_id");
            if (reviewId) {
                setReviewBookingId(reviewId);
                try {
                    const { data: b } = await bookingsApi.getBooking(reviewId);
                    const status = String(b?.status || b?.status_display || "").toLowerCase();
                    const ok = ["completed", "complete"].includes(status);
                    setReviewAllowed(ok);
                    if (!ok) toast.error(t("booking.errOnlyCompletedReview"));
                } catch {
                    setReviewAllowed(false);
                    toast.error(t("booking.errReviewBookingNotFound"));
                }
            }

            setIsLoading(false);
        })();
    }, [id, searchParams, t]);

    const handleInputChange = (field, value) =>
        setBookingData((prev) => ({ ...prev, [field]: value }));

    const handleCheckAvailability = async () => {
        if (!guide?._profile_id && !guide?.id) return;
        if (!bookingData.start_date || !bookingData.end_date)
            return toast.error(t("booking.errChooseDates"));
        setChecking(true);
        try {
            const { ok, raw } = await bookingsApi.checkAvailabilityAuto({
                customer: String(guide._profile_id || guide.id),
                start_date: bookingData.start_date,
                end_date: bookingData.end_date,
            });
            if (ok) toast.success(raw?.message || t("booking.availableOk"));
            else toast.error(raw?.message || t("booking.availableNo"));
        } catch {
            toast.error(t("booking.availableFail"));
        } finally {
            setChecking(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!bookingData.customer_profile) return toast.error(t("booking.errNoGuide"));
        if (!bookingData.start_date || !bookingData.end_date) return toast.error(t("booking.errSelectDates"));
        if (new Date(bookingData.end_date) < new Date(bookingData.start_date))
            return toast.error(t("booking.errEndBeforeStart"));
        if (!bookingData.country?.trim()) return toast.error(t("booking.errCountryRequired"));

        toast.loading(t("booking.creating"));
        try {
            const payload = {
                customer_profile: String(guide._profile_id || guide.id),
                service_type: bookingData.service_type || undefined,
                title: bookingData.title || undefined,
                description: bookingData.description || undefined,
                country: bookingData.country,
                city: bookingData.city || undefined,
                start_date: bookingData.start_date,
                end_date: bookingData.end_date,
                start_time: bookingData.start_time || undefined,
                duration_hours: bookingData.duration_hours ? Number(bookingData.duration_hours) : undefined,
                proposed_rate: bookingData.proposed_rate !== "" ? Number(bookingData.proposed_rate) : undefined,
                rate_type: bookingData.rate_type || undefined,
                currency: bookingData.currency || "USD",
                number_of_people: bookingData.number_of_people ? Number(bookingData.number_of_people) : 1,
            };
            await bookingsApi.createBooking(payload);
            toast.dismiss();
            toast.success(t("booking.created"));
            navigate("/dashboard/tourist");
        } catch (error) {
            toast.dismiss();
            const raw = error?.response?.data;
            const msg =
                raw?.country?.[0] ||
                raw?.customer_profile?.[0] ||
                raw?.start_date?.[0] ||
                raw?.end_date?.[0] ||
                raw?.non_field_errors?.[0] ||
                raw?.error ||
                raw?.detail ||
                raw?.message ||
                t("booking.errCreateFailed");
            toast.error(String(msg));
        }
    };

    const submitReview = async () => {
        if (!reviewBookingId || !reviewAllowed) {
            toast.error(t("booking.errOnlyCompletedReview"));
            return;
        }
        if (!reviewForm.overall_rating) return toast.error(t("booking.errSelectRating"));

        setPostingReview(true);
        try {
            await reviewsApi.createReview(
                { overall_rating: reviewForm.overall_rating, comment: reviewForm.comment || "" },
                { booking_id: reviewBookingId }
            );
            toast.success(t("booking.reviewSubmitted"));
            navigate("/dashboard/tourist");
        } catch (e) {
            const msg =
                e?.response?.data?.error ||
                e?.response?.data?.detail ||
                e?.response?.data?.booking?.[0] ||
                t("booking.errSubmitReview");
            toast.error(String(msg));
        } finally {
            setPostingReview(false);
        }
    };

    if (isLoading)
        return (
            <div className="min-h-screen flex items-center justify-center text-gray-700 dark:text-gray-200">
                {t("common.loading")}
            </div>
        );
    if (!guide)
        return (
            <div className="min-h-screen flex items-center justify-center text-gray-700 dark:text-gray-200">
                {t("booking.errGuideNotFound")}
            </div>
        );

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-dark-950 pt-8 pb-16 transition-colors">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Step header */}
                <div className="mb-8">
                    <div className="flex items-center justify-center space-x-8">
                        <div className="flex items-center">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center font-medium bg-blue-600 text-white">
                                <CheckCircle className="h-6 w-6" />
                            </div>
                            <span className="ml-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                {t("booking.serviceSchedule")}
              </span>
                        </div>
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Form */}
                    <div className="lg:col-span-2">
                        <div className="bg-white dark:bg-dark-900 border border-gray-200 dark:border-dark-700 rounded-2xl p-8 shadow-sm transition-colors">
                            <form noValidate onSubmit={handleSubmit}>
                                <motion.div
                                    variants={stepVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                    transition={{ duration: 0.3 }}
                                >
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                                        {t("booking.selectServiceSchedule")}
                                    </h2>

                                    {/* Country + City */}
                                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                {t("booking.country")} *
                                            </label>
                                            <input
                                                type="text"
                                                value={bookingData.country}
                                                onChange={(e) => handleInputChange("country", e.target.value)}
                                                className="w-full p-3 border border-gray-300 dark:border-dark-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-dark-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                {t("booking.city")}
                                            </label>
                                            <input
                                                type="text"
                                                value={bookingData.city}
                                                onChange={(e) => handleInputChange("city", e.target.value)}
                                                className="w-full p-3 border border-gray-300 dark:border-dark-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-dark-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                                            />
                                        </div>
                                    </div>

                                    {/* Dates */}
                                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                <Calendar className="inline h-4 w-4 mr-1" />
                                                {t("booking.startDate")}
                                            </label>
                                            <input
                                                type="date"
                                                value={bookingData.start_date}
                                                onChange={(e) => handleInputChange("start_date", e.target.value)}
                                                className="w-full p-3 border border-gray-300 dark:border-dark-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-dark-900 text-gray-900 dark:text-gray-100"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                <Clock className="inline h-4 w-4 mr-1" />
                                                {t("booking.endDate")}
                                            </label>
                                            <input
                                                type="date"
                                                value={bookingData.end_date}
                                                onChange={(e) => handleInputChange("end_date", e.target.value)}
                                                className="w-full p-3 border border-gray-300 dark:border-dark-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-dark-900 text-gray-900 dark:text-gray-100"
                                                required
                                            />
                                        </div>
                                    </div>

                                    {/* Availability */}
                                    <div className="flex items-center gap-3 mb-8">
                                        <button
                                            type="button"
                                            onClick={handleCheckAvailability}
                                            disabled={checking}
                                            className="px-4 py-2 rounded-lg border border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-dark-800 transition-colors disabled:opacity-50"
                                        >
                                            {checking ? t("booking.checking") : t("booking.checkAvailability")}
                                        </button>
                                        <span className="text-sm text-gray-500 dark:text-gray-400">
                      {t("booking.checkHint")}
                    </span>
                                    </div>

                                    {/* Notes */}
                                    <div className="mb-8">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            {t("booking.notesLabel")}
                                        </label>
                                        <textarea
                                            value={bookingData.description}
                                            onChange={(e) => handleInputChange("description", e.target.value)}
                                            className="w-full p-3 border border-gray-300 dark:border-dark-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-dark-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                                            rows={4}
                                            placeholder={t("booking.requestsPlaceholder")}
                                        />
                                    </div>
                                </motion.div>

                                {/* Submit */}
                                <div className="flex justify-end pt-2">
                                    <button
                                        type="submit"
                                        className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                                    >
                                        {t("booking.requestBooking")}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Review */}
                        {reviewBookingId && (
                            <div className="bg-white dark:bg-dark-900 border border-gray-200 dark:border-dark-700 rounded-2xl p-8 shadow-sm mt-8 transition-colors">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t("booking.writeReview")}</h3>
                                </div>
                                {!reviewAllowed ? (
                                    <div className="text-gray-600 dark:text-gray-300">{t("booking.errOnlyCompletedReview")}</div>
                                ) : (
                                    <div className="grid gap-4">
                                        <div>
                                            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">{t("booking.rating")}</label>
                                            <Stars
                                                value={reviewForm.overall_rating}
                                                onChange={(v) => setReviewForm((x) => ({ ...x, overall_rating: v }))}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">{t("booking.commentOpt")}</label>
                                            <textarea
                                                rows={4}
                                                value={reviewForm.comment}
                                                onChange={(e) => setReviewForm((x) => ({ ...x, comment: e.target.value }))}
                                                className="w-full p-3 border border-gray-300 dark:border-dark-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-dark-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                                                placeholder={t("booking.shareExperience")}
                                            />
                                        </div>
                                        <div className="flex justify-end">
                                            <button
                                                onClick={submitReview}
                                                disabled={postingReview}
                                                className={`px-4 py-2 rounded-lg text-white ${postingReview ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"}`}
                                            >
                                                {postingReview ? t("booking.sending") : t("booking.submitReview")}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Summary */}
                    <div className="lg:col-span-1">
                        <div className="bg-white dark:bg-dark-900 border border-gray-200 dark:border-dark-700 rounded-2xl p-6 shadow-sm sticky top-24 transition-colors">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                {t("booking.summary")}
                            </h3>
                            <div className="flex items-center space-x-3 mb-6 pb-6 border-b border-gray-200 dark:border-dark-700">
                                {(guide?.avatar_url || guide?.user?.avatar_url) ? (
                                    <img
                                        src={guide.avatar_url || guide?.user?.avatar_url}
                                        alt={guide.full_name || guide?.user?.full_name || "Guide"}
                                        className="w-12 h-12 rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-dark-700" />
                                )}
                                <div>
                                    <h4 className="font-medium text-gray-900 dark:text-white">{guide.full_name}</h4>
                                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                                        <StarIcon className="h-3 w-3 text-yellow-400 fill-current mr-1" />
                                        <span>
                      {Number(guide.average_rating || 0).toFixed(1)} ({guide.total_reviews || 0} {t("common.reviews").toLowerCase()})
                    </span>
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center">
                                        <MapPin className="h-3 w-3 mr-1" />
                                        {guide.city || "—"}
                                    </p>
                                </div>
                            </div>
                            <div className="space-y-3 mb-6">
                                {bookingData.title && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-600 dark:text-gray-300">{t("booking.service")}</span>
                                        <span className="font-medium text-gray-900 dark:text-white">{bookingData.title}</span>
                                    </div>
                                )}
                                {bookingData.start_date && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-600 dark:text-gray-300">{t("booking.startDate")}</span>
                                        <span className="font-medium text-gray-900 dark:text-white">{bookingData.start_date}</span>
                                    </div>
                                )}
                                {bookingData.end_date && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-600 dark:text-gray-300">{t("booking.endDate")}</span>
                                        <span className="font-medium text-gray-900 dark:text-white">{bookingData.end_date}</span>
                                    </div>
                                )}
                                {selectedService && (
                                    <>
                                        {"hourly_rate" in selectedService && typeof selectedService.hourly_rate === "number" && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-600 dark:text-gray-300">{t("booking.rate")}</span>
                                                <span className="font-medium text-gray-900 dark:text-white">
                          ${selectedService.hourly_rate}/{t("booking.perHour")}
                        </span>
                                            </div>
                                        )}
                                        {"daily_rate" in selectedService && typeof selectedService.daily_rate === "number" && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-600 dark:text-gray-300">{t("booking.rate")}</span>
                                                <span className="font-medium text-gray-900 dark:text-white">
                          ${selectedService.daily_rate}/{t("booking.perDay")}
                        </span>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                            <div className="flex justify-between items-center text-lg font-bold text-gray-900 dark:text-white">
                                <span>{t("booking.total")}</span>
                                <span className="text-blue-600">—</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
