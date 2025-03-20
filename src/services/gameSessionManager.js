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

    // Check auth status - no need to refresh tokens for anonymous users
    const token = config.session.getAuthToken();
    const isAuthenticated = !!token;

    // Log user status - helpful for debugging
    console.log(
      `Starting new game as ${isAuthenticated ? "authenticated" : "anonymous"} user`,
    );

    try {
      // Start a new game via apiService
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
        anonymous: !isAuthenticated, // Flag to indicate this was an anonymous start
      };
    } catch (error) {
      // Special handling for 401 errors - likely expired token
      if (error.response?.status === 401) {
        console.log(
          "401 error starting game - clearing auth and trying anonymous start",
        );

        // Clear auth tokens
        localStorage.removeItem("uncrypt-token");
        localStorage.removeItem("refresh_token");
        sessionStorage.removeItem("uncrypt-token");

        // Try to start game with anonymous endpoint - using apiService again
        console.log("Starting anonymous game after 401 error");

        try {
          // The apiService.startGame method now handles anonymous fallback internally
          const anonData = await apiService.startGame(options);

          // Store game ID if available
          if (anonData?.game_id) {
            localStorage.setItem("uncrypt-game-id", anonData.game_id);
          }

          // Update game store with anonymous game
          const gameStore = useGameStore.getState();
          if (typeof gameStore.startGame === "function") {
            await gameStore.startGame(
              options.longText || false,
              options.hardcoreMode || false,
              true,
            );
          }

          return {
            success: true,
            gameData: anonData,
            anonymous: true,
            wasAuthError: true,
          };
        } catch (anonError) {
          console.error(
            "Error starting anonymous game after auth error:",
            anonError,
          );
          // Fall through to default error handling
          return {
            success: false,
            error: anonError,
            anonymous: true,
          };
        }
      }

      // Default error handling
      console.error("Error starting game:", error);
      return {
        success: false,
        error,
      };
    }
  } catch (error) {
    console.error("Error in startGame:", error);
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
// In src/services/gameSessionManager.js
// Let's update the initialization flow to handle anonymous users better

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
    // Check if user is authenticated
    const { isAuthenticated } = checkAuthStatus();

    // Fast-track for anonymous users - bypass active game check completely
    if (!isAuthenticated) {
      console.log(
        "Anonymous user detected - fast-tracking to new game, bypassing continue modal",
      );

      // Start a new game directly for anonymous users - never show continue modal
      const result = await startGame(options);

      // Update initialization status
      if (!result.success) {
        sessionStore.setInitError(result.error);
      } else {
        sessionStore.setInitializing(false);
      }

      return result;
    }

    // If we get here, the user is authenticated - proceed with normal flow
    // including checking for active games

    try {
      const activeGameCheck = await apiService.checkActiveGame();

      if (activeGameCheck.has_active_game) {
        console.log("Active game found for authenticated user");

        // Emit event to show continue game modal, but only for authenticated users
        eventEmitter.emit("game:active-game-found", {
          gameStats: activeGameCheck.game_stats,
        });

        // Don't automatically continue - let the modal handle it
        sessionStore.setInitializing(false);
        return {
          success: true,
          activeGameFound: true,
          gameStats: activeGameCheck.game_stats,
        };
      }
    } catch (checkError) {
      console.warn("Error checking for active game:", checkError);
      // Continue with new game initialization on error
    }

    // No active game found or error in checking, start a new game
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
