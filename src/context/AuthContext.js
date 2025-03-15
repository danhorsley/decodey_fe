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

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    user: null,
    loading: true,
    hasActiveGame: false,
    activeGameStats: null,
  });

  // Initialize auth state from token
  useEffect(() => {
    const initializeAuth = async () => {
      // Check for token in storage using config utilities
      const token = config.session.getAuthToken();

      if (!token) {
        setAuthState({
          isAuthenticated: false,
          user: null,
          loading: false,
        });
        return;
      }

      try {
        // Configure API instance with the token
        apiService.api.defaults.headers.common["Authorization"] =
          `Bearer ${token}`;

        // Verify token with backend
        const response = await apiService.api.get("/verify_token");

        if (response.status === 200 && response.data.valid) {
          console.log("Token verified successfully");
          setAuthState({
            isAuthenticated: true,
            user: {
              id: response.data.user_id,
              username: response.data.username,
            },
            loading: false,
          });
        } else {
          // Token invalid, try to refresh or clear
          console.warn("Token verification failed");
          await handleInvalidToken();
        }
      } catch (error) {
        console.error("Error verifying token:", error);
        await handleInvalidToken();
      }
    };

    const handleInvalidToken = async () => {
      try {
        console.log("Attempting to refresh token...");
        const refreshResult = await apiService.refreshToken();

        if (refreshResult && refreshResult.access_token) {
          console.log("Token refreshed successfully");
          setAuthState({
            isAuthenticated: true,
            user: {
              id: refreshResult.user_id,
              username: refreshResult.username,
            },
            loading: false,
          });
        } else {
          clearAuthState();
        }
      } catch (error) {
        console.error("Token refresh failed:", error);
        clearAuthState();
      }
    };

    const clearAuthState = () => {
      // Clear tokens and set unauthenticated state
      config.session.clearSession();
      setAuthState({
        isAuthenticated: false,
        user: null,
        loading: false,
      });
    };

    // Start authentication initialization
    initializeAuth();
  }, []);

  // Listen for auth events from apiService
  useEffect(() => {
    const loginSubscription = apiService.on("auth:login", (data) => {
      // Update auth state
      setAuthState({
        isAuthenticated: true,
        user: {
          id: data.user_id,
          username: data.username,
        },
        hasActiveGame: data.has_active_game || false,
        loading: false,
      });

      // If user has an active game, trigger a check for active game details
      if (data.has_active_game) {
        console.log("User has active game, triggering check for details");
        apiService.events.emit("auth:active-game-check-needed");
      }
    });

    const logoutSubscription = apiService.on("auth:logout", () => {
      setAuthState({
        isAuthenticated: false,
        user: null,
        hasActiveGame: false,
        loading: false,
      });
    });

    return () => {
      loginSubscription();
      logoutSubscription();
    };
  }, []);
  // Login function
  const login = async (credentials) => {
    try {
      const result = await apiService.login(credentials);
      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.msg || "Login failed",
      };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await apiService.logout();
      // Ensure token is removed from both storage locations
      localStorage.removeItem(config.AUTH_KEYS.TOKEN);
      sessionStorage.removeItem(config.AUTH_KEYS.TOKEN);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.msg || "Logout failed",
      };
    }
  };
  // Add a new method to wait for auth state to be fully loaded
  // In AuthContext.js, enhance the waitForAuthReady function:
  const waitForAuthReady = useCallback(() => {
    return new Promise((resolve) => {
      if (!authState.loading) {
        // Auth state already loaded, return current auth status
        resolve({
          isAuthenticated: authState.isAuthenticated,
          user: authState.user,
        });
      } else {
        // Set up a timer to check auth state
        const checkInterval = setInterval(() => {
          if (!authState.loading) {
            clearInterval(checkInterval);
            resolve({
              isAuthenticated: authState.isAuthenticated,
              user: authState.user,
            });
          }
        }, 100);

        // Safety timeout after 5 seconds
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve({
            isAuthenticated: false,
            user: null,
          });
        }, 5000);
      }
    });
  }, [authState.loading, authState.isAuthenticated, authState.user]);
  return (
    <AuthContext.Provider
      value={{
        ...authState,
        login,
        logout,
        waitForAuthReady,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
