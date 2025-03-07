// src/config.js - Complete configuration for the app

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
    // Function to get headers based on endpoint requirements
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

      // For protected endpoints, include all available identification
      const token = localStorage.getItem("uncrypt-token");
      const userId = localStorage.getItem("uncrypt-user-id");
      const gameId = localStorage.getItem("uncrypt-game-id");
      const sessionId = localStorage.getItem("uncrypt-session-id");

      // Build headers object with all available identifiers
      const headers = {
        ...(sessionId ? { "X-Session-ID": sessionId } : {}),
        ...(gameId ? { "X-Game-ID": gameId } : {}),
        Origin: "https://uncryptbe.replit.app",
        Accept: "application/json",
        "Content-Type": "application/json",
      };

      // Add Authorization header for token-based authentication (if available)
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // Also include user ID if available (as backup authentication method)
      if (userId) {
        headers["X-User-ID"] = userId;
      }

      return headers;
    },

    // Function to save session ID from response headers
    saveSession: (headers) => {
      // Check if the response includes a session ID header
      const sessionId = headers.get("X-Session-ID");
      if (sessionId) {
        localStorage.setItem("uncrypt-session-id", sessionId);
        if (config.DEBUG) console.log("Saved session ID:", sessionId);
      }

      // Check for and save game ID if present
      const gameId = headers.get("X-Game-ID");
      if (gameId) {
        localStorage.setItem("uncrypt-game-id", gameId);
        if (config.DEBUG) console.log("Saved game ID:", gameId);
      }
    },

    // Function to clear session data (useful for logout)
    clearSession: () => {
      localStorage.removeItem("uncrypt-session-id");
      localStorage.removeItem("uncrypt-token");
      localStorage.removeItem("uncrypt-user-id");
      localStorage.removeItem("uncrypt-username");

      // Don't clear game-id here - that's handled separately when starting a new game
      if (config.DEBUG) console.log("Session data cleared from localStorage");
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
