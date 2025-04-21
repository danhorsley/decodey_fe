// src/services/gameService.js
// A simplified service for game initialization and management
import apiService from "./apiService";
import config from "../config";
import EventEmitter from "events";

// Create a single event emitter for the entire service
const events = new EventEmitter();

// Track initialization state to prevent race conditions
let isInitializing = false;

/**
 * Game Service
 * Simplified replacement for the strategy pattern
 */
const gameService = {
  // Events that components can subscribe to
  events: {
    ACTIVE_GAME_FOUND: "game:active-game-found",
    DAILY_ALREADY_COMPLETED: "daily:already-completed",
    LOGOUT_TRANSITION: "auth:logout-transition",
    STATE_CHANGED: "game:state-changed",
  },

  /**
   * Subscribe to game events
   * @param {string} event - Event name to listen for
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  onEvent(event, callback) {
    if (typeof callback !== "function") {
      console.error("Event callback must be a function");
      return () => {};
    }

    events.on(event, callback);
    return () => events.off(event, callback);
  },

  /**
   * Initialize game - handle all cases (daily, custom, anonymous, authenticated)
   * @param {Object} options - Game options
   * @returns {Promise<Object>} Result with success flag
   */
  async initializeGame(options = {}) {
    // Prevent multiple initializations
    if (isInitializing) {
      console.log("Game initialization already in progress, returning early");
      return { success: false, reason: "already-initializing" };
    }

    isInitializing = true;
    console.log("Initializing game with options:", options);

    try {
      // Get auth status
      const isAuthenticated = !!config.session.getAuthToken();
      const hasExistingGameId = !!localStorage.getItem("uncrypt-game-id");

      // Handle explicit requests for daily challenge
      if (options.daily === true) {
        return await this.startDailyChallenge();
      }

      // For authenticated users, check for active game
      if (isAuthenticated && !options.customGameRequested) {
        const activeGameCheck = await this.checkActiveGame();

        if (activeGameCheck.hasActiveGame) {
          console.log("Active game found, emitting event");
          events.emit(this.events.ACTIVE_GAME_FOUND, {
            gameStats: activeGameCheck.gameStats,
          });

          return {
            success: true,
            activeGameFound: true,
            gameStats: activeGameCheck.gameStats,
          };
        }
      }

      // Handle different initialization cases
      if (options.customGameRequested) {
        // For custom game requests (both anon and auth)
        console.log("Starting custom game");
        const gameData = await apiService.startGame(options);

        if (gameData.game_id) {
          localStorage.setItem("uncrypt-game-id", gameData.game_id);
        }

        return { success: true, gameData, isCustomGame: true };
      } else if (!isAuthenticated && !hasExistingGameId) {
        // For new anonymous users with no game, start with daily
        console.log("New anonymous user - starting with daily challenge");
        return await this.startDailyChallenge();
      } else {
        // Default behavior - start standard game
        console.log("Starting standard game");
        const gameData = await apiService.startGame(options);

        if (gameData.game_id) {
          localStorage.setItem("uncrypt-game-id", gameData.game_id);
        }

        return { success: true, gameData };
      }
    } catch (error) {
      console.error("Error initializing game:", error);
      return { success: false, error };
    } finally {
      // Add some delay before clearing the flag to avoid race conditions
      setTimeout(() => {
        isInitializing = false;
      }, 500);
    }
  },

  /**
   * Start today's daily challenge
   * @returns {Promise<Object>} Result with success flag
   */
  async startDailyChallenge() {
    try {
      console.log("Starting daily challenge");

      // Only authenticated users can have completed a daily challenge
      const isAuthenticated = !!config.session.getAuthToken();

      // For authenticated users, check if today's challenge is already completed
      if (isAuthenticated) {
        const dailyCompletion = await this.checkDailyCompletion();

        if (dailyCompletion.isCompleted) {
          console.log("Daily challenge already completed");
          events.emit(this.events.DAILY_ALREADY_COMPLETED, {
            completionData: dailyCompletion.completionData,
          });

          return {
            success: false,
            alreadyCompleted: true,
            completionData: dailyCompletion.completionData,
          };
        }
      }

      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split("T")[0];

      // Clear any existing game ID first
      localStorage.removeItem("uncrypt-game-id");

      // Start daily challenge - always force 'easy' difficulty
      const gameData = await apiService.startDailyChallenge(today, {
        difficulty: "easy",
      });

      // Store game ID if available
      if (gameData.game_id) {
        localStorage.setItem("uncrypt-game-id", gameData.game_id);
      }

      return { success: true, gameData, daily: true };
    } catch (error) {
      console.error("Error starting daily challenge:", error);
      return { success: false, error };
    }
  },

  /**
   * Check if today's daily challenge has been completed (auth users only)
   * @returns {Promise<Object>} Result with isCompleted flag
   */
  async checkDailyCompletion() {
    try {
      const isAuthenticated = !!config.session.getAuthToken();

      // Anonymous users cannot have completion history
      if (!isAuthenticated) {
        return {
          isCompleted: false,
          anonymous: true,
          message:
            "Anonymous users do not have persistent daily completion status",
        };
      }

      // Get today's date
      const today = new Date().toISOString().split("T")[0];

      // Call API to check completion
      const result = await apiService.checkDailyCompletion(today);

      return {
        isCompleted: result?.is_completed || false,
        completionData: result?.completion_data || null,
      };
    } catch (error) {
      console.error("Error checking daily completion:", error);
      return { isCompleted: false, error };
    }
  },

  /**
   * Continue a saved game (auth users only)
   * @returns {Promise<Object>} Result with success flag
   */
  async continueGame() {
    try {
      const isAuthenticated = !!config.session.getAuthToken();

      // Anonymous users cannot continue games
      if (!isAuthenticated) {
        return {
          success: false,
          reason: "anonymous-user",
          message: "Anonymous users cannot continue games between sessions",
        };
      }

      // Call API to continue the game
      const gameData = await apiService.continueGame();

      // Store game ID if available
      if (gameData.game_id) {
        localStorage.setItem("uncrypt-game-id", gameData.game_id);
      }

      return { success: true, gameData };
    } catch (error) {
      console.error("Error continuing game:", error);
      return { success: false, error };
    }
  },

  /**
   * Abandon current game and start a new one
   * @param {Object} options - Game options
   * @returns {Promise<Object>} Result with success flag
   */
  async abandonAndStartNew(options = {}) {
    try {
      // Only call abandon API for authenticated users
      const isAuthenticated = !!config.session.getAuthToken();

      if (isAuthenticated) {
        try {
          await apiService.abandonAndResetGame();
        } catch (error) {
          console.warn("Error abandoning game:", error);
          // Continue anyway - the important part is starting a new game
        }
      }

      // Always clear local storage
      localStorage.removeItem("uncrypt-game-id");

      // Start new game
      return await this.initializeGame({
        ...options,
        customGameRequested: true, // Force as custom game
      });
    } catch (error) {
      console.error("Error in abandon and start new:", error);
      return { success: false, error };
    }
  },

  /**
   * Check if user has an active game
   * @returns {Promise<Object>} Result with hasActiveGame flag
   */
  async checkActiveGame() {
    try {
      const isAuthenticated = !!config.session.getAuthToken();

      // Anonymous users cannot have active games between sessions
      if (!isAuthenticated) {
        return { hasActiveGame: false, anonymous: true };
      }

      // Call API to check for active game
      const result = await apiService.checkActiveGame();

      return {
        hasActiveGame: result.has_active_game || false,
        gameStats: result.game_stats || null,
      };
    } catch (error) {
      console.error("Error checking for active game:", error);
      return { hasActiveGame: false, error };
    }
  },

  /**
   * Handle user login and check for active games
   * @param {Object} credentials - User credentials
   * @returns {Promise<Object>} Login result
   */
  async login(credentials) {
    try {
      // Attempt login via API service
      const loginResult = await apiService.login(credentials);

      // Check for existing game after successful login
      if (loginResult && loginResult.access_token) {
        try {
          const activeGameCheck = await this.checkActiveGame();

          if (activeGameCheck.hasActiveGame) {
            // Notify UI about active game
            events.emit(this.events.ACTIVE_GAME_FOUND, {
              gameStats: activeGameCheck.gameStats,
            });

            return {
              success: true,
              hasActiveGame: true,
              activeGameStats: activeGameCheck.gameStats,
            };
          }
        } catch (checkError) {
          console.warn("Error checking for active game:", checkError);
        }
      }

      return {
        success: !!loginResult && !!loginResult.access_token,
        hasActiveGame: false,
        loginData: loginResult,
      };
    } catch (error) {
      console.error("Error in login:", error);
      return { success: false, error };
    }
  },

  /**
   * Handle user logout
   * @param {boolean} startAnonymousGame - Whether to start a new game after logout
   * @returns {Promise<Object>} Logout result
   */
  async logout(startAnonymousGame = true) {
    try {
      // Attempt logout
      await apiService.logout();

      // Clear tokens
      localStorage.removeItem(config.AUTH_KEYS.TOKEN);
      sessionStorage.removeItem(config.AUTH_KEYS.TOKEN);

      // Emit event for UI state transition
      events.emit(this.events.LOGOUT_TRANSITION);

      // Start a new anonymous game if requested
      if (startAnonymousGame) {
        // Clear any existing game ID
        localStorage.removeItem("uncrypt-game-id");

        // Start a new game - prefer daily challenge for anonymous users
        const gameResult = await this.startDailyChallenge();

        // Emit event for game state transition
        if (gameResult.success) {
          events.emit(this.events.STATE_CHANGED, {
            source: "logout-transition",
          });
        }

        return { ...gameResult, logoutSuccess: true };
      }

      return { success: true };
    } catch (error) {
      console.error("Error during logout:", error);

      // Still clear tokens even on error
      localStorage.removeItem(config.AUTH_KEYS.TOKEN);
      sessionStorage.removeItem(config.AUTH_KEYS.TOKEN);

      // Emit logout event even on error
      events.emit(this.events.LOGOUT_TRANSITION);

      return { success: false, error };
    }
  },
};

export default gameService;
