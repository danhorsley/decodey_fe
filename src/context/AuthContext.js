// src/context/AuthContext.js
import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
} from "react";
import apiService from "../services/apiService";
import config from "../config";

// Default user state
const defaultUserState = {
  user: null,
  isAuthenticated: false,
  authLoading: true,
  token: null,
  authError: null,
};

// Create context
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Auth state management
  const [authState, setAuthState] = useState(defaultUserState);
  const [leaderboardData, setLeaderboardData] = useState({
    entries: [],
    loading: false,
    error: null,
    currentPage: 1,
    totalPages: 1,
  });

  // Initialize auth state from token if exists
  useEffect(() => {
    const initAuth = async () => {
      // Set loading state immediately
      setAuthState((prev) => ({ ...prev, authLoading: true }));

      console.log("Initializing auth state...");

      try {
        // Get token and user info using helper functions
        const token = config.session.getAuthToken();
        const userId = config.session.getAuthUserId();

        // If no token or userId found, user is not authenticated
        if (!token || !userId) {
          console.log("No token or user ID found in storage");
          setAuthState({
            ...defaultUserState,
            authLoading: false,
          });
          return;
        }

        console.log("Found stored authentication data");

        // Try to validate the token with backend
        let isValidToken = false;
        let userData = null;

        try {
          const response = await fetch(`${config.apiUrl}/validate-token`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });

          if (response.ok) {
            userData = await response.json();
            console.log("Token validation successful:", userData);
            isValidToken = true;
          }
        } catch (error) {
          console.warn("Token validation endpoint failed:", error);
        }

        // Get username from storage
        const storage = config.session.getStorage();
        const username = storage.getItem(config.AUTH_KEYS?.USERNAME) || "User";

        // Update auth state with user data (validated or from storage)
        setAuthState({
          user: {
            id: userData?.user_id || userId,
            username: userData?.username || username,
          },
          isAuthenticated: true,
          authLoading: false,
          token: token,
          authError: null,
        });
      } catch (error) {
        console.error("Auth initialization error:", error);
        setAuthState({
          ...defaultUserState,
          authLoading: false,
          authError: "Failed to validate authentication state",
        });
      }
    };

    initAuth();
  }, []);

  // Login method - centralized auth handling
  const login = useCallback(async (credentials) => {
    // Set loading state immediately
    setAuthState((prev) => ({ ...prev, authLoading: true, authError: null }));

    try {
      if (!credentials || !credentials.username || !credentials.password) {
        throw new Error("Missing login credentials");
      }

      // Extract remember me preference with default to true for better user experience
      const { rememberMe = true, ...loginCredentials } = credentials;

      console.log("Attempting login with username:", loginCredentials.username);

      // Use apiService for login
      const data = await apiService.loginapi(loginCredentials);

      // Validate response
      if (!data || !data.token) {
        throw new Error("Invalid response from login service");
      }

      // Create user object
      const user = {
        id: data.user_id,
        username: data.username || credentials.username,
      };

      // Store rememberMe preference in localStorage
      localStorage.setItem(
        config.AUTH_KEYS?.REMEMBER_ME || "uncrypt-remember-me",
        String(rememberMe),
      );

      // Store auth data in appropriate storage based on rememberMe
      const storage = rememberMe ? localStorage : sessionStorage;
      const tokenKey = config.AUTH_KEYS?.TOKEN || "uncrypt-token";
      const userIdKey = config.AUTH_KEYS?.USER_ID || "uncrypt-user-id";
      const usernameKey = config.AUTH_KEYS?.USERNAME || "uncrypt-username";

      storage.setItem(tokenKey, data.token);
      storage.setItem(userIdKey, user.id);
      storage.setItem(usernameKey, user.username);

      // Update auth state
      setAuthState({
        user,
        isAuthenticated: true,
        authLoading: false,
        token: data.token,
        authError: null,
      });

      console.log("Authentication successful");

      return { success: true, token: data.token };
    } catch (error) {
      console.error("Login error:", error);

      // Clear auth state on login failure
      setAuthState({
        ...defaultUserState,
        authLoading: false,
        authError: error.message || "Login failed",
      });

      return {
        success: false,
        error: error.message || "Login failed",
      };
    }
  }, []);

  // Logout method - clear auth state and storage
  const logout = useCallback(() => {
    console.log("Performing logout - clearing auth state");

    // First update auth state to prevent flashing of authenticated content
    setAuthState({
      user: null,
      isAuthenticated: false,
      authLoading: false,
      authError: null,
      token: null,
    });

    // Use the centralized clear function to clean up storage
    if (config.session && typeof config.session.clearSession === "function") {
      config.session.clearSession();
    } else {
      // Fallback if clearSession is not available
      localStorage.removeItem(config.AUTH_KEYS?.TOKEN || "uncrypt-token");
      localStorage.removeItem(config.AUTH_KEYS?.USER_ID || "uncrypt-user-id");
      localStorage.removeItem(config.AUTH_KEYS?.USERNAME || "uncrypt-username");
      sessionStorage.removeItem(config.AUTH_KEYS?.TOKEN || "uncrypt-token");
      sessionStorage.removeItem(config.AUTH_KEYS?.USER_ID || "uncrypt-user-id");
      sessionStorage.removeItem(
        config.AUTH_KEYS?.USERNAME || "uncrypt-username",
      );
    }

    // Call backend logout endpoint
    fetch(`${config.apiUrl}/logout`, {
      method: "POST",
      credentials: "include",
    }).catch((err) => console.error("Logout endpoint error:", err));

    console.log("Logout completed, all auth data cleared");
  }, []);

  // Add function to handle fetching leaderboard data
  const fetchLeaderboard = useCallback(async (page = 1, limit = 10) => {
    setLeaderboardData((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const data = await apiService.getLeaderboard(page, limit);

      setLeaderboardData({
        entries: data.topEntries || [],
        loading: false,
        error: null,
        currentPage: page,
        totalPages: data.pagination?.total_pages || 1,
      });

      return data;
    } catch (error) {
      console.error("Error fetching leaderboard:", error);

      setLeaderboardData((prev) => ({
        ...prev,
        loading: false,
        error: "Failed to load leaderboard data",
      }));

      return null;
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        login,
        logout,
        leaderboardData,
        fetchLeaderboard,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
