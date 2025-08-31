// src/components/common/DebugHelper.jsx
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiInfo, FiUser, FiSettings, FiX } from 'react-icons/fi';

const DebugHelper = ({ user, isAuthenticated }) => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);

    // Only show in development
    if (process.env.NODE_ENV !== 'development') {
        return null;
    }

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                style={{
                    position: 'fixed',
                    bottom: '20px',
                    right: '20px',
                    width: '50px',
                    height: '50px',
                    borderRadius: '50%',
                    background: '#667eea',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.2rem',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    zIndex: 1000
                }}
            >
                <FiInfo />
            </button>

            {isOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.7)',
                    zIndex: 1001,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}>
                    <div style={{
                        background: 'white',
                        borderRadius: '12px',
                        padding: '30px',
                        maxWidth: '600px',
                        maxHeight: '80vh',
                        overflow: 'auto',
                        position: 'relative'
                    }}>
                        <button
                            onClick={() => setIsOpen(false)}
                            style={{
                                position: 'absolute',
                                top: '15px',
                                right: '15px',
                                background: 'none',
                                border: 'none',
                                fontSize: '1.2rem',
                                cursor: 'pointer'
                            }}
                        >
                            <FiX />
                        </button>

                        <h2 style={{ marginBottom: '20px', color: '#333' }}>
                            <FiSettings style={{ marginRight: '10px' }} />
                            {t('debug.title')}
                        </h2>

                        <div style={{ marginBottom: '20px' }}>
                            <h3 style={{ color: '#667eea', marginBottom: '10px' }}>
                                <FiUser style={{ marginRight: '8px' }} />
                                {t('debug.auth_status')}
                            </h3>
                            <div style={{
                                background: isAuthenticated ? '#e8f5e8' : '#ffe8e8',
                                padding: '15px',
                                borderRadius: '8px',
                                border: `1px solid ${isAuthenticated ? '#4CAF50' : '#f44336'}`
                            }}>
                                <p><strong>{t('debug.is_authenticated')}</strong> {isAuthenticated ? '✅ Yes' : '❌ No'}</p>
                                <p><strong>{t('debug.access_token')}</strong> {localStorage.getItem('access_token') ? '✅ Present' : '❌ Missing'}</p>
                                <p><strong>{t('debug.refresh_token')}</strong> {localStorage.getItem('refresh_token') ? '✅ Present' : '❌ Missing'}</p>
                            </div>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <h3 style={{ color: '#667eea', marginBottom: '10px' }}>{t('debug.profile_data')}</h3>
                            <div style={{
                                background: '#f0f8ff',
                                padding: '15px',
                                borderRadius: '8px',
                                border: '1px solid #667eea'
                            }}>
                                <p><strong>{t('debug.has_profile')}</strong> {user?.profile_id ? '✅ Yes' : '❌ No'}</p>
                                <p><strong>{t('debug.profile_id')}</strong> {user?.profile_id || 'Not set'}</p>
                                <p><strong>{t('debug.role')}</strong> {user?.role || 'Not set'}</p>
                                <p><strong>{t('debug.user_id')}</strong> {user?.id || 'Not set'}</p>
                            </div>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <h3 style={{ color: '#667eea', marginBottom: '10px' }}>{t('debug.user_data')}</h3>
                            <div style={{
                                background: '#f5f5f5',
                                padding: '15px',
                                borderRadius: '8px',
                                border: '1px solid #ddd'
                            }}>
                                {user ? (
                                    <pre style={{
                                        margin: 0,
                                        fontSize: '12px',
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word'
                                    }}>
                                        {JSON.stringify(user, null, 2)}
                                    </pre>
                                ) : (
                                    <p style={{ margin: 0, color: '#666' }}>{t('debug.no_user_data')}</p>
                                )}
                            </div>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <h3 style={{ color: '#667eea', marginBottom: '10px' }}>{t('debug.api_config')}</h3>
                            <div style={{
                                background: '#f0f8ff',
                                padding: '15px',
                                borderRadius: '8px',
                                border: '1px solid #667eea'
                            }}>
                                <p><strong>{t('debug.api_url')}</strong> {process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1/'}</p>
                                <p><strong>{t('debug.environment')}</strong> {process.env.NODE_ENV}</p>
                                <p><strong>{t('debug.debug_mode')}</strong> {process.env.REACT_APP_DEBUG || 'false'}</p>
                            </div>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <h3 style={{ color: '#667eea', marginBottom: '10px' }}>{t('debug.quick_actions')}</h3>
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                <button
                                    onClick={() => {
                                        localStorage.removeItem('access_token');
                                        localStorage.removeItem('refresh_token');
                                        window.location.reload();
                                    }}
                                    style={{
                                        padding: '8px 16px',
                                        background: '#f44336',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontSize: '0.9rem'
                                    }}
                                >
                                    {t('debug.clear_tokens')}
                                </button>
                                <button
                                    onClick={() => window.location.reload()}
                                    style={{
                                        padding: '8px 16px',
                                        background: '#2196F3',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontSize: '0.9rem'
                                    }}
                                >
                                    {t('debug.reload_page')}
                                </button>
                                <button
                                    onClick={() => console.log('User data:', user)}
                                    style={{
                                        padding: '8px 16px',
                                        background: '#4CAF50',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontSize: '0.9rem'
                                    }}
                                >
                                    {t('debug.log_console')}
                                </button>
                            </div>
                        </div>

                        <div style={{
                            fontSize: '0.8rem',
                            color: '#666',
                            textAlign: 'center',
                            borderTop: '1px solid #eee',
                            paddingTop: '15px'
                        }}>
                            {t('debug.note')}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default DebugHelper;