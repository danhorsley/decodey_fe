// src/config.js - Complete configuration for the app

// Helper function to get the auth token from storage
const getAuthToken = () => {
  // Try localStorage first (persistent logins)
  let token = localStorage.getItem("uncrypt-token");

  // If not found, try sessionStorage (session-only logins)
  if (!token) {
    token = sessionStorage.getItem("uncrypt-token");
  }

  return token;
};

// Helper function to get the user ID from storage
const getAuthUserId = () => {
  // Try localStorage first (persistent logins)
  let userId = localStorage.getItem("uncrypt-user-id");

  // If not found, try sessionStorage (session-only logins)
  if (!userId) {
    userId = sessionStorage.getItem("uncrypt-user-id");
  }

  return userId;
};

// Main configuration object
const config = {
  // API URL - uses environment variables with fallback
  apiUrl:
    process.env.REACT_APP_BACKEND_URL ||
    process.env.REACT_APP_API_URL ||
    "https://uncryptbe.replit.app",

  // Initialize and log API URL when config is first loaded
  init: (() => {
    console.log(
      "🌐 API URL configured as:",
      process.env.REACT_APP_BACKEND_URL ||
        process.env.REACT_APP_API_URL ||
        "https://uncryptbe.replit.app",
    );
    return true;
  })(),

  // Debug flag to control logging
  DEBUG: true,

  // Session management methods
  session: {
    // Function to get headers based on endpoint requirements - simplified to use standardized keys
    getHeaders: (options = {}) => {
      const { publicEndpoint = false } = options;

      // For public endpoints (like /start), we don't include auth tokens
      if (publicEndpoint) {
        return {
          Accept: "application/json",
          "Content-Type": "application/json",
          Origin: "https://uncryptbe.replit.app",
        };
      }

      // For protected endpoints, get auth token using standardized retrieval
      const token = getAuthToken();
      const userId = getAuthUserId();
      const gameId = localStorage.getItem("uncrypt-game-id");
      const sessionId = localStorage.getItem("uncrypt-session-id");

      // Build headers object with all available identifiers
      const headers = {
        Origin: "https://uncryptbe.replit.app",
        Accept: "application/json",
        "Content-Type": "application/json",
      };

      // Add session and game IDs if available
      if (sessionId) headers["X-Session-ID"] = sessionId;
      if (gameId) headers["X-Game-ID"] = gameId;

      // Add authorization header if token exists
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // Add user ID header if available
      if (userId) {
        headers["X-User-ID"] = userId;
      }

      return headers;
    },

    // Helper function to get auth token - added to centralize token retrieval
    getAuthToken: () => getAuthToken(),

    // Helper function to get user ID - added to centralize user ID retrieval
    getAuthUserId: () => getAuthUserId(),

    // Function to clear session data (useful for logout)
    clearSession: () => {
      // Clear all auth-related data from both localStorage and sessionStorage
      const keysToRemove = [
        // New standardized keys
        "uncrypt-session-id",
        "uncrypt-token",
        "uncrypt-user-id",
        "uncrypt-username",
        // Legacy keys
        "auth_token",
        "user_id",
        "username",
      ];

      const storageTypes = [localStorage, sessionStorage];

      // Clear each key from each storage type
      storageTypes.forEach((storage) => {
        keysToRemove.forEach((key) => {
          storage.removeItem(key);
        });
      });

      // Don't clear game-id here - that's handled separately when starting a new game
      if (config.DEBUG)
        console.log("Auth session data cleared from both storage types");
    },

    // Function to save session data from headers
    saveSession: (headers) => {
      if (!headers) return;

      try {
        // Check for game_id in headers
        const gameId = headers.get("X-Game-Id");
        if (gameId) {
          localStorage.setItem("uncrypt-game-id", gameId);
          console.log("Game ID saved from headers:", gameId);
        }

        // Check for session_id in headers
        const sessionId = headers.get("X-Session-ID");
        if (sessionId) {
          localStorage.setItem("uncrypt-session-id", sessionId);
          console.log("Session ID saved from headers:", sessionId);
        }

        // Check for auth token in headers (some APIs send this)
        const authToken = headers.get("Authorization");
        if (authToken && authToken.startsWith("Bearer ")) {
          const token = authToken.substring(7); // Remove "Bearer " prefix

          // Determine storage location (prefer localStorage for persistence)
          // Check if we should use rememberMe preference
          const rememberMe =
            localStorage.getItem("uncrypt-remember-me") === "true";
          const storage = rememberMe ? localStorage : sessionStorage;

          // Store the token
          storage.setItem("uncrypt-token", token);
          console.log(
            "Auth token saved from headers to",
            rememberMe ? "localStorage" : "sessionStorage",
          );
        }
      } catch (error) {
        console.error("Error saving session data from headers:", error);
        // Continue execution - this is non-critical
      }
    },
  },

  // Health check function to verify API connection
  healthCheck: async () => {
    try {
      const response = await fetch(`${config.apiUrl}/health`, {
        method: "GET",
        headers: config.session.getHeaders({ publicEndpoint: true }), // Health check is public
        credentials: "include",
        mode: "cors",
      });
      return response.ok;
    } catch (error) {
      console.error("Health check failed:", error);
      return false;
    }
  },
};

export default config;
