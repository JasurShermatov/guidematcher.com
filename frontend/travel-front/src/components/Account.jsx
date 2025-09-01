// Account.jsx
import React from "react";
import { useLocation } from "react-router-dom";

const Account = ({ user }) => {
    const location = useLocation();

    if (!user) {
        return <div>Please login to view your account</div>;
    }

    return (
        <div className="account-container">
            <h2>My Profile</h2>
            <div className="profile-details">
                <p><strong>First Name:</strong> {user.first_name}</p>
                <p><strong>Last Name:</strong> {user.last_name}</p>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Role:</strong> {user.role}</p>
                <p><strong>Country:</strong> {user.country}</p>
                <p><strong>City:</strong> {user.city || "Not set"}</p>
            </div>
        </div>
    );
};

export default Account;