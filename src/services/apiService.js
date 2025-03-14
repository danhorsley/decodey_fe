// src/services/apiService.js
import axios from "axios";
import EventEmitter from "events";
import debugTokenState from "../config";
let isRefreshing = false;
let refreshFailureTime = 0;
const REFRESH_COOLDOWN = 30000; // 30 seconds cooldown after a refresh failure

class ApiService {
  constructor() {
    this.api = axios.create({
      baseURL: process.env.REACT_APP_API_URL,
      timeout: 10000,
      withCredentials: true,
    });
    // Add request interceptor to consistently add auth token to all requests
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem("token");
        if (token) {
          console.log(`Adding auth token to ${config.url}`);
          config.headers.Authorization = `Bearer ${token}`;
        } else {
          console.warn(`No token available for request to ${config.url}`);
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      },
    );
    this.events = new EventEmitter();
    this.sseConnection = null;

    // Add interceptor for token refresh
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (error.response.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          try {
            await this.refreshToken();
            return this.api(originalRequest);
          } catch (refreshError) {
            // Token refresh failed, user needs to login again
            this.events.emit("auth:logout");
            return Promise.reject(refreshError);
          }
        }
        return Promise.reject(error);
      },
    );
  }

  // Auth methods
  async login(credentials) {
    try {
      const response = await this.api.post("/login", credentials);
      if (response.data.access_token) {
        localStorage.setItem("token", response.data.access_token);

        // Ensure we save the refresh token if provided
        if (response.data.refresh_token) {
          localStorage.setItem("refresh_token", response.data.refresh_token);
          console.log("Refresh token saved successfully");
        } else {
          console.warn("No refresh token received from login endpoint");
        }

        // Set up SSE connection after successful login
        console.log("Setting up SSE connection after login");
        this.setupSSE();

        this.events.emit("auth:login", response.data);
      }
      return response.data;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  }

  async logout() {
    try {
      await this.api.post("/logout");
      localStorage.removeItem("token");
      this.closeSSE();
      this.events.emit("auth:logout");
      return { success: true };
    } catch (error) {
      console.error("Logout error:", error);
      // Still clear token on frontend
      localStorage.removeItem("token");
      this.events.emit("auth:logout");
      return { success: false, error };
    }
  }

  async refreshToken() {
    // Prevent concurrent refresh attempts
    if (isRefreshing) {
      console.log("Token refresh already in progress, skipping");
      return Promise.reject(new Error("Refresh already in progress"));
    }

    // Check if we actually have a refresh token before attempting
    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) {
      console.warn("No refresh token available - cannot refresh");

      // If we also don't have an access token, we should consider the user logged out
      if (!localStorage.getItem("token")) {
        console.log("No access token either, emitting auth:logout event");
        this.events.emit("auth:logout");
      } else {
        // Otherwise, we should prompt for login to get a new refresh token
        console.log(
          "Access token exists but no refresh token, emitting auth:required event",
        );
        this.events.emit("auth:required");
      }

      return Promise.reject(new Error("No refresh token available"));
    }

    try {
      console.log("Attempting to refresh token...");
      isRefreshing = true;
      console.log("Attempting to refresh token...");
      isRefreshing = true;

      // Check if we actually have a refresh token before attempting
      const refreshToken = localStorage.getItem("refresh_token");
      if (!refreshToken) {
        console.warn("No refresh token available - cannot refresh");
        throw new Error("No refresh token available");
      }

      const response = await this.api.post(
        "/refresh",
        {},
        {
          headers: {
            Authorization: `Bearer ${refreshToken}`,
          },
        },
      );

      if (response.data.access_token) {
        console.log("Successfully refreshed access token");
        localStorage.setItem("token", response.data.access_token);
        isRefreshing = false;
        return response.data;
      } else {
        throw new Error("Invalid response from refresh endpoint");
      }
    } catch (error) {
      console.error("Token refresh failed:", error.message);

      // Record the failure time to implement cooldown
      refreshFailureTime = Date.now();
      isRefreshing = false;

      // Force logout if the refresh endpoint returned 401
      if (error.response && error.response.status === 401) {
        console.warn("Refresh token is invalid or expired - logging out");
        // Clear tokens
        localStorage.removeItem("token");
        localStorage.removeItem("refresh_token");
        this.events.emit("auth:logout");
      }

      throw error;
    }
  }

  // Game methods - must add longstart to back end
  async startGame(options = {}) {
    try {
      console.log("Starting startGame function in apiService");

      // Get token and verify it exists
      const token = localStorage.getItem("token");
      console.log("Token from localStorage:", token ? "exists" : "missing");

      const endpoint = options.longText ? "api/longstart" : "/api/start";
      console.log("endpoint", endpoint);
      console.log(
        `Making request to endpoint: ${this.api.defaults.baseURL}${endpoint}`,
      );

      // Log request configuration
      const config = {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      };

      if (token) {
        config.headers["Authorization"] = `Bearer ${token}`;
      }

      console.log("Request config:", JSON.stringify(config));

      // Make the request
      const response = await this.api.get(endpoint, config);

      // Log response for debugging
      console.log("Response received:", {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers["content-type"],
        responseType: typeof response.data,
        content: response.data,
      });

      return response.data;
    } catch (error) {
      console.error("Error in startGame:", error);
      if (error.response) {
        console.error("Response details:", {
          status: error.response.status,
          statusText: error.response.statusText,
          contentType: error.response.headers["content-type"],
          data: error.response.data,
        });
      }
      throw error;
    }
  }

  async submitGuess(encryptedLetter, guessedLetter) {
    try {
      const gameId = localStorage.getItem("uncrypt-game-id");
      console.log(`Submitting guess: ${encryptedLetter} → ${guessedLetter}`);

      // Simple token debugging inline
      console.group("Token Debug for submitGuess");
      console.log(
        "Access Token:",
        localStorage.getItem("token") ? "Present" : "Missing",
      );
      console.log("Game ID:", gameId ? "Present" : "Missing");
      console.groupEnd();

      // Make a direct fetch request to bypass axios interceptors
      const baseUrl =
        this.api.defaults.baseURL || process.env.REACT_APP_API_URL || "";
      const url = `${baseUrl}/api/guess`;
      const token = localStorage.getItem("token");

      console.log(`Making fetch request to ${url} with data:`, {
        encrypted_letter: encryptedLetter,
        guessed_letter: guessedLetter,
        game_id: gameId,
      });

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          encrypted_letter: encryptedLetter,
          guessed_letter: guessedLetter,
          game_id: gameId,
        }),
        credentials: "include",
      });

      console.log("Fetch response status:", response.status);

      if (!response.ok) {
        // Handle non-200 responses
        if (response.status === 401) {
          console.warn("Authentication required for guess");
          this.events.emit("auth:required");
          return { error: "Authentication required", authRequired: true };
        }
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Guess response:", data);
      return data;
    } catch (error) {
      console.error("Error submitting guess:", error);
      return { error: error.message };
    }
  }

  // Update in src/services/apiService.js
  async getHint() {
    try {
      const gameId = localStorage.getItem("uncrypt-game-id");
      console.log(`Sending hint request with game_id: ${gameId}`);

      // Simple token debugging without relying on external function
      console.group("Token Debug");
      console.log(
        "Access Token:",
        localStorage.getItem("token") ? "Present" : "Missing",
      );
      console.log("Game ID:", gameId ? "Present" : "Missing");
      console.groupEnd();

      // Make a direct fetch request to bypass axios interceptors
      const baseUrl =
        this.api.defaults.baseURL || process.env.REACT_APP_API_URL || "";
      const url = `${baseUrl}/api/hint`;
      const token = localStorage.getItem("token");

      console.log(`Making fetch request to ${url}`);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ game_id: gameId }),
        credentials: "include",
      });

      console.log("Fetch response status:", response.status);

      if (!response.ok) {
        // Handle non-200 responses
        if (response.status === 401) {
          console.warn("Authentication required for hint");
          this.events.emit("auth:required");
          return { error: "Authentication required", authRequired: true };
        }
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Hint response:", data);
      return data;
    } catch (error) {
      console.error("Error getting hint:", error);
      return { error: error.message };
    }
  }
  async getGameStatus() {
    try {
      console.log("Fetching game status");

      // Get token and game ID
      const token = localStorage.getItem("token");
      const gameId = localStorage.getItem("uncrypt-game-id");

      // Simple token debugging
      console.group("Token Debug for getGameStatus");
      console.log("Access Token:", token ? "Present" : "Missing");
      console.log("Game ID:", gameId ? "Present" : "Missing");
      console.groupEnd();

      // Make a direct fetch request
      const baseUrl =
        this.api.defaults.baseURL || process.env.REACT_APP_API_URL || "";
      const url = `${baseUrl}/api/game-status`;

      console.log(`Making fetch request to ${url}`);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        credentials: "include",
      });

      console.log("Fetch response status:", response.status);

      if (!response.ok) {
        // Handle non-200 responses
        if (response.status === 401) {
          console.warn("Authentication required for game status");
          this.events.emit("auth:required");
          return { error: "Authentication required", authRequired: true };
        }
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Game status response:", data);
      return data;
    } catch (error) {
      console.error("Error getting game status:", error);
      return { error: error.message };
    }
  }
  // Server-sent events for win notifications
  setupSSE() {
    if (this.sseConnection) this.closeSSE();

    const token = localStorage.getItem("token");
    if (!token) {
      console.log("No token available, can't set up SSE connection");
      return;
    }

    // Fix: Construct a proper URL for the events endpoint
    const baseUrl = process.env.REACT_APP_API_URL || "";
    const eventsUrl = `${baseUrl}/events?token=${token}`;
    console.log("Setting up SSE connection to:", eventsUrl);

    try {
      this.sseConnection = new EventSource(eventsUrl);
      console.log("SSE connection created");

      // Listen for the "connected" event
      this.sseConnection.addEventListener("connected", (event) => {
        console.log("SSE connection established:", event.data);
      });

      // Listen for the "gameWon" event (name must match what backend sends)
      this.sseConnection.addEventListener("gameWon", (event) => {
        console.log("Game won event received:", event.data);
        try {
          const data = JSON.parse(event.data);
          this.events.emit("game:win", data);
        } catch (error) {
          console.error("Error parsing game won data:", error);
        }
      });

      // Listen for "gameState" updates
      this.sseConnection.addEventListener("gameState", (event) => {
        console.log("Game state event received:", event.data);
        try {
          const data = JSON.parse(event.data);
          this.events.emit("game:state", data);
        } catch (error) {
          console.error("Error parsing game state data:", error);
        }
      });

      // Listen for "ping" events to keep connection alive
      this.sseConnection.addEventListener("ping", (event) => {
        console.log("Ping received from server");
      });

      // Also keep the default message handler for backward compatibility
      this.sseConnection.onmessage = (event) => {
        console.log("Default message event received:", event.data);
        try {
          const data = JSON.parse(event.data);
          this.events.emit("sse:message", data);

          // Handle legacy format events
          if (data.type === "win") {
            this.events.emit("game:win", data);
          } else if (data.type === "game_state") {
            this.events.emit("game:state", data);
          }
        } catch (error) {
          console.error("Error processing default SSE message:", error);
        }
      };

      this.sseConnection.onerror = (error) => {
        console.error("SSE connection error:", error);
        this.closeSSE();

        // Try to reconnect after 5s
        setTimeout(() => this.setupSSE(), 5000);
      };
    } catch (error) {
      console.error("Error creating SSE connection:", error);
    }
  }

  closeSSE() {
    if (this.sseConnection) {
      this.sseConnection.close();
      this.sseConnection = null;
    }
  }

  // Subscribe to events
  on(event, listener) {
    this.events.on(event, listener);
    return () => this.events.off(event, listener);
  }
}

export default new ApiService();
