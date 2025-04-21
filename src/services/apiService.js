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
    console.log("DEBUG: Calling setupTokenRefreshStrategy from constructor");
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
      console.log("DEBUG: Login attempt with credentials:", {
        username: credentials.username,
        password: credentials.password ? "[REDACTED]" : undefined,
        rememberMe: credentials.rememberMe,
      });

      // Log existing tokens before login
      console.log("DEBUG: BEFORE LOGIN - Storage check:");
      console.log(
        "- localStorage.uncrypt-token:",
        !!localStorage.getItem("uncrypt-token"),
      );
      console.log(
        "- localStorage.refresh_token:",
        !!localStorage.getItem("refresh_token"),
      );
      console.log(
        "- sessionStorage.uncrypt-token:",
        !!sessionStorage.getItem("uncrypt-token"),
      );

      const response = await this.api.post("/login", credentials);

      // Log full response for debugging (except sensitive data)
      console.log("DEBUG: RAW LOGIN RESPONSE:", {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: {
          ...response.data,
          access_token: response.data.access_token ? "[PRESENT]" : "[MISSING]",
          refresh_token: response.data.refresh_token
            ? "[PRESENT]"
            : "[MISSING]",
        },
      });

      if (response.data.access_token) {
        // Store access token based on remember me preference
        if (credentials.rememberMe) {
          localStorage.setItem("uncrypt-token", response.data.access_token);
          console.log(
            "DEBUG: ✅ Saved access token to localStorage (rememberMe=true)",
          );
        } else {
          sessionStorage.setItem("uncrypt-token", response.data.access_token);
          console.log(
            "DEBUG: ✅ Saved access token to sessionStorage (rememberMe=false)",
          );
        }

        // Store refresh token if provided - ALWAYS in localStorage regardless of rememberMe
        if (response.data.refresh_token) {
          localStorage.setItem("refresh_token", response.data.refresh_token);
          console.log("DEBUG: ✅ Saved refresh token to localStorage");
        } else {
          console.warn("DEBUG: ⚠️ NO REFRESH TOKEN PROVIDED IN LOGIN RESPONSE");
        }

        // Also store remember_me preference for future token operations
        localStorage.setItem(
          "uncrypt-remember-me",
          credentials.rememberMe ? "true" : "false",
        );
        console.log(
          "DEBUG: ✅ Saved remember-me preference:",
          credentials.rememberMe,
        );

        // Emit login event with all data
        this.events.emit("auth:login", {
          ...response.data,
          hasActiveGame: response.data.has_active_game || false,
        });

        // Log storage after login
        console.log("DEBUG: AFTER LOGIN - Storage check:");
        console.log(
          "- localStorage.uncrypt-token:",
          !!localStorage.getItem("uncrypt-token"),
        );
        console.log(
          "- localStorage.refresh_token:",
          !!localStorage.getItem("refresh_token"),
        );
        console.log(
          "- sessionStorage.uncrypt-token:",
          !!sessionStorage.getItem("uncrypt-token"),
        );
      } else {
        console.warn("DEBUG: ⚠️ LOGIN RESPONSE MISSING ACCESS TOKEN");
      }

      return response.data;
    } catch (error) {
      console.error("DEBUG: Login error:", error);
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
    // Reset isRefreshing if it's been set for more than 30 seconds
    // This prevents stuck state if a previous refresh attempt never completed
    if (isRefreshing) {
      const refreshingTime = Date.now() - refreshFailureTime;
      if (refreshingTime > 30000) {
        // 30 seconds
        console.log("Resetting stuck isRefreshing flag after 30 seconds");
        isRefreshing = false;
      }
    }

    // Prevent concurrent refresh attempts
    if (isRefreshing) {
      console.log("Token refresh already in progress, skipping");
      return Promise.reject(new Error("Refresh already in progress"));
    }

    // Set refreshing flag
    isRefreshing = true;

    try {
      // Check if we have a refresh token
      const refreshToken = localStorage.getItem("refresh_token");
      console.log("Refresh token exists:", !!refreshToken);

      if (!refreshToken) {
        console.warn(
          "No refresh token available - proceeding as anonymous user",
        );
        isRefreshing = false; // Reset flag before returning

        return {
          success: false,
          anonymous: true,
          message: "No refresh token available",
        };
      }

      console.log("Attempting to refresh token");

      // Create a direct axios request to bypass interceptors that might add access token
      const response = await axios({
        method: "post",
        url: `${this.api.defaults.baseURL}/refresh`,
        headers: {
          Authorization: `Bearer ${refreshToken}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        timeout: 10000,
      });

      if (response.data.access_token) {
        console.log("Successfully refreshed access token");

        // Store the new token based on remember me preference
        const rememberMe =
          localStorage.getItem("uncrypt-remember-me") === "true";

        if (rememberMe) {
          localStorage.setItem("uncrypt-token", response.data.access_token);
        } else {
          sessionStorage.setItem("uncrypt-token", response.data.access_token);
        }

        // Handle new refresh token if provided
        if (response.data.refresh_token) {
          localStorage.setItem("refresh_token", response.data.refresh_token);
        }

        isRefreshing = false; // Reset flag on success
        return {
          success: true,
          access_token: response.data.access_token,
          ...response.data,
        };
      } else {
        console.log("Invalid response - no access_token in data");
        isRefreshing = false; // Reset flag before throwing
        throw new Error("Invalid response from refresh endpoint");
      }
    } catch (error) {
      console.error("Token refresh failed:", error.message);

      // Record the failure time for potential cooldown implementation
      refreshFailureTime = Date.now();

      // Always reset the flag
      isRefreshing = false;

      // Handle 401 error by returning a clean object instead of throwing
      if (error.response && error.response.status === 401) {
        console.warn("Refresh token is invalid or expired (401 response)");

        // Check if we should clear the refresh token on unauthorized
        if (
          error.response.data &&
          error.response.data.msg === "Token has been revoked"
        ) {
          console.warn("Clearing invalid refresh token from storage");
          localStorage.removeItem("refresh_token");
        }

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
  // Modified startGame method to handle rate limiting and prevent duplicate calls
  async startGame(options = {}) {
    try {
      // If a call is already in progress, return that promise
      if (this._startGameInProgress) {
        console.log("startGame: Using existing in-progress request");
        return this._startGamePromise;
      }

      // Set lock
      this._startGameInProgress = true;

      // Start with creating the actual request promise
      this._startGamePromise = (async () => {
        try {
          // Ensure difficulty is valid
          const difficulty = ["easy", "medium", "hard"].includes(
            options.difficulty,
          )
            ? options.difficulty
            : "medium";

          // Build query parameters
          const queryParams = new URLSearchParams();
          queryParams.append("difficulty", difficulty);
          if (options.longText) queryParams.append("longText", "true");
          if (options.hardcoreMode) queryParams.append("hardcore", "true");

          const endpoint = "/api/start";
          const url = `${endpoint}${queryParams.toString() ? "?" + queryParams.toString() : ""}`;

          // Check if we're anonymous or authenticated
          const token = this.getToken();
          const isAnonymousStart = !token;

          console.log(
            `Starting game with URL: ${url}, difficulty: ${difficulty}, anonymous: ${isAnonymousStart}`,
          );

          let response;

          // For anonymous users, ensure we don't send any auth tokens
          if (isAnonymousStart) {
            // Use fetch API for anonymous requests to avoid axios defaults
            const fetchResponse = await fetch(
              `${this.api.defaults.baseURL}${url}`,
              {
                method: "GET",
                headers: {
                  Accept: "application/json",
                  "Content-Type": "application/json",
                },
                // Explicitly disable credentials
                credentials: "omit",
              },
            );

            // Handle 429 errors specifically
            if (fetchResponse.status === 429) {
              const data = await fetchResponse.json();
              console.warn(
                `Rate limited: ${data.error}, cooldown: ${data.cooldown_remaining}s`,
              );
              throw new Error(
                `Rate limited: Please wait ${data.cooldown_remaining}s before trying again`,
              );
            }

            if (!fetchResponse.ok) {
              throw new Error(
                `HTTP error ${fetchResponse.status}: ${fetchResponse.statusText}`,
              );
            }

            const data = await fetchResponse.json();
            response = { data };
          } else {
            // For authenticated users, use the API instance with auth
            response = await this.api.get(url);
          }

          // Store game ID if present
          if (response.data.game_id) {
            localStorage.setItem("uncrypt-game-id", response.data.game_id);
            console.log(`Game started with ID: ${response.data.game_id}`);
          }

          return response.data;
        } catch (error) {
          // Simply rethrow the error - we'll handle it in the outer catch
          throw error;
        } finally {
          // Clear the lock in the finally block to ensure it's always cleared
          setTimeout(() => {
            this._startGameInProgress = false;
          }, 2000); // Clear the lock after 2s to prevent rapid retries
        }
      })();

      // Return the promise
      return await this._startGamePromise;
    } catch (error) {
      console.error("Error in startGame:", error);
      // Ensure lock is cleared on error
      setTimeout(() => {
        this._startGameInProgress = false;
      }, 2000);
      throw error;
    }
  }

  /**
   * Start a daily challenge for the given date
   * @param {string} dateString Optional date string in YYYY-MM-DD format (defaults to today)
   * @returns {Promise<Object>} Game data
   */
  async startDailyChallenge(dateString) {
    try {
      // If no dateString provided, use today's date
      if (!dateString) {
        const today = new Date();
        // Format as YYYY-MM-DD
        dateString = today.toISOString().split('T')[0];
      }

      // Validate date string
      if (!dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        throw new Error("Invalid date format. Use YYYY-MM-DD");
      }

      console.log(`Starting daily challenge for date: ${dateString}`);

      // Build the URL - must use /daily/YYYY-MM-DD format
      const url = `/api/daily/${dateString}`;

      // Check if we have a token (authenticated user)
      const token = this.getToken();
      const isAnonymousStart = !token;

      try {
        // For authenticated users, use standard API call
        if (!isAnonymousStart) {
          console.log("Making authenticated daily challenge request");
          const response = await this.api.get(url);

          // If there's a game ID in the response, store it
          if (response.data.game_id) {
            localStorage.setItem("uncrypt-game-id", response.data.game_id);
            console.log(`Daily challenge started with ID: ${response.data.game_id}`);
          }

          return response.data;
        } else {
          // For anonymous users, use fetch directly to avoid auth headers
          console.log("Making anonymous daily challenge request");

          // Create the full URL
          const fullUrl = `${this.api.defaults.baseURL}${url}`;
          console.log("Full URL for fetch:", fullUrl);

          const response = await fetch(fullUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            credentials: 'omit' // Important: don't send credentials for anonymous requests
          });

          // Check for errors
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`HTTP error ${response.status}: ${errorData.error || response.statusText}`);
          }

          // Parse the response
          const data = await response.json();

          // If there's a game ID in the response, store it
          if (data.game_id) {
            localStorage.setItem("uncrypt-game-id", data.game_id);
            console.log(`Anonymous daily challenge started with ID: ${data.game_id}`);
          }

          return data;
        }
      } catch (error) {
        // Handle specific errors
        console.error("Error in startDailyChallenge:", error);

        // If the error indicates the daily is already completed
        if (error.response?.data?.already_completed) {
          return {
            success: false,
            alreadyCompleted: true,
            completionData: error.response.data.completion_data
          };
        }

        // If fetch error with already_completed in the response
        if (error.message?.includes("already completed")) {
          return {
            success: false,
            alreadyCompleted: true,
            // Try to extract completion data if available
            completionData: error.completion_data || null
          };
        }

        // Rethrow if we can't recover
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
    const refreshInterval = 55 * 60 * 1000; // 55 minutes for production
    // DEBUG: Setting very short interval for testing
    // const refreshInterval = 10 * 1000; // 10 seconds for debugging

    console.log(
      "DEBUG: Setting up token refresh with interval:",
      refreshInterval,
      "ms",
    );

    // Start the periodic refresh
    this.refreshIntervalId = setInterval(async () => {
      console.log("DEBUG: Token refresh interval triggered");

      const token = this.getToken();
      console.log("DEBUG: Current token exists:", !!token);

      if (token) {
        try {
          console.log("DEBUG: Attempting to refresh token...");
          await this.refreshToken();
          console.log("DEBUG: Successfully refreshed token on schedule");
        } catch (error) {
          console.log(
            "DEBUG: Scheduled token refresh failed - will retry on next interval",
            error,
          );
        }
      } else {
        console.log("DEBUG: No token found, skipping refresh");
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
          current_daily_streak:
            data.current_daily_streak ||
            data.win_data?.current_daily_streak ||
            data.winData?.current_daily_streak ||
            0,
        },
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
        current_daily_streak: 0,
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
