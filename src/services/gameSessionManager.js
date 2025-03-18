// src/services/gameSessionManager.js
/**
 * Centralized service to manage game sessions, authentication flows, and game state
 * This service coordinates between authentication state and game initialization
 */
import { create } from "zustand";
import apiService from "./apiService";
import config from "../config";
import EventEmitter from "events";
import useGameStore from "../stores/gameStore";

// Create an event emitter for communication
const eventEmitter = new EventEmitter();

/**
 * Game Session Store
 * Manages the current session state including initialization status
 */
export const useGameSessionStore = create((set, get) => ({
  // Initialize with loading state
  isInitializing: false,
  initializationAttempted: false,
  lastInitAttempt: null,
  initError: null,
  lastInitResult: null,

  // Set initializing state
  setInitializing: (isInitializing) => set({ isInitializing }),

  // Mark initialization as attempted
  markInitAttempted: () =>
    set({
      initializationAttempted: true,
      lastInitAttempt: Date.now(),
    }),

  // Set initialization error
  setInitError: (error) =>
    set({
      initError: error,
      isInitializing: false,
    }),

  // Set initialization result
  setInitResult: (result) =>
    set({
      lastInitResult: result,
      isInitializing: false,
    }),

  // Reset initialization state
  resetInitState: () =>
    set({
      isInitializing: false,
      initializationAttempted: false,
      lastInitAttempt: null,
      initError: null,
      lastInitResult: null,
    }),
}));

/**
 * Check authentication status
 * @returns {Object} Auth status including token availability
 */
const checkAuthStatus = () => {
  // Check for tokens in storage
  const accessToken = config.session.getAuthToken();
  const refreshToken = localStorage.getItem("refresh_token");
  const userId = config.session.getAuthUserId();

  return {
    hasAccessToken: !!accessToken,
    hasRefreshToken: !!refreshToken,
    hasUserId: !!userId,
    isAuthenticated: !!accessToken && !!userId,
  };
};

/**
 * Attempt to refresh authentication token
 * @returns {Promise<boolean>} True if refresh succeeded
 */
const refreshAuthToken = async () => {
  try {
    console.log("Attempting to refresh authentication token");
    const result = await apiService.refreshToken();
    return !!result && !!result.access_token;
  } catch (error) {
    console.error("Token refresh failed:", error);
    return false;
  }
};

/**
 * Check for active game from API
 * @returns {Promise<Object>} Active game data or null
 */
const checkForActiveGame = async () => {
  try {
    console.log("Checking for active game");
    const { hasAccessToken, hasRefreshToken } = checkAuthStatus();

    // Skip for anonymous users OR users without refresh tokens
    if (!hasAccessToken || !hasRefreshToken) {
      console.log(
        "No auth token or no refresh token, skipping active game check",
      );
      return { hasActiveGame: false };
    }

    const response = await apiService.checkActiveGame();

    if (response?.has_active_game) {
      console.log("Active game found:", response);
      return {
        hasActiveGame: true,
        gameStats: response.game_stats,
      };
    }

    console.log("No active game found");
    return { hasActiveGame: false };
  } catch (error) {
    console.error("Error checking for active game:", error);
    return { hasActiveGame: false, error };
  }
};

/**
 * Start a new anonymous game
 * @param {Object} options Game options (longText, hardcoreMode, etc)
 * @returns {Promise<Object>} Game initialization result
 */
const startAnonymousGame = async (options = {}) => {
  try {
    console.log("Starting new anonymous game with options:", options);

    // Clear any existing game ID - do this first for speed
    localStorage.removeItem("uncrypt-game-id");

    // Start a new game directly
    const gameData = await apiService.startGame(options);

    if (!gameData) {
      throw new Error("Failed to start anonymous game - no data returned");
    }

    // OPTIMIZATION: Update game store directly to skip events/renders
    try {
      // This can be imported or accessed via getState()
      const gameStore = useGameStore.getState();
      if (typeof gameStore.startGame === "function") {
        // Call it directly with the data
        gameStore.startGame(
          options.longText || false,
          options.hardcoreMode || false,
          true, // Force new
        );
      }
    } catch (storeError) {
      console.warn("Error updating game store directly:", storeError);
      // Continue since we'll still emit the event
    }

    // Signal loading is complete
    eventEmitter.emit("game:loaded", { isAnonymous: true });

    // Emit game started event
    eventEmitter.emit("game:started", {
      isAnonymous: true,
      gameData,
    });

    return {
      success: true,
      gameData,
      isAnonymous: true,
      isLoaded: true, // Add this flag
    };
  } catch (error) {
    console.error("Error starting anonymous game:", error);

    // Emit error event asynchronously
    setTimeout(() => {
      eventEmitter.emit("game:error", {
        action: "start-anonymous",
        error,
      });
    }, 0);

    return {
      success: false,
      error,
      isAnonymous: true,
    };
  }
};

