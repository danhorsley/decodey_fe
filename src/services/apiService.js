// src/services/apiService.js - Fully rewritten to use Axios consistently
import axios from "axios";
import EventEmitter from "events";
import config from "../config";

// Track token refresh state
let isRefreshing = false;
let refreshFailureTime = 0;

class ApiService {
  constructor() {
    // Create main API instance with default configuration
    this.api = axios.create({
      baseURL: config.apiUrl,
      timeout: 10000,
      withCredentials: true,
    });

    // Add request interceptor to consistently add auth token to all requests
    this.api.interceptors.request.use(
      (config) => {
        const token = this.getToken();
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

    // Add response interceptor for token refresh
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // Handle 401 errors with token refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            await this.refreshToken();
            // Update token in the request headers
            originalRequest.headers.Authorization = `Bearer ${this.getToken()}`;
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

  /**
   * Get the current auth token from storage
   * @returns {string|null} The auth token or null if not found
   */
  getToken() {
    return (
      localStorage.getItem("uncrypt-token") ||
      sessionStorage.getItem("uncrypt-token")
    );
  }

  /**
   * Get game ID from storage
   * @returns {string|null} The game ID or null if not found
   */
  getGameId() {
    return localStorage.getItem("uncrypt-game-id");
  }

  /**
   * Prepare headers for request with consistent pattern
   * @param {Object} options Additional options
   * @returns {Object} Headers object
   */
  getHeaders(options = {}) {
    const { includeAuth = true, includeGameId = false } = options;

    const headers = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    // Add auth token if requested and available
    if (includeAuth) {
      const token = this.getToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    // Add game ID if requested and available
    if (includeGameId) {
      const gameId = this.getGameId();
      if (gameId) {
        headers["X-Game-ID"] = gameId;
      }
    }

    return headers;
  }

  // ===== Auth Methods =====

  /**
   * Verify the current auth token
   * @returns {Promise<Object>} Verification result
   */
  async verifyToken() {
    try {
      const response = await this.api.get("/verify_token");
      return response.data;
    } catch (error) {
      console.error("Error verifying token:", error);
      throw error;
    }
  }

  /**
   * Login user with credentials
   * @param {Object} credentials User credentials
   * @returns {Promise<Object>} Login result
   */
  async login(credentials) {
    try {
      const response = await this.api.post("/login", credentials);

      if (response.data.access_token) {
        // Store access token based on remember me preference
        if (credentials.rememberMe) {
          localStorage.setItem("uncrypt-token", response.data.access_token);
        } else {
          sessionStorage.setItem("uncrypt-token", response.data.access_token);
        }

        // Store refresh token if provided
        if (response.data.refresh_token) {
          localStorage.setItem("refresh_token", response.data.refresh_token);
        }

        // Emit login event with all data
        this.events.emit("auth:login", {
          ...response.data,
          hasActiveGame: response.data.has_active_game || false,
        });
      }

      return response.data;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  }

  /**
   * Logout current user
   * @returns {Promise<Object>} Logout result
   */
  async logout() {
    try {
      await this.api.post("/logout");

      // Clear tokens
      localStorage.removeItem("uncrypt-token");
      localStorage.removeItem("refresh_token");
      sessionStorage.removeItem("uncrypt-token");

      // Emit logout event
      this.events.emit("auth:logout");

      return { success: true };
    } catch (error) {
      console.error("Logout error:", error);

      // Still clear tokens and emit logout even on error
      localStorage.removeItem("uncrypt-token");
      localStorage.removeItem("refresh_token");
      sessionStorage.removeItem("uncrypt-token");

      this.events.emit("auth:logout");

      return { success: false, error };
    }
  }

  /**
   * Refresh the auth token using refresh token
   * @returns {Promise<Object>} Refresh result
   */
  async refreshToken() {
    // Prevent concurrent refresh attempts
    if (isRefreshing) {
      console.log("Token refresh already in progress, skipping");
      return Promise.reject(new Error("Refresh already in progress"));
    }

    // Check if we have a refresh token
    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) {
      console.warn("No refresh token available - cannot refresh");

      // Handle anonymous user case - don't automatically logout
      const hasAccessToken = this.getToken();
      if (!hasAccessToken) {
        console.log("No access token either, continuing as anonymous user");
        return Promise.reject(
          new Error("No tokens available, continuing anonymously"),
        );
      }

      // Emit appropriate event based on token availability
      if (!hasAccessToken) {
        this.events.emit("auth:logout");
      } else {
        this.events.emit("auth:required");
      }

      return Promise.reject(new Error("No refresh token available"));
    }

    try {
      console.log("Attempting to refresh token...");
      isRefreshing = true;

      // Make refresh request with refresh token in auth header
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

        // Store the new token
        const rememberMe =
          localStorage.getItem("uncrypt-remember-me") === "true";
        if (rememberMe) {
          localStorage.setItem("uncrypt-token", response.data.access_token);
        } else {
          sessionStorage.setItem("uncrypt-token", response.data.access_token);
        }

        isRefreshing = false;
        return response.data;
      } else {
        throw new Error("Invalid response from refresh endpoint");
      }
    } catch (error) {
      console.error("Token refresh failed:", error.message);

      // Record the failure time for potential cooldown implementation
      refreshFailureTime = Date.now();
      isRefreshing = false;

      // Handle 401 error by forcing logout
      if (error.response && error.response.status === 401) {
        console.warn("Refresh token is invalid or expired - logging out");
        localStorage.removeItem("uncrypt-token");
        localStorage.removeItem("refresh_token");
        sessionStorage.removeItem("uncrypt-token");
        this.events.emit("auth:logout");
      }

      throw error;
    }
  }

  // ===== Game Methods =====

  /**
   * Start a new game with given options
   * @param {Object} options Game options
   * @returns {Promise<Object>} Game data
   */
  async startGame(options = {}) {
    try {
      // Ensure difficulty is valid
      let difficulty = options.difficulty || "medium";

      // Ensure difficulty is valid
      if (!["easy", "medium", "hard"].includes(difficulty)) {
        console.warn(
          `Invalid difficulty value: ${difficulty}, defaulting to medium`,
        );
        difficulty = "medium";
      }

      // Determine endpoint based on longText option
      const endpoint = options.longText ? "/api/longstart" : "/api/start";

      // Build query parameters
      const queryParams = new URLSearchParams();
      queryParams.append("difficulty", difficulty);

      // Construct full URL
      const url = `${endpoint}${queryParams.toString() ? "?" + queryParams.toString() : ""}`;

      // Log the request for debugging
      console.log(`Starting game with URL: ${url}, difficulty: ${difficulty}`);

      // Make the request
      const response = await this.api.get(url);

      // If there's a game ID in the response, store it
      if (response.data.game_id) {
        localStorage.setItem("uncrypt-game-id", response.data.game_id);
        console.log(`Game started with ID: ${response.data.game_id}`);
      }

      return response.data;
    } catch (error) {
      console.error("Error in startGame:", error);
      throw error;
    }
  }
  /**
   * Submit a guess for the current game
   * @param {string} encryptedLetter The encrypted letter
   * @param {string} guessedLetter The guessed letter
   * @returns {Promise<Object>} Guess result
   */
  async submitGuess(encryptedLetter, guessedLetter) {
    try {
      const gameId = this.getGameId();

      // Create request data
      const data = {
        encrypted_letter: encryptedLetter,
        guessed_letter: guessedLetter,
        game_id: gameId,
      };

      // Make the request
      const response = await this.api.post("/api/guess", data);

      return response.data;
    } catch (error) {
      // Handle specific error cases
      if (error.response?.status === 401) {
        console.warn("Authentication required for guess");
        this.events.emit("auth:required");
        return { error: "Authentication required", authRequired: true };
      }

      console.error("Error submitting guess:", error);
      return { error: error.message || "Error submitting guess" };
    }
  }

  /**
   * Get a hint for the current game
   * @returns {Promise<Object>} Hint data
   */
  async getHint() {
    try {
      const gameId = this.getGameId();

      // Create request data
      const data = { game_id: gameId };

      // Make the request
      const response = await this.api.post("/api/hint", data);

      return response.data;
    } catch (error) {
      // Handle specific error cases
      if (error.response?.status === 401) {
        console.warn("Authentication required for hint");
        this.events.emit("auth:required");
        return { error: "Authentication required", authRequired: true };
      }

      console.error("Error getting hint:", error);
      return { error: error.message || "Error getting hint" };
    }
  }

  /**
   * Abandon and reset the current game
   * @returns {Promise<boolean>} Success result
   */
  async abandonAndResetGame() {
    try {
      // Try to explicitly abandon on server
      await this.api.delete("/api/abandon-game");

      // Remove game ID locally
      localStorage.removeItem("uncrypt-game-id");

      // Short delay to ensure changes propagate
      await new Promise((resolve) => setTimeout(resolve, 100));

      return true;
    } catch (error) {
      console.error("Error in abandonAndResetGame:", error);

      // Still remove the game ID locally on error
      localStorage.removeItem("uncrypt-game-id");

      return false;
    }
  }

  /**
   * Check if user has an active game
   * @returns {Promise<Object>} Active game data
   */
  async checkActiveGame() {
    try {
      // Skip check if no token
      const token = this.getToken();
      if (!token) {
        console.log("No auth token available, skipping active game check");
        return { has_active_game: false };
      }

      // Make request to check for active game
      const response = await this.api.get("/api/check-active-game");

      // Emit event if active game is found
      if (response.data?.has_active_game) {
        this.events.emit("auth:active-game-detected", {
          hasActiveGame: true,
          activeGameStats: response.data.game_stats,
        });
      }

      return response.data;
    } catch (error) {
      console.error("Error checking for active games:", error);

      // For auth errors, don't remove tokens
      if (error.response?.status === 401) {
        return { has_active_game: false, auth_error: true };
      }

      return { has_active_game: false };
    }
  }
  /**
   * Get current game status including win data if the game is complete
   * @returns {Promise<Object>} Complete game status data
   */
  async getGameStatus() {
    try {
      const token = this.getToken();
      const gameId = this.getGameId();
      const isAnonymous = !token;

      // For anonymous users, include game_id as query param
      let url = "/api/game-status";
      if (isAnonymous && gameId) {
        url += `?game_id=${encodeURIComponent(gameId)}`;
      }

      // Make the request
      const response = await this.api.get(url);

      // Log the response for debugging
      console.log("Game status response:", response.data);

      // Normalize some field names for consistency
      const data = response.data;

      // The backend might use different field naming conventions
      return {
        // Normalize boolean properties
        game_complete: data.game_complete || data.gameComplete || false,
        has_won: data.has_won || data.hasWon || false,

        // Pass through the complete data for further processing
        ...data,

        // Ensure win_data exists for consistency
        win_data: data.win_data || data.winData || null,
      };
    } catch (error) {
      console.error("Error getting game status:", error);
      return {
        error:
          error.response?.data?.message ||
          error.message ||
          "Error getting game status",
        game_complete: false,
        has_won: false,
      };
    }
  }
  /**
   * Continue an existing saved game
   * @returns {Promise<Object>} Continued game data
   */
  async continueGame() {
    try {
      // Make request to continue existing game
      const response = await this.api.get("/api/continue-game");

      // If there's a game ID in the response, store it
      if (response.data.game_id) {
        localStorage.setItem("uncrypt-game-id", response.data.game_id);
      }

      return response.data;
    } catch (error) {
      console.error("Error continuing game:", error);
      throw error;
    }
  }

  /**
   * Get current game status
   * @returns {Promise<Object>} Game status
   */
  async getGameStatus() {
    try {
      const token = this.getToken();
      const gameId = this.getGameId();
      const isAnonymous = !token;

      // For anonymous users, include game_id as query param
      let url = "/api/game-status";
      if (isAnonymous && gameId) {
        url += `?game_id=${encodeURIComponent(gameId)}`;
      }

      // Make the request
      const response = await this.api.get(url);

      return response.data;
    } catch (error) {
      // Handle specific error cases
      if (error.response?.status === 401 && token) {
        console.warn("Authentication required for game status");
        this.events.emit("auth:required");
        return { error: "Authentication required", authRequired: true };
      }

      console.error("Error getting game status:", error);
      return { error: error.message || "Error getting game status" };
    }
  }

  /**
   * Subscribe to events
   * @param {string} event Event name
   * @param {Function} listener Event listener
   * @returns {Function} Unsubscribe function
   */
  on(event, listener) {
    this.events.on(event, listener);
    return () => this.events.off(event, listener);
  }
}

export default new ApiService();
