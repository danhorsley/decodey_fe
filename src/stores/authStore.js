// src/stores/authStore.js
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer"; // Import immer middleware
import apiService from "../services/apiService";
import config from "../config";

// Create the store with persistence and immer middleware
const useAuthStore = create(
  persist(
    immer((set, get) => ({
      // State
      isAuthenticated: false,
      user: null,
      loading: true,
      hasActiveGame: false,
      activeGameStats: null,

      // Actions
      initialize: async () => {
        set((state) => {
          state.loading = true;
        });

        // Check for token
        const token = config.session.getAuthToken();

        if (!token) {
          set((state) => {
            state.isAuthenticated = false;
            state.user = null;
            state.loading = false;
            state.hasActiveGame = false;
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

            set((state) => {
              state.isAuthenticated = true;
              state.user = {
                id: response.user_id,
                username: response.username,
                subadmin: response.subadmin || false 
              };
              state.loading = false;
              state.hasActiveGame = hasActiveGame;
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
            set((state) => {
              state.loading = false;
            });
          }
        }
      },

      handleInvalidToken: async () => {
        try {
          // Check for refresh token first
          const refreshToken = localStorage.getItem("refresh_token");

          // If no refresh token exists, immediately clear auth state for anonymous users
          if (!refreshToken) {
            console.log(
              "No refresh token available - proceeding as anonymous user",
            );

            // Using Immer to update state
            set((state) => {
              state.isAuthenticated = false;
              state.user = null;
              state.loading = false;
              state.hasActiveGame = false;
            });

            // Clear stored tokens to be safe
            localStorage.removeItem("uncrypt-token");
            localStorage.removeItem("refresh_token");
            sessionStorage.removeItem("uncrypt-token");

            return { success: false, anonymous: true };
          }

          // Try to refresh the token
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

            // Update state with refreshed authentication
            set((state) => {
              state.isAuthenticated = true;
              state.user = {
                id: refreshResult.user_id,
                username: refreshResult.username,
              };
              state.loading = false;
              state.hasActiveGame = hasActiveGame;
            });
          } else {
            // Failed to refresh, reset to anonymous state
            set((state) => {
              state.isAuthenticated = false;
              state.user = null;
              state.loading = false;
              state.hasActiveGame = false;
            });
          }
        } catch (error) {
          console.error("Token refresh failed:", error);

          // Reset to anonymous state on error
          set((state) => {
            state.isAuthenticated = false;
            state.user = null;
            state.loading = false;
            state.hasActiveGame = false;
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
          set((state) => {
            state.isAuthenticated = false;
            state.user = null;
            state.loading = false;
            state.hasActiveGame = false;
          });

          return { success: true };
        } catch (error) {
          // Still clear state on error
          set((state) => {
            state.isAuthenticated = false;
            state.user = null;
            state.loading = false;
            state.hasActiveGame = false;
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
    })),
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
  useAuthStore.setState((state) => {
    state.isAuthenticated = true;
    state.user = {
      id: data.user_id,
      username: data.username,
    };
    state.hasActiveGame = data.has_active_game || false;
    state.loading = false;
  });

  // Handle navigation after state is updated
  setTimeout(() => {
    if (!data.has_active_game) {
      // Use history API for smoother navigation
      window.history.pushState({}, "", "/home");
      // Trigger a navigation event for React Router
      window.dispatchEvent(new PopStateEvent("popstate"));
    } else if (data.has_active_game) {
      apiService.events.emit("auth:active-game-check-needed");
    }
  }, 0);
});

apiService.on("auth:logout", () => {
  useAuthStore.setState((state) => {
    state.isAuthenticated = false;
    state.user = null;
    state.hasActiveGame = false;
    state.loading = false;
  });
});

// Initialize auth state
setTimeout(() => {
  useAuthStore.getState().initialize();
}, 0);

export default useAuthStore;
