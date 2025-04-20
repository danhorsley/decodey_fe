// src/services/gameSessionManager.js - Updated to use Strategy Pattern
import { create } from "zustand";
import apiService from "./apiService";
import config from "../config";
import EventEmitter from "events";
import useGameStore from "../stores/gameStore";
import GameStrategyFactory from "../strategies/GameStrategyFactory";

// Centralized event emitter for internal communication
const eventEmitter = new EventEmitter();

// Create strategy factory with event emitter
const strategyFactory = new GameStrategyFactory(eventEmitter);

/**
 * Game Session Store - For tracking initialization and session state
 */
export const useGameSessionStore = create((set) => ({
  // State
  isInitializing: false,
  initError: null,

  // Actions
  setInitializing: (isInitializing) => set({ isInitializing }),
  setInitError: (error) =>
    set({
      initError: error,
      isInitializing: false,
    }),
  clearError: () => set({ initError: null }),
}));

/**
 * Initialize a new game session
 * Single entry point for game initialization
 * @param {Object} options Game options
 * @param {boolean} options.daily Whether to initialize a daily challenge
 * @returns {Promise<Object>} Initialization result
 */

const initializeGameSession = async (options = {}) => {
  // Get session store state
  const sessionStore = useGameSessionStore.getState();

  // Prevent multiple simultaneous initialization attempts
  if (sessionStore.isInitializing) {
    console.log("Game initialization already in progress, returning early");
    return { success: false, reason: "already-initializing" };
  }

  // Mark as initializing
  sessionStore.setInitializing(true);

  try {
    // Check if we're anonymous and have no existing game
    const isAnonymous = !config.session.getAuthToken();
    const hasExistingGameId = localStorage.getItem("uncrypt-game-id");
    const isExistingDailyGame = hasExistingGameId && hasExistingGameId.includes("-daily-");

    // For anonymous users with no existing game or with a daily game, default to daily challenge
    // unless explicitly requesting a custom game
    if (isAnonymous && (!hasExistingGameId || isExistingDailyGame) && !options.customGameRequested) {
      console.log("Anonymous user with no existing game or existing daily game - defaulting to daily challenge");
      options.daily = true;
    }

    // Get the appropriate strategy for the current user and game type
    const isDaily = options.daily === true;
    const customGameRequested = options.customGameRequested === true;
    const strategy = strategyFactory.getStrategy({
      daily: isDaily,
      customGameRequested: customGameRequested,
    });

    console.log(
      `Using ${strategy.constructor.name} for game initialization (${isDaily ? "daily" : "standard"})`
    );

    // Initialize game using the selected strategy
    let result;

    if (isDaily || strategy.constructor.name.includes("Daily")) {
      // For daily challenges, use the daily-specific method
      result = await strategy.startDailyChallenge();
    } else {
      // For standard games, use the regular initialization
      result = await strategy.initializeGame(options);
    }

    // Update game store if initialization succeeded with game data
    if (result.success && result.gameData) {
      const gameStore = useGameStore.getState();
      if (typeof gameStore.startGame === "function") {
        await gameStore.startGame(
          options.longText || false,
          options.hardcoreMode || false,
          true, // Force new
          isDaily, // Pass daily flag to game store
        );
      }
    }

    // Update initialization status
    if (!result.success) {
      sessionStore.setInitError(result.error);
    } else {
      sessionStore.setInitializing(false);
    }

    return result;
  } catch (error) {
    console.error("Error in game initialization:", error);
    sessionStore.setInitError(error);
    return {
      success: false,
      error,
    };
  }
};

/**
 * Continue a saved game (for authenticated users)
 * @returns {Promise<Object>} Result
 */
const continueSavedGame = async () => {
  try {
    // Get the appropriate strategy - must be authenticated for continue
    const strategy = strategyFactory.getStrategyByType("authenticated");

    // Continue game using strategy
    const result = await strategy.continueGame();

    // Update game store if continuation succeeded
    if (result.success && result.gameData) {
      const gameStore = useGameStore.getState();
      if (typeof gameStore.continueSavedGame === "function") {
        await gameStore.continueSavedGame(result.gameData);
      }
    }

    return result;
  } catch (error) {
    console.error("Error continuing saved game:", error);
    return {
      success: false,
      error,
    };
  }
};

/**
 * Handle user login and check for existing games
 * @param {Object} credentials User credentials
 * @returns {Promise<Object>} Login result
 */
