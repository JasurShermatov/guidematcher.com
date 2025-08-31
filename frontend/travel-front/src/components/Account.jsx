import React from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from 'react-i18next';

const Account = ({ user }) => {
    const { t } = useTranslation();
    const location = useLocation();

    if (!user) {
        return <div>{t('account.please_login')}</div>;
    }

    return (
        <div className="account-container">
            <h2>{t('account.my_profile')}</h2>
            <div className="profile-details">
                <p><strong>{t('account.first_name')}</strong> {user.first_name}</p>
                <p><strong>{t('account.last_name')}</strong> {user.last_name}</p>
                <p><strong>{t('account.email')}</strong> {user.email}</p>
                <p><strong>{t('account.role')}</strong> {user.role}</p>
                <p><strong>{t('account.country')}</strong> {user.country}</p>
                <p><strong>{t('account.city')}</strong> {user.city || t('account.not_set')}</p>
            </div>
        </div>
    );
};

export default Account;