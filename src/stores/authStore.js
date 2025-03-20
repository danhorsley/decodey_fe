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
          // Verify token through apiService
          const response = await apiService.verifyToken();

          if (response && response.valid) {
            // Check for active game through apiService
            let hasActiveGame = false;
            try {
              const gameCheckResponse = await apiService.checkActiveGame();
              hasActiveGame = gameCheckResponse.has_active_game || false;
            } catch (gameCheckError) {
              console.warn("Error checking for active game:", gameCheckError);
            }

            set({
              isAuthenticated: true,
              user: {
                id: response.user_id,
                username: response.username,
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

      // In src/stores/authStore.js
      // The error is showing get().clearAuth is not a function
      // Let's fix the handleInvalidToken function

      handleInvalidToken: async () => {
        try {
          // Check for refresh token first
          const refreshToken = localStorage.getItem("refresh_token");

          // If no refresh token exists, immediately clear auth state for anonymous users
          if (!refreshToken) {
            console.log(
              "No refresh token available - proceeding as anonymous user",
            );

            // Instead of calling get().clearAuth(), directly set the state
            set({
              isAuthenticated: false,
              user: null,
              loading: false,
              hasActiveGame: false,
            });

            // Clear stored tokens to be safe
            localStorage.removeItem("uncrypt-token");
            localStorage.removeItem("refresh_token");
            sessionStorage.removeItem("uncrypt-token");

            return { success: false, anonymous: true };
          }

          // Rest of the function stays the same
          const refreshResult = await apiService.refreshToken();

          if (refreshResult && refreshResult.access_token) {
            // Check for active game
            let hasActiveGame = false;
            try {
              const gameCheckResponse = await apiService.checkActiveGame();
              hasActiveGame = gameCheckResponse.has_active_game || false;
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
            // Use set directly instead of get().clearAuth()
            set({
              isAuthenticated: false,
              user: null,
              loading: false,
              hasActiveGame: false,
            });
          }
        } catch (error) {
          console.error("Token refresh failed:", error);

          // Use set directly instead of get().clearAuth()
          set({
            isAuthenticated: false,
            user: null,
            loading: false,
            hasActiveGame: false,
          });
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
