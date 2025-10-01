// src/api/reviews.js
// Handles reviews, responses, reactions.
// IDs UUIDs.

import api from './api';

export const getReviews = async (params) => {
    // GET /reviews/reviews/
    // Query params: customer (int/uuid?), client (int/uuid?), overall_rating (1-5), search (string), ordering (created_at/overall_rating/like_count/dislike_count)
    // Response: List { id (uuid), booking (uuid), client (short: id, first_name, last_name), customer (short: id, business_name, average_rating, total_reviews), overall_rating (1-5), ... all ratings, title, comment, is_published (bool), is_featured (bool), created_at, updated_at, like_count, dislike_count, reactions (list: id, reaction_type like/dislike, comment, created_at, user short), response ( {id, response_text, is_published, created_at, updated_at} ) }
    // Auth: None (public, only published)
    return api.get('reviews/reviews/', { params });
};

export const getReview = async (id) => {
    // GET /reviews/reviews/{id}/
    // Response: Details
    // Auth: None (public if published; owner for unpublished)
    return api.get(`reviews/reviews/${id}/`);
};

export const createReview = async (data, { booking_id }) => {
    if (!booking_id) throw new Error("booking_id is required");
    return api.post('reviews/reviews/', data, { params: { booking_id } });
};

export const updateReview = async (id, data) => {
    // PUT /reviews/reviews/{id}/
    // Body: Same as create + is_published (bool), etc. (owner editable)
    // Auth: Required (owner)
    return api.put(`reviews/reviews/${id}/`, data);
};

export const partialUpdateReview = async (id, data) => {
    // PATCH /reviews/reviews/{id}/
    // Auth: Required
    return api.patch(`reviews/reviews/${id}/`, data);
};

export const deleteReview = async (id) => {
    // DELETE /reviews/reviews/{id}/
    // Auth: Required (owner)
    return api.delete(`reviews/reviews/${id}/`);
};

export const reactToReview = async (id, data) => {
    // POST /reviews/reviews/{id}/react/
    // Body: { reaction_type: string (like/dislike required), comment: string (required for dislike, optional for like) }
    // Response: Created/Updated reaction { id, reaction_type, comment, created_at, user }
    // Auth: Required
    return api.post(`reviews/reviews/${id}/react/`, data);
};

export const unreactToReview = async (id) => {
    // DELETE /reviews/reviews/{id}/react/
    // Response: 204
    // Auth: Required
    return api.delete(`reviews/reviews/${id}/react/`);
};

export const getReviewReactions = async (id, params) => {
    // GET /reviews/reviews/{id}/reactions/
    // Query params: type (like/dislike optional)
    // Response: List of reactions
    // Auth: Required
    return api.get(`reviews/reviews/${id}/reactions/`, { params });
};

export const getReviewReactionsSummary = async (id) => {
    // GET /reviews/reviews/{id}/reactions/summary/
    // Response: { like_count, dislike_count, latest_likes (list), latest_dislikes (list) }
    // Auth: Required
    return api.get(`reviews/reviews/${id}/reactions/summary/`);
};

// Review Responses
export const createReviewResponse = async (data, params) => {
    // POST /reviews/responses/
    // Body: { response_text: string (required), is_published: bool (optional, default true) }
    // Query or body: review_id (uuid required)
    // Response: Created
    // Auth: Required (provider owner)
    return api.post('reviews/responses/', data, { params });
};

export const getReviewResponse = async (id) => {
    // GET /reviews/responses/{id}/
    // Response: Details
    // Auth: Required (owner)
    return api.get(`reviews/responses/${id}/`);
};

export const updateReviewResponse = async (id, data) => {
    // PUT /reviews/responses/{id}/
    // Body: Same
    // Auth: Required
    return api.put(`reviews/responses/${id}/`, data);
};

export const partialUpdateReviewResponse = async (id, data) => {
    // PATCH /reviews/responses/{id}/
    return api.patch(`reviews/responses/${id}/`, data);
};

export const deleteReviewResponse = async (id) => {
    // DELETE /reviews/responses/{id}/
    // Auth: Required/
    return api.delete(`reviews/responses/${id}/`);
};

// My Reviews
export const getMyReviews = async (params) => {
    // GET /reviews/my/
    // Query params: ordering (created_at optional)
    // Response: List of own reviews (as client)
    // Auth: Required
    return api.get('reviews/my/', { params });
};