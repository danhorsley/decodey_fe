// src/services/apiService.js - Updated with daily challenge support
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
    // Initialize token refresh strategy
    this.setupTokenRefreshStrategy();
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
  async forgotPassword(email) {
    try {
      const response = await this.api.post("/forgot-password", { email });
      return {
        success: true,
        message: response.data.message,
      };
    } catch (error) {
      console.error("Forgot password error:", error);
      return {
        success: false,
        error: error.response?.data?.error || "Failed to process request",
      };
    }
  }

  // In your apiService.js file
  async logout() {
    try {
      await this.api.post("/logout");

      // Clear tokens
      localStorage.removeItem("uncrypt-token");
      localStorage.removeItem("refresh_token");
      sessionStorage.removeItem("uncrypt-token");

      // Clean up the refresh interval
      if (this.refreshIntervalId) {
        clearInterval(this.refreshIntervalId);
        this.refreshIntervalId = null;
      }

      // Emit logout event
      this.events.emit("auth:logout");

      return { success: true };
    } catch (error) {
      console.error("Logout error:", error);

      // Still clear tokens and emit logout even on error
      localStorage.removeItem("uncrypt-token");
      localStorage.removeItem("refresh_token");
      sessionStorage.removeItem("uncrypt-token");

      // Clean up the refresh interval even if there was an error
      if (this.refreshIntervalId) {
        clearInterval(this.refreshIntervalId);
        this.refreshIntervalId = null;
      }

      this.events.emit("auth:logout");

      return { success: false, error };
    }
  }
  /**
   * Refresh the auth token using refresh token
   * @returns {Promise<Object>} Refresh result
   */
  /**
   * Check if a username is available for registration
   * @param {string} username The username to check
   * @returns {Promise<Object>} Availability result
   */
  async checkUsernameAvailability(username) {
    try {
      const response = await this.api.post("/check-username", { username });
      return response.data;
    } catch (error) {
      console.error("Error checking username availability:", error);
      return {
        available: false,
        message: error.response?.data?.message || "Error checking username",
      };
    }
  }

  /**
   * Register a new user
   * @param {Object} data Registration data
   * @returns {Promise<Object>} Registration result
   */
  async signup(data) {
    try {
      const response = await this.api.post("/signup", data);
      return response.data;
    } catch (error) {
      console.error("Signup error:", error);
      throw error;
    }
  }

  async refreshToken() {
    // Prevent concurrent refresh attempts
    if (isRefreshing) {
      console.log("Token refresh already in progress, skipping");
      return Promise.reject(new Error("Refresh already in progress"));
    }

    // Check if we have a refresh token
    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) {
      console.warn("No refresh token available - proceeding as anonymous user");

      // We'll handle this as a specific kind of "success: false" that indicates
      // we should continue as anonymous without throwing an error
      return {
        success: false,
        anonymous: true,
        message: "No refresh token available",
      };
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

      // Handle 401 error by returning a clean object instead of throwing
      if (error.response && error.response.status === 401) {
        console.warn("Refresh token is invalid or expired");
        return {
          success: false,
          expired: true,
          message: "Refresh token is invalid or expired",
        };
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
      const endpoint = "/api/start";

      // Build query parameters
      const queryParams = new URLSearchParams();
      queryParams.append("difficulty", difficulty);
      // Add longText parameter to query string
      if (options.longText) {
        queryParams.append("longText", "true");
      }
      // Add hardcore mode parameter to query string
      if (options.hardcoreMode) {
        queryParams.append("hardcore", "true");
      }
      // Construct full URL
      const url = `${endpoint}${queryParams.toString() ? "?" + queryParams.toString() : ""}`;

      // Check if we have a token (authenticated user)
      const token = this.getToken();
      const isAnonymousStart = !token;

      // Log the request for debugging
      console.log(
        `Starting game with URL: ${url}, difficulty: ${difficulty}, anonymous: ${isAnonymousStart}`,
      );

      try {
        // Make the request through our normal API instance
        const response = await this.api.get(url);

        // If there's a game ID in the response, store it
        if (response.data.game_id) {
          localStorage.setItem("uncrypt-game-id", response.data.game_id);
          console.log(`Game started with ID: ${response.data.game_id}`);
        }

        return response.data;
      } catch (error) {
        // If we get a 401 error, try an anonymous start
        if (error.response?.status === 401) {
          console.log("Auth error in startGame, trying anonymous start");

          // For anonymous start, create a request config without auth headers
          const config = {
            url: url,
            method: "get",
            baseURL: this.api.defaults.baseURL,
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            // Do not include auth headers
          };

          // Use our API instance but with a custom config that doesn't trigger the auth interceptor
          const anonResponse = await this.api.request(config);

          // If there's a game ID in the response, store it
          if (anonResponse.data.game_id) {
            localStorage.setItem("uncrypt-game-id", anonResponse.data.game_id);
            console.log(
              `Anonymous game started with ID: ${anonResponse.data.game_id}`,
            );
          }

          return anonResponse.data;
        }

        // Rethrow the error if it's not a 401
        throw error;
      }
    } catch (error) {
      console.error("Error in startGame:", error);
      throw error;
    }
  }

  /**
   * Start a daily challenge for the given date
   * @param {string} dateString Date string in YYYY-MM-DD format
   * @returns {Promise<Object>} Game data
   */
  async startDailyChallenge(dateString) {
    try {
      // Validate date string
      if (!dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        throw new Error("Invalid date format. Use YYYY-MM-DD");
      }

      // Build the URL
      const url = `/api/daily/${dateString}`;

      // Check if we have a token (authenticated user)
      const token = this.getToken();
      const isAnonymousStart = !token;

      // Log the request for debugging
      console.log(
        `Starting daily challenge for date: ${dateString}, anonymous: ${isAnonymousStart}`,
      );

      try {
        // Make the request through our normal API instance
        console.log("***url daily***", url);
        const response = await this.api.get(url);

        // If there's a game ID in the response, store it
        if (response.data.game_id) {
          localStorage.setItem("uncrypt-game-id", response.data.game_id);
          console.log(
            `Daily challenge started with ID: ${response.data.game_id}`,
          );
        }

        return response.data;
      } catch (error) {
        // If we get a 401 error, try an anonymous start
        if (error.response?.status === 401) {
          console.log(
            "Auth error in startDailyChallenge, trying anonymous start",
          );

          // For anonymous start, create a request config without auth headers
          const config = {
            url: url,
            method: "get",
            baseURL: this.api.defaults.baseURL,
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            // Do not include auth headers
          };
          console.log("***config***", config);
          // Use our API instance but with a custom config that doesn't trigger the auth interceptor
          const anonResponse = await this.api.request(config);

          // If there's a game ID in the response, store it
          if (anonResponse.data.game_id) {
            localStorage.setItem("uncrypt-game-id", anonResponse.data.game_id);
            console.log(
              `Anonymous daily challenge started with ID: ${anonResponse.data.game_id}`,
            );
          }

          return anonResponse.data;
        }

        // Rethrow the error if it's not a 401
        throw error;
      }
    } catch (error) {
      console.error("Error in startDailyChallenge:", error);
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
      console.log(`Submitting guess with game ID: ${gameId}`);

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
      console.log(`Requesting hint with game ID: ${gameId}`);

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
      // Check if user is authenticated
      const token = this.getToken();

      // For anonymous users, skip the server call completely
      if (!token) {
        console.log("Anonymous user - skipping server-side abandon call");

        // Just remove game ID locally - no need for server call
        localStorage.removeItem("uncrypt-game-id");

        return true;
      }

      // For authenticated users, perform the normal server-side abandon
      try {
        // Try to explicitly abandon on server
        await this.api.delete("/api/abandon-game");
      } catch (serverError) {
        console.warn("Error in server-side game abandonment:", serverError);
        // Continue anyway - the important part is clearing local state
      }

      // Remove game ID locally
      localStorage.removeItem("uncrypt-game-id");

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
   * Check if the daily challenge for a given date has been completed
   * @param {string} dateString Date string in YYYY-MM-DD format
   * @returns {Promise<Object>} Completion status
   */
  async checkDailyCompletion(dateString) {
    try {
      // Skip check if no token (anonymous users can't have completion history)
      const token = this.getToken();
      if (!token) {
        console.log("No auth token available, no daily completion possible");
        return {
          is_completed: false,
          anonymous: true,
        };
      }

      // Validate date string
      if (!dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        throw new Error("Invalid date format. Use YYYY-MM-DD");
      }

      // Make request to check for daily completion
      const response = await this.api.get(
        `/api/daily-completion/${dateString}`,
      );

      return {
        is_completed: response.data.is_completed || false,
        completion_data: response.data.completion_data || null,
      };
    } catch (error) {
      console.error("Error checking daily completion:", error);

      // For auth errors, don't report as error
      if (error.response?.status === 401) {
        return { is_completed: false, auth_error: true };
      }

      return { is_completed: false, error: true };
    }
  }

  /**
   * Get daily challenge stats for the current user
   * @returns {Promise<Object>} Daily stats
   */
  async getDailyStats() {
    try {
      // Skip check if no token (anonymous users can't have stats)
      const token = this.getToken();
      if (!token) {
        console.log("No auth token available, no daily stats possible");
        return {
          success: false,
          anonymous: true,
          dailyStats: {
            currentStreak: 0,
            bestStreak: 0,
            totalCompleted: 0,
            completionRate: 0,
          },
        };
      }

      // Make request to get daily stats
      const response = await this.api.get("/api/daily-stats");

      return {
        success: true,
        dailyStats: response.data,
      };
    } catch (error) {
      console.error("Error getting daily stats:", error);

      // For auth errors, don't report as error
      if (error.response?.status === 401) {
        return {
          success: false,
          auth_error: true,
          dailyStats: {
            currentStreak: 0,
            bestStreak: 0,
            totalCompleted: 0,
            completionRate: 0,
          },
        };
      }

      return {
        success: false,
        error: true,
        dailyStats: {
          currentStreak: 0,
          bestStreak: 0,
          totalCompleted: 0,
          completionRate: 0,
        },
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

  setupTokenRefreshStrategy() {
    // 1. Schedule regular token refresh while the app is running
    // const refreshInterval = 55 * 60 * 1000; // 55 minutes
    const refreshInterval = 5 * 60 * 1000; // 55 minutes

    // Start the periodic refresh
    this.refreshIntervalId = setInterval(async () => {
      if (this.getToken()) {
        try {
          await this.refreshToken();
          console.log("Successfully refreshed token on schedule");
        } catch (error) {
          console.log(
            "Scheduled token refresh failed - will retry on next interval",
          );
        }
      }
    }, refreshInterval);

    // 2. Listen for online events to handle reconnection
    window.addEventListener("online", async () => {
      console.log("Network connection restored, checking authentication");

      // Check if we should try to get a new token
      const accessToken = this.getToken();
      const refreshToken = localStorage.getItem("refresh_token");

      if (!accessToken && refreshToken) {
        try {
          await this.refreshToken();
          console.log("Successfully refreshed token after reconnection");
        } catch (error) {
          console.error("Failed to refresh token after reconnection:", error);
        }
      }
    });

    // 3. Initial check on startup
    this.checkAuthOnStartup();
  }

  // Check and refresh authentication on startup
  async checkAuthOnStartup() {
    // If we have a refresh token but no valid access token, try to refresh
    const accessToken = this.getToken();
    const refreshToken = localStorage.getItem("refresh_token");

    if (!accessToken && refreshToken) {
      try {
        await this.refreshToken();
        console.log("Successfully restored session on startup");
      } catch (error) {
        console.error("Could not restore session on startup:", error);
      }
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

      // Log the response for debugging
      console.log("Game status response:", response.data);

      // Normalize some field names for consistency
      const data = response.data;

      // The backend might use different field naming conventions
      return {
        // Normalize boolean properties
        game_complete: data.game_complete || data.gameComplete || false,
        has_won: data.has_won || data.hasWon || false,

        // Ensure streak data is passed through
        current_daily_streak: data.current_daily_streak || 0,

        // Pass through the complete data for further processing
        ...data,

        // Ensure win_data exists for consistency
        win_data: {
          ...(data.win_data || data.winData || {}),
          // Add streak to win_data if it exists at the top level but not in win_data
          current_daily_streak: data.current_daily_streak || 
                               (data.win_data?.current_daily_streak || 
                                data.winData?.current_daily_streak || 0)
        }
      };
    } catch (error) {
      // Handle specific error cases
      const currentToken = this.getToken(); // Define token in catch block scope

      if (error.response?.status === 401 && currentToken) {
        console.warn("Authentication required for game status");
        this.events.emit("auth:required");
        return { error: "Authentication required", authRequired: true };
      }

      console.error("Error getting game status:", error);
      return {
        error:
          error.response?.data?.message ||
          error.message ||
          "Error getting game status",
        game_complete: false,
        has_won: false,
        current_daily_streak: 0
      };
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
