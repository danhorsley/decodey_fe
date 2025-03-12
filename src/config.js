// src/config.js - Complete configuration for the app

// Auth constants for consistent token handling
const AUTH_KEYS = {
  TOKEN: "uncrypt-token",
  USER_ID: "uncrypt-user-id",
  USERNAME: "uncrypt-username",
  REMEMBER_ME: "uncrypt-remember-me",
};

// Helper function to get storage based on rememberMe preference
const getStorage = () => {
  // Check rememberMe preference - default to true for better UX
  const rememberMe = localStorage.getItem(AUTH_KEYS.REMEMBER_ME) !== "false";
  return rememberMe ? localStorage : sessionStorage;
};

// Helper function to get the auth token from storage
const getAuthToken = () => {
  // Get appropriate storage based on rememberMe preference
  const storage = getStorage();
  return storage.getItem(AUTH_KEYS.TOKEN);
};

// Helper function to get the user ID from storage
const getAuthUserId = () => {
  // Get appropriate storage based on rememberMe preference
  const storage = getStorage();
  return storage.getItem(AUTH_KEYS.USER_ID);
};

// Function to clear session data (useful for logout)
const clearSession = () => {
  // Clear auth data from both storages to be thorough
  const keysToRemove = [
    // Standard keys
    AUTH_KEYS.TOKEN,
    AUTH_KEYS.USER_ID,
    AUTH_KEYS.USERNAME,
    // Legacy keys
    "auth_token",
    "user_id",
    "username",
  ];

  keysToRemove.forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });

  // Don't clear rememberMe preference

  console.log("Auth session data cleared from both storage types");
};

// Function to save session data from headers
const saveSession = (headers, rememberMe = null) => {
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

      // Determine storage location
      // If rememberMe is explicitly passed, use that
      // Otherwise check localStorage for the preference
      let shouldRemember;
      if (rememberMe !== null) {
        shouldRemember = rememberMe;
      } else {
        shouldRemember =
          localStorage.getItem(AUTH_KEYS.REMEMBER_ME) !== "false";
      }

      const storage = shouldRemember ? localStorage : sessionStorage;

      // Store the token
      storage.setItem(AUTH_KEYS.TOKEN, token);
      console.log(
        "Auth token saved from headers to",
        shouldRemember ? "localStorage" : "sessionStorage",
      );
    }
  } catch (error) {
    console.error("Error saving session data from headers:", error);
    // Continue execution - this is non-critical
  }
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
    // Auth helper functions
    getAuthToken,
    getAuthUserId,
    getStorage,
    clearSession,
    saveSession,

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
