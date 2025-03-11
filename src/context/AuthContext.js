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

  // Initialize auth state from token if exists
  useEffect(() => {
    const initAuth = async () => {
      // Set loading state immediately
      setAuthState((prev) => ({ ...prev, authLoading: true }));

      console.log("Initializing auth state...");

      try {
        // Standardize on uncrypt- prefixed keys, but check old keys as fallback
        let token = null;
        let userId = null;
        let username = null;

        // First check localStorage for persistent logins
        token =
          localStorage.getItem("uncrypt-token") ||
          localStorage.getItem("auth_token");
        userId =
          localStorage.getItem("uncrypt-user-id") ||
          localStorage.getItem("user_id");
        username =
          localStorage.getItem("uncrypt-username") ||
          localStorage.getItem("username");

        // If not in localStorage, check sessionStorage for session-only logins
        if (!token) {
          token = sessionStorage.getItem("uncrypt-token");
          userId = sessionStorage.getItem("uncrypt-user-id");
          username = sessionStorage.getItem("uncrypt-username");
        }

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

        try {
          const response = await fetch(`${config.apiUrl}/validate-token`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });

          if (response.ok) {
            const userData = await response.json();
            console.log("Token validation successful:", userData);

            // Update auth state with validated user data
            setAuthState({
              user: {
                id: userData.user_id || userId,
                username: userData.username || username,
              },
              isAuthenticated: true,
              authLoading: false,
              token: token,
              authError: null,
            });
            isValidToken = true;

            // Standardize on new keys - store in localStorage
            localStorage.setItem("uncrypt-token", token);
            localStorage.setItem("uncrypt-user-id", userData.user_id || userId);
            localStorage.setItem(
              "uncrypt-username",
              userData.username || username,
            );
          }
        } catch (error) {
          console.warn("Token validation endpoint failed:", error);
        }

        // Fallback: If endpoint validation failed but we have token and userId,
        // assume the token is valid (for backends without validation endpoint)
        if (!isValidToken && token && userId) {
          console.log("Using fallback authentication with existing token");
          setAuthState({
            user: {
              id: userId,
              username: username || "User",
            },
            isAuthenticated: true,
            authLoading: false,
            token: token,
            authError: null,
          });

          // Standardize storage on new keys
          localStorage.setItem("uncrypt-token", token);
          localStorage.setItem("uncrypt-user-id", userId);
          if (username) localStorage.setItem("uncrypt-username", username);
        }
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

  // submit pending scores after login
  useEffect(() => {
    // Whenever auth state changes to authenticated
    if (authState.isAuthenticated) {
      const submitPendingScores = async () => {
        const pendingScores = JSON.parse(
          localStorage.getItem("uncrypt-pending-scores") || "[]",
        );

        if (pendingScores.length > 0) {
          console.log(
            `Found ${pendingScores.length} pending scores to submit after auth change`,
          );

          for (const scoreData of pendingScores) {
            try {
              await apiService.recordScore(scoreData);
              console.log("Pending score submitted successfully");
            } catch (err) {
              console.error("Error submitting pending score:", err);
            }
          }

          // Clear pending scores after submitting
          localStorage.removeItem("uncrypt-pending-scores");
        }
      };

      submitPendingScores();
    }
  }, [authState.isAuthenticated]);

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

      // Robust error checking on response
      if (!data) {
        throw new Error("No response received from login service");
      }

      if (!data.token) {
        console.error("Login response missing token:", data);
        throw new Error("Login successful but no token received");
      }

      if (!data.user_id) {
        console.warn("Login response missing user_id:", data);
        // Continue but log warning - user_id is important for API calls
      }

      // Create a consistent user object
      const user = {
        id: data.user_id,
        username: data.username || credentials.username,
      };

      // Choose primary storage based on rememberMe preference
      const storage = rememberMe ? localStorage : sessionStorage;

      // Store auth data using consistent naming (new format)
      storage.setItem("uncrypt-token", data.token);
      storage.setItem("uncrypt-user-id", user.id);
      storage.setItem("uncrypt-username", user.username);

      // Always store the rememberMe preference in localStorage
      localStorage.setItem("uncrypt-remember-me", rememberMe);

      // Update auth state with the new user information
      setAuthState({
        user,
        isAuthenticated: true,
        authLoading: false,
        token: data.token,
        authError: null,
      });

      console.log("Authentication successful:", {
        username: user.username,
        authenticated: true,
      });

      return { success: true };
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

  // Logout method - centralized token/auth management
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

    // Clear all auth tokens from storage
    const keysToRemove = [
      // New format keys
      "uncrypt-token",
      "uncrypt-user-id",
      "uncrypt-username",
      // Old format keys
      "auth_token",
      "user_id",
      "username",
    ];

    // Remove from both localStorage and sessionStorage to be thorough
    keysToRemove.forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });

    // Call backend logout endpoint
    fetch(`${config.apiUrl}/logout`, {
      method: "POST",
      credentials: "include",
    }).catch((err) => console.error("Logout endpoint error:", err));

    console.log("Logout completed, all auth data cleared");
  }, []);

  // Leaderboard state and methods
  const [leaderboardData, setLeaderboardData] = useState({
    entries: [],
    loading: false,
    error: null,
    currentPage: 1,
    totalPages: 1,
  });

  // Add this function to handle fetching leaderboard data
  const fetchLeaderboard = useCallback(async (page = 1, limit = 10) => {
    setLeaderboardData((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const data = await apiService.getLeaderboard(page, limit);

      setLeaderboardData({
        entries: data.scores || [],
        loading: false,
        error: null,
        currentPage: page,
        totalPages: data.totalPages || 1,
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
