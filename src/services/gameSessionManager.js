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
    return { success: false, reason: "already-initializing" };
  }

  // Mark as initializing
  sessionStore.setInitializing(true);

  try {
    // Get the appropriate strategy for the current user and game type
    const isDaily = options.daily === true;
    const strategy = strategyFactory.getStrategy({ daily: isDaily });
    console.log(
      `Using ${strategy.constructor.name} for game initialization (${isDaily ? "daily" : "standard"})`,
    );

    // Initialize game using the selected strategy
    let result;

    if (isDaily) {
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

    // Start a new anonymous game if requested
    if (options.startAnonymousGame) {
      // After logout, we need the anonymous strategy
      const strategy = strategyFactory.getStrategyByType("anonymous");
      return await strategy.initializeGame(options.gameOptions || {});
    }

    return { success: true };
  } catch (error) {
    console.error("Error during logout:", error);

    // Still clear session on error
    config.session.clearSession();

    // Try to start a new game if requested
    if (options.startAnonymousGame) {
      try {
        const strategy = strategyFactory.getStrategyByType("anonymous");
        return await strategy.initializeGame(options.gameOptions || {});
      } catch (gameError) {
        console.error("Failed to start game after logout:", gameError);
      }
    }

    return {
      success: false,
      error,
    };
  }
};

/**
 * Abandon current game and start a new one
 * @param {Object} options Game options
 * @returns {Promise<Object>} Result
 */
const abandonAndStartNew = async (options = {}) => {
  try {
    // Get the appropriate strategy for the current user
    const strategy = strategyFactory.getStrategy();

    // Abandon current game using strategy
    await strategy.abandonGame();

    // Start new game using the same strategy
    return await strategy.initializeGame(options);
  } catch (error) {
    console.error("Error in abandon and start new:", error);
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
 * Initialize a daily challenge
 * @returns {Promise<Object>} Result of daily challenge initialization
 */
const initializeDailyChallenge = async () => {
  // Simply call initializeGameSession with daily flag
  return await initializeGameSession({ daily: true });
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
};
