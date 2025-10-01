import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, Globe, RotateCcw } from "lucide-react";
import toast from "react-hot-toast";
import { useLanguage } from "../context/LanguageContext";
import { useUser, getDashboardPath } from "../context/UserContext";

const API_BASE = (process.env.REACT_APP_API_URL ?? "/api/v1/").replace(/\/+$/, "/");

const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const countries = [
    'Afghanistan','Albania','Algeria','Andorra','Angola','Antigua and Barbuda','Argentina','Armenia','Australia',
    'Austria','Azerbaijan','Bahamas','Bahrain','Bangladesh','Barbados','Belarus','Belgium','Belize','Benin',
    'Bhutan','Bolivia','Bosnia and Herzegovina','Botswana','Brazil','Brunei','Bulgaria','Burkina Faso','Burundi',
    'Cabo Verde','Cambodia','Cameroon','Canada','Central African Republic','Chad','Chile','China','Colombia',
    'Comoros','Congo (Congo-Brazzaville)','Costa Rica','Croatia','Cuba','Cyprus','Czechia (Czech Republic)',
    'Denmark','Djibouti','Dominica','Dominican Republic','Ecuador','Egypt','El Salvador','Equatorial Guinea',
    'Eritrea','Estonia','Eswatini','Ethiopia','Fiji','Finland','France','Gabon','Gambia','Georgia','Germany',
    'Ghana','Greece','Grenada','Guatemala','Guinea','Guinea-Bissau','Guyana','Haiti','Honduras','Hungary',
    'Iceland','India','Indonesia','Iran','Iraq','Ireland','Israel','Italy','Jamaica','Japan','Jordan',
    'Kazakhstan','Kenya','Kiribati','Korea, North','Korea, South','Kuwait','Kyrgyzstan','Laos','Latvia',
    'Lebanon','Lesotho','Liberia','Libya','Liechtenstein','Lithuania','Luxembourg','Madagascar','Malawi',
    'Malaysia','Maldives','Mali','Malta','Marshall Islands','Mauritania','Mauritius','Mexico','Micronesia',
    'Moldova','Monaco','Mongolia','Montenegro','Morocco','Mozambique','Myanmar (Burma)','Namibia','Nauru',
    'Nepal','Netherlands','New Zealand','Nicaragua','Niger','Nigeria','North Macedonia','Norway','Oman',
    'Pakistan','Palau','Palestine State','Panama','Papua New Guinea','Paraguay','Peru','Philippines','Poland',
    'Portugal','Qatar','Romania','Russia','Rwanda','Saint Kitts and Nevis','Saint Lucia','Saint Vincent and the Grenadines',
    'Samoa','San Marino','Sao Tome and Principe','Saudi Arabia','Senegal','Serbia','Seychelles','Sierra Leone',
    'Singapore','Slovakia','Slovenia','Solomon Islands','Somalia','South Africa','South Sudan','Spain','Sri Lanka',
    'Sudan','Suriname','Sweden','Switzerland','Syria','Taiwan','Tajikistan','Tanzania','Thailand','Timor-Leste',
    'Togo','Tonga','Trinidad and Tobago','Tunisia','Turkey','Turkmenistan','Tuvalu','Uganda','Ukraine',
    'United Arab Emirates','United Kingdom','United States','Uruguay','Uzbekistan','Vanuatu','Vatican City',
    'Venezuela','Vietnam','Yemen','Zambia','Zimbabwe',
];

