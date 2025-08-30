// src/utils/translationFallback.js

// Translation fallback function
export const t = (key, options = {}) => {
    // Translation map with fallback values
    const translations = {
        // Profile sections
        "profile.loading": "Loading...",
        "profile.not_set": "Not set",
        "profile.verified": "Verified",
        "profile.unverified": "Unverified",
        "profile.available": "Available",
        "profile.unavailable": "Unavailable",
        "profile.years": "years",
        "profile.no_profile": "You haven't created a profile yet",
        "profile.no_profile_description": "Create your profile to start connecting with clients",
        "profile.select_city": "Select a city",

        // Profile fields
        "profile.fields.date_of_birth": "Date of Birth",
        "profile.fields.preferred_contact": "Preferred Contact",
        "profile.fields.languages": "Languages",
        "profile.fields.professional_bio": "Professional Bio",
        "profile.fields.years_experience": "Years of Experience",
        "profile.fields.service_types": "Service Types",
        "profile.fields.city": "City",
        "profile.fields.service_areas": "Service Areas",
        "profile.fields.hourly_rate": "Hourly Rate",
        "profile.fields.daily_rate": "Daily Rate",
        "profile.fields.availability_status": "Availability Status",

        // Contact methods
        "profile.contact_methods.email": "Email",
        "profile.contact_methods.phone": "Phone",
        "profile.contact_methods.chat": "In-app Chat",

        // Sections
        "profile.sections.personal_info": "Personal Information",
        "profile.sections.basic_info": "Basic Information",
        "profile.sections.services_pricing": "Services & Pricing",
        "profile.sections.account_stats": "Account Statistics",
        "profile.sections.completion": "Profile Completion",

        // Stats
        "profile.stats.member_since": "Member Since",
        "profile.stats.verification": "Verification Status",
        "profile.stats.country": "Country",
        "profile.stats.total_bookings": "Total Bookings",
        "profile.stats.average_rating": "Average Rating",
        "profile.stats.total_reviews": "Total Reviews",
        "profile.stats.verification_status": "Verification Status",
        "profile.stats.years_experience": "Years of Experience",
        "profile.stats.profile_completion": "Profile Completion",
        "profile.stats.response_rate": "Response Rate",
        "profile.stats.availability_rate": "Availability Rate",
        "profile.stats.performance": "Performance Metrics",
        "profile.stats.bookings": "bookings",

        // Actions
        "profile.actions.edit": "Edit Profile",
        "profile.actions.save": "Save Changes",
        "profile.actions.cancel": "Cancel",
        "profile.actions.logout": "Logout",
        "profile.actions.create_profile": "Create Profile",

        // Tabs
        "profile.tabs.profile": "Profile",
        "profile.tabs.portfolio": "Portfolio",
        "profile.tabs.availability": "Availability",
        "profile.tabs.documents": "Documents",
        "profile.tabs.statistics": "Statistics",

        // Errors
        "profile.errors.load_failed": "Failed to load profile",
        "profile.errors.save_failed": "Failed to save changes",

        // Success
        "profile.success.saved": "Profile saved successfully",

        // Validation
        "profile.validation.required_fields": "Please fill in all required fields",
        "profile.validation.bio_required": "Professional bio is required",

        // Verification
        "profile.verification.verified": "Verified",
        "profile.verification.pending": "Pending",
        "profile.verification.rejected": "Rejected",

        // Completion
        "profile.completion.good": "Your profile looks great!",
        "profile.completion.incomplete": "Complete your profile to get more visibility",

        // Portfolio
        "portfolio.add_item": "Add Item",
        "portfolio.fields.title": "Title",
        "portfolio.fields.description": "Description",
        "portfolio.fields.image": "Image",
        "portfolio.fields.order": "Order",
        "portfolio.add": "Add",
        "portfolio.update": "Update",
        "portfolio.cancel": "Cancel",
        "portfolio.success.created": "Portfolio item created successfully",
        "portfolio.success.updated": "Portfolio item updated successfully",
        "portfolio.success.deleted": "Portfolio item deleted successfully",
        "portfolio.errors.save_failed": "Failed to save portfolio item",
        "portfolio.errors.delete_failed": "Failed to delete portfolio item",
        "portfolio.confirm_delete": "Are you sure you want to delete this item?",

        // Availability
        "availability.fields.date": "Date",
        "availability.fields.status": "Status",
        "availability.fields.start_time": "Start Time",
        "availability.fields.end_time": "End Time",
        "availability.fields.note": "Note",
        "availability.available": "Available",
        "availability.unavailable": "Unavailable",
        "availability.note_placeholder": "Optional note",
        "availability.add": "Add",
        "availability.update": "Update",
        "availability.cancel": "Cancel",
        "availability.success.created": "Availability added successfully",
        "availability.success.updated": "Availability updated successfully",
        "availability.success.deleted": "Availability deleted successfully",
        "availability.errors.save_failed": "Failed to save availability",
        "availability.errors.delete_failed": "Failed to delete availability",
        "availability.confirm_delete": "Are you sure you want to delete this availability?",

        // Documents
        "documents.fields.type": "Document Type",
        "documents.fields.file": "File",
        "documents.fields.description": "Description",
        "documents.types.id_card": "ID Card",
        "documents.types.passport": "Passport",
        "documents.types.license": "Professional License",
        "documents.types.certificate": "Certificate",
        "documents.types.other": "Other",
        "documents.description_placeholder": "Optional description",
        "documents.upload": "Upload",
        "documents.verified": "Verified",
        "documents.pending": "Pending",
        "documents.view": "View",
        "documents.success.uploaded": "Document uploaded successfully",
        "documents.success.deleted": "Document deleted successfully",
        "documents.errors.upload_failed": "Failed to upload document",
        "documents.errors.delete_failed": "Failed to delete document",
        "documents.confirm_delete": "Are you sure you want to delete this document?",

        // Placeholders
        "profile.placeholders.professional_bio": "Tell clients about your experience and services...",
        "profile.placeholders.service_areas": "Describe the areas where you provide services..."
    };

    // Replace variables in translations
    let translation = translations[key] || key;

    if (options && typeof options === 'object') {
        Object.keys(options).forEach(placeholder => {
            translation = translation.replace(`{{${placeholder}}}`, options[placeholder]);
        });
    }

    return translation;
};

export default t;