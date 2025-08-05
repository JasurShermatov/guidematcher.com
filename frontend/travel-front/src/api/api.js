import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://backend:8000/api/v1/";

const api = axios.create({
  baseURL: API_URL,
  headers: { 
    "Content-Type": "application/json",
    "Accept": "application/json"
  },
  withCredentials: true,
  timeout: 30000, // 30 seconds timeout
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log request for debugging
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`, {
      data: config.data,
      headers: config.headers
    });
    
    return config;
  },
  (error) => {
    console.error("Request interceptor error:", error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    // Log successful response
    console.log(`API Response: ${response.status} ${response.config.url}`, response.data);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    console.error("API Error:", {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });

    // Handle 401 errors (token refresh)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const refreshToken = localStorage.getItem("refresh_token");
      if (refreshToken) {
        try {
          console.log("Attempting to refresh token...");
          const refreshResponse = await api.post("accounts/refresh/", {
            refresh: refreshToken,
          });
          
          const newAccessToken = refreshResponse.data.access;
          localStorage.setItem("access_token", newAccessToken);
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          
          console.log("Token refreshed successfully");
          return api(originalRequest);
        } catch (refreshError) {
          console.error("Token refresh failed:", refreshError);
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          window.location.href = "/login";
          return Promise.reject(refreshError);
        }
      }
    }

    // Extract error message from response
    let errorMessage = "Noma'lum xatolik yuz berdi";
    
    if (error.response?.data) {
      const data = error.response.data;
      
      // Handle different error response formats
      if (typeof data === 'string') {
        errorMessage = data;
      } else if (data.detail) {
        errorMessage = data.detail;
      } else if (data.message) {
        errorMessage = data.message;
      } else if (data.error) {
        errorMessage = data.error;
      } else if (data.email && Array.isArray(data.email)) {
        errorMessage = data.email[0];
      } else if (data.code && Array.isArray(data.code)) {
        errorMessage = data.code[0];
      } else if (data.password && Array.isArray(data.password)) {
        errorMessage = data.password[0];
      } else if (data.non_field_errors && Array.isArray(data.non_field_errors)) {
        errorMessage = data.non_field_errors[0];
      } else {
        // Try to get first error from any field
        const firstKey = Object.keys(data)[0];
        if (firstKey && data[firstKey]) {
          if (Array.isArray(data[firstKey])) {
            errorMessage = data[firstKey][0];
          } else {
            errorMessage = data[firstKey];
          }
        }
      }
    } else if (error.message) {
      errorMessage = error.message;
    }

    // Handle specific HTTP status codes
    if (error.response?.status === 500) {
      errorMessage = "Server xatoligi yuz berdi. Iltimos, keyinroq qaytadan urinib ko'ring.";
    } else if (error.response?.status === 404) {
      errorMessage = "So'ralgan resurs topilmadi.";
    } else if (error.response?.status === 403) {
      errorMessage = "Bu amalni bajarish uchun ruxsatingiz yo'q.";
    } else if (error.response?.status === 429) {
      errorMessage = "Juda ko'p so'rov yuborildi. Iltimos, biroz kutib qaytadan urinib ko'ring.";
    } else if (!error.response) {
      errorMessage = "Internet aloqasi bilan bog'liq muammo. Iltimos, internetingizni tekshiring.";
    }

    return Promise.reject(new Error(errorMessage));
  }
);

// API Functions
export const requestCode = async (data) => {
  try {
    console.log("Requesting verification code with data:", data);
    
    const requestData = {
      email: data.email,
      code_type: data.code_type || "registration"
    };
    
    const response = await api.post("accounts/request-code/", requestData);
    console.log("Verification code request successful:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error in requestCode:", error);
    throw error;
  }
};

export const registerUser = async (payload) => {
  try {
    console.log("Registering user with payload:", {
      ...payload,
      password: "[HIDDEN]" // Don't log password
    });
    
    const registrationData = {
      role: payload.role,
      first_name: payload.first_name,
      last_name: payload.last_name,
      email: payload.email,
      password: payload.password,
      country: payload.country,
      code: payload.code
    };
    
    const response = await api.post("accounts/register/", registrationData);
    console.log("User registration successful:", {
      ...response.data,
      access_token: "[HIDDEN]",
      refresh_token: "[HIDDEN]"
    });
    
    return response.data;
  } catch (error) {
    console.error("Error in registerUser:", error);
    throw error;
  }
};

export const loginUser = async (payload) => {
  try {
    console.log("Logging in user with email:", payload.email);
    
    const loginData = {
      email: payload.email,
      password: payload.password
    };
    
    const response = await api.post("accounts/login/", loginData);
    
    console.log("User login successful");
    
    // Transform response to match expected format
    return {
      access: response.data.access_token,
      refresh: response.data.refresh_token,
      user: {
        id: response.data.user.id,
        role: response.data.user.role,
        full_name: `${response.data.user.first_name} ${response.data.user.last_name}`,
        email: response.data.user.email,
        first_name: response.data.user.first_name,
        last_name: response.data.user.last_name,
        country: response.data.user.country || "",
        city: response.data.user.city || "",
        bio: response.data.user.bio || "",
      },
    };
  } catch (error) {
    console.error("Error in loginUser:", error);
    throw error;
  }
};

export const logoutUser = async () => {
  try {
    const refreshToken = localStorage.getItem("refresh_token");
    
    if (refreshToken) {
      await api.post("accounts/logout/", {
        refresh: refreshToken,
      });
    }
    
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    
    console.log("User logged out successfully");
    return { detail: "Logged out successfully" };
  } catch (error) {
    console.error("Logout error:", error);
    // Even if logout fails on server, clear local tokens
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    return { detail: "Logged out" };
  }
};

export const refreshToken = async () => {
  try {
    const refreshToken = localStorage.getItem("refresh_token");
    
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }
    
    const response = await api.post("accounts/refresh/", {
      refresh: refreshToken,
    });
    
    localStorage.setItem("access_token", response.data.access);
    console.log("Token refreshed successfully");
    
    return response.data;
  } catch (error) {
    console.error("Error refreshing token:", error);
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    throw error;
  }
};

export const getCurrentUser = async () => {
  try {
    const response = await api.get("users/profiles/");
    console.log("Current user data fetched:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error getting current user:", error);
    throw error;
  }
};

// Password reset functions
export const requestPasswordReset = async (email) => {
  try {
    console.log("Requesting password reset for:", email);
    const response = await api.post("accounts/password-reset/", { email });
    return response.data;
  } catch (error) {
    console.error("Error requesting password reset:", error);
    throw error;
  }
};

export const confirmPasswordReset = async (email, code, newPassword) => {
  try {
    console.log("Confirming password reset for:", email);
    const response = await api.post("accounts/password-reset-confirm/", {
      email,
      code,
      new_password: newPassword,
    });
    return response.data;
  } catch (error) {
    console.error("Error confirming password reset:", error);
    throw error;
  }
};

// Utility function to check if user is authenticated
export const isAuthenticated = () => {
  const token = localStorage.getItem("access_token");
  return !!token;
};

// Utility function to get auth headers
export const getAuthHeaders = () => {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export default api;