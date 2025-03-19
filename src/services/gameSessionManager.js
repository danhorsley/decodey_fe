// src/services/gameSessionManager.js - Streamlined to remove redundancy
import { create } from "zustand";
import apiService from "./apiService";
import config from "../config";
import EventEmitter from "events";
import useGameStore from "../stores/gameStore";

// Centralized event emitter for internal communication
const eventEmitter = new EventEmitter();

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
 * Simplified auth status check
 * @returns {Object} Auth status
 */
const checkAuthStatus = () => {
  const token = config.session.getAuthToken();
  return {
    isAuthenticated: !!token,
  };
};

/**
 * Start a new game with specified options
 * @param {Object} options Game options
 * @returns {Promise<Object>} Result
 */
const startGame = async (options = {}) => {
  try {
    // Clear any previous game ID
    localStorage.removeItem("uncrypt-game-id");

    // Start a new game via API
    const gameData = await apiService.startGame(options);

    // Store game ID if available
    if (gameData?.game_id) {
      localStorage.setItem("uncrypt-game-id", gameData.game_id);
    }

    // Update game store directly for efficiency
    const gameStore = useGameStore.getState();
    if (typeof gameStore.startGame === "function") {
      await gameStore.startGame(
        options.longText || false,
        options.hardcoreMode || false,
        true, // Force new
      );
    }

    return {
      success: true,
      gameData,
    };
  } catch (error) {
    console.error("Error starting game:", error);
    return {
      success: false,
      error,
    };
  }
};

/**
 * Initialize a new game session
 * Single entry point for game initialization
 * @param {Object} options Game options
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
    // Start a new game with the provided options
    const result = await startGame(options);

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
    // Check if user is authenticated
    const { isAuthenticated } = checkAuthStatus();
    if (!isAuthenticated) {
      return { success: false, reason: "not-authenticated" };
    }

    // Get existing game from API
    const gameData = await apiService.continueGame();

    // Update game store directly
    const gameStore = useGameStore.getState();
    if (typeof gameStore.continueSavedGame === "function") {
      await gameStore.continueSavedGame(gameData);
    }

    return {
      success: true,
      gameData,
    };
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
        const activeGameCheck = await apiService.checkActiveGame();

        if (activeGameCheck.has_active_game) {
          // Notify UI about active game
          eventEmitter.emit("game:active-game-found", {
            gameStats: activeGameCheck.game_stats,
          });

          return {
            success: true,
            hasActiveGame: true,
            activeGameStats: activeGameCheck.game_stats,
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

    // No active game found, start a new one
    console.log("Login successful, no active game found - starting new game");
    const gameResult = await startGame(gameOptions);

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
      return await startGame(options.gameOptions || {});
    }

    return { success: true };
  } catch (error) {
    console.error("Error during logout:", error);

    // Still clear session on error
    config.session.clearSession();

    // Try to start a new game if requested
    if (options.startAnonymousGame) {
      try {
        return await startGame(options.gameOptions || {});
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
    // Try to abandon via API
    try {
      await apiService.abandonAndResetGame();
    } catch (abandonError) {
      console.warn("Error abandoning game:", abandonError);
    }

    // Start new game
    return await startGame(options);
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

// Export key functions
export {
  initializeGameSession,
  continueSavedGame,
  handleLogin,
  loginAndStartGame,
  handleLogout,
  abandonAndStartNew,
  onGameSessionEvent,
};

// Event constants
export const GameSessionEvents = {
  ACTIVE_GAME_FOUND: "game:active-game-found",
};