export default function AuthPage({ userType }) {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const { login, isAuthenticated, user } = useUser();

    const [activeTab, setActiveTab] = useState("login"); // 'login' | 'register' | 'forgot'
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isAuthenticated && user?.role) {
            navigate(getDashboardPath(user.role), { replace: true });
        }
    }, [isAuthenticated, user?.role, navigate]);

    const [verificationStep, setVerificationStep] = useState(false);
    const [verificationCode, setVerificationCode] = useState("");
    const [resendLeft, setResendLeft] = useState(0);

    const [forgotStep, setForgotStep] = useState(false);
    const [countrySuggestions, setCountrySuggestions] = useState([]);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const countryInputRef = useRef(null);

    const authMode = userType || "tourist";

    const [loginForm, setLoginForm] = useState({ email: "", password: "" });
    const [registerForm, setRegisterForm] = useState({
        role: authMode === "guide" ? "Customer" : "Client",
        first_name: "",
        last_name: "",
        email: "",
        password: "",
        confirm_password: "",
        country: "",
        userType: authMode,
    });
    const [forgotForm, setForgotForm] = useState({
        email: "",
        code: "",
        new_password: "",
        confirm_password: "",
    });

    useEffect(() => {
        if (authMode === "guide") {
            setRegisterForm((p) => ({ ...p, role: "Customer", userType: "guide" }));
        } else {
            setRegisterForm((p) => ({ ...p, role: "Client", userType: "tourist" }));
        }
    }, [authMode]);

    useEffect(() => {
        if (!verificationStep || resendLeft <= 0) return;
        const tmr = setInterval(() => setResendLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
        return () => clearInterval(tmr);
    }, [verificationStep, resendLeft]);

    const clearMessages = () => {
        setError("");
        setSuccessMessage("");
    };

    const handleLoginChange = (e) => {
        setLoginForm({ ...loginForm, [e.target.name]: e.target.value });
        clearMessages();
    };

    const handleRegisterChange = (e) => {
        const { name, value } = e.target;
        setRegisterForm({ ...registerForm, [name]: value });
        clearMessages();

        if (name === "country") {
            const filtered = countries
                .filter((c) => c.toLowerCase().startsWith(value.toLowerCase()))
                .slice(0, 5);
            setCountrySuggestions(filtered);
        }

        if (name === "password" || name === "confirm_password") {
            const pwd = name === "password" ? value : registerForm.password;
            const confirm = name === "confirm_password" ? value : registerForm.confirm_password;
            if (value && !passwordRegex.test(value)) {
                setError(
                    "Password must contain at least 8 characters, one uppercase, one lowercase, one number and one special character"
                );
            } else if (pwd && confirm && pwd !== confirm) {
                setError("Passwords do not match");
            } else {
                setError("");
            }
        }
    };

    const handleForgotChange = (e) => {
        const { name, value } = e.target;
        setForgotForm({ ...forgotForm, [name]: value });
        clearMessages();
    };

    const handleCountrySelect = (country) => {
        setRegisterForm({ ...registerForm, country });
        setCountrySuggestions([]);
    };

    // API helpers
    const requestVerificationCode = async (email) => {
        const res = await fetch(`${API_BASE}accounts/request-code/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) return data;
        throw data;
    };

    const resendVerificationCode = async () => {
        if (resendLeft > 0) return;
        const email = registerForm.email?.toLowerCase().trim();
        if (!email) return toast.error("Email is empty");
        try {
            const data = await requestVerificationCode(email);
            toast.success(data?.message || "Verification code re-sent");
            setResendLeft(60);
        } catch (err) {
            toast.error(
                (err && typeof err === "object" && (err.message || Object.values(err)[0])) ||
                "Failed to resend code"
            );
        }
    };

    // Submits
    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        clearMessages();
        setIsLoading(true);
        try {
            const { email, password } = loginForm;
            if (!email || !password) {
                toast.error("All fields required");
                setIsLoading(false);
                return;
            }
            const res = await fetch(`${API_BASE}accounts/login/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: email.toLowerCase().trim(),
                    password,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                const access = data.access_token || data.access;
                const refresh = data.refresh_token || data.refresh;
                if (!access || !refresh) {
                    toast.error("Auth tokens missing");
                    setIsLoading(false);
                    return;
                }
                login(data.user, access, refresh);
                navigate(getDashboardPath(data.user.role), { replace: true });
            } else {
                toast.error((typeof data === "object" && Object.values(data)[0]) || "Login failed");
            }
        } catch {
            toast.error("Network error");
        }
        setIsLoading(false);
    };

    const handleRegisterSubmit = async (e) => {
        e.preventDefault();
        clearMessages();
        setIsLoading(true);
        try {
            const { role, first_name, last_name, email, password, confirm_password, country } = registerForm;
            if (!role || !first_name || !last_name || !email || !password || !confirm_password || !country) {
                toast.error("All fields required");
                setIsLoading(false);
                return;
            }
            if (password !== confirm_password) {
                toast.error("Passwords do not match");
                setIsLoading(false);
                return;
            }
            if (!passwordRegex.test(password)) {
                toast.error("Invalid password format");
                setIsLoading(false);
                return;
            }

            const emailNorm = email.toLowerCase().trim();
            try {
                const data = await requestVerificationCode(emailNorm);
                toast.success(data?.message || "Verification code sent");
            } catch (err) {
                toast.error(
                    (err && typeof err === "object" && (err.message || Object.values(err)[0])) ||
                    "Verification request failed"
                );
            }
            setVerificationStep(true);
            setResendLeft(60);
        } catch {
            toast.error("Network error");
        }
        setIsLoading(false);
    };

    const handleVerifyCode = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        if (!verificationCode || !/^\d{6}$/.test(verificationCode)) {
            toast.error("Invalid code");
            setIsLoading(false);
            return;
        }
        const { role, first_name, last_name, email, password, country } = registerForm;
        try {
            const res = await fetch(`${API_BASE}accounts/register/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    role,
                    first_name,
                    last_name,
                    email: email.toLowerCase().trim(),
                    password,
                    country,
                    code: verificationCode,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                const access = data.access_token || data.access;
                const refresh = data.refresh_token || data.refresh;
                if (!access || !refresh) {
                    toast.error("Auth tokens missing");
                    setIsLoading(false);
                    return;
                }
                login(data.user, access, refresh);
                navigate(getDashboardPath(data.user.role), { replace: true });
            } else {
                toast.error((typeof data === "object" && Object.values(data)[0]) || "Registration failed");
            }
        } catch {
            toast.error("Network error");
        }
        setIsLoading(false);
    };

    // Forgot password (AuthPage ichida)
    const handleForgotSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        if (!forgotForm.email) {
            toast.error("Email required");
            setIsLoading(false);
            return;
        }
        try {
            const res = await fetch(`${API_BASE}accounts/forgot-password/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: forgotForm.email.toLowerCase().trim() }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message || "Code sent to your email");
                setForgotStep(true);
            } else {
                toast.error((typeof data === "object" && Object.values(data)[0]) || "Request failed");
            }
        } catch {
            toast.error("Network error");
        }
        setIsLoading(false);
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        const { email, code, new_password, confirm_password } = forgotForm;
        if (new_password !== confirm_password) {
            toast.error("Passwords do not match");
            setIsLoading(false);
            return;
        }
        if (!passwordRegex.test(new_password)) {
            toast.error("Invalid password format");
            setIsLoading(false);
            return;
        }
        if (!/^\d{6}$/.test(code)) {
            toast.error("Invalid code");
            setIsLoading(false);
            return;
        }
        try {
            const res = await fetch(`${API_BASE}accounts/reset-password/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.toLowerCase().trim(), code, new_password }),
            });
            if (res.ok) {
                toast.success("Password reset successful");
                setActiveTab("login");
                setForgotStep(false);
            } else {
                const data = await res.json();
                toast.error((typeof data === "object" && Object.values(data)[0]) || "Reset failed");
            }
        } catch {
            toast.error("Network error");
        }
        setIsLoading(false);
    };

    const switchTab = (tab) => {
        setActiveTab(tab);
        setVerificationStep(false);
        setForgotStep(false);
        setCountrySuggestions([]);
        setError("");
        setSuccessMessage("");
    };

    const SwitchLinks = () => (
        <div className="flex flex-col space-y-2 mt-4">
            {activeTab !== "login" && (
                <button onClick={() => switchTab("login")} className="text-red-600 hover:underline" type="button">
                    Login
                </button>
            )}
            {activeTab !== "register" && (
                <button onClick={() => switchTab("register")} className="text-red-600 hover:underline" type="button">
                    Register
                </button>
            )}
            {activeTab !== "forgot" && (
                <button onClick={() => switchTab("forgot")} className="text-red-600 hover:underline" type="button">
                    Forgot Password
                </button>
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-dark-950 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <Globe className="h-12 w-12 text-red-600 mx-auto" />
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
                        {activeTab === "login" ? t("auth.signIn") || "Sign In" : activeTab === "register" ? t("auth.signUp") || "Sign Up" : "Forgot Password"}
                    </h2>
                </div>

                {error && <div className="bg-red-100 text-red-700 p-2 rounded">{error}</div>}
                {successMessage && <div className="bg-green-100 text-green-700 p-2 rounded">{successMessage}</div>}

                {/* LOGIN */}
                {activeTab === "login" && (
                    <form onSubmit={handleLoginSubmit} className="space-y-4">
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                name="email"
                                type="email"
                                value={loginForm.email}
                                onChange={handleLoginChange}
                                placeholder="Email"
                                className="pl-10 p-3 border rounded w-full"
                                required
                            />
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                name="password"
                                type={showPassword ? "text" : "password"}
                                value={loginForm.password}
                                onChange={handleLoginChange}
                                placeholder="Password"
                                className="pl-10 pr-10 p-3 border rounded w-full"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2"
                                aria-label="Toggle password"
                            >
                                {showPassword ? <EyeOff /> : <Eye />}
                            </button>
                        </div>
                        <button type="submit" disabled={isLoading} className="w-full bg-red-600 text-white p-3 rounded">
                            {isLoading ? "Loading..." : "Sign In"}
                        </button>
                        <SwitchLinks />
                    </form>
                )}

                {/* REGISTER */}
                {activeTab === "register" && (
                    <div>
                        {!verificationStep ? (
                            <form onSubmit={handleRegisterSubmit} className="space-y-4">
                                <select name="role" value={registerForm.role} onChange={handleRegisterChange} className="w-full p-3 border rounded">
                                    <option value="Customer">Guide</option>
                                    <option value="Client">Tourist</option>
                                </select>

                                <input name="first_name" value={registerForm.first_name} onChange={handleRegisterChange} placeholder="First name" className="w-full p-3 border rounded" />
                                <input name="last_name" value={registerForm.last_name} onChange={handleRegisterChange} placeholder="Last name" className="w-full p-3 border rounded" />
                                <input name="email" type="email" value={registerForm.email} onChange={handleRegisterChange} placeholder="Email" className="w-full p-3 border rounded" />

                                <div className="relative">
                                    <input name="password" type={showConfirmPassword ? "text" : "password"} value={registerForm.password} onChange={handleRegisterChange} placeholder="Password" className="w-full p-3 border rounded pr-10" />
                                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2" aria-label="Toggle password">
                                        {showConfirmPassword ? <EyeOff /> : <Eye />}
                                    </button>
                                </div>

                                <div className="relative">
                                    <input name="confirm_password" type={showConfirmNewPassword ? "text" : "password"} value={registerForm.confirm_password} onChange={handleRegisterChange} placeholder="Confirm password" className="w-full p-3 border rounded pr-10" />
                                    <button type="button" onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2" aria-label="Toggle confirm password">
                                        {showConfirmNewPassword ? <EyeOff /> : <Eye />}
                                    </button>
                                </div>

                                <div className="relative">
                                    <input name="country" ref={countryInputRef} value={registerForm.country} onChange={handleRegisterChange} placeholder="Country" className="w-full p-3 border rounded" />
                                    {countrySuggestions.length > 0 && (
                                        <div className="absolute z-10 mt-1 w-full bg-white border rounded shadow">
                                            {countrySuggestions.map((c) => (
                                                <button type="button" key={c} className="block w-full text-left px-3 py-2 hover:bg-gray-100" onClick={() => handleCountrySelect(c)}>
                                                    {c}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <button type="submit" disabled={isLoading} className="w-full bg-red-600 text-white p-3 rounded">
                                    {isLoading ? "Loading..." : "Request Code"}
                                </button>

                                <div className="text-center text-sm text-gray-500 mt-2">
                                    Already have a code?{" "}
                                    <button type="button" onClick={() => { setVerificationStep(true); setResendLeft(0); }} className="text-red-600 hover:underline">
                                        Enter code
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <form onSubmit={handleVerifyCode} className="space-y-4">
                                <input
                                    type="text"
                                    value={verificationCode}
                                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                    placeholder="6-digit code"
                                    maxLength={6}
                                    className="w-full p-3 border rounded"
                                />

                                <button type="submit" className="w-full bg-red-600 text-white p-3 rounded">Verify</button>

                                <button
                                    type="button"
                                    onClick={resendVerificationCode}
                                    disabled={resendLeft > 0}
                                    className="w-full mt-2 inline-flex items-center justify-center border border-gray-300 dark:border-white/10 rounded p-2 text-sm hover:bg-gray-50 dark:hover:bg-white/10"
                                    title="Resend code"
                                >
                                    <RotateCcw className="h-4 w-4 mr-2" />
                                    {resendLeft > 0 ? `Resend in ${resendLeft}s` : "Resend code"}
                                </button>

                                <div className="text-center text-xs text-gray-500">
                                    Didn’t get email? You can still enter the code you see in DB.
                                </div>
                            </form>
                        )}
                        <SwitchLinks />
                    </div>
                )}

                {/* FORGOT */}
                {activeTab === "forgot" && (
                    <div className="space-y-4">
                        {!forgotStep ? (
                            <form onSubmit={handleForgotSubmit} className="space-y-4">
                                <input name="email" type="email" value={forgotForm.email} onChange={handleForgotChange} placeholder="Email" className="w-full p-3 border rounded" required />
                                <button type="submit" disabled={isLoading} className="w-full bg-red-600 text-white p-3 rounded">
                                    {isLoading ? "Loading..." : "Send Code"}
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={handleResetPassword} className="space-y-4">
                                <input name="code" value={forgotForm.code} onChange={handleForgotChange} placeholder="6-digit code" className="w-full p-3 border rounded" maxLength={6} />
                                <div className="relative">
                                    <input name="new_password" type={showNewPassword ? "text" : "password"} value={forgotForm.new_password} onChange={handleForgotChange} placeholder="New password" className="w-full p-3 border rounded pr-10" />
                                    <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2" aria-label="Toggle new password">
                                        {showNewPassword ? <EyeOff /> : <Eye />}
                                    </button>
                                </div>
                                <div className="relative">
                                    <input name="confirm_password" type={showConfirmNewPassword ? "text" : "password"} value={forgotForm.confirm_password} onChange={handleForgotChange} placeholder="Confirm new password" className="w-full p-3 border rounded pr-10" />
                                    <button type="button" onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2" aria-label="Toggle confirm new password">
                                        {showConfirmNewPassword ? <EyeOff /> : <Eye />}
                                    </button>
                                </div>
                                <button type="submit" disabled={isLoading} className="w-full bg-red-600 text-white p-3 rounded">
                                    {isLoading ? "Loading..." : "Reset Password"}
                                </button>
                            </form>
                        )}
                        <SwitchLinks />
                    </div>
                )}
            </div>
        </div>
    );
}