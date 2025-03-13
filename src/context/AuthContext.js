// src/context/AuthContext.js
import React, { createContext, useState, useEffect, useContext } from "react";
import apiService from "../services/apiService";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    user: null,
    loading: true,
  });

  // Initialize auth state from token
  useEffect(() => {
    const token = localStorage.getItem("token");

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
      setAuthState({
        isAuthenticated: true,
        user: {
          id: data.user_id,
          username: data.username,
        },
        loading: false,
      });
    });

    const logoutSubscription = apiService.on("auth:logout", () => {
      setAuthState({
        isAuthenticated: false,
        user: null,
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
