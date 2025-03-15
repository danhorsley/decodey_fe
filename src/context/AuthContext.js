// src/context/AuthContext.js
import React, { createContext, useState, useEffect, useContext } from "react";
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
    // Check for token in both localStorage and sessionStorage using consistent key names
    const token =
      localStorage.getItem(config.AUTH_KEYS.TOKEN) ||
      sessionStorage.getItem(config.AUTH_KEYS.TOKEN);

    if (token) {
      // Verify token with backend
      apiService.api
        .get("/verify_token")
        .then((response) => {
          setAuthState({
            isAuthenticated: true,
            user: {
              id: response.data.user_id,
              username: response.data.username,
            },
            loading: false,
          });
        })
        .catch(() => {
          // Token invalid, try to refresh
          apiService
            .refreshToken()
            .then((data) => {
              setAuthState({
                isAuthenticated: true,
                user: {
                  id: data.user_id,
                  username: data.username,
                },
                loading: false,
              });
            })
            .catch(() => {
              // Both token and refresh failed
              localStorage.removeItem("token");
              setAuthState({
                isAuthenticated: false,
                user: null,
                loading: false,
              });
            });
        });
    } else {
      setAuthState({
        isAuthenticated: false,
        user: null,
        loading: false,
      });
    }
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

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        login,
        logout,
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