const handleLogin = async (credentials) => {
  try {
    // Attempt login via API service
    const loginResult = await apiService.login(credentials);

    // Check for existing game after successful login
    if (loginResult && loginResult.access_token) {
      try {
        // After login, we need to use the authenticated strategy
        const strategy = strategyFactory.getStrategyByType("authenticated");
        const activeGameCheck = await strategy.checkActiveGame();

        if (activeGameCheck.hasActiveGame) {
          // Notify UI about active game
          eventEmitter.emit("game:active-game-found", {
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
    return {
      success: false,
      error,
    };
  }
};

/**
 * Login and start a new game if no active game exists
 * @param {Object} credentials User credentials
 * @param {Object} gameOptions Game options (optional)
 * @returns {Promise<Object>} Combined login and game result
 */
const loginAndStartGame = async (credentials, gameOptions = {}) => {
  try {
    // First attempt to login
    const loginResult = await handleLogin(credentials);

    // If login failed, return the error
    if (!loginResult.success) {
      return loginResult;
    }

    // If user has an active game, return that result (UI will show continue prompt)
    if (loginResult.hasActiveGame) {
      return loginResult;
    }

    // No active game found, start a new one using authenticated strategy
    console.log("Login successful, no active game found - starting new game");

    // Get authenticated strategy explicitly since we just logged in
    const strategy = strategyFactory.getStrategyByType("authenticated");
    const gameResult = await strategy.initializeGame(gameOptions);

    // Update game store if needed
    if (gameResult.success && gameResult.gameData) {
      const gameStore = useGameStore.getState();
      if (typeof gameStore.startGame === "function") {
        await gameStore.startGame(
          gameOptions.longText || false,
          gameOptions.hardcoreMode || false,
          true, // Force new
        );
      }
    }

    // Return combined result
    return {
      success: true,
      loginSuccess: true,
      gameStarted: gameResult.success,
      gameData: gameResult.gameData,
      loginData: loginResult.loginData,
    };
  } catch (error) {
    console.error("Error in loginAndStartGame:", error);
    return {
      success: false,
      error,
    };
  }
};

/**
 * Handle user logout and cleanup
 * @param {Object} options Logout options
 * @returns {Promise<Object>} Logout result
 */
const handleLogout = async (options = { startAnonymousGame: true }) => {
  try {
    // Attempt logout
    await apiService.logout();

    // Clear session data
    config.session.clearSession();

    // Emit event for UI state transition
    eventEmitter.emit("auth:logout-transition");

    // Start a new anonymous game if requested
    if (options.startAnonymousGame) {
      // After logout, we need the anonymous strategy
      const strategy = strategyFactory.getStrategyByType("anonymous");
      const gameResult = await strategy.initializeGame(
        options.gameOptions || {},
      );

      // Emit event for game state transition
      if (gameResult.success) {
        // Update the game store directly with the new anonymous game data
        const gameStore = useGameStore.getState();

        // Reset the game state first
        if (typeof gameStore.resetGame === "function") {
          gameStore.resetGame();
        }

        // Apply the new game data
        if (typeof gameStore.continueSavedGame === "function") {
          await gameStore.continueSavedGame(gameResult.gameData);
        }

        // Emit event for UI update
        eventEmitter.emit("game:anonymous-transition", gameResult);
      }

      return gameResult;
    }

    return { success: true };
  } catch (error) {
    console.error("Error during logout:", error);

    // Still clear session data even on error
    config.session.clearSession();

    // Emit logout event even during errors
    eventEmitter.emit("auth:logout-transition");

    // Try to start anonymous game despite the error
    if (options.startAnonymousGame) {
      try {
        const strategy = strategyFactory.getStrategyByType("anonymous");
        const gameResult = await strategy.initializeGame(
          options.gameOptions || {},
        );

        if (gameResult.success) {
          // Update game store
          const gameStore = useGameStore.getState();
          gameStore.resetGame();
          await gameStore.continueSavedGame(gameResult.gameData);

          // Emit event for UI update
          eventEmitter.emit("game:anonymous-transition", gameResult);

          return gameResult;
        }
      } catch (innerError) {
        console.error(
          "Failed to start anonymous game after logout error:",
          innerError,
        );
      }
    }

    return { success: false, error };
  }
};
/**
 * Abandon current game and start a new one
 * @param {Object} options Game options with optional customGameRequested flag
 * @returns {Promise<Object>} Result
 */
const abandonAndStartNew = async (options = {}) => {
  try {
    // Get the appropriate strategy for the current user
    const strategy = strategyFactory.getStrategy({
      customGameRequested: options.customGameRequested === true,
    });

    // Only abandon the game if this is explicitly a new game request
    // If we're coming from the continue flow, we'll have a special flag
    const shouldAbandon = options.customGameRequested === true && 
                         !options.preserveExistingGame;

    if (shouldAbandon) {
      // First abandon the current game
      try {
        if (typeof strategy.abandonGame === "function") {
          await strategy.abandonGame();
        } else {
          localStorage.removeItem("uncrypt-game-id");
        }
      } catch (abandonError) {
        console.warn("Error abandoning game:", abandonError);
        localStorage.removeItem("uncrypt-game-id");
      }

      // Start a new game using the strategy
      const result = await strategy.initializeGame(options);

      if (result.success && result.gameData) {
        // Store the game ID
        if (result.gameData.game_id) {
          localStorage.setItem("uncrypt-game-id", result.gameData.game_id);
        }

        // Update the game store with the new game data
        const gameStore = useGameStore.getState();

        // Reset the game state first
        if (typeof gameStore.resetGame === "function") {
          gameStore.resetGame();
        }

        // Apply the new game data directly without making another API call
        if (typeof gameStore.continueSavedGame === "function") {
          await gameStore.continueSavedGame(result.gameData);
        }
      }

      return result;
    } else {
      // If we're not abandoning, just continue the existing game
      return await continueSavedGame();
    }
  } catch (error) {
    console.error("Error in abandon and start new:", error);
    localStorage.removeItem("uncrypt-game-id");
    return {
      success: false,
      error,
    };
  }
};

/**
 * Register for game session events
 * @param {string} event Event name
 * @param {Function} callback Callback function
 * @returns {Function} Unsubscribe function
 */
const onGameSessionEvent = (event, callback) => {
  if (typeof callback !== "function") {
    console.error("Event callback must be a function");
    return () => {};
  }

  eventEmitter.on(event, callback);
  return () => eventEmitter.off(event, callback);
};

/**
 * Initialize a daily challenge with improved error handling
 * @returns {Promise<Object>} Result of daily challenge initialization
 */
const initializeDailyChallenge = async () => {
  console.log("initializeDailyChallenge called");

  // Get session store state
  const sessionStore = useGameSessionStore.getState();

  // Prevent multiple simultaneous initialization attempts
  if (sessionStore.isInitializing) {
    console.log("Daily challenge initialization already in progress, returning early");
    return { success: false, reason: "already-initializing" };
  }

  // Mark as initializing
  sessionStore.setInitializing(true);

  try {
    // Get the appropriate strategy for daily challenges
    const strategy = strategyFactory.getDailyStrategy();
    console.log(`Using ${strategy.constructor.name} for daily challenge initialization`);

    // Start the daily challenge
    const result = await strategy.startDailyChallenge();
    console.log("Daily challenge initialization result:", result.success ? "Success" : "Failed");

    // Handle cases appropriately...
    if (result.success && result.gameData) {
      console.log("Daily challenge has game data, updating game store");
      const gameStore = useGameStore.getState();
      if (typeof gameStore.startGame === "function") {
        await gameStore.startGame(
          false, // longText
          false, // hardcoreMode
          true, // Force new
          true, // Pass daily flag to game store
        );
      }
    }

    // Update initialization status
    if (!result.success) {
      sessionStore.setInitError(result.error);
    } else {
      sessionStore.setInitializing(false);
    }

    return result;
  } catch (error) {
    console.error("Error in daily challenge initialization:", error);
    sessionStore.setInitError(error);
    return {
      success: false,
      error,
    };
  }
};

/**
 * Check if today's daily challenge has been completed
 * @returns {Promise<Object>} Result with isCompleted flag
 */
const checkDailyCompletion = async () => {
  try {
    // Get the appropriate daily strategy
    const dailyStrategy = strategyFactory.getDailyStrategy();

    // Check completion status
    return await dailyStrategy.checkDailyCompletion();
  } catch (error) {
    console.error("Error checking daily completion:", error);
    return {
      isCompleted: false,
      error,
    };
  }
};

/**
 * Get daily challenge statistics
 * @returns {Promise<Object>} Daily stats
 */
const getDailyStats = async () => {
  try {
    // Get the appropriate daily strategy
    const dailyStrategy = strategyFactory.getDailyStrategy();

    // Get daily stats
    return await dailyStrategy.getDailyStats();
  } catch (error) {
    console.error("Error getting daily stats:", error);

    // For anonymous users, return empty stats object
    if (error.code === "ANONYMOUS_OPERATION") {
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

    return {
      success: false,
      error,
    };
  }
};

// Export key functions
export {
  initializeGameSession,
  continueSavedGame,
  handleLogin,
  loginAndStartGame,
  handleLogout,
  abandonAndStartNew,
  onGameSessionEvent,

  // Daily challenge functions
  initializeDailyChallenge,
  checkDailyCompletion,
  getDailyStats,
};

// Event constants
export const GameSessionEvents = {
  ACTIVE_GAME_FOUND: "game:active-game-found",
  DAILY_ALREADY_COMPLETED: "daily:already-completed",
  LOGOUT_TRANSITION: "auth:logout-transition",
  ANONYMOUS_TRANSITION: "game:anonymous-transition",
  STATE_CHANGED: "game:state-changed",
};
