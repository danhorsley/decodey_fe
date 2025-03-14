// src/services/apiService.js
import axios from "axios";
import EventEmitter from "events";

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
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      },
    );

    // Create event emitter for auth events
    this.events = new EventEmitter();

    // Add interceptor for token refresh
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
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
        }

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
      localStorage.removeItem("refresh_token");
      this.events.emit("auth:logout");
      return { success: true };
    } catch (error) {
      console.error("Logout error:", error);
      // Still clear token on frontend
      localStorage.removeItem("token");
      localStorage.removeItem("refresh_token");
      this.events.emit("auth:logout");
      return { success: false, error };
    }
  }

  async refreshToken() {
    // Prevent concurrent refresh attempts
    if (isRefreshing) {
      return Promise.reject(new Error("Refresh already in progress"));
    }

    // Check if we actually have a refresh token before attempting
    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) {
      // If we also don't have an access token, we should consider the user logged out
      if (!localStorage.getItem("token")) {
        this.events.emit("auth:logout");
      } else {
        // Otherwise, we should prompt for login to get a new refresh token
        this.events.emit("auth:required");
      }

      return Promise.reject(new Error("No refresh token available"));
    }

    try {
      isRefreshing = true;

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
        localStorage.setItem("token", response.data.access_token);
        isRefreshing = false;
        return response.data;
      } else {
        throw new Error("Invalid response from refresh endpoint");
      }
    } catch (error) {
      // Record the failure time to implement cooldown
      refreshFailureTime = Date.now();
      isRefreshing = false;

      // Force logout if the refresh endpoint returned 401
      if (error.response && error.response.status === 401) {
        // Clear tokens
        localStorage.removeItem("token");
        localStorage.removeItem("refresh_token");
        this.events.emit("auth:logout");
      }

      throw error;
    }
  }

  // Game methods
  async startGame(options = {}) {
    try {
      const endpoint = options.longText ? "api/longstart" : "/api/start";

      // Get token for request config
      const token = localStorage.getItem("token");

      // Make the request
      const config = {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      };

      if (token) {
        config.headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await this.api.get(endpoint, config);
      return response.data;
    } catch (error) {
      console.error("Error in startGame:", error);
      if (error.response) {
        console.error("Response status:", error.response.status);
      }
      throw error;
    }
  }

  async submitGuess(encryptedLetter, guessedLetter) {
    try {
      const gameId = localStorage.getItem("uncrypt-game-id");

      // Make a direct fetch request to bypass axios interceptors
      const baseUrl =
        this.api.defaults.baseURL || process.env.REACT_APP_API_URL || "";
      const url = `${baseUrl}/api/guess`;
      const token = localStorage.getItem("token");

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

      if (!response.ok) {
        // Handle non-200 responses
        if (response.status === 401) {
          this.events.emit("auth:required");
          return { error: "Authentication required", authRequired: true };
        }
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error submitting guess:", error);
      return { error: error.message };
    }
  }

  async getHint() {
    try {
      const gameId = localStorage.getItem("uncrypt-game-id");

      // Make a direct fetch request to bypass axios interceptors
      const baseUrl =
        this.api.defaults.baseURL || process.env.REACT_APP_API_URL || "";
      const url = `${baseUrl}/api/hint`;
      const token = localStorage.getItem("token");

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ game_id: gameId }),
        credentials: "include",
      });

      if (!response.ok) {
        // Handle non-200 responses
        if (response.status === 401) {
          this.events.emit("auth:required");
          return { error: "Authentication required", authRequired: true };
        }
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error getting hint:", error);
      return { error: error.message };
    }
  }

  async getGameStatus() {
    try {
      // Get token and game ID
      const token = localStorage.getItem("token");

      // Make a direct fetch request
      const baseUrl =
        this.api.defaults.baseURL || process.env.REACT_APP_API_URL || "";
      const url = `${baseUrl}/api/game-status`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        credentials: "include",
      });

      if (!response.ok) {
        // Handle non-200 responses
        if (response.status === 401) {
          this.events.emit("auth:required");
          return { error: "Authentication required", authRequired: true };
        }
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error getting game status:", error);
      return { error: error.message };
    }
  }

  // Subscribe to events
  on(event, listener) {
    this.events.on(event, listener);
    return () => this.events.off(event, listener);
  }
}

export default new ApiService();
