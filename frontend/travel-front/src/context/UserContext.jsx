import React, { createContext, useContext, useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

/** API base helper */
const API_BASE = (process.env.REACT_APP_API_URL ?? "/api/v1/").replace(/\/+$/, "/");

/** Backend role constants */
export const ROLE_GUIDE = "Customer"; // guide uchun backend roli
export const ROLE_TOURIST = "Client"; // tourist uchun backend roli

/** Normalizatsiya: kiruvchi role har xil yozilishi mumkin */
function normalizeRole(raw) {
    if (!raw || typeof raw !== "string") return null;
    const v = raw.trim().toLowerCase();
    if (["customer", "guide", "guides", "gid"].includes(v)) return ROLE_GUIDE;
    if (["client", "tourist", "traveler", "cliente"].includes(v)) return ROLE_TOURIST;
    if (raw === ROLE_GUIDE || raw === ROLE_TOURIST) return raw;
    return null;
}

/** Dashboard path builder */
export const getDashboardPath = (role) =>
    normalizeRole(role) === ROLE_GUIDE ? "/dashboard/guide" : "/dashboard/tourist";

const UserContext = createContext(undefined);

export const useUser = () => {
    const ctx = useContext(UserContext);
    if (!ctx) throw new Error("useUser must be used within a UserProvider");
    return ctx;
};

export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [accessToken, setAccessToken] = useState(null);
    const [refreshToken, setRefreshToken] = useState(null);
    const [isBootstrapping, setIsBootstrapping] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        const storedAccess = localStorage.getItem("access_token");
        const storedRefresh = localStorage.getItem("refresh_token");
        if (storedUser && storedAccess && storedRefresh) {
            try {
                const parsed = JSON.parse(storedUser);
                if (parsed && parsed.role) parsed.role = normalizeRole(parsed.role);
                setUser(parsed);
            } catch {}
            setAccessToken(storedAccess);
            setRefreshToken(storedRefresh);
            fetchMe(storedAccess, storedRefresh).finally(() => setIsBootstrapping(false));
        } else {
            setIsBootstrapping(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchMe = async (access, refresh) => {
        try {
            const res = await fetch(`${API_BASE}accounts/me/`, {
                headers: { Authorization: `Bearer ${access}` },
            });
            if (res.ok) {
                const data = await res.json();
                const normalized = { ...data, role: normalizeRole(data.role) };
                setUser(normalized);
                localStorage.setItem("user", JSON.stringify(normalized));
            } else if (res.status === 401) {
                const newAccess = await refreshAccessToken(refresh);
                if (newAccess) await fetchMe(newAccess, refreshToken || refresh);
                else logout();
            } else {
                logout();
            }
        } catch (e) {
            console.error(e);
            logout();
        }
    };

    const refreshAccessToken = async (refresh) => {
        try {
            const res = await fetch(`${API_BASE}accounts/refresh/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ refresh }),
            });
            if (res.ok) {
                const data = await res.json();
                if (data.access_token) {
                    setAccessToken(data.access_token);
                    localStorage.setItem("access_token", data.access_token);
                }
                if (data.refresh_token) {
                    setRefreshToken(data.refresh_token);
                    localStorage.setItem("refresh_token", data.refresh_token);
                }
                return data.access_token || null;
            }
        } catch (e) {
            console.error(e);
        }
        return null;
    };

    const login = (userData, access, refresh) => {
        const normalized = { ...userData, role: normalizeRole(userData?.role) };
        setUser(normalized);
        setAccessToken(access);
        setRefreshToken(refresh);
        localStorage.setItem("user", JSON.stringify(normalized));
        localStorage.setItem("access_token", access);
        localStorage.setItem("refresh_token", refresh);
    };

    const logout = async () => {
        try {
            const refresh = localStorage.getItem("refresh_token");
            if (refresh) {
                await fetch(`${API_BASE}accounts/logout/`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ refresh }),
                });
            }
        } catch (e) {
            console.error(e);
        }
        setUser(null);
        setAccessToken(null);
        setRefreshToken(null);
        localStorage.removeItem("user");
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
    };

    const role = normalizeRole(user?.role);
    const isAuthenticated = !!user;

    return (
        <UserContext.Provider
            value={{
                user,
                role,
                isAuthenticated,
                isBootstrapping,
                setUser,
                login,
                logout,
                accessToken,
                refreshAccessToken,
            }}
        >
            {children}
        </UserContext.Provider>
    );
};

/** Guard: only signed-in users */
export function AuthGuard() {
    const { isAuthenticated, isBootstrapping } = useUser();
    if (isBootstrapping) {
        return <div className="w-full py-24 text-center text-gray-500 dark:text-gray-400">Loading...</div>;
    }
    // ⬇️ Logoutsiz kirsa -> LandingPage
    if (!isAuthenticated) return <Navigate to="/" replace />;
    return <Outlet />;
}

/** Safer role guard (element-as-children pattern) */
export function RequireRole({ roles, children }) {
    const { isAuthenticated, isBootstrapping, role } = useUser();
    const location = useLocation();

    if (isBootstrapping) {
        return <div className="w-full py-24 text-center text-gray-500 dark:text-gray-400">Loading...</div>;
    }
    // ⬇️ Endi unauth -> '/' (Landing)
    if (!isAuthenticated) {
        return <Navigate to="/" replace state={{ from: location }} />;
    }
    if (!role) {
        return <Navigate to="/dashboard" replace />;
    }
    if (!roles.includes(role)) {
        return <Navigate to={getDashboardPath(role)} replace />;
    }
    return children;
}

/** /dashboard -> user ro‘liga mos bo‘lim */
export function DashboardRedirect() {
    const { isBootstrapping, isAuthenticated, role } = useUser();
    if (isBootstrapping) {
        return <div className="w-full py-24 text-center text-gray-500 dark:text-gray-400">Loading...</div>;
    }
    // ⬇️ Endi unauth -> '/'
    if (!isAuthenticated) return <Navigate to="/" replace />;
    return <Navigate to={getDashboardPath(role)} replace />;
}