/**
 * Continue an existing saved game for authenticated user
 * @returns {Promise<Object>} Result of continuation attempt
 */
const continueSavedGame = async () => {
  try {
    console.log("Attempting to continue saved game");

    const { isAuthenticated } = checkAuthStatus();
    if (!isAuthenticated) {
      console.warn("Cannot continue game - user not authenticated");
      return { success: false, reason: "not-authenticated" };
    }

    // Try to continue the game using the API
    const response = await apiService.continueGame();

    if (!response) {
      console.warn("Continue game API returned no data or error");
      return { success: false, reason: "api-error" };
    }

    // Emit event to update game state
    eventEmitter.emit("game:continued", {
      gameData: response,
    });

    return {
      success: true,
      gameData: response,
    };
  } catch (error) {
    console.error("Error continuing saved game:", error);

    // Check if error was due to no active game
    const isNoGameError =
      error?.response?.status === 404 ||
      error?.response?.data?.error?.includes("No active game");

    if (isNoGameError) {
      console.log("No active game to continue - starting new game");
      // Return a specific reason
      return {
        success: false,
        reason: "no-active-game",
        shouldStartNew: true,
      };
    }

    // Emit error event
    eventEmitter.emit("game:error", {
      action: "continue-saved",
      error,
    });

    return {
      success: false,
      error,
    };
  }
};

/**
 * Check for active game and decide whether to show continuation dialog
 * @returns {Promise<Object>} Decision about how to proceed
 */
const checkGameStateOnLogin = async () => {
  try {
    console.log("Checking game state after login");

    // Check for active game
    const activeGameResult = await checkForActiveGame();

    if (activeGameResult?.hasActiveGame) {
      console.log("Active game found, should show continuation dialog");

      // Emit event for UI to show dialog
      eventEmitter.emit("game:active-game-found", {
        gameStats: activeGameResult.gameStats,
      });

      return {
        hasActiveGame: true,
        showContinuationDialog: true,
        gameStats: activeGameResult.gameStats,
      };
    }

    // No active game, just start a new one
    console.log("No active game found after login, should start new game");
    return {
      hasActiveGame: false,
      showContinuationDialog: false,
    };
  } catch (error) {
    console.error("Error checking game state on login:", error);
    return {
      hasActiveGame: false,
      showContinuationDialog: false,
      error,
    };
  }
};

/**
 * Initialize game session based on current auth state
 * Handles anonymous users, token refresh, and continuation
 *
 * @param {Object} options Game options (longText, hardcoreMode, etc)
 * @returns {Promise<Object>} Initialization result
 */
