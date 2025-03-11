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
      console.log("Initializing auth state...");

      // First check localStorage for token (for persistent sessions)
      let token =
        localStorage.getItem("uncrypt-token") ||
        localStorage.getItem("auth_token");
      let userId =
        localStorage.getItem("uncrypt-user-id") ||
        localStorage.getItem("user_id");
      let username =
        localStorage.getItem("uncrypt-username") ||
        localStorage.getItem("username");

      // If not in localStorage, check sessionStorage (for session-only logins)
      if (!token) {
        token = sessionStorage.getItem("uncrypt-token");
        userId = sessionStorage.getItem("uncrypt-user-id");
        username = sessionStorage.getItem("uncrypt-username");
      }

      if (!token || !userId) {
        console.log("No token or user ID found in storage");
        setAuthState({
          ...defaultUserState,
          authLoading: false,
        });
        return;
      }

      // Log what we found for debugging
      console.log("Found stored authentication:", {
        tokenSource: localStorage.getItem("uncrypt-token")
          ? "localStorage (new format)"
          : localStorage.getItem("auth_token")
            ? "localStorage (old format)"
            : "sessionStorage",
        userId: userId,
        username: username || "(unknown)",
      });

      try {
        // First try the explicit token validation endpoint
        let validationSuccess = false;

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
            validationSuccess = true;
          }
        } catch (error) {
          console.warn(
            "Token validation endpoint failed, will try alternative method:",
            error,
          );
        }

        // If endpoint validation failed, assume token is valid if it exists
        // This is a fallback for backends that don't support the validation endpoint
        if (!validationSuccess && token && userId) {
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

          // Ensure consistency across storage mechanisms
          localStorage.setItem("auth_token", token);
          localStorage.setItem("user_id", userId);
          if (username) localStorage.setItem("username", username);

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

  // Login method
  const login = useCallback(async (credentials) => {
    setAuthState((prev) => ({ ...prev, authLoading: true, authError: null }));

    try {
      // Extract remember me preference
      const { rememberMe, ...loginCredentials } = credentials;

      // Use apiService for login
      const data = await apiService.loginapi(loginCredentials);

      // If we received a token, save it
      if (data.token) {
        // Choose storage method based on rememberMe preference
        const storage = rememberMe ? localStorage : sessionStorage;

        // Store authentication data in new format
        storage.setItem("uncrypt-token", data.token);
        storage.setItem("uncrypt-user-id", data.user_id);
        storage.setItem(
          "uncrypt-username",
          data.username || credentials.username,
        );

        // IMPORTANT: For backward compatibility, also store in original format
        localStorage.setItem("auth_token", data.token);
        localStorage.setItem("user_id", data.user_id);
        localStorage.setItem("username", data.username || credentials.username);

        // Always remember user preference
        localStorage.setItem("uncrypt-remember-me", rememberMe);
      }

      // Update auth state
      setAuthState({
        user: data.user || {
          username: credentials.username,
          id: data.user_id,
        },
        isAuthenticated: true,
        authLoading: false,
        token: data.token,
        authError: null,
      });

      // Log successful authentication
      console.log("Authentication state updated:", {
        username: credentials.username,
        authenticated: true,
        token: data.token ? "[REDACTED]" : "None",
      });

      return { success: true };
    } catch (error) {
      console.error("Login error:", error);

      setAuthState((prev) => ({
        ...prev,
        authLoading: false,
        authError: error.message || "Login failed",
      }));

      return {
        success: false,
        error: error.message || "Login failed",
      };
    }
  }, []);

  // Logout method
  const logout = useCallback(() => {
    // Clear tokens from both storage types
    localStorage.removeItem("uncrypt-token");
    localStorage.removeItem("uncrypt-user-id");
    localStorage.removeItem("uncrypt-username");
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_id");
    localStorage.removeItem("username");

    sessionStorage.removeItem("uncrypt-token");
    sessionStorage.removeItem("uncrypt-user-id");
    sessionStorage.removeItem("uncrypt-username");

    // Update auth state
    setAuthState({
      user: null,
      isAuthenticated: false,
      authLoading: false,
      authError: null,
      token: null,
    });

    // Call backend logout endpoint if needed
    fetch(`${config.apiUrl}/logout`, {
      method: "POST",
      credentials: "include",
    }).catch((err) => console.error("Logout error:", err));
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
