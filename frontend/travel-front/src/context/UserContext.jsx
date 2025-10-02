import React, { createContext, useContext, useEffect, useState } from "react";

const API_BASE = (process.env.REACT_APP_API_URL ?? "/api/v1/").replace(/\/+$/, "/");
export const ROLE_GUIDE = "customer";
export const ROLE_TOURIST = "client";

function normalizeRole(raw) {
    if (!raw) return null;
    const v = String(raw).trim().toLowerCase();
    if (["customer", "guide", "gid", "provider"].includes(v)) return "customer";
    if (["client", "tourist", "traveler"].includes(v)) return "client";
    return v;
}

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
    const [accessToken, setAccessToken] = useState(localStorage.getItem("access_token"));
    const [refreshToken, setRefreshToken] = useState(localStorage.getItem("refresh_token"));
    const [isBootstrapping, setIsBootstrapping] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (storedUser && accessToken && refreshToken) {
            try {
                const parsed = JSON.parse(storedUser);
                parsed.role = normalizeRole(parsed.role);
                setUser(parsed);
            } catch {}
            fetchMe(accessToken, refreshToken).finally(() => setIsBootstrapping(false));
        } else {
            setIsBootstrapping(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchMe = async (access, refresh) => {
        try {
            const res = await fetch(`${API_BASE}auth/users/me/`, {
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
            const res = await fetch(`${API_BASE}token/refresh/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ refresh }),
            });
            if (res.ok) {
                const data = await res.json();
                if (data.access) {
                    setAccessToken(data.access);
                    localStorage.setItem("access_token", data.access);
                }
                if (data.refresh) {
                    setRefreshToken(data.refresh);
                    localStorage.setItem("refresh_token", data.refresh);
                }
                return data.access || null;
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

export function AuthGuard() {
    const { isAuthenticated, isBootstrapping } = useUser();
    if (isBootstrapping) return <div className="w-full py-24 text-center text-gray-500">Loading...</div>;
    if (!isAuthenticated) return <div className="w-full py-24 text-center">Please sign in</div>;
    return <OutletShim />;
}

// Outlet shim (react-router v6 outlet talab qilganimiz uchun)
const OutletShim = ({ children }) => children || <div />;

export function RequireRole({ roles, children }) {
    const { isAuthenticated, isBootstrapping, role } = useUser();
    if (isBootstrapping) return <div className="w-full py-24 text-center text-gray-500">Loading...</div>;
    if (!isAuthenticated) return <div className="w-full py-24 text-center">Please sign in</div>;
    if (!role) return <div className="w-full py-24 text-center">No role detected</div>;
    if (!roles.includes(role)) return <div className="w-full py-24 text-center">Unauthorized</div>;
    return children;
}

export function DashboardRedirect() {
    const { isBootstrapping, isAuthenticated, role } = useUser();
    if (isBootstrapping) return <div className="w-full py-24 text-center text-gray-500">Loading...</div>;
    if (!isAuthenticated) return <NavigateShim to="/" />;
    return <NavigateShim to={getDashboardPath(role)} />;
}

// Navigate shim (hooklarsiz oddiy render)
const NavigateShim = ({ to }) => {
    useEffect(() => { window.location.replace(to); }, [to]);
    return null;
};
