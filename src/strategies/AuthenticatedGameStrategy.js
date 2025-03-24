// src/strategies/AuthenticatedGameStrategy.js
import GameStrategy from "./GameStrategy";
import apiService from "../services/apiService";
import config from "../config";

/**
 * Game strategy for authenticated users
 * Handles game initialization, continuation, and abandonment for logged-in users
 */
class AuthenticatedGameStrategy extends GameStrategy {
  constructor(events) {
    super();
    this.events = events; // Event emitter for notifying about active games
  }

  /**
   * Initialize a new game for authenticated user
   * @param {Object} options Game options
   * @returns {Promise<Object>} Result object with success flag and game data
   */
  async initializeGame(options = {}) {
    try {
      console.log(
        "AuthenticatedGameStrategy: Checking for active games before starting new one",
      );

      // First check if the user has an active game
      const activeGameCheck = await this.checkActiveGame();

      if (activeGameCheck.hasActiveGame) {
        console.log(
          "AuthenticatedGameStrategy: Active game found, emitting event",
        );

        // Emit event to notify UI about active game
        if (this.events) {
          this.events.emit("game:active-game-found", {
            gameStats: activeGameCheck.gameStats,
          });
        }

        return {
          success: true,
          activeGameFound: true,
          gameStats: activeGameCheck.gameStats,
        };
      }

      // No active game found, start a new one
      console.log(
        "AuthenticatedGameStrategy: No active game found, starting new one",
      );

      // Clear any existing game ID
      localStorage.removeItem("uncrypt-game-id");

      // Start game via API Service
      const gameData = await apiService.startGame(options);

      // Store game ID if available
      if (gameData?.game_id) {
        localStorage.setItem("uncrypt-game-id", gameData.game_id);
      }

      return {
        success: true,
        gameData,
        anonymous: false,
      };
    } catch (error) {
      console.error(
        "AuthenticatedGameStrategy: Error initializing game:",
        error,
      );

      // Special handling for auth errors - might need to fall back to anonymous
      if (error.response?.status === 401) {
        console.warn(
          "AuthenticatedGameStrategy: Auth error during initialization",
        );
        return {
          success: false,
          authError: true,
          error,
        };
      }

      return {
        success: false,
        error,
      };
    }
  }

  /**
   * Continue an existing game for authenticated user
   * @returns {Promise<Object>} Result object with success flag and game data
   */
  async continueGame() {
    try {
      console.log("AuthenticatedGameStrategy: Continuing saved game");

      // Get game state from API
      const gameData = await apiService.continueGame();

      // Store game ID if available
      if (gameData?.game_id) {
        localStorage.setItem("uncrypt-game-id", gameData.game_id);
      }

      return {
        success: true,
        gameData,
      };
    } catch (error) {
      console.error("AuthenticatedGameStrategy: Error continuing game:", error);
      return {
        success: false,
        error,
      };
    }
  }

  /**
   * Abandon the current game - calls API for authenticated users
   */
  async abandonGame() {
    try {
      console.log(
        "AuthenticatedGameStrategy: Abandoning authenticated game via API",
      );

      // Call API to abandon game properly
      await apiService.abandonAndResetGame();

      // Clear local storage as well
      localStorage.removeItem("uncrypt-game-id");

      return { success: true };
    } catch (error) {
      console.error("AuthenticatedGameStrategy: Error abandoning game:", error);

      // Still clear local storage even on error
      localStorage.removeItem("uncrypt-game-id");

      return {
        success: false,
        error,
      };
    }
  }

  /**
   * Check if authenticated user has an active game
   * @returns {Promise<Object>} Result with hasActiveGame flag and game stats
   */
  async checkActiveGame() {
    try {
      console.log("AuthenticatedGameStrategy: Checking for active games");

      // Call API to check for active games
      const response = await apiService.checkActiveGame();

      // Transform API response to a consistent format
      return {
        hasActiveGame: response.has_active_game || false,
        gameStats: response.game_stats || null,
        anonymous: false,
      };
    } catch (error) {
      console.error(
        "AuthenticatedGameStrategy: Error checking active game:",
        error,
      );

      // For auth errors, don't consider it a failure, just report no active game
      if (error.response?.status === 401) {
        return {
          hasActiveGame: false,
          authError: true,
        };
      }

      return {
        hasActiveGame: false,
        error,
      };
    }
  }

  /**
   * Determine if this strategy applies to the current user
   * @returns {boolean} True if user is authenticated
   */
  isApplicable() {
    // User is authenticated if there's an auth token
    const token = config.session.getAuthToken();
    return !!token;
  }
}

export default AuthenticatedGameStrategy;
