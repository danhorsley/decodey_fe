// src/config.js - Simplified configuration for the app

// Auth constants for consistent token handling
const AUTH_KEYS = {
  TOKEN: "uncrypt-token",
  USER_ID: "uncrypt-user-id",
  USERNAME: "uncrypt-username",
  REMEMBER_ME: "uncrypt-remember-me",
};

// Get appropriate API URL based on environment
const getApiUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    return 'https://api.decodey.game';
  }
  return process.env.REACT_APP_BACKEND_URL || 'https://7264097a-b4a2-42c7-988c-db8c0c9b107a-00-1lx57x7wg68m5.janeway.replit.dev';
};

// Helper function to get storage based on rememberMe preference
const getStorage = () => {
  const rememberMe = localStorage.getItem(AUTH_KEYS.REMEMBER_ME) !== "false";
  return rememberMe ? localStorage : sessionStorage;
};

// Helper function to get the auth token from storage
const getAuthToken = () => {
  const storage = getStorage();
  return storage.getItem(AUTH_KEYS.TOKEN);
};

// Helper function to get the user ID from storage
const getAuthUserId = () => {
  const storage = getStorage();
  return storage.getItem(AUTH_KEYS.USER_ID);
};

// Function to clear session data (useful for logout)
const clearSession = () => {
  const keysToRemove = [
    AUTH_KEYS.TOKEN,
    AUTH_KEYS.USER_ID,
    AUTH_KEYS.USERNAME,
    "auth_token",
    "user_id",
    "username",
  ];

  keysToRemove.forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
};

// Function to save session data from headers
const saveSession = (headers, rememberMe = null) => {
  if (!headers) return;

  try {
    const gameId = headers.get("X-Game-Id");
    if (gameId) {
      localStorage.setItem("uncrypt-game-id", gameId);
    }

    const sessionId = headers.get("X-Session-ID");
    if (sessionId) {
      localStorage.setItem("uncrypt-session-id", sessionId);
    }

    const authToken = headers.get("Authorization");
    if (authToken && authToken.startsWith("Bearer ")) {
      const token = authToken.substring(7);
      let shouldRemember = rememberMe !== null ? rememberMe : localStorage.getItem(AUTH_KEYS.REMEMBER_ME) !== "false";
      const storage = shouldRemember ? localStorage : sessionStorage;
      storage.setItem(AUTH_KEYS.TOKEN, token);
    }
  } catch (error) {
    console.error("Error saving session data from headers:", error);
  }
};

// Main configuration object
const config = {
  AUTH_KEYS,
  apiUrl: getApiUrl(),
  DEBUG: false,
  session: {
    getAuthToken,
    getAuthUserId,
    getStorage,
    clearSession,
    saveSession,
    getHeaders: (options = {}) => {
      const { publicEndpoint = false } = options;

      if (publicEndpoint) {
        return {
          Accept: "application/json",
          "Content-Type": "application/json",
          Origin: window.location.origin,
        };
      }

      const token = getAuthToken();
      const userId = getAuthUserId();
      const gameId = localStorage.getItem("uncrypt-game-id");
      const sessionId = localStorage.getItem("uncrypt-session-id");

      const headers = {
        Origin: window.location.origin,
        Accept: "application/json",
        "Content-Type": "application/json",
      };

      if (sessionId) headers["X-Session-ID"] = sessionId;
      if (gameId) headers["X-Game-ID"] = gameId;
      if (token) headers["Authorization"] = `Bearer ${token}`;
      if (userId) headers["X-User-ID"] = userId;

      return headers;
    },
  },

  healthCheck: async () => {
    try {
      const response = await fetch(`${getApiUrl()}/health`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
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