const initializeGameSession = async (options = {}) => {
  // Get current store state
  const sessionStore = useGameSessionStore.getState();

  // Only initialize once at a time
  if (sessionStore.isInitializing) {
    console.log("Game session initialization already in progress");
    return { success: false, reason: "already-initializing" };
  }

  // Mark as initializing
  sessionStore.setInitializing(true);
  sessionStore.markInitAttempted();

  try {
    // FAST PATH: Check for anonymous user immediately
    const accessToken = config.session.getAuthToken();
    const refreshToken = localStorage.getItem("refresh_token");

    // If we have no tokens at all, fast-track to anonymous game start
    if (!accessToken && !refreshToken) {
      console.log(
        "Fast path: Anonymous user with no tokens - starting new game immediately",
      );
      const result = await startAnonymousGame(options);
      sessionStore.setInitResult(result);
      return result;
    }

    // Get current auth status
    const authStatus = checkAuthStatus();
    console.log("Current auth status:", authStatus);

    // CASE 1: Has access token but no refresh token
    if (authStatus.hasAccessToken && !authStatus.hasRefreshToken) {
      console.log(
        "User has access token but no refresh token - inconsistent state",
      );

      // Purge all tokens to ensure clean state
      localStorage.removeItem("uncrypt-token");
      sessionStorage.removeItem("uncrypt-token");
      localStorage.removeItem("refresh_token");

      // Emit event to notify components that session is cleared
      eventEmitter.emit("auth:session-cleared");

      console.log("Tokens purged, starting anonymous game");

      // Start anonymous game with clean state
      const result = await startAnonymousGame(options);
      sessionStore.setInitResult(result);
      return result;
    }

    // CASE 2: Has both tokens (fully authenticated)
    if (authStatus.hasAccessToken && authStatus.hasRefreshToken) {
      console.log("User is fully authenticated with refresh token");

      // Check for active game
      const activeGameResult = await checkForActiveGame();

      if (activeGameResult?.hasActiveGame) {
        // Has an active game, emit event and let UI decide
        eventEmitter.emit("game:active-game-found", {
          gameStats: activeGameResult.gameStats,
        });

        sessionStore.setInitResult({
          success: true,
          hasActiveGame: true,
          requiresUserDecision: true,
        });

        return {
          success: true,
          hasActiveGame: true,
          requiresUserDecision: true,
        };
      }

      // No active game, start new
      console.log(
        "No active game found for authenticated user, starting new game",
      );
      const result = await startAnonymousGame(options);
      sessionStore.setInitResult(result);
      return result;
    }
    // CASE 3: Has refresh token but no access token - try to refresh
    if (!authStatus.hasAccessToken && authStatus.hasRefreshToken) {
      console.log(
        "User has refresh token but no access token - attempting to refresh",
      );

      try {
        // Try to refresh the token
        const refreshResult = await refreshAuthToken();

        if (refreshResult) {
          console.log("Successfully refreshed token, checking for active game");

          // Check for active game with new token
          const activeGameResult = await checkForActiveGame();

          if (activeGameResult?.hasActiveGame) {
            // Has an active game, emit event and let UI decide
            eventEmitter.emit("game:active-game-found", {
              gameStats: activeGameResult.gameStats,
            });

            sessionStore.setInitResult({
              success: true,
              hasActiveGame: true,
              requiresUserDecision: true,
            });

            return {
              success: true,
              hasActiveGame: true,
              requiresUserDecision: true,
            };
          }

          // No active game, start new
          console.log(
            "No active game found after token refresh, starting new game",
          );
          const result = await startAnonymousGame(options);
          sessionStore.setInitResult(result);
          return result;
        } else {
          // Refresh failed, purge tokens and start anonymous
          console.log(
            "Token refresh failed, purging tokens and starting anonymous game",
          );

          // Purge all tokens
          localStorage.removeItem("uncrypt-token");
          sessionStorage.removeItem("uncrypt-token");
          localStorage.removeItem("refresh_token");

          // Emit event for session clear
          eventEmitter.emit("auth:session-cleared");

          // Start anonymous game
          const result = await startAnonymousGame(options);
          sessionStore.setInitResult(result);
          return result;
        }
      } catch (error) {
        console.error("Error refreshing token:", error);

        // Purge tokens and start anonymous game
        localStorage.removeItem("uncrypt-token");
        sessionStorage.removeItem("uncrypt-token");
        localStorage.removeItem("refresh_token");

        eventEmitter.emit("auth:session-cleared");

        const result = await startAnonymousGame(options);
        sessionStore.setInitResult(result);
        return result;
      }
    }
    // Fallback case - should never reach here
    console.warn("Unhandled auth scenario, falling back to anonymous game");
    const result = await startAnonymousGame(options);
    sessionStore.setInitResult(result);
    return result;
  } catch (error) {
    console.error("Error initializing game session:", error);
    sessionStore.setInitError(error);

    // Check if the error is related to token refresh
    const isTokenError =
      error.message &&
      (error.message.includes("No refresh token available") ||
        error.message.includes("Token refresh failed") ||
        error.message.includes("Refresh already in progress"));

    if (isTokenError) {
      console.log("Token error detected - starting anonymous game");
      try {
        const result = await startAnonymousGame(options);
        sessionStore.setInitResult(result);
        return result;
      } catch (fallbackError) {
        console.error("Critical error - even fallback failed:", fallbackError);
        return {
          success: false,
          error: fallbackError,
          isCriticalError: true,
        };
      }
    }

    // Always fall back to anonymous game on error
    try {
      console.log("Falling back to anonymous game after error");
      const result = await startAnonymousGame(options);
      sessionStore.setInitResult(result);
      return result;
    } catch (fallbackError) {
      console.error("Critical error - even fallback failed:", fallbackError);
      return {
        success: false,
        error: fallbackError,
        isCriticalError: true,
      };
    }
  }
};

