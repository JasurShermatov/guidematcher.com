import React from "react";
import { useLocation } from "react-router-dom";

const Account = ({ user }) => {
  const location = useLocation();

  if (!user) {
    return <div>Iltimos, tizimga kiring.</div>;
  }

  return (
    <div className="account-container">
      <h2>Profilim</h2>
      <div className="profile-details">
        <p><strong>Ism:</strong> {user.first_name}</p>
        <p><strong>Familiya:</strong> {user.last_name}</p>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Rol:</strong> {user.role}</p>
        <p><strong>Davlat:</strong> {user.country}</p>
        <p><strong>Shahar:</strong> {user.city || "Kiritilmagan"}</p>
      </div>
    </div>
  );
};

export default Account;