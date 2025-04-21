// src/services/gameService.js - Improved with proper state management
import apiService from "./apiService";
import config from "../config";
import EventEmitter from "events";
import useGameStore from "../stores/gameStore";

// Create a single event emitter for the entire service
const events = new EventEmitter();

// Track initialization state to prevent race conditions
let isInitializing = false;

/**
 * Game Service
 * Centralized manager for game logic that coordinates API calls and store updates
 */
const gameService = {
  // Events that components can subscribe to
  events: {
    ACTIVE_GAME_FOUND: "game:active-game-found",
    DAILY_ALREADY_COMPLETED: "daily:already-completed",
    LOGOUT_TRANSITION: "auth:logout-transition",
    STATE_CHANGED: "game:state-changed",
    GAME_INITIALIZED: "game:initialized",
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

      console.log(
        "Init status: authenticated:",
        isAuthenticated,
        "hasExistingGameId:",
        hasExistingGameId,
      );

      // Handle explicit requests for daily challenge
      if (options.daily === true) {
        return await this.startDailyChallenge();
      }

      // IMPORTANT: For anonymous users, ALWAYS start with daily challenge
      // unless a custom game is explicitly requested
      if (!isAuthenticated && !options.customGameRequested) {
        console.log(
          "Anonymous user - always starting with daily challenge regardless of existing ID",
        );
        // Clear any existing game ID first to ensure a fresh start
        localStorage.removeItem("uncrypt-game-id");
        return await this.startDailyChallenge();
      }

      // For authenticated users, check for active game
      if (isAuthenticated && !options.customGameRequested) {
        console.log("Checking for active game for authenticated user");
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

        // FIXED: Update game store directly here instead of relying on component
        this._updateGameState(gameData, { isCustomGame: true });

        events.emit(this.events.GAME_INITIALIZED, {
          customGame: true,
          gameData,
        });

        return { success: true, gameData, isCustomGame: true };
      } else if (isAuthenticated && hasExistingGameId) {
        // If there's an existing game ID in localStorage for authenticated users, try to continue that game
        console.log(
          "Authenticated user with existing game ID:",
          localStorage.getItem("uncrypt-game-id"),
        );

        try {
          // Try to continue the game for authenticated users
          console.log(
            "Authenticated user with existing game ID - trying to continue",
          );
          const continueResult = await this.continueGame();

          if (continueResult.success) {
            return continueResult;
          }

          // If continue failed, start a new game
          console.log("Continue failed, starting new game");
          const gameData = await apiService.startGame(options);

          if (gameData.game_id) {
            localStorage.setItem("uncrypt-game-id", gameData.game_id);
          }

          // FIXED: Update game store directly
          this._updateGameState(gameData);

          events.emit(this.events.GAME_INITIALIZED, {
            resumedGame: false,
            newGame: true,
            gameData,
          });

          return { success: true, gameData, newGame: true };
        } catch (error) {
          console.error("Error handling existing game:", error);
          // Fall through to default new game below
        }
      }

      // Default behavior - start standard game
      console.log("Starting standard game");
      const gameData = await apiService.startGame(options);

      if (gameData.game_id) {
        localStorage.setItem("uncrypt-game-id", gameData.game_id);
      }

      // FIXED: Update game store directly
      this._updateGameState(gameData);

      events.emit(this.events.GAME_INITIALIZED, {
        newGame: true,
        gameData,
      });

      return { success: true, gameData };
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
   * Update game state - PRIVATE METHOD that centralizes game state updates
   * @private
   * @param {Object} gameData - Game data from API
   * @param {Object} options - Additional options
   */
  _updateGameState(gameData, options = {}) {
    if (!gameData) return;

    const {
      isNewGame = false,
      isDaily = false,
      isCustomGame = false,
    } = options;
    const gameStore = useGameStore.getState();

    // Check if we need to actually update the state
    // Only update if we have valid game data
    if (gameData.encrypted_paragraph && gameData.display) {
      console.log(
        `Service updating game state directly - isNewGame: ${isNewGame}, isDaily: ${isDaily}, isCustomGame: ${isCustomGame}`,
      );

      // For daily challenges, use the dedicated daily challenge method
      if (isDaily) {
        if (typeof gameStore.startDailyChallenge === "function") {
          gameStore.startDailyChallenge(gameData);
        } else {
          // Fallback if method doesn't exist
          gameStore.continueSavedGame(gameData);
        }
      }
      // For custom games, specify customGame flag
      else if (isCustomGame) {
        if (typeof gameStore.continueSavedGame === "function") {
          gameStore.continueSavedGame(gameData, { isCustomGame: true });
        }
      }
      // For regular continuation
      else {
        if (typeof gameStore.continueSavedGame === "function") {
          gameStore.continueSavedGame(gameData);
        }
      }

      // Signal that state has changed
      events.emit(this.events.STATE_CHANGED, {
        source: "service",
        gameDataUpdated: true,
      });
    }
  },

  /**
   * Start today's daily challenge
   * @returns {Promise<Object>} Result with success flag
   */
  async startDailyChallenge() {
    try {
      console.log("Starting daily challenge");

      // Force any in-progress initialization to complete/fail
      if (isInitializing) {
        console.log(
          "Waiting for existing initialization to complete before starting daily",
        );
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

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

      // Start daily challenge - always force 'easy' difficulty
      console.log("Making API call to start daily challenge");
      const gameData = await apiService.startDailyChallenge(today);

      // Store game ID if available - this will overwrite any previous game ID
      if (gameData && gameData.game_id) {
        console.log("Daily challenge started with game ID:", gameData.game_id);
        localStorage.setItem("uncrypt-game-id", gameData.game_id);

        // Emit game initialized event
        events.emit(this.events.GAME_INITIALIZED, {
          daily: true,
          gameData,
        });

        return { success: true, gameData, daily: true };
      } else {
        console.error("No game ID returned from daily challenge");
        throw new Error("Invalid response from daily challenge endpoint");
      }
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

      // FIXED: Update game store directly with proper options
      const isDailyChallenge =
        gameData.game_id && gameData.game_id.includes("-daily-");
      this._updateGameState(gameData, { isDaily: isDailyChallenge });

      events.emit(this.events.GAME_INITIALIZED, {
        resumed: true,
        gameData,
      });

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

      // Reset game state explicitly here
      const gameStore = useGameStore.getState();
      if (typeof gameStore.resetGame === "function") {
        gameStore.resetGame();
      }

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

      // Reset game state in store
      const gameStore = useGameStore.getState();
      if (typeof gameStore.resetGame === "function") {
        gameStore.resetGame();
      }

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

      // Reset game state even on error
      const gameStore = useGameStore.getState();
      if (typeof gameStore.resetGame === "function") {
        gameStore.resetGame();
      }

      // Emit logout event even on error
      events.emit(this.events.LOGOUT_TRANSITION);

      return { success: false, error };
    }
  },
};

export default gameService;