/**
 * Handle user login and game state resolution
 * @param {Object} credentials User credentials
 * @returns {Promise<Object>} Login result
 */
const handleLogin = async (credentials) => {
  try {
    console.log("Handling login flow");

    // Attempt login
    const loginResult = await apiService.login(credentials);

    if (!loginResult || !loginResult.access_token) {
      console.warn("Login failed - no token received");
      return { success: false, reason: "login-failed" };
    }

    console.log("Login successful, checking game state");

    // Check for active game in account
    const gameStateCheck = await checkGameStateOnLogin();

    return {
      success: true,
      loginData: loginResult,
      gameState: gameStateCheck,
    };
  } catch (error) {
    console.error("Error in login flow:", error);
    return {
      success: false,
      error,
    };
  }
};

/**
 * Handle user logout and clean up game state
 * @param {Object} options Options for post-logout behavior
 * @returns {Promise<Object>} Logout result
 */
const handleLogout = async (options = { startAnonymousGame: true }) => {
  try {
    console.log("Handling logout flow");

    // Attempt logout API call
    await apiService.logout();

    // Clear all session data regardless of API result
    config.session.clearSession();

    // Emit a session cleared event
    eventEmitter.emit("auth:session-cleared");

    // Start anonymous game if requested
    if (options.startAnonymousGame) {
      console.log("Starting anonymous game after logout");
      return await startAnonymousGame(options.gameOptions || {});
    }

    return { success: true };
  } catch (error) {
    console.error("Error in logout flow:", error);

    // Still clear session on error
    config.session.clearSession();
    eventEmitter.emit("auth:session-cleared");

    // Start anonymous game if requested, even on error
    if (options.startAnonymousGame) {
      try {
        console.log("Starting anonymous game after failed logout");
        return await startAnonymousGame(options.gameOptions || {});
      } catch (gameError) {
        console.error("Error starting game after logout:", gameError);
        return {
          success: false,
          error: gameError,
        };
      }
    }

    return {
      success: false,
      error,
      sessionCleared: true,
    };
  }
};

/**
 * Abandon current game and start a new one
 * @param {Object} options Game options for new game
 * @returns {Promise<Object>} Result of operation
 */
const abandonAndStartNew = async (options = {}) => {
  try {
    console.log("Abandoning current game and starting new");

    // Try to abandon the game via API
    try {
      await apiService.abandonAndResetGame();
    } catch (abandonError) {
      console.warn(
        "Error abandoning game via API, continuing anyway:",
        abandonError,
      );
    }

    // Clear game ID from local storage
    localStorage.removeItem("uncrypt-game-id");

    // Emit event to notify components
    eventEmitter.emit("game:abandoned");

    // Start a new game
    console.log("Starting new game after abandoning old one");
    const result = await startAnonymousGame(options);

    return {
      success: true,
      abandonSuccess: true,
      newGameResult: result,
    };
  } catch (error) {
    console.error("Error in abandon and start new flow:", error);

    // Still try to start a new game
    try {
      console.log("Attempting to start new game despite abandon error");
      const result = await startAnonymousGame(options);

      return {
        success: true,
        abandonSuccess: false,
        abandonError: error,
        newGameResult: result,
      };
    } catch (startError) {
      console.error(
        "Critical error - failed to start new game after abandon:",
        startError,
      );
      return {
        success: false,
        abandonSuccess: false,
        abandonError: error,
        startError,
      };
    }
  }
};

/**
 * Register for events from the game session manager
 * @param {string} event Event name to subscribe to
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

// Export all the functions
export {
  initializeGameSession,
  checkAuthStatus,
  handleLogin,
  handleLogout,
  continueSavedGame,
  startAnonymousGame,
  abandonAndStartNew,
  onGameSessionEvent,
  checkForActiveGame,
  refreshAuthToken,
};

// Export key events as constants for better developer experience
export const GameSessionEvents = {
  GAME_STARTED: "game:started",
  GAME_CONTINUED: "game:continued",
  GAME_ABANDONED: "game:abandoned",
  GAME_ERROR: "game:error",
  GAME_LOADED: "game:loaded", // Add this new event
  ACTIVE_GAME_FOUND: "game:active-game-found",
  AUTH_SESSION_CLEARED: "auth:session-cleared",
};
