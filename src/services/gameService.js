// src/services/gameService.js - Improved with proper state management
import apiService from "./apiService";
import config from "../config";
import EventEmitter from "events";
import useGameStore from "../stores/gameStore";
import useAuthStore from "../stores/authStore";
import useSettingsStore from "../stores/settingsStore";

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
      let backdoorMode = false;
      if (isAuthenticated) {
        try {
          // Use settings store directly instead of localStorage
          const settingsStore = useSettingsStore.getState();
          const isBackdoorEnabled =
            settingsStore.settings?.backdoorMode === true;

          // Get auth store directly
          const authStore = useAuthStore.getState();
          const isSubadmin = authStore.user?.subadmin === true;

          backdoorMode = isBackdoorEnabled && isSubadmin;

          if (backdoorMode) {
            console.log("Backdoor mode enabled for subadmin user");
          }
        } catch (e) {
          console.warn("Error checking backdoor settings:", e);
        }
      }

      // Add backdoor flag to options
      options.backdoorMode = backdoorMode;
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
            hasActiveGame: true,
            hasActiveDailyGame: activeGameCheck.hasActiveDailyGame || false,
            gameStats: activeGameCheck.gameStats || null,
            dailyStats: activeGameCheck.dailyStats || null,
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

          return {
            success: true,
            gameData,
            newGame: true,
            isBackdoorMode: backdoorMode,
          };
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
      isContinuing = false, // Explicit flag for continuation
    } = options;
    const gameStore = useGameStore.getState();

    // Check if we need to actually update the state
    // Only update if we have valid game data
    if (gameData.encrypted_paragraph && gameData.display) {
      console.log(
        `Service updating game state - isNewGame: ${isNewGame}, isDaily: ${isDaily}, isCustomGame: ${isCustomGame}, isContinuing: ${isContinuing}`,
      );

      // CASE 1: If we're explicitly continuing a game, ALWAYS use continueSavedGame
      if (isContinuing) {
        console.log("Continuing existing game - using continueSavedGame");
        if (typeof gameStore.continueSavedGame === "function") {
          gameStore.continueSavedGame(gameData);
        }
      }
      // CASE 2: For new daily challenges use startDailyChallenge
      else if (isNewGame && isDaily) {
        console.log("Starting new daily challenge - using startDailyChallenge");
        if (typeof gameStore.startDailyChallenge === "function") {
          gameStore.startDailyChallenge(gameData);
        } else {
          // Fallback
          gameStore.continueSavedGame(gameData);
        }
      }
      // CASE 3: For new custom games use regular game initialization
      else if (isNewGame && isCustomGame) {
        console.log(
          "Starting new custom game - using appropriate initialization",
        );
        // Here you would use whatever method is appropriate for starting a new custom game
        // This might be something like startGame or resetAndStartNewGame
        if (typeof gameStore.startGame === "function") {
          gameStore.startGame(gameData);
        } else if (typeof gameStore.resetAndStartNewGame === "function") {
          gameStore.resetAndStartNewGame(gameData);
        } else {
          // Fallback
          gameStore.continueSavedGame(gameData);
        }
      }
      // CASE 4: For all other cases
      else {
        console.log("Using continueSavedGame as fallback");
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
   * @param {Object} options - Optional settings
   * @returns {Promise<Object>} Result with success flag
   */
  async startDailyChallenge(options = {}) {
    try {
      console.log("Starting daily challenge with options:", options);

      // If forceNew is specified, explicitly abandon any current game
      if (options.forceNew === true) {
        console.log(
          "Force new flag detected - explicitly abandoning current game",
        );

        // Clear any existing game ID first
        localStorage.removeItem("uncrypt-game-id");

        // If we're authenticated, explicitly abandon the current game on the server
        const isAuthenticated = !!config.session.getAuthToken();
        if (isAuthenticated) {
          try {
            await apiService.abandonAndResetGame();
            console.log("Successfully abandoned current game on server");
          } catch (abandonError) {
            console.warn(
              "Error abandoning current game, continuing anyway:",
              abandonError,
            );
            // Continue with daily challenge regardless
          }

          // Add a small delay to ensure abandon request is processed
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      }

      // Skip completion check if requested (speeds up loading and avoids CORS issues)
      const skipCompletionCheck = options.skipCompletionCheck === true;

      // Only authenticated users can have completed a daily challenge
      const isAuthenticated = !!config.session.getAuthToken();

      // For authenticated users, check if today's challenge is already completed
      // But only if we haven't explicitly asked to skip this check
      if (isAuthenticated && !skipCompletionCheck) {
        try {
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
        } catch (error) {
          // If the completion check fails, just log and continue
          console.warn(
            "Daily completion check failed, continuing anyway:",
            error,
          );
        }
      }

      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split("T")[0];

      // Check for force-daily-challenge flag - if present, we're coming from continue modal
      const forceDailyChallenge =
        localStorage.getItem("force-daily-challenge") === "true";

      if (forceDailyChallenge) {
        console.log(
          "Force daily challenge flag detected - ensuring clean state",
        );
        localStorage.removeItem("force-daily-challenge");
      }

      // Start daily challenge - always force 'easy' difficulty
      console.log("Making API call to start daily challenge");
      const gameData = await apiService.startDailyChallenge(today);

      // Store game ID if available - this will overwrite any previous game ID
      if (gameData && gameData.game_id) {
        console.log("Daily challenge started with game ID:", gameData.game_id);
        localStorage.setItem("uncrypt-game-id", gameData.game_id);

        // Update the game store with the daily challenge data
        const gameStore = useGameStore.getState();
        if (gameStore && typeof gameStore.startDailyChallenge === "function") {
          gameStore.startDailyChallenge(gameData);
        }

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
  /**
   * Continue a saved game (auth users only)
   * @param {Object} options - Options for continuing game
   * @param {boolean} options.isDaily - Whether to continue daily challenge game
   * @returns {Promise<Object>} Result with success flag
   */
  async continueGame(options = {}) {
    try {
      const isAuthenticated = !!config.session.getAuthToken();
      const { isDaily = false } = options;

      console.log(`continueGame called with isDaily=${isDaily}`);
      // Anonymous users cannot continue games
      if (!isAuthenticated) {
        return {
          success: false,
          reason: "anonymous-user",
          message: "Anonymous users cannot continue games between sessions",
        };
      }

      // Call API to continue the game with isDaily flag
      const gameData = await apiService.continueGame(isDaily);

      // Store game ID if available
      if (gameData.game_id) {
        localStorage.setItem("uncrypt-game-id", gameData.game_id);
      }

      // FIXED: Don't use startDailyChallenge for continuing a daily challenge
      const isDailyChallenge =
        isDaily || (gameData.game_id && gameData.game_id.includes("-daily-"));

      // THIS IS THE FIX - Replace whatever is currently here with this:
      // Get the game store to update state
      const gameStore = useGameStore.getState();

      // CRITICAL FIX: Always use continueSavedGame method for both regular and daily games
      if (gameStore && typeof gameStore.continueSavedGame === "function") {
        const continueResult = gameStore.continueSavedGame(gameData);
        console.log(
          `Continuing ${isDailyChallenge ? "daily" : "regular"} game result:`,
          continueResult,
        );
      } else {
        // Fallback to using _updateGameState with explicit isContinuing flag
        this._updateGameState(gameData, {
          isDaily: isDailyChallenge,
          isNewGame: false,
          isCustomGame: !isDailyChallenge, // Set as opposite of isDailyChallenge
          isContinuing: true, // Explicitly mark as continuation
        });
      }

      events.emit(this.events.GAME_INITIALIZED, {
        resumed: true,
        gameData,
        isDaily: isDailyChallenge,
      });

      return { success: true, gameData, isDaily: isDailyChallenge };
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
      // Extract options (no need for isDaily anymore)
      const { customGameRequested = true, ...otherOptions } = options;

      console.log("Abandoning regular game and starting new game");

      // Only call abandon API for authenticated users
      const isAuthenticated = !!config.session.getAuthToken();

      if (isAuthenticated) {
        try {
          // Abandon regular game only
          await apiService.abandonAndResetGame();
          console.log("Successfully abandoned regular game");
        } catch (error) {
          console.warn("Error abandoning regular game:", error);
          // Continue anyway - the important part is starting a new game
        }
      } else {
        // For anonymous users, just clear the game ID if it's not a daily game
        const activeGameId = localStorage.getItem("uncrypt-game-id");
        const isActiveDailyGame =
          activeGameId && activeGameId.includes("-daily-");

        if (!isActiveDailyGame) {
          localStorage.removeItem("uncrypt-game-id");
        }
      }

      // Reset game state explicitly here
      const gameStore = useGameStore.getState();
      if (typeof gameStore.resetGame === "function") {
        gameStore.resetGame();
      }

      // Start new game
      return await this.initializeGame({
        ...otherOptions,
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
        return {
          hasActiveGame: false,
          hasActiveDailyGame: false,
          anonymous: true,
        };
      }

      // Call API to check for active game
      const result = await apiService.checkActiveGame();

      // Check for both game types from the updated API response
      const hasActiveGame = result.has_active_game || false;

      // For daily games, also check if start_time is from today
      let hasActiveDailyGame = result.has_active_daily_game || false;
      const dailyStats = result.daily_stats || null;

      // Check if daily game start_time is from today
      if (hasActiveDailyGame && dailyStats && dailyStats.start_time) {
        const startDate = new Date(dailyStats.start_time);
        const today = new Date();

        const isStartedToday =
          startDate.getFullYear() === today.getFullYear() &&
          startDate.getMonth() === today.getMonth() &&
          startDate.getDate() === today.getDate();

        // Only consider daily game active if it's from today
        hasActiveDailyGame = isStartedToday;

        console.log(
          `Daily challenge check: start_time=${dailyStats.start_time}, isStartedToday=${isStartedToday}`,
        );

        // If it's not from today, we treat it as if there's no active daily game
        if (!isStartedToday) {
          console.log(
            "Daily challenge is not from today, considering it inactive",
          );
        }
      }

      // Emit event if ANY game type is found
      if (hasActiveGame || hasActiveDailyGame) {
        events.emit(this.events.ACTIVE_GAME_FOUND, {
          hasActiveGame,
          hasActiveDailyGame,
          gameStats: result.game_stats || null,
          dailyStats,
        });
      }

      console.log("Active game check result:", {
        hasActiveGame,
        hasActiveDailyGame,
        gameStats: result.game_stats ? "present" : "null",
        dailyStats: dailyStats ? "present" : "null",
      });

      return {
        hasActiveGame,
        hasActiveDailyGame,
        gameStats: result.game_stats || null,
        dailyStats,
      };
    } catch (error) {
      console.error("Error checking for active game:", error);
      return {
        hasActiveGame: false,
        hasActiveDailyGame: false,
        error,
      };
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

          // if (activeGameCheck.hasActiveGame) {
          //   // Notify UI about active game
          //   events.emit(this.events.ACTIVE_GAME_FOUND, {
          //     hasActiveGame: true,
          //     hasActiveDailyGame: activeGameCheck.hasActiveDailyGame || false,
          //     gameStats: activeGameCheck.gameStats || null,
          //     dailyStats: activeGameCheck.dailyStats || null,
          //   });

          return {
            success: true,
            hasActiveGame: activeGameCheck.hasActiveGame || false,
            hasActiveDailyGame: activeGameCheck.hasActiveDailyGame || false,
            activeGameStats: activeGameCheck.gameStats || null,
            activeDailyStats: activeGameCheck.dailyStats || null,
            // };
          };
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

      // Reset backdoorMode in settings store
      const settingsStore = useSettingsStore.getState();
      if (typeof settingsStore.updateSettings === "function") {
        settingsStore.updateSettings({
          ...settingsStore.settings,
          backdoorMode: false, // Reset backdoorMode on logout
        });
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

      // Reset backdoorMode in settings store even on error
      const settingsStore = useSettingsStore.getState();
      if (typeof settingsStore.updateSettings === "function") {
        settingsStore.updateSettings({
          ...settingsStore.settings,
          backdoorMode: false, // Reset backdoorMode on logout
        });
      }

      // Emit logout event even on error
      events.emit(this.events.LOGOUT_TRANSITION);

      return { success: false, error };
    }
  },
};

export default gameService;
