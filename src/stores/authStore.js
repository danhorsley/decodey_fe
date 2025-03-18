// src/stores/authStore.js
import { create } from "zustand";
import { persist } from "zustand/middleware";
import apiService from "../services/apiService";
import config from "../config";

// Create the store with persistence
const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      isAuthenticated: false,
      user: null,
      loading: true,
      hasActiveGame: false,
      activeGameStats: null,

      // Actions
      initialize: async () => {
        set({ loading: true });

        // Check for token
        const token = config.session.getAuthToken();

        if (!token) {
          set({
            isAuthenticated: false,
            user: null,
            loading: false,
            hasActiveGame: false,
          });
          return;
        }

        try {
          // Configure API with token
          apiService.api.defaults.headers.common["Authorization"] =
            `Bearer ${token}`;

          // Verify token
          const response = await apiService.api.get("/verify_token");

          if (response.status === 200 && response.data.valid) {
            // Check for active game
            let hasActiveGame = false;
            try {
              const gameCheckResponse = await apiService.api.get(
                "/api/check-active-game",
              );
              hasActiveGame = gameCheckResponse.data.has_active_game || false;
            } catch (gameCheckError) {
              console.warn("Error checking for active game:", gameCheckError);
            }

            set({
              isAuthenticated: true,
              user: {
                id: response.data.user_id,
                username: response.data.username,
              },
              loading: false,
              hasActiveGame: hasActiveGame,
            });
          } else {
            // Token invalid
            await get().handleInvalidToken();
          }
        } catch (error) {
          console.error("Error verifying token:", error);

          if (error.response && error.response.status === 401) {
            await get().handleInvalidToken();
          } else {
            // Network error, maintain state but mark as not loading
            set((state) => ({
              ...state,
              loading: false,
            }));
          }
        }
      },

      handleInvalidToken: async () => {
        // Prevent refresh attempts if there's no refresh token
        const refreshToken = localStorage.getItem("refresh_token");
        if (!refreshToken) {
          console.log(
            "No refresh token available - continuing as anonymous user",
          );
          // Don't emit auth:logout for anonymous users
          return Promise.reject(
            new Error("No refresh token available, continuing anonymously"),
          );
        }

        try {
          const refreshResult = await apiService.refreshToken();

          if (refreshResult && refreshResult.access_token) {
            // Set the new token
            apiService.api.defaults.headers.common["Authorization"] =
              `Bearer ${refreshResult.access_token}`;

            // Save the new token
            if (localStorage.getItem("uncrypt-remember-me") === "true") {
              localStorage.setItem("uncrypt-token", refreshResult.access_token);
            } else {
              sessionStorage.setItem(
                "uncrypt-token",
                refreshResult.access_token,
              );
            }

            // Check for active game
            let hasActiveGame = false;
            try {
              const gameCheckResponse = await apiService.api.get(
                "/api/check-active-game",
              );
              hasActiveGame = gameCheckResponse.data.has_active_game || false;
            } catch (gameCheckError) {
              console.warn("Error checking for active game:", gameCheckError);
            }

            set({
              isAuthenticated: true,
              user: {
                id: refreshResult.user_id,
                username: refreshResult.username,
              },
              loading: false,
              hasActiveGame: hasActiveGame,
            });
          } else {
            get().clearAuth();
          }
        } catch (error) {
          console.error("Token refresh failed:", error);
          get().clearAuth();
        }
      },

      clearAuth: () => {
        config.session.clearSession();
        set({
          isAuthenticated: false,
          user: null,
          loading: false,
          hasActiveGame: false,
        });
      },

      login: async (credentials) => {
        try {
          const result = await apiService.login(credentials);

          // Update state via auth:login event (apiService still emits this)
          // You could alternatively update directly here

          return { success: true, data: result };
        } catch (error) {
          return {
            success: false,
            error: error.response?.data?.msg || "Login failed",
          };
        }
      },

      logout: async () => {
        try {
          await apiService.logout();

          // Clear tokens
          localStorage.removeItem(config.AUTH_KEYS.TOKEN);
          sessionStorage.removeItem(config.AUTH_KEYS.TOKEN);

          // Update state
          set({
            isAuthenticated: false,
            user: null,
            loading: false,
            hasActiveGame: false,
          });

          return { success: true };
        } catch (error) {
          // Still clear state on error
          set({
            isAuthenticated: false,
            user: null,
            loading: false,
            hasActiveGame: false,
          });

          return {
            success: false,
            error: error.response?.data?.msg || "Logout failed",
          };
        }
      },

      waitForAuthReady: () => {
        return new Promise((resolve) => {
          const checkAuth = () => {
            const state = get();
            if (!state.loading) {
              resolve({
                isAuthenticated: state.isAuthenticated,
                user: state.user,
              });
              return true;
            }
            return false;
          };

          // Check immediately first
          if (checkAuth()) return;

          // Set up interval to check
          const interval = setInterval(() => {
            if (checkAuth()) {
              clearInterval(interval);
            }
          }, 100);

          // Safety timeout
          setTimeout(() => {
            clearInterval(interval);
            resolve({
              isAuthenticated: false,
              user: null,
            });
          }, 5000);
        });
      },
    }),
    {
      name: "auth-storage", // Storage key
      partialize: (state) => ({
        // Only persist these fields
        isAuthenticated: state.isAuthenticated,
        user: state.user,
      }),
    },
  ),
);

// Subscribe to API service events
apiService.on("auth:login", (data) => {
  useAuthStore.setState({
    isAuthenticated: true,
    user: {
      id: data.user_id,
      username: data.username,
    },
    hasActiveGame: data.has_active_game || false,
    loading: false,
  });

  // Trigger active game check if needed
  if (data.has_active_game) {
    apiService.events.emit("auth:active-game-check-needed");
  }
});

apiService.on("auth:logout", () => {
  useAuthStore.setState({
    isAuthenticated: false,
    user: null,
    hasActiveGame: false,
    loading: false,
  });
});

// Initialize auth state
setTimeout(() => {
  useAuthStore.getState().initialize();
}, 0);

export default useAuthStore;